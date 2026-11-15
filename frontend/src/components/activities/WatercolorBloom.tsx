import React, { useEffect, useRef } from 'react';
import { EmotionScores } from '../../types';

interface Props {
  sessionId: string;
  scores: EmotionScores;
  durationSec: number;
  onMark: (patch: { calm_anchor?: boolean; aura_hex?: string }) => void;
}

export const WatercolorBloom: React.FC<Props> = ({ scores }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Paper background
    ctx.fillStyle = '#FAF6EE';
    ctx.fillRect(0, 0, width, height);

    // Simple deterministic pseudo-random generator from scores
    let seed =
      Math.floor(scores.stress * 100) +
      Math.floor(scores.anxiety * 200) +
      Math.floor(scores.calm_flow * 300) +
      Math.floor(scores.radiant_joy * 400) +
      1;
    const rnd = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };

    const colorMap: Array<{ key: keyof EmotionScores; color: string }> = [
      { key: 'radiant_joy', color: 'rgba(242, 201, 125, 0.45)' }, // sunlitAmber
      { key: 'calm_flow', color: 'rgba(122, 154, 139, 0.45)' },   // sageCalm
      { key: 'anxiety', color: 'rgba(232, 153, 122, 0.40)' },     // peachTerracotta
      { key: 'stress', color: 'rgba(217, 123, 102, 0.35)' },       // blushClay
      { key: 'mental_fatigue', color: 'rgba(110, 93, 83, 0.25)' }, // warmUmber
    ];

    // Draw layered organic watercolor circles
    colorMap.forEach(({ key, color }) => {
      const scoreVal = scores[key] ?? 0.3;
      const numBlobs = 3 + Math.floor(scoreVal * 5);
      const baseRadius = 30 + scoreVal * 70;

      for (let i = 0; i < numBlobs; i++) {
        const cx = width * 0.5 + (rnd() - 0.5) * width * 0.5;
        const cy = height * 0.5 + (rnd() - 0.5) * height * 0.5;
        const radius = baseRadius * (0.6 + rnd() * 0.8);

        ctx.beginPath();
        ctx.fillStyle = color;
        ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
        ctx.fill();
      }
    });

    // Subtle fine border
    ctx.strokeStyle = '#E6DEC8';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, width - 2, height - 2);
  }, [scores]);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `unspoken-lines-keepsake-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 'image/png');
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 text-center select-none max-w-md mx-auto">
      <div className="rounded-2xl overflow-hidden border border-borderHairline shadow-none bg-canvasPaper">
        <canvas
          ref={canvasRef}
          width={320}
          height={320}
          className="w-64 h-64 sm:w-72 sm:h-72 block"
        />
      </div>

      <button
        type="button"
        onClick={handleDownload}
        className="mt-6 px-6 py-2.5 rounded-full border border-peachTerracotta text-espressoInk hover:bg-turmericMist/50 transition-colors text-sm font-medium cursor-pointer"
      >
        Save Keepsake PNG
      </button>

      <p className="mt-4 text-espressoInk font-serif text-2xl tracking-tight">
        Generative Watercolor Keepsake
      </p>
      <p className="mt-2 text-warmUmber text-sm">
        Layers of organic translucent ink composed directly from your sketch’s emotional proportions.
      </p>
    </div>
  );
};
