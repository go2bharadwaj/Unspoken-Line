import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { C, Frame, PackProps, Shell, useStepIndex, WritingBox } from './kit';

// Family: WRITING. An envelope opens, a letter slides up and a line writes itself across it.
export const GratitudeLetter: React.FC<PackProps> = ({ activity, durationSec, onClose }) => {
  const steps = activity.steps ?? [];
  const step = useStepIndex(steps.length, durationSec);
  const still = useReducedMotion();
  const t = { duration: 10, repeat: Infinity, ease: 'easeInOut' as const, times: [0, 0.2, 0.45, 0.85, 1] };

  return (
    <Shell
      activity={activity}
      step={step}
      onClose={onClose}
      art={
        <Frame>
          <svg viewBox="0 0 200 130" className="w-full h-full" aria-hidden="true">
            <motion.g animate={still ? { y: -22 } : { y: [0, 0, -22, -22, 0] }} transition={t}>
              <rect x="64" y="52" width="72" height="54" rx="4" fill={C.paper} stroke={C.hair} strokeWidth="1.5" />
              <motion.path
                d="M 74 70 C 88 64 96 76 108 70 S 124 66 128 72"
                fill="none" stroke={C.umber} strokeWidth="1.5" strokeLinecap="round"
                initial={{ pathLength: 0 }}
                animate={still ? { pathLength: 1 } : { pathLength: [0, 0, 0, 1, 1] }}
                transition={t}
              />
            </motion.g>
            <rect x="52" y="70" width="96" height="48" rx="6" fill={C.mist} stroke={C.hair} strokeWidth="1.5" />
            <path d="M 52 74 L 100 102 L 148 74" fill="none" stroke={C.hair} strokeWidth="1.5" />
            <motion.path
              d="M 52 70 L 100 70 L 148 70 L 100 96 Z" fill={C.mist} stroke={C.hair} strokeWidth="1.5"
              style={{ originX: '100px', originY: '70px' }}
              animate={still ? { scaleY: -0.3 } : { scaleY: [1, 1, -0.3, -0.3, 1] }}
              transition={t}
            />
            <circle cx="100" cy="94" r="4" fill={C.peach} fillOpacity="0.8" />
          </svg>
        </Frame>
      }
    >
      <WritingBox rows={6} />
    </Shell>
  );
};
