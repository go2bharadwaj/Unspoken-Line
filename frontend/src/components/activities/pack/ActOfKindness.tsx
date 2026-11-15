import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { C, Frame, PackProps, Shell, useStepIndex } from './kit';

const T = 6;
// Family: OFFSCREEN (frame). A spark travels from one soft circle to the other; the receiver brightens.
export const ActOfKindness: React.FC<PackProps> = ({ activity, durationSec, onClose }) => {
  const reduce = useReducedMotion();
  const steps = activity.steps ?? [];
  const step = useStepIndex(steps.length, durationSec);
  const loop = { duration: T, repeat: Infinity, ease: 'easeInOut' as const };
  const circle = 'absolute top-1/2 -mt-12 w-24 h-24 rounded-full';

  return (
    <Shell
      activity={activity}
      step={step}
      done
      onClose={onClose}
      art={
        <Frame>
          <div className={`${circle} left-[14%]`} style={{ background: `radial-gradient(circle, ${C.peach} 0%, ${C.mist} 80%)`, opacity: 0.8 }} />
          <motion.div
            className={`${circle} right-[14%]`}
            style={{ background: `radial-gradient(circle, ${C.amber} 0%, ${C.mist} 80%)` }}
            animate={reduce ? undefined : { opacity: [0.5, 0.5, 1, 0.5], scale: [1, 1, 1.06, 1] }}
            transition={{ ...loop, times: [0, 0.45, 0.75, 1] }}
          />
          {!reduce && (
            <motion.span
              className={`${circle} right-[14%] border`}
              style={{ borderColor: C.amber }}
              animate={{ scale: [1, 1, 1.9], opacity: [0, 0.7, 0] }}
              transition={{ ...loop, times: [0, 0.45, 1] }}
            />
          )}
          {[0, 1, 2, 3, 4].map((i) => (
            <motion.span
              key={i}
              className="absolute top-1/2 -mt-1.5 left-[24%] w-3 h-3 rounded-full"
              style={{ background: C.amber, boxShadow: `0 0 10px ${C.amber}` }}
              initial={{ opacity: reduce ? 0.9 : 0, x: reduce ? '3.5rem' : 0 }}
              animate={reduce ? undefined : { x: [0, 0, 190], opacity: [0, 0, 1 - i * 0.2, 0], scale: 1 - i * 0.12 }}
              transition={{ ...loop, times: [0, 0.1 + i * 0.015, 0.5 + i * 0.015, 0.55 + i * 0.015] }}
            />
          ))}
        </Frame>
      }
    />
  );
};
