import { Activity, PrimaryEmotionClass } from '../types';

export const ACTIVITIES: Activity[] = [
  // Stress
  {
    id: 'stress_pendulum',
    title: 'Somatic Pendulum Release',
    subtitle: 'Somatic arc release and rhythm pacing',
    duration_sec: 60,
    interaction_type: 'PENDULUM_PACER',
  },
  {
    id: 'stress_breath_478',
    title: '4-7-8 Amber Breath Orb',
    subtitle: 'Four-seven-eight cadenced breath regulation',
    duration_sec: 90,
    interaction_type: 'BREATH_ORB_478',
  },
  {
    id: 'stress_shoulder_drop',
    title: 'Pen-Down Shoulder Drop',
    subtitle: 'Physical reset for hands, wrists, and shoulders',
    duration_sec: 60,
    interaction_type: 'SOMATIC_GUIDE',
  },

  // Anxiety
  {
    id: 'anxiety_box_breath',
    title: 'Box Breathing Sanctuary',
    subtitle: 'Even four-second perimeter breathing',
    duration_sec: 60,
    interaction_type: 'BOX_BREATH',
  },
  {
    id: 'anxiety_grounding_54321',
    title: '5-4-3-2-1 Silent Visual Grounding',
    subtitle: 'Tactile sensory awareness progression',
    duration_sec: 90,
    interaction_type: 'GROUNDING_PEBBLES',
  },
  {
    id: 'anxiety_binaural',
    title: 'Binaural Warmth Reset',
    subtitle: 'Gentle 174 Hz / 180 Hz frequency harmonization',
    duration_sec: 90,
    interaction_type: 'BINAURAL_DRONE',
  },

  // Mental Fatigue
  {
    id: 'fatigue_micro_rest',
    title: 'Sunlit Micro-Rest',
    subtitle: 'Filtered acoustic warmth for resting eyes',
    duration_sec: 60,
    interaction_type: 'MICRO_REST',
  },
  {
    id: 'fatigue_horizon_gaze',
    title: 'Gentle Horizon Gaze',
    subtitle: 'Distance focal release and eye relaxation',
    duration_sec: 60,
    interaction_type: 'HORIZON_GAZE',
  },
  {
    id: 'fatigue_rising_pulse',
    title: 'Rising Warmth Pulse',
    subtitle: 'Upward kinetic energy restoration',
    duration_sec: 60,
    interaction_type: 'RISING_PULSE',
  },

  // Calm Flow
  {
    id: 'calm_anchor_lock',
    title: 'Flow-State Anchor Lock',
    subtitle: 'Anchor current regulation into your timeline',
    duration_sec: 45,
    interaction_type: 'ANCHOR_LOCK',
  },
  {
    id: 'calm_harmonic_pad',
    title: 'Harmonic Resonance Listen',
    subtitle: 'Pentatonic harmonic resonance exploration',
    duration_sec: 60,
    interaction_type: 'HARMONIC_PAD',
  },
  {
    id: 'calm_continuum',
    title: 'Mindful Continuum',
    subtitle: 'Unhurried continuous loop pacing',
    duration_sec: 60,
    interaction_type: 'INFINITY_TRACER',
  },

  // Radiant Joy
  {
    id: 'joy_golden_capsule',
    title: 'Golden Moment Capsule',
    subtitle: 'Preserve this feeling with an aura hue',
    duration_sec: 45,
    interaction_type: 'GOLDEN_CAPSULE',
  },
  {
    id: 'joy_ripple_share',
    title: 'Warmth Ripple Share',
    subtitle: 'Generate a generative watercolor keepsake',
    duration_sec: 60,
    interaction_type: 'WATERCOLOR_BLOOM',
  },
  {
    id: 'joy_breath_celebration',
    title: 'Expansive Breath Celebration',
    subtitle: 'Sunlit radial expansion cadence',
    duration_sec: 60,
    interaction_type: 'RADIAL_BLOOM',
  },
];

export const ACTIVITIES_BY_ID: Record<string, Activity> = Object.fromEntries(
  ACTIVITIES.map((act) => [act.id, act])
);

export const LEARN_MORE: Record<string, string> = {
  Stress:
    'Visual expressions of stress often manifest as high line density, heavy pen pressure, and tight cross-hatching across the page. The hand works through tension through repeated, concentrated marks that anchor down into the paper.',
  Anxiety:
    'Visual patterns of anxiety commonly feature jagged angles, fragmented directional bursts, and drawing constricted to margins or corners. Rapid reversals of direction and sharp vertices reflect a vigilant nervous system seeking boundaries.',
  'Mental Fatigue':
    'When mental energy is depleted, strokes become faint, interrupted, or exhibit low overall ink coverage. Lines frequently trail downward or fade before completion, mirroring the natural need for rest and quiet renewal.',
  'Calm Flow':
    'Calm flow reveals itself through smooth, continuous wave-like arcs, balanced spatial distribution across the paper, and an unhurried, rhythmic cadence. The hand glides freely with steady, unforced pressure.',
  'Radiant Joy':
    'Expansive loops, playful open spirals, and wide spatial coverage across the sheet characterize joyful expression. Marks rise upward with generous spacing, expressing lightness and exploratory movement.',
};

export function getActivitiesForClass(className: PrimaryEmotionClass): Activity[] {
  if (!className) return ACTIVITIES.slice(0, 3);
  switch (className) {
    case 'Stress':
      return ACTIVITIES.slice(0, 3);
    case 'Anxiety':
      return ACTIVITIES.slice(3, 6);
    case 'Mental Fatigue':
      return ACTIVITIES.slice(6, 9);
    case 'Calm Flow':
      return ACTIVITIES.slice(9, 12);
    case 'Radiant Joy':
      return ACTIVITIES.slice(12, 15);
    default:
      return ACTIVITIES.slice(0, 3);
  }
}
