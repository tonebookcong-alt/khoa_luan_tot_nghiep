import logging
from collections import Counter
from io import BytesIO
from pathlib import Path

from PIL import Image

from app.config import settings
from app.schemas.detection import (
    BoundingBox,
    Detection,
    GenerationClass,
    ImageDetections,
)

logger = logging.getLogger(__name__)

GENERATION_LABELS: set[str] = {
    "gen_6",
    "gen_7_8",
    "gen_x_xs",
    "gen_11",
    "gen_12_13",
    "gen_14",
    "gen_15",
    "gen_16",
    "gen_17",
}


class YoloService:
    def __init__(self, weights_path: str | None = None) -> None:
        self._weights_path = Path(weights_path or settings.yolo_weights_path)
        self._model = None

    def _ensure_loaded(self) -> None:
        if self._model is not None:
            return
        if not self._weights_path.exists():
            raise FileNotFoundError(
                f"YOLO weights not found at {self._weights_path}. "
                "Train model first (Stage 4) and place best.pt here."
            )
        from ultralytics import YOLO

        logger.info("Loading YOLO weights from %s", self._weights_path)
        self._model = YOLO(str(self._weights_path))

    def is_loaded(self) -> bool:
        return self._model is not None

    def predict(self, image_bytes_list: list[bytes]) -> list[ImageDetections]:
        self._ensure_loaded()
        assert self._model is not None

        pil_images = [Image.open(BytesIO(b)).convert("RGB") for b in image_bytes_list]
        results = self._model.predict(
            source=pil_images,
            conf=settings.yolo_conf_threshold,
            iou=settings.yolo_iou_threshold,
            imgsz=settings.yolo_img_size,
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

    @staticmethod
    def aggregate_generation(
        per_image: list[ImageDetections],
    ) -> tuple[GenerationClass | None, float]:
        votes: Counter[str] = Counter()
        confidence_sum: dict[str, float] = {}
        for img in per_image:
            for det in img.detections:
                if det.label in GENERATION_LABELS:
                    votes[det.label] += 1
                    confidence_sum[det.label] = (
                        confidence_sum.get(det.label, 0.0) + det.confidence
                    )
        if not votes:
            return None, 0.0
        winner, count = votes.most_common(1)[0]
        avg_conf = confidence_sum[winner] / count
        return winner, avg_conf  # type: ignore[return-value]
