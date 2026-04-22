from domain.dna_classifier import classify_dna


def test_dna_classifier():
    label, conf = classify_dna(0.9, 1.0, 30)
    assert label == "Cabal"
    assert conf > 0.8
