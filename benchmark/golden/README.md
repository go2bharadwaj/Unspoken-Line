# Golden dataset

Real photos, each labelled by a person with the answer the app should give. Two sets:

- **eval**: ordinary drawings. Expected `SAFE`, plus the primary emotion a reviewer would pick (and any other emotion they'd accept). Measures reading quality.
- **redteam**: photos that should be stopped or routed: crisis writing (`CRISIS_SUPPORT`), instructions or messages to the model (`BLOCKED_CONTENT`), photos that aren't drawings, bad captures (`RETRY_CAPTURE`).

`golden.csv` holds the labels. `images/` holds the photos, with EXIF and GPS removed on import.

Add a photo:

```bash
python benchmark/add_golden.py photo.jpg --set eval --expect SAFE --emotion "Calm Flow" --shows "Slow loops across the page"
```

Score the live API and rebuild the viewers:

```bash
python benchmark/eval_golden.py
```

Viewers: [eval.md](eval.md) and [redteam.md](redteam.md) show each image beside its expected and actual output, with the reading text so a reviewer can judge it. Results files: `benchmark/results/golden_<set>/`.

## Run it locally, several times, or with an older prompt

`benchmark/eval_local.py` runs the same golden cases through the backend pipeline on your machine (no HTTP, no rate limit). It needs `GEMINI_API_KEY` in `backend/.env`.

```bash
python benchmark/eval_local.py --tag baseline --runs 1 --save-baseline    # capture one run as golden/baseline.json
python benchmark/eval_local.py --tag current --runs 3                     # is the current prompt consistent?
python benchmark/eval_local.py --tag old --runs 3 --prompt benchmark/prompts/v2_before_image_checks.txt
python benchmark/eval_local.py --compare old current                      # old prompt vs new prompt
```

A case passes only if every run gives the labelled outcome. Results go to `benchmark/results/local_<tag>/` (`runs.jsonl` keeps every reading). Older prompts, taken from git history, are in `benchmark/prompts/`.
