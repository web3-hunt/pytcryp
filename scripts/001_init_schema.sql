-- Alpha Scanner schema
-- Core entities: launches, wallets, wallet_launches (forensics), alpha_candidates,
-- predictions, watchlist, daily_reports, settings, alerts.

create extension if not exists "uuid-ossp";

-- ---------- launches ----------
create table if not exists launches (
  mint text primary key,
  symbol text,
  name text,
  program_id text not null,
  source text not null,                 -- pumpfun | pumpswap | raydium | meteora | orca | other
  created_slot bigint,
  created_at timestamptz not null default now(),
  first_seen_at timestamptz not null default now(),
  creator text,
  liquidity_usd numeric,
  market_cap_usd numeric,
  price_usd numeric,
  holders int,
  volume_5m_usd numeric,
  volume_1h_usd numeric,
  pct_change_5m numeric,
  pct_change_1h numeric,
  gini numeric,                          -- holder concentration
  nakamoto int,                          -- min wallets to control >50%
  entropy numeric,                       -- shannon
  dna_class text,                        -- sniper_cluster | team_insider | bot_farm | organic | unknown
  dna_score numeric,                     -- 0-100 alpha score
  last_refreshed_at timestamptz,
  metadata jsonb default '{}'::jsonb
);
create index if not exists launches_created_at_idx on launches(created_at desc);
create index if not exists launches_dna_score_idx on launches(dna_score desc nulls last);
create index if not exists launches_source_idx on launches(source);

-- ---------- wallets (hall of fame) ----------
create table if not exists wallets (
  address text primary key,
  label text,
  first_seen_at timestamptz not null default now(),
  last_active_at timestamptz,
  total_launches_hit int default 0,
  winning_launches int default 0,
  losing_launches int default 0,
  avg_entry_pct_change numeric,          -- avg % change from entry to +1h
  hit_rate numeric,                      -- winning / total
  alpha_score numeric,                   -- composite 0-100
  tags text[] default '{}',              -- sniper, insider, bot, whale, organic
  is_starred boolean default false,
  notes text,
  updated_at timestamptz not null default now()
);
create index if not exists wallets_alpha_score_idx on wallets(alpha_score desc nulls last);
create index if not exists wallets_hit_rate_idx on wallets(hit_rate desc nulls last);

-- ---------- wallet <-> launch relation ----------
create table if not exists wallet_launches (
  wallet text not null references wallets(address) on delete cascade,
  mint text not null references launches(mint) on delete cascade,
  action text not null,                  -- buy | sell | mint | transfer
  amount numeric,
  price_usd numeric,
  value_usd numeric,
  tx_sig text,
  block_time timestamptz,
  slot bigint,
  is_early boolean default false,        -- bought within first N blocks
  created_at timestamptz not null default now(),
  primary key (wallet, mint, tx_sig)
);
create index if not exists wl_mint_idx on wallet_launches(mint);
create index if not exists wl_wallet_idx on wallet_launches(wallet);

-- ---------- alpha_candidates (live feed highlights) ----------
create table if not exists alpha_candidates (
  id uuid primary key default uuid_generate_v4(),
  mint text not null references launches(mint) on delete cascade,
  detected_at timestamptz not null default now(),
  reason text not null,                  -- e.g. "strong_alpha", "whale_cluster", "low_gini"
  score numeric not null,
  details jsonb default '{}'::jsonb,
  alerted boolean default false
);
create index if not exists ac_detected_idx on alpha_candidates(detected_at desc);
create index if not exists ac_score_idx on alpha_candidates(score desc);

-- ---------- watchlist ----------
create table if not exists watchlist (
  id uuid primary key default uuid_generate_v4(),
  kind text not null,                    -- wallet | mint
  target text not null,
  label text,
  note text,
  created_at timestamptz not null default now(),
  unique (kind, target)
);

-- ---------- predictions ----------
create table if not exists predictions (
  id uuid primary key default uuid_generate_v4(),
  mint text not null references launches(mint) on delete cascade,
  created_at timestamptz not null default now(),
  horizon_minutes int not null,          -- 15, 60, 240
  predicted_pct numeric not null,        -- predicted % move
  predicted_class text,                  -- up_strong | up | flat | down | rug
  confidence numeric,                    -- 0-1
  features jsonb default '{}'::jsonb,
  resolved_at timestamptz,
  actual_pct numeric,
  correct boolean
);
create index if not exists predictions_mint_idx on predictions(mint);
create index if not exists predictions_created_idx on predictions(created_at desc);

-- ---------- daily_reports ----------
create table if not exists daily_reports (
  report_date date primary key,
  generated_at timestamptz not null default now(),
  total_launches int,
  alpha_candidates int,
  strong_alphas int,
  top_gainers jsonb,
  top_losers jsonb,
  wallet_leaders jsonb,
  prediction_accuracy numeric,
  narration text,                        -- LLM generated
  stats jsonb default '{}'::jsonb
);

-- ---------- settings (single row, keyed by 'global') ----------
create table if not exists settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

-- Seed default settings
insert into settings (key, value) values
  ('global', jsonb_build_object(
    'min_liquidity_usd', 1000,
    'min_holders', 25,
    'max_gini', 0.85,
    'min_nakamoto', 3,
    'strong_alpha_score', 75,
    'scan_interval_seconds', 60,
    'telegram_enabled', true,
    'prediction_horizons', array[15, 60, 240]
  ))
on conflict (key) do nothing;

-- ---------- alerts log ----------
create table if not exists alerts (
  id uuid primary key default uuid_generate_v4(),
  kind text not null,                    -- strong_alpha | daily_report | watch_hit
  payload jsonb not null,
  sent_at timestamptz not null default now(),
  channel text,                          -- telegram
  ok boolean default true,
  error text
);

-- ---------- enable realtime ----------
alter publication supabase_realtime add table launches;
alter publication supabase_realtime add table alpha_candidates;
alter publication supabase_realtime add table wallets;
alter publication supabase_realtime add table predictions;
