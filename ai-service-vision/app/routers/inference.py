from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from app.deps import get_damage_service, get_yolo_service
from app.schemas.detection import DetectionResponse
from app.services.damage_calculator import (
    calculate_damage_scores,
    claim_to_generation,
)
from app.services.damage_service import DamageService
from app.services.yolo_service import YoloService

router = APIRouter(prefix="/v1", tags=["inference"])


@router.post("/detect", response_model=DetectionResponse)
async def detect(
    images: list[UploadFile] = File(..., description="Listing images, 1-10 ảnh"),
    claimed_model: str = Form(..., description="Tên model seller khai báo, ví dụ 'iPhone 13 Pro Max'"),
    yolo: YoloService = Depends(get_yolo_service),
    damage: DamageService = Depends(get_damage_service),
) -> DetectionResponse:
    if not images:
        raise HTTPException(status_code=400, detail="At least one image required")
    if len(images) > 10:
        raise HTTPException(status_code=400, detail="Maximum 10 images per request")

    image_bytes = [await img.read() for img in images]

    # Detect generation (9 classes) + scratch/physical_damage/screen_defect from generation model
    per_image = yolo.predict(image_bytes)
    detected_gen, gen_confidence = yolo.aggregate_generation(per_image)

    # Run dedicated damage detection (3 classes). predict() lazy-loads weights and
    # returns empty detections if best_damage.pt is missing.
    damage_detections = damage.predict(image_bytes)

    # Calculate damage scores (use dedicated damage model if available, else generation model)
    damage_scores = calculate_damage_scores(
        per_image, damage_detections=damage_detections
    )

    claimed_gen = claim_to_generation(claimed_model)
    claimed_matches = (
        detected_gen is not None
        and claimed_gen is not None
        and detected_gen == claimed_gen
    )

    overall_confidence = gen_confidence
    if any(d.confidence for img in per_image for d in img.detections):
        all_confs = [d.confidence for img in per_image for d in img.detections]
        overall_confidence = sum(all_confs) / len(all_confs)

    return DetectionResponse(
        detected_generation=detected_gen,
        generation_confidence=gen_confidence,
        claimed_matches=claimed_matches,
        damage_scores=damage_scores,
        overall_confidence=overall_confidence,
        per_image=per_image,
        damage_per_image=damage_detections or [],
    )
