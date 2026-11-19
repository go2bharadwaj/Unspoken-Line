"""Score the live API against the golden dataset (benchmark/golden/golden.csv).

For each labelled photo it compares the API's answer with what a person said it should be:
- every case: safety_status must match expected_status
- eval cases with an expected_emotion: primary_emotion_class must be that emotion or one in also_ok_emotions

Writes, per set:
    benchmark/results/golden_<set>/results.csv   one row per case, with the reading text for human review
    benchmark/results/golden_<set>/report.md     accuracy per check, failures listed
    benchmark/golden/<set>.md                    viewer: each image beside its expected and actual output

    python benchmark/eval_golden.py               # both sets, local backend, adversarial cases skipped
    python benchmark/eval_golden.py --set redteam --include-adversarial

Cases expected to be blocked or routed to crisis support are skipped by default; see eval_safety.py.
"""

import argparse
import csv
import json
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "benchmark"))

import httpx  # noqa: E402
from eval_safety import ADVERSARIAL, DEFAULT_API, b64, post_sketch  # noqa: E402

GOLDEN = ROOT / "benchmark/golden"


def call(api: str, path: Path) -> dict:
    mime = "image/png" if path.suffix.lower() == ".png" else "image/jpeg"
    resp = post_sketch(api, {"image_base64": b64(path), "mime_type": mime, "timer_duration_sec": 15})
    resp.raise_for_status()
    return resp.json()


def judge(case: dict, data: dict) -> tuple[bool, bool | None]:
    status_ok = data.get("safety_status") == case["expected_status"]
    if case["set"] != "eval" or not case["expected_emotion"] or case["expected_status"] != "SAFE":
        return status_ok, None
    ok = {case["expected_emotion"], *filter(None, case["also_ok_emotions"].split("|"))}
    return status_ok, data.get("primary_emotion_class") in ok


def viewer(set_name: str, rows: list[dict]) -> str:
    out = [f"# Golden dataset: {set_name}", "",
           f"{len(rows)} labelled photos. Each shows what a person expected and what the live API returned. "
           "Regenerate with `python benchmark/eval_golden.py`.", ""]
    for r in rows:
        mark = "PASS" if r["passed"] else "FAIL"
        expected = {"safety_status": r["expected_status"]}
        if r["expected_emotion"]:
            expected["primary_emotion_class"] = r["expected_emotion"] + (f" (or {r['also_ok_emotions'].replace('|', ', ')})" if r["also_ok_emotions"] else "")
        actual = {"safety_status": r["actual_status"], "primary_emotion_class": r["actual_emotion"] or None,
                  "merged_scores": json.loads(r["scores"]) if r["scores"] else None}
        out += [
            f"## {r['case_id']} · {mark}", "",
            f'<img src="{Path(r["image_path"]).relative_to("benchmark/golden").as_posix()}" width="360" alt="{r["what_it_shows"]}">', "",
            f"**Shows:** {r['what_it_shows']}", "",
            "| Expected | Actual |", "|---|---|",
            f"| <pre>{json.dumps(expected, indent=1)}</pre> | <pre>{json.dumps(actual, indent=1)}</pre> |", "",
        ]
        if r["expected_reading"]:
            out += [f"**A good reading should:** {r['expected_reading']}", ""]
        if r["reading"] or r["message"]:
            out += [f"> {(r['reading'] or r['message']).replace(chr(10), ' ')}", ""]
    return "\n".join(out) + "\n"


def main() -> None:
    p = argparse.ArgumentParser(description="Score the live API against the golden dataset")
    p.add_argument("--api", default=DEFAULT_API)
    p.add_argument("--include-adversarial", action="store_true", help="Also send blocked/crisis cases to Gemini")
    p.add_argument("--set", choices=["eval", "redteam"], help="Run one set (default: both)")
    p.add_argument("--tag", default="", help="Suffix for the results folder, e.g. before / after")
    a = p.parse_args()
    api = a.api.rstrip("/")
    csv_path = GOLDEN / "golden.csv"
    cases = list(csv.DictReader(open(csv_path, encoding="utf-8"))) if csv_path.exists() else []
    if a.set:
        cases = [c for c in cases if c["set"] == a.set]
    if not a.include_adversarial:
        cases = [c for c in cases if c["expected_status"] not in ADVERSARIAL]
    if not cases:
        sys.exit("No cases to run. Add photos with benchmark/add_golden.py, or pass --include-adversarial.")
    if not httpx.get(f"{api}/api/v1/health", timeout=10).json().get("gemini_configured"):
        sys.exit(f"{api} has no Gemini key.")

    rows = []
    for i, case in enumerate(cases, 1):
        try:
            data = call(api, ROOT / case["image_path"])
        except Exception as err:  # a crashed case counts as failed
            data = {"safety_status": "ERROR", "retry_or_safety_message": str(err)[:200]}
        status_ok, emotion_ok = judge(case, data)
        passed = status_ok and emotion_ok is not False
        rows.append({**case, "actual_status": data.get("safety_status"), "actual_emotion": data.get("primary_emotion_class") or "",
                     "status_ok": status_ok, "emotion_ok": "" if emotion_ok is None else emotion_ok, "passed": passed,
                     "scores": json.dumps(data["merged_scores"]) if data.get("merged_scores") else "",
                     "reading": data.get("visual_reflection_text") or "", "message": data.get("retry_or_safety_message") or "",
                     "human_ok": ""})
        print(f"[{i}/{len(cases)}] {'PASS' if passed else 'FAIL'} {case['case_id']} expected {case['expected_status']} "
              f"{case['expected_emotion']} got {data.get('safety_status')} {data.get('primary_emotion_class') or ''}", flush=True)

    stamp = f"{datetime.now(timezone.utc):%Y-%m-%d %H:%M UTC}"
    for set_name in sorted({r["set"] for r in rows}):
        rs = [r for r in rows if r["set"] == set_name]
        out = ROOT / f"benchmark/results/golden_{set_name}" if not a.tag else ROOT / f"benchmark/results/golden_{set_name}_{a.tag}"
        out.mkdir(parents=True, exist_ok=True)
        with open(out / "results.csv", "w", newline="", encoding="utf-8") as f:
            w = csv.DictWriter(f, fieldnames=list(rs[0]))
            w.writeheader()
            w.writerows(rs)
        emo = [r for r in rs if r["emotion_ok"] != ""]
        pct = lambda k, n: f"{k}/{n} ({k / n * 100:.1f}%)" if n else "n/a"  # noqa: E731
        report = [f"# Golden dataset results: {set_name}", "", f"Run: {stamp} · API: `{api}`", "",
                  "| Check | Result |", "|---|---|",
                  f"| Safety status matches the label | {pct(sum(r['status_ok'] for r in rs), len(rs))} |",
                  f"| Primary emotion matches the label | {pct(sum(r['emotion_ok'] is True for r in emo), len(emo))} |",
                  f"| **Case passes both** | **{pct(sum(r['passed'] for r in rs), len(rs))}** |", "", "## Failures", ""]
        fails = [r for r in rs if not r["passed"]]
        report += [f"- `{r['case_id']}` ({r['what_it_shows']}): expected {r['expected_status']} {r['expected_emotion']}, "
                   f"got {r['actual_status']} {r['actual_emotion']}" for r in fails] or ["None."]
        (out / "report.md").write_text("\n".join(report) + "\n", encoding="utf-8")
        (GOLDEN / f"{set_name}.md").write_text(viewer(set_name, rs), encoding="utf-8")
        print("\n".join(report))
    print("\nViewer pages: benchmark/golden/eval.md, benchmark/golden/redteam.md")
    sys.exit(0 if all(r["passed"] for r in rows) else 1)


if __name__ == "__main__":
    main()
