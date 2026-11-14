import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { playChime } from '../../lib/sound';
import { EmotionScores } from '../../types';

interface Props {
  sessionId: string;
  scores: EmotionScores;
  durationSec: number;
  onMark: (patch: { calm_anchor?: boolean; aura_hex?: string }) => void;
}

export const SomaticGuide: React.FC<Props> = () => {
  const [stage, setStage] = useState<0 | 1 | 2>(0);

  useEffect(() => {
    // Initial chime
    playChime({ fundamental: 196, gain: 0.22 });

    const t1 = setTimeout(() => {
      setStage(1);
      playChime({ fundamental: 220, gain: 0.22 });
    }, 20000);

    const t2 = setTimeout(() => {
      setStage(2);
      playChime({ fundamental: 174, gain: 0.25 });
    }, 40000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center p-6 text-center select-none">
      <div className="w-72 h-72 rounded-2xl border border-borderHairline bg-turmericMist/20 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Stage 0: Hand Opening / Unclenching */}
        {stage === 0 && (
          <motion.div
            key="hand"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7 }}
            className="flex flex-col items-center"
          >
            <svg
              viewBox="0 0 160 160"
              className="w-44 h-44"
              aria-hidden="true"
            >
              {/* Palm outline */}
              <path
                d="M 60 130 C 50 110, 48 95, 46 80 C 44 65, 52 50, 56 42 C 58 38, 64 38, 66 44 C 70 54, 72 70, 72 75 C 72 60, 76 34, 82 28 C 85 25, 90 26, 91 32 C 93 45, 92 65, 92 72 C 95 62, 100 38, 106 35 C 110 33, 114 36, 114 42 C 114 55, 111 70, 110 80 C 113 72, 120 54, 126 54 C 130 54, 132 58, 130 65 C 126 82, 120 102, 110 120 C 100 135, 75 138, 60 130 Z"
                fill="none"
                stroke="#2C221E"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Relaxation rays */}
              <motion.path
                d="M 40 40 L 26 28 M 86 16 L 86 4 M 134 34 L 146 22"
                stroke="#E8997A"
                strokeWidth="2"
                strokeLinecap="round"
                animate={{ opacity: [0.3, 0.9, 0.3] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </svg>
            <span className="text-warmUmber text-sm mt-3">Release your grip on the pen</span>
          </motion.div>
        )}

        {/* Stage 1: Wrist Circle */}
        {stage === 1 && (
          <motion.div
            key="wrist"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7 }}
            className="flex flex-col items-center"
          >
            <svg
              viewBox="0 0 160 160"
              className="w-44 h-44"
              aria-hidden="true"
            >
              {/* Forearm and wrist line */}
              <path
                d="M 80 140 L 80 90 M 70 90 L 90 90"
                stroke="#2C221E"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              {/* Circling arrow path around wrist */}
              <circle
                cx="80"
                cy="60"
                r="36"
                fill="none"
                stroke="#E6DEC8"
                strokeWidth="2"
              />
              <motion.path
                d="M 80 24 A 36 36 0 1 1 54 36"
                fill="none"
                stroke="#E8997A"
                strokeWidth="3"
                strokeLinecap="round"
                animate={{ rotate: 360 }}
                transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
                style={{ originX: '80px', originY: '60px' }}
              />
              <circle cx="80" cy="60" r="14" fill="#F5E6C4" />
            </svg>
            <span className="text-warmUmber text-sm mt-3">Softly circle both wrists</span>
          </motion.div>
        )}

        {/* Stage 2: Shoulder Lowering */}
        {stage === 2 && (
          <motion.div
            key="shoulders"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7 }}
            className="flex flex-col items-center"
          >
            <svg
              viewBox="0 0 160 160"
              className="w-44 h-44"
              aria-hidden="true"
            >
              {/* Neck & Shoulders dropping downward */}
              <path
                d="M 72 30 L 72 55 C 50 60, 20 75, 12 110"
                stroke="#2C221E"
                strokeWidth="2.5"
                fill="none"
                strokeLinecap="round"
              />
              <path
                d="M 88 30 L 88 55 C 110 60, 140 75, 148 110"
                stroke="#2C221E"
                strokeWidth="2.5"
                fill="none"
                strokeLinecap="round"
              />
              {/* Downward easing arrows */}
              <motion.path
                d="M 38 72 L 38 98 M 32 92 L 38 98 L 44 92"
                stroke="#7A9A8B"
                strokeWidth="2.5"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                animate={{ y: [0, 8, 0] }}
                transition={{ duration: 2.5, repeat: Infinity }}
              />
              <motion.path
                d="M 122 72 L 122 98 M 116 92 L 122 98 L 128 92"
                stroke="#7A9A8B"
                strokeWidth="2.5"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                animate={{ y: [0, 8, 0] }}
                transition={{ duration: 2.5, repeat: Infinity }}
              />
            </svg>
            <span className="text-warmUmber text-sm mt-3">Drop your shoulders and exhale</span>
          </motion.div>
        )}
      </div>

      <p className="mt-8 text-espressoInk font-serif text-2xl tracking-tight">
        {stage === 0 && 'Unclench your fingers'}
        {stage === 1 && 'Rotate wrists with effortless ease'}
        {stage === 2 && 'Let your shoulders drop away from your ears'}
      </p>
      <p className="mt-2 text-warmUmber text-sm">
        Three wordless somatic shifts to release muscular holding.
      </p>
    </div>
  );
};
