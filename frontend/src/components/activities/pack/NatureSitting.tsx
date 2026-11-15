import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { C, Frame, PackProps, Shell, useStepIndex } from './kit';

export const NatureSitting: React.FC<PackProps> = ({ activity, durationSec, onClose }) => {
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
            <rect x="0" y="165" width="400" height="55" fill={C.mist} fillOpacity="0.7" />
            <path d="M 200 200 V 120" stroke={C.umber} strokeOpacity="0.5" strokeWidth="3" strokeLinecap="round" />
            <motion.g
              style={{ transformOrigin: '200px 130px' }}
              animate={a({ rotate: [-1.2, 1.2, -1.2] })}
              transition={loop(9)}
            >
              {[[150, 85, 42], [200, 60, 48], [250, 85, 42], [175, 105, 38], [225, 105, 38], [200, 90, 36]].map(([x, y, r], i) => (
                <circle key={i} cx={x} cy={y} r={r} fill={i % 2 ? C.hair : C.sage} fillOpacity={i % 2 ? 0.6 : 0.32} stroke={C.sage} strokeOpacity="0.4" strokeWidth="1" />
              ))}
            </motion.g>
            {[0, 1, 2, 3].map((i) => (
              <motion.ellipse
                key={i}
                cx={90 + i * 70}
                cy={185 + (i % 2) * 10}
                rx="20"
                ry="5"
                fill={C.amber}
                fillOpacity="0.55"
                animate={a({ x: [-14, 14, -14], opacity: [0.3, 0.7, 0.3] })}
                transition={loop(10 + i, i * 1.5)}
              />
            ))}
          </svg>
        </Frame>
      }
    />
  );
};
