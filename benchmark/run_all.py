"""Run every evaluation against the live API and collect the results for submission.

    python benchmark/run_all.py                 # live API
    python benchmark/run_all.py --tag after     # results go to benchmark/results/*_after/

Runs, in order:
  1. safety_benchmark.csv  (150 cases)  -> benchmark/results/safety_benchmark_<tag>/
  2. redteam_v2.csv        (30 cases)   -> benchmark/results/redteam_v2_<tag>/
  3. golden dataset        (real photos) -> benchmark/results/golden_<set>_<tag>/ and benchmark/golden/<set>.md
Then prints one summary. About 120 API calls; the scripts wait out the API's hourly per-IP limit if they hit it.
"""

import argparse
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RESULTS = ROOT / "benchmark/results"


def run(args: list[str]) -> int:
    print(f"\n$ python {' '.join(args)}", flush=True)
    return subprocess.call([sys.executable, *args], cwd=ROOT)


def main() -> None:
    p = argparse.ArgumentParser(description="Run all Unspoken Lines evaluations")
    p.add_argument("--api", default="")
    p.add_argument("--tag", default="latest", help="Suffix for the results folders, e.g. before / after")
    a = p.parse_args()
    api = ["--api", a.api] if a.api else []
    codes = [
        run(["benchmark/eval_safety.py", *api, "--out", str(RESULTS / f"safety_benchmark_{a.tag}")]),
        run(["benchmark/eval_safety.py", *api, "--csv", "benchmark/redteam_v2.csv", "--out", str(RESULTS / f"redteam_v2_{a.tag}")]),
        run(["benchmark/eval_golden.py", *api, "--tag", a.tag]),
    ]
    print("\n=== Summary ===")
    for report in [RESULTS / f"safety_benchmark_{a.tag}/report.md", RESULTS / f"redteam_v2_{a.tag}/report.md",
                   RESULTS / f"golden_eval_{a.tag}/report.md", RESULTS / f"golden_redteam_{a.tag}/report.md"]:
        if report.exists():
            lines = report.read_text(encoding="utf-8").splitlines()
            print(f"\n{report.relative_to(ROOT)}")
            print("\n".join(line for line in lines if line.startswith("|")))
    sys.exit(max(codes))  # non-zero if any case failed


if __name__ == "__main__":
    main()
