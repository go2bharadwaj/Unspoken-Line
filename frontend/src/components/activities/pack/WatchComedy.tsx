import React from 'react';
import { motion } from 'framer-motion';
import { C, Frame, PackProps, Shell, useStepIndex } from './kit';

// Family: OFFSCREEN (card + "I'm done"). The person leaves the app; this is a warm place to come back to.
export const WatchComedy: React.FC<PackProps> = ({ activity, durationSec, onClose }) => {
  const steps = activity.steps ?? [];
  const step = useStepIndex(steps.length, durationSec);

  return (
    <Shell
      activity={activity}
      step={step}
      done
      onClose={onClose}
      art={
        <Frame>
          <motion.div
            className="absolute w-44 h-44 rounded-full"
            style={{ background: 'radial-gradient(circle, #F2C97D 0%, #E8997A 70%, transparent 100%)' }}
            animate={{ scale: [1, 1.08, 1], opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          />
          <svg viewBox="0 0 120 120" className="w-32 h-32 relative" aria-hidden="true">
            <circle cx="60" cy="60" r="38" fill={C.paper} fillOpacity="0.7" stroke={C.ink} strokeOpacity="0.4" strokeWidth="2" />
            <circle cx="47" cy="52" r="3" fill={C.ink} fillOpacity="0.7" />
            <circle cx="73" cy="52" r="3" fill={C.ink} fillOpacity="0.7" />
            <motion.path
              stroke={C.ink}
              strokeOpacity="0.7"
              strokeWidth="2.5"
              strokeLinecap="round"
              fill="none"
              animate={{ d: ['M 44 68 Q 60 76, 76 68', 'M 42 66 Q 60 88, 78 66', 'M 44 68 Q 60 76, 76 68'] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            />
          </svg>
          {[0, 1, 2, 3].map((i) => (
            <motion.span
              key={i}
              className="absolute w-1.5 h-1.5 rounded-full bg-sunlitAmber"
              style={{ left: `${22 + i * 17}%`, bottom: '18%' }}
              animate={{ y: [0, -70], opacity: [0, 1, 0] }}
              transition={{ duration: 3.2, repeat: Infinity, delay: i * 0.8, ease: 'easeOut' }}
            />
          ))}
        </Frame>
      }
    />
  );
};
