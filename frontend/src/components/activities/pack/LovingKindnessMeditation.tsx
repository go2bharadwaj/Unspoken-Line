import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { C, PackProps, Shell, Stage, useEndBowl, useStepIndex } from './kit';
import { playChime } from '../../../lib/sound';

// Family: STAGE. Motif: warm glow (you) -> a second warm dot + light bridge (someone you love)
// -> a faint sage dot far away joins as the glow widens (a stranger).
const PITCH = [196, 220, 247];

export const LovingKindnessMeditation: React.FC<PackProps> = ({ activity, durationSec, onClose }) => {
  const steps = activity.steps ?? [];
  const step = useStepIndex(steps.length, durationSec);
  useEndBowl(durationSec);
  useEffect(() => {
    playChime({ fundamental: PITCH[Math.min(step, 2)], gain: 0.15 });
  }, [step]);

  return (
    <Shell
      activity={activity}
      step={step}
      onClose={onClose}
      art={
        <Stage>
          <svg viewBox="0 0 288 288" className="w-full h-full" aria-hidden="true">
            <defs>
              <radialGradient id="lk-glow">
                <stop offset="0%" stopColor={C.amber} stopOpacity="0.9" />
                <stop offset="55%" stopColor={C.peach} stopOpacity="0.35" />
                <stop offset="100%" stopColor={C.paper} stopOpacity="0" />
              </radialGradient>
            </defs>
            <motion.circle
              cx="104" cy="150" fill="url(#lk-glow)"
              animate={{ r: step >= 2 ? 120 : 60, opacity: [0.75, 1, 0.75] }}
              transition={{ r: { duration: 3, ease: 'easeInOut' }, opacity: { duration: 6, repeat: Infinity, ease: 'easeInOut' } }}
            />
            <circle cx="104" cy="150" r="9" fill={C.amber} />
            <motion.path
              d="M 113 150 L 175 150" stroke={C.amber} strokeWidth="2" strokeLinecap="round" fill="none"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: step >= 1 ? 1 : 0, opacity: step >= 1 ? 0.7 : 0 }}
              transition={{ duration: 2.5, ease: 'easeInOut' }}
            />
            <motion.circle
              cx="184" cy="150" r="8" fill={C.peach}
              initial={{ opacity: 0 }}
              animate={{ opacity: step >= 1 ? 1 : 0 }}
              transition={{ duration: 2.5 }}
            />
            <motion.circle
              cx="252" cy="76" r="5" fill={C.sage}
              initial={{ opacity: 0 }}
              animate={{ opacity: step >= 2 ? 0.6 : 0 }}
              transition={{ duration: 3, delay: 0.8 }}
            />
          </svg>
        </Stage>
      }
    />
  );
};
