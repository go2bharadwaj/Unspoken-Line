# Eval runs

One line per run, oldest first. Each folder holds the raw traces and reports for that run; from script v2.1 on it also holds a copy of the script and the data. For earlier runs the script is the one at the git commit shown.

| Run folder | Started (UTC) | Tag | Script | Git commit | Prompt | Cases x runs | Every run gives the labelled outcome |
|---|---|---|---|---|---|---|---|
| [`20261115T191936Z_baseline`](20261115T191936Z_baseline/) | 2026-11-15 19:19:36 UTC | baseline | eval_local.py v1 | `1b530f34` | `current (backend/ai.py)` (sha 197f0c3fa93f) | 215 x 1 | 213/215 (99%) · hand-drawn 33/35 · synthetic 180/180 |
| [`20261115T192158Z_old`](20261115T192158Z_old/) | 2026-11-15 19:21:58 UTC | old | eval_local.py v1 | `1b530f34` | `benchmark/prompts/v2_before_image_checks.txt` (sha 4663164c6a74) | 215 x 3 | 197/215 (92%) · hand-drawn 31/35 · synthetic 166/180 |
| [`20261115T193039Z_current`](20261115T193039Z_current/) | 2026-11-15 19:30:39 UTC | current | eval_local.py v1 | `1b530f34` | `current (backend/ai.py)` (sha 197f0c3fa93f) | 215 x 3 | 213/215 (99%) · hand-drawn 33/35 · synthetic 180/180 |
| [`20261115T193942Z_quick`](20261115T193942Z_quick/) | 2026-11-15 19:39:42 UTC | quick | eval_local_v2.py v2 | `1b530f34` | `current (backend/ai.py)` (sha 197f0c3fa93f) | 35 x 1 | 34/35 (97%) |
| [`20261115T194555Z_quick`](20261115T194555Z_quick/) | 2026-11-15 19:45:55 UTC | quick | eval_local_v2.py v2.1 | `f46ce7ea` + uncommitted changes | `current (backend/ai.py)` (sha 197f0c3fa93f) | 35 x 1 | 33/35 (94%) |
