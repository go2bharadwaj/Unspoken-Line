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
  | 'RADIAL_BLOOM'
  // Evidence-pack types, all rendered by PackActivity
  | 'BREATH_PACER'
  | 'GUIDED_STEPS'
  | 'TEXT_PROMPT'
  | 'CHECKLIST'
  | 'DRAWING_CANVAS'
  | 'AUDIO_PLAYER'
  | 'TIMER'
  | 'OFFSCREEN_CARD';

export type TimerDurationSec = 5 | 10 | 15 | 30 | 60;

export interface Activity {
  id: string;
  title: string;
  subtitle?: string;
  duration_sec: number;
  interaction_type: InteractionType;
  /** Evidence-pack activities only. */
  pack_id?: string;
  steps?: string[];
  pacer?: { inhale_s: number; second_inhale_s?: number; hold_s: number; exhale_s: number };
  grade?: 'A' | 'B' | 'C';
  citation?: string;
  /** True when duration_sec is a short taste of a longer tested practice. */
  taster?: boolean;
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
  /** Latest progression notes (S_n-1); omitted on a first session. */
  previous_summary?: string | null;
  /** The person's age, sent with every reading (13-120); omitted for admins and when unknown. */
  age?: number | null;
}

export interface SummarizeReadingRequest {
  reading_text: string;
  progression_text?: string | null;
  previous_summary?: string | null;
  reading_date: string; // YYYY-MM-DD
}

export interface AnalyzeSketchResponse {
  safety_status: SafetyStatus;
  retry_or_safety_message: string | null;
  telemetry: Telemetry | null;
  visual_reflection_text: string | null;
  progression_reflection_text: string | null;
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
  /** Progression notes written after this session (S_n), sent with the next one. */
  summary?: string;
  /** How accurate the person found the reading, 1-10 with no 7 (RATING_CHOICES). */
  rating?: number;
  /** The reading as shown, so it can be reopened from history. Absent on sessions saved before history existed. */
  reading_text?: string;
  progression_text?: string;
  trend_text?: string;
  evidence?: string[];
  primary_class?: Exclude<PrimaryEmotionClass, null>;
  source?: 'gemini' | 'fallback';
}

/** Everything about a reading worth keeping besides its scores (photos are never stored). */
export type SavedReading = Pick<
  StoredSession,
  'reading_text' | 'progression_text' | 'trend_text' | 'evidence' | 'primary_class' | 'source'
>;

/** Accuracy scale for a reading. No 7: it is the easy non-answer, so people pick a side. */
export const RATING_CHOICES: readonly number[] = [1, 2, 3, 4, 5, 6, 8, 9, 10];
