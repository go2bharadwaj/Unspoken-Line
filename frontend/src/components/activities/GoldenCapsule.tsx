import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { playChime } from '../../lib/sound';
import { EmotionScores } from '../../types';

interface Props {
  sessionId: string;
  scores: EmotionScores;
  durationSec: number;
  onMark: (patch: { calm_anchor?: boolean; aura_hex?: string }) => void;
}

interface AuraSwatch {
  hex: string;
  name: string;
}

const SWATCHES: AuraSwatch[] = [
  { hex: '#F2C97D', name: 'Sunlit Amber' },
  { hex: '#E8997A', name: 'Peach Terracotta' },
  { hex: '#D97B66', name: 'Blush Clay' },
  { hex: '#7A9A8B', name: 'Sage Calm' },
  { hex: '#F5E6C4', name: 'Turmeric Mist' },
  { hex: '#E6DEC8', name: 'Paper Hairline' },
];

export const GoldenCapsule: React.FC<Props> = ({ onMark }) => {
  const [selectedHex, setSelectedHex] = useState<string | null>(null);

  const handleSelect = (swatch: AuraSwatch) => {
    setSelectedHex(swatch.hex);
    onMark({ aura_hex: swatch.hex });
    playChime({ fundamental: 261.6, gain: 0.25 });
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 text-center select-none max-w-md mx-auto">
      <div className="grid grid-cols-3 gap-6 my-6">
        {SWATCHES.map((s) => {
          const isSelected = selectedHex === s.hex;
          return (
            <button
              key={s.hex}
              type="button"
              onClick={() => handleSelect(s)}
              aria-label={`Select ${s.name} aura`}
              className="relative flex flex-col items-center justify-center group cursor-pointer"
            >
              <div
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border border-borderHairline transition-transform duration-300 group-hover:scale-105"
                style={{ backgroundColor: s.hex }}
              />

              {isSelected && (
                <motion.div
                  className="absolute inset-0 rounded-full border-2 border-espressoInk -m-1.5"
                  layoutId="auraHalo"
                  transition={{ duration: 0.3 }}
                />
              )}
              <span className="text-xs text-warmUmber mt-2">{s.name}</span>
            </button>
          );
        })}
      </div>

      <p className="mt-4 text-espressoInk font-serif text-2xl tracking-tight">
        {selectedHex ? 'Aura Hue Preserved' : 'Select a Warmth Aura'}
      </p>
      <p className="mt-2 text-warmUmber text-sm">
        {selectedHex
          ? 'This color capsule is now linked with this session in your sanctuary timeline.'
          : 'Preserve this moment through wordless color. Choose the hue that reflects your feeling.'}
      </p>
    </div>
  );
};
