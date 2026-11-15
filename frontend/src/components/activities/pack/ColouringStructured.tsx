import React, { useState } from 'react';
import { C, PackProps, Shell } from './kit';

const SWATCHES = [
  { hex: '#F2C97D', name: 'Sunlit Amber' },
  { hex: '#E8997A', name: 'Peach Terracotta' },
  { hex: '#D97B66', name: 'Blush Clay' },
  { hex: '#7A9A8B', name: 'Sage Calm' },
  { hex: '#F5E6C4', name: 'Turmeric Mist' },
  { hex: '#E6DEC8', name: 'Paper Hairline' },
];

const CX = 150;
const pt = (r: number, a: number) => `${(CX + r * Math.cos(a)).toFixed(2)} ${(CX + r * Math.sin(a)).toFixed(2)}`;
/** Annular sector with a small angular gap; outer edge bows out slightly so it reads as a petal. */
const seg = (r0: number, r1: number, i: number, n: number, off: number) => {
  const w = (Math.PI * 2) / n;
  const a0 = off + i * w + 0.02;
  const a1 = off + (i + 1) * w - 0.02;
  return `M ${pt(r0, a0)} L ${pt(r1, a0)} A ${r1} ${r1} 0 0 1 ${pt(r1, a1)} L ${pt(r0, a1)} A ${r0} ${r0} 0 0 0 ${pt(r0, a0)} Z`;
};

// Rings: [inner radius, outer radius, count, angular offset]
const RINGS: [number, number, number, number][] = [
  [100, 140, 12, -Math.PI / 2],
  [62, 98, 8, -Math.PI / 2],
  [26, 60, 5, -Math.PI / 2],
];
const REGIONS = [
  ...RINGS.flatMap(([r0, r1, n, off], ring) =>
    Array.from({ length: n }, (_, i) => ({ id: `r${ring}-${i}`, label: `Ring ${ring + 1}, petal ${i + 1}`, d: seg(r0, r1, i, n, off) }))
  ),
  { id: 'centre', label: 'Centre', d: `M ${pt(24, 0)} A 24 24 0 1 1 ${pt(24, Math.PI)} A 24 24 0 1 1 ${pt(24, 0)} Z` },
];

// Family: DRAWING (open-ended, no end bowl). Tap a petal to fill it; same colour again clears it.
export const ColouringStructured: React.FC<PackProps> = ({ activity, onClose }) => {
  const [sel, setSel] = useState(SWATCHES[0].hex);
  const [fills, setFills] = useState<Record<string, string>>({});
  const tap = (id: string) =>
    setFills((f) => {
      const next = { ...f };
      if (next[id] === sel) delete next[id];
      else next[id] = sel;
      return next;
    });

  return (
    <Shell
      activity={activity}
      done
      onClose={onClose}
      art={
        <div className="w-full rounded-2xl border border-borderHairline bg-canvasPaper relative overflow-hidden flex items-center justify-center p-3">
          <svg viewBox="0 0 300 300" className="w-full max-w-[20rem] h-auto" role="group" aria-label="Mandala to colour">
            {REGIONS.map((r) => (
              <path
                key={r.id}
                d={r.d}
                role="button"
                tabIndex={0}
                aria-label={`${r.label}${fills[r.id] ? ', filled' : ', empty'}`}
                fill={fills[r.id] ?? 'transparent'}
                stroke={C.ink}
                strokeOpacity="0.55"
                strokeWidth="0.6"
                className="cursor-pointer outline-none focus-visible:stroke-[2]"
                style={{ transition: 'fill 0.5s ease', pointerEvents: 'all' }}
                onClick={() => tap(r.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    tap(r.id);
                  }
                }}
              />
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
            aria-label={`Colour ${s.name}`}
            aria-pressed={sel === s.hex}
            onClick={() => setSel(s.hex)}
            className="w-8 h-8 rounded-full border cursor-pointer transition-transform"
            style={{
              background: s.hex,
              borderColor: sel === s.hex ? C.ink : C.hair,
              transform: sel === s.hex ? 'scale(1.18)' : 'none',
            }}
          />
        ))}
      </div>
      <button type="button" onClick={() => setFills({})} className="mt-3 text-sm text-warmUmber underline cursor-pointer">
        Clear
      </button>
    </Shell>
  );
};
