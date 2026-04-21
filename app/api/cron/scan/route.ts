import { NextResponse } from "next/server"
import { verifyCron } from "@/lib/cron-auth"
import { getSupabaseAdmin } from "@/lib/supabase/admin"
import { getLatestSolanaProfiles, getLatestBoostedSolana, getDexPairsForMint, bestPair } from "@/lib/dexscreener"

export const dynamic = "force-dynamic"
export const maxDuration = 60

// Scans DexScreener for freshly indexed Solana tokens and inserts them into `launches`.
// Cheap + serverless-friendly. Helius is used later for deep forensics.
export async function GET(req: Request) {
  const deny = verifyCron(req)
  if (deny) return deny

  const sb = getSupabaseAdmin()
  const [profiles, boosted] = await Promise.all([getLatestSolanaProfiles(), getLatestBoostedSolana()])

  const seen = new Map<string, string>() // mint -> source
  for (const p of profiles) if (p.tokenAddress) seen.set(p.tokenAddress, "dex_profile")
  for (const p of boosted) if (p.tokenAddress && !seen.has(p.tokenAddress)) seen.set(p.tokenAddress, "dex_boosted")

  // Avoid re-inserting mints we already track.
  const mints = Array.from(seen.keys())
  let existing: string[] = []
  if (mints.length) {
    const { data } = await sb.from("launches").select("mint").in("mint", mints)
    existing = (data || []).map((r) => r.mint as string)
  }
  const newMints = mints.filter((m) => !existing.includes(m))

  const inserted: string[] = []
  // Enrich in small batches to avoid rate limits.
  for (const mint of newMints.slice(0, 25)) {
    try {
      const pairs = await getDexPairsForMint(mint)
      const pair = bestPair(pairs)
      if (!pair) continue
      const row = {
        mint,
        symbol: pair.baseToken.symbol,
        name: pair.baseToken.name,
        program_id: pair.dexId,
        source: seen.get(mint) || "dex",
        created_at: pair.pairCreatedAt ? new Date(pair.pairCreatedAt).toISOString() : new Date().toISOString(),
        liquidity_usd: pair.liquidity?.usd ?? null,
        market_cap_usd: pair.marketCap ?? pair.fdv ?? null,
        price_usd: pair.priceUsd ? Number(pair.priceUsd) : null,
        volume_5m_usd: pair.volume?.m5 ?? null,
        volume_1h_usd: pair.volume?.h1 ?? null,
        pct_change_5m: pair.priceChange?.m5 ?? null,
        pct_change_1h: pair.priceChange?.h1 ?? null,
        last_refreshed_at: new Date().toISOString(),
        metadata: { pairAddress: pair.pairAddress, dexId: pair.dexId },
      }
      const { error } = await sb.from("launches").upsert(row, { onConflict: "mint" })
      if (!error) inserted.push(mint)
    } catch {
      // swallow per-mint errors, keep the job moving
    }
  }

  return NextResponse.json({
    ok: true,
    discovered: mints.length,
    new: newMints.length,
    inserted: inserted.length,
    mints: inserted,
  })
}
