import React, { useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { startBinauralDrone } from '../../lib/sound';
import { EmotionScores } from '../../types';

interface Props {
  sessionId: string;
  scores: EmotionScores;
  durationSec: number;
  onMark: (patch: { calm_anchor?: boolean; aura_hex?: string }) => void;
}

export const BinauralDrone: React.FC<Props> = () => {
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    const stopDrone = startBinauralDrone(174, 180);
    return () => {
      stopDrone();
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center p-6 text-center select-none">
      <div className="w-72 h-72 flex items-center justify-center relative">
        {/* Ripple 1 */}
        <motion.div
          className="absolute rounded-full border border-sunlitAmber"
          style={{ width: '8rem', height: '8rem' }}
          animate={{
            scale: shouldReduceMotion ? 1 : [1, 2.2],
            opacity: shouldReduceMotion ? 0.3 : [0.6, 0],
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: 'easeOut',
          }}
        />

        {/* Ripple 2 */}
        <motion.div
          className="absolute rounded-full border border-peachTerracotta"
          style={{ width: '8rem', height: '8rem' }}
          animate={{
            scale: shouldReduceMotion ? 1 : [1, 2.2],
            opacity: shouldReduceMotion ? 0.3 : [0.6, 0],
          }}
          transition={{
            duration: 5,
            delay: 2.5,
            repeat: Infinity,
            ease: 'easeOut',
          }}
        />

        {/* Core warm glowing node */}
        <div
          className="w-24 h-24 rounded-full flex items-center justify-center z-10"
          style={{
            background:
              'radial-gradient(circle, #F2C97D 0%, #E8997A 70%, #FAF6EE 100%)',
          }}
        >
          <div className="w-6 h-6 rounded-full bg-canvasPaper/90 border border-borderHairline" />
        </div>
      </div>

      <p className="mt-8 text-espressoInk font-serif text-2xl tracking-tight">
        174 Hz · 180 Hz Harmonic Reset
      </p>
      <p className="mt-2 text-warmUmber text-sm">
        Best experienced with headphones. Let the subtle stereo beat wash through your attention.
      </p>
    </div>
  );
};
