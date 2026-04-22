from __future__ import annotations

import asyncio
from datetime import datetime

from domain.daily_report import generate_daily_report
from infrastructure.sqlite_store import SQLiteStore


class LearnerAgent:
    def __init__(self, store: SQLiteStore):
        self.store = store
        self._retrain_in_progress = False
        self._priority_reason: str | None = None

    async def run_momentum_rescan(self) -> None:
        return

    async def check_retrain_trigger(self) -> bool:
        return False

    async def run_retrain(self) -> None:
        self._retrain_in_progress = True
        try:
            unapplied = self.store.get_unapplied_insights()
            if unapplied:
                self.store.mark_insights_applied([int(i["id"]) for i in unapplied])
            self.store.insert_learner_journal(
                {
                    "date": datetime.utcnow().date().isoformat(),
                    "total_detections": 0,
                    "strong_alpha_count": 0,
                    "watch_count": 0,
                    "skip_count": 0,
                    "labeled_count": 0,
                    "tla_reports_read": 0,
                    "precision_5x": 0.0,
                    "brier_score": 0.0,
                    "mae_multiplier": 0.0,
                    "training_rows": 0,
                    "top_feature": "pending",
                    "pattern_learned": self._priority_reason or "scheduled cycle",
                    "best_call_mint": "",
                    "best_call_mult": 0.0,
                    "worst_miss_mint": "",
                    "worst_miss_note": "",
                    "edge_cases_noted": [],
                    "model_version_id": None,
                }
            )
        finally:
            self._retrain_in_progress = False
            self._priority_reason = None

    def flag_priority_retrain(self, reason: str):
        if not self._retrain_in_progress:
            self._priority_reason = reason
            asyncio.create_task(self.run_retrain())

    async def generate_daily_report(self) -> str:
        return generate_daily_report(self.store)
