from __future__ import annotations


class SniperCommanderAgent:
    def decide(self, score: int, prob_5x: float) -> str:
        if score >= 85 and prob_5x >= 0.6:
            return "strong_alpha"
        if score >= 65 and prob_5x >= 0.4:
            return "watch"
        return "skip"
