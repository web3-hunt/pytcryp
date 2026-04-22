from __future__ import annotations

from domain.gini import gini_coefficient


class HolderIntelligenceAgent:
    def analyze(self, holder_pcts: list[float]) -> dict:
        return {"gini": gini_coefficient(holder_pcts), "holder_count": len(holder_pcts)}
