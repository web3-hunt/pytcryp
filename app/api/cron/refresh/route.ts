import { NextResponse } from "next/server"
import { verifyCron } from "@/lib/cron-auth"
import { getSupabaseAdmin } from "@/lib/supabase/admin"
import { getDexPairsForMint, bestPair } from "@/lib/dexscreener"
import { getTokenHolders } from "@/lib/helius"
import { classifyDna, gini, nakamoto, entropy } from "@/lib/metrics"
import { computeAlphaSignal } from "@/lib/scoring"
import { formatStrongAlpha, sendTelegram } from "@/lib/telegram"
import type { Launch, GlobalSettings } from "@/lib/types"

export const dynamic = "force-dynamic"
export const maxDuration = 60

// Refreshes market + holder metrics for recent launches and upserts alpha candidates.
// Runs every minute.
export async function GET(req: Request) {
  const deny = verifyCron(req)
  if (deny) return deny

  const sb = getSupabaseAdmin()
  const settings = await sb.from("settings").select("value").eq("key", "global").maybeSingle()
  const cfg = (settings.data?.value as GlobalSettings | undefined) || {
    strong_alpha_score: 75,
    min_liquidity_usd: 1000,
    min_holders: 25,
    max_gini: 0.85,
    min_nakamoto: 3,
    scan_interval_seconds: 60,
    telegram_enabled: true,
    prediction_horizons: [15, 60, 240],
  }

  // Pick launches to refresh: recently first-seen (last 6h) OR stale (>3m since refresh).
  const nowIso = new Date().toISOString()
  const cutoff6h = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()
  const { data: recent } = await sb
    .from("launches")
    .select("*")
    .gte("first_seen_at", cutoff6h)
    .order("first_seen_at", { ascending: false })
    .limit(40)
  const launches = (recent || []) as Launch[]

  const refreshed: string[] = []
  const strongAlphas: Array<{ mint: string; score: number; reason: string }> = []

  for (const l of launches) {
    try {
      // Market stats via DexScreener
      const pairs = await getDexPairsForMint(l.mint)
      const pair = bestPair(pairs)
      if (!pair) continue

      // Holder distribution via Helius DAS (best-effort, skip on failure)
      let holdersCount: number | null = null
      let giniVal: number | null = null
      let nakaVal: number | null = null
      let entVal: number | null = null
      try {
        const balances = await getTokenHolders(l.mint, 2, 1000)
        const amounts = balances.map((b) => b.amount)
        holdersCount = amounts.length
        giniVal = gini(amounts)
        nakaVal = nakamoto(amounts)
        entVal = entropy(amounts)
      } catch {
        // Helius may rate-limit; fall back to prior values
      }

      const ageMin = (Date.now() - new Date(l.first_seen_at).getTime()) / 60000
      const dna = classifyDna({
        gini: giniVal ?? l.gini ?? 0.9,
        nakamoto: nakaVal ?? l.nakamoto ?? 1,
        entropy: entVal ?? l.entropy ?? 0,
        holders: holdersCount ?? l.holders ?? 0,
        liquidity_usd: pair.liquidity?.usd ?? l.liquidity_usd ?? 0,
        volume_1h_usd: pair.volume?.h1 ?? l.volume_1h_usd ?? 0,
        age_minutes: ageMin,
      })

      const updated: Partial<Launch> = {
        symbol: pair.baseToken.symbol ?? l.symbol,
        name: pair.baseToken.name ?? l.name,
        price_usd: pair.priceUsd ? Number(pair.priceUsd) : l.price_usd,
        liquidity_usd: pair.liquidity?.usd ?? l.liquidity_usd,
        market_cap_usd: pair.marketCap ?? pair.fdv ?? l.market_cap_usd,
        volume_5m_usd: pair.volume?.m5 ?? l.volume_5m_usd,
        volume_1h_usd: pair.volume?.h1 ?? l.volume_1h_usd,
        pct_change_5m: pair.priceChange?.m5 ?? l.pct_change_5m,
        pct_change_1h: pair.priceChange?.h1 ?? l.pct_change_1h,
        holders: holdersCount ?? l.holders,
        gini: giniVal ?? l.gini,
        nakamoto: nakaVal ?? l.nakamoto,
        entropy: entVal ?? l.entropy,
        dna_class: dna.dna_class,
        dna_score: dna.dna_score,
        last_refreshed_at: nowIso,
      }

      await sb.from("launches").update(updated).eq("mint", l.mint)

      // Alpha candidate detection
      const signal = computeAlphaSignal({ ...l, ...updated } as Launch)
      const passes =
        (updated.liquidity_usd ?? 0) >= cfg.min_liquidity_usd &&
        (updated.holders ?? 0) >= cfg.min_holders &&
        (updated.gini ?? 1) <= cfg.max_gini &&
        (updated.nakamoto ?? 0) >= cfg.min_nakamoto

      if (passes && signal.score >= 50) {
        const { data: existing } = await sb
          .from("alpha_candidates")
          .select("id, score, alerted")
          .eq("mint", l.mint)
          .order("detected_at", { ascending: false })
          .limit(1)
        const prev = existing?.[0]
        if (!prev || Math.abs((prev.score as number) - signal.score) > 5) {
          await sb.from("alpha_candidates").insert({
            mint: l.mint,
            reason: signal.reason,
            score: signal.score,
            details: signal.details,
          })
        }
        if (signal.score >= cfg.strong_alpha_score && cfg.telegram_enabled && !prev?.alerted) {
          const msg = formatStrongAlpha({
            symbol: updated.symbol ?? null,
            name: updated.name ?? null,
            mint: l.mint,
            score: signal.score,
            reason: signal.reason,
            liquidity_usd: updated.liquidity_usd ?? null,
            holders: updated.holders ?? null,
            pct_1h: updated.pct_change_1h ?? null,
          })
          const r = await sendTelegram(msg)
          await sb.from("alpha_candidates").update({ alerted: true }).eq("mint", l.mint)
          await sb.from("alerts").insert({
            kind: "strong_alpha",
            channel: "telegram",
            payload: { mint: l.mint, score: signal.score },
            ok: r.ok,
            error: r.ok ? null : r.error,
          })
          strongAlphas.push({ mint: l.mint, score: signal.score, reason: signal.reason })
        }
      }

      refreshed.push(l.mint)
    } catch {
      // skip per-mint failures
    }
  }

  return NextResponse.json({ ok: true, refreshed: refreshed.length, strong: strongAlphas.length, strongAlphas })
}
