import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { startPinkNoise, playChime } from '../../lib/sound';
import { EmotionScores } from '../../types';

interface Props {
  sessionId: string;
  scores: EmotionScores;
  durationSec: number;
  onMark: (patch: { calm_anchor?: boolean; aura_hex?: string }) => void;
}

export const MicroRest: React.FC<Props> = ({ durationSec }) => {
  const chimeTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const stopNoise = startPinkNoise();

    // Bowl chime right at the end of the micro-rest so eyes can stay closed
    chimeTimerRef.current = window.setTimeout(() => {
      playChime({ fundamental: 196, gain: 0.35 });
    }, Math.max(1000, (durationSec - 2) * 1000));

    return () => {
      stopNoise();
      if (chimeTimerRef.current !== null) {
        clearTimeout(chimeTimerRef.current);
      }
    };
  }, [durationSec]);

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center p-6 text-center select-none">
      {/* Soothing turmeric wash overlay */}
      <motion.div
        className="absolute inset-0 bg-turmericMist/50 -z-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 3 }}
      />

      <div className="w-48 h-48 rounded-full border border-borderHairline flex items-center justify-center bg-canvasPaper/40 p-4">
        <svg
          viewBox="0 0 100 100"
          className="w-24 h-24 text-warmUmber"
          aria-hidden="true"
        >
          {/* Gentle closed eyelids graphic */}
          <path
            d="M 25 50 C 35 62, 65 62, 75 50"
            fill="none"
            stroke="#6E5D53"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <path
            d="M 35 57 L 30 65 M 50 60 L 50 70 M 65 57 L 70 65"
            stroke="#6E5D53"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </div>

      <p className="mt-8 text-espressoInk font-serif text-2xl tracking-tight">
        Close your eyes. Rest in the warmth.
      </p>
      <p className="mt-2 text-warmUmber text-sm max-w-sm">
        Filtered acoustic pink noise relaxes visual fatigue. A singing bowl chime will awaken you when time is complete.
      </p>
    </div>
  );
};
