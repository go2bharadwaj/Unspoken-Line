import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { C, PackProps, Shell, Stage, useEndBowl, usePhase } from './kit';

// Family: BREATH ORB (stage). Motif: a DOUBLE inhale. The orb swells in two stages
// (big sip, small top-up that pops a thin ring), then one long slow release.
const SCALE = [1.2, 1.42, 0.85];

export const CyclicSighing: React.FC<PackProps> = ({ activity, durationSec, onClose }) => {
  const reduce = useReducedMotion();
  const p = activity.pacer ?? { inhale_s: 2, second_inhale_s: 1, hold_s: 0, exhale_s: 6 };
  const { index } = usePhase([
    { label: 'In', ms: p.inhale_s * 1000, hz: 247 },
    { label: 'Top up', ms: (p.second_inhale_s ?? 1) * 1000, hz: 294 },
    { label: 'Out', ms: p.exhale_s * 1000, hz: 196 },
  ]);
  useEndBowl(durationSec);
  const dur = [p.inhale_s, p.second_inhale_s ?? 1, p.exhale_s][index];

  return (
    <Shell
      activity={activity}
      step={index}
      onClose={onClose}
      art={
        <Stage>
          <motion.div
            className="absolute rounded-full border border-sageCalm"
            style={{ width: '18rem', height: '18rem' }}
            animate={{ scale: reduce ? 1 : index === 2 ? 0.94 : 1.04, opacity: index === 2 ? 0.2 : 0.4 }}
            transition={{ duration: dur, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute rounded-full"
            style={{ width: '12rem', height: '12rem', border: `1px solid ${C.peach}` }}
            animate={{ scale: reduce ? 1.3 : index === 1 ? 1.62 : 1.3, opacity: index === 1 ? [0, 0.85, 0.6] : 0 }}
            transition={{ duration: index === 1 ? dur : 0.8, ease: 'easeOut' }}
          />
          <motion.div
            className="rounded-full"
            style={{
              width: '12rem',
              height: '12rem',
              background: 'radial-gradient(circle, #F2C97D 0%, #E8997A 65%, #FAF6EE 100%)',
            }}
            animate={{ scale: reduce ? 1 : SCALE[index] }}
            transition={{ duration: dur, ease: 'easeInOut' }}
          />
        </Stage>
      }
    />
  );
};
