import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { C, Frame, PackProps, Shell, useStepIndex } from './kit';

export const DaylightExposure: React.FC<PackProps> = ({ activity, durationSec, onClose }) => {
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
          <svg viewBox="0 0 400 220" className="absolute inset-0 w-full h-full" aria-hidden="true" preserveAspectRatio="none">
            <path d="M 60 220 L 340 220 L 300 170 L 100 170 Z" fill={C.paper} fillOpacity="0.8" />
            <motion.g
              style={{ transformOrigin: '200px 40px' }}
              animate={a({ rotate: [-8, 8, -8] })}
              transition={loop(12)}
            >
              {[0, 1, 2].map((i) => (
                <path key={i} d={`M ${160 + i * 30} 40 L ${120 + i * 50} 200 L ${150 + i * 50} 200 L ${180 + i * 30} 40 Z`} fill={C.amber} fillOpacity="0.16" />
              ))}
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <motion.circle
                  key={i}
                  cx={165 + i * 14}
                  cy={90 + (i % 3) * 25}
                  r="1.5"
                  fill={C.peach}
                  animate={a({ y: [0, -10, 0], opacity: [0.2, 0.8, 0.2] })}
                  transition={loop(7 + i, i * 0.8)}
                />
              ))}
            </motion.g>
            <rect x="150" y="14" width="100" height="26" rx="2" fill="none" stroke={C.ink} strokeOpacity="0.4" strokeWidth="1" />
            <path d="M 200 14 V 40 M 150 27 H 250" stroke={C.ink} strokeOpacity="0.3" strokeWidth="1" />
          </svg>
        </Frame>
      }
    />
  );
};
