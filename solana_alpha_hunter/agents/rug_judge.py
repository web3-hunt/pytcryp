from __future__ import annotations


class RugJudgeAgent:
    def judge(self, features: dict) -> dict:
        score = 0.0
        score += 0.35 * min(1.0, features.get("gini", 0.0))
        score += 0.35 * min(1.0, features.get("bundle_fire", 0.0))
        score += 0.30 * (1.0 if features.get("mint_disabled", 0) == 0 else 0.0)
        return {"rug_risk": score}
