from domain.features import build_feature_vector


def test_build_feature_vector_has_25_fields():
    row = build_feature_vector({"holder_pcts": [50, 20, 10, 10, 10], "holder_count": 5})
    assert len(row.keys()) == 25
