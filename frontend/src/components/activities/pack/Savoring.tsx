import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { C, Frame, PackProps, Shell, useStepIndex, WritingBox } from './kit';

// Family: WRITING. A golden droplet forms, falls into a still pool; ripples widen and fade very slowly.
export const Savoring: React.FC<PackProps> = ({ activity, durationSec, onClose }) => {
  const steps = activity.steps ?? [];
  const step = useStepIndex(steps.length, durationSec);
  const still = useReducedMotion();
  const D = 12;
  const rep = { repeat: Infinity, ease: 'easeInOut' as const };

  return (
    <Shell
      activity={activity}
      step={step}
      onClose={onClose}
      art={
        <Frame>
          <svg viewBox="0 0 200 130" className="w-full h-full" aria-hidden="true">
            <defs>
              <radialGradient id="sv-glow">
                <stop offset="0%" stopColor={C.amber} stopOpacity="0.55" />
                <stop offset="100%" stopColor={C.amber} stopOpacity="0" />
              </radialGradient>
            </defs>
            <motion.ellipse
              cx="100" cy="92" rx="70" ry="16" fill="url(#sv-glow)"
              animate={still ? { opacity: 0.6 } : { opacity: [0.2, 0.2, 0.7, 0.45, 0.2] }}
              transition={{ duration: D, times: [0, 0.3, 0.45, 0.8, 1], ...rep }}
            />
            <ellipse cx="100" cy="92" rx="62" ry="12" fill="none" stroke={C.hair} strokeWidth="1" />
            {[0, 1].map((i) => (
              <motion.ellipse
                key={i} cx="100" cy="92" fill="none" stroke={C.amber} strokeWidth="1"
                initial={{ rx: 4, ry: 1, opacity: 0 }}
                animate={still ? { rx: 30 + i * 14, ry: 6 + i * 3, opacity: 0.4 } : { rx: [4, 4, 58], ry: [1, 1, 11], opacity: [0, 0.8, 0] }}
                transition={{ duration: D, delay: i * 1.6, times: [0, 0.35, 1], ...rep }}
              />
            ))}
            <motion.path
              d="M 100 22 C 104 30 108 36 100 42 C 92 36 96 30 100 22 Z"
              fill={C.amber} stroke={C.peach} strokeWidth="1"
              style={{ originX: '100px', originY: '28px' }}
              initial={{ opacity: 0 }}
              animate={still ? { opacity: 0 } : { y: [0, 0, 56, 56], scale: [0.3, 1, 1, 0.2], opacity: [0, 1, 1, 0] }}
              transition={{ duration: D, times: [0, 0.25, 0.38, 0.4], ...rep }}
            />
          </svg>
        </Frame>
      }
    >
      <WritingBox rows={2} />
    </Shell>
  );
};
