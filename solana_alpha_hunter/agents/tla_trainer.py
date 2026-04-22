from __future__ import annotations

import json
from collections import Counter, defaultdict
from typing import Any

from domain.prediction_engine import PredictionEngine
from infrastructure.sqlite_store import SQLiteStore


class TLATrainer:
    async def run_cycle(self, store: SQLiteStore, engine: PredictionEngine, learner) -> dict[str, int]:
        rows = store.get_unprocessed_tla_reports()
        if not rows:
            store.add_tla_trainer_log(0, 0)
            return {"processed": 0, "insights": 0, "edge_cases": 0}

        edge_bucket: Counter[str] = Counter()
        notes_by_feature: dict[str, list[str]] = defaultdict(list)
        source_mints_by_feature: dict[str, list[str]] = defaultdict(list)
        for r in rows:
            edge_cases = json.loads(r.get("edge_cases") or "[]")
            for e in edge_cases:
                edge_bucket[e] += 1
            if "bonding" in (r.get("what_would_improve") or "").lower():
                notes_by_feature["bonding_pct"].append(r["what_would_improve"])
                source_mints_by_feature["bonding_pct"].append(r["mint_address"])
            if r.get("was_false_positive"):
                notes_by_feature["dna_label"].append("Reduce organic bias due to false positives.")
                source_mints_by_feature["dna_label"].append(r["mint_address"])

        insights: list[dict[str, Any]] = []
        if len(notes_by_feature["bonding_pct"]) >= 3:
            insights.append(
                {
                    "insight_type": "threshold_adjustment",
                    "type": "threshold_adjustment",
                    "feature": "bonding_pct",
                    "direction": "decrease",
                    "magnitude": 5.0,
                    "reason": "3+ TLA reports indicate bonding threshold too strict.",
                    "source_mints": source_mints_by_feature["bonding_pct"],
                }
            )
        if edge_bucket.get("late_bloomer", 0) >= 5:
            insights.append(
                {
                    "insight_type": "threshold_adjustment",
                    "type": "threshold_adjustment",
                    "feature": "decay_half_life",
                    "direction": "increase",
                    "magnitude": 2.0,
                    "reason": "Late bloomers peaked after 12h; extend watch decay.",
                    "source_mints": [],
                }
            )
        if len(notes_by_feature["dna_label"]) >= 3:
            insights.append(
                {
                    "insight_type": "weight_adjustment",
                    "type": "weight_adjustment",
                    "feature": "dna_organic_weight",
                    "direction": "decrease",
                    "magnitude": 0.1,
                    "reason": "False positives concentrated in Organic label.",
                    "source_mints": source_mints_by_feature["dna_label"],
                }
            )

        if insights:
            store.insert_tla_insights(insights)
            engine.apply_bias_correction(insights)

        if len(rows) >= 10:
            learner.flag_priority_retrain(reason="10+ TLA reports ready")

        store.add_tla_trainer_log(len(rows), len(insights))
        return {"processed": len(rows), "insights": len(insights), "edge_cases": sum(edge_bucket.values())}
