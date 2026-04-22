from __future__ import annotations

import json
import logging
from collections import defaultdict
from typing import Any

import numpy as np

log = logging.getLogger(__name__)


FEATURE_COLS = [
    "gini",
    "nakamoto",
    "entropy",
    "holder_count",
    "holder_vel_1h",
    "holder_accel",
    "volume_24h",
    "volume_vel",
    "bundle_fire",
    "sm_centrality",
    "cluster_mod",
    "wallet_age_score",
    "bonding_pct",
    "lp_burn",
    "mint_disabled",
    "freeze_disabled",
    "jupiter_verified",
    "creator_launches",
    "time_since_det",
    "detected_mcap",
    "real_buy_pct",
    "bayesian_score",
    "hour_of_detection",
    "day_of_week",
    "market_session",
]


class PredictionEngine:
    def __init__(self) -> None:
        self._thresholds: dict[str, float] = defaultdict(float)
        self._feature_weights: dict[str, float] = defaultdict(lambda: 1.0)
        self._bias_log: list[dict[str, Any]] = []

    def apply_bias_correction(self, micro_insights: list[dict]) -> None:
        for insight in micro_insights:
            typ = insight.get("type") or insight.get("insight_type")
            feature = insight.get("feature", "")
            direction = insight.get("direction", "increase")
            magnitude = float(insight.get("magnitude", 0.0))
            sign = 1.0 if direction == "increase" else -1.0
            if typ == "threshold_adjustment":
                self._thresholds[feature] += sign * magnitude
            elif typ == "weight_adjustment":
                self._feature_weights[feature] *= 1 + sign * magnitude
            log.info("Bias correction: %s %s %.3f", feature, direction, magnitude)
            self._bias_log.append(
                {
                    "type": typ,
                    "feature": feature,
                    "direction": direction,
                    "magnitude": magnitude,
                }
            )

    def score_prediction(self, feature_row: dict[str, float]) -> tuple[float, float]:
        # Lightweight placeholder model behavior with deterministic blending.
        vol = np.log1p(max(feature_row.get("volume_24h", 0.0), 0.0))
        holder = np.log1p(max(feature_row.get("holder_count", 1.0), 1.0))
        entropy = max(feature_row.get("entropy", 0.0), 0.0)
        smart = max(feature_row.get("sm_centrality", 0.0), 0.0)
        bundle = max(feature_row.get("bundle_fire", 0.0), 0.0)
        raw = 0.35 * vol + 0.2 * holder + 0.25 * entropy + 0.25 * smart - 0.2 * bundle
        prob_5x = float(1.0 / (1.0 + np.exp(-raw / 5)))
        mult = float(max(1.0, 1.0 + prob_5x * 9))
        return mult, prob_5x

    def compute_composite_score(
        self,
        mult: float,
        prob_5x: float,
        bayesian_score: float,
        feature_overrides: dict[str, float] | None = None,
    ) -> int:
        base = (0.5 * prob_5x * 100.0) + (0.3 * min(mult / 10.0, 1.0) * 100.0) + (0.2 * bayesian_score)
        adjusted = base
        if feature_overrides:
            for f, v in feature_overrides.items():
                w = self._feature_weights.get(f, 1.0)
                t = self._thresholds.get(f, 0.0)
                adjusted += (v - t) * 0.1 * w
        return int(np.clip(adjusted, 0, 100))

    def export_bias_state(self) -> str:
        return json.dumps({"thresholds": self._thresholds, "weights": self._feature_weights}, default=float)
