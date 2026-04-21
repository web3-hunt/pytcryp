// Solana program IDs we monitor for new token launches.
// Pulled from the spec.
export const PROGRAM_IDS = {
  PUMP_FUN: "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P",
  PUMP_FUN_AMM: "pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA",
  RAYDIUM_LAUNCHPAD: "LanMV9sAd7wArD4vJFi2qDdfnVhFxYSUg6eADduJ3uj",
  RAYDIUM_CPMM: "CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C",
  RAYDIUM_CLMM: "CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK",
  RAYDIUM_AMM_V4: "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8",
  METEORA_DAMM_V2: "cpamdpZCGKUy5JxQXB4dcpGPiikHawvSWAd6mEn1sGG",
  METEORA_DLMM: "LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo",
  METEORA_DBC: "dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN",
  METEORA_POOLS: "Eo7WjKq67rjJQSZxS6z3YkapzY3eMj6Xy8X5EQVn5UaB",
  SOL_FUN: "F5tfvb1broBsynWXmTJvisF2KAhY8zAz3L3chLjXM3cr",
  LETSBONK_FUN: "LanMV9sAd7wArD4vJFi2qDdfnVhFxYSUg6eADduJ3uj",
  BELIEVE_APP: "5qWya6UjwWnGVhdSBL3hyZ7B45jbk6Byt1hwd7ohEGXE",
  ORCA_WHIRLPOOL: "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc",
  JUPITER_STUDIO: "jupnzuYBZ8sb3QBVyB1h2FH4ie2tYeHMe6Fg4tRuNZw",
} as const

export type ProgramKey = keyof typeof PROGRAM_IDS

export const PROGRAM_LABELS: Record<string, string> = {
  [PROGRAM_IDS.PUMP_FUN]: "Pump.fun",
  [PROGRAM_IDS.PUMP_FUN_AMM]: "Pump.fun AMM",
  [PROGRAM_IDS.RAYDIUM_LAUNCHPAD]: "Raydium Launchpad",
  [PROGRAM_IDS.RAYDIUM_CPMM]: "Raydium CPMM",
  [PROGRAM_IDS.RAYDIUM_CLMM]: "Raydium CLMM",
  [PROGRAM_IDS.RAYDIUM_AMM_V4]: "Raydium AMM v4",
  [PROGRAM_IDS.METEORA_DAMM_V2]: "Meteora DAMM v2",
  [PROGRAM_IDS.METEORA_DLMM]: "Meteora DLMM",
  [PROGRAM_IDS.METEORA_DBC]: "Meteora DBC",
  [PROGRAM_IDS.METEORA_POOLS]: "Meteora Pools",
  [PROGRAM_IDS.SOL_FUN]: "Sol.fun",
  [PROGRAM_IDS.BELIEVE_APP]: "Believe",
  [PROGRAM_IDS.ORCA_WHIRLPOOL]: "Orca Whirlpool",
  [PROGRAM_IDS.JUPITER_STUDIO]: "Jupiter Studio",
}

export function labelProgram(id: string): string {
  return PROGRAM_LABELS[id] || id.slice(0, 6) + "…" + id.slice(-4)
}
