export type Launch = {
  mint: string
  symbol: string | null
  name: string | null
  program_id: string
  source: string
  created_slot: number | null
  created_at: string
  first_seen_at: string
  creator: string | null
  liquidity_usd: number | null
  market_cap_usd: number | null
  price_usd: number | null
  holders: number | null
  volume_5m_usd: number | null
  volume_1h_usd: number | null
  pct_change_5m: number | null
  pct_change_1h: number | null
  gini: number | null
  nakamoto: number | null
  entropy: number | null
  dna_class: string | null
  dna_score: number | null
  last_refreshed_at: string | null
  metadata: Record<string, unknown>
}

export type Wallet = {
  address: string
  label: string | null
  first_seen_at: string
  last_active_at: string | null
  total_launches_hit: number
  winning_launches: number
  losing_launches: number
  avg_entry_pct_change: number | null
  hit_rate: number | null
  alpha_score: number | null
  tags: string[]
  is_starred: boolean
  notes: string | null
  updated_at: string
}

export type AlphaCandidate = {
  id: string
  mint: string
  detected_at: string
  reason: string
  score: number
  details: Record<string, unknown>
  alerted: boolean
}

export type Prediction = {
  id: string
  mint: string
  created_at: string
  horizon_minutes: number
  predicted_pct: number
  predicted_class: string | null
  confidence: number | null
  features: Record<string, unknown>
  resolved_at: string | null
  actual_pct: number | null
  correct: boolean | null
}

export type WatchlistItem = {
  id: string
  kind: "wallet" | "mint" | "creator"
  target: string
  label: string | null
  note: string | null
  created_at: string
}

export type DailyReport = {
  report_date: string
  generated_at: string
  total_launches: number
  alpha_candidates: number
  strong_alphas: number
  top_gainers: unknown[]
  top_losers: unknown[]
  wallet_leaders: unknown[]
  prediction_accuracy: number | null
  narration: string | null
  stats: Record<string, unknown>
}

export type GlobalSettings = {
  min_liquidity_usd: number
  min_holders: number
  max_gini: number
  min_nakamoto: number
  strong_alpha_score: number
  scan_interval_seconds: number
  telegram_enabled: boolean
  prediction_horizons: number[]
}
