// Helius RPC + Enhanced APIs.
// We use HTTP (no long-lived websockets) so the cron-driven pipeline is serverless-friendly.

const HELIUS_API_KEY = process.env.HELIUS_API_KEY

export function heliusRpcUrl() {
  if (!HELIUS_API_KEY) throw new Error("HELIUS_API_KEY not set")
  return `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`
}

export function heliusEnhancedUrl(path: string) {
  if (!HELIUS_API_KEY) throw new Error("HELIUS_API_KEY not set")
  return `https://api.helius.xyz/v0/${path}?api-key=${HELIUS_API_KEY}`
}

export type HeliusToken = {
  mint: string
  symbol?: string
  name?: string
  supply?: number
  decimals?: number
}

async function rpc<T = unknown>(method: string, params: unknown[]): Promise<T> {
  const res = await fetch(heliusRpcUrl(), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: "v0", method, params }),
    cache: "no-store",
  })
  if (!res.ok) throw new Error(`helius rpc ${method} ${res.status}`)
  const j = (await res.json()) as { result?: T; error?: { message: string } }
  if (j.error) throw new Error(`helius rpc ${method}: ${j.error.message}`)
  return j.result as T
}

export async function getSignaturesForAddress(address: string, limit = 25) {
  return rpc<Array<{ signature: string; slot: number; blockTime: number | null; err: unknown }>>(
    "getSignaturesForAddress",
    [address, { limit }],
  )
}

export async function getParsedTransactions(signatures: string[]) {
  if (!signatures.length) return []
  const url = heliusEnhancedUrl("transactions")
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ transactions: signatures }),
    cache: "no-store",
  })
  if (!res.ok) throw new Error(`helius parsed-tx ${res.status}`)
  return (await res.json()) as Array<{
    signature: string
    timestamp: number
    slot: number
    type: string
    source: string
    description: string
    fee: number
    feePayer: string
    accountData: unknown[]
    tokenTransfers: Array<{
      mint: string
      fromUserAccount: string
      toUserAccount: string
      tokenAmount: number
    }>
    instructions: unknown[]
    events?: Record<string, unknown>
  }>
}

// Token holders via Helius DAS getTokenAccounts (paginated).
export async function getTokenHolders(mint: string, maxPages = 3, pageSize = 1000) {
  const balances: Array<{ owner: string; amount: number }> = []
  const aggregate: Record<string, number> = {}
  for (let page = 1; page <= maxPages; page++) {
    const result = await rpc<{
      token_accounts: Array<{ owner: string; amount: string | number }>
      total?: number
      cursor?: string
    }>("getTokenAccounts", [{ mint, limit: pageSize, page }])
    const accts = result?.token_accounts || []
    if (!accts.length) break
    for (const a of accts) {
      const amt = typeof a.amount === "string" ? Number(a.amount) : a.amount
      if (!Number.isFinite(amt) || amt <= 0) continue
      aggregate[a.owner] = (aggregate[a.owner] || 0) + amt
    }
    if (accts.length < pageSize) break
  }
  for (const [owner, amount] of Object.entries(aggregate)) {
    balances.push({ owner, amount })
  }
  return balances
}

// Asset / metadata via Helius DAS.
export async function getAsset(mint: string) {
  return rpc<{
    id: string
    content?: {
      metadata?: { name?: string; symbol?: string; description?: string }
      links?: { image?: string }
    }
    token_info?: { supply?: number; decimals?: number; price_info?: { price_per_token?: number } }
    ownership?: { owner?: string }
  }>("getAsset", [{ id: mint }])
}
