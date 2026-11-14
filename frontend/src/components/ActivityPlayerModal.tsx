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

interface ActivityComponentProps {
  sessionId: string;
  scores: EmotionScores;
  durationSec: number;
  onMark: (patch: { calm_anchor?: boolean; aura_hex?: string }) => void;
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
};

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

  // Duration timer: closes with a chime at the end of duration_sec
  useEffect(() => {
    const timer = setTimeout(() => {
      playChime({ fundamental: 196, gain: 0.35 });
      onClose();
    }, activity.duration_sec * 1000);

    return () => clearTimeout(timer);
  }, [activity.duration_sec, onClose]);

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

      {/* Main Activity Area */}
      <div className="flex-1 flex items-center justify-center p-4">
        {Component ? (
          <Component
            sessionId={sessionId}
            scores={scores}
            durationSec={activity.duration_sec}
            onMark={onMark}
          />
        ) : (
          <p className="text-warmUmber">Activity details unavailable.</p>
        )}
      </div>

      {/* Bottom spacer for balance */}
      <div className="w-full p-4 text-center">
        <p className="text-xs text-warmUmber/60">
          Takes {activity.duration_sec} seconds · Closes gently with a singing bowl
        </p>
      </div>
    </div>
  );
};
