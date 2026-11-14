import React, { useEffect, useState, useRef } from 'react';
import { EmotionScores } from '../../types';

interface Props {
  sessionId: string;
  scores: EmotionScores;
  durationSec: number;
  onMark: (patch: { calm_anchor?: boolean; aura_hex?: string }) => void;
}

export const InfinityTracer: React.FC<Props> = () => {
  const [dotPos, setDotPos] = useState({ x: 120, y: 100 });
  const animRef = useRef<number | null>(null);
  const startRef = useRef<number>(performance.now());

  useEffect(() => {
    // Lemniscate of Bernoulli:
    // x = a * cos(t) / (1 + sin(t)^2)
    // y = a * sin(t) * cos(t) / (1 + sin(t)^2)
    // Centered at (120, 100) with a = 80
    const a = 80;
    const centerX = 120;
    const centerY = 100;
    const cycleMs = 12000; // 12 seconds per loop

    const loop = (now: number) => {
      const elapsed = (now - startRef.current) % cycleMs;
      const t = (elapsed / cycleMs) * 2 * Math.PI;

      const sinT = Math.sin(t);
      const cosT = Math.cos(t);
      const denom = 1 + sinT * sinT;

      const x = centerX + (a * cosT) / denom;
      const y = centerY + (a * sinT * cosT) / denom;

      setDotPos({ x, y });
      animRef.current = requestAnimationFrame(loop);
    };

    animRef.current = requestAnimationFrame(loop);

    return () => {
      if (animRef.current !== null) {
        cancelAnimationFrame(animRef.current);
      }
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center p-6 text-center select-none">
      <div className="w-80 h-56 flex items-center justify-center relative">
        <svg
          viewBox="0 0 240 200"
          className="w-full h-full overflow-visible"
          aria-hidden="true"
        >
          {/* Infinity guide path */}
          <path
            d="M 120 100 C 145 60, 200 60, 200 100 C 200 140, 145 140, 120 100 C 95 60, 40 60, 40 100 C 40 140, 95 140, 120 100 Z"
            fill="none"
            stroke="#E6DEC8"
            strokeWidth="3"
            strokeLinecap="round"
          />

          {/* Gliding dot */}
          <circle
            cx={dotPos.x}
            cy={dotPos.y}
            r="8"
            fill="#7A9A8B"
            stroke="#FAF6EE"
            strokeWidth="2"
          />
        </svg>
      </div>

      <p className="mt-8 text-espressoInk font-serif text-2xl tracking-tight">
        Mindful Continuum Loop
      </p>
      <p className="mt-2 text-warmUmber text-sm">
        Follow the unhurried figure-eight rhythm. 12 seconds of unbroken continuous flow.
      </p>
    </div>
  );
};
