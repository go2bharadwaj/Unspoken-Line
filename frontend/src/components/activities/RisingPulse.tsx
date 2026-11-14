import React, { useEffect, useState, useRef } from 'react';
import { EmotionScores } from '../../types';

interface Props {
  sessionId: string;
  scores: EmotionScores;
  durationSec: number;
  onMark: (patch: { calm_anchor?: boolean; aura_hex?: string }) => void;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  speed: number;
  opacity: number;
}

export const RisingPulse: React.FC<Props> = () => {
  const [phaseText, setPhaseText] = useState('Inhale gently (6s)');
  const [breathRatio, setBreathRatio] = useState(0); // 0 to 1
  const [particles, setParticles] = useState<Particle[]>([]);
  const animRef = useRef<number | null>(null);
  const startRef = useRef<number>(performance.now());

  useEffect(() => {
    // Generate initial particles
    const initParticles: Particle[] = Array.from({ length: 24 }, (_, i) => ({
      id: i,
      x: 20 + Math.random() * 200,
      y: 50 + Math.random() * 180,
      size: 3 + Math.random() * 5,
      speed: 0.3 + Math.random() * 0.5,
      opacity: 0.2 + Math.random() * 0.6,
    }));
    setParticles(initParticles);

    const cycleMs = 10000; // 6s Inhale + 4s Exhale = 10s cycle

    const loop = (now: number) => {
      const elapsed = (now - startRef.current) % cycleMs;
      if (elapsed < 6000) {
        // Inhale: 0 -> 1
        const r = elapsed / 6000;
        setBreathRatio(r);
        setPhaseText('Inhale gently upward (6s)');
      } else {
        // Exhale: 1 -> 0
        const r = 1 - (elapsed - 6000) / 4000;
        setBreathRatio(r);
        setPhaseText('Exhale softly (4s)');
      }

      setParticles((prev) =>
        prev.map((p) => {
          let nextY = p.y - p.speed * 1.5;
          if (nextY < 10) nextY = 230;
          return { ...p, y: nextY };
        })
      );

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
      <div className="w-72 h-72 rounded-2xl border border-borderHairline bg-turmericMist/20 relative overflow-hidden flex items-center justify-center p-4">
        {/* Particle field */}
        <svg
          viewBox="0 0 240 240"
          className="w-full h-full absolute inset-0 overflow-visible"
          aria-hidden="true"
        >
          {particles.map((p) => (
            <circle
              key={p.id}
              cx={p.x}
              cy={p.y}
              r={p.size}
              fill="#F2C97D"
              opacity={p.opacity}
            />
          ))}

          {/* Central rising core */}
          <circle
            cx="120"
            cy="120"
            r={30 + breathRatio * 24}
            fill="#E8997A"
            opacity="0.3"
          />
          <circle
            cx="120"
            cy="120"
            r={16 + breathRatio * 14}
            fill="#F2C97D"
            opacity="0.7"
          />
        </svg>
      </div>

      <p className="mt-8 text-espressoInk font-serif text-2xl tracking-tight">
        {phaseText}
      </p>
      <p className="mt-2 text-warmUmber text-sm">
        Six seconds to draw energy upward, four seconds to softly release.
      </p>
    </div>
  );
};
