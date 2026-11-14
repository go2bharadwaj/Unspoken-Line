from typing import Literal
from pydantic import BaseModel, Field


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
    visual_reflection_text: str = Field(
        ...,
        description="Free-form answer to: What does this drawing say about my current mental state?",
    )
    stroke_evidence_bullets: list[str]
    flash_scores: EmotionScores
    safety_flag: Literal[
        "SAFE",
        "CRISIS_SELF_HARM",
        "ADVERSARIAL_INJECTION",
        "NON_SKETCH_REJECTED",
        "NSFW_BLOCKED",
    ]


class JevResult(BaseModel):
    scores: EmotionScores
    filter_flag: Literal["SAFE", "CRISIS_SELF_HARM", "NON_SKETCH_REJECTED", "LOW_CONFIDENCE"]
    confidence: float = Field(ge=0.0, le=1.0)


class HealthResponse(BaseModel):
    status: str = "ok"
    gemini_configured: bool
    jev_configured: bool
