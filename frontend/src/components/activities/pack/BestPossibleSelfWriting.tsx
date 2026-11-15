import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { C, Frame, PackProps, Shell, useStepIndex, WritingBox } from './kit';

// Family: WRITING. A winding path toward a low sunrise; the sky warms and a small dot travels the path.
export const BestPossibleSelfWriting: React.FC<PackProps> = ({ activity, durationSec, onClose }) => {
  const steps = activity.steps ?? [];
  const step = useStepIndex(steps.length, durationSec);
  const still = useReducedMotion();
  const D = 14;
  const t = { duration: D, repeat: Infinity, ease: 'easeInOut' as const, times: [0, 0.8, 1] };
  const path = 'M 30 124 C 80 112 40 96 90 88 C 130 82 104 74 112 68';

  return (
    <Shell
      activity={activity}
      step={step}
      onClose={onClose}
      art={
        <Frame>
          <svg viewBox="0 0 200 130" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 w-full h-full" aria-hidden="true">
            <motion.rect
              x="0" y="0" width="200" height="130" rx="10"
              animate={still ? { fill: C.mist } : { fill: ['#E3E9E0', C.mist, '#E3E9E0'] }}
              initial={{ fill: '#E3E9E0' }}
              transition={t}
            />
            <motion.circle
              cx="112" r="14" fill={C.amber} fillOpacity="0.9"
              initial={{ cy: 84 }}
              animate={still ? { cy: 62 } : { cy: [84, 62, 84] }}
              transition={t}
            />
            <rect x="0" y="68" width="200" height="62" fill={C.paper} fillOpacity="0.55" />
            <line x1="0" y1="68" x2="200" y2="68" stroke={C.hair} strokeWidth="1.2" />
            <path d={path} fill="none" stroke={C.umber} strokeOpacity="0.5" strokeWidth="1" strokeLinecap="round" />
            <motion.circle
              r="3" fill={C.peach}
              initial={{ cx: 30, cy: 124 }}
              animate={still ? { cx: 112, cy: 68 } : { cx: [30, 112, 112], cy: [124, 68, 68], opacity: [1, 1, 0.4] }}
              transition={t}
            />
          </svg>
        </Frame>
      }
    >
      <WritingBox rows={6} />
    </Shell>
  );
};
