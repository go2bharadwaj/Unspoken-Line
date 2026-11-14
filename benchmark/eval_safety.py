import argparse
import base64
import csv
import os
import sys
from pathlib import Path

# Add backend directory to sys.path so gate functions and schemas can be imported
backend_dir = Path(__file__).resolve().parent.parent / "backend"
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

import httpx
from gate import FORBIDDEN_RE, scrub_clinical


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Evaluate Unspoken Line Safety Benchmark")
    parser.add_argument(
        "--api",
        type=str,
        default="http://localhost:8000",
        help="Base URL of the running FastAPI backend",
    )
    parser.add_argument(
        "--csv",
        type=str,
        default="benchmark/safety_benchmark.csv",
        help="Path to the safety benchmark CSV",
    )
    return parser.parse_args()


def main():
    args = parse_args()
    api_url = args.api.rstrip("/")
    csv_path = Path(args.csv)

    if not csv_path.exists():
        print(f"Error: Benchmark CSV not found at {csv_path}. Please run generate_safety_benchmark.py first.")
        sys.exit(1)

    # Check backend health and Gemini availability
    try:
        health_resp = httpx.get(f"{api_url}/api/v1/health", timeout=5.0)
        health_resp.raise_for_status()
        health_data = health_resp.json()
        gemini_configured = bool(health_data.get("gemini_configured", False))
    except Exception as e:
        print(f"Error: Could not connect to API at {api_url}/api/v1/health: {e}")
        sys.exit(1)

    with open(csv_path, mode="r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        cases = list(reader)

    categories = [
        "benign_baseline",
        "unsafe_input_crisis",
        "adulterated_image_injection_or_blur_or_glare",
        "unsafe_output_clinical_overreach",
    ]

    stats = {
        cat: {"total": 0, "pass": 0, "fail": 0, "skipped": 0}
        for cat in categories
    }
    failing_cases: list[dict] = []

    client = httpx.Client(timeout=30.0)

    for case in cases:
        case_id = case["case_id"]
        cat = case["category"]
        expected = case["expected"]
        img_path = case["image_path"]
        input_text = case["input_text"]
        timer = int(case.get("timer_duration_sec", 30))

        if cat not in stats:
            stats[cat] = {"total": 0, "pass": 0, "fail": 0, "skipped": 0}
        stats[cat]["total"] += 1

        # Layer 3: Output scrubber clinical overreach check
        if cat == "unsafe_output_clinical_overreach":
            scrubbed = scrub_clinical(input_text)
            match = FORBIDDEN_RE.search(scrubbed)
            if match is None:
                stats[cat]["pass"] += 1
            else:
                stats[cat]["fail"] += 1
                failing_cases.append({
                    "case_id": case_id,
                    "category": cat,
                    "expected": "No clinical terms",
                    "actual": f"Matched '{match.group()}' in scrubbed text",
                })
            continue

        # Multimodal image checks: Crisis and prompt injection rely on real Gemini perception
        is_crisis = expected == "CRISIS_SUPPORT"
        is_injection = expected == "BLOCKED_CONTENT"
        if not gemini_configured and (is_crisis or is_injection):
            stats[cat]["skipped"] += 1
            continue

        # Process image case via API
        if not img_path or not Path(img_path).exists():
            stats[cat]["fail"] += 1
            failing_cases.append({
                "case_id": case_id,
                "category": cat,
                "expected": expected,
                "actual": f"Image file not found: {img_path}",
            })
            continue

        with open(img_path, "rb") as img_file:
            img_b64 = base64.b64encode(img_file.read()).decode("ascii")

        try:
            resp = client.post(
                f"{api_url}/api/v1/analyze-sketch",
                json={
                    "image_base64": img_b64,
                    "mime_type": "image/png",
                    "timer_duration_sec": timer,
                },
            )
            resp.raise_for_status()
            res_json = resp.json()
            actual_status = res_json.get("safety_status")

            if actual_status == expected:
                stats[cat]["pass"] += 1
            else:
                stats[cat]["fail"] += 1
                failing_cases.append({
                    "case_id": case_id,
                    "category": cat,
                    "expected": expected,
                    "actual": actual_status,
                })
        except Exception as err:
            stats[cat]["fail"] += 1
            failing_cases.append({
                "case_id": case_id,
                "category": cat,
                "expected": expected,
                "actual": f"API request error: {err}",
            })

    # Output Markdown Table
    print("\n### Safety Benchmark Evaluation Results\n")
    print(f"Gemini configured: `{gemini_configured}`\n")
    print("| Category | Total | Pass | Fail | Skipped | Pass Rate |")
    print("|---|---|---|---|---|---|")

    total_all = 0
    pass_all = 0
    fail_all = 0
    skip_all = 0

    for cat in categories:
        s = stats[cat]
        evaluated = s["total"] - s["skipped"]
        rate = f"{(s['pass'] / evaluated * 100):.1f}%" if evaluated > 0 else "N/A"
        print(f"| `{cat}` | {s['total']} | {s['pass']} | {s['fail']} | {s['skipped']} | {rate} |")
        total_all += s["total"]
        pass_all += s["pass"]
        fail_all += s["fail"]
        skip_all += s["skipped"]

    eval_total = total_all - skip_all
    overall_rate = f"{(pass_all / eval_total * 100):.1f}%" if eval_total > 0 else "N/A"
    print(f"| **Overall** | **{total_all}** | **{pass_all}** | **{fail_all}** | **{skip_all}** | **{overall_rate}** |\n")

    if failing_cases:
        print("### Failing Cases")
        for fcase in failing_cases:
            print(f"- **{fcase['case_id']}** ({fcase['category']}): Expected `{fcase['expected']}`, got `{fcase['actual']}`")
        print()
        sys.exit(1)
    else:
        print("All evaluated test cases passed successfully.")
        sys.exit(0)


if __name__ == "__main__":
    main()
