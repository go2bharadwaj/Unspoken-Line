import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { C, Frame, PackProps, Shell, useEndBowl, useStepIndex } from './kit';
import { playChime } from '../../../lib/sound';

// Family: FRAME. Motif: one small cool dot alone -> a ring of dots joins it -> amber glow + cupped arc.
const RING = Array.from({ length: 8 }, (_, i) => {
  const a = (i / 8) * Math.PI * 2;
  return { x: 200 + Math.cos(a) * 62, y: 100 + Math.sin(a) * 62 };
});

export const SelfCompassionExercise: React.FC<PackProps> = ({ activity, durationSec, onClose }) => {
  const steps = activity.steps ?? [];
  const step = useStepIndex(steps.length, durationSec);
  useEndBowl(durationSec);
  useEffect(() => {
    if (step === 2) playChime({ fundamental: 220, gain: 0.15 });
  }, [step]);

  return (
    <Shell
      activity={activity}
      step={step}
      onClose={onClose}
      art={
        <Frame>
          <svg viewBox="0 0 400 220" className="absolute inset-0 w-full h-full" aria-hidden="true">
            <defs>
              <radialGradient id="sc-glow">
                <stop offset="0%" stopColor={C.amber} stopOpacity="0.8" />
                <stop offset="60%" stopColor={C.peach} stopOpacity="0.3" />
                <stop offset="100%" stopColor={C.paper} stopOpacity="0" />
              </radialGradient>
            </defs>
            <motion.circle
              cx="200" cy="100" r="80" fill="url(#sc-glow)"
              animate={{ opacity: step >= 2 ? [0.7, 1, 0.7] : 0 }}
              transition={{ duration: step >= 2 ? 5 : 1.5, repeat: step >= 2 ? Infinity : 0, ease: 'easeInOut' }}
            />
            {RING.map((d, i) => (
              <motion.circle
                key={i} cx={d.x} cy={d.y} r="4" fill={C.sage}
                initial={{ opacity: 0 }}
                animate={{ opacity: step >= 1 ? 0.45 : 0 }}
                transition={{ duration: 1.6, delay: step >= 1 ? i * 0.25 : 0 }}
              />
            ))}
            <motion.path
              d="M 158 118 Q 200 168 242 118" fill="none" stroke={C.umber} strokeWidth="1.5" strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: step >= 2 ? 1 : 0 }}
              transition={{ duration: 2.5, ease: 'easeInOut' }}
            />
            <motion.circle
              cx="200" cy="100" r="30" fill="none" stroke={C.sage} strokeWidth="1"
              animate={{ opacity: step === 0 ? [0.15, 0.5, 0.15] : 0, scale: step === 0 ? [0.9, 1.1, 0.9] : 1 }}
              transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
              style={{ transformOrigin: '200px 100px' }}
            />
            <motion.circle
              cx="200" cy="100" r="12"
              animate={{ fill: step >= 2 ? C.amber : C.sage, opacity: step === 0 ? [0.6, 1, 0.6] : 1 }}
              transition={{ duration: step === 0 ? 5 : 2, repeat: step === 0 ? Infinity : 0, ease: 'easeInOut' }}
            />
          </svg>
        </Frame>
      }
    />
  );
};
