import { NextResponse } from "next/server"
import { verifyCron } from "@/lib/cron-auth"
import { getSupabaseAdmin } from "@/lib/supabase/admin"
import type { Launch, GlobalSettings } from "@/lib/types"

export const dynamic = "force-dynamic"
export const maxDuration = 60

// Transparent, fully-explainable heuristic predictor.
// Produces a predicted pct change and confidence at multiple horizons.
// Runs every 5 minutes for recent launches.
function predictPct(l: Launch, horizonMin: number): { pct: number; confidence: number } {
  const dna = l.dna_score ?? 0
  const mom5 = l.pct_change_5m ?? 0
  const mom1h = l.pct_change_1h ?? 0
  const vol1h = l.volume_1h_usd ?? 0
  const liq = l.liquidity_usd ?? 0
  const holders = l.holders ?? 0

  // Momentum component decays with longer horizons but still biases longer moves.
  const momentum = mom5 * 0.4 + mom1h * 0.3
  const dnaBoost = (dna - 50) / 50 // -1..+1
  const volLiquidity = Math.min(1, (vol1h / Math.max(1000, liq)) * 0.5)
  const scaleByHorizon = Math.sqrt(horizonMin / 60)

  const pct = (momentum * 0.6 + dnaBoost * 15 + volLiquidity * 10) * scaleByHorizon

  // Confidence grows with holders + liquidity + data freshness, caps at 0.85.
  const conf = Math.max(
    0.1,
    Math.min(0.85, 0.2 + Math.log10(Math.max(1, holders)) * 0.15 + Math.log10(Math.max(1, liq)) * 0.08),
  )

  return { pct: Math.round(pct * 100) / 100, confidence: Math.round(conf * 100) / 100 }
}

function classify(pct: number): string {
  if (pct >= 30) return "moon"
  if (pct >= 10) return "bullish"
  if (pct <= -30) return "rug"
  if (pct <= -10) return "bearish"
  return "flat"
}

export async function GET(req: Request) {
  const deny = verifyCron(req)
  if (deny) return deny

  const sb = getSupabaseAdmin()
  const s = await sb.from("settings").select("value").eq("key", "global").maybeSingle()
  const cfg = (s.data?.value as GlobalSettings | undefined) || { prediction_horizons: [15, 60, 240] }

  const cutoff = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
  const { data: recent } = await sb
    .from("launches")
    .select("*")
    .gte("first_seen_at", cutoff)
    .not("dna_score", "is", null)
    .order("first_seen_at", { ascending: false })
    .limit(60)
  const launches = (recent || []) as Launch[]

  const rows: Array<Record<string, unknown>> = []
  for (const l of launches) {
    for (const h of cfg.prediction_horizons) {
      const { pct, confidence } = predictPct(l, h)
      rows.push({
        mint: l.mint,
        horizon_minutes: h,
        predicted_pct: pct,
        predicted_class: classify(pct),
        confidence,
        features: {
          dna: l.dna_score,
          pct_5m: l.pct_change_5m,
          pct_1h: l.pct_change_1h,
          vol_1h: l.volume_1h_usd,
          liq: l.liquidity_usd,
          holders: l.holders,
          gini: l.gini,
          nakamoto: l.nakamoto,
        },
      })
    }
  }

  if (rows.length) await sb.from("predictions").insert(rows)
  return NextResponse.json({ ok: true, predictions: rows.length })
}
