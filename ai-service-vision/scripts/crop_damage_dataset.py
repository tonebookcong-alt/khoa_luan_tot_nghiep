"""
Plan B: Crop ảnh theo phone bbox (detect bằng best_v1.pt) → tạo dataset mới.

Logic:
1. Load best_v1.pt (Generation model có sẵn)
2. Với mỗi ảnh trong yolo_dataset_damage/:
   a. Predict phone bbox
   b. Add 10% padding
   c. Crop ảnh
   d. Transform damage labels (denormalize → translate → renormalize)
3. Output: yolo_dataset_damage_cropped/ với cấu trúc YOLO chuẩn

Edge cases handled:
- Phone không detect được → SKIP ảnh
- Damage nằm ngoài phone bbox → DROP label
- Multi-phone → lấy bbox confidence cao nhất

Usage:
    python -m scripts.crop_damage_dataset
    python -m scripts.crop_damage_dataset --conf 0.3      # giảm confidence threshold
    python -m scripts.crop_damage_dataset --padding 0.15  # tăng padding
"""

from __future__ import annotations

import argparse
import logging
from pathlib import Path

import cv2
import yaml
from ultralytics import YOLO

logger = logging.getLogger(__name__)

SRC_ROOT = Path("data/yolo_dataset_damage")
DST_ROOT = Path("data/yolo_dataset_damage_cropped")
MODEL_PATH = Path("app/models/best_v1.pt")


def crop_with_padding(
    bbox_xyxy: tuple[float, float, float, float],
    img_w: int,
    img_h: int,
    padding: float = 0.10,
) -> tuple[int, int, int, int]:
    """Add padding xung quanh bbox, clip trong bounds ảnh."""
    x1, y1, x2, y2 = bbox_xyxy
    w, h = x2 - x1, y2 - y1
    pad_w, pad_h = w * padding, h * padding

    x1 = max(0, int(x1 - pad_w))
    y1 = max(0, int(y1 - pad_h))
    x2 = min(img_w, int(x2 + pad_w))
    y2 = min(img_h, int(y2 + pad_h))

    return x1, y1, x2, y2


def transform_label(
    cls: int,
    cx_norm: float,
    cy_norm: float,
    w_norm: float,
    h_norm: float,
    orig_w: int,
    orig_h: int,
    crop_x1: int,
    crop_y1: int,
    crop_w: int,
    crop_h: int,
) -> tuple[int, float, float, float, float] | None:
    """
    Transform 1 YOLO label từ tọa độ ảnh gốc → tọa độ ảnh crop.
    Return None nếu damage nằm ngoài crop bbox.
    """
    # Denormalize sang pixel (ảnh gốc)
    cx_pix = cx_norm * orig_w
    cy_pix = cy_norm * orig_h
    w_pix = w_norm * orig_w
    h_pix = h_norm * orig_h

    # Bbox của damage trong ảnh gốc
    dmg_x1 = cx_pix - w_pix / 2
    dmg_y1 = cy_pix - h_pix / 2
    dmg_x2 = cx_pix + w_pix / 2
    dmg_y2 = cy_pix + h_pix / 2

    # Crop bbox
    crop_x2 = crop_x1 + crop_w
    crop_y2 = crop_y1 + crop_h

    # Check overlap với crop
    if dmg_x2 <= crop_x1 or dmg_x1 >= crop_x2:
        return None
    if dmg_y2 <= crop_y1 or dmg_y1 >= crop_y2:
        return None

    # Clip damage bbox vào crop bounds
    dmg_x1_new = max(crop_x1, dmg_x1) - crop_x1
    dmg_y1_new = max(crop_y1, dmg_y1) - crop_y1
    dmg_x2_new = min(crop_x2, dmg_x2) - crop_x1
    dmg_y2_new = min(crop_y2, dmg_y2) - crop_y1

    # Recompute center + width/height
    new_w_pix = dmg_x2_new - dmg_x1_new
    new_h_pix = dmg_y2_new - dmg_y1_new
    new_cx_pix = (dmg_x1_new + dmg_x2_new) / 2
    new_cy_pix = (dmg_y1_new + dmg_y2_new) / 2

    # Skip nếu damage quá nhỏ sau clip (< 5px)
    if new_w_pix < 5 or new_h_pix < 5:
        return None

    # Normalize lại theo crop size
    return (
        cls,
        new_cx_pix / crop_w,
        new_cy_pix / crop_h,
        new_w_pix / crop_w,
        new_h_pix / crop_h,
    )


def process_image(
    img_path: Path,
    lbl_path: Path,
    out_img_path: Path,
    out_lbl_path: Path,
    model: YOLO,
    conf_threshold: float,
    padding: float,
) -> tuple[bool, int, int]:
    """
    Process 1 ảnh: detect phone, crop, transform labels.
    Return (success, n_labels_orig, n_labels_kept).
    """
    img = cv2.imread(str(img_path))
    if img is None:
        return False, 0, 0
    H, W = img.shape[:2]

    # Detect phone bbox
    results = model.predict(str(img_path), conf=conf_threshold, verbose=False)
    if not results or not results[0].boxes:
        return False, 0, 0

    boxes = results[0].boxes
    # Lấy bbox confidence cao nhất (phone chính)
    best_idx = boxes.conf.argmax().item()
    best_box = boxes.xyxy[best_idx].tolist()

    # Crop với padding
    cx1, cy1, cx2, cy2 = crop_with_padding(best_box, W, H, padding=padding)
    crop_w, crop_h = cx2 - cx1, cy2 - cy1

    if crop_w < 50 or crop_h < 50:
        return False, 0, 0  # Crop quá nhỏ

    cropped_img = img[cy1:cy2, cx1:cx2]

    # Read original labels
    orig_labels = []
    if lbl_path.exists():
        with lbl_path.open(encoding="utf-8") as f:
            for line in f:
                parts = line.strip().split()
                if len(parts) >= 5:
                    cls = int(parts[0])
                    cx, cy, w, h = map(float, parts[1:5])
                    orig_labels.append((cls, cx, cy, w, h))

    # Transform labels
    new_labels = []
    for cls, cx, cy, w, h in orig_labels:
        result = transform_label(cls, cx, cy, w, h, W, H, cx1, cy1, crop_w, crop_h)
        if result is not None:
            new_labels.append(result)

    # Save
    out_img_path.parent.mkdir(parents=True, exist_ok=True)
    out_lbl_path.parent.mkdir(parents=True, exist_ok=True)

    cv2.imwrite(str(out_img_path), cropped_img)

    if new_labels:
        with out_lbl_path.open("w", encoding="utf-8") as f:
            for cls, cx, cy, w, h in new_labels:
                f.write(f"{cls} {cx:.6f} {cy:.6f} {w:.6f} {h:.6f}\n")
    else:
        # Tạo file rỗng (negative sample)
        out_lbl_path.write_text("", encoding="utf-8")

    return True, len(orig_labels), len(new_labels)


def process_split(
    split: str,
    model: YOLO,
    conf_threshold: float,
    padding: float,
) -> dict:
    """Process train/valid/test split."""
    src_img_dir = SRC_ROOT / split / "images"
    src_lbl_dir = SRC_ROOT / split / "labels"
    dst_img_dir = DST_ROOT / split / "images"
    dst_lbl_dir = DST_ROOT / split / "labels"

    if not src_img_dir.exists():
        logger.warning("Skip %s — folder không tồn tại", split)
        return {}

    n_total = 0
    n_success = 0
    n_skip_no_phone = 0
    n_orig_labels = 0
    n_kept_labels = 0

    for img_file in src_img_dir.iterdir():
        if not img_file.is_file() or img_file.suffix.lower() not in {".jpg", ".jpeg", ".png"}:
            continue
        n_total += 1

        lbl_file = src_lbl_dir / f"{img_file.stem}.txt"
        out_img = dst_img_dir / img_file.name
        out_lbl = dst_lbl_dir / f"{img_file.stem}.txt"

        success, n_orig, n_kept = process_image(
            img_file, lbl_file, out_img, out_lbl, model, conf_threshold, padding
        )

        if success:
            n_success += 1
            n_orig_labels += n_orig
            n_kept_labels += n_kept
        else:
            n_skip_no_phone += 1

        if n_total % 200 == 0:
            logger.info(
                "[%s] %d processed (%d skip)", split, n_total, n_skip_no_phone
            )

    logger.info(
        "[%s] DONE total=%d success=%d skip_no_phone=%d "
        "labels_orig=%d labels_kept=%d (%.1f%% retained)",
        split, n_total, n_success, n_skip_no_phone,
        n_orig_labels, n_kept_labels,
        100.0 * n_kept_labels / max(n_orig_labels, 1),
    )

    return {
        "split": split,
        "total": n_total,
        "success": n_success,
        "skip": n_skip_no_phone,
        "orig_labels": n_orig_labels,
        "kept_labels": n_kept_labels,
    }


def write_yaml() -> None:
    """Tạo data.yaml cho cropped dataset."""
    src_yaml_path = SRC_ROOT / "data.yaml"
    if src_yaml_path.exists():
        with src_yaml_path.open(encoding="utf-8") as f:
            cfg = yaml.safe_load(f)
    else:
        cfg = {"nc": 3, "names": ["physical_damage", "scratch", "screen_defect"]}

    cfg["path"] = str(DST_ROOT.resolve()).replace("\\", "/")
    cfg["train"] = "train/images"
    cfg["val"] = "valid/images"
    cfg["test"] = "test/images"

    (DST_ROOT / "data.yaml").write_text(
        yaml.dump(cfg, sort_keys=False, allow_unicode=True), encoding="utf-8"
    )
    logger.info("Wrote %s", DST_ROOT / "data.yaml")


def main() -> None:
    parser = argparse.ArgumentParser(description="Crop damage dataset bằng best_v1.pt")
    parser.add_argument("--model", type=Path, default=MODEL_PATH)
    parser.add_argument("--conf", type=float, default=0.25, help="Confidence threshold detect phone")
    parser.add_argument("--padding", type=float, default=0.10, help="Padding ratio quanh phone bbox")
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

    if not args.model.exists():
        logger.error("Model không tồn tại: %s", args.model)
        return
    if not SRC_ROOT.exists():
        logger.error("Source dataset không tồn tại: %s", SRC_ROOT)
        return

    logger.info("Loading model %s", args.model)
    model = YOLO(str(args.model))

    DST_ROOT.mkdir(parents=True, exist_ok=True)

    results = []
    for split in ["train", "valid", "test"]:
        results.append(process_split(split, model, args.conf, args.padding))

    write_yaml()

    print("\n=== SUMMARY ===")
    print(f"{'Split':<10} {'Total':>8} {'Success':>10} {'Skip':>8} {'Orig lbl':>10} {'Kept lbl':>10} {'Retain %':>10}")
    for r in results:
        if r:
            retain_pct = 100.0 * r["kept_labels"] / max(r["orig_labels"], 1)
            print(
                f"{r['split']:<10} {r['total']:>8} {r['success']:>10} {r['skip']:>8} "
                f"{r['orig_labels']:>10} {r['kept_labels']:>10} {retain_pct:>9.1f}%"
            )

    print(f"\nCropped dataset: {DST_ROOT}")


if __name__ == "__main__":
    main()
