import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { C, Frame, PackProps, Shell, useEndBowl, useStepIndex } from './kit';
import { playChime } from '../../../lib/sound';

// Family: FRAME. Motif: hands -> shoulders -> face. Each line drawing TENSES (small, angular, clay)
// for ~5 s, then RELEASES (soft, open, ink) with a peach/amber glow and a soft chime.
const TENSE_MS = 5000;
// Open palm outline: the same hand the original SomaticGuide draws. The fist is a rounded block
// with finger grooves and a thumb, in the same coordinate box (about 46..132 wide, 26..138 tall).
const PALM =
  'M 60 130 C 50 110, 48 95, 46 80 C 44 65, 52 50, 56 42 C 58 38, 64 38, 66 44 C 70 54, 72 70, 72 75 C 72 60, 76 34, 82 28 C 85 25, 90 26, 91 32 C 93 45, 92 65, 92 72 C 95 62, 100 38, 106 35 C 110 33, 114 36, 114 42 C 114 55, 111 70, 110 80 C 113 72, 120 54, 126 54 C 130 54, 132 58, 130 65 C 126 82, 120 102, 110 120 C 100 135, 75 138, 60 130 Z';
const FIST = 'M 62 66 Q 62 46 84 46 L 108 46 Q 128 46 128 66 L 128 98 Q 128 126 102 126 L 88 126 Q 62 126 62 98 Z';
const GROOVES = 'M 76 64 L 114 64 M 76 82 L 114 82 M 76 100 L 114 100';
const THUMB = 'M 62 84 Q 44 90 50 108 Q 56 116 70 110';

export const ProgressiveMuscleRelaxation: React.FC<PackProps> = ({ activity, durationSec, onClose }) => {
  const steps = activity.steps ?? [];
  const step = useStepIndex(steps.length, durationSec);
  const stage = Math.min(step, 2);
  const [tense, setTense] = useState(true);
  useEndBowl(durationSec);

  useEffect(() => {
    setTense(step < 3);
    if (step >= 3) return;
    const id = window.setTimeout(() => {
      setTense(false);
      playChime({ fundamental: 220, gain: 0.15 });
    }, TENSE_MS);
    return () => window.clearTimeout(id);
  }, [step]);

  const ink = tense ? C.clay : C.ink;
  const t = { duration: tense ? 1.2 : 2.5, ease: 'easeInOut' as const };
  const shoulders = tense ? 'M 90 78 Q 140 70 200 74 Q 260 70 310 78' : 'M 90 128 Q 140 100 200 104 Q 260 100 310 128';
  const brows = tense ? 'M 160 88 Q 175 100 188 96 M 212 96 Q 225 100 240 88' : 'M 160 92 Q 175 84 188 90 M 212 90 Q 225 84 240 92';
  const mouth = tense ? 'M 184 140 Q 200 136 216 140' : 'M 180 138 Q 200 152 220 138';

  return (
    <Shell
      activity={activity}
      step={step}
      onClose={onClose}
      art={
        <Frame>
          <motion.div
            className="absolute inset-0"
            style={{ background: 'radial-gradient(circle at 50% 50%, rgba(242,201,125,0.5), rgba(232,153,122,0.18) 50%, transparent 75%)' }}
            animate={{ opacity: tense ? 0 : 1 }}
            transition={{ duration: 2.5 }}
          />
          <svg viewBox="0 0 400 220" className="absolute inset-0 w-full h-full" aria-hidden="true">
            <g stroke={ink} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none">
              {stage === 0 && [140, 260].map((x, i) => (
                <g key={x} transform={`translate(${x} 110) scale(${i ? -1 : 1} 1) translate(-89 -82)`}>
                  <motion.g initial={false} animate={{ opacity: tense ? 1 : 0 }} transition={t} stroke={C.clay}>
                    <path d={FIST} />
                    <path d={GROOVES} strokeWidth="1.5" />
                    <path d={THUMB} />
                  </motion.g>
                  <motion.g initial={false} animate={{ opacity: tense ? 0 : 1 }} transition={t} stroke={C.ink}>
                    <path d={PALM} />
                  </motion.g>
                </g>
              ))}
              {stage === 1 && (
                <>
                  <motion.path initial={false} animate={{ d: shoulders }} transition={t} />
                  <circle cx="200" cy="58" r="20" strokeWidth="1.5" />
                </>
              )}
              {stage === 2 && (
                <>
                  <motion.circle cx="200" cy="110" initial={false} animate={{ r: tense ? 50 : 62 }} transition={t} />
                  <motion.path initial={false} animate={{ d: brows }} transition={t} strokeWidth="1.5" />
                  <motion.path initial={false} animate={{ d: mouth }} transition={t} strokeWidth="1.5" />
                </>
              )}
            </g>
          </svg>
        </Frame>
      }
    />
  );
};
