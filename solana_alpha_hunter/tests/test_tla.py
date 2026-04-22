from __future__ import annotations

import asyncio

from agents.token_lifecycle_agent import TokenLifecycleAgent
from infrastructure.sqlite_store import SQLiteStore


def test_tla_writes_postmortem():
    store = SQLiteStore(":memory:")
    tla = TokenLifecycleAgent(
        "mint_test",
        {
            "token_name": "TEST",
            "price_usd": 1.0,
            "holder_count": 10,
            "bonding_pct": 50,
            "dna_label": "Organic",
            "composite_score": 70,
            "predicted_mult": 2.0,
            "prob_5x": 0.4,
        },
        store,
    )
    asyncio.run(tla.write_post_mortem())
    reports = store.get_recent_tla_reports(1)
    assert len(reports) == 1
    assert reports[0]["mint_address"] == "mint_test"
