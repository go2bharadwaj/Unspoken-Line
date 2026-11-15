import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { C, Frame, ListBox, PackProps, Shell, useStepIndex } from './kit';

// Family: WRITING (checklist). Three orbs along a hairline curve light up one after another.
export const GratitudeList: React.FC<PackProps> = ({ activity, durationSec, onClose }) => {
  const steps = activity.steps ?? [];
  const step = useStepIndex(steps.length, durationSec);
  const still = useReducedMotion();
  const orbs = [[48, 78], [100, 44], [152, 70]];

  return (
    <Shell
      activity={activity}
      step={step}
      onClose={onClose}
      art={
        <Frame>
          <svg viewBox="0 0 200 130" className="w-full h-full" aria-hidden="true">
            <path d="M 20 92 C 56 54 80 30 100 44 C 124 60 140 90 180 62" fill="none" stroke={C.hair} strokeWidth="1.5" />
            {orbs.map(([x, y], i) => (
              <React.Fragment key={i}>
                <motion.circle
                  cx={x} cy={y} fill={C.amber} fillOpacity="0.35"
                  initial={{ r: 7 }}
                  animate={still ? { r: 12 } : { r: [7, 7, 14, 9, 7], opacity: [0, 0, 0.8, 0.4, 0] }}
                  transition={{ duration: 8, delay: i * 1.4, times: [0, 0.1, 0.3, 0.7, 1], repeat: Infinity, ease: 'easeInOut' }}
                />
                <motion.circle
                  cx={x} cy={y} r="5" fill={C.amber} stroke={C.peach} strokeWidth="0.8"
                  animate={still ? { opacity: 1 } : { opacity: [0.3, 0.3, 1, 0.8, 0.3] }}
                  transition={{ duration: 8, delay: i * 1.4, times: [0, 0.1, 0.3, 0.7, 1], repeat: Infinity, ease: 'easeInOut' }}
                />
              </React.Fragment>
            ))}
          </svg>
        </Frame>
      }
    >
      <ListBox count={3} />
    </Shell>
  );
};
