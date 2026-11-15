# Where each prompt comes from

Prompt files are used byte for byte as the model's system instruction. Nothing in them was edited for the evaluation.

| Prompt | File | Origin |
|---|---|---|
| Basic | `basic.txt` | Written for this evaluation as a naive baseline: one sentence, no safety or image-check instructions. |
| Older | `v1_initial.txt` | `SYSTEM_INSTRUCTION` in `backend/ai.py` at commit `b79cabe` (first version of the app). Identical to the prompt on branch `feature/vm-docker-deploy` (commit `f9a8a00`). |
| Current | none: read from `backend/ai.py` at run time | `SYSTEM_INSTRUCTION` on `main` (commit `3e654cc`). Each run saves the exact text as `prompt.txt`. |
| (not in the headline comparison) | `v2_before_image_checks.txt`, `v3_before_tablet_fix.txt` | `backend/ai.py` at commits `e9b1971` and `32d7772`. |
