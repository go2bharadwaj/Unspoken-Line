import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { EmotionScores } from '../../types';

interface Props {
  sessionId: string;
  scores: EmotionScores;
  durationSec: number;
  onMark: (patch: { calm_anchor?: boolean; aura_hex?: string }) => void;
}

export const RadialBloom: React.FC<Props> = () => {
  const shouldReduceMotion = useReducedMotion();
  const numPetals = 12;

  return (
    <div className="flex flex-col items-center justify-center p-6 text-center select-none">
      <div className="w-72 h-72 flex items-center justify-center relative">
        {/* Radiating Petals */}
        {Array.from({ length: numPetals }).map((_, i) => {
          const angle = (i * 360) / numPetals;
          return (
            <motion.div
              key={i}
              className="absolute w-6 h-28 origin-bottom rounded-full"
              style={{
                background:
                  'linear-gradient(to top, rgba(232, 153, 122, 0.2), rgba(242, 201, 125, 0.7))',
                rotate: `${angle}deg`,
                bottom: '50%',
              }}
              animate={{
                scaleY: shouldReduceMotion ? 1 : [0.75, 1.3, 0.75],
                opacity: shouldReduceMotion ? 0.7 : [0.5, 0.9, 0.5],
              }}
              transition={{
                duration: 6,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
          );
        })}

        {/* Center sunlit core */}
        <motion.div
          className="w-20 h-20 rounded-full flex items-center justify-center z-10"
          style={{
            background:
              'radial-gradient(circle, #F2C97D 0%, #E8997A 80%, #FAF6EE 100%)',
          }}
          animate={{
            scale: shouldReduceMotion ? 1 : [0.9, 1.15, 0.9],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          <div className="w-8 h-8 rounded-full bg-canvasPaper/90 border border-borderHairline" />
        </motion.div>
      </div>

      <p className="mt-8 text-espressoInk font-serif text-2xl tracking-tight">
        Expansive Radial Bloom
      </p>
      <p className="mt-2 text-warmUmber text-sm">
        Breathe with the opening and closing rays. Celebrate the expansive clarity in your lines.
      </p>
    </div>
  );
};
