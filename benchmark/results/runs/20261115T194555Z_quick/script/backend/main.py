import asyncio
import base64
import json
import logging
import os
import sys

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token

import ratelimit
import vault
from ai import run_flash, run_jev, summarize_reading
from gate import (
    ACTIVITIES,
    CRISIS_MESSAGE,
    GateRejection,
    check_quality,
    clean_jpeg_bytes,
    compute_telemetry,
    confidence,
    decode_image,
    get_blocked_message,
    merge_scores,
    primary_class,
    scrub_clinical,
    stroke_scores,
    trend_text,
)
from schemas import (
    AnalysisSources,
    AnalyzeSketchRequest,
    AnalyzeSketchResponse,
    HealthResponse,
    SummarizeReadingRequest,
    SummarizeReadingResponse,
    VaultOpenResponse,
    VaultRequest,
    VaultSealResponse,
)

load_dotenv()

FIREBASE_PROJECT_ID = os.getenv("FIREBASE_PROJECT_ID", "").strip()


def _verify_uid(token: str) -> str | None:
    # ponytail: fetches Google's certs per call (~tens of ms); cache them if analyze volume grows.
    try:
        claims = id_token.verify_firebase_token(
            token, google_requests.Request(), audience=FIREBASE_PROJECT_ID
        )
        return claims.get("user_id") or claims.get("sub")
    except Exception:
        return None


async def _enforce_rate_limit(request: Request, bucket: str = "") -> None:
    """Raise 429 if this caller is over their hourly limit. `bucket` keeps endpoints' counts separate."""
    # Caddy sets X-Forwarded-For; rightmost entry is the one the proxy saw, so it can't be spoofed.
    ip = request.headers.get("x-forwarded-for", "").split(",")[-1].strip() or (
        request.client.host if request.client else "unknown"
    )
    # Signed-in users get their own bucket (safe on shared wifi); guests/invalid tokens fall back to IP.
    auth = request.headers.get("authorization", "")
    uid = None
    if FIREBASE_PROJECT_ID and auth.lower().startswith("bearer "):
        uid = await asyncio.to_thread(_verify_uid, auth[7:].strip())
    key, limit = (f"uid:{uid}", ratelimit.PER_USER_HOUR) if uid else (f"ip:{ip}", ratelimit.PER_IP_HOUR)
    reason = ratelimit.check(bucket + key, limit)
    if reason:
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=reason)


class JsonEventFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        base = {
            "level": record.levelname,
            "name": record.name,
            "message": record.getMessage(),
        }
        if hasattr(record, "event"):
            base["event"] = record.event
        if hasattr(record, "safety_status"):
            base["safety_status"] = record.safety_status
        if hasattr(record, "sources"):
            base["sources"] = record.sources
        if hasattr(record, "error"):
            base["error"] = record.error
        return json.dumps(base)


handler = logging.StreamHandler(sys.stdout)
handler.setFormatter(JsonEventFormatter())
root_logger = logging.getLogger()
root_logger.setLevel(logging.INFO)
root_logger.handlers = [handler]

logger = logging.getLogger("unspoken_line.main")

app = FastAPI(
    title="Unspoken Lines API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url=None,
)

# CORS configuration
allowed_origins_raw = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173")
allowed_origins = [o.strip() for o in allowed_origins_raw.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


@app.get("/api/v1/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    """Returns service availability and provider configuration status."""
    gemini_key = os.getenv("GEMINI_API_KEY", "").strip()
    jev_key = os.getenv("JEV_API_KEY", "").strip()
    jev_url = os.getenv("JEV_API_URL", "").strip()

    return HealthResponse(
        status="ok",
        gemini_configured=bool(gemini_key),
        jev_configured=bool(jev_key and jev_url),
        encryption_configured=vault.configured(),
    )


@app.post(
    "/api/v1/analyze-sketch",
    response_model=AnalyzeSketchResponse,
    status_code=status.HTTP_200_OK,
)
async def analyze_sketch(req: AnalyzeSketchRequest, request: Request) -> AnalyzeSketchResponse:
    """Performs RAM-only perceptual analysis of a timed physical sketch."""
    await _enforce_rate_limit(request)

    # Step 1: Decode & validate image buffer
    try:
        img = decode_image(req.image_base64)
    except GateRejection as rejection:
        logger.info(
            "gate_rejection_decode",
            extra={
                "event": "analyze_outcome",
                "safety_status": "RETRY_CAPTURE",
                "sources": None,
            },
        )
        return AnalyzeSketchResponse(
            safety_status="RETRY_CAPTURE",
            retry_or_safety_message=rejection.message,
            telemetry=rejection.telemetry,
        )

    # Step 2: Telemetry & deterministic quality gate
    telemetry, gray = compute_telemetry(img, req.timer_duration_sec)
    quality_message = check_quality(telemetry)
    if quality_message is not None:
        logger.info(
            "gate_rejection_quality",
            extra={
                "event": "analyze_outcome",
                "safety_status": "RETRY_CAPTURE",
                "sources": None,
            },
        )
        del img, gray
        return AnalyzeSketchResponse(
            safety_status="RETRY_CAPTURE",
            retry_or_safety_message=quality_message,
            telemetry=telemetry,
        )

    # Step 3: Strip EXIF and compute baseline stroke scores
    jpeg = clean_jpeg_bytes(img)
    base_scores, base_bullets = stroke_scores(
        gray,
        ink_mask=None,
        timer_duration_sec=req.timer_duration_sec,
    )
    jpeg_b64 = base64.b64encode(jpeg).decode("ascii")

    # Step 4: Parallel multimodal perception with deterministic fallbacks
    flash_res_tuple, jev_res_tuple = await asyncio.gather(
        run_flash(jpeg, telemetry, (base_scores, base_bullets), req.previous_summary, req.age),
        run_jev(jpeg_b64, telemetry, base_scores),
    )
    flash_res, flash_src = flash_res_tuple
    jev_res, jev_src = jev_res_tuple
    sources = AnalysisSources(flash=flash_src, jev=jev_src)

    # Step 5: Veto and triage order
    # Rule A: Crisis detection from either branch takes top priority
    if flash_res.safety_flag == "CRISIS_SELF_HARM" or jev_res.filter_flag == "CRISIS_SELF_HARM":
        logger.info(
            "crisis_veto",
            extra={
                "event": "analyze_outcome",
                "safety_status": "CRISIS_SUPPORT",
                "sources": {"flash": flash_src, "jev": jev_src},
            },
        )
        del img, gray, jpeg, jpeg_b64
        return AnalyzeSketchResponse(
            safety_status="CRISIS_SUPPORT",
            retry_or_safety_message=CRISIS_MESSAGE,
            telemetry=telemetry,
            analysis_sources=sources,
        )

    # Fail closed, after the crisis rule: with a key configured, a failed Gemini call means nothing checked this image
    # (crisis, explicit, written instructions), so no reading. Without a key (local dev) the stroke fallback stands.
    if flash_src == "fallback" and os.getenv("GEMINI_API_KEY", "").strip():
        logger.info(
            "image_check_unavailable",
            extra={
                "event": "analyze_outcome",
                "safety_status": "RETRY_CAPTURE",
                "sources": {"flash": flash_src, "jev": jev_src},
            },
        )
        del img, gray, jpeg, jpeg_b64
        return AnalyzeSketchResponse(
            safety_status="RETRY_CAPTURE",
            retry_or_safety_message="We couldn't read your drawing just now. Please try again in a moment.",
            telemetry=telemetry,
            analysis_sources=sources,
        )

    # Rule B: hard stop for prompt injection, explicit content, non-drawings, and written messages.
    # Each signal blocks on its own, so a model that flags SAFE but says "not a drawing" is still stopped.
    if flash_res.safety_flag != "SAFE":
        blocked_flag = flash_res.safety_flag
    elif not flash_res.is_hand_drawing or jev_res.filter_flag == "NON_SKETCH_REJECTED":
        blocked_flag = "NON_SKETCH_REJECTED"
    elif flash_res.text_meaning == "MESSAGE":
        blocked_flag = "TEXT_MESSAGE_REJECTED"
    else:
        blocked_flag = None
    if blocked_flag:
        msg = get_blocked_message(blocked_flag)
        logger.info(
            "content_blocked",
            extra={
                "event": "analyze_outcome",
                "safety_status": "BLOCKED_CONTENT",
                "sources": {"flash": flash_src, "jev": jev_src},
            },
        )
        del img, gray, jpeg, jpeg_b64
        return AnalyzeSketchResponse(
            safety_status="BLOCKED_CONTENT",
            retry_or_safety_message=msg,
            telemetry=telemetry,
            analysis_sources=sources,
        )

    # Rule C: Real Jev with low confidence requests clean capture
    if jev_src == "jev" and (jev_res.confidence < 0.60 or jev_res.filter_flag == "LOW_CONFIDENCE"):
        logger.info(
            "low_confidence_retry",
            extra={
                "event": "analyze_outcome",
                "safety_status": "RETRY_CAPTURE",
                "sources": {"flash": flash_src, "jev": jev_src},
            },
        )
        del img, gray, jpeg, jpeg_b64
        return AnalyzeSketchResponse(
            safety_status="RETRY_CAPTURE",
            retry_or_safety_message="Your lines were a little hard to read—could you try another photo with the whole page in view?",
            telemetry=telemetry,
            analysis_sources=sources,
        )

    # Step 6: Merger, classification, trend analysis, and clinical scrub
    # Jev's fallback is only a reshaped stroke score, so blend only when the real Jev answered
    merged = merge_scores(jev_res.scores, flash_res.flash_scores) if jev_src == "jev" else flash_res.flash_scores
    prim = primary_class(merged)
    conf = confidence(jev_res, flash_res.flash_scores, jev_is_real=(jev_src == "jev"))
    raw_trend = trend_text(merged, req.user_baseline_scores, req.timer_duration_sec)

    clean_reflection = scrub_clinical(flash_res.visual_reflection_text)
    clean_progression = (
        scrub_clinical(flash_res.progression_reflection_text) if flash_res.progression_reflection_text else None
    )
    clean_bullets = [scrub_clinical(b) for b in flash_res.stroke_evidence_bullets]
    clean_trend = scrub_clinical(raw_trend)
    activities = ACTIVITIES.get(prim, [])

    # Step 7: Clear references from memory and return structured response
    del img, gray, jpeg, jpeg_b64

    logger.info(
        "analysis_complete",
        extra={
            "event": "analyze_outcome",
            "safety_status": "SAFE",
            "sources": {"flash": flash_src, "jev": jev_src},
        },
    )

    return AnalyzeSketchResponse(
        safety_status="SAFE",
        retry_or_safety_message=None,
        telemetry=telemetry,
        visual_reflection_text=clean_reflection,
        progression_reflection_text=clean_progression,
        stroke_evidence_bullets=clean_bullets,
        flash_scores=flash_res.flash_scores,
        jev_scores=jev_res.scores,
        merged_scores=merged,
        primary_emotion_class=prim,
        confidence=conf,
        trend_summary_text=clean_trend,
        recommended_activities=activities,
        analysis_sources=sources,
    )


@app.post("/api/v1/summarize-reading", response_model=SummarizeReadingResponse)
async def summarize_reading_endpoint(req: SummarizeReadingRequest, request: Request) -> SummarizeReadingResponse:
    """Background step after a reading: T_n (+ S_n-1) -> S_n, the user's progression notes.
    The client stores S_n with the session and sends it with the next analyze request."""
    await _enforce_rate_limit(request, bucket="summary:")
    summary = await summarize_reading(
        req.reading_text,
        req.progression_text,
        req.previous_summary,
        req.reading_date.isoformat(),
    )
    if summary is None:
        # Client keeps the previous notes; the next session still has S_n-1 to compare against
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Summary unavailable.")
    return SummarizeReadingResponse(summary=scrub_clinical(summary))


async def _vault_uid(request: Request) -> str:
    """The verified Firebase uid: values are sealed to it, so it must never come from the request body."""
    if not FIREBASE_PROJECT_ID or not vault.configured():
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Encryption is not configured.")
    auth = request.headers.get("authorization", "")
    uid = await asyncio.to_thread(_verify_uid, auth[7:].strip()) if auth.lower().startswith("bearer ") else None
    if not uid:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Sign in to load your history.")
    reason = ratelimit.check(f"vault:uid:{uid}", ratelimit.VAULT_PER_USER_HOUR, daily=False)
    if reason:
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=reason)
    return uid


@app.post("/api/v1/vault/seal", response_model=VaultSealResponse)
async def vault_seal(req: VaultRequest, request: Request) -> VaultSealResponse:
    """Encrypts values for the signed-in user before the browser saves them to Firestore."""
    uid = await _vault_uid(request)
    return VaultSealResponse(values=[vault.seal(uid, v) for v in req.values])


@app.post("/api/v1/vault/open", response_model=VaultOpenResponse)
async def vault_open(req: VaultRequest, request: Request) -> VaultOpenResponse:
    """Decrypts the signed-in user's values after the browser loads them from Firestore."""
    uid = await _vault_uid(request)
    opened: list[str | None] = []
    for v in req.values:
        try:
            opened.append(vault.open_(uid, v))
        except vault.VaultError:
            opened.append(None)
    if any(o is None for o in opened):
        logger.warning("vault_open_failed", extra={"event": "vault_open_failed"})
    return VaultOpenResponse(values=opened)
