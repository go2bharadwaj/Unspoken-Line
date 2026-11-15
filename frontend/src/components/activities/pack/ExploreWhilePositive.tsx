import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { C, Frame, PackProps, Shell, useStepIndex } from './kit';

export const ExploreWhilePositive: React.FC<PackProps> = ({ activity, durationSec, onClose }) => {
  const step = useStepIndex(activity.steps?.length ?? 0, durationSec);
  const rm = useReducedMotion();
  // Reduced motion: render the still frame (no animate target).
  const a = <T,>(v: T): T | undefined => (rm ? undefined : v);
  const loop = (duration: number, delay = 0) => ({ duration, delay, repeat: Infinity, ease: 'easeInOut' as const });
  return (
    <Shell
      activity={activity}
      step={step}
      done
      onClose={onClose}
      art={
        <Frame>
          <svg viewBox="0 0 400 220" className="absolute inset-0 w-full h-full" aria-hidden="true">
            <path d="M 40 190 C 120 190, 160 150, 200 130" fill="none" stroke={C.ink} strokeOpacity="0.35" strokeWidth="1" />
            <path id="bA" d="M 200 130 C 240 110, 290 90, 360 50" fill="none" stroke={C.ink} strokeOpacity="0.35" strokeWidth="1" />
            <path d="M 200 130 C 250 140, 300 160, 360 175" fill="none" stroke={C.ink} strokeOpacity="0.35" strokeWidth="1" />
            <motion.circle
              r="5"
              fill={C.peach}
              initial={{ cx: 40, cy: 190 }}
              animate={a({ cx: [40, 120, 200, 280, 360, 280, 200, 120, 40], cy: [190, 178, 130, 98, 50, 98, 130, 178, 190] })}
              transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.g
              style={{ transformOrigin: '340px 172px' }}
              animate={a({ rotate: [0, 90, 90, 180, 180, 360] })}
              transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
            >
              <motion.path
                d="M 340 160 L 343 169 L 352 172 L 343 175 L 340 184 L 337 175 L 328 172 L 337 169 Z"
                fill={C.amber}
                stroke={C.peach}
                strokeOpacity="0.6"
                strokeWidth="1"
                animate={a({ fillOpacity: [0.3, 1, 0.3] })}
                transition={loop(6)}
              />
            </motion.g>
          </svg>
        </Frame>
      }
    />
  );
};
