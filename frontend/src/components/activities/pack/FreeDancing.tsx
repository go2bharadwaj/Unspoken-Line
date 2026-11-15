import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { C, Frame, PackProps, Shell, useEndBowl, useStepIndex } from './kit';

const COLS = [C.amber, C.peach, C.clay, C.amber, C.peach, C.sage, C.amber, C.clay, C.peach, C.amber, C.sage];
const BEAT = 60 / 100; // 100 bpm; one sway cycle = 4 beats

// Family: AUDIO (frame). A travelling wave of soft dots; no audio, the person brings their own song.
export const FreeDancing: React.FC<PackProps> = ({ activity, durationSec }) => {
  const reduce = useReducedMotion();
  const steps = activity.steps ?? [];
  const step = useStepIndex(steps.length, durationSec);
  useEndBowl(durationSec);

  return (
    <Shell
      activity={activity}
      step={step}
      art={
        <Frame className="gap-3">
          {COLS.map((c, i) => (
            <motion.span
              key={i}
              className="w-4 h-4 rounded-full shrink-0"
              style={{ background: c, opacity: 0.85 }}
              animate={reduce ? undefined : { y: [0, -34, 0, 34, 0], scaleY: [1, 1.15, 1, 0.9, 1] }}
              transition={{ duration: BEAT * 4, repeat: Infinity, ease: 'easeInOut', delay: i * BEAT * 0.4 }}
            />
          ))}
        </Frame>
      }
    />
  );
};
