import type { Launch } from "./types"

export type AlphaSignal = {
  score: number
  reason: string
  details: Record<string, unknown>
}

// Combine DNA quality + early-market traction into an "alpha score" in [0, 100].
export function computeAlphaSignal(l: Launch): AlphaSignal {
  const dna = l.dna_score ?? 0
  const pct = l.pct_change_1h ?? 0
  const vol = l.volume_1h_usd ?? 0
  const liq = l.liquidity_usd ?? 0
  const holders = l.holders ?? 0

  const traction =
    Math.min(15, Math.max(0, pct / 5)) + // up to +15 for +75% in 1h
    Math.min(10, Math.log10(Math.max(1, vol)) * 2) +
    Math.min(10, Math.log10(Math.max(1, liq)) * 2) +
    Math.min(10, holders / 50)

  const score = Math.min(100, dna * 0.55 + traction)

  const reasons: string[] = []
  if (l.dna_class === "strong_alpha") reasons.push("strong DNA")
  if (pct >= 25) reasons.push(`+${pct.toFixed(0)}% 1h`)
  if (liq >= 25_000) reasons.push(`$${Math.round(liq / 1000)}k liq`)
  if (holders >= 100) reasons.push(`${holders} holders`)

  return {
    score: Math.round(score * 10) / 10,
    reason: reasons.join(" · ") || "baseline",
    details: { dna, traction, pct, vol, liq, holders },
  }
}
