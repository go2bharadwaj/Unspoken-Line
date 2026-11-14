import asyncio

from fastapi.testclient import TestClient

import ai
from main import app
from schemas import SUMMARY_MAX_CHARS, EmotionScores, FlashResult, Telemetry

TELEMETRY = Telemetry(mean_luminance=200, contrast_std=40, ink_density_ratio=0.1, timer_duration_sec=15)
SCORES = EmotionScores(stress=0.4, anxiety=0.3, mental_fatigue=0.2, calm_flow=0.6, radiant_joy=0.5)
S1 = "2026-11-01: dense, tight strokes held to the centre; the person seemed braced and tired."


class FakeGemini:
    """Stands in for genai.Client: records what was sent and returns a canned response."""

    calls: list[dict] = []

    def __init__(self, response):
        self._response = response

    def __call__(self, api_key):  # genai.Client(api_key=...)
        fake = self

        class _Models:
            async def generate_content(self, **kwargs):
                FakeGemini.calls.append(kwargs)
                return fake._response

        class _Aio:
            models = _Models()

        class _Client:
            aio = _Aio()

        return _Client()


class Resp:
    def __init__(self, parsed=None, text=None):
        self.parsed = parsed
        self.text = text


def _flash(progression):
    return FlashResult(
        visual_reflection_text="This drawing on its own.",
        progression_reflection_text=progression,
        stroke_evidence_bullets=["a", "b", "c"],
        flash_scores=SCORES,
        safety_flag="SAFE",
    )


def _sent_text(call) -> str:
    return " ".join(c for c in call["contents"] if isinstance(c, str))


def test_first_session_sends_no_notes_and_drops_any_progression(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "test")
    FakeGemini.calls = []
    monkeypatch.setattr(ai.genai, "Client", FakeGemini(Resp(parsed=_flash("invented comparison"))))

    result, src = asyncio.run(ai.run_flash(b"jpeg", TELEMETRY, (SCORES, []), previous_summary=None))

    assert src == "gemini"
    sent = _sent_text(FakeGemini.calls[0])
    assert sent.startswith(ai.USER_QUESTION)
    assert "PRIOR PROGRESSION NOTES" not in sent
    assert result.progression_reflection_text is None  # nothing earlier to compare against


def test_later_session_sends_notes_and_keeps_progression(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "test")
    FakeGemini.calls = []
    monkeypatch.setattr(ai.genai, "Client", FakeGemini(Resp(parsed=_flash("Since 2026-11-01 you've loosened."))))

    result, _ = asyncio.run(ai.run_flash(b"jpeg", TELEMETRY, (SCORES, []), previous_summary=S1))

    sent = _sent_text(FakeGemini.calls[0])
    assert sent.startswith(ai.USER_QUESTION)  # the question still leads; notes come after
    assert f"PRIOR PROGRESSION NOTES" in sent and f"<<<\n{S1}\n>>>" in sent
    assert result.visual_reflection_text == "This drawing on its own."
    assert result.progression_reflection_text == "Since 2026-11-01 you've loosened."


def test_summary_prompts_carry_dates_and_inputs():
    first = ai.build_summary_prompt("T1 text", None, None, "2026-11-01")
    assert "no earlier notes" in first and "2026-11-01" in first and "T1 text" in first

    later = ai.build_summary_prompt("T2 text", "T2 progression", S1, "2026-11-14")
    for part in (S1, "T2 text", "T2 progression", "2026-11-14"):
        assert part in later


def test_summarize_reading_uses_flash_model_and_trims(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "test")
    monkeypatch.delenv("GEMINI_SUMMARY_MODEL", raising=False)
    FakeGemini.calls = []
    long = ("2026-11-14: steadier strokes. " * 200).strip()
    monkeypatch.setattr(ai.genai, "Client", FakeGemini(Resp(text=long)))

    out = asyncio.run(ai.summarize_reading("T2", "P2", S1, "2026-11-14"))

    assert FakeGemini.calls[0]["model"] == "gemini-3.8-flash"
    assert len(out) <= SUMMARY_MAX_CHARS and out.endswith(".")


def test_summarize_endpoint_without_gemini_is_503_not_a_fake_summary(monkeypatch):
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    r = TestClient(app).post(
        "/api/v1/summarize-reading",
        json={"reading_text": "T1", "reading_date": "2026-11-14"},
    )
    assert r.status_code == 503


def test_boundaries_reject_bad_input():
    client = TestClient(app)
    assert client.post(
        "/api/v1/summarize-reading", json={"reading_text": "T1", "reading_date": "yesterday"}
    ).status_code == 422
    assert client.post(
        "/api/v1/analyze-sketch",
        json={
            "image_base64": "AAAA",
            "mime_type": "image/jpeg",
            "timer_duration_sec": 15,
            "previous_summary": "x" * (SUMMARY_MAX_CHARS + 1),
        },
    ).status_code == 422
