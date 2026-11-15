import React, { useEffect, useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Activity, EmotionScores, InteractionType } from '../types';
import { playChime } from '../lib/sound';

import { PendulumPacer } from './activities/PendulumPacer';
import { BreathOrb478 } from './activities/BreathOrb478';
import { SomaticGuide } from './activities/SomaticGuide';
import { BoxBreath } from './activities/BoxBreath';
import { GroundingPebbles } from './activities/GroundingPebbles';
import { BinauralDrone } from './activities/BinauralDrone';
import { MicroRest } from './activities/MicroRest';
import { HorizonGaze } from './activities/HorizonGaze';
import { RisingPulse } from './activities/RisingPulse';
import { AnchorLock } from './activities/AnchorLock';
import { HarmonicPad } from './activities/HarmonicPad';
import { InfinityTracer } from './activities/InfinityTracer';
import { GoldenCapsule } from './activities/GoldenCapsule';
import { WatercolorBloom } from './activities/WatercolorBloom';
import { RadialBloom } from './activities/RadialBloom';
import { PackActivity } from './activities/PackActivity';
import { formatDuration } from '../lib/activities';
import { PACK_COMPONENTS } from './activities/pack';

interface ActivityComponentProps {
  sessionId: string;
  scores: EmotionScores;
  durationSec: number;
  onMark: (patch: { calm_anchor?: boolean; aura_hex?: string }) => void;
  activity: Activity;
  onClose: () => void;
}

const ACTIVITY_COMPONENTS: Record<
  InteractionType,
  React.ComponentType<ActivityComponentProps>
> = {
  PENDULUM_PACER: PendulumPacer,
  BREATH_ORB_478: BreathOrb478,
  SOMATIC_GUIDE: SomaticGuide,
  BOX_BREATH: BoxBreath,
  GROUNDING_PEBBLES: GroundingPebbles,
  BINAURAL_DRONE: BinauralDrone,
  MICRO_REST: MicroRest,
  HORIZON_GAZE: HorizonGaze,
  RISING_PULSE: RisingPulse,
  ANCHOR_LOCK: AnchorLock,
  HARMONIC_PAD: HarmonicPad,
  INFINITY_TRACER: InfinityTracer,
  GOLDEN_CAPSULE: GoldenCapsule,
  WATERCOLOR_BLOOM: WatercolorBloom,
  RADIAL_BLOOM: RadialBloom,
  BREATH_PACER: PackActivity,
  GUIDED_STEPS: PackActivity,
  TEXT_PROMPT: PackActivity,
  CHECKLIST: PackActivity,
  DRAWING_CANVAS: PackActivity,
  AUDIO_PLAYER: PackActivity,
  TIMER: PackActivity,
  OFFSCREEN_CARD: PackActivity,
};

// Writing, drawing and offscreen practices end when the person says so, never on a timer.
const KEEP_OPEN = new Set<InteractionType>(['TEXT_PROMPT', 'CHECKLIST', 'OFFSCREEN_CARD', 'DRAWING_CANVAS']);

interface Props {
  activity: Activity;
  sessionId: string;
  scores: EmotionScores;
  onClose: () => void;
  onMark: (patch: { calm_anchor?: boolean; aura_hex?: string }) => void;
}

export const ActivityPlayerModal: React.FC<Props> = ({
  activity,
  sessionId,
  scores,
  onClose,
  onMark,
}) => {
  const shouldReduceMotion = useReducedMotion();
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);

  // Loose focus trap: focus first control on mount, Esc closes
  useEffect(() => {
    closeBtnRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const keepOpen = KEEP_OPEN.has(activity.interaction_type);

  // Duration timer: closes with a chime at the end of duration_sec
  useEffect(() => {
    if (keepOpen) return;
    const timer = setTimeout(() => {
      playChime({ fundamental: 196, gain: 0.35 });
      onClose();
    }, activity.duration_sec * 1000);

    return () => clearTimeout(timer);
  }, [activity.duration_sec, keepOpen, onClose]);

  const Custom = activity.pack_id ? PACK_COMPONENTS[activity.pack_id] : undefined;
  const Component = ACTIVITY_COMPONENTS[activity.interaction_type];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={activity.title}
      className="fixed inset-0 z-50 bg-canvasPaper flex flex-col justify-between overflow-y-auto"
    >
      {/* Header bar */}
      <div className="w-full max-w-2xl mx-auto px-6 pt-6 pb-2 flex items-center justify-between">
        <div className="text-left">
          <span className="text-xs tracking-widest uppercase text-warmUmber">
            Mindful Practice
          </span>
          <h2 className="text-xl sm:text-2xl font-serif font-medium text-espressoInk tracking-tight">
            {activity.title}
          </h2>
        </div>

        <button
          ref={closeBtnRef}
          type="button"
          onClick={onClose}
          aria-label="Close activity"
          className="px-4 py-1.5 rounded-full border border-borderHairline text-warmUmber hover:text-espressoInk hover:bg-turmericMist/40 transition-colors text-sm cursor-pointer"
        >
          Close
        </button>
      </div>

      {!keepOpen && (
        <>
      {/* Gentle progress line across the sheet (no ticking digits) */}
          <div className="w-full bg-borderHairline/40 h-0.5 relative overflow-hidden">
            <motion.div
              className="h-full bg-peachTerracotta"
              initial={{ width: '0%' }}
              animate={{ width: '100%' }}
              transition={{
                duration: shouldReduceMotion ? 0 : activity.duration_sec,
                ease: 'linear',
              }}
            />
          </div>
        </>
      )}

      {/* Main Activity Area */}
      <div className="flex-1 flex items-center justify-center p-4">
        {Custom ? (
          <Custom activity={activity} durationSec={activity.duration_sec} onClose={onClose} />
        ) : Component ? (
          <Component
            sessionId={sessionId}
            scores={scores}
            durationSec={activity.duration_sec}
            onMark={onMark}
            activity={activity}
            onClose={onClose}
          />
        ) : (
          <p className="text-warmUmber">Activity details unavailable.</p>
        )}
      </div>

      {/* Bottom spacer for balance */}
      <div className="w-full p-4 text-center">
        <p className="text-xs text-warmUmber/60">
          {keepOpen
            ? 'Take all the time you need'
            : `Takes ${formatDuration(activity.duration_sec)} · Closes gently with a singing bowl`}
        </p>
      </div>
    </div>
  );
};
