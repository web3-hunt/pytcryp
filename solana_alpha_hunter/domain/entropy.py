from __future__ import annotations

import math


def shannon_entropy(probabilities: list[float]) -> float:
    probs = [p for p in probabilities if p > 0]
    s = sum(probs)
    if s <= 0:
        return 0.0
    norm = [p / s for p in probs]
    return -sum(p * math.log2(p) for p in norm)
