from datetime import date
from typing import Literal
from pydantic import BaseModel, Field, field_validator

# Progression notes travel client -> server -> Gemini, so they are capped at every hop
# (request validation here, output trimming in ai.py, and firestore.rules).
SUMMARY_MAX_CHARS = 1500


class EmotionScores(BaseModel):
    stress: float = Field(ge=0.0, le=1.0, description="Visual line density, pressure, and tension.")
    anxiety: float = Field(ge=0.0, le=1.0, description="Angular agitation, sharp changes, and fragmented lines.")
    mental_fatigue: float = Field(ge=0.0, le=1.0, description="Faint, broken, or low-coverage strokes.")
    calm_flow: float = Field(ge=0.0, le=1.0, description="Continuous, balanced, rhythmic curves.")
    radiant_joy: float = Field(ge=0.0, le=1.0, description="Expansive loops, playful spirals, and open spread.")


class AnalyzeSketchRequest(BaseModel):
    image_base64: str = Field(..., max_length=12_000_000, description="Raw base64 image data without data: prefix.")
    mime_type: Literal["image/jpeg", "image/png", "image/webp"]
    timer_duration_sec: Literal[5, 10, 15, 30, 60]
    user_baseline_scores: EmotionScores | None = None
    previous_summary: str | None = Field(
        None,
        max_length=SUMMARY_MAX_CHARS,
        description="Latest progression notes for this user (S_n-1); omitted on a first session.",
    )
    age: int | None = Field(None, ge=13, le=120, description="The person's age in years, if they gave it.")


class Telemetry(BaseModel):
    mean_luminance: float = Field(..., description="Average grayscale brightness (0-255).")
    contrast_std: float = Field(..., description="Grayscale standard deviation.")
    ink_density_ratio: float = Field(..., description="Fraction of page pixels identified as ink.")
    timer_duration_sec: int = Field(..., description="Duration of drawing window in seconds.")


class Activity(BaseModel):
    id: str
    title: str
    subtitle: str
    duration_sec: int
    interaction_type: str


class AnalysisSources(BaseModel):
    flash: Literal["gemini", "fallback"]
    jev: Literal["jev", "fallback"]


SafetyStatus = Literal["SAFE", "RETRY_CAPTURE", "CRISIS_SUPPORT", "BLOCKED_CONTENT"]


class AnalyzeSketchResponse(BaseModel):
    safety_status: SafetyStatus
    retry_or_safety_message: str | None = None
    telemetry: Telemetry | None = None
    visual_reflection_text: str | None = None
    progression_reflection_text: str | None = None
    stroke_evidence_bullets: list[str] = Field(default_factory=list)
    flash_scores: EmotionScores | None = None
    jev_scores: EmotionScores | None = None
    merged_scores: EmotionScores | None = None
    primary_emotion_class: str | None = None
    confidence: float | None = None
    trend_summary_text: str | None = None
    recommended_activities: list[Activity] = Field(default_factory=list)
    analysis_sources: AnalysisSources | None = None


class FlashResult(BaseModel):
    # The image check comes first so the model decides it before writing the reading
    is_hand_drawing: bool = Field(
        ...,
        description="True only if the main subject is marks a person drew by hand on paper or a whiteboard.",
    )
    text_meaning: Literal["NONE", "INCIDENTAL", "MESSAGE"] = Field(
        ...,
        description="NONE: no words. INCIDENTAL: stray letters or words that form no message. MESSAGE: words that say, ask, or instruct something.",
    )
    safety_flag: Literal[
        "SAFE",
        "CRISIS_SELF_HARM",
        "ADVERSARIAL_INJECTION",
        "NON_SKETCH_REJECTED",
        "NSFW_BLOCKED",
    ]
    visual_reflection_text: str = Field(
        ...,
        description="Free-form answer to: What does this drawing say about my current mental state?",
    )
    progression_reflection_text: str | None = Field(
        None,
        description=(
            "Only when PRIOR PROGRESSION NOTES are given: how the person has changed, combining this "
            "drawing's reading with the notes. Null when there are no notes."
        ),
    )
    stroke_evidence_bullets: list[str]
    flash_scores: EmotionScores


class JevResult(BaseModel):
    scores: EmotionScores
    filter_flag: Literal["SAFE", "CRISIS_SELF_HARM", "NON_SKETCH_REJECTED", "LOW_CONFIDENCE"]
    confidence: float = Field(ge=0.0, le=1.0)


class SummarizeReadingRequest(BaseModel):
    reading_text: str = Field(..., min_length=1, max_length=20000, description="T_n: the reading of this drawing alone.")
    progression_text: str | None = Field(None, max_length=20000, description="T_n's progression part, if any.")
    previous_summary: str | None = Field(None, max_length=SUMMARY_MAX_CHARS, description="S_n-1, if any.")
    reading_date: date = Field(..., description="Date the reading was generated (YYYY-MM-DD).")


class SummarizeReadingResponse(BaseModel):
    summary: str


# Sized for one user's whole history in a single call (listSessions keeps the newest 60 sessions),
# or one saved photo (the client shrinks photos to PHOTO_MAX_BASE64 = 400k chars before sealing)
VAULT_MAX_VALUE_CHARS = 600_000
VAULT_MAX_TOTAL_CHARS = 1_500_000


class VaultRequest(BaseModel):
    values: list[str] = Field(..., max_length=500)

    @field_validator("values")
    @classmethod
    def _bounded(cls, values: list[str]) -> list[str]:
        if any(len(v) > VAULT_MAX_VALUE_CHARS for v in values) or sum(map(len, values)) > VAULT_MAX_TOTAL_CHARS:
            raise ValueError("values too long")
        return values


class VaultSealResponse(BaseModel):
    values: list[str]


class VaultOpenResponse(BaseModel):
    # None where a value couldn't be opened (tampered, or not this user's), so one bad value doesn't hide the rest
    values: list[str | None]


class HealthResponse(BaseModel):
    status: str = "ok"
    gemini_configured: bool
    jev_configured: bool
    encryption_configured: bool
