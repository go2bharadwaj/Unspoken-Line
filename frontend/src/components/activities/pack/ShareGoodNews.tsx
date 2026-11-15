import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { C, Frame, PackProps, Shell, useStepIndex } from './kit';

const T = 6;
// Family: OFFSCREEN (frame). Ripples travel from the left bubble to the right, which glows and "types".
export const ShareGoodNews: React.FC<PackProps> = ({ activity, durationSec, onClose }) => {
  const reduce = useReducedMotion();
  const steps = activity.steps ?? [];
  const step = useStepIndex(steps.length, durationSec);
  const loop = { duration: T, repeat: Infinity, ease: 'easeInOut' as const };
  const bubble = 'absolute w-28 h-16 rounded-3xl border flex items-center justify-center gap-1.5';

  return (
    <Shell
      activity={activity}
      step={step}
      done
      onClose={onClose}
      art={
        <Frame>
          <div className={`${bubble} left-[10%] top-[26%] rounded-bl-md`} style={{ borderColor: C.hair, background: C.paper }} />
          {!reduce &&
            [0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="absolute top-[26%] left-[34%] w-10 h-16 rounded-full border"
                style={{ borderColor: C.peach }}
                animate={{ x: [0, 110], scale: [0.6, 1.2], opacity: [0, 0.5, 0] }}
                transition={{ duration: T / 2, repeat: Infinity, delay: i * 0.8, ease: 'easeOut', repeatDelay: T / 2 - 2.4 }}
              />
            ))}
          <motion.div
            className={`${bubble} right-[10%] bottom-[26%] rounded-br-md`}
            style={{ borderColor: C.peach, background: C.mist }}
            animate={reduce ? { boxShadow: `0 0 22px ${C.amber}` } : { boxShadow: [`0 0 0px ${C.amber}`, `0 0 0px ${C.amber}`, `0 0 24px ${C.amber}`, `0 0 0px ${C.amber}`] }}
            transition={{ ...loop, times: [0, 0.4, 0.6, 1] }}
          >
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: C.umber }}
                animate={reduce ? { opacity: 0.6 } : { opacity: [0.2, 0.2, 1, 0.2, 0.2], y: [0, 0, -3, 0, 0] }}
                transition={{ ...loop, times: [0, 0.5 + i * 0.04, 0.58 + i * 0.04, 0.66 + i * 0.04, 1] }}
              />
            ))}
          </motion.div>
        </Frame>
      }
    />
  );
};
