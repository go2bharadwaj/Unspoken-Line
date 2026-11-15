import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { C, Frame, PackProps, Shell, useStepIndex } from './kit';

export const NapShort: React.FC<PackProps> = ({ activity, durationSec, onClose }) => {
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
            {[[70, 50], [120, 150], [310, 40], [340, 160], [90, 100]].map(([x, y], i) => (
              <motion.path
                key={i}
                d={`M ${x - 5} ${y} H ${x + 5} M ${x} ${y - 5} V ${y + 5}`}
                stroke={C.umber}
                strokeWidth="1"
                strokeLinecap="round"
                animate={a({ opacity: [0.2, 0.8, 0.2] })}
                transition={loop(6 + i, i * 1.1)}
              />
            ))}
            <circle cx="200" cy="110" r="72" fill="none" stroke={C.hair} strokeWidth="2" />
            <motion.circle
              cx="200"
              cy="110"
              r="72"
              fill="none"
              stroke={C.sage}
              strokeWidth="2"
              strokeLinecap="round"
              pathLength={1}
              strokeDasharray="1 1"
              transform="rotate(-90 200 110)"
              initial={{ strokeDashoffset: rm ? 0.7 : 1 }}
              animate={a({ strokeDashoffset: 0 })}
              transition={{ duration: durationSec, ease: 'linear' }}
            />
            <motion.g
              style={{ transformOrigin: '200px 130px' }}
              animate={a({ rotate: [-4, 4, -4] })}
              transition={loop(8)}
            >
              <path d="M 215 80 A 32 32 0 1 0 215 142 A 26 26 0 1 1 215 80 Z" fill={C.amber} fillOpacity="0.85" stroke={C.peach} strokeOpacity="0.5" strokeWidth="1" />
            </motion.g>
          </svg>
        </Frame>
      }
    />
  );
};
