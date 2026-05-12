"""
Gộp ảnh từ 3 folder damage raw vào 1 folder review để filter manual.

Tên file mới: <orig_class>__<orig_filename> để biết source.

Sau khi review xong (xóa ảnh clean), bạn sẽ có folder:
- data/raw/damage/manual_review/keep/  (chứa ảnh thật sự có damage)
Up nguyên folder này lên Roboflow → label class trong UI.

Usage:
    python -m scripts.flatten_damage_for_review
"""

from __future__ import annotations

import logging
import shutil
from pathlib import Path

from scripts.utils import DATA_DIR

logger = logging.getLogger(__name__)

DAMAGE_DIR = DATA_DIR / "raw" / "damage"
SOURCES = ["dent", "crack", "screen_defect"]
REVIEW_DIR = DAMAGE_DIR / "manual_review"


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
    REVIEW_DIR.mkdir(parents=True, exist_ok=True)

    total_copied = 0
    for src_class in SOURCES:
        src_dir = DAMAGE_DIR / "images" / src_class
        if not src_dir.exists():
            logger.warning("Skip %s — folder không tồn tại", src_class)
            continue

        copied = 0
        for img in src_dir.iterdir():
            if not img.is_file() or img.suffix.lower() not in {".jpg", ".jpeg", ".png"}:
                continue
            dst = REVIEW_DIR / f"{src_class}__{img.name}"
            if dst.exists():
                continue
            shutil.copy2(img, dst)
            copied += 1
        logger.info("[%s] copied %d ảnh", src_class, copied)
        total_copied += copied

    logger.info("DONE: %d ảnh trong %s", total_copied, REVIEW_DIR)
    logger.info(
        "Bước tiếp: mở folder bằng Windows Explorer (View → Extra Large Icons), xóa ảnh clean, còn lại upload Roboflow."
    )


if __name__ == "__main__":
    main()
