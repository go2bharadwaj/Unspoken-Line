import React from 'react';
import { motion } from 'framer-motion';
import { C, Frame, PackProps, Shell, useEndBowl, useStepIndex } from './kit';

// Family: FRAMED SCENE (card). A calm place whose elements wake up one step at a time:
// step 0 = sun (see), step 1 = ripples (hear), step 2 = warm glow over everything (feel).
export const GuidedImagery: React.FC<PackProps> = ({ activity, durationSec, onClose }) => {
  const steps = activity.steps ?? [];
  const step = useStepIndex(steps.length, durationSec);
  useEndBowl(durationSec);

  return (
    <Shell
      activity={activity}
      step={step}
      onClose={onClose}
      art={
        <Frame>
          <motion.div
            className="absolute w-24 h-24 rounded-full"
            style={{ top: '18%', background: 'radial-gradient(circle, #F2C97D 0%, #E8997A 80%, transparent 100%)' }}
            animate={{ opacity: step >= 0 ? 1 : 0.4, scale: step === 0 ? [1, 1.08, 1] : 1 }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          />
          <svg viewBox="0 0 400 220" className="absolute inset-0 w-full h-full" aria-hidden="true" preserveAspectRatio="none">
            <path d="M 0 220 L 0 120 Q 90 85, 180 112 T 400 100 L 400 220 Z" fill={C.hair} fillOpacity="0.7" />
            <path d="M 0 220 L 0 150 Q 140 125, 260 148 T 400 140 L 400 220 Z" fill={C.sage} fillOpacity="0.28" />
            {[0, 1, 2].map((i) => (
              <motion.ellipse
                key={i}
                cx="200"
                cy="188"
                rx="30"
                ry="6"
                fill="none"
                stroke={C.sage}
                strokeWidth="1.5"
                initial={{ opacity: 0, scale: 0.6 }}
                animate={step >= 1 ? { opacity: [0, 0.7, 0], scale: [0.6, 1.8, 2.4] } : { opacity: 0 }}
                transition={{ duration: 4, repeat: Infinity, delay: i * 1.3, ease: 'easeOut' }}
                style={{ transformOrigin: '200px 188px' }}
              />
            ))}
          </svg>
          <motion.div
            className="absolute inset-0"
            style={{ background: 'radial-gradient(circle at 50% 40%, rgba(242,201,125,0.45), transparent 70%)' }}
            animate={{ opacity: step >= 2 ? [0.4, 0.9, 0.4] : 0 }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
          />
        </Frame>
      }
    />
  );
};
