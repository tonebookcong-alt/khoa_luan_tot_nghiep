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


def calculate_damage_scores(
    per_image: list[ImageDetections],
    damage_detections: list[ImageDetections] | None = None,
) -> DamageScores:
    """
    Calculate damage scores from detections.
    If damage_detections provided (from dedicated damage model), use those.
    Otherwise, use damage labels from generation model detections.
    """
    scores = DamageScores()

    # Use dedicated damage model if available, else use generation model
    detection_source = damage_detections if damage_detections is not None else per_image

    for img_idx, img in enumerate(per_image):
        body_box: BoundingBox | None = None
        # Get body box from generation model
        for det in img.detections:
            if det.label in GENERATION_LABELS:
                body_box = det.bbox
                break
        if body_box is None:
            continue
        body_area = _bbox_area(body_box)
        if body_area <= 0:
            continue

        # Get damage detections from appropriate source
        damage_dets = (
            detection_source[img_idx].detections
            if img_idx < len(detection_source)
            else []
        )

        for det in damage_dets:
            # Map damage labels: generation model (crack, scratch, dent) vs damage model (physical_damage, scratch, screen_defect)
            if det.label not in DAMAGE_AREA_THRESHOLDS and det.label not in {
                "physical_damage",
                "screen_defect",
            }:
                continue

            damage_area = _bbox_area(det.bbox)
            ratio = damage_area / body_area if body_area > 0 else 0.0

            # Get threshold based on label
            label_key = det.label
            if det.label == "physical_damage":
                # physical_damage from dedicated model ~ crack + dent
                label_key = "crack"
            elif det.label == "screen_defect":
                # screen_defect ~ crack on screen
                label_key = "crack"

            if label_key not in DAMAGE_AREA_THRESHOLDS:
                continue

            major_threshold = DAMAGE_AREA_THRESHOLDS[label_key]["major"]
            severity = min(1.0, ratio / major_threshold) * det.confidence

            if det.label in {"crack", "physical_damage"}:
                if det.label == "crack":
                    # Original logic: crack on top half = screen, else body
                    if _is_inside_top_half(det.bbox, body_box):
                        scores.screen = max(scores.screen, severity)
                    else:
                        scores.body = max(scores.body, severity)
                else:
                    # physical_damage from damage model: treat as crack but assume screen if score high
                    if severity > 0.5:
                        scores.screen = max(scores.screen, severity)
                    else:
                        scores.body = max(scores.body, severity)
            elif det.label == "scratch":
                scores.body = max(scores.body, severity * 0.7)
            elif det.label == "dent":
                scores.body = max(scores.body, severity * 0.8)
            elif det.label == "screen_defect":
                # screen_defect from damage model
                scores.screen = max(scores.screen, severity)

    return scores
