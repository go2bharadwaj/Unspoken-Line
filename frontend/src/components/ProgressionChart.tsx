import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { StoredSession } from '../types';

interface Props {
  sessions: StoredSession[];
}

interface ChartPoint {
  id: string;
  dateLabel: string;
  stress: number;
  anxiety: number;
  calm_flow: number;
  calm_anchor?: boolean;
}

interface DotProps {
  cx?: number;
  cy?: number;
  payload?: ChartPoint;
}

export const ProgressionChart: React.FC<Props> = ({ sessions }) => {
  const [demoEnabled, setDemoEnabled] = useState<boolean>(
    sessions.length < 2
  );

  const chartData = useMemo<ChartPoint[]>(() => {
    const points: ChartPoint[] = [];
    const now = new Date();
    const todayDateStr = now.toDateString();

    // 5 Seeded demo points spaced 1 day apart ending yesterday
    if (demoEnabled) {
      const demoBaselines = [
        { dayOffset: 5, stress: 0.68, anxiety: 0.62, calm: 0.25, anchor: false },
        { dayOffset: 4, stress: 0.64, anxiety: 0.58, calm: 0.32, anchor: false },
        { dayOffset: 3, stress: 0.56, anxiety: 0.52, calm: 0.40, anchor: true },
        { dayOffset: 2, stress: 0.50, anxiety: 0.46, calm: 0.48, anchor: false },
        { dayOffset: 1, stress: 0.44, anxiety: 0.40, calm: 0.55, anchor: true },
      ];

      demoBaselines.forEach((b, idx) => {
        const d = new Date(now.getTime() - b.dayOffset * 86400000);
        const dateLabel = d.toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
        });
        points.push({
          id: `demo_${idx}`,
          dateLabel,
          stress: b.stress,
          anxiety: b.anxiety,
          calm_flow: b.calm,
          calm_anchor: b.anchor,
        });
      });
    }

    // User sessions (oldest to newest)
    sessions.forEach((s) => {
      const d = new Date(s.created_at);
      const isToday = d.toDateString() === todayDateStr;
      const dateLabel = isToday
        ? 'Today'
        : d.toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
          });

      points.push({
        id: s.id,
        dateLabel,
        stress: s.scores.stress,
        anxiety: s.scores.anxiety,
        calm_flow: s.scores.calm_flow,
        calm_anchor: s.calm_anchor,
      });
    });

    return points;
  }, [sessions, demoEnabled]);

  // Client-side trend text computation
  const trendText = useMemo(() => {
    if (chartData.length < 2) return null;
    const first = chartData[0];
    const last = chartData[chartData.length - 1];

    const stressChange = Math.round((first.stress - last.stress) * 100);
    const calmChange = Math.round((last.calm_flow - first.calm_flow) * 100);

    const stressPart =
      stressChange > 0
        ? `stress-shaped tension has eased by ${stressChange}%`
        : stressChange < 0
        ? `stroke tension shifted by ${Math.abs(stressChange)}%`
        : 'drawing pressure remained steady';

    const calmPart =
      calmChange > 0
        ? `calm flow rose by ${calmChange}%`
        : calmChange < 0
        ? `calm rhythm fluctuated by ${Math.abs(calmChange)}%`
        : 'calm flow held unbroken';

    return `Across your last ${chartData.length} sketches, ${stressPart} while ${calmPart}.`;
  }, [chartData]);

  const renderCalmDot = (props: DotProps) => {
    const { cx, cy, payload } = props;
    if (cx === undefined || cy === undefined) return <g />;
    if (payload?.calm_anchor) {
      return (
        <circle
          cx={cx}
          cy={cy}
          r={5.5}
          fill="#7A9A8B"
          stroke="#FAF6EE"
          strokeWidth={2}
        />
      );
    }
    return <circle cx={cx} cy={cy} r={2.5} fill="#7A9A8B" opacity={0.6} />;
  };

  return (
    <div className="w-full max-w-2xl mx-auto rounded-3xl border border-borderHairline bg-canvasPaper p-6 text-left my-8">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <span className="text-xs uppercase tracking-widest text-warmUmber">
            Non-verbal Progression
          </span>
          <h3 className="font-serif text-2xl font-medium text-espressoInk tracking-tight mt-0.5">
            Emotional Rhythm Over Time
          </h3>
        </div>

        <button
          type="button"
          onClick={() => setDemoEnabled(!demoEnabled)}
          aria-pressed={demoEnabled}
          className={`px-4 py-1.5 rounded-full text-xs font-medium border transition-colors cursor-pointer self-start sm:self-auto ${
            demoEnabled
              ? 'bg-turmericMist/60 border-peachTerracotta text-espressoInk'
              : 'border-borderHairline text-warmUmber hover:text-espressoInk'
          }`}
        >
          Demo Baseline {demoEnabled ? 'Active' : 'Off'}
        </button>
      </div>

      {/* Empty State */}
      {chartData.length === 0 ? (
        <div className="py-16 text-center text-warmUmber border border-dashed border-borderHairline rounded-2xl">
          <p className="font-serif text-lg text-espressoInk mb-1">
            No sketches recorded yet
          </p>
          <p className="text-sm">
            Take a pen and paper to begin your first mindfulness session.
          </p>
        </div>
      ) : (
        <>
          {/* Chart Graphic */}
          <div className="w-full h-64 sm:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ top: 12, right: 12, bottom: 6, left: -20 }}
              >
                <CartesianGrid
                  stroke="#E6DEC8"
                  strokeDasharray="3 3"
                  vertical={false}
                />
                <XAxis
                  dataKey="dateLabel"
                  stroke="#6E5D53"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: '#E6DEC8' }}
                />
                <YAxis
                  stroke="#6E5D53"
                  fontSize={11}
                  domain={[0, 1]}
                  ticks={[0, 0.25, 0.5, 0.75, 1.0]}
                  tickLine={false}
                  axisLine={{ stroke: '#E6DEC8' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FAF6EE',
                    borderColor: '#E6DEC8',
                    borderRadius: '12px',
                    fontSize: '12px',
                    color: '#2C221E',
                    boxShadow: 'none',
                  }}
                  formatter={(value: unknown, name: unknown) => [
                    typeof value === 'number' ? `${Math.round(value * 100)}%` : String(value ?? ''),
                    name === 'stress'
                      ? 'Stress'
                      : name === 'anxiety'
                      ? 'Anxiety'
                      : 'Calm Flow',
                  ]}
                />
                <Line
                  type="monotone"
                  dataKey="stress"
                  name="stress"
                  stroke="#D97B66"
                  strokeWidth={2}
                  dot={{ r: 2.5, fill: '#D97B66' }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="anxiety"
                  name="anxiety"
                  stroke="#E8997A"
                  strokeWidth={2}
                  dot={{ r: 2.5, fill: '#E8997A' }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="calm_flow"
                  name="calm_flow"
                  stroke="#7A9A8B"
                  strokeWidth={2.5}
                  dot={renderCalmDot}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center justify-center gap-6 mt-4 pt-3 border-t border-borderHairline text-xs text-warmUmber">
            <span className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blushClay inline-block" />
              Stress
            </span>
            <span className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-peachTerracotta inline-block" />
              Anxiety
            </span>
            <span className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-sageCalm inline-block" />
              Calm Flow
            </span>
            <span className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-full border border-sageCalm bg-sageCalm/30 inline-block" />
              Calm Anchor
            </span>
          </div>

          {/* Trend Summary Text Card */}
          {trendText && (
            <div className="mt-5 rounded-2xl bg-turmericMist/25 border border-borderHairline p-4">
              <p className="text-sm text-espressoInk leading-relaxed">
                {trendText}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
};
