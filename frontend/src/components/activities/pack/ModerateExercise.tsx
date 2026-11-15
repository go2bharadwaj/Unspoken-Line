import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { C, Frame, PackProps, Shell, useStepIndex } from './kit';

export const ModerateExercise: React.FC<PackProps> = ({ activity, durationSec, onClose }) => {
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
            <g style={{ transformOrigin: '140px 100px' }}>
              {[0, 1].map((i) => (
                <motion.circle
                  key={i}
                  cx="140"
                  cy="100"
                  r="34"
                  fill={i ? 'none' : C.peach}
                  fillOpacity="0.25"
                  stroke={C.peach}
                  strokeWidth="1.5"
                  style={{ transformOrigin: '140px 100px' }}
                  animate={a({ scale: i ? [1, 1.5, 1.5] : [1, 1.12, 1], opacity: i ? [0.6, 0, 0] : [0.8, 1, 0.8] })}
                  transition={loop(4, i * 0.3)}
                />
              ))}
            </g>
            <path d="M 250 90 h 90 a 12 12 0 0 1 12 12 v 22 a 12 12 0 0 1 -12 12 h -60 l -16 14 v -14 h -14 a 12 12 0 0 1 -12 -12 v -22 a 12 12 0 0 1 12 -12 z" fill={C.paper} fillOpacity="0.7" stroke={C.ink} strokeOpacity="0.35" strokeWidth="1" transform="translate(-10 -20)" />
            {[0, 1, 2].map((i) => (
              <motion.circle
                key={i}
                cx={265 + i * 22}
                cy="92"
                r="3.5"
                fill={C.umber}
                animate={a({ opacity: [0.25, 0.9, 0.25] })}
                transition={loop(4.5, i * 0.7)}
              />
            ))}
            <path d="M 60 185 Q 130 170, 200 185 T 340 185" fill="none" stroke={C.sage} strokeOpacity="0.6" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </Frame>
      }
    />
  );
};
