import React, { useEffect, useState, useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { playChime } from '../../lib/sound';
import { EmotionScores } from '../../types';

interface Props {
  sessionId: string;
  scores: EmotionScores;
  durationSec: number;
  onMark: (patch: { calm_anchor?: boolean; aura_hex?: string }) => void;
}

type Phase = 'In' | 'Hold' | 'Out';

export const BreathOrb478: React.FC<Props> = () => {
  const [phase, setPhase] = useState<Phase>('In');
  const timerRef = useRef<number | null>(null);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    let isCancelled = false;

    const scheduleNext = (p: Phase) => {
      if (isCancelled) return;
      setPhase(p);
      playChime({ fundamental: p === 'In' ? 220 : p === 'Hold' ? 247 : 196, gain: 0.18 });

      const durationMs = p === 'In' ? 4000 : p === 'Hold' ? 7000 : 8000;
      const nextPhase: Phase = p === 'In' ? 'Hold' : p === 'Hold' ? 'Out' : 'In';

      timerRef.current = window.setTimeout(() => {
        scheduleNext(nextPhase);
      }, durationMs);
    };

    scheduleNext('In');

    return () => {
      isCancelled = true;
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const getScale = () => {
    if (shouldReduceMotion) return 1;
    if (phase === 'In') return 1.4;
    if (phase === 'Hold') return 1.45;
    return 0.85;
  };

  const getDuration = () => {
    if (phase === 'In') return 4;
    if (phase === 'Hold') return 7;
    return 8;
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 text-center select-none">
      <div className="w-72 h-72 flex items-center justify-center relative">
        {/* Shimmering rings */}
        <motion.div
          className="absolute rounded-full border border-sunlitAmber opacity-40"
          style={{ width: '18rem', height: '18rem' }}
          animate={{
            scale: shouldReduceMotion ? 1 : [1, 1.05, 1],
            opacity: phase === 'Hold' ? [0.4, 0.7, 0.4] : 0.3,
          }}
          transition={{
            duration: phase === 'Hold' ? 2.5 : 4,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />

        {/* Breathing Orb */}
        <motion.div
          className="rounded-full flex items-center justify-center shadow-none"
          style={{
            width: '12rem',
            height: '12rem',
            background:
              'radial-gradient(circle, #F2C97D 0%, #E8997A 65%, #FAF6EE 100%)',
          }}
          animate={{
            scale: getScale(),
          }}
          transition={{
            duration: getDuration(),
            ease: phase === 'In' ? 'easeOut' : phase === 'Hold' ? 'linear' : 'easeInOut',
          }}
        >
          <div className="w-16 h-16 rounded-full bg-canvasPaper/80 flex items-center justify-center border border-borderHairline">
            <span className="font-serif text-lg text-espressoInk tracking-wide">
              {phase}
            </span>
          </div>
        </motion.div>
      </div>

      <div className="mt-8">
        <p className="text-espressoInk font-serif text-2xl tracking-tight">
          {phase === 'In' && 'Inhale gently through your nose'}
          {phase === 'Hold' && 'Hold softly in stillness'}
          {phase === 'Out' && 'Exhale slowly through relaxed lips'}
        </p>
        <p className="mt-2 text-warmUmber text-sm">
          4 seconds in · 7 seconds suspended · 8 seconds release
        </p>
      </div>
    </div>
  );
};
