from app.schemas.detection import (
    BoundingBox,
    DamageScores,
    GenerationClass,
    ImageDetections,
)
from app.services.yolo_service import GENERATION_LABELS

DAMAGE_AREA_THRESHOLDS: dict[str, dict[str, float]] = {
    "crack": {"minor": 0.02, "major": 0.10},
    "scratch": {"minor": 0.01, "major": 0.05},
    "dent": {"minor": 0.005, "major": 0.02},
}

CLAIM_TO_GENERATION: dict[str, GenerationClass] = {
    "iphone 6": "gen_6",
    "iphone 6s": "gen_6",
    "iphone 6 plus": "gen_6",
    "iphone 6s plus": "gen_6",
    "iphone se 1": "gen_6",
    "iphone se 2016": "gen_6",
    "iphone 7": "gen_7_8",
    "iphone 7 plus": "gen_7_8",
    "iphone 8": "gen_7_8",
    "iphone 8 plus": "gen_7_8",
    "iphone se 2": "gen_7_8",
    "iphone se 3": "gen_7_8",
    "iphone x": "gen_x_xs",
    "iphone xr": "gen_x_xs",
    "iphone xs": "gen_x_xs",
    "iphone xs max": "gen_x_xs",
    "iphone 11": "gen_11",
    "iphone 11 pro": "gen_11",
    "iphone 11 pro max": "gen_11",
    "iphone 12": "gen_12_13",
    "iphone 12 mini": "gen_12_13",
    "iphone 12 pro": "gen_12_13",
    "iphone 12 pro max": "gen_12_13",
    "iphone 13": "gen_12_13",
    "iphone 13 mini": "gen_12_13",
    "iphone 13 pro": "gen_12_13",
    "iphone 13 pro max": "gen_12_13",
    "iphone 14": "gen_14",
    "iphone 14 plus": "gen_14",
    "iphone 14 pro": "gen_14",
    "iphone 14 pro max": "gen_14",
    "iphone 15": "gen_15",
    "iphone 15 plus": "gen_15",
    "iphone 15 pro": "gen_15",
    "iphone 15 pro max": "gen_15",
    "iphone 16": "gen_16",
    "iphone 16 plus": "gen_16",
    "iphone 16 pro": "gen_16",
    "iphone 16 pro max": "gen_16",
    "iphone 17": "gen_17",
    "iphone 17 air": "gen_17",
    "iphone 17 pro": "gen_17",
    "iphone 17 pro max": "gen_17",
}


def normalize_claim(claim: str) -> str:
    return " ".join(claim.lower().strip().split())


def claim_to_generation(claim: str) -> GenerationClass | None:
    return CLAIM_TO_GENERATION.get(normalize_claim(claim))


def _bbox_area(bbox: BoundingBox) -> float:
    return max(0.0, bbox.x_max - bbox.x_min) * max(0.0, bbox.y_max - bbox.y_min)


def _is_inside_top_half(damage: BoundingBox, body: BoundingBox) -> bool:
    body_height = body.y_max - body.y_min
    damage_center_y = (damage.y_min + damage.y_max) / 2
    return damage_center_y < body.y_min + body_height * 0.55


def calculate_damage_scores(per_image: list[ImageDetections]) -> DamageScores:
    scores = DamageScores()

    for img in per_image:
        body_box: BoundingBox | None = None
        for det in img.detections:
            if det.label in GENERATION_LABELS:
                body_box = det.bbox
                break
        if body_box is None:
            continue
        body_area = _bbox_area(body_box)
        if body_area <= 0:
            continue

        for det in img.detections:
            if det.label not in DAMAGE_AREA_THRESHOLDS:
                continue
            damage_area = _bbox_area(det.bbox)
            ratio = damage_area / body_area
            major_threshold = DAMAGE_AREA_THRESHOLDS[det.label]["major"]
            severity = min(1.0, ratio / major_threshold) * det.confidence

            if det.label == "crack":
                if _is_inside_top_half(det.bbox, body_box):
                    scores.screen = max(scores.screen, severity)
                else:
                    scores.body = max(scores.body, severity)
            elif det.label == "scratch":
                scores.body = max(scores.body, severity * 0.7)
            elif det.label == "dent":
                scores.body = max(scores.body, severity * 0.8)

    return scores
