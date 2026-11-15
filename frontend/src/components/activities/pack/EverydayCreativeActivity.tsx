import React, { useRef, useState } from 'react';
import { C, PackProps, Shell } from './kit';

const SWATCHES = [
  { hex: '#F2C97D', name: 'Sunlit Amber' },
  { hex: '#E8997A', name: 'Peach Terracotta' },
  { hex: '#D97B66', name: 'Blush Clay' },
  { hex: '#7A9A8B', name: 'Sage Calm' },
  { hex: '#F5E6C4', name: 'Turmeric Mist' },
  { hex: '#E6DEC8', name: 'Paper Hairline' },
];
const W = 400;
const H = 300;

interface Stroke {
  color: string;
  pts: [number, number][];
}
// A single tap becomes a zero-length segment, which a round linecap draws as a dot.
const toPath = (p: [number, number][]) => `M ${p[0][0]} ${p[0][1]} ` + p.slice(1).map(([x, y]) => `L ${x} ${y}`).join(' ') + (p.length === 1 ? ' l 0 0' : '');

// Family: DRAWING (open-ended, no end bowl). Freehand strokes kept as SVG paths in local state only.
export const EverydayCreativeActivity: React.FC<PackProps> = ({ activity, onClose }) => {
  const [color, setColor] = useState(SWATCHES[1].hex);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const drawing = useRef(false);
  const svgRef = useRef<SVGSVGElement>(null);

  const at = (e: React.PointerEvent): [number, number] => {
    const r = svgRef.current!.getBoundingClientRect();
    return [Math.round(((e.clientX - r.left) / r.width) * W), Math.round(((e.clientY - r.top) / r.height) * H)];
  };
  const down = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    const p = at(e);
    setStrokes((s) => [...s, { color, pts: [p] }]);
  };
  const move = (e: React.PointerEvent) => {
    if (!drawing.current) return;
    const p = at(e);
    setStrokes((s) => s.map((st, i) => (i === s.length - 1 ? { ...st, pts: [...st.pts, p] } : st)));
  };
  const up = () => {
    drawing.current = false;
  };

  return (
    <Shell
      activity={activity}
      done
      onClose={onClose}
      art={
        <div className="w-full rounded-2xl border border-borderHairline bg-canvasPaper relative overflow-hidden">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${W} ${H}`}
            className="w-full h-auto block cursor-crosshair"
            style={{ touchAction: 'none' }}
            role="img"
            aria-label="Drawing canvas"
            onPointerDown={down}
            onPointerMove={move}
            onPointerUp={up}
            onPointerCancel={up}
          >
            {strokes.map((s, i) => (
              <path key={i} d={toPath(s.pts)} fill="none" stroke={s.color} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
            ))}
          </svg>
        </div>
      }
    >
      <div className="mt-5 flex items-center gap-3">
        {SWATCHES.map((s) => (
          <button
            key={s.hex}
            type="button"
            aria-label={`Ink ${s.name}`}
            aria-pressed={color === s.hex}
            onClick={() => setColor(s.hex)}
            className="w-8 h-8 rounded-full border cursor-pointer transition-transform"
            style={{ background: s.hex, borderColor: color === s.hex ? C.ink : C.hair, transform: color === s.hex ? 'scale(1.18)' : 'none' }}
          />
        ))}
      </div>
      <div className="mt-3 flex gap-5 text-sm text-warmUmber">
        <button type="button" className="underline cursor-pointer" onClick={() => setStrokes((s) => s.slice(0, -1))}>
          Undo
        </button>
        <button type="button" className="underline cursor-pointer" onClick={() => setStrokes([])}>
          Clear
        </button>
      </div>
      <p className="text-[11px] text-warmUmber/70 mt-2">Stays on this screen. Nothing is saved or sent.</p>
    </Shell>
  );
};
