"""
Lọc bỏ các listing không phải iPhone khỏi file metadata đã scrape.

Dùng khi đã scrape rồi mới phát hiện lẫn brand khác. Giữ ảnh trên disk
(không xoá) để không phá ID, chỉ rewrite file JSONL chỉ giữ iPhone.

Usage:
    python -m scripts.clean_non_iphone --source chotot
"""

from __future__ import annotations

import argparse
import json
import logging
from pathlib import Path

from scripts.utils import IMAGES_DIR, METADATA_DIR

logger = logging.getLogger(__name__)


def clean(source: str, delete_images: bool = False) -> None:
    metadata_path = METADATA_DIR / f"{source}.jsonl"
    if not metadata_path.exists():
        logger.error("Metadata file not found: %s", metadata_path)
        return

    backup_path = metadata_path.with_suffix(".jsonl.bak")
    metadata_path.rename(backup_path)
    logger.info("Backed up to %s", backup_path)

    kept = 0
    removed = 0
    removed_image_paths: list[str] = []

    with backup_path.open(encoding="utf-8") as f_in, metadata_path.open("w", encoding="utf-8") as f_out:
        for line in f_in:
            line = line.strip()
            if not line:
                continue
            obj = json.loads(line)
            title = obj.get("title", "").lower()
            if "iphone" in title:
                f_out.write(json.dumps(obj, ensure_ascii=False) + "\n")
                kept += 1
            else:
                removed += 1
                removed_image_paths.extend(obj.get("image_paths", []))
                logger.info("REMOVED: %s", obj.get("title", "")[:80])

    logger.info("Kept: %d, Removed: %d", kept, removed)

    if delete_images and removed_image_paths:
        deleted = 0
        for fname in removed_image_paths:
            p = IMAGES_DIR / fname
            if p.exists():
                p.unlink()
                deleted += 1
        logger.info("Deleted %d orphaned image files", deleted)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", default="chotot")
    parser.add_argument("--delete-images", action="store_true", help="Cũng xoá ảnh của listing bị remove")
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
    clean(args.source, delete_images=args.delete_images)


if __name__ == "__main__":
    main()
