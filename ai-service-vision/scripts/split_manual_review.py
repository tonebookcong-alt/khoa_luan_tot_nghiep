"""
Chia ảnh trong manual_review/ thành 4 folder con để 4 người review song song.

Strategy: round-robin theo tên file đã sort → mỗi folder cân bằng class prefix
(dent/crack/screen_defect) và dễ verify số lượng.

Move (không copy) — để giải phóng folder gốc thành rỗng. Bản gốc vẫn ở
images/dent|crack|screen_defect/ — an toàn nếu cần redo.

Usage:
    python -m scripts.split_manual_review
    python -m scripts.split_manual_review --teams 4
"""

from __future__ import annotations

import argparse
import logging
import shutil
from collections import Counter
from pathlib import Path

from scripts.utils import DATA_DIR

logger = logging.getLogger(__name__)

REVIEW_DIR = DATA_DIR / "raw" / "damage" / "manual_review"


def split(num_teams: int) -> None:
    if not REVIEW_DIR.exists():
        logger.error("manual_review/ không tồn tại — chạy flatten_damage_for_review trước")
        return

    images = sorted(
        p for p in REVIEW_DIR.iterdir() if p.is_file() and p.suffix.lower() in {".jpg", ".jpeg", ".png"}
    )
    if not images:
        logger.error("manual_review/ rỗng — không có gì để chia")
        return

    logger.info("Tổng ảnh: %d, chia cho %d người", len(images), num_teams)

    # Tạo team folders
    team_dirs = [REVIEW_DIR / f"team_{i+1}" for i in range(num_teams)]
    for d in team_dirs:
        d.mkdir(exist_ok=True)

    # Round-robin distribute
    team_counts = Counter()
    team_class_breakdown: dict[int, Counter] = {i: Counter() for i in range(num_teams)}

    for idx, img in enumerate(images):
        team_idx = idx % num_teams
        dst = team_dirs[team_idx] / img.name
        shutil.move(str(img), str(dst))
        team_counts[team_idx] += 1

        # extract class prefix từ tên file (dent__xxx, crack__xxx, screen_defect__xxx)
        prefix = img.name.split("__", 1)[0] if "__" in img.name else "unknown"
        team_class_breakdown[team_idx][prefix] += 1

    print("\n=== KẾT QUẢ CHIA ===")
    print(f"{'Team':<10} {'Total':>8} {'dent':>8} {'crack':>8} {'screen_defect':>16}")
    for i in range(num_teams):
        b = team_class_breakdown[i]
        print(
            f"team_{i+1:<5} {team_counts[i]:>8} "
            f"{b.get('dent', 0):>8} {b.get('crack', 0):>8} {b.get('screen_defect', 0):>16}"
        )

    print(f"\nFolder gửi bạn bè: {REVIEW_DIR}/team_1, team_2, team_3, team_4")


def main() -> None:
    parser = argparse.ArgumentParser(description="Chia manual_review thành N folder")
    parser.add_argument("--teams", type=int, default=4, help="Số người chia")
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
    split(args.teams)


if __name__ == "__main__":
    main()
