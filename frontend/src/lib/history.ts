import {
  AnalyzeSketchResponse,
  EmotionScores,
  PrimaryEmotionClass,
  StoredSession,
} from "../types";
import { getActivitiesForClass } from "./activities";

// Same order as the backend's ORDERED_CLASSES, so ties resolve the same way
const CLASS_ORDER: Array<
  [keyof EmotionScores, Exclude<PrimaryEmotionClass, null>]
> = [
  ["stress", "Stress"],
  ["anxiety", "Anxiety"],
  ["mental_fatigue", "Mental Fatigue"],
  ["calm_flow", "Calm Flow"],
  ["radiant_joy", "Radiant Joy"],
];

/** Highest score wins; earlier class wins ties (matches backend primary_class). */
export function topClass(
  scores: EmotionScores,
): Exclude<PrimaryEmotionClass, null> {
  let [bestKey, bestName] = CLASS_ORDER[0];
  for (const [key, name] of CLASS_ORDER.slice(1)) {
    if (scores[key] > scores[bestKey]) [bestKey, bestName] = [key, name];
  }
  return bestName;
}

/** Rebuild what the results page needs from a stored session, so a past reading renders exactly like a fresh one. */
export function sessionToResult(s: StoredSession): AnalyzeSketchResponse {
  const primary = s.primary_class ?? topClass(s.scores);
  return {
    safety_status: "SAFE",
    retry_or_safety_message: null,
    telemetry: null,
    visual_reflection_text: s.reading_text ?? null,
    progression_reflection_text: s.progression_text ?? null,
    stroke_evidence_bullets: s.evidence ?? [],
    // Stored scores are the shown scores, which are Gemini's while Jev is off
    flash_scores: s.scores,
    jev_scores: null,
    merged_scores: s.scores,
    primary_emotion_class: primary,
    confidence: null,
    trend_summary_text: s.trend_text ?? null,
    recommended_activities: getActivitiesForClass(primary),
    analysis_sources: s.source ? { flash: s.source, jev: "fallback" } : null,
  };
}

/** Newest first, grouped under "Today", "Yesterday", or a date. */
export function groupByDay(
  sessions: StoredSession[],
  now = new Date(),
): Array<{ label: string; items: StoredSession[] }> {
  const dayKey = (d: Date) => d.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  const groups: Array<{ label: string; items: StoredSession[] }> = [];
  for (const s of [...sessions].sort((a, b) => b.created_at - a.created_at)) {
    const d = new Date(s.created_at);
    const label =
      dayKey(d) === dayKey(now)
        ? "Today"
        : dayKey(d) === dayKey(yesterday)
          ? "Yesterday"
          : d.toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              year:
                d.getFullYear() === now.getFullYear() ? undefined : "numeric",
            });
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(s);
    else groups.push({ label, items: [s] });
  }
  return groups;
}
