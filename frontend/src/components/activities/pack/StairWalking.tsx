import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { C, Frame, PackProps, Shell, useStepIndex } from './kit';

export const StairWalking: React.FC<PackProps> = ({ activity, durationSec, onClose }) => {
  const step = useStepIndex(activity.steps?.length ?? 0, durationSec);
  const rm = useReducedMotion();
  // Reduced motion: render the still frame (no animate target).
  const a = <T,>(v: T): T | undefined => (rm ? undefined : v);
  return (
    <Shell
      activity={activity}
      step={step}
      done
      onClose={onClose}
      art={
        <Frame>
          <svg viewBox="0 0 400 220" className="absolute inset-0 w-full h-full" aria-hidden="true">
            <path d="M 60 190 H 120 V 160 H 180 V 130 H 240 V 100 H 300 V 70 H 350" fill="none" stroke={C.ink} strokeOpacity="0.45" strokeWidth="1" strokeLinejoin="round" />
            <motion.circle
              r="6"
              fill={C.peach}
              initial={{ cx: 90, cy: 180 }}
              animate={a({
                cx: [90, 150, 210, 270, 325, 270, 210, 150, 90],
                cy: [180, 150, 120, 90, 60, 90, 120, 150, 180],
                opacity: [0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9],
              })}
              transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
            />
            {[0, 1, 2].map((i) => (
              <motion.circle
                key={i}
                r={4 - i}
                fill={C.amber}
                initial={{ cx: 90, cy: 180, opacity: 0.4 - i * 0.1 }}
                animate={a({ cx: [90, 150, 210, 270, 325, 270, 210, 150, 90], cy: [180, 150, 120, 90, 60, 90, 120, 150, 180] })}
                transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut', delay: 0.35 * (i + 1) }}
              />
            ))}
          </svg>
        </Frame>
      }
    />
  );
};
