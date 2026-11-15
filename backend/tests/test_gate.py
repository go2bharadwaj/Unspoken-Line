import base64
import io
import re

import numpy as np
import pytest
from fastapi.testclient import TestClient
from PIL import Image, ImageDraw

from gate import (
    ACTIVITIES,
    GateRejection,
    check_quality,
    clean_jpeg_bytes,
    compute_telemetry,
    confidence,
    decode_image,
    merge_scores,
    primary_class,
    scrub_clinical,
    stroke_scores,
    trend_text,
)
from main import app
from schemas import EmotionScores, JevResult, Telemetry


def create_base64_image(img: Image.Image, format: str = "PNG") -> str:
    buf = io.BytesIO()
    img.save(buf, format=format)
    return base64.b64encode(buf.getvalue()).decode("ascii")


def create_scribble_image(width: int = 200, height: int = 200) -> Image.Image:
    img = Image.new("RGB", (width, height), color=(250, 246, 238))
    draw = ImageDraw.Draw(img)
    # Draw several deliberate dark ink strokes
    draw.line([(20, 20), (180, 180)], fill=(44, 34, 30), width=4)
    draw.line([(20, 180), (180, 20)], fill=(44, 34, 30), width=4)
    draw.arc([(40, 40), (160, 160)], start=0, end=180, fill=(44, 34, 30), width=3)
    draw.line([(50, 100), (150, 100)], fill=(44, 34, 30), width=3)
    return img


def test_quality_dark_image():
    """Dark image with mean luminance < 15 triggers the gentle dark retry message."""
    dark_img = Image.new("RGB", (100, 100), color=(5, 5, 5))
    telemetry, _ = compute_telemetry(dark_img, timer_duration_sec=30)
    msg = check_quality(telemetry)
    assert msg == "The lighting is a bit dim—could you snap your paper in slightly brighter light?"


def test_quality_glare_image():
    """White image with mean > 250 and std < 5 triggers the glare retry message."""
    glare_img = Image.new("RGB", (100, 100), color=(255, 255, 255))
    telemetry, _ = compute_telemetry(glare_img, timer_duration_sec=30)
    msg = check_quality(telemetry)
    assert msg == "There's a lot of glare on the page—could you tilt it slightly away from the light?"


def test_quality_blank_page_with_two_dots():
    """White page with only 2 tiny dots has ink density < 0.003 and triggers the blank retry message."""
    img = Image.new("RGB", (100, 100), color=(240, 240, 240))
    # Place 2 dark pixels out of 10,000 pixels (density = 0.0002)
    img.putpixel((50, 50), (10, 10, 10))
    img.putpixel((51, 51), (10, 10, 10))
    telemetry, _ = compute_telemetry(img, timer_duration_sec=30)
    assert telemetry.ink_density_ratio < 0.003
    msg = check_quality(telemetry)
    assert msg == "We couldn't find your lines yet—could you move a little closer to your sketch?"


def test_quality_scribbled_image_passes():
    """Scribbled synthetic image passes quality checks with density > 0.003 and returns None."""
    img = create_scribble_image(200, 200)
    telemetry, _ = compute_telemetry(img, timer_duration_sec=30)
    assert telemetry.ink_density_ratio > 0.003
    msg = check_quality(telemetry)
    assert msg is None


def test_light_lines_on_a_dark_surface_count_as_ink():
    """White strokes on a dark tablet or chalkboard are a drawing, not a blank page."""
    img = Image.new("RGB", (200, 200), color=(40, 42, 48))
    draw = ImageDraw.Draw(img)
    draw.line([(20, 100), (100, 40), (180, 160)], fill=(235, 235, 225), width=2)
    telemetry, _ = compute_telemetry(img, timer_duration_sec=30)
    assert telemetry.ink_density_ratio > 0.003
    assert check_quality(telemetry) is None


def test_decode_invalid_base64_and_random_bytes():
    """Invalid base64 and random bytes raise GateRejection."""
    with pytest.raises(GateRejection) as exc_info1:
        decode_image("!!!this-is-not-valid-base64!!!")
    assert "We couldn't read that photo" in exc_info1.value.message

    random_b64 = base64.b64encode(b"random-non-image-binary-garbage-bytes").decode("ascii")
    with pytest.raises(GateRejection) as exc_info2:
        decode_image(random_b64)
    assert "We couldn't read that photo" in exc_info2.value.message


def test_decode_image_too_small():
    """Images smaller than 32x32 raise GateRejection."""
    small_img = Image.new("RGB", (10, 10), color=(200, 200, 200))
    b64 = create_base64_image(small_img)
    with pytest.raises(GateRejection) as exc_info:
        decode_image(b64)
    assert "We couldn't read that photo" in exc_info.value.message


def test_scrubber_clinical_and_word_boundaries():
    """Clinical words are rewritten while non-clinical word boundaries remain intact."""
    text = "Signs of Depression and a disorder were noted in the report."
    scrubbed = scrub_clinical(text)
    assert "Depression" not in scrubbed
    assert "disorder" not in scrubbed
    assert "elevated visual tension" in scrubbed

    # Non-word boundaries like 'pressure' or 'ocdtopus' must remain untouched
    intact_text = "Testing visual pressure and ocdtopus line styling."
    assert scrub_clinical(intact_text) == intact_text


def test_merge_scores_exact_math():
    """Verify exact formula: round(0.55 * jev + 0.45 * flash, 2)."""
    jev = EmotionScores(
        stress=0.80,
        anxiety=0.60,
        mental_fatigue=0.20,
        calm_flow=0.10,
        radiant_joy=0.40,
    )
    flash = EmotionScores(
        stress=0.40,
        anxiety=0.50,
        mental_fatigue=0.30,
        calm_flow=0.20,
        radiant_joy=0.70,
    )
    merged = merge_scores(jev, flash)

    # 0.55 * 0.80 + 0.45 * 0.40 = 0.44 + 0.18 = 0.62
    assert merged.stress == 0.62
    # 0.55 * 0.60 + 0.45 * 0.50 = 0.33 + 0.225 = 0.555 -> 0.55 or 0.56 (round to 2)
    assert merged.anxiety == round(0.55 * 0.60 + 0.45 * 0.50, 2)
    assert merged.mental_fatigue == round(0.55 * 0.20 + 0.45 * 0.30, 2)
    assert merged.calm_flow == round(0.55 * 0.10 + 0.45 * 0.20, 2)
    assert merged.radiant_joy == round(0.55 * 0.40 + 0.45 * 0.70, 2)


def test_primary_class_tie_break():
    """Ties are broken strictly according to SPEC §3 order."""
    # When all are tied at 0.5, first in SPEC §3 order ('Stress') wins
    tied_scores = EmotionScores(
        stress=0.50,
        anxiety=0.50,
        mental_fatigue=0.50,
        calm_flow=0.50,
        radiant_joy=0.50,
    )
    assert primary_class(tied_scores) == "Stress"

    # Tied between Anxiety and Mental Fatigue (higher than others): Anxiety wins
    anxiety_fatigue_tie = EmotionScores(
        stress=0.20,
        anxiety=0.70,
        mental_fatigue=0.70,
        calm_flow=0.10,
        radiant_joy=0.10,
    )
    assert primary_class(anxiety_fatigue_tie) == "Anxiety"


def test_trend_text_none_baseline():
    """When baseline is None, returns the standard quiet baseline phrase."""
    scores = EmotionScores(
        stress=0.60,
        anxiety=0.30,
        mental_fatigue=0.20,
        calm_flow=0.40,
        radiant_joy=0.10,
    )
    text = trend_text(scores, None, timer=30)
    assert text == "This is your first reflection—it quietly becomes your baseline."


def test_trend_text_with_baseline():
    """Returns formatted change compared to previous baseline."""
    scores = EmotionScores(
        stress=0.70,
        anxiety=0.30,
        mental_fatigue=0.20,
        calm_flow=0.40,
        radiant_joy=0.10,
    )
    baseline = EmotionScores(
        stress=0.50,
        anxiety=0.30,
        mental_fatigue=0.20,
        calm_flow=0.40,
        radiant_joy=0.10,
    )
    # Stress rose from 0.50 to 0.70 (+40%)
    text = trend_text(scores, baseline, timer=30)
    assert "Stress" in primary_class(scores)
    assert "30-second sketch" in text
    assert "+40%" in text or "rise" in text


def test_activities_catalog_structure():
    """ACTIVITIES catalog: 5 classes, the original 3 first, then the evidence pack; all IDs unique."""
    expected_classes = {"Stress", "Anxiety", "Mental Fatigue", "Calm Flow", "Radiant Joy"}
    assert set(ACTIVITIES.keys()) == expected_classes

    all_ids = []
    for cls_name, acts in ACTIVITIES.items():
        assert len(acts) >= 3, f"Expected at least the 3 original activities for {cls_name}"
        for act in acts:
            assert act.id
            assert act.title
            assert act.subtitle
            assert act.duration_sec > 0
            assert act.interaction_type
            all_ids.append(act.id)

    assert len(set(all_ids)) == len(all_ids), "Activity IDs must all be globally unique"


def test_analyze_endpoint_fallback_without_api_keys(monkeypatch):
    """POST /api/v1/analyze-sketch with no API keys returns SAFE, 5 merged keys, and fallback sources."""
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    monkeypatch.delenv("JEV_API_KEY", raising=False)
    monkeypatch.delenv("JEV_API_URL", raising=False)

    img = create_scribble_image(120, 120)
    b64 = create_base64_image(img, format="JPEG")

    client = TestClient(app)
    response = client.post(
        "/api/v1/analyze-sketch",
        json={
            "image_base64": b64,
            "mime_type": "image/jpeg",
            "timer_duration_sec": 30,
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["safety_status"] == "SAFE"
    assert data["retry_or_safety_message"] is None
    assert data["analysis_sources"] == {"flash": "fallback", "jev": "fallback"}

    # 5 merged score keys
    merged = data["merged_scores"]
    assert set(merged.keys()) == {"stress", "anxiety", "mental_fatigue", "calm_flow", "radiant_joy"}
    for v in merged.values():
        assert 0.0 <= v <= 1.0
    # Jev off: shown scores are Gemini's (here its fallback), not blended with the Jev placeholder
    assert merged == data["flash_scores"]

    # 3 activities recommended
    assert len(data["recommended_activities"]) == len(ACTIVITIES[data["primary_emotion_class"]])
    assert len(data["recommended_activities"]) > 3
    assert data["primary_emotion_class"] in {"Stress", "Anxiety", "Mental Fatigue", "Calm Flow", "Radiant Joy"}
    assert data["visual_reflection_text"] is not None
    assert len(data["stroke_evidence_bullets"]) == 3


def test_analyze_endpoint_dark_image_retry():
    """POST /api/v1/analyze-sketch with dark image returns RETRY_CAPTURE and null scores."""
    dark_img = Image.new("RGB", (80, 80), color=(5, 5, 5))
    b64 = create_base64_image(dark_img, format="PNG")

    client = TestClient(app)
    response = client.post(
        "/api/v1/analyze-sketch",
        json={
            "image_base64": b64,
            "mime_type": "image/png",
            "timer_duration_sec": 10,
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["safety_status"] == "RETRY_CAPTURE"
    assert "dim" in data["retry_or_safety_message"].lower()
    assert data["merged_scores"] is None
    assert data["flash_scores"] is None
    assert data["jev_scores"] is None
    assert data["primary_emotion_class"] is None
    assert data["visual_reflection_text"] is None


def test_exif_stripped_by_clean_jpeg_bytes():
    """Build a JPEG with mock EXIF data and assert clean_jpeg_bytes strips it completely."""
    img = Image.new("RGB", (100, 100), color=(220, 220, 220))
    exif = img.getexif()
    # 0x010E is ImageDescription in EXIF
    exif[0x010E] = "Sensitive Location Metadata"
    buf = io.BytesIO()
    img.save(buf, format="JPEG", exif=exif)

    # Verify our source image has EXIF data
    source_img = Image.open(io.BytesIO(buf.getvalue()))
    assert len(source_img.getexif()) > 0

    # Clean the image and assert EXIF is completely gone
    cleaned_bytes = clean_jpeg_bytes(source_img)
    cleaned_img = Image.open(io.BytesIO(cleaned_bytes))
    assert len(cleaned_img.getexif()) == 0


@pytest.mark.parametrize(
    "payload",
    [
        {"scores": {"stress": 0.5}, "filter": "SAFE", "confidence": 0.9},  # missing keys
        {"scores": {k: 0.5 for k in ("stress", "anxiety", "mental_fatigue", "calm_flow", "radiant_joy")}, "filter": "WHATEVER", "confidence": 0.9},
        {"scores": {k: 0.5 for k in ("stress", "anxiety", "mental_fatigue", "calm_flow", "radiant_joy")}, "filter": "SAFE", "confidence": 7},
    ],
)
def test_jev_malformed_response_falls_back(monkeypatch, payload):
    import asyncio

    import httpx

    from ai import run_jev
    from schemas import EmotionScores, Telemetry

    monkeypatch.setenv("JEV_API_KEY", "k")
    monkeypatch.setenv("JEV_API_URL", "https://jev.invalid/score")

    async def fake_post(self, url, **kwargs):
        return httpx.Response(200, json=payload, request=httpx.Request("POST", url))

    monkeypatch.setattr(httpx.AsyncClient, "post", fake_post)
    base = EmotionScores(stress=0.4, anxiety=0.3, mental_fatigue=0.2, calm_flow=0.6, radiant_joy=0.5)
    tel = Telemetry(mean_luminance=200, contrast_std=40, ink_density_ratio=0.1, timer_duration_sec=30)
    result, source = asyncio.run(run_jev("aGk=", tel, base))
    assert source == "fallback"
    assert result.filter_flag == "SAFE"
