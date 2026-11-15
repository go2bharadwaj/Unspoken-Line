import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { C, Frame, PackProps, Shell, useStepIndex } from './kit';

export const Photography: React.FC<PackProps> = ({ activity, durationSec, onClose }) => {
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
            {[[90, 25, 1, 1], [310, 25, -1, 1], [90, 150, 1, -1], [310, 150, -1, -1]].map(([x, y, dx, dy], i) => (
              <path key={i} d={`M ${x} ${y + 22 * dy} V ${y} H ${x + 22 * dx}`} fill="none" stroke={C.ink} strokeOpacity="0.5" strokeWidth="1.5" strokeLinecap="round" />
            ))}
            <motion.circle
              cx="200"
              cy="88"
              r="30"
              fill="none"
              stroke={C.sage}
              strokeWidth="1.5"
              style={{ transformOrigin: '200px 88px' }}
              animate={a({ scale: [1, 1.15, 1], opacity: [0.5, 0.9, 0.5] })}
              transition={loop(6)}
            />
            <circle cx="200" cy="88" r="2" fill={C.sage} />
            {[0, 1, 2].map((i) => (
              <motion.circle
                key={i}
                cx={170 + i * 30}
                cy="190"
                r="7"
                fill={C.amber}
                stroke={C.peach}
                strokeOpacity="0.6"
                strokeWidth="1"
                initial={{ fillOpacity: rm ? 0.3 : 0 }}
                animate={a({ fillOpacity: [0, 0, 1, 1, 0] })}
                transition={{ duration: 12, delay: 0, repeat: Infinity, ease: 'easeInOut', times: [0, 0.1 + i * 0.2, 0.2 + i * 0.2, 0.9, 1] }}
              />
            ))}
          </svg>
        </Frame>
      }
    />
  );
};
