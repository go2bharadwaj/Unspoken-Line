import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { C, Frame, PackProps, Shell, useStepIndex, WritingBox } from './kit';

// Family: WRITING. A worry-dot rolls into a parking tile, a shade eases over it, the tile settles to sage.
export const WorryPostponement: React.FC<PackProps> = ({ activity, durationSec, onClose }) => {
  const steps = activity.steps ?? [];
  const step = useStepIndex(steps.length, durationSec);
  const still = useReducedMotion();
  const t = { duration: 11, repeat: Infinity, ease: 'easeInOut' as const, times: [0, 0.3, 0.5, 0.85, 1] };

  return (
    <Shell
      activity={activity}
      step={step}
      onClose={onClose}
      art={
        <Frame>
          <svg viewBox="0 0 200 130" className="w-full h-full" aria-hidden="true">
            <motion.rect
              x="100" y="35" width="60" height="60" rx="14" strokeWidth="1.5"
              initial={{ fill: C.mist, stroke: C.hair }}
              animate={still ? { fill: C.sage, fillOpacity: 0.2, stroke: C.sage } : { fill: [C.mist, C.mist, C.mist, C.sage, C.sage], fillOpacity: [0.3, 0.3, 0.3, 0.2, 0.2], stroke: [C.hair, C.hair, C.hair, C.sage, C.sage] }}
              transition={t}
            />
            <circle cx="130" cy="65" r="9" fill="none" stroke={C.umber} strokeOpacity="0.4" strokeWidth="1" />
            <motion.line
              x1="130" y1="65" x2="130" y2="58" stroke={C.umber} strokeWidth="1.2" strokeLinecap="round"
              style={{ originX: 0.5, originY: 1 }}
              animate={still ? {} : { rotate: [0, 0, 360, 360, 360] }}
              transition={t}
            />
            <motion.circle
              r="7" fill={C.clay} cy="95"
              initial={{ cx: 28, opacity: 1 }}
              animate={still ? { cx: 130, cy: 65, opacity: 0.0 } : { cx: [28, 28, 130, 130, 130], cy: [95, 95, 65, 65, 65], opacity: [1, 1, 1, 0.5, 0.5] }}
              transition={t}
            />
            <motion.rect
              x="100" y="35" width="60" height="60" rx="14" fill={C.paper}
              initial={{ opacity: 0 }}
              animate={still ? { opacity: 0.55 } : { opacity: [0, 0, 0, 0.7, 0.55] }}
              transition={t}
            />
          </svg>
        </Frame>
      }
    >
      <WritingBox rows={3} />
    </Shell>
  );
};
