from app.schemas.detection import (
    BoundingBox,
    Detection,
    ImageDetections,
)
from app.services.damage_calculator import (
    calculate_damage_scores,
    claim_to_generation,
)


def _img(width: int, height: int, dets: list[Detection]) -> ImageDetections:
    return ImageDetections(image_index=0, width=width, height=height, detections=dets)


def _box(x1: float, y1: float, x2: float, y2: float) -> BoundingBox:
    return BoundingBox(x_min=x1, y_min=y1, x_max=x2, y_max=y2)


def test_no_damage_returns_zero_scores() -> None:
    img = _img(
        1000,
        1000,
        [Detection(label="gen_13", confidence=0.9, bbox=_box(100, 100, 900, 900))],
    )
    scores = calculate_damage_scores([img])
    assert scores.screen == 0.0
    assert scores.body == 0.0


def test_crack_in_top_half_scores_screen() -> None:
    img = _img(
        1000,
        1000,
        [
            Detection(label="gen_12_13", confidence=0.95, bbox=_box(100, 100, 900, 900)),
            Detection(label="crack", confidence=0.8, bbox=_box(300, 200, 500, 400)),
        ],
    )
    scores = calculate_damage_scores([img])
    assert scores.screen > 0.0
    assert scores.body == 0.0


def test_dent_scores_body() -> None:
    img = _img(
        1000,
        1000,
        [
            Detection(label="gen_11", confidence=0.9, bbox=_box(100, 100, 900, 900)),
            Detection(label="dent", confidence=0.7, bbox=_box(800, 850, 870, 890)),
        ],
    )
    scores = calculate_damage_scores([img])
    assert scores.body > 0.0


def test_claim_to_generation_known() -> None:
    assert claim_to_generation("iPhone 13 Pro Max") == "gen_12_13"
    assert claim_to_generation("iphone 17 pro") == "gen_17"
    assert claim_to_generation("iPhone 7 Plus") == "gen_7_8"


def test_claim_to_generation_unknown() -> None:
    assert claim_to_generation("Galaxy S24") is None
    assert claim_to_generation("") is None
