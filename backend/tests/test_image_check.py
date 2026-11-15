"""Hard stops: only a hand drawing with no written message gets a reading."""
import pytest
from fastapi.testclient import TestClient

import ai
from main import app
from schemas import FlashResult
from tests.test_gate import create_base64_image, create_scribble_image
from tests.test_progression import SCORES, FakeGemini, Resp


def _post():
    b64 = create_base64_image(create_scribble_image(120, 120), format="JPEG")
    return TestClient(app).post(
        "/api/v1/analyze-sketch",
        json={"image_base64": b64, "mime_type": "image/jpeg", "timer_duration_sec": 15},
    ).json()


def _gemini_says(monkeypatch, **check):
    monkeypatch.setenv("GEMINI_API_KEY", "test")
    monkeypatch.delenv("JEV_API_KEY", raising=False)
    fields = dict(is_hand_drawing=True, text_meaning="NONE", safety_flag="SAFE") | check
    flash = FlashResult(
        visual_reflection_text="A reading that must not be shown.",
        stroke_evidence_bullets=[],
        flash_scores=SCORES,
        **fields,
    )
    monkeypatch.setattr(ai.genai, "Client", FakeGemini(Resp(parsed=flash)))


@pytest.mark.parametrize(
    "check, message_part",
    [
        ({"is_hand_drawing": False}, "something other than a sketch"),  # flagged SAFE but not a drawing
        ({"text_meaning": "MESSAGE"}, "doesn't follow or reply to written words"),
        ({"safety_flag": "ADVERSARIAL_INJECTION"}, "only your paper"),
        ({"safety_flag": "NSFW_BLOCKED"}, "cannot be processed"),
    ],
)
def test_non_drawings_and_messages_are_blocked_without_a_reading(monkeypatch, check, message_part):
    _gemini_says(monkeypatch, **check)
    data = _post()
    assert data["safety_status"] == "BLOCKED_CONTENT"
    assert message_part in data["retry_or_safety_message"]
    assert data["visual_reflection_text"] is None and data["merged_scores"] is None


def test_a_stray_word_in_a_drawing_is_fine(monkeypatch):
    _gemini_says(monkeypatch, text_meaning="INCIDENTAL")
    data = _post()
    assert data["safety_status"] == "SAFE"
    assert data["analysis_sources"]["flash"] == "gemini"


def test_crisis_writing_still_gets_crisis_support(monkeypatch):
    _gemini_says(monkeypatch, safety_flag="CRISIS_SELF_HARM", text_meaning="MESSAGE")
    assert _post()["safety_status"] == "CRISIS_SUPPORT"


def test_gemini_failure_fails_closed_when_configured(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "test")
    monkeypatch.delenv("JEV_API_KEY", raising=False)

    def broken(api_key):
        raise RuntimeError("model not found")

    monkeypatch.setattr(ai.genai, "Client", broken)
    data = _post()
    assert data["safety_status"] == "RETRY_CAPTURE"
    assert data["visual_reflection_text"] is None


def test_summary_of_a_non_reading_is_skipped(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "test")
    monkeypatch.setattr(ai.genai, "Client", FakeGemini(Resp(text="NO_NOTES")))
    r = TestClient(app).post(
        "/api/v1/summarize-reading",
        json={"reading_text": "This doesn't look like a drawing.", "reading_date": "2026-11-14"},
    )
    assert r.status_code == 503  # client keeps the earlier notes
