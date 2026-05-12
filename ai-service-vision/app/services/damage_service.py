import logging
from io import BytesIO
from pathlib import Path

from PIL import Image

from app.config import settings
from app.schemas.detection import BoundingBox, Detection, ImageDetections

logger = logging.getLogger(__name__)

DAMAGE_LABELS: set[str] = {
    "physical_damage",
    "scratch",
    "screen_defect",
}

# Per-class confidence thresholds tuned from BoxF1_curve + confusion matrix
# (E147 model, mAP@50=0.396). scratch threshold is high because that class
# has 80% false-positive rate from background; screen_defect is the cleanest.
DAMAGE_CLASS_THRESHOLDS: dict[str, float] = {
    "physical_damage": 0.30,
    "scratch": 0.45,
    "screen_defect": 0.30,
}


class DamageService:
    """Specialized YOLO service for damage detection (3 classes)."""

    def __init__(self, weights_path: str | None = None) -> None:
        self._weights_path = Path(weights_path or settings.damage_weights_path)
        self._model = None

    def _ensure_loaded(self) -> None:
        if self._model is not None:
            return
        if not self._weights_path.exists():
            logger.warning(
                "Damage model not found at %s. Damage detection will be skipped. "
                "Train on Kaggle (notebook 03_train_damage_model_kaggle.ipynb) and download best_damage.pt",
                self._weights_path,
            )
            return
        from ultralytics import YOLO

        logger.info("Loading damage YOLO weights from %s", self._weights_path)
        self._model = YOLO(str(self._weights_path))

    def is_loaded(self) -> bool:
        return self._model is not None

    def predict(self, image_bytes_list: list[bytes]) -> list[ImageDetections]:
        """Predict damage on images. Returns empty detections if model not loaded."""
        self._ensure_loaded()
        if self._model is None:
            return [
                ImageDetections(image_index=i, width=0, height=0, detections=[])
                for i in range(len(image_bytes_list))
            ]

        pil_images = [Image.open(BytesIO(b)).convert("RGB") for b in image_bytes_list]
        # Use the lowest per-class threshold as YOLO's pre-filter, then
        # apply per-class thresholds below.
        floor_conf = min(DAMAGE_CLASS_THRESHOLDS.values())
        results = self._model.predict(
            source=pil_images,
            conf=floor_conf,
            iou=settings.yolo_iou_threshold,
            imgsz=settings.damage_img_size,
            verbose=False,
        )

        names = self._model.names
        output: list[ImageDetections] = []
        for idx, (img, res) in enumerate(zip(pil_images, results, strict=True)):
            detections: list[Detection] = []
            if res.boxes is not None:
                for box in res.boxes:
                    cls_idx = int(box.cls.item())
                    label = names[cls_idx]
                    conf = float(box.conf.item())
                    if conf < DAMAGE_CLASS_THRESHOLDS.get(label, 0.30):
                        continue
                    xyxy = box.xyxy[0].tolist()
                    detections.append(
                        Detection(
                            label=label,
                            confidence=conf,
                            bbox=BoundingBox(
                                x_min=xyxy[0],
                                y_min=xyxy[1],
                                x_max=xyxy[2],
                                y_max=xyxy[3],
                            ),
                        )
                    )
            output.append(
                ImageDetections(
                    image_index=idx,
                    width=img.width,
                    height=img.height,
                    detections=detections,
                )
            )
        return output
