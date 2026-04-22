from __future__ import annotations

from config import CEX_WALLETS


def classify_funding_wallet(wallet: str) -> str:
    for name, addr in CEX_WALLETS.items():
        if wallet == addr:
            return f"cex:{name.lower()}"
    return "unknown"
