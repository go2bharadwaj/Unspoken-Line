"""Unspoken Lines safety benchmark.

Runs every case in safety_benchmark.csv and writes per-case results plus a Markdown report.

- Cases that need the model (normal drawings, crisis writing, hidden instructions) go to the live API.
- Cases decided before any model runs (dark/glare/blank photos, clinical-word scrub) run locally through
  the same backend code (backend/gate.py), so a full run stays under the API's per-IP hourly limit.

Usage (from the repo root, with backend requirements installed):
    python benchmark/eval_safety.py                      # live API
    python benchmark/eval_safety.py --api http://localhost:8000
"""

import argparse
import base64
import csv
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "backend"))

import httpx  # noqa: E402
from gate import FORBIDDEN_RE, check_quality, compute_telemetry, decode_image, scrub_clinical  # noqa: E402

LIVE_API = "https://34-58-192-9.nip.io"
CASE_TYPES = {  # report rows, keyed by expected outcome
    "SAFE": "Normal drawings",
    "CRISIS_SUPPORT": "Crisis writing",
    "BLOCKED_CONTENT": "Hidden instructions in the image",
    "RETRY_CAPTURE": "Dark, glare or blank photos",
    "SCRUBBED": "Clinical words in a reading",
}


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Evaluate the Unspoken Lines safety benchmark")
    p.add_argument("--api", default=LIVE_API, help=f"Backend base URL (default: {LIVE_API})")
    p.add_argument("--csv", default=str(ROOT / "benchmark/safety_benchmark.csv"))
    p.add_argument("--out", default=str(ROOT / "benchmark/results"), help="Folder for results.csv and report.md")
    p.add_argument("--only", default="", help="Comma-separated case_id prefixes to run, e.g. crisis,inject")
    return p.parse_args()


def b64(path: Path) -> str:
    return base64.b64encode(path.read_bytes()).decode("ascii")


def run_local(case: dict) -> tuple[str, str]:
    """Cases the backend settles before any model call. Returns (actual, detail)."""
    if case["expected"] == "SCRUBBED":
        hit = FORBIDDEN_RE.search(scrub_clinical(case["input_text"]))
        return ("SCRUBBED", "") if hit is None else ("NOT_SCRUBBED", f"'{hit.group()}' survived")
    img = decode_image(b64(ROOT / case["image_path"]))
    telemetry, _ = compute_telemetry(img, int(case["timer_duration_sec"]))
    msg = check_quality(telemetry)
    return ("RETRY_CAPTURE", msg) if msg else ("PASSED_GATE", "")


def post_sketch(api: str, body: dict) -> httpx.Response:
    """POST one sketch. Waits out the hourly per-IP limit and retries dropped connections on a fresh one."""
    for attempt in range(80):
        try:
            with httpx.Client(timeout=90) as client:  # new connection each try: kept-alive ones go stale during waits
                resp = client.post(f"{api}/api/v1/analyze-sketch", json=body)
        except httpx.TransportError as err:
            if attempt >= 4:
                raise
            print(f"    connection error ({err}), retrying...", flush=True)
            time.sleep(3)
            continue
        if resp.status_code != 429:
            return resp
        print("    rate limited, waiting 60s...", flush=True)
        time.sleep(60)
    return resp


def run_api(api: str, case: dict) -> tuple[str, str, int]:
    body = {
        "image_base64": b64(ROOT / case["image_path"]),
        "mime_type": "image/png",
        "timer_duration_sec": int(case["timer_duration_sec"]),
    }
    resp = post_sketch(api, body)
    resp.raise_for_status()
    data = resp.json()
    ms = round(resp.elapsed.total_seconds() * 1000)  # the request itself, not time spent waiting out the rate limit
    return data.get("safety_status") or "NONE", (data.get("retry_or_safety_message") or "")[:120], ms


def main() -> None:
    args = parse_args()
    api = args.api.rstrip("/")
    cases = list(csv.DictReader(open(args.csv, encoding="utf-8")))
    if args.only:
        prefixes = tuple(p.strip() for p in args.only.split(",") if p.strip())
        cases = [c for c in cases if c["case_id"].startswith(prefixes)]

    missing = [c["image_path"] for c in cases if c["image_path"] and not (ROOT / c["image_path"]).exists()]
    if missing:
        sys.exit(f"Missing {len(missing)} case images (first: {missing[0]}). Run from a full checkout of the repo.")

    health = httpx.get(f"{api}/api/v1/health", timeout=10).json()
    if not health.get("gemini_configured"):
        sys.exit(f"{api} has no Gemini key, so the model cases cannot be evaluated. Use the live API.")

    rows = []
    for i, case in enumerate(cases, 1):
        local = case["expected"] in ("SCRUBBED", "RETRY_CAPTURE")
        start = time.perf_counter()
        try:
            actual, detail, ms = (*run_local(case), None) if local else run_api(api, case)
        except Exception as err:  # a crashed case is a failed case, never a skipped one
            actual, detail, ms = "ERROR", str(err)[:120], None
        ms = ms if ms is not None else round((time.perf_counter() - start) * 1000)
        ok = actual == case["expected"]
        rows.append({**{k: case[k] for k in ("case_id", "category", "description", "expected")},
                     "actual": actual, "passed": ok, "ran_via": "local" if local else "api",
                     "latency_ms": ms, "detail": detail})
        print(f"[{i:3}/{len(cases)}] {'PASS' if ok else 'FAIL'} {case['case_id']:12} expected {case['expected']:15} got {actual}", flush=True)

    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    with open(out / "results.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0]))
        w.writeheader()
        w.writerows(rows)

    def line(name: str, rs: list[dict]) -> str:
        n, p = len(rs), sum(r["passed"] for r in rs)
        return f"| {name} | {n} | {p} | {n - p} | {p / n * 100:.1f}% |"

    groups: dict[str, list[dict]] = {}
    for r in rows:
        groups.setdefault(f"{CASE_TYPES.get(r['expected'], r['category'])} → `{r['expected']}`", []).append(r)
    api_ms = sorted(r["latency_ms"] for r in rows if r["ran_via"] == "api")
    report = [
        "# Safety benchmark results",
        "",
        f"Run: {datetime.now(timezone.utc):%Y-%m-%d %H:%M UTC} · API: `{api}` · model cases: {len(api_ms)} via API, "
        f"{len(rows) - len(api_ms)} decided locally by `backend/gate.py`",
        "",
        "Metric: exact match between the expected and actual `safety_status` (or scrub result), per case.",
        "",
        "| Case type → expected | Cases | Passed | Failed | Pass rate |",
        "|---|---|---|---|---|",
        *[line(k, v) for k, v in groups.items()],
        line("**All**", rows),
    ]
    if api_ms:
        report += ["", f"API latency: median {api_ms[len(api_ms) // 2] / 1000:.1f}s, slowest {api_ms[-1] / 1000:.1f}s."]
    fails = [r for r in rows if not r["passed"]]
    report += ["", "## Failures", ""] + (
        [f"- `{r['case_id']}` ({r['description']}): expected `{r['expected']}`, got `{r['actual']}` {r['detail']}" for r in fails]
        or ["None."]
    )
    (out / "report.md").write_text("\n".join(report) + "\n", encoding="utf-8")
    print("\n".join(report))
    print(f"\nWrote {out / 'results.csv'} and {out / 'report.md'}")
    sys.exit(1 if fails else 0)


if __name__ == "__main__":
    main()
