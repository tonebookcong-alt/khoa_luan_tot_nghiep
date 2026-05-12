"""
Filter hậu kỳ damage listings đã scrape: chỉ giữ listing thực sự nói về damage.

Quy tắc:
1. Title HOẶC description phải chứa ≥ 1 positive keyword của class
2. KHÔNG chứa negation phrase ("không móp", "đẹp 99%", "nguyên zin"...)
3. KHÔNG là listing độ vỏ (housing replacement) - hay làm noise

Output:
- data/raw/damage/filtered/<class>.jsonl — listings pass
- data/raw/damage/rejected/<class>.jsonl — listings reject (để debug)
- Symlink ảnh từ images/<class>/ → filtered/images/<class>/

Usage:
    python -m scripts.filter_damage_listings --class all
    python -m scripts.filter_damage_listings --class dent
"""

from __future__ import annotations

import argparse
import json
import logging
import re
import shutil
from pathlib import Path

from scripts.utils import DATA_DIR

logger = logging.getLogger(__name__)

DAMAGE_DIR = DATA_DIR / "raw" / "damage"
DAMAGE_IMAGES = DAMAGE_DIR / "images"
DAMAGE_METADATA = DAMAGE_DIR / "metadata"

FILTERED_DIR = DAMAGE_DIR / "filtered"
FILTERED_METADATA = FILTERED_DIR / "metadata"
FILTERED_IMAGES = FILTERED_DIR / "images"
REJECTED_METADATA = FILTERED_DIR / "rejected"

for d in [FILTERED_METADATA, FILTERED_IMAGES, REJECTED_METADATA]:
    d.mkdir(parents=True, exist_ok=True)


POSITIVE_KEYWORDS: dict[str, list[str]] = {
    "dent": [
        r"\bmóp\b",
        r"móp\s+viền",
        r"móp\s+cạnh",
        r"móp\s+khung",
        r"móp\s+đáy",
        r"móp\s+góc",
        r"bị\s+móp",
        r"lõm",
        r"cấn\s+góc",
        r"cấn\s+cạnh",
        r"cấn\s+viền",
    ],
    "crack": [
        r"vỡ\s+kính",
        r"vỡ\s+lưng",
        r"vỡ\s+màn",
        r"nứt\s+màn",
        r"nứt\s+lưng",
        r"nứt\s+kính",
        r"bể\s+kính",
        r"bể\s+lưng",
        r"bể\s+màn",
        r"rạn\s+màn",
        r"rạn\s+kính",
        r"\bbể\s+nát\b",
        r"vỡ\s+camera",
    ],
    "screen_defect": [
        r"sọc\s+màn",
        r"màn\s+sọc",
        r"chấm\s+màn",
        r"màn\s+chấm",
        r"đốm\s+màn",
        r"màn\s+đốm",
        r"ố\s+màn",
        r"màn\s+ố",
        r"ám\s+vàng",
        r"ám\s+màn",
        r"loang\s+màn",
        r"mực\s+sọc",
        r"bể\s+mực",
        r"sáng\s+điểm",
    ],
}

NEGATION_PHRASES = [
    r"không\s+móp",
    r"không\s+nứt",
    r"không\s+vỡ",
    r"không\s+bể",
    r"không\s+xước",
    r"không\s+sọc",
    r"không\s+chấm",
    r"không\s+ố",
    r"không\s+hư",
    r"không\s+lỗi",
    r"đẹp\s+9\d",
    r"đẹp\s+keng",
    r"như\s+mới",
    r"like\s+new",
    r"\bzin\s+all\b",
    r"nguyên\s+zin",
    r"\bfullbox\b",
    r"\bfull\s+box\b",
]


HOUSING_REPLACEMENT_PHRASES = [
    r"độ\s+vỏ",
    r"lên\s+vỏ",
    r"\bup\s+vỏ\b",
    r"thay\s+vỏ",
    r"chuyển\s+vỏ",
]


def compile_patterns(patterns: list[str]) -> list[re.Pattern]:
    return [re.compile(p, re.IGNORECASE) for p in patterns]


POSITIVE_RE: dict[str, list[re.Pattern]] = {
    cls: compile_patterns(kws) for cls, kws in POSITIVE_KEYWORDS.items()
}
NEGATION_RE = compile_patterns(NEGATION_PHRASES)
HOUSING_RE = compile_patterns(HOUSING_REPLACEMENT_PHRASES)


def evaluate_listing(listing: dict, target_class: str) -> tuple[bool, str]:
    """
    Trả (keep, reason).
    Keep = True nếu listing match positive + không match negation/housing.
    """
    title = listing.get("title", "")
    desc = listing.get("description", "")
    text = f"{title}\n{desc}".lower()

    pos_matches = [p.pattern for p in POSITIVE_RE[target_class] if p.search(text)]
    if not pos_matches:
        return False, "no_positive_keyword"

    neg_matches = [p.pattern for p in NEGATION_RE if p.search(text)]
    if neg_matches:
        # Special case: nếu negation cụ thể về class khác (vd "không xước" trong listing dent)
        # → vẫn keep nếu positive cũng có. Đơn giản: cứ match negation là drop.
        return False, f"negation:{neg_matches[0]}"

    housing_matches = [p.pattern for p in HOUSING_RE if p.search(text)]
    if housing_matches:
        return False, f"housing_replacement:{housing_matches[0]}"

    return True, ",".join(pos_matches[:3])


def filter_class(target_class: str, copy_images: bool = True) -> dict:
    src_meta = DAMAGE_METADATA / f"{target_class}.jsonl"
    if not src_meta.exists():
        logger.warning("No metadata for %s", target_class)
        return {"class": target_class, "total": 0, "kept": 0, "rejected": 0}

    keep_path = FILTERED_METADATA / f"{target_class}.jsonl"
    reject_path = REJECTED_METADATA / f"{target_class}.jsonl"
    img_out_dir = FILTERED_IMAGES / target_class
    img_src_dir = DAMAGE_IMAGES / target_class
    img_out_dir.mkdir(parents=True, exist_ok=True)

    keep_path.unlink(missing_ok=True)
    reject_path.unlink(missing_ok=True)

    total, kept, rejected = 0, 0, 0
    reason_counts: dict[str, int] = {}

    with src_meta.open(encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            total += 1
            listing = json.loads(line)
            ok, reason = evaluate_listing(listing, target_class)

            if ok:
                kept += 1
                with keep_path.open("a", encoding="utf-8") as out:
                    out.write(json.dumps(listing, ensure_ascii=False) + "\n")
                if copy_images:
                    for img_rel in listing.get("image_paths", []):
                        fname = Path(img_rel).name
                        src = img_src_dir / fname
                        dst = img_out_dir / fname
                        if src.exists() and not dst.exists():
                            try:
                                shutil.copy2(src, dst)
                            except OSError as e:
                                logger.warning("Copy fail %s: %s", src, e)
            else:
                rejected += 1
                listing["_reject_reason"] = reason
                with reject_path.open("a", encoding="utf-8") as out:
                    out.write(json.dumps(listing, ensure_ascii=False) + "\n")
                reason_counts[reason.split(":")[0]] = (
                    reason_counts.get(reason.split(":")[0], 0) + 1
                )

    logger.info(
        "[%s] total=%d kept=%d (%.1f%%) rejected=%d",
        target_class,
        total,
        kept,
        100.0 * kept / max(total, 1),
        rejected,
    )
    if reason_counts:
        for r, c in sorted(reason_counts.items(), key=lambda x: -x[1]):
            logger.info("  reject [%s]: %d", r, c)

    return {
        "class": target_class,
        "total": total,
        "kept": kept,
        "rejected": rejected,
        "reasons": reason_counts,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Filter damage listings post-scrape")
    parser.add_argument(
        "--class",
        dest="cls",
        choices=["dent", "crack", "screen_defect", "all"],
        default="all",
    )
    parser.add_argument("--no-copy", action="store_true", help="Skip copy ảnh, chỉ filter metadata")
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

    targets = ["dent", "crack", "screen_defect"] if args.cls == "all" else [args.cls]

    results = []
    for t in targets:
        results.append(filter_class(t, copy_images=not args.no_copy))

    print("\n=== SUMMARY ===")
    print(f"{'Class':<16} {'Total':>8} {'Kept':>8} {'Rate':>8}")
    for r in results:
        rate = 100.0 * r["kept"] / max(r["total"], 1)
        print(f"{r['class']:<16} {r['total']:>8} {r['kept']:>8} {rate:>7.1f}%")


if __name__ == "__main__":
    main()
