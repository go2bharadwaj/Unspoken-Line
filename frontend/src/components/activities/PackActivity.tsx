import React, { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Activity } from '../../types';

interface Props {
  activity: Activity;
  onClose: () => void;
}

type Pacer = NonNullable<Activity['pacer']>;

const BreathCircle: React.FC<{ pacer: Pacer }> = ({ pacer }) => {
  const reduce = useReducedMotion();
  const inhale = pacer.inhale_s + (pacer.second_inhale_s ?? 0);
  const total = inhale + pacer.hold_s + pacer.exhale_s;
  const [label, setLabel] = useState('Breathe in');

  useEffect(() => {
    const timers: number[] = [];
    const cycle = () => {
      setLabel('Breathe in');
      if (pacer.hold_s) timers.push(window.setTimeout(() => setLabel('Hold'), inhale * 1000));
      timers.push(window.setTimeout(() => setLabel('Breathe out'), (inhale + pacer.hold_s) * 1000));
      timers.push(window.setTimeout(cycle, total * 1000));
    };
    cycle();
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [pacer, inhale, total]);

  return (
    <div className="flex flex-col items-center gap-3">
      <motion.div
        className="w-40 h-40 rounded-full bg-turmericMist border border-peachTerracotta/50"
        initial={{ scale: 0.8 }}
        animate={reduce ? { scale: 0.8 } : { scale: [0.55, 1, 1, 0.55] }}
        transition={{
          duration: total,
          times: [0, inhale / total, (inhale + pacer.hold_s) / total, 1],
          ease: 'easeInOut',
          repeat: Infinity,
        }}
      />
      <p className="text-sm text-warmUmber" aria-live="polite">{label}</p>
    </div>
  );
};

// One generic player for every evidence-pack type: numbered steps, plus a breath pacer,
// a local-only text box, or a "done" button when the type calls for it.
export const PackActivity: React.FC<Props> = ({ activity, onClose }) => {
  const [text, setText] = useState('');
  const type = activity.interaction_type;

  return (
    <div className="w-full max-w-md mx-auto flex flex-col items-center gap-5 p-4 text-center">
      {activity.pacer && <BreathCircle pacer={activity.pacer} />}

      <ol className="w-full flex flex-col gap-2.5 text-left">
        {activity.steps?.map((step, i) => (
          <li key={i} className="flex gap-3 text-espressoInk">
            <span className="shrink-0 w-6 h-6 rounded-full bg-peachTerracotta text-canvasPaper text-xs flex items-center justify-center mt-0.5">
              {i + 1}
            </span>
            <span className="text-base leading-snug">{step}</span>
          </li>
        ))}
      </ol>

      {(type === 'TEXT_PROMPT' || type === 'CHECKLIST') && (
        <div className="w-full text-left">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            aria-label="Your notes"
            className="w-full rounded-2xl border border-borderHairline bg-canvasPaper p-3 text-espressoInk focus:outline-none focus:border-peachTerracotta"
          />
          <p className="text-[11px] text-warmUmber/70 mt-1">Stays on this screen. Nothing is saved or sent.</p>
        </div>
      )}

      {activity.taster && (
        <p className="text-xs text-warmUmber">A short taste of a longer practice.</p>
      )}

      {type === 'OFFSCREEN_CARD' && (
        <button
          type="button"
          onClick={onClose}
          className="px-5 py-2 rounded-full bg-peachTerracotta text-canvasPaper text-sm cursor-pointer"
        >
          I&apos;m done
        </button>
      )}

      {activity.grade && (
        <p className="text-[11px] text-warmUmber/70">
          Why this? Evidence grade {activity.grade} · {activity.citation}
        </p>
      )}
    </div>
  );
};
