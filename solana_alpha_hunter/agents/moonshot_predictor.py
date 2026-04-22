from __future__ import annotations

from domain.prediction_engine import PredictionEngine


class MoonshotPredictorAgent:
    def __init__(self, engine: PredictionEngine):
        self.engine = engine

    def predict(self, features: dict) -> dict:
        mult, prob = self.engine.score_prediction(features)
        score = self.engine.compute_composite_score(mult, prob, features.get("bayesian_score", 50), features)
        return {"predicted_mult": mult, "prob_5x": prob, "composite_score": score}
