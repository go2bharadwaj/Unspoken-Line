import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { PackProps, Shell, Stage, usePhase } from './kit';

// Family: BREATH ORB (stage). Same orb language as BreathOrb478, with the pack's own timings.
export const SlowBreathing: React.FC<PackProps> = ({ activity, onClose }) => {
  const reduce = useReducedMotion();
  const p = activity.pacer ?? { inhale_s: 4, hold_s: 0, exhale_s: 6 };
  const { phase } = usePhase([
    { label: 'In', ms: p.inhale_s * 1000, hz: 220 },
    { label: 'Out', ms: p.exhale_s * 1000, hz: 196 },
  ]);
  const inhaling = phase.label === 'In';

  return (
    <Shell
      activity={activity}
      onClose={onClose}
      title={inhaling ? 'Breathe in, softly' : 'Let it out, slowly'}
      sub={`${p.inhale_s} seconds in · ${p.exhale_s} seconds out · no holding`}
      art={
        <Stage>
          <motion.div
            className="absolute rounded-full border border-sageCalm"
            style={{ width: '18rem', height: '18rem' }}
            animate={{ scale: reduce ? 1 : inhaling ? 1.04 : 0.94, opacity: inhaling ? 0.5 : 0.25 }}
            transition={{ duration: inhaling ? p.inhale_s : p.exhale_s, ease: 'easeInOut' }}
          />
          <motion.div
            className="rounded-full flex items-center justify-center"
            style={{
              width: '12rem',
              height: '12rem',
              background: 'radial-gradient(circle, #F2C97D 0%, #E8997A 65%, #FAF6EE 100%)',
            }}
            animate={{ scale: reduce ? 1 : inhaling ? 1.35 : 0.85 }}
            transition={{ duration: inhaling ? p.inhale_s : p.exhale_s, ease: 'easeInOut' }}
          >
            <div className="w-16 h-16 rounded-full bg-canvasPaper/80 flex items-center justify-center border border-borderHairline">
              <span className="font-serif text-lg text-espressoInk tracking-wide">{phase.label}</span>
            </div>
          </motion.div>
        </Stage>
      }
    />
  );
};
