import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { C, Frame, PackProps, Shell, useEndBowl, useStepIndex } from './kit';

// Family: FRAME. Motif: a one-stroke ink figure: shoulder roll -> march on the spot -> reach up and
// shake out. A sage trail line follows the hands.
const L = { stroke: C.ink, strokeWidth: 3, strokeLinecap: 'round' as const, fill: 'none' };
// 'mirror' plays the keyframes back and forth, so reaching up then lowering never snaps.
const loop = { duration: 4, repeat: Infinity, repeatType: 'mirror' as const, ease: 'easeInOut' as const };
const pivot = { originX: 0.5, originY: 0 };

// Per step: [left arm, right arm, left leg, right leg] rotation keyframes. framer-motion rotates SVG
// elements about their own bounding box, so every limb is drawn straight down from its joint and
// pivots from the top-centre of that box (originX 0.5, originY 0) = the shoulder / hip.
const POSE: number[][][] = [
  [[0, 24, 0, -18, 0], [0, -24, 0, 18, 0], [0], [0]],
  [[20, -20, 20], [-20, 20, -20], [-16, 16, -16], [16, -16, 16]],
  [[0, 168, 178, 162, 178, 168], [0, -168, -178, -162, -178, -168], [0], [0]],
];
const TRAIL = [
  'M 150 112 Q 160 92 176 100 T 150 112',
  'M 150 120 Q 160 134 170 120 T 190 120',
  'M 168 40 Q 176 18 190 40 M 232 40 Q 224 18 210 40',
];

export const MovementBreaks: React.FC<PackProps> = ({ activity, durationSec, onClose }) => {
  const reduce = useReducedMotion();
  const steps = activity.steps ?? [];
  const step = Math.min(useStepIndex(steps.length, durationSec), 2);
  useEndBowl(durationSec);
  const pose = POSE[step];
  const a = (i: number) => (reduce ? { rotate: pose[i][pose[i].length - 1] } : { rotate: pose[i] });

  return (
    <Shell
      activity={activity}
      step={step}
      onClose={onClose}
      art={
        <Frame>
          <svg viewBox="0 0 400 220" className="absolute inset-0 w-full h-full" aria-hidden="true">
            <motion.path
              key={step} d={TRAIL[step]} stroke={C.sage} strokeWidth="1.5" strokeLinecap="round" fill="none"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: [0, 1, 1], opacity: [0, 0.7, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.g
              animate={{ y: step === 1 && !reduce ? [0, -4, 0, -4, 0] : 0 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            >
              <circle cx="200" cy="62" r="13" {...L} />
              <path d="M 200 76 L 200 140" {...L} />
              <path d="M 184 94 L 216 94" {...L} />
              <motion.g style={pivot} animate={a(0)} transition={loop}>
                <path d="M 184 94 L 184 146" {...L} />
                <circle cx="184" cy="150" r="4" fill={C.ink} />
              </motion.g>
              <motion.g style={pivot} animate={a(1)} transition={loop}>
                <path d="M 216 94 L 216 146" {...L} />
                <circle cx="216" cy="150" r="4" fill={C.ink} />
              </motion.g>
              <motion.path d="M 194 140 L 194 190" {...L} style={pivot} animate={a(2)} transition={loop} />
              <motion.path d="M 206 140 L 206 190" {...L} style={pivot} animate={a(3)} transition={loop} />
            </motion.g>
            <path d="M 120 192 L 280 192" stroke={C.hair} strokeWidth="1" />
          </svg>
        </Frame>
      }
    />
  );
};
