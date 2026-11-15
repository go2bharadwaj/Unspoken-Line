import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { C, Frame, PackProps, Shell, useStepIndex, WritingBox } from './kit';

// Family: WRITING. The 'you' circle drifts back and settles beside a friend: gaining distance.
export const ThirdPersonSelfTalk: React.FC<PackProps> = ({ activity, durationSec, onClose }) => {
  const steps = activity.steps ?? [];
  const step = useStepIndex(steps.length, durationSec);
  const still = useReducedMotion();
  const loop = { duration: 10, repeat: Infinity, ease: 'easeInOut' as const, times: [0, 0.55, 0.9, 1] };
  const end = { cx: 96, r: 19, cy: 62 };

  return (
    <Shell
      activity={activity}
      step={step}
      onClose={onClose}
      art={
        <Frame>
          <svg viewBox="0 0 200 130" className="w-full h-full" aria-hidden="true">
            <circle cx="146" cy="65" r="22" fill={C.sage} fillOpacity="0.14" stroke={C.sage} strokeWidth="1.5" />
            <motion.line
              x1="115" y1="64" x2="124" y2="65"
              stroke={C.peach} strokeWidth="1.2" strokeLinecap="round"
              animate={still ? { opacity: 0.8 } : { opacity: [0, 0, 0.8, 0.8] }}
              transition={loop}
            />
            <motion.circle
              fill="none" stroke={C.ink} strokeWidth="1"
              initial={{ cx: 50, cy: 65, r: 28 }}
              animate={
                still
                  ? end
                  : { cx: [50, 50, 96, 96], cy: [65, 65, 62, 62], r: [28, 28, 19, 19] }
              }
              transition={loop}
            />
          </svg>
        </Frame>
      }
    >
      <WritingBox rows={4} />
    </Shell>
  );
};
