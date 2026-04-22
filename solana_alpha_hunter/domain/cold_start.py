from __future__ import annotations

import random


def seed_cold_start_rows(n: int = 100) -> list[dict]:
    rows = []
    for i in range(n):
        rows.append(
            {
                "mint_address": f"cold_{i}",
                "realized_gain": round(random.uniform(0.2, 8.0), 3),
                "label_source": "cold_start",
            }
        )
    return rows
