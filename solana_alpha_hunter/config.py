from __future__ import annotations

import os
from dataclasses import dataclass

PUMP_FUN_PROGRAM_ID = "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P"
RAYDIUM_AMM_V4_ID = "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8"

HELIUS_WS_URL = "wss://mainnet.helius-rpc.com/?api-key={KEY}"
HELIUS_RPC_URL = "https://mainnet.helius-rpc.com/?api-key={KEY}"
HELIUS_RECONNECT_BASE = 1
HELIUS_RECONNECT_MAX = 30

DEX_PAIRS_URL = "https://api.dexscreener.com/dex/pairs/solana/{pair_addr}"
DEX_TOKENS_URL = "https://api.dexscreener.com/dex/tokens/{mint_addr}"
DEX_SEARCH_URL = "https://api.dexscreener.com/latest/dex/search?q={query}"
DEX_TRENDING_URL = "https://api.dexscreener.com/token-boosts/top/v1"
DEXTOOLS_TRENDING_URL = (
    "https://www.dextools.io/shared/analytics/pairs?chain=solana&interval=1h&page=0&pageSize=50"
)

JUPITER_STRICT_URL = "https://token.jup.ag/strict"

LP_LOCK_PROGRAMS = [
    "LockR4oJsF5Q9AZoRnQ7JpFxwBwXV5xSMUE5mhb9MZ",
    "strmRqUCoQUgGUan5YhzUZa6KqdzwX5L6FpUxfmKg5m",
]
BURN_ADDRESS = "1nc1nerator11111111111111111111111111111111"
JITO_TIP_ACCOUNT = "96gYZGLnJYVFmbjzopPSU6QiEV5fGqZNyN9nmNhvrZU5"

CEX_WALLETS = {
    "Binance": "5tzFkiKscXHK5ms71DkPdmjgcUe3UrGPbSFsF3WB9YHa",
    "Coinbase": "GJRs4FwHtemZ5ZE9x3FNvJ8TMwitKTh21yxdRPqn7npE",
    "Kraken": "FWznbcNXWQuHTawe9RxvQ2LdCENssh12dsznf4RiouN5",
    "OKX": "5VCwKtCXgCJ6kit5FybXjvriW3xELsFDhx88PvqFHam9",
    "Bybit": "A7qPGNnZeZEDHcardV5A5LmNaHVqEv8YhMumLobgFnNX",
}

STRONG_ALPHA_SCORE = 85
STRONG_ALPHA_PROB = 0.60
WATCH_SCORE_MIN = 65
WATCH_PROB_MIN = 0.40
DECAY_LAMBDA = 0.3466

RESCAN_INTERVAL_MIN = 5
RESCAN_WINDOW_HOURS = 2
RESCAN_MAX_MCAP = 30_000
DEXTRENDS_SCAN_INTERVAL_MIN = 10

RETRAIN_NEW_ROWS = 50
RETRAIN_INTERVAL_DAYS = 7
COLD_START_MIN_ROWS = 80

TLA_POSTMORTEM_DELAY_H = 24
TLA_SNAPSHOT_INTERVAL_MIN = 15
TLA_MAX_ACTIVE = 200
TLA_REPORTS_DIR = "tla_reports/"

GRAPH_NODE_CAP = 500
REPORT_HOUR_UTC = 0
REPORTS_DIR = "reports/"

GMGN_LINK = "https://gmgn.ai/sol/token/{mint}"
DEXTOOLS_LINK = "https://www.dextools.io/app/en/solana/pair-explorer/{pair}"
BIRDEYE_LINK = "https://birdeye.so/token/{mint}?chain=solana"

DB_PATH = "alpha_hunter.db"
TEST_MODE = False


@dataclass
class Secrets:
    helius_api_key: str = os.getenv("HELIUS_API_KEY", "")
    telegram_bot_token: str = os.getenv("TELEGRAM_BOT_TOKEN", "")
    telegram_chat_id: str = os.getenv("TELEGRAM_CHAT_ID", "")
