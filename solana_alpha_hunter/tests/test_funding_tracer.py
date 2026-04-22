from domain.funding_tracer import classify_funding_wallet


def test_funding_label_unknown():
    assert classify_funding_wallet("random") == "unknown"
