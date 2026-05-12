"""
Merge class crack + dent → physical_damage trong YOLO labels exported từ Roboflow.

Input: data/yolo_dataset/ (13 classes từ Roboflow V2)
Output: data/yolo_dataset_merged/ (12 classes, in-place hoặc copy)

Class mapping (old_idx → new_idx):
    0 (crack)         → 0 (physical_damage)
    1 (dent)          → 0 (physical_damage) ← MERGE
    2 (gen_11)        → 1
    3 (gen_12_13)     → 2
    4 (gen_14)        → 3
    5 (gen_15)        → 4
    6 (gen_16)        → 5
    7 (gen_17)        → 6
    8 (gen_6)         → 7
    9 (gen_7_8)       → 8
    10 (gen_x_xs)     → 9
    11 (scratch)      → 10
    12 (screen_defect)→ 11

Usage:
    python -m scripts.merge_dent_into_crack
    python -m scripts.merge_dent_into_crack --in-place  # merge tại chỗ, không tạo folder mới
"""

from __future__ import annotations

import argparse
import logging
import shutil
from pathlib import Path

import yaml

logger = logging.getLogger(__name__)

INDEX_MAP: dict[int, int] = {
    0: 0,   # crack → physical_damage
    1: 0,   # dent → physical_damage (MERGE)
    2: 1,   # gen_11
    3: 2,   # gen_12_13
    4: 3,   # gen_14
    5: 4,   # gen_15
    6: 5,   # gen_16
    7: 6,   # gen_17
    8: 7,   # gen_6
    9: 8,   # gen_7_8
    10: 9,  # gen_x_xs
    11: 10, # scratch
    12: 11, # screen_defect
}

NEW_CLASS_NAMES = [
    "physical_damage",  # 0
    "gen_11",           # 1
    "gen_12_13",        # 2
    "gen_14",           # 3
    "gen_15",           # 4
    "gen_16",           # 5
    "gen_17",           # 6
    "gen_6",            # 7
    "gen_7_8",          # 8
    "gen_x_xs",         # 9
    "scratch",          # 10
    "screen_defect",    # 11
]


def remap_label_file(src: Path, dst: Path) -> tuple[int, int]:
    """Đọc 1 file label, remap class index, ghi sang dst. Return (lines, merged_count)."""
    if not src.exists():
        return 0, 0

    new_lines: list[str] = []
    merged = 0
    total = 0

    with src.open(encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            parts = line.split()
            if len(parts) < 5:
                logger.warning("Bad label line in %s: %r", src.name, line)
                continue

            old_idx = int(parts[0])
            if old_idx not in INDEX_MAP:
                logger.warning("Unknown class %d in %s, skip", old_idx, src.name)
                continue

            new_idx = INDEX_MAP[old_idx]
            if old_idx == 1:  # dent → physical_damage
                merged += 1

            new_lines.append(f"{new_idx} {' '.join(parts[1:])}")
            total += 1

    dst.parent.mkdir(parents=True, exist_ok=True)
    dst.write_text("\n".join(new_lines) + "\n" if new_lines else "", encoding="utf-8")
    return total, merged


def process_split(src_dir: Path, dst_dir: Path, split: str, copy_images: bool) -> dict:
    """Process 1 split (train/valid/test). Return stats."""
    src_lbl = src_dir / split / "labels"
    src_img = src_dir / split / "images"
    dst_lbl = dst_dir / split / "labels"
    dst_img = dst_dir / split / "images"

    if not src_lbl.exists():
        logger.warning("Skip %s — labels folder không tồn tại", split)
        return {}

    total_lines = 0
    total_merged = 0
    files_processed = 0

    for lbl_file in src_lbl.iterdir():
        if not lbl_file.is_file() or lbl_file.suffix != ".txt":
            continue
        dst_file = dst_lbl / lbl_file.name
        lines, merged = remap_label_file(lbl_file, dst_file)
        total_lines += lines
        total_merged += merged
        files_processed += 1

    if copy_images and src_img.exists() and src_img != dst_img:
        dst_img.mkdir(parents=True, exist_ok=True)
        for img in src_img.iterdir():
            if img.is_file():
                target = dst_img / img.name
                if not target.exists():
                    shutil.copy2(img, target)

    logger.info(
        "[%s] %d files, %d annotations, %d dent→physical_damage merged",
        split,
        files_processed,
        total_lines,
        total_merged,
    )
    return {
        "files": files_processed,
        "annotations": total_lines,
        "merged_dent": total_merged,
    }


def write_data_yaml(dst: Path, src_yaml: dict) -> None:
    """Tạo data.yaml mới với 12 classes."""
    new_yaml = {
        "train": "../train/images",
        "val": "../valid/images",
        "test": "../test/images",
        "nc": len(NEW_CLASS_NAMES),
        "names": NEW_CLASS_NAMES,
    }
    if "roboflow" in src_yaml:
        new_yaml["roboflow"] = src_yaml["roboflow"]

    dst.write_text(yaml.dump(new_yaml, sort_keys=False, allow_unicode=True), encoding="utf-8")
    logger.info("Wrote %s with %d classes", dst, len(NEW_CLASS_NAMES))


def main() -> None:
    parser = argparse.ArgumentParser(description="Merge crack+dent → physical_damage in YOLO labels")
    parser.add_argument(
        "--src",
        type=Path,
        default=Path("data/yolo_dataset"),
        help="Source YOLO dataset folder",
    )
    parser.add_argument(
        "--dst",
        type=Path,
        default=Path("data/yolo_dataset_merged"),
        help="Output folder (12-class)",
    )
    parser.add_argument(
        "--in-place",
        action="store_true",
        help="Overwrite source instead of copying to dst",
    )
    parser.add_argument("--no-copy-images", action="store_true", help="Skip copy ảnh, chỉ remap labels")
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

    src = args.src.resolve()
    dst = src if args.in_place else args.dst.resolve()

    if not src.exists():
        logger.error("Source folder không tồn tại: %s", src)
        return

    src_yaml_path = src / "data.yaml"
    src_yaml = yaml.safe_load(src_yaml_path.read_text(encoding="utf-8")) if src_yaml_path.exists() else {}

    logger.info("Source: %s", src)
    logger.info("Dest:   %s%s", dst, " (in-place)" if args.in_place else "")
    logger.info("Source classes: %d", len(src_yaml.get("names", [])))

    stats = {}
    for split in ["train", "valid", "test"]:
        stats[split] = process_split(src, dst, split, copy_images=not args.no_copy_images and not args.in_place)

    write_data_yaml(dst / "data.yaml", src_yaml)

    print("\n=== SUMMARY ===")
    print(f"{'Split':<10} {'Files':>8} {'Annotations':>15} {'Dent merged':>15}")
    for split, s in stats.items():
        if s:
            print(f"{split:<10} {s['files']:>8} {s['annotations']:>15} {s['merged_dent']:>15}")
    print(f"\nNew classes ({len(NEW_CLASS_NAMES)}): {NEW_CLASS_NAMES}")
    print(f"Output: {dst}")


if __name__ == "__main__":
    main()
