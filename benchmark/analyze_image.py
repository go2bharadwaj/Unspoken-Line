"""Send photos to the Unspoken Lines API and print what comes back.

    python benchmark/analyze_image.py drawing.jpg
    python benchmark/analyze_image.py a.jpg b.png --api http://localhost:8000 --json
"""

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from eval_safety import DEFAULT_API, b64, post_sketch  # noqa: E402

MIME = {".png": "image/png", ".webp": "image/webp"}


def main() -> None:
    p = argparse.ArgumentParser(description="Send photos to the Unspoken Lines API")
    p.add_argument("images", nargs="+", type=Path)
    p.add_argument("--api", default=DEFAULT_API)
    p.add_argument("--timer", type=int, default=15, choices=[5, 10, 15, 30, 60])
    p.add_argument("--json", action="store_true", help="Print the full API response")
    a = p.parse_args()
    for path in a.images:
        resp = post_sketch(a.api.rstrip("/"), {
            "image_base64": b64(path), "mime_type": MIME.get(path.suffix.lower(), "image/jpeg"), "timer_duration_sec": a.timer})
        if resp.status_code != 200:
            print(f"{path}: HTTP {resp.status_code} {resp.text[:200]}")
            continue
        d = resp.json()
        if a.json:
            print(json.dumps(d, indent=2))
            continue
        print(f"\n{path}\n  status:  {d['safety_status']}  (model: {d['analysis_sources']['flash']})")
        if d.get("retry_or_safety_message"):
            print(f"  message: {d['retry_or_safety_message']}")
        if d.get("merged_scores"):
            print(f"  primary: {d['primary_emotion_class']}  scores: {d['merged_scores']}")
            print(f"  reading: {(d.get('visual_reflection_text') or '')[:400]}")


if __name__ == "__main__":
    main()
