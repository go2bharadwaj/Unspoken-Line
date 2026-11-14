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

import ratelimit
from ai import run_flash, run_jev
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
)

load_dotenv()


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
    title="Unspoken Line API",
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
    )


@app.post(
    "/api/v1/analyze-sketch",
    response_model=AnalyzeSketchResponse,
    status_code=status.HTTP_200_OK,
)
async def analyze_sketch(req: AnalyzeSketchRequest, request: Request) -> AnalyzeSketchResponse:
    """Performs RAM-only perceptual analysis of a timed physical sketch."""
    # Caddy sets X-Forwarded-For; rightmost entry is the one the proxy saw, so it can't be spoofed.
    ip = request.headers.get("x-forwarded-for", "").split(",")[-1].strip() or (
        request.client.host if request.client else "unknown"
    )
    reason = ratelimit.check(ip)
    if reason:
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=reason)

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
        run_flash(jpeg, telemetry, (base_scores, base_bullets)),
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

    # Rule B: Prompt injection, explicit content, or non-sketch rejections
    flash_blocked = flash_res.safety_flag in (
        "ADVERSARIAL_INJECTION",
        "NSFW_BLOCKED",
        "NON_SKETCH_REJECTED",
    )
    jev_blocked = jev_res.filter_flag == "NON_SKETCH_REJECTED"
    if flash_blocked or jev_blocked:
        blocked_flag = flash_res.safety_flag if flash_blocked else "NON_SKETCH_REJECTED"
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
    merged = merge_scores(jev_res.scores, flash_res.flash_scores)
    prim = primary_class(merged)
    conf = confidence(jev_res, flash_res.flash_scores, jev_is_real=(jev_src == "jev"))
    raw_trend = trend_text(merged, req.user_baseline_scores, req.timer_duration_sec)

    clean_reflection = scrub_clinical(flash_res.visual_reflection_text)
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
