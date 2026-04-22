from __future__ import annotations


def label_gain(mult: float) -> float:
    return max(mult, 0.0)
