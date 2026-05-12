"""
Remap 3-class damage labels → 2-class:
- 0 (physical_damage) → 1 (severe_damage)
- 1 (scratch)         → 0 (scratch)        [kept]
- 2 (screen_defect)   → 1 (severe_damage)

Logic: scratch (dễ detect, nhiều data) vs severe_damage (nứt + screen defect)

Usage:
    python -m scripts.remap_to_2_classes
"""

from __future__ import annotations

import logging
import shutil
from pathlib import Path

import yaml

logger = logging.getLogger(__name__)

SRC_ROOT = Path("data/yolo_dataset_damage_cropped")
DST_ROOT = Path("data/yolo_dataset_damage_cropped_2cls")

# Mapping: old class index → new class index
CLASS_REMAP = {
    0: 1,   # physical_damage → severe_damage
    1: 0,   # scratch         → scratch (kept)
    2: 1,   # screen_defect   → severe_damage
}

NEW_CLASS_NAMES = ["scratch", "severe_damage"]


def remap_label_file(src: Path, dst: Path) -> tuple[int, dict[int, int]]:
    """Remap class indices in 1 label file. Return (n_labels, count_per_new_class)."""
    if not src.exists():
        return 0, {}

    new_lines = []
    counts: dict[int, int] = {0: 0, 1: 0}

    with src.open(encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            parts = line.split()
            if len(parts) < 5:
                continue

            old_cls = int(parts[0])
            if old_cls not in CLASS_REMAP:
                logger.warning("Unknown class %d in %s, skip", old_cls, src.name)
                continue

            new_cls = CLASS_REMAP[old_cls]
            counts[new_cls] += 1
            new_lines.append(f"{new_cls} {' '.join(parts[1:])}")

    if new_lines:
        dst.parent.mkdir(parents=True, exist_ok=True)
        dst.write_text("\n".join(new_lines) + "\n", encoding="utf-8")
    else:
        # Empty file (negative sample)
        dst.parent.mkdir(parents=True, exist_ok=True)
        dst.write_text("", encoding="utf-8")

    return len(new_lines), counts


def process_split(split: str) -> dict:
    """Process train/valid/test split."""
    src_lbl_dir = SRC_ROOT / split / "labels"
    src_img_dir = SRC_ROOT / split / "images"
    dst_lbl_dir = DST_ROOT / split / "labels"
    dst_img_dir = DST_ROOT / split / "images"

    if not src_lbl_dir.exists():
        logger.warning("Skip %s — labels folder not exist", split)
        return {}

    dst_lbl_dir.mkdir(parents=True, exist_ok=True)
    dst_img_dir.mkdir(parents=True, exist_ok=True)

    n_files = 0
    n_labels = 0
    total_counts = {0: 0, 1: 0}

    for lbl_file in src_lbl_dir.iterdir():
        if not lbl_file.is_file() or lbl_file.suffix != ".txt":
            continue

        n_files += 1
        dst_lbl = dst_lbl_dir / lbl_file.name
        labels, counts = remap_label_file(lbl_file, dst_lbl)
        n_labels += labels
        for k, v in counts.items():
            total_counts[k] += v

        # Copy corresponding image
        for ext in [".jpg", ".jpeg", ".png"]:
            src_img = src_img_dir / f"{lbl_file.stem}{ext}"
            if src_img.exists():
                dst_img = dst_img_dir / src_img.name
                if not dst_img.exists():
                    shutil.copy2(src_img, dst_img)
                break

    logger.info(
        "[%s] %d files, %d labels (scratch=%d, severe_damage=%d)",
        split, n_files, n_labels, total_counts[0], total_counts[1],
    )

    return {
        "split": split,
        "files": n_files,
        "labels": n_labels,
        "scratch": total_counts[0],
        "severe_damage": total_counts[1],
    }


def write_yaml() -> None:
    """Write data.yaml for 2-class dataset."""
    cfg = {
        "path": str(DST_ROOT.resolve()).replace("\\", "/"),
        "train": "train/images",
        "val": "valid/images",
        "test": "test/images",
        "nc": 2,
        "names": NEW_CLASS_NAMES,
    }
    (DST_ROOT / "data.yaml").write_text(
        yaml.dump(cfg, sort_keys=False, allow_unicode=True), encoding="utf-8"
    )
    logger.info("Wrote %s", DST_ROOT / "data.yaml")


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

    if not SRC_ROOT.exists():
        logger.error("Source dataset not exist: %s", SRC_ROOT)
        return

    DST_ROOT.mkdir(parents=True, exist_ok=True)

    results = []
    for split in ["train", "valid", "test"]:
        results.append(process_split(split))

    write_yaml()

    print("\n=== SUMMARY ===")
    print(f"{'Split':<10} {'Files':>8} {'Labels':>8} {'Scratch':>10} {'Severe':>10}")
    for r in results:
        if r:
            print(
                f"{r['split']:<10} {r['files']:>8} {r['labels']:>8} "
                f"{r['scratch']:>10} {r['severe_damage']:>10}"
            )

    print(f"\n2-class dataset: {DST_ROOT}")
    print("Next: zip + upload Kaggle")


if __name__ == "__main__":
    main()
