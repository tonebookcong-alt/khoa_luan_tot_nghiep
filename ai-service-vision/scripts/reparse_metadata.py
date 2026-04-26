"""
Re-parse field detected_generation/detected_model_text trên metadata đã có.

Dùng khi update logic title_parser mà không muốn scrape lại từ đầu.

Usage:
    python -m scripts.reparse_metadata --source chotot
"""

from __future__ import annotations

import argparse
import json
import logging

from scripts.title_parser import extract_generation, extract_model_text
from scripts.utils import METADATA_DIR

logger = logging.getLogger(__name__)


def reparse(source: str) -> None:
    metadata_path = METADATA_DIR / f"{source}.jsonl"
    if not metadata_path.exists():
        logger.error("Not found: %s", metadata_path)
        return

    backup_path = metadata_path.with_suffix(".jsonl.bak")
    if backup_path.exists():
        backup_path.unlink()
    metadata_path.rename(backup_path)

    total = 0
    changed_gen = 0
    changed_model = 0

    with backup_path.open(encoding="utf-8") as f_in, metadata_path.open(
        "w", encoding="utf-8"
    ) as f_out:
        for line in f_in:
            line = line.strip()
            if not line:
                continue
            obj = json.loads(line)
            total += 1
            old_gen = obj.get("detected_generation")
            old_model = obj.get("detected_model_text")

            new_gen = extract_generation(obj["title"])
            new_model = extract_model_text(obj["title"])

            if old_gen != new_gen:
                changed_gen += 1
                logger.info("GEN changed: %s -> %s | %s", old_gen, new_gen, obj["title"][:80])
            if old_model != new_model:
                changed_model += 1

            obj["detected_generation"] = new_gen
            obj["detected_model_text"] = new_model
            f_out.write(json.dumps(obj, ensure_ascii=False) + "\n")

    logger.info(
        "Done. Total: %d, generation changed: %d, model_text changed: %d",
        total,
        changed_gen,
        changed_model,
    )
    logger.info("Backup: %s", backup_path)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", default="chotot")
    args = parser.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
    reparse(args.source)


if __name__ == "__main__":
    main()
