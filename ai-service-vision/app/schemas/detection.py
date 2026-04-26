from typing import Literal

from pydantic import BaseModel, Field

GenerationClass = Literal[
    "gen_6",
    "gen_7_8",
    "gen_x_xs",
    "gen_11",
    "gen_12_13",
    "gen_14",
    "gen_15",
    "gen_16",
    "gen_17",
]

DamageClass = Literal["crack", "scratch", "dent"]

DamagePart = Literal["screen", "body", "camera", "battery", "other"]


class BoundingBox(BaseModel):
    x_min: float
    y_min: float
    x_max: float
    y_max: float


class Detection(BaseModel):
    label: str
    confidence: float = Field(ge=0.0, le=1.0)
    bbox: BoundingBox


class ImageDetections(BaseModel):
    image_index: int
    width: int
    height: int
    detections: list[Detection]


class DamageScores(BaseModel):
    screen: float = Field(default=0.0, ge=0.0, le=1.0)
    body: float = Field(default=0.0, ge=0.0, le=1.0)
    camera: float = Field(default=0.0, ge=0.0, le=1.0)
    battery: float = Field(default=0.0, ge=0.0, le=1.0)
    other: float = Field(default=0.0, ge=0.0, le=1.0)


class DetectionResponse(BaseModel):
    detected_generation: GenerationClass | None
    generation_confidence: float = Field(ge=0.0, le=1.0)
    claimed_matches: bool
    damage_scores: DamageScores
    overall_confidence: float = Field(ge=0.0, le=1.0)
    per_image: list[ImageDetections]
