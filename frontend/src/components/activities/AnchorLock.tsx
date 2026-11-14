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

export const AnchorLock: React.FC<Props> = ({ onMark }) => {
  const [locked, setLocked] = useState(false);

  const handleLock = () => {
    setLocked(true);
    onMark({ calm_anchor: true });
    playChime({ fundamental: 196, gain: 0.3 });
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 text-center select-none max-w-md mx-auto">
      {!locked ? (
        <div className="flex flex-col items-center">
          <div className="w-48 h-48 rounded-full border border-sageCalm bg-turmericMist/20 flex items-center justify-center mb-6">
            <svg
              viewBox="0 0 100 100"
              className="w-20 h-20 text-sageCalm"
              aria-hidden="true"
            >
              {/* Anchor line icon */}
              <circle
                cx="50"
                cy="28"
                r="8"
                fill="none"
                stroke="#7A9A8B"
                strokeWidth="2.5"
              />
              <line
                x1="50"
                y1="36"
                x2="50"
                y2="76"
                stroke="#7A9A8B"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <line
                x1="36"
                y1="46"
                x2="64"
                y2="46"
                stroke="#7A9A8B"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <path
                d="M 28 64 C 28 80, 72 80, 72 64"
                fill="none"
                stroke="#7A9A8B"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
          </div>

          <button
            type="button"
            onClick={handleLock}
            className="px-6 py-3 rounded-full bg-sageCalm text-canvasPaper font-medium hover:bg-sageCalm/90 transition-colors shadow-none cursor-pointer"
          >
            Hold this as a Calm Anchor
          </button>
          <p className="mt-3 text-warmUmber text-sm">
            Marks this session in your timeline as a somatic reference of calm.
          </p>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="flex flex-col items-center"
        >
          <div className="flex items-center justify-center gap-6 my-6">
            {[1, 2, 3].map((b) => (
              <motion.div
                key={b}
                className="w-16 h-16 rounded-full border-2 border-sageCalm bg-turmericMist/30 flex items-center justify-center"
                animate={{
                  scale: [1, 1.15, 1],
                  opacity: [0.6, 1, 0.6],
                }}
                transition={{
                  duration: 4,
                  delay: (b - 1) * 1.3,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              >
                <span className="font-serif text-lg text-sageCalm">{b}</span>
              </motion.div>
            ))}
          </div>

          <p className="text-espressoInk font-serif text-2xl tracking-tight">
            Anchor locked in your sanctuary
          </p>
          <p className="mt-2 text-warmUmber text-sm max-w-xs">
            Breathe three gentle gratitude breaths into this feeling. Whenever you revisit your timeline, this anchor point remains.
          </p>
        </motion.div>
      )}
    </div>
  );
};
