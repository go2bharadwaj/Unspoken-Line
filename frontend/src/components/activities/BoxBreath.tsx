import React, { useEffect, useState, useRef } from 'react';
import { EmotionScores } from '../../types';

interface Props {
  sessionId: string;
  scores: EmotionScores;
  durationSec: number;
  onMark: (patch: { calm_anchor?: boolean; aura_hex?: string }) => void;
}

export const BoxBreath: React.FC<Props> = () => {
  const [dotPos, setDotPos] = useState({ x: 30, y: 30 });
  const [sideText, setSideText] = useState('Inhale (4s)');
  const animRef = useRef<number | null>(null);
  const startRef = useRef<number>(performance.now());

  useEffect(() => {
    // Square bounds: x from 30 to 170, y from 30 to 170
    // Total perimeter = 4 * 140 = 560
    const minCoord = 30;
    const maxCoord = 170;
    const sideLen = maxCoord - minCoord; // 140
    const cycleDurationMs = 16000; // 16s = 4s * 4

    const update = (now: number) => {
      const elapsed = (now - startRef.current) % cycleDurationMs;
      const progress = elapsed / cycleDurationMs; // 0 to 1
      const dist = progress * 4 * sideLen;

      let x = minCoord;
      let y = minCoord;

      if (dist < sideLen) {
        // Top edge: moving left to right
        x = minCoord + dist;
        y = minCoord;
        setSideText('Inhale (4s)');
      } else if (dist < 2 * sideLen) {
        // Right edge: moving top to bottom
        x = maxCoord;
        y = minCoord + (dist - sideLen);
        setSideText('Hold gently (4s)');
      } else if (dist < 3 * sideLen) {
        // Bottom edge: moving right to left
        x = maxCoord - (dist - 2 * sideLen);
        y = maxCoord;
        setSideText('Exhale smoothly (4s)');
      } else {
        // Left edge: moving bottom to top
        x = minCoord;
        y = maxCoord - (dist - 3 * sideLen);
        setSideText('Hold in calm (4s)');
      }

      setDotPos({ x, y });
      animRef.current = requestAnimationFrame(update);
    };

    animRef.current = requestAnimationFrame(update);

    return () => {
      if (animRef.current !== null) {
        cancelAnimationFrame(animRef.current);
      }
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center p-6 text-center select-none">
      <div className="w-72 h-72 flex items-center justify-center relative">
        <svg
          viewBox="0 0 200 200"
          className="w-full h-full overflow-visible"
          aria-hidden="true"
        >
          {/* Rounded square track */}
          <rect
            x="30"
            y="30"
            width="140"
            height="140"
            rx="20"
            fill="none"
            stroke="#E8997A"
            strokeWidth="2.5"
            strokeOpacity="0.85"
          />

          {/* Interior soft wash */}
          <rect
            x="32"
            y="32"
            width="136"
            height="136"
            rx="18"
            fill="#F5E6C4"
            fillOpacity="0.15"
          />

          {/* Active pacing dot */}
          <circle
            cx={dotPos.x}
            cy={dotPos.y}
            r="8"
            fill="#E8997A"
            stroke="#FAF6EE"
            strokeWidth="2"
          />
        </svg>
      </div>

      <p className="mt-8 text-espressoInk font-serif text-2xl tracking-tight">
        {sideText}
      </p>
      <p className="mt-2 text-warmUmber text-sm">
        Follow the dot around the perimeter with unhurried breath.
      </p>
    </div>
  );
};
