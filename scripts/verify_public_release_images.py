#!/usr/bin/env python3
"""Verify deployed SAFEPLATE images match the human-approved release manifest."""

from __future__ import annotations

import argparse
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

from PIL import Image, ImageFile, ImageStat


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", type=Path, required=True)
    parser.add_argument("--assets", type=Path, required=True)
    parser.add_argument("--report", type=Path, required=True)
    args = parser.parse_args()

    ImageFile.LOAD_TRUNCATED_IMAGES = False
    manifest = json.loads(args.manifest.read_text())
    results = []
    failures = []

    for expected in manifest["images"]:
        name = Path(expected["path"]).name
        path = args.assets / name
        digest = hashlib.sha256(path.read_bytes()).hexdigest()
        with Image.open(path) as image:
            image.verify()
        with Image.open(path) as image:
            image.load()
            rgb = image.convert("RGB").resize((64, 64))
            spread = sum(ImageStat.Stat(rgb).stddev) / 3
            actual_size = [image.width, image.height]
        ok = digest == expected["sha256"] and actual_size == [expected["width"], expected["height"]] and spread > 20
        if not ok:
            failures.append(name)
        results.append({"file": name, "sha256": digest, "size": actual_size, "pixelSpread": round(spread, 2), "approved": ok})

    report = {
        "checkedAt": datetime.now(timezone.utc).isoformat(),
        "manifestVersion": manifest["version"],
        "approved": not failures,
        "failures": failures,
        "images": results,
    }
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps(report, indent=2) + "\n")
    if failures:
        raise SystemExit(f"Public image verification failed: {', '.join(failures)}")
    print(f"Verified {len(results)} human-approved Public View images")


if __name__ == "__main__":
    main()
