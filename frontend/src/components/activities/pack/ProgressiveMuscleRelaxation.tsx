import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { C, Frame, PackProps, Shell, useEndBowl, useStepIndex } from './kit';
import { playChime } from '../../../lib/sound';

// Family: FRAME. Motif: hands -> shoulders -> face. Each line drawing TENSES (small, angular, clay)
// for ~5 s, then RELEASES (soft, open, ink) with a peach/amber glow and a soft chime.
const TENSE_MS = 5000;
const blob = (r: number, k: number) =>
  `M ${-r} 0 C ${-r} ${-k} ${-k} ${-r} 0 ${-r} C ${k} ${-r} ${r} ${-k} ${r} 0 C ${r} ${k} ${k} ${r} 0 ${r} C ${-k} ${r} ${-r} ${k} ${-r} 0 Z`;

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
  // tense: small + near-angular (low curve handle); release: larger + round.
  const fist = tense ? blob(18, 5) : blob(30, 17);
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
              {stage === 0 && [140, 260].map((x) => (
                <g key={x} transform={`translate(${x} 110)`}>
                  <motion.path initial={false} animate={{ d: fist }} transition={t} />
                  <motion.path initial={false} animate={{ d: tense ? 'M -8 -6 L 8 -6 M -8 2 L 8 2' : 'M -14 -8 Q 0 -14 14 -8 M -14 4 Q 0 -2 14 4' }} transition={t} strokeWidth="1.5" />
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
