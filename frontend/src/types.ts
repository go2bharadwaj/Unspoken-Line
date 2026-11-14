export type EmotionKey =
  | 'stress'
  | 'anxiety'
  | 'mental_fatigue'
  | 'calm_flow'
  | 'radiant_joy';

export interface EmotionScores {
  stress: number;
  anxiety: number;
  mental_fatigue: number;
  calm_flow: number;
  radiant_joy: number;
}

export type SafetyStatus =
  | 'SAFE'
  | 'RETRY_CAPTURE'
  | 'CRISIS_SUPPORT'
  | 'BLOCKED_CONTENT';

export type PrimaryEmotionClass =
  | 'Stress'
  | 'Anxiety'
  | 'Mental Fatigue'
  | 'Calm Flow'
  | 'Radiant Joy'
  | null;

export type InteractionType =
  | 'PENDULUM_PACER'
  | 'BREATH_ORB_478'
  | 'SOMATIC_GUIDE'
  | 'BOX_BREATH'
  | 'GROUNDING_PEBBLES'
  | 'BINAURAL_DRONE'
  | 'MICRO_REST'
  | 'HORIZON_GAZE'
  | 'RISING_PULSE'
  | 'ANCHOR_LOCK'
  | 'HARMONIC_PAD'
  | 'INFINITY_TRACER'
  | 'GOLDEN_CAPSULE'
  | 'WATERCOLOR_BLOOM'
  | 'RADIAL_BLOOM';

export type TimerDurationSec = 5 | 10 | 30 | 60;

export interface Activity {
  id: string;
  title: string;
  subtitle?: string;
  duration_sec: number;
  interaction_type: InteractionType;
}

export interface Telemetry {
  mean_luminance: number;
  contrast_std: number;
  ink_density_ratio: number;
  timer_duration_sec: number;
}

export interface AnalysisSources {
  flash: 'gemini' | 'fallback' | string;
  jev: 'jev' | 'fallback' | string;
}

export interface AnalyzeSketchRequest {
  image_base64: string;
  mime_type: 'image/jpeg' | 'image/png' | 'image/webp';
  timer_duration_sec: TimerDurationSec;
  user_baseline_scores?: EmotionScores | null;
}

export interface AnalyzeSketchResponse {
  safety_status: SafetyStatus;
  retry_or_safety_message: string | null;
  telemetry: Telemetry | null;
  visual_reflection_text: string | null;
  stroke_evidence_bullets: string[];
  flash_scores: EmotionScores | null;
  jev_scores: EmotionScores | null;
  merged_scores: EmotionScores | null;
  primary_emotion_class: PrimaryEmotionClass;
  confidence: number | null;
  trend_summary_text: string | null;
  recommended_activities: Activity[];
  analysis_sources: AnalysisSources | null;
}

export interface StoredSession {
  id: string;
  created_at: number; // millisecond timestamp
  timer_duration_sec: TimerDurationSec;
  scores: EmotionScores;
  calm_anchor?: boolean;
  aura_hex?: string;
}
