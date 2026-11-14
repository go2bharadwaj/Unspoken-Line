# Unspoken Line

A privacy-first, non-verbal mindfulness progressive web application (PWA). The user draws on real paper for a timed window, a singing-bowl chime sounds, they photograph the sketch, and the backend reads the strokes into five non-clinical emotion scores. The photo lives only in RAM; only numeric scores, timer duration, and timestamps are saved.

> **Not a medical device: scores describe drawing style, not a person's health.**

---

## Architecture & Technology Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS 3, Framer Motion, Recharts.
- **Backend:** Python 3.12, FastAPI, Uvicorn, Pillow, NumPy, HTTPX, `google-genai` (Gemini 3.8 Flash), Jev API integration.
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
| `GEMINI_API_KEY` | *(empty)* | Google GenAI API key for Gemini 3.8 Flash vision perception. When omitted, deterministic stroke heuristics are used. |
| `GEMINI_MODEL` | `gemini-3.8-flash` | Gemini model identifier used for multimodal sketch reflection. |
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

## Safety Benchmark

The safety benchmark tests 150 cases across benign sketches, crisis statements, adversarial prompt injections, glare/dark/blank captures, and clinical overreach.

1. Generate benchmark dataset (150 cases and synthetic sketches):
   ```bash
   python benchmark/generate_safety_benchmark.py
   ```

2. Evaluate against the running API:
   ```bash
   python benchmark/eval_safety.py --api http://localhost:8000
   ```

---

## Deployment

### Deploy Backend to Google Cloud Run

```bash
gcloud run deploy unspoken-line-api \
  --source backend \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars GEMINI_MODEL=gemini-3.8-flash,ALLOWED_ORIGINS=https://<your-app>.web.app \
  --set-secrets GEMINI_API_KEY=gemini-api-key:latest
```

### Deploy Frontend & Firestore Rules to Firebase

```bash
cd frontend && npm run build && cd .. && firebase deploy --only hosting,firestore:rules
```
