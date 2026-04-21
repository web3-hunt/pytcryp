// DexScreener public API - no key required.
// We use it to enrich price/liquidity/volume for Solana mints.

export type DexPair = {
  chainId: string
  dexId: string
  pairAddress: string
  baseToken: { address: string; symbol: string; name: string }
  quoteToken: { address: string; symbol: string; name: string }
  priceUsd?: string
  liquidity?: { usd?: number }
  volume?: { h1?: number; h24?: number; m5?: number }
  priceChange?: { m5?: number; h1?: number; h24?: number }
  fdv?: number
  marketCap?: number
  pairCreatedAt?: number
}

export async function getDexPairsForMint(mint: string): Promise<DexPair[]> {
  const url = `https://api.dexscreener.com/latest/dex/tokens/${mint}`
  const res = await fetch(url, { cache: "no-store" })
  if (!res.ok) return []
  const json = (await res.json()) as { pairs?: DexPair[] }
  return (json.pairs || []).filter((p) => p.chainId === "solana")
}

export function bestPair(pairs: DexPair[]): DexPair | null {
  if (!pairs.length) return null
  return [...pairs].sort((a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0))[0]
}

export type DexProfile = {
  chainId: string
  tokenAddress: string
  description?: string
  icon?: string
  links?: Array<{ label?: string; type?: string; url: string }>
}

export async function getLatestSolanaProfiles(): Promise<DexProfile[]> {
  const res = await fetch("https://api.dexscreener.com/token-profiles/latest/v1", { cache: "no-store" })
  if (!res.ok) return []
  const json = (await res.json()) as DexProfile[] | { data?: DexProfile[] }
  const arr = Array.isArray(json) ? json : json.data || []
  return arr.filter((p) => p.chainId === "solana")
}

export async function getLatestBoostedSolana(): Promise<DexProfile[]> {
  const res = await fetch("https://api.dexscreener.com/token-boosts/latest/v1", { cache: "no-store" })
  if (!res.ok) return []
  const json = (await res.json()) as DexProfile[] | { data?: DexProfile[] }
  const arr = Array.isArray(json) ? json : json.data || []
  return arr.filter((p) => p.chainId === "solana")
}
