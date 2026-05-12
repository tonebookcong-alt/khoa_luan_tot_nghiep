"""
Split 12-class YOLO dataset thành 2 dataset chuyên biệt:

1. Generation dataset (9 classes): chỉ keep gen_* labels
2. Damage dataset (3 classes): chỉ keep physical_damage, scratch, screen_defect labels

Logic:
- Đọc từng file label trong train/valid/test
- Filter labels theo class index
- Remap class index về 0-based cho mỗi dataset
- Copy ảnh sang folder mới (hoặc symlink)
- Tạo data.yaml mới cho mỗi dataset

Class mapping (source → Generation dataset):
  1 (gen_11)     → 0
  2 (gen_12_13)  → 1
  3 (gen_14)     → 2
  4 (gen_15)     → 3
  5 (gen_16)     → 4
  6 (gen_17)     → 5
  7 (gen_6)      → 6
  8 (gen_7_8)    → 7
  9 (gen_x_xs)   → 8

Class mapping (source → Damage dataset):
  0 (physical_damage) → 0
  10 (scratch)        → 1
  11 (screen_defect)  → 2

Usage:
    python -m scripts.split_into_dual_datasets
"""

from __future__ import annotations

import argparse
import logging
import shutil
from pathlib import Path

import yaml

logger = logging.getLogger(__name__)

# Source: 12-class merged dataset
SRC_ROOT = Path("data/yolo_dataset_merged")

# Outputs
GEN_OUT = Path("data/yolo_dataset_generation")
DMG_OUT = Path("data/yolo_dataset_damage")

# Class mappings
GEN_MAP = {
    1: 0,   # gen_11
    2: 1,   # gen_12_13
    3: 2,   # gen_14
    4: 3,   # gen_15
    5: 4,   # gen_16
    6: 5,   # gen_17
    7: 6,   # gen_6
    8: 7,   # gen_7_8
    9: 8,   # gen_x_xs
}

DMG_MAP = {
    0: 0,   # physical_damage
    10: 1,  # scratch
    11: 2,  # screen_defect
}

GEN_NAMES = [
    "gen_11", "gen_12_13", "gen_14", "gen_15",
    "gen_16", "gen_17", "gen_6", "gen_7_8", "gen_x_xs",
]

DMG_NAMES = ["physical_damage", "scratch", "screen_defect"]


def split_label_file(src: Path, gen_path: Path, dmg_path: Path) -> tuple[bool, bool]:
    """
    Đọc 1 label file, ghi sang 2 file riêng tương ứng 2 dataset.
    Trả (has_gen_labels, has_dmg_labels).
    """
    if not src.exists():
        return False, False

    gen_lines = []
    dmg_lines = []

    with src.open(encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            parts = line.split()
            if len(parts) < 5:
                continue
            cls = int(parts[0])
            coords = parts[1:]

            if cls in GEN_MAP:
                new_cls = GEN_MAP[cls]
                gen_lines.append(f"{new_cls} {' '.join(coords)}")
            elif cls in DMG_MAP:
                new_cls = DMG_MAP[cls]
                dmg_lines.append(f"{new_cls} {' '.join(coords)}")

    has_gen = len(gen_lines) > 0
    has_dmg = len(dmg_lines) > 0

    if has_gen:
        gen_path.parent.mkdir(parents=True, exist_ok=True)
        gen_path.write_text("\n".join(gen_lines) + "\n", encoding="utf-8")

    if has_dmg:
        dmg_path.parent.mkdir(parents=True, exist_ok=True)
        dmg_path.write_text("\n".join(dmg_lines) + "\n", encoding="utf-8")

    return has_gen, has_dmg


def process_split(split: str, copy_images: bool) -> dict:
    """Process train/valid/test split."""
    src_lbl_dir = SRC_ROOT / split / "labels"
    src_img_dir = SRC_ROOT / split / "images"

    if not src_lbl_dir.exists():
        logger.warning("Skip %s — labels folder không tồn tại", split)
        return {}

    gen_lbl_dir = GEN_OUT / split / "labels"
    gen_img_dir = GEN_OUT / split / "images"
    dmg_lbl_dir = DMG_OUT / split / "labels"
    dmg_img_dir = DMG_OUT / split / "images"

    for d in [gen_lbl_dir, gen_img_dir, dmg_lbl_dir, dmg_img_dir]:
        d.mkdir(parents=True, exist_ok=True)

    n_total = 0
    n_gen = 0
    n_dmg = 0
    n_both = 0

    for lbl_file in src_lbl_dir.iterdir():
        if not lbl_file.is_file() or lbl_file.suffix != ".txt":
            continue
        n_total += 1

        # Tìm ảnh tương ứng (cùng tên, đuôi khác)
        img_name = lbl_file.stem  # tên không có .txt
        img_file = None
        for ext in [".jpg", ".jpeg", ".png"]:
            candidate = src_img_dir / f"{img_name}{ext}"
            if candidate.exists():
                img_file = candidate
                break

        if img_file is None:
            logger.warning("Image không tìm thấy cho %s", lbl_file.name)
            continue

        # Split labels
        gen_lbl_path = gen_lbl_dir / lbl_file.name
        dmg_lbl_path = dmg_lbl_dir / lbl_file.name
        has_gen, has_dmg = split_label_file(lbl_file, gen_lbl_path, dmg_lbl_path)

        # Copy image to relevant dataset(s)
        if copy_images:
            if has_gen:
                gen_img_path = gen_img_dir / img_file.name
                if not gen_img_path.exists():
                    shutil.copy2(img_file, gen_img_path)
            if has_dmg:
                dmg_img_path = dmg_img_dir / img_file.name
                if not dmg_img_path.exists():
                    shutil.copy2(img_file, dmg_img_path)

        if has_gen:
            n_gen += 1
        if has_dmg:
            n_dmg += 1
        if has_gen and has_dmg:
            n_both += 1

    logger.info(
        "[%s] total=%d, gen=%d (%.1f%%), dmg=%d (%.1f%%), both=%d",
        split, n_total, n_gen, 100.0 * n_gen / max(n_total, 1),
        n_dmg, 100.0 * n_dmg / max(n_total, 1), n_both,
    )

    return {
        "split": split,
        "total": n_total,
        "gen": n_gen,
        "dmg": n_dmg,
        "both": n_both,
    }


def write_yamls() -> None:
    """Tạo data.yaml cho cả 2 dataset."""
    gen_yaml = {
        "path": str(GEN_OUT.resolve()).replace("\\", "/"),
        "train": "train/images",
        "val": "valid/images",
        "test": "test/images",
        "nc": len(GEN_NAMES),
        "names": GEN_NAMES,
    }
    (GEN_OUT / "data.yaml").write_text(
        yaml.dump(gen_yaml, sort_keys=False, allow_unicode=True), encoding="utf-8"
    )
    logger.info("Wrote %s with %d classes", GEN_OUT / "data.yaml", len(GEN_NAMES))

    dmg_yaml = {
        "path": str(DMG_OUT.resolve()).replace("\\", "/"),
        "train": "train/images",
        "val": "valid/images",
        "test": "test/images",
        "nc": len(DMG_NAMES),
        "names": DMG_NAMES,
    }
    (DMG_OUT / "data.yaml").write_text(
        yaml.dump(dmg_yaml, sort_keys=False, allow_unicode=True), encoding="utf-8"
    )
    logger.info("Wrote %s with %d classes", DMG_OUT / "data.yaml", len(DMG_NAMES))


def main() -> None:
    parser = argparse.ArgumentParser(description="Split 12-class dataset → Generation (9) + Damage (3)")
    parser.add_argument("--no-copy-images", action="store_true", help="Skip copy ảnh, chỉ split labels (test mode)")
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

    if not SRC_ROOT.exists():
        logger.error("Source folder không tồn tại: %s", SRC_ROOT)
        return

    GEN_OUT.mkdir(parents=True, exist_ok=True)
    DMG_OUT.mkdir(parents=True, exist_ok=True)

    results = []
    for split in ["train", "valid", "test"]:
        results.append(process_split(split, copy_images=not args.no_copy_images))

    write_yamls()

    print("\n=== SUMMARY ===")
    print(f"{'Split':<10} {'Total':>8} {'Generation':>12} {'Damage':>10} {'Both':>10}")
    for r in results:
        if r:
            print(f"{r['split']:<10} {r['total']:>8} {r['gen']:>12} {r['dmg']:>10} {r['both']:>10}")

    print(f"\nGeneration dataset → {GEN_OUT}")
    print(f"Damage dataset     → {DMG_OUT}")


if __name__ == "__main__":
    main()
