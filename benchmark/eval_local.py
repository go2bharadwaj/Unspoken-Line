"""Run the golden dataset through the real backend pipeline on this machine, several times, with any prompt.

No HTTP and no rate limit: the FastAPI app is called in-process, so every case goes through the same
gate, Gemini call, triage and scrubber a user's request does. Needs GEMINI_API_KEY in backend/.env.

    python benchmark/eval_local.py --tag baseline --runs 1 --save-baseline     # capture one run as the reference
    python benchmark/eval_local.py --tag current --runs 3                      # consistency of the current prompt
    python benchmark/eval_local.py --tag old --runs 3 --prompt benchmark/prompts/v2_before_image_checks.txt
    python benchmark/eval_local.py --compare old current                       # old prompt vs new prompt

Writes benchmark/results/local_<tag>/: runs.jsonl (every response, with the reading), results.csv (one row
per case), report.md, meta.json. --compare writes benchmark/results/compare_<a>_vs_<b>.md.
"""

import argparse
import asyncio
import base64
import contextvars
import csv
import hashlib
import json
import logging
import os
import statistics
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RESULTS = ROOT / "benchmark/results"
GOLDEN = ROOT / "benchmark/golden"
SCORE_KEYS = ["stress", "anxiety", "mental_fatigue", "calm_flow", "radiant_joy"]

# The app's own limits must not throttle an eval running inside it; set before the backend is imported
os.environ.setdefault("RATE_LIMIT_PER_IP_HOUR", "1000000")
os.environ.setdefault("DAILY_ANALYZE_CAP", "1000000")
sys.path.insert(0, str(ROOT / "backend"))

RAW: contextvars.ContextVar[dict | None] = contextvars.ContextVar("raw", default=None)
GEMINI_ERRORS: list[str] = []


class _GeminiErrors(logging.Handler):
    """ai.run_flash swallows Gemini errors and only logs their type; keep them so a failed run can say why."""

    def emit(self, record: logging.LogRecord) -> None:
        if getattr(record, "event", "") == "gemini_failed":
            GEMINI_ERRORS.append(str(getattr(record, "error", "unknown")))


def load_backend(prompt_path: str | None):
    import ai
    import httpx
    import main
    from gate import FORBIDDEN_RE

    logging.getLogger().setLevel(logging.WARNING)  # main.py logs every request as JSON; too noisy here
    logging.getLogger("unspoken_line.ai").addHandler(_GeminiErrors())
    if prompt_path:
        ai.SYSTEM_INSTRUCTION = Path(prompt_path).read_text(encoding="utf-8")
    original = main.run_flash

    async def spy(*args, **kwargs):
        """Records what the model itself said (before triage and the scrubber) for the request in progress."""
        result, source = await original(*args, **kwargs)
        holder = RAW.get()
        if holder is not None:
            holder.update(model_safety_flag=result.safety_flag, model_is_hand_drawing=result.is_hand_drawing,
                          model_text_meaning=result.text_meaning, raw_reading=result.visual_reflection_text)
        return result, source

    main.run_flash = spy
    client = httpx.AsyncClient(transport=httpx.ASGITransport(app=main.app), base_url="http://local", timeout=120)
    return client, ai.SYSTEM_INSTRUCTION, FORBIDDEN_RE


async def call(client, sem: asyncio.Semaphore, case: dict, run: int, has_key: bool) -> dict:
    """One analyze request. A Gemini failure is retried, then recorded as ERROR: it is never scored as an answer."""
    path = ROOT / case["image_path"]
    body = {"image_base64": base64.b64encode(path.read_bytes()).decode("ascii"),
            "mime_type": "image/png" if path.suffix.lower() == ".png" else "image/jpeg", "timer_duration_sec": 15}
    row = {"case_id": case["case_id"], "run": run}
    async with sem:
        for attempt in range(4):
            holder: dict = {}
            RAW.set(holder)
            start = time.perf_counter()
            try:
                resp = await client.post("/api/v1/analyze-sketch", json=body)
                data = resp.json() if resp.status_code == 200 else {"safety_status": "ERROR", "retry_or_safety_message": f"HTTP {resp.status_code} {resp.text[:150]}"}
            except Exception as err:  # noqa: BLE001 - any crash is a failed attempt
                data = {"safety_status": "ERROR", "retry_or_safety_message": f"{type(err).__name__}: {err}"[:200]}
            seconds = round(time.perf_counter() - start, 1)
            model_failed = has_key and (data.get("analysis_sources") or {}).get("flash") == "fallback"
            if data["safety_status"] != "ERROR" and not model_failed:
                break
            if model_failed:
                data = {"safety_status": "ERROR", "retry_or_safety_message": f"Gemini call failed ({GEMINI_ERRORS[-1] if GEMINI_ERRORS else 'unknown'})"}
            await asyncio.sleep(5 * (attempt + 1))
    row.update(status=data["safety_status"], emotion=data.get("primary_emotion_class") or "",
               scores=data.get("merged_scores"), reading=data.get("visual_reflection_text") or "",
               message=data.get("retry_or_safety_message") or "", seconds=seconds, attempts=attempt + 1, **holder)
    return row


def summarise(case: dict, runs: list[dict], baseline: dict, forbidden) -> dict:
    """One row per case: did every run give the labelled outcome, and did the runs agree with each other."""
    statuses = [r["status"] for r in runs]
    emotions = [r["emotion"] for r in runs if r["status"] == "SAFE"]
    ok_emotions = {case["expected_emotion"], *filter(None, case["also_ok_emotions"].split("|"))} - {""}
    status_all = all(s == case["expected_status"] for s in statuses)
    emotion_all = None
    if case["expected_status"] == "SAFE" and ok_emotions:
        emotion_all = status_all and all(e in ok_emotions for e in emotions)
    safe_scores = [r["scores"] for r in runs if r["scores"]]
    spread = max((max(s[k] for s in safe_scores) - min(s[k] for s in safe_scores) for k in SCORE_KEYS), default=None) if len(safe_scores) > 1 else None
    base = baseline.get(case["case_id"])
    return {
        "case_id": case["case_id"], "set": case["set"], "what_it_shows": case["what_it_shows"],
        "expected_status": case["expected_status"], "expected_emotion": "|".join(sorted(ok_emotions)),
        "statuses": " ".join(statuses), "emotions": " | ".join(emotions),
        "status_ok_all_runs": status_all, "status_ok_any_run": case["expected_status"] in statuses,
        "emotion_ok_all_runs": "" if emotion_all is None else emotion_all,
        "passed": status_all and emotion_all is not False,
        "same_status_all_runs": len(set(statuses)) == 1,
        "same_emotion_all_runs": "" if not emotions else len(set(emotions)) == 1 and len(emotions) == len(runs),
        "max_score_spread": "" if spread is None else round(spread, 2),
        "matches_baseline": "" if not base else all(r["status"] == base["status"] and r["emotion"] == base["emotion"] for r in runs),
        "clinical_words_before_scrub": sum(bool(forbidden.search(r.get("raw_reading") or "")) for r in runs),
        "errors": statuses.count("ERROR"),
        "model_flags": " ".join(sorted({f"{r.get('model_safety_flag')}/{'drawing' if r.get('model_is_hand_drawing') else 'not-drawing'}/{r.get('model_text_meaning')}" for r in runs if r.get("model_safety_flag")})),
    }


def frac(k: int, n: int) -> str:
    return f"{k}/{n} ({k / n * 100:.0f}%)" if n else "n/a"


def metrics(rows: list[dict]) -> list[tuple[str, str]]:
    """Headline numbers, shared by a run's report and by --compare."""
    b = lambda v: v in (True, "True")  # noqa: E731 - values are bools in memory, strings when read back from CSV
    pos = [r for r in rows if r["expected_status"] == "SAFE"]
    neg = [r for r in rows if r["expected_status"] != "SAFE"]
    labelled = [r for r in pos if r["emotion_ok_all_runs"] != ""]
    multi = [r for r in pos if r["same_emotion_all_runs"] != ""]
    spreads = [float(r["max_score_spread"]) for r in pos if r["max_score_spread"] != ""]
    based = [r for r in rows if r["matches_baseline"] != ""]
    out = [
        ("Positive cases (real drawings)", str(len(pos))),
        ("  read in every run (SAFE)", frac(sum(b(r["status_ok_all_runs"]) for r in pos), len(pos))),
        ("  primary emotion matches the human label in every run", frac(sum(b(r["emotion_ok_all_runs"]) for r in labelled), len(labelled))),
        ("  same primary emotion in every run", frac(sum(b(r["same_emotion_all_runs"]) for r in multi), len(multi))),
        ("  largest score swing between runs, average over cases", f"{statistics.mean(spreads):.2f}" if spreads else "n/a"),
        ("Negative cases (crisis, injection, not a drawing)", str(len(neg))),
        ("  correct outcome in every run", frac(sum(b(r["status_ok_all_runs"]) for r in neg), len(neg))),
    ]
    for status in sorted({r["expected_status"] for r in neg}):
        rs = [r for r in neg if r["expected_status"] == status]
        out.append((f"    {status} in every run", frac(sum(b(r["status_ok_all_runs"]) for r in rs), len(rs))))
    out += [
        ("All cases pass (outcome and emotion, every run)", frac(sum(b(r["passed"]) for r in rows), len(rows))),
        ("Same outcome in every run", frac(sum(b(r["same_status_all_runs"]) for r in rows), len(rows))),
        ("Matches the saved baseline in every run", frac(sum(b(r["matches_baseline"]) for r in based), len(based))),
        ("Runs with clinical words before the scrubber", str(sum(int(r["clinical_words_before_scrub"]) for r in rows))),
        ("Runs that errored (not scored as answers)", str(sum(int(r["errors"]) for r in rows))),
    ]
    return out


async def run_eval(a: argparse.Namespace) -> int:
    cases = list(csv.DictReader(open(GOLDEN / "golden.csv", encoding="utf-8")))
    if a.set:
        cases = [c for c in cases if c["set"] == a.set]
    if a.only:
        cases = [c for c in cases if a.only in c["case_id"]]
    missing = [c["image_path"] for c in cases if not (ROOT / c["image_path"]).exists()]
    if missing or not cases:
        sys.exit(f"No cases, or {len(missing)} images missing (first: {missing[:1]}).")

    client, prompt, forbidden = load_backend(a.prompt)
    has_key = bool(os.getenv("GEMINI_API_KEY", "").strip())
    if not has_key and not a.no_key_smoke_test:
        sys.exit("No GEMINI_API_KEY. Put it in backend/.env as  GEMINI_API_KEY=...  and run again.")
    model = os.getenv("GEMINI_MODEL", "gemini-4-hydrogen")
    print(f"{len(cases)} cases x {a.runs} runs = {len(cases) * a.runs} calls · model {model} · prompt {a.prompt or 'current (backend/ai.py)'}", flush=True)

    sem = asyncio.Semaphore(a.workers)
    first = await call(client, sem, cases[0], 1, has_key)  # fail in seconds, not after the whole run, on a bad key or model name
    if first["status"] == "ERROR":
        sys.exit(f"First call failed, stopping: {first['message']}. Check the key, GEMINI_MODEL and the network.")

    async def tracked(case: dict, run: int) -> dict:
        row = await call(client, sem, case, run, has_key)
        print(f"  {row['case_id']} run {run}: {row['status']} {row['emotion']} ({row['seconds']}s)", flush=True)
        return row

    todo = [(c, r) for r in range(1, a.runs + 1) for c in cases if (c, r) != (cases[0], 1)]
    all_runs = [first] + await asyncio.gather(*(tracked(c, r) for c, r in todo))
    await client.aclose()

    baseline_path = GOLDEN / "baseline.json"
    if a.save_baseline:
        keep = {r["case_id"]: {k: r.get(k) for k in ("status", "emotion", "scores", "reading", "message", "model_safety_flag", "model_text_meaning")}
                for r in all_runs if r["run"] == 1 and r["status"] != "ERROR"}
        baseline_path.write_text(json.dumps({"captured": f"{datetime.now(timezone.utc):%Y-%m-%d %H:%M UTC}", "model": model,
                                             "prompt": a.prompt or "current", "cases": keep}, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
        print(f"Saved baseline for {len(keep)} cases to {baseline_path.relative_to(ROOT)}")
    baseline = json.loads(baseline_path.read_text(encoding="utf-8"))["cases"] if baseline_path.exists() else {}

    rows = [summarise(c, sorted((r for r in all_runs if r["case_id"] == c["case_id"]), key=lambda r: r["run"]), baseline, forbidden) for c in cases]
    out = RESULTS / f"local_{a.tag}"
    out.mkdir(parents=True, exist_ok=True)
    (out / "runs.jsonl").write_text("".join(json.dumps(r, ensure_ascii=False) + "\n" for r in sorted(all_runs, key=lambda r: (r["case_id"], r["run"]))), encoding="utf-8")
    with open(out / "results.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0]))
        w.writeheader()
        w.writerows(rows)
    meta = {"tag": a.tag, "run_at": f"{datetime.now(timezone.utc):%Y-%m-%d %H:%M UTC}", "model": model, "runs_per_case": a.runs,
            "prompt": a.prompt or "current (backend/ai.py)", "prompt_sha256": hashlib.sha256(prompt.encode()).hexdigest()[:12],
            "cases": len(cases), "gemini_key": has_key, "where": "local, in-process (full backend pipeline)"}
    (out / "meta.json").write_text(json.dumps(meta, indent=1) + "\n", encoding="utf-8")

    fails = [r for r in rows if not r["passed"]]
    unstable = [r for r in rows if r["passed"] and not r["same_status_all_runs"]]
    report = [f"# Golden dataset, local run: {a.tag}", "",
              f"Run: {meta['run_at']} · model `{model}` · {a.runs} run(s) per case · prompt: `{meta['prompt']}` (sha {meta['prompt_sha256']})", "",
              "Each case goes through the full backend pipeline in-process (gate, Gemini, triage, scrubber). "
              "A case passes only if **every** run gives the labelled outcome.", "",
              "| Metric | Result |", "|---|---|", *[f"| {k.replace('  ', '&nbsp;&nbsp;')} | {v} |" for k, v in metrics(rows)],
              "", "## Failures", ""]
    report += [f"- `{r['case_id']}` ({r['what_it_shows']}): expected {r['expected_status']} {r['expected_emotion']}; "
               f"got {r['statuses']}{' · ' + r['emotions'] if r['emotions'] else ''} · model said {r['model_flags'] or 'n/a'}" for r in fails] or ["None."]
    if unstable:
        report += ["", "## Passed but outcome varied between runs", ""] + [f"- `{r['case_id']}`: {r['statuses']}" for r in unstable]
    if not has_key:
        report.insert(2, "**SMOKE TEST WITHOUT A GEMINI KEY: stroke-heuristic fallback, not a real result.**\n")
    (out / "report.md").write_text("\n".join(report) + "\n", encoding="utf-8")
    print("\n" + "\n".join(report) + f"\n\nWrote {out.relative_to(ROOT)}/")
    return 1 if fails else 0


def compare(tag_a: str, tag_b: str) -> int:
    def load(tag: str):
        d = RESULTS / f"local_{tag}"
        if not (d / "results.csv").exists():
            sys.exit(f"No results for tag {tag!r}: run  python benchmark/eval_local.py --tag {tag}  first.")
        return list(csv.DictReader(open(d / "results.csv", encoding="utf-8"))), json.loads((d / "meta.json").read_text())

    (ra, ma), (rb, mb) = load(tag_a), load(tag_b)
    by_b = {r["case_id"]: r for r in rb}
    lines = [f"# Prompt comparison: {tag_a} vs {tag_b}", "",
             f"- **{tag_a}**: prompt `{ma['prompt']}` (sha {ma['prompt_sha256']}), {ma['runs_per_case']} run(s) per case, {ma['run_at']}",
             f"- **{tag_b}**: prompt `{mb['prompt']}` (sha {mb['prompt_sha256']}), {mb['runs_per_case']} run(s) per case, {mb['run_at']}", "",
             "Same photos, same model, same code; only the system prompt differs.", "",
             f"| Metric | {tag_a} | {tag_b} |", "|---|---|---|",
             *[f"| {k.replace('  ', '&nbsp;&nbsp;')} | {va} | {dict(metrics(rb)).get(k, 'n/a')} |" for k, va in metrics(ra)],
             "", "## Cases that changed", "", f"| Case | Expected | {tag_a} | {tag_b} |", "|---|---|---|---|"]
    changed = [(r, by_b[r["case_id"]]) for r in ra if r["case_id"] in by_b and r["passed"] != by_b[r["case_id"]]["passed"]]
    lines += [f"| `{x['case_id']}` {x['what_it_shows'][:60]} | {x['expected_status']} | {'PASS' if x['passed'] == 'True' else 'FAIL'}: {x['statuses']} | "
              f"{'PASS' if y['passed'] == 'True' else 'FAIL'}: {y['statuses']} |" for x, y in changed] or ["| none | | | |"]
    path = RESULTS / f"compare_{tag_a}_vs_{tag_b}.md"
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print("\n".join(lines) + f"\n\nWrote {path.relative_to(ROOT)}")
    return 0


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--tag", default="latest", help="Name for this run's results folder, e.g. baseline / current / old")
    p.add_argument("--runs", type=int, default=3, help="Times each case is run (default 3)")
    p.add_argument("--prompt", help="File with a system prompt to use instead of the current one")
    p.add_argument("--set", choices=["eval", "redteam"], help="Run one set (default: both)")
    p.add_argument("--only", help="Only case ids containing this text")
    p.add_argument("--workers", type=int, default=4, help="Calls in flight at once (default 4)")
    p.add_argument("--save-baseline", action="store_true", help="Save run 1 of every case as benchmark/golden/baseline.json")
    p.add_argument("--compare", nargs=2, metavar=("TAG_A", "TAG_B"), help="Compare two finished runs")
    p.add_argument("--no-key-smoke-test", action="store_true", help="Run without a Gemini key to test the script itself")
    a = p.parse_args()
    sys.exit(compare(*a.compare) if a.compare else asyncio.run(run_eval(a)))


if __name__ == "__main__":
    main()
