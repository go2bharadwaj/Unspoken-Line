import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Activity } from '../../../types';
import { playChime } from '../../../lib/sound';

/** Every pack activity component receives exactly these props. */
export interface PackProps {
  activity: Activity;
  durationSec: number;
  onClose: () => void;
}

/** The sanctuary palette (same hexes as tailwind.config.js). Use these for SVG strokes/fills. */
export const C = {
  paper: '#FAF6EE',
  mist: '#F5E6C4',
  amber: '#F2C97D',
  peach: '#E8997A',
  clay: '#D97B66',
  ink: '#2C221E',
  umber: '#6E5D53',
  sage: '#7A9A8B',
  hair: '#E6DEC8',
} as const;

/** Framed illustration card, the same frame HorizonGaze uses. Put SVG / motion art inside. */
export const Frame: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => (
  <div
    className={`w-full h-56 rounded-2xl border border-borderHairline bg-turmericMist/20 relative overflow-hidden flex items-center justify-center p-4 ${className}`}
  >
    {children}
  </div>
);

/** 288px round stage, the same stage BreathOrb478 uses. */
export const Stage: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="w-72 h-72 flex items-center justify-center relative">{children}</div>
);

/**
 * Standard page for a pack activity: art on top, a serif headline (the current step), one
 * warm-umber line, optional extra controls, an optional "I'm done" button, and the evidence note.
 * Same column + typography as the original activities.
 */
export const Shell: React.FC<{
  activity: Activity;
  art: React.ReactNode;
  /** Index into activity.steps to show as the headline. */
  step?: number;
  /** Overrides the headline taken from the steps. */
  title?: string;
  /** Overrides the supporting line (defaults to activity.subtitle). */
  sub?: string;
  /** Show an "I'm done" button that closes the activity (use for offscreen / open-ended ones). */
  done?: boolean;
  onClose?: () => void;
  children?: React.ReactNode;
}> = ({ activity, art, step = 0, title, sub, done, onClose, children }) => {
  const headline = title ?? activity.steps?.[step] ?? activity.title;
  return (
    <div className="flex flex-col items-center justify-center p-6 text-center select-none w-full max-w-md mx-auto">
      {art}
      <motion.p
        key={headline}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
        className="mt-8 text-espressoInk font-serif text-2xl tracking-tight"
      >
        {headline}
      </motion.p>
      <p className="mt-2 text-warmUmber text-sm">{sub ?? activity.subtitle}</p>
      {children}
      {done && (
        <button
          type="button"
          onClick={onClose}
          className="mt-6 px-5 py-2 rounded-full border border-peachTerracotta/60 bg-turmericMist/40 hover:bg-turmericMist/70 text-espressoInk text-sm transition-colors cursor-pointer"
        >
          I&apos;m done
        </button>
      )}
      {activity.grade && (
        <p className="mt-6 text-[11px] text-warmUmber/70">
          Why this? Evidence grade {activity.grade} · {activity.citation}
        </p>
      )}
    </div>
  );
};

/** Steps advance evenly across the duration (e.g. 3 steps over 90s = a new step every 30s). */
export function useStepIndex(count: number, durationSec: number): number {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (count <= 1) return;
    const id = window.setInterval(
      () => setI((v) => Math.min(v + 1, count - 1)),
      Math.max(1500, (durationSec * 1000) / count)
    );
    return () => window.clearInterval(id);
  }, [count, durationSec]);
  return i;
}

/** Singing-bowl chime two seconds before the end, so eyes can stay closed (as the originals do). */
export function useEndBowl(durationSec: number, enabled = true): void {
  useEffect(() => {
    if (!enabled) return;
    const id = window.setTimeout(
      () => playChime({ fundamental: 196, gain: 0.35 }),
      Math.max(1000, (durationSec - 2) * 1000)
    );
    return () => window.clearTimeout(id);
  }, [durationSec, enabled]);
}

export interface PhaseSpec {
  label: string;
  ms: number;
  /** Soft chime pitch on entering the phase (original breath orbs use 220 in, 247 hold, 196 out). */
  hz?: number;
}

/** Loops through phases forever, chiming softly at each change. Returns the current phase. */
export function usePhase(phases: PhaseSpec[]): { index: number; phase: PhaseSpec } {
  const [index, setIndex] = useState(0);
  const ref = useRef(phases);
  ref.current = phases;
  useEffect(() => {
    let cancelled = false;
    let t: number | undefined;
    const go = (i: number) => {
      if (cancelled) return;
      setIndex(i);
      const p = ref.current[i];
      if (p.hz) playChime({ fundamental: p.hz, gain: 0.18 });
      t = window.setTimeout(() => go((i + 1) % ref.current.length), p.ms);
    };
    go(0);
    return () => {
      cancelled = true;
      if (t !== undefined) window.clearTimeout(t);
    };
  }, []);
  return { index, phase: phases[index] };
}

const FIELD =
  'w-full rounded-2xl border border-borderHairline bg-canvasPaper/80 p-3 text-espressoInk text-base select-text focus:outline-none focus:border-peachTerracotta';

/** Local-only free-text box. `select-text` because the page is select-none (Safari blocks typing otherwise). */
export const WritingBox: React.FC<{ rows?: number; label?: string }> = ({
  rows = 4,
  label = 'Your notes',
}) => {
  const [text, setText] = useState('');
  return (
    <div className="w-full text-left mt-5">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={rows}
        aria-label={label}
        className={FIELD}
      />
      <p className="text-[11px] text-warmUmber/70 mt-1">Stays on this screen. Nothing is saved or sent.</p>
    </div>
  );
};

/** N one-line inputs for checklist-style activities. Local only. */
export const ListBox: React.FC<{ count?: number; placeholder?: string }> = ({
  count = 3,
  placeholder = '',
}) => {
  const [vals, setVals] = useState<string[]>(() => Array(count).fill(''));
  return (
    <div className="w-full text-left mt-5 flex flex-col gap-2">
      {vals.map((v, i) => (
        <input
          key={i}
          value={v}
          placeholder={placeholder}
          aria-label={`Item ${i + 1}`}
          onChange={(e) => setVals((prev) => prev.map((x, j) => (j === i ? e.target.value : x)))}
          className={FIELD}
        />
      ))}
      <p className="text-[11px] text-warmUmber/70">Stays on this screen. Nothing is saved or sent.</p>
    </div>
  );
};
