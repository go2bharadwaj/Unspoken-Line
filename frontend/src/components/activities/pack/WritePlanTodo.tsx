import React from 'react';
import { motion } from 'framer-motion';
import { C, Frame, ListBox, PackProps, Shell, useStepIndex } from './kit';

// Family: WRITING (card + local inputs). Thoughts drift down and settle as lines on a page.
export const WritePlanTodo: React.FC<PackProps> = ({ activity, durationSec, onClose }) => {
  const steps = activity.steps ?? [];
  const step = useStepIndex(steps.length, durationSec);

  return (
    <Shell
      activity={activity}
      step={step}
      onClose={onClose}
      art={
        <Frame>
          <svg viewBox="0 0 200 130" className="w-full h-full" aria-hidden="true">
            <rect x="52" y="14" width="96" height="104" rx="8" fill={C.paper} stroke={C.hair} strokeWidth="2" />
            {[40, 62, 84].map((y, i) => (
              <motion.path
                key={y}
                d={`M 66 ${y} L 134 ${y}`}
                stroke={i === 2 ? C.peach : C.umber}
                strokeOpacity={i === 2 ? 1 : 0.55}
                strokeWidth="2.5"
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.6, delay: 0.8 + i * 1.2 }}
              />
            ))}
            {[0, 1, 2].map((i) => (
              <motion.circle
                key={i}
                cx={80 + i * 20}
                r="3.5"
                fill={C.amber}
                initial={{ cy: -6, opacity: 0 }}
                animate={{ cy: [-6, 30 + i * 22], opacity: [0, 1, 0.9] }}
                transition={{ duration: 2.6, delay: i * 1.2, repeat: Infinity, repeatDelay: 3.4, ease: 'easeOut' }}
              />
            ))}
          </svg>
        </Frame>
      }
    >
      <ListBox count={3} />
    </Shell>
  );
};
