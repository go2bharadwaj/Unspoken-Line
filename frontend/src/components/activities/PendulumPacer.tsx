import React, { useEffect, useRef, useState } from 'react';
import { EmotionScores } from '../../types';

interface Props {
  sessionId: string;
  scores: EmotionScores;
  durationSec: number;
  onMark: (patch: { calm_anchor?: boolean; aura_hex?: string }) => void;
}

export const PendulumPacer: React.FC<Props> = () => {
  const [angleDeg, setAngleDeg] = useState(0);
  const [breathCue, setBreathCue] = useState('Inhale gently as it rises...');
  const animRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(performance.now());
  const phaseRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(performance.now());

  useEffect(() => {
    const tau = 4.0; // Decay time constant
    const maxA = 28; // Max swing angle in degrees

    const loop = (now: number) => {
      const elapsedSec = (now - startTimeRef.current) / 1000;
      const dt = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;

      // Frequency slows from 14 swings/min (0.233 Hz) down to 6 swings/min (0.1 Hz) over 60s
      const progress = Math.min(1, Math.max(0, elapsedSec / 60));
      const freqHz = (14 - 8 * progress) / 60; // 0.233 -> 0.100 Hz

      phaseRef.current += 2 * Math.PI * freqHz * dt;

      // Period in seconds = 1 / freqHz
      const period = 1 / freqHz;
      // Cycle time in current period
      const tInCycle = (elapsedSec % period);
      // Decaying envelope refreshed each cycle so it never stops
      const envelope = maxA * Math.exp(-tInCycle / tau);
      const angle = envelope * Math.sin(phaseRef.current);

      setAngleDeg(angle);

      // Cue updates
      if (Math.sin(phaseRef.current) > 0.05) {
        setBreathCue('Exhale slowly with the swing...');
      } else {
        setBreathCue('Inhale gently as the pendulum rises...');
      }

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
      <div className="w-72 h-72 flex items-center justify-center relative">
        <svg
          viewBox="-120 0 240 240"
          className="w-full h-full overflow-visible"
          aria-hidden="true"
        >
          {/* Subtle arc track */}
          <path
            d="M -90 190 A 200 200 0 0 0 90 190"
            fill="none"
            stroke="#E6DEC8"
            strokeWidth="1.5"
            strokeDasharray="4 4"
          />

          {/* Pivot point */}
          <circle cx="0" cy="15" r="4" fill="#6E5D53" />

          {/* Swinging group */}
          <g transform={`rotate(${angleDeg}, 0, 15)`}>
            {/* Cord */}
            <line
              x1="0"
              y1="15"
              x2="0"
              y2="190"
              stroke="#6E5D53"
              strokeWidth="1.5"
            />
            {/* Terracotta bob */}
            <circle
              cx="0"
              cy="190"
              r="22"
              fill="#E8997A"
              stroke="#D97B66"
              strokeWidth="2"
            />
            <circle cx="0" cy="190" r="10" fill="#FAF6EE" opacity="0.4" />
          </g>
        </svg>
      </div>

      <p className="mt-8 text-espressoInk font-serif text-2xl tracking-tight">
        {breathCue}
      </p>
      <p className="mt-2 text-warmUmber text-sm">
        Allow the weight of your shoulders to match the settling arc.
      </p>
    </div>
  );
};
