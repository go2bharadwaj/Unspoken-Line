import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { C, Frame, PackProps, Shell, useStepIndex } from './kit';

export const BriskWalk10min: React.FC<PackProps> = ({ activity, durationSec, onClose }) => {
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
          <motion.div
            className="absolute w-16 h-16 rounded-full"
            style={{ top: '6%', left: '62%', background: 'radial-gradient(circle, #F2C97D 0%, #E8997A 80%, transparent 100%)' }}
            animate={a({ opacity: [0.6, 0.9, 0.6] })}
            transition={loop(10)}
          />
          <svg viewBox="0 0 400 220" className="absolute inset-0 w-full h-full" aria-hidden="true" preserveAspectRatio="none">
            <path d="M 0 150 Q 100 120, 200 150 T 400 130" fill="none" stroke={C.sage} strokeOpacity="0.2" strokeWidth="1" />
            <path id="walk" d="M -10 200 C 80 200, 120 150, 200 160 S 330 120, 410 100" fill="none" stroke={C.ink} strokeOpacity="0.35" strokeWidth="1" strokeDasharray="1 5" strokeLinecap="round" />
            <path d="M -10 200 C 80 200, 120 150, 200 160 S 330 120, 410 100" fill="none" stroke={C.ink} strokeOpacity="0.25" strokeWidth="1" />
            {[[40, 196], [80, 186], [120, 166], [160, 158], [200, 160], [245, 150], [290, 135], [335, 122], [375, 108]].map(([x, y], i) => (
              <motion.circle
                key={i}
                cx={x}
                cy={y + (i % 2 ? 5 : -5)}
                r="3"
                fill={C.peach}
                initial={{ opacity: rm ? 0.5 : 0 }}
                animate={a({ opacity: [0, 0.8, 0.8, 0] })}
                transition={{ duration: 10.8, delay: i * 1.2, repeat: Infinity, ease: 'easeInOut', times: [0, 0.1, 0.6, 1] }}
              />
            ))}
          </svg>
        </Frame>
      }
    />
  );
};
