import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { playChime } from '../../lib/sound';
import { EmotionScores } from '../../types';

interface Props {
  sessionId: string;
  scores: EmotionScores;
  durationSec: number;
  onMark: (patch: { calm_anchor?: boolean; aura_hex?: string }) => void;
}

export const HorizonGaze: React.FC<Props> = ({ durationSec }) => {
  const chimeRef = useRef<number | null>(null);

  useEffect(() => {
    chimeRef.current = window.setTimeout(() => {
      playChime({ fundamental: 196, gain: 0.35 });
    }, Math.max(1000, (durationSec - 2) * 1000));

    return () => {
      if (chimeRef.current !== null) {
        clearTimeout(chimeRef.current);
      }
    };
  }, [durationSec]);

  return (
    <div className="flex flex-col items-center justify-center p-6 text-center select-none w-full max-w-md mx-auto">
      <div className="w-full h-56 rounded-2xl border border-borderHairline bg-turmericMist/20 relative overflow-hidden flex items-center justify-center p-4">
        {/* Sun setting or rising over horizon */}
        <motion.div
          className="absolute w-24 h-24 rounded-full"
          style={{
            top: '35%',
            background:
              'radial-gradient(circle, #F2C97D 0%, #E8997A 80%, transparent 100%)',
          }}
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Clean Horizon Line */}
        <div className="absolute w-full top-1/2 border-t-2 border-espressoInk/40 z-10" />

        {/* Distant gentle hills */}
        <svg
          viewBox="0 0 400 120"
          className="absolute bottom-0 w-full h-24 overflow-visible"
          aria-hidden="true"
        >
          <path
            d="M 0 120 L 0 50 Q 80 20, 160 40 T 320 30 Q 360 45, 400 35 L 400 120 Z"
            fill="#E6DEC8"
            fillOpacity="0.6"
          />
          <path
            d="M 0 120 L 0 70 Q 120 45, 240 65 T 400 55 L 400 120 Z"
            fill="#7A9A8B"
            fillOpacity="0.25"
          />
        </svg>
      </div>

      <p className="mt-8 text-espressoInk font-serif text-2xl tracking-tight">
        Look 20 feet away into the distance
      </p>
      <p className="mt-2 text-warmUmber text-sm">
        Lift your eyes from any screen or paper. Soften your visual focus across the farthest horizon you can find until the bowl sounds.
      </p>
    </div>
  );
};
