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

interface PebbleItem {
  count: number;
  cue: string;
  sub: string;
  pitch: number;
}

const PEBBLES: PebbleItem[] = [
  { count: 5, cue: 'Textures', sub: 'Notice 5 physical textures around you', pitch: 196 },
  { count: 4, cue: 'Tones', sub: 'Notice 4 warm colors or shades of light', pitch: 220 },
  { count: 3, cue: 'Sounds', sub: 'Notice 3 subtle sounds in your space', pitch: 261.6 },
  { count: 2, cue: 'Breaths', sub: 'Take 2 deep, grounding breaths', pitch: 293.7 },
  { count: 1, cue: 'Anchor', sub: 'Feel 1 point of contact with the ground', pitch: 329.6 },
];

export const GroundingPebbles: React.FC<Props> = () => {
  const [tappedIndex, setTappedIndex] = useState<number>(-1);

  const handleTap = (index: number) => {
    if (index === tappedIndex + 1) {
      setTappedIndex(index);
      playChime({ fundamental: PEBBLES[index].pitch, gain: 0.25 });
    }
  };

  const currentPebble = PEBBLES[Math.min(tappedIndex + 1, PEBBLES.length - 1)];
  const allSettled = tappedIndex === PEBBLES.length - 1;

  return (
    <div className="flex flex-col items-center justify-center p-6 text-center select-none max-w-lg mx-auto">
      <div className="flex items-center justify-center gap-3 sm:gap-4 flex-wrap my-8">
        {PEBBLES.map((peb, idx) => {
          const isSettled = idx <= tappedIndex;
          const isNext = idx === tappedIndex + 1;

          return (
            <motion.button
              key={peb.count}
              type="button"
              onClick={() => handleTap(idx)}
              disabled={!isNext}
              aria-label={`${peb.count}: ${peb.cue}`}
              className={`w-14 h-16 sm:w-16 sm:h-20 rounded-3xl flex flex-col items-center justify-center border transition-all duration-500 ${
                isSettled
                  ? 'bg-turmericMist/50 border-sageCalm text-warmUmber translate-y-1'
                  : isNext
                  ? 'bg-canvasPaper border-peachTerracotta text-espressoInk shadow-sm cursor-pointer hover:border-sunlitAmber scale-105'
                  : 'bg-canvasPaper/40 border-borderHairline text-warmUmber/40 cursor-not-allowed'
              }`}
              whileTap={isNext ? { scale: 0.95 } : {}}
            >
              <span className="font-serif text-xl sm:text-2xl font-medium">
                {peb.count}
              </span>
              <span className="text-[10px] sm:text-xs tracking-tight mt-1">
                {peb.cue}
              </span>
            </motion.button>
          );
        })}
      </div>

      <div className="min-h-20 flex flex-col items-center justify-center">
        {allSettled ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <p className="font-serif text-2xl text-espressoInk tracking-tight">
              All five senses softly settled
            </p>
            <p className="mt-2 text-sageCalm text-sm">
              Your attention is securely resting here in this room.
            </p>
          </motion.div>
        ) : (
          <div>
            <p className="font-serif text-2xl text-espressoInk tracking-tight">
              {currentPebble.sub}
            </p>
            <p className="mt-2 text-warmUmber text-sm">
              Tap pebble {currentPebble.count} ({currentPebble.cue}) when ready
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
