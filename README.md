# Unspoken Lines

A non-verbal mindfulness app. You draw on real paper for a short timed window, photograph the drawing, and get a written reading of what it says about your current state, five emotion scores, and three short practices to try. Over time the app notices how your drawings change.

**Live app:** https://unspoken-line.web.app (phone or laptop, installable as an app) · **API health:** https://34-58-192-9.nip.io/api/v1/health

> **Unspoken Lines is not a medical device.** Readings describe the drawing, not a person's health, and never name a condition.

---

## How it works

1. **Sign in with Google.** The first time, the app asks your age once. It is sent with every reading.
2. **Draw.** Pick a timer (5–60 s, default 15 s). A chime starts and ends the drawing window.
3. **Photograph the drawing** with your phone camera or webcam, or pick an existing photo.
4. **The backend checks the photo before anything else:**
   - Dark, glare-washed or blank photos are sent back for a retake.
   - Gemini then decides whether it is a hand drawing, and whether it contains a written message, explicit content, crisis writing or instructions aimed at the AI.
   - Crisis writing goes to a support screen with the 988 Lifeline.
   - Anything else that fails the check is blocked, and nothing written in an image is ever followed.
5. **The reading** appears word by word, answering *"What does this drawing say about my current mental state?"*. It comes with:
   - your photo
   - three practices (short guided activities)
   - the five scores
   - a 1–10 accuracy rating (there is no 7)
6. **From the second session on**, the reading also compares this drawing with private progression notes written after earlier sessions, under "Since your last drawing".
7. **Past readings** are listed in a side panel, like a chat history. You can reopen or delete any of them.

**Admin eval mode:** the admin account (set in `frontend/src/lib/admin.ts`) is matched by a SHA-256 hash of its email, so the address is not published in the app.
- Every reading from this account is made as if from a new person: no age, no history and no notes.
- Its accuracy ratings serve as the human evaluation.
- "Clear My History" is hidden for this account.

## Privacy and data

| What | Where it goes |
|---|---|
| The photo | Read in memory and discarded. A user can turn off **"Discard my photo after reading"** to keep an encrypted copy with each reading. |
| Readings, scores, progression notes, rating | Firestore, **encrypted** |
| Age | Firestore, **encrypted** |
| Date, timer length, which model answered | Firestore, readable (needed to sort and validate) |

- **Encryption:** done by the backend (`backend/vault.py`) with AES-256-GCM. Each user's key is derived from `DATA_ENCRYPTION_KEY` and their Firebase uid, so the database and the Firebase console only ever hold ciphertext.
- **Database rules:** `firestore.rules` rejects personal fields that aren't encrypted.
- **Deleting:** deleting a reading deletes its photo. "Clear My History" deletes every reading and photo.

## Architecture

```
Browser (React PWA)  ──HTTPS──▶  FastAPI on a GCE VM (Docker + Caddy)  ──▶  Gemini
   │  Firebase Auth                 ├─ gate.py   photo checks, scrubber, scores
   └─ Firestore (ciphertext)        ├─ ai.py     reading + progression prompts
         ▲                          └─ vault.py  seal / open user data
         └──── sealed values come from /api/v1/vault/seal ◀──┘
```

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS 3, Framer Motion, Recharts, and Firebase Auth/Firestore. Hosted on Firebase Hosting.
- **Backend:** Python 3.12, FastAPI, Pillow, NumPy, `google-genai` and `cryptography`. Runs in Docker on a Compute Engine VM behind Caddy (automatic HTTPS).
- **Models:**
  - `gemini-4-hydrogen` reads the drawing.
  - `gemini-3.8-flash` writes the progression notes in the background.
  - The Jev scoring API is wired in but off, so the shown scores are Gemini's.

## Repository layout

| Path | What it holds |
|---|---|
| `frontend/` | The web app. `src/App.tsx` holds the views; `src/components/` holds the screens and the guided practices; `src/lib/` holds the API, Firebase storage, the admin check and image helpers. |
| `backend/` | The API. `main.py` holds the routes and the safety triage order. `ai.py` holds the prompts and Gemini calls, `gate.py` the photo checks and stroke scoring, `vault.py` the encryption and `ratelimit.py` the rate limits. Tests are in `tests/`. |
| `firestore.rules` | Who can read and write what. Personal fields must be sealed. |
| `firestore-tests/` | Tests for `firestore.rules` in the Firestore emulator. |
| `benchmark/` | Safety and accuracy evaluation: generated cases, red-team set, golden real photos, runners. |
| `deploy/` | VM setup guide (`VM.md`), blue/green deploy script, Caddyfile, frontend smoke test. |
| `.github/workflows/` | Automatic deploys of the frontend and backend on every merge to `main`. |
| `docs/SPEC.md` | Product and technical spec: API contract, prompts, safety layers. |
| `eval_report.md`, `safety_report.md` | Latest evaluation and safety results. |

---

## Run it locally

### Prerequisites

- Python 3.12+
- Node.js 20+ and npm
- Optional, for signed-in mode: a Firebase project with Google sign-in and Firestore enabled
- Optional, for real readings: a Gemini API key

### Quick start

```bash
./start_dev.sh
```

`start_dev.sh` does the following:
- copies `backend/.env.example` and `frontend/.env.example` to `.env` if they don't exist yet
- creates `backend/.venv` and installs the Python dependencies
- installs the frontend dependencies
- starts the API on http://localhost:8000 and the app on http://localhost:5173

Ctrl+C stops both.

### What you get depends on the settings you fill in

| Setting | Left empty | Filled in |
|---|---|---|
| `VITE_FIREBASE_*` in `frontend/.env` | **Guest mode:** no sign-in, and history is kept in the browser's local storage. Good for UI work. | Google sign-in, history in Firestore. Also needs `FIREBASE_PROJECT_ID` and `DATA_ENCRYPTION_KEY` in `backend/.env`. |
| `GEMINI_API_KEY` in `backend/.env` | Readings and scores come from built-in stroke measurements, with a fixed short reading. No image safety check runs, so use this only for development. | Real Gemini readings and the full image check. If a Gemini call then fails, the user is asked to retry rather than getting an unchecked reading. |

Generate an encryption key with:

```bash
python3 -c "import os,base64;print(base64.b64encode(os.urandom(32)).decode())"
```

### Manual setup (instead of `start_dev.sh`)

```bash
# Backend
cd backend
python3 -m venv .venv
.venv/bin/pip install -r requirements-dev.txt
cp .env.example .env            # then fill in what you need
.venv/bin/uvicorn main:app --reload --port 8000

# Frontend (second terminal)
cd frontend
npm install
cp .env.example .env            # VITE_API_URL=http://localhost:8000
npm run dev
```

## Tests and checks

```bash
cd backend && .venv/bin/python -m pytest -q         # backend: safety triage, prompts, encryption, rate limits
cd frontend && npm run build                         # frontend: TypeScript typecheck + production build
cd firestore-tests && npm install && npm test        # Firestore rules in the emulator (Firebase CLI + Java 21+)
```

The deploy workflows also run the backend tests and the frontend build.

## Configuration

### Backend (`backend/.env`)

| Variable | Default | Purpose |
|---|---|---|
| `GEMINI_API_KEY` | *(empty)* | Gemini access. See "What you get" above for behaviour without it. |
| `GEMINI_MODEL` | `gemini-4-hydrogen` | Model that reads the drawing. |
| `GEMINI_SUMMARY_MODEL` | `gemini-3.8-flash` | Model that writes the progression notes. |
| `FIREBASE_PROJECT_ID` | *(empty)* | Lets the API verify Firebase sign-ins (per-user rate limits, encrypted history). |
| `DATA_ENCRYPTION_KEY` | *(empty)* | 32 random bytes, base64. Encrypts all saved user data. **Keep a backup: losing or changing it makes every saved reading unreadable.** |
| `ALLOWED_ORIGINS` | `http://localhost:5173` | Comma-separated CORS origins. |
| `RATE_LIMIT_PER_USER_HOUR` | `10` | Readings per signed-in user per hour. |
| `RATE_LIMIT_PER_IP_HOUR` | `100` | Readings per IP per hour without a sign-in. |
| `RATE_LIMIT_VAULT_PER_USER_HOUR` | `300` | Encrypt/decrypt calls per user per hour. |
| `DAILY_ANALYZE_CAP` | `1000` | Gemini-backed requests per day, across everyone. |
| `JEV_API_KEY`, `JEV_API_URL`, `JEV_MODEL` | *(empty)*, *(empty)*, `jev-latest` | Optional Jev scoring service. Off unless both key and URL are set. |

### Frontend (`frontend/.env`)

| Variable | Purpose |
|---|---|
| `VITE_API_URL` | Base URL of the API, e.g. `http://localhost:8000`. |
| `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID` | Firebase web config. Leave all four empty for guest mode. |

`.env` files are never committed.

---

## Deployment

Merging to `main` deploys automatically. Each workflow only runs when files it owns change.

- **Frontend** (`.github/workflows/deploy-frontend.yml`), for changes to `frontend/`, `firebase.json` or `firestore.rules`:
  1. Typecheck and build.
  2. Deploy to a Firebase preview channel and smoke-test it.
  3. Deploy the Firestore rules, then promote the site to live.
- **Backend** (`.github/workflows/deploy-backend.yml`), for changes to `backend/` or `deploy/`:
  1. Run the tests.
  2. Ship the code to the VM.
  3. Run `deploy/deploy.sh`, a blue/green swap: the new container must pass health checks before Caddy switches to it, otherwise the old one keeps serving.

**Secrets on the VM:** the live API reads its environment from **`/opt/app/app.env`** on the VM (not `backend/.env`). After deploying, `/api/v1/health` should report `"gemini_configured":true` and `"encryption_configured":true`.

**First-time VM setup** (static IP, Docker, Caddy, HTTPS) is in [deploy/VM.md](deploy/VM.md).

Manual frontend deploy, if ever needed:

```bash
cd frontend && npm run build && cd .. && firebase deploy --only hosting,firestore:rules
```

## Safety and accuracy evaluation

There are three test sets, with their images committed so a fresh clone runs as is:

| Set | Cases | What it covers |
|---|---|---|
| `benchmark/safety_benchmark.csv` | 150 | Normal drawings, crisis lines, hidden instructions, bad photos, clinical-word scrubs |
| `benchmark/redteam_v2.csv` | 30 | Harder attacks hidden in real-looking drawings (coded, indirect, Spanish and French), plus harmless labels to catch over-blocking |
| [Golden dataset](benchmark/golden/README.md) | 15 | Real photos with human labels |

```bash
pip install -r backend/requirements.txt
python benchmark/run_all.py                         # every set, against the live API
python benchmark/analyze_image.py my_drawing.jpg    # one photo, full answer
```

Each run writes `results.csv` and `report.md` under `benchmark/results/`. Results and write-ups: [eval_report.md](eval_report.md) and [safety_report.md](safety_report.md).

## Contributing

Work on a `feature/…` branch and open a pull request into `main`. Merging deploys, so keep `main` releasable.
