from __future__ import annotations

from domain.entropy import shannon_entropy
from domain.gini import gini_coefficient


def build_feature_vector(raw: dict) -> dict:
    holder_pcts = raw.get("holder_pcts", [])
    return {
        "gini": gini_coefficient(holder_pcts),
        "nakamoto": float(raw.get("nakamoto", 0)),
        "entropy": shannon_entropy(holder_pcts),
        "holder_count": int(raw.get("holder_count", 0)),
        "holder_vel_1h": float(raw.get("holder_vel_1h", 0)),
        "holder_accel": float(raw.get("holder_accel", 0)),
        "volume_24h": float(raw.get("volume_24h", 0)),
        "volume_vel": float(raw.get("volume_vel", 0)),
        "bundle_fire": float(raw.get("bundle_fire", 0)),
        "sm_centrality": float(raw.get("sm_centrality", 0)),
        "cluster_mod": float(raw.get("cluster_mod", 0)),
        "wallet_age_score": float(raw.get("wallet_age_score", 0)),
        "bonding_pct": float(raw.get("bonding_pct", 0)),
        "lp_burn": int(raw.get("lp_burn", 0)),
        "mint_disabled": int(raw.get("mint_disabled", 0)),
        "freeze_disabled": int(raw.get("freeze_disabled", 0)),
        "jupiter_verified": int(raw.get("jupiter_verified", 0)),
        "creator_launches": int(raw.get("creator_launches", 0)),
        "time_since_det": float(raw.get("time_since_det", 0)),
        "detected_mcap": float(raw.get("detected_mcap", 0)),
        "real_buy_pct": float(raw.get("real_buy_pct", 0)),
        "bayesian_score": float(raw.get("bayesian_score", 50)),
        "hour_of_detection": int(raw.get("hour_of_detection", 0)),
        "day_of_week": int(raw.get("day_of_week", 0)),
        "market_session": int(raw.get("market_session", 0)),
    }
