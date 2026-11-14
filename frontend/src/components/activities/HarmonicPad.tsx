import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { playFifth } from '../../lib/sound';
import { EmotionScores } from '../../types';

interface Props {
  sessionId: string;
  scores: EmotionScores;
  durationSec: number;
  onMark: (patch: { calm_anchor?: boolean; aura_hex?: string }) => void;
}

interface PadTone {
  id: number;
  label: string;
  rootHz: number;
  color: string;
}

const TONES: PadTone[] = [
  { id: 1, label: 'I', rootHz: 196, color: '#FAF6EE' },
  { id: 2, label: 'II', rootHz: 220, color: '#F5E6C4' },
  { id: 3, label: 'III', rootHz: 261.6, color: '#F2C97D' },
  { id: 4, label: 'IV', rootHz: 293.7, color: '#E8997A' },
  { id: 5, label: 'V', rootHz: 329.6, color: '#7A9A8B' },
  { id: 6, label: 'VI', rootHz: 392, color: '#D97B66' },
];

export const HarmonicPad: React.FC<Props> = () => {
  const [activePad, setActivePad] = useState<number | null>(null);

  const handlePadTap = (tone: PadTone) => {
    setActivePad(tone.id);
    playFifth(tone.rootHz);
    setTimeout(() => {
      setActivePad((curr) => (curr === tone.id ? null : curr));
    }, 600);
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 text-center select-none max-w-md mx-auto">
      <div className="grid grid-cols-3 gap-4 my-6">
        {TONES.map((tone) => {
          const isActive = activePad === tone.id;
          return (
            <motion.button
              key={tone.id}
              type="button"
              onClick={() => handlePadTap(tone)}
              aria-label={`Harmonic circle ${tone.label}`}
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border border-borderHairline flex flex-col items-center justify-center relative overflow-hidden cursor-pointer shadow-none transition-transform"
              style={{ backgroundColor: tone.color }}
              whileTap={{ scale: 0.92 }}
            >
              <span className="font-serif text-lg text-espressoInk font-medium">
                {tone.label}
              </span>

              {isActive && (
                <motion.div
                  className="absolute inset-0 rounded-full border-2 border-espressoInk/40"
                  initial={{ scale: 0.8, opacity: 1 }}
                  animate={{ scale: 1.5, opacity: 0 }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                />
              )}
            </motion.button>
          );
        })}
      </div>

      <p className="mt-4 text-espressoInk font-serif text-2xl tracking-tight">
        Harmonic Resonance Pad
      </p>
      <p className="mt-2 text-warmUmber text-sm">
        Tap the textured paper circles to resonate fifth-interval bowls. Layer them at your own peaceful pace.
      </p>
    </div>
  );
};
