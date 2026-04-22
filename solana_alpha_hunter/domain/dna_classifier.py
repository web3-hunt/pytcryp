from __future__ import annotations


def classify_dna(bundle_fire: float, entropy: float, holder_count: int) -> tuple[str, float]:
    if bundle_fire > 0.8 and entropy < 2.0:
        return "Cabal", 0.84
    if bundle_fire > 0.6:
        return "Bundled", 0.73
    if entropy > 3.5 and holder_count > 300:
        return "Organic", 0.78
    return "Unknown", 0.5
