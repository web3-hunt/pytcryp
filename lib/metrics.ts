// Distribution + DNA metrics for token launches.
// All inputs are arrays of non-negative balances.

export function gini(balances: number[]): number {
  const n = balances.length
  if (n === 0) return 0
  const sorted = [...balances].filter((x) => x >= 0).sort((a, b) => a - b)
  const total = sorted.reduce((s, x) => s + x, 0)
  if (total === 0) return 0
  let cumulative = 0
  let weighted = 0
  for (let i = 0; i < sorted.length; i++) {
    cumulative += sorted[i]
    weighted += cumulative
  }
  // Classic formula: G = (2*sum(i*x_i) / (n*sum) ) - (n+1)/n
  // Equivalent rearrangement using cumulative sums:
  const g = (2 * weighted) / (n * total) - (n + 1) / n
  return Math.max(0, Math.min(1, g))
}

// Nakamoto coefficient: minimum number of holders needed to collectively hold > threshold (default 51%).
export function nakamoto(balances: number[], threshold = 0.51): number {
  const total = balances.reduce((s, x) => s + x, 0)
  if (total === 0) return 0
  const sorted = [...balances].sort((a, b) => b - a)
  let cumulative = 0
  for (let i = 0; i < sorted.length; i++) {
    cumulative += sorted[i]
    if (cumulative / total > threshold) return i + 1
  }
  return sorted.length
}

// Shannon entropy of a holder distribution, normalized to [0,1] against log2(n).
export function entropy(balances: number[]): number {
  const total = balances.reduce((s, x) => s + x, 0)
  const n = balances.length
  if (total === 0 || n <= 1) return 0
  let h = 0
  for (const b of balances) {
    if (b <= 0) continue
    const p = b / total
    h -= p * Math.log2(p)
  }
  return h / Math.log2(n)
}

export type DnaFeatures = {
  gini: number
  nakamoto: number
  entropy: number
  holders: number
  liquidity_usd: number
  volume_1h_usd: number
  age_minutes: number
}

export type DnaClass = "strong_alpha" | "promising" | "neutral" | "risky" | "rug_risk"

export type DnaResult = {
  dna_class: DnaClass
  dna_score: number // 0..100
  components: Record<string, number>
}

// Transparent, explainable DNA classifier (no ML dependency).
// Score is a weighted sum of normalized features; class is derived from the score + hard rules.
export function classifyDna(f: DnaFeatures): DnaResult {
  const decentralization = Math.max(0, 1 - f.gini) // 1 = perfectly even, 0 = one whale
  const nakaNorm = Math.min(1, f.nakamoto / 10) // 10+ = very decentralized
  const entropyNorm = Math.max(0, Math.min(1, f.entropy))
  const holdersNorm = Math.min(1, f.holders / 500)
  const liqNorm = Math.min(1, Math.log10(Math.max(1, f.liquidity_usd)) / 6) // $1M → 1.0
  const volNorm = Math.min(1, Math.log10(Math.max(1, f.volume_1h_usd)) / 6)
  const ageFactor = f.age_minutes < 5 ? 0.7 : Math.min(1, f.age_minutes / 60)

  const components = {
    decentralization: decentralization * 25,
    nakamoto: nakaNorm * 15,
    entropy: entropyNorm * 15,
    holders: holdersNorm * 15,
    liquidity: liqNorm * 15,
    volume: volNorm * 10,
    maturity: ageFactor * 5,
  }
  const score = Object.values(components).reduce((s, v) => s + v, 0)

  let dna_class: DnaClass
  if (f.gini > 0.95 || f.nakamoto <= 1) dna_class = "rug_risk"
  else if (score >= 75) dna_class = "strong_alpha"
  else if (score >= 60) dna_class = "promising"
  else if (score >= 40) dna_class = "neutral"
  else dna_class = "risky"

  return { dna_class, dna_score: Math.round(score * 10) / 10, components }
}

export function dnaClassColor(c: DnaClass | string | null | undefined): string {
  switch (c) {
    case "strong_alpha":
      return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
    case "promising":
      return "bg-teal-500/15 text-teal-400 border-teal-500/30"
    case "neutral":
      return "bg-zinc-500/15 text-zinc-400 border-zinc-500/30"
    case "risky":
      return "bg-amber-500/15 text-amber-400 border-amber-500/30"
    case "rug_risk":
      return "bg-red-500/15 text-red-400 border-red-500/30"
    default:
      return "bg-zinc-500/15 text-zinc-400 border-zinc-500/30"
  }
}

export function dnaClassLabel(c: DnaClass | string | null | undefined): string {
  switch (c) {
    case "strong_alpha":
      return "Strong Alpha"
    case "promising":
      return "Promising"
    case "neutral":
      return "Neutral"
    case "risky":
      return "Risky"
    case "rug_risk":
      return "Rug Risk"
    default:
      return "Unclassified"
  }
}
