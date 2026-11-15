import React, { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { startBinauralDrone } from '../../../lib/sound';
import { C, Frame, PackProps, Shell, useEndBowl, useStepIndex } from './kit';

// Family: AUDIO (frame). Rings pulse outward like a sound wave, only while soft tones play.
export const MusicListeningCalming: React.FC<PackProps> = ({ activity, durationSec }) => {
  const reduce = useReducedMotion();
  const steps = activity.steps ?? [];
  const step = useStepIndex(steps.length, durationSec);
  useEndBowl(durationSec);
  const [playing, setPlaying] = useState(false);
  const stopRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!playing) return;
    stopRef.current = startBinauralDrone(174, 180);
    return () => {
      stopRef.current?.();
      stopRef.current = null;
    };
  }, [playing]);

  const pulse = playing && !reduce;
  return (
    <Shell
      activity={activity}
      step={step}
      sub={`${activity.subtitle} · or play your own music instead`}
      art={
        <Frame>
          <div
            className="absolute w-24 h-24 rounded-full"
            style={{ background: 'radial-gradient(circle, #F2C97D 0%, #E8997A 70%, transparent 100%)', opacity: 0.8 }}
          />
          {[0, 1, 2, 3].map((i) => (
            <motion.span
              key={i}
              className="absolute w-24 h-24 rounded-full border"
              style={{ borderColor: i % 2 ? C.peach : C.amber }}
              initial={{ scale: 1 + i * 0.7, opacity: 0.45 - i * 0.08 }}
              animate={pulse ? { scale: [1, 4], opacity: [0.6, 0] } : { scale: 1 + i * 0.7, opacity: 0.45 - i * 0.08 }}
              transition={pulse ? { duration: 6, repeat: Infinity, delay: i * 1.5, ease: 'easeOut' } : { duration: 1 }}
            />
          ))}
        </Frame>
      }
    >
      <button
        type="button"
        onClick={() => setPlaying((p) => !p)}
        aria-pressed={playing}
        className="mt-6 px-5 py-2 rounded-full border border-peachTerracotta/60 bg-turmericMist/40 hover:bg-turmericMist/70 text-espressoInk text-sm transition-colors cursor-pointer"
      >
        {playing ? 'Pause' : 'Play soft tones'}
      </button>
    </Shell>
  );
};
