import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { C, Frame, PackProps, Shell, useEndBowl, useStepIndex } from './kit';

// Family: FRAME. Motif: the 'screen' dims and tilts away while a leaf window brightens;
// a hairline ring slowly drains over the whole duration (no digits).
export const MicroBreak: React.FC<PackProps> = ({ activity, durationSec, onClose }) => {
  const reduce = useReducedMotion();
  const steps = activity.steps ?? [];
  const step = useStepIndex(steps.length, durationSec);
  useEndBowl(durationSec);
  const t = { duration: 3, ease: 'easeInOut' as const };

  return (
    <Shell
      activity={activity}
      step={step}
      onClose={onClose}
      art={
        <Frame>
          <svg viewBox="0 0 400 220" className="absolute inset-0 w-full h-full" aria-hidden="true">
            <circle cx="200" cy="110" r="98" fill="none" stroke={C.hair} strokeWidth="1" />
            <motion.circle
              cx="200" cy="110" r="98" fill="none" stroke={C.umber} strokeWidth="1" strokeLinecap="round"
              pathLength={1} strokeDasharray={1} transform="rotate(-90 200 110)"
              initial={{ strokeDashoffset: 0 }}
              animate={{ strokeDashoffset: 1 }}
              transition={{ duration: durationSec, ease: 'linear' }}
            />
            <motion.rect
              x="92" y="78" width="96" height="64" rx="10" fill={C.mist} stroke={C.ink} strokeWidth="1.5"
              style={{ transformOrigin: '140px 110px' }}
              animate={{ opacity: [0.95, 0.5, 0.3][step] ?? 0.3, rotate: reduce ? 0 : [0, 8, 14][step] ?? 14 }}
              transition={t}
            />
            <motion.g animate={{ opacity: [0.25, 0.65, 1][step] ?? 1 }} transition={t}>
              <rect x="226" y="72" width="84" height="76" rx="14" fill={C.paper} stroke={C.sage} strokeWidth="1.5" />
              <circle cx="284" cy="96" r="9" fill={C.amber} fillOpacity="0.8" />
              <path d="M 226 128 Q 255 116 285 126 T 310 122 L 310 134 Q 310 148 296 148 L 240 148 Q 226 148 226 134 Z" fill={C.sage} fillOpacity="0.3" />
              <path d="M 250 120 Q 258 100 276 98 Q 274 116 250 120 Z" fill={C.sage} fillOpacity="0.55" />
            </motion.g>
          </svg>
        </Frame>
      }
    />
  );
};
