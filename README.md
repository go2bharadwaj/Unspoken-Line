# Unspoken Lines

A privacy-first, non-verbal mindfulness progressive web application (PWA). The user draws on real paper for a timed window, a singing-bowl chime sounds, they photograph the sketch, and the backend reads the strokes into five non-clinical emotion scores. The photo lives only in RAM; only numeric scores, timer duration, and timestamps are saved.

**Live app:** https://unspoken-line.web.app (laptop and phone) · **API:** https://34-58-192-9.nip.io/api/v1/health

> **Not a medical device: scores describe drawing style, not a person's health.**

---

## Architecture & Technology Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS 3, Framer Motion, Recharts.
- **Backend:** Python 3.12, FastAPI, Uvicorn, Pillow, NumPy, HTTPX, `google-genai` (`gemini-4-hydrogen`), Jev API integration.
- **Storage & Identity:** Firebase Authentication (Google Sign-In) and Cloud Firestore (with zero-persistence Guest Sanctuary fallback).
- **Safety & Privacy:** 3-layer safety architecture (deterministic input gate, multimodal crisis/injection triage, clinical terminology scrubber) and zero disk or log persistence of user imagery.

---

## Prerequisites

- **Python:** 3.12 or newer
- **Node.js:** 20.x or newer (and npm)
- **Google Cloud SDK (`gcloud`) & Firebase CLI (`firebase-tools`):** Optional, required for cloud deployment

---

## Quickstart

Start both the FastAPI backend (`:8000`) and the Vite frontend (`:5173`) in two commands:

```bash
cp backend/.env.example backend/.env && ./start_dev.sh
```

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Default | Description |
|---|---|---|
| `GEMINI_API_KEY` | *(empty)* | Google GenAI API key for Gemini (`gemini-4-hydrogen`) vision perception. When omitted (local dev), deterministic stroke heuristics are used. When set and a call fails, the request returns RETRY_CAPTURE: no image gets a reading without Gemini's safety check. |
| `GEMINI_MODEL` | `gemini-4-hydrogen` | Gemini model identifier used for multimodal sketch reflection. |
| `GEMINI_SUMMARY_MODEL` | `gemini-3.8-flash` | Model for the background progression summary written after each reading. |
| `DATA_ENCRYPTION_KEY` | *(empty)* | 32 random bytes, base64. The backend seals each user's readings, scores, notes, rating and age with AES-256-GCM (a per-user key derived from this one), so Firestore only holds ciphertext. Required for signed-in users to save history. **Back it up: losing it makes every saved reading unreadable.** |
| `JEV_API_KEY` | *(empty)* | API key for calibrated Jev emotion scoring service. When omitted, deterministic calibration fallback is used. |
| `JEV_API_URL` | *(empty)* | REST endpoint for the Jev service. |
| `JEV_MODEL` | `jev-latest` | Model identifier for Jev service. |
| `ALLOWED_ORIGINS` | `http://localhost:5173` | Comma-separated CORS allowed origins. |

### Frontend (`frontend/.env`)

| Variable | Description |
|---|---|
| `VITE_API_URL` | Base URL of the FastAPI backend (e.g. `http://localhost:8000`). |
| `VITE_FIREBASE_API_KEY` | Firebase Web API key. |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase Authentication domain. |
| `VITE_FIREBASE_PROJECT_ID` | Cloud Firestore / Firebase project identifier. |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket. |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase Cloud Messaging sender ID. |
| `VITE_FIREBASE_APP_ID` | Firebase Web Application ID. |

*(Note: When Firebase environment variables are omitted, the application operates seamlessly in local Guest Sanctuary mode).*

---

## Running Tests

Run the backend unit test suite:

```bash
cd backend
python -m pytest
```

---

## Evaluation

215 examples: 35 hand-drawn photos labelled by the team and 180 generated cases. 137 of them are red-team cases (crisis, prompt injection, non-drawings, bad photos). A case passes only if **every** repeated run returns the labelled outcome.

| Latest result (15 Nov 2026, 3 runs per case) | Earlier prompt | Current prompt |
|---|---|---|
| Every run gives the labelled outcome | 197/215 (92%) | **213/215 (99%)** |
| Normal drawings get a reading | 62/78 (79%) | **78/78 (100%)** |
| Crisis is flagged, every run | 43/43 (100%) | **43/43 (100%)** |
| Injection, message or non-drawing is blocked, every run | 33/34 (97%) | 33/34 (97%) |
| Same outcome in all three runs | 208/215 (97%) | **215/215 (100%)** |

Full reports, raw traces and checksums for each run are in [`benchmark/results/runs/`](benchmark/results/runs/). The newest `*_current` folder holds `eval_report.md` and `safety_report.md`.

**Run it yourself**

```bash
pip install -r backend/requirements.txt

# No key needed: scores the 35 hand-drawn photos against the live app (about 3 minutes)
python benchmark/eval_golden.py

# With a Gemini key in backend/.env: runs the backend pipeline on your machine, one photo per request
python benchmark/eval_local_v2.py --quick                    # 35 hand-drawn photos, about 25 seconds
python benchmark/eval_local_v2.py --tag current --runs 3     # all 215 cases, three times each
python benchmark/eval_local_v2.py --tag old --runs 3 --prompt benchmark/prompts/v2_before_image_checks.txt
python benchmark/eval_local_v2.py --compare old current      # earlier prompt against the current one
```

Every local run writes its own folder with the exact prompt, the inputs and image checksums, every model response (`traces.jsonl`), per-case results and the two reports. `benchmark/judge.py` adds a second opinion on any run from Anthropic and OpenAI models, which see each photo and the app's answer but not our label.

## Safety Benchmark

Two generated case sets, with their images committed under `benchmark/cases/`, plus the golden dataset of real photos:

| Set | Cases | What it covers |
|---|---|---|
| `safety_benchmark.csv` | 150 | 45 normal drawings, 30 crisis lines, 15 hidden instructions, 30 dark/glare/blank photos, 30 clinical-word scrubs |
| `redteam_v2.csv` | 30 | Harder round: handwritten crisis and injection lines tucked into real-looking drawings (coded, indirect, Spanish and French wording), plus 10 normal drawings with harmless labels to catch over-blocking |

Results and write-ups: [eval_report.md](eval_report.md) and [safety_report.md](safety_report.md). Real photos with human labels live in the [golden dataset](benchmark/golden/README.md).

Run everything against the live API (needs the backend requirements: `pip install -r backend/requirements.txt`):

```bash
python benchmark/run_all.py                       # all sets; add --tag after to keep a second run beside the first
python benchmark/analyze_image.py my_drawing.jpg  # send one photo and see the full answer
```

Model cases go to the API; cases the backend settles before any model call (bad photos, the clinical-word scrub) run locally through the same `backend/gate.py`, so one run stays under the API's hourly per-IP limit. If it is reached anyway, the script waits and continues. Each run writes `results.csv` (one row per case) and `report.md` (pass rate per case type, failures listed). The metric is an exact match on the expected safety status.

To rebuild the case images: `python benchmark/generate_safety_benchmark.py` and `python benchmark/generate_redteam_v2.py` (the second needs macOS handwriting fonts).

---

## Deployment

### Deploy Backend to a Google Cloud VM

The backend runs with Docker Compose (API + Caddy for HTTPS) on a Compute Engine VM. Full steps: [deploy/VM.md](deploy/VM.md).

### Deploy Frontend & Firestore Rules to Firebase

```bash
cd frontend && npm run build && cd .. && firebase deploy --only hosting,firestore:rules
```
