from __future__ import annotations

import asyncio
from datetime import datetime

from config import STRONG_ALPHA_SCORE, TLA_MAX_ACTIVE, WATCH_SCORE_MIN
from infrastructure.sqlite_store import SQLiteStore
from agents.token_lifecycle_agent import TokenLifecycleAgent

_tla_registry: dict[str, TokenLifecycleAgent] = {}


def active_tlas() -> dict[str, TokenLifecycleAgent]:
    dead = [mint for mint, tla in _tla_registry.items() if not tla.is_alive]
    for mint in dead:
        _tla_registry.pop(mint, None)
    return _tla_registry


async def spawn_tla(mint: str, detection_data: dict, store: SQLiteStore):
    reg = active_tlas()
    if len(reg) >= TLA_MAX_ACTIVE and detection_data.get("composite_score", 0) < WATCH_SCORE_MIN:
        return
    if len(reg) >= TLA_MAX_ACTIVE and detection_data.get("composite_score", 0) >= STRONG_ALPHA_SCORE:
        candidates = sorted(reg.items(), key=lambda kv: kv[1].detection_data.get("composite_score", 0))
        evicted_mint, evicted = candidates[0]
        evicted.is_alive = False
        reg.pop(evicted_mint, None)
    tla = TokenLifecycleAgent(mint, detection_data, store)
    reg[mint] = tla
    asyncio.create_task(tla.run())


def live_status_rows() -> list[dict]:
    now = datetime.utcnow()
    out = []
    for mint, tla in active_tlas().items():
        mins = (now - tla.started_at).total_seconds() / 60
        curr = tla.snapshots[-1].price_mult_so_far if tla.snapshots else 1.0
        out.append(
            {
                "mint": mint,
                "minutes_alive": round(mins, 1),
                "current_mult": round(curr, 3),
                "peak_mult": round(tla.peak_mult, 3),
                "snapshots": len(tla.snapshots),
                "status": "Declining" if curr < tla.peak_mult * 0.7 else "Watching",
            }
        )
    return out
