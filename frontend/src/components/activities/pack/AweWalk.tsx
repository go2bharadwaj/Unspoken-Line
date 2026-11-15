import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { C, Frame, PackProps, Shell, useStepIndex } from './kit';

export const AweWalk: React.FC<PackProps> = ({ activity, durationSec, onClose }) => {
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
            {[[60, 20], [150, 35], [250, 15], [330, 40], [200, 12]].map(([x, y], i) => (
              <motion.circle
                key={i}
                cx={x}
                cy={y}
                r="1.5"
                fill={C.umber}
                initial={{ opacity: rm ? 0.5 : 0 }}
                animate={a({ opacity: [0, 0, 0.8, 0.8, 0] })}
                transition={{ duration: 12, delay: i * 1.5, repeat: Infinity, ease: 'easeInOut', times: [0, 0.2, 0.5, 0.8, 1] }}
              />
            ))}
            {[[80, 70, 60], [270, 95, 80]].map(([x, y, w], i) => (
              <motion.ellipse
                key={i}
                cx={x}
                cy={y}
                rx={w}
                ry="10"
                fill={C.hair}
                fillOpacity="0.9"
                animate={a({ x: [-25, 25, -25] })}
                transition={loop(12, i * 2)}
              />
            ))}
            <path d="M 0 220 L 0 150 Q 100 110, 200 145 T 400 125 L 400 220 Z" fill={C.sage} fillOpacity="0.28" />
            <path d="M 0 220 L 0 180 Q 150 150, 260 175 T 400 165 L 400 220 Z" fill={C.sage} fillOpacity="0.4" />
            <motion.circle
              r="2.5"
              fill={C.ink}
              initial={{ cx: 90, cy: 139 }}
              animate={a({ cx: [90, 310], cy: [139, 140] })}
              transition={{ duration: 12, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
            />
          </svg>
        </Frame>
      }
    />
  );
};
