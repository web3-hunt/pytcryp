from __future__ import annotations


def narrate(price_change_1h: float, volume_1h: float) -> str:
    if price_change_1h > 25 and volume_1h > 50_000:
        return "Momentum breakout with strong participation."
    if price_change_1h < -30:
        return "Sharp drawdown; risk-off profile."
    return "Neutral structure with mixed momentum."
