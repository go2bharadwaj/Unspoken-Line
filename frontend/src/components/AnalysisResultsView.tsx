import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AnalyzeSketchResponse,
  Activity,
  EmotionKey,
  EmotionScores,
} from '../types';
import { LEARN_MORE, getActivitiesForClass } from '../lib/activities';

interface Props {
  result: AnalyzeSketchResponse;
  onOpenActivity: (activity: Activity) => void;
  onDone: () => void;
}

const SCORE_CONFIGS: Array<{
  key: EmotionKey;
  label: string;
  colorHex: string;
}> = [
  { key: 'stress', label: 'Stress', colorHex: '#D97B66' },
  { key: 'anxiety', label: 'Anxiety', colorHex: '#E8997A' },
  { key: 'mental_fatigue', label: 'Mental Fatigue', colorHex: '#6E5D53' },
  { key: 'calm_flow', label: 'Calm Flow', colorHex: '#7A9A8B' },
  { key: 'radiant_joy', label: 'Radiant Joy', colorHex: '#F2C97D' },
];

export const AnalysisResultsView: React.FC<Props> = ({
  result,
  onOpenActivity,
  onDone,
}) => {
  const [learnMoreOpen, setLearnMoreOpen] = useState(false);

  const scores: EmotionScores = result.merged_scores || {
    stress: 0.2,
    anxiety: 0.2,
    mental_fatigue: 0.2,
    calm_flow: 0.2,
    radiant_joy: 0.2,
  };

  const activities =
    result.recommended_activities && result.recommended_activities.length > 0
      ? result.recommended_activities
      : getActivitiesForClass(result.primary_emotion_class);

  const primaryClass = result.primary_emotion_class || 'Calm Flow';
  const learnMoreDescription =
    LEARN_MORE[primaryClass] || LEARN_MORE['Calm Flow'];

  const clarityPercent = Math.round((result.confidence ?? 0.85) * 100);

  const flashSources = result.analysis_sources;
  const isFallback =
    flashSources?.flash === 'fallback' || flashSources?.jev === 'fallback';

  return (
    <div className="w-full max-w-2xl mx-auto p-6 flex flex-col gap-6 text-left">
      {/* Top Tag & Done button */}
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-widest text-warmUmber">
          Non-verbal Impression
        </span>
        <button
          type="button"
          onClick={onDone}
          className="text-xs text-warmUmber hover:text-espressoInk underline cursor-pointer"
        >
          Return to Sanctuary
        </button>
      </div>

      {/* Visual Reflection Text Card */}
      {result.visual_reflection_text && (
        <div className="rounded-3xl border border-borderHairline bg-canvasPaper p-6 sm:p-8">
          <span className="text-xs uppercase tracking-widest text-peachTerracotta font-medium mb-2 block">
            Visual Reflection
          </span>
          <p className="font-serif text-2xl sm:text-3xl text-espressoInk font-medium leading-relaxed tracking-tight">
            “{result.visual_reflection_text}”
          </p>
        </div>
      )}

      {/* Primary Class & Score Breakdown Card */}
      <div className="rounded-3xl border border-borderHairline bg-canvasPaper p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 mb-6 pb-4 border-b border-borderHairline">
          <div>
            <span className="text-xs uppercase tracking-widest text-warmUmber">
              Primary Characteristic
            </span>
            <h3 className="font-serif text-3xl font-medium text-espressoInk tracking-tight mt-0.5">
              {primaryClass}
            </h3>
          </div>
          <div className="text-xs text-warmUmber flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-sageCalm" />
            Reading clarity: {clarityPercent}%
          </div>
        </div>

        {/* 5 Horizontal Hairline Bars */}
        <div className="flex flex-col gap-4">
          {SCORE_CONFIGS.map((cfg) => {
            const val = scores[cfg.key] ?? 0;
            const pct = Math.round(val * 100);

            return (
              <div key={cfg.key} className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-medium text-espressoInk">
                    {cfg.label}
                  </span>
                  <span className="text-warmUmber font-mono">{pct}%</span>
                </div>
                <div className="w-full bg-borderHairline/40 h-1 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: cfg.colorHex }}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recommended Activity Pills */}
      <div className="rounded-3xl border border-borderHairline bg-canvasPaper p-6 sm:p-8">
        <span className="text-xs uppercase tracking-widest text-warmUmber mb-2 block">
          Recommended Alignments
        </span>
        <h4 className="font-serif text-xl sm:text-2xl font-medium text-espressoInk tracking-tight mb-4">
          Three Practices for {primaryClass}
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {activities.slice(0, 3).map((act, index) => (
            <button
              key={act.id}
              type="button"
              onClick={() => onOpenActivity(act)}
              className="p-4 rounded-2xl border border-borderHairline bg-turmericMist/20 hover:bg-turmericMist/50 text-left transition-all flex flex-col justify-between cursor-pointer group"
            >
              <div className="flex items-center gap-1.5 mb-3 text-warmUmber">
                {/* 3 small circles indicator */}
                <span
                  className={`w-2 h-2 rounded-full ${
                    index === 0 ? 'bg-peachTerracotta' : 'border border-warmUmber/40'
                  }`}
                />
                <span
                  className={`w-2 h-2 rounded-full ${
                    index === 1 ? 'bg-peachTerracotta' : 'border border-warmUmber/40'
                  }`}
                />
                <span
                  className={`w-2 h-2 rounded-full ${
                    index === 2 ? 'bg-peachTerracotta' : 'border border-warmUmber/40'
                  }`}
                />
              </div>

              <div>
                <h5 className="font-serif text-lg font-medium text-espressoInk tracking-tight group-hover:text-peachTerracotta transition-colors">
                  {act.title}
                </h5>
                <p className="text-xs text-warmUmber mt-1">
                  {act.duration_sec}s · Practice
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Trend Summary Text Card if available */}
      {result.trend_summary_text && (
        <div className="rounded-2xl border border-borderHairline bg-turmericMist/25 p-5">
          <p className="text-sm text-espressoInk leading-relaxed">
            {result.trend_summary_text}
          </p>
        </div>
      )}

      {/* "Learn More" Expandable Drawer */}
      <div className="rounded-3xl border border-borderHairline bg-canvasPaper overflow-hidden">
        <button
          type="button"
          onClick={() => setLearnMoreOpen(!learnMoreOpen)}
          aria-expanded={learnMoreOpen}
          className="w-full p-6 flex items-center justify-between text-left hover:bg-turmericMist/15 transition-colors cursor-pointer"
        >
          <div>
            <span className="text-xs uppercase tracking-widest text-warmUmber block">
              Stroke Geometry & Vision
            </span>
            <span className="font-serif text-xl font-medium text-espressoInk tracking-tight">
              Learn how your lines mapped to {primaryClass}
            </span>
          </div>
          <span className="text-warmUmber font-serif text-xl">
            {learnMoreOpen ? '−' : '+'}
          </span>
        </button>

        <AnimatePresence>
          {learnMoreOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="border-t border-borderHairline p-6 sm:p-8 flex flex-col gap-6"
            >
              <div>
                <h5 className="text-xs uppercase tracking-widest text-warmUmber mb-2">
                  Stroke Signature Analysis
                </h5>
                <p className="text-sm text-espressoInk leading-relaxed">
                  {learnMoreDescription}
                </p>
              </div>

              {/* Stroke Evidence Bullets */}
              {result.stroke_evidence_bullets &&
                result.stroke_evidence_bullets.length > 0 && (
                  <div>
                    <h5 className="text-xs uppercase tracking-widest text-warmUmber mb-2">
                      Visual Evidence Observed
                    </h5>
                    <ul className="flex flex-col gap-2 text-sm text-espressoInk/90">
                      {result.stroke_evidence_bullets.map((bullet, idx) => (
                        <li key={idx} className="flex items-start gap-2.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-peachTerracotta mt-2 shrink-0" />
                          <span>{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

              {/* Flash vs Jev Comparison Table */}
              <div>
                <h5 className="text-xs uppercase tracking-widest text-warmUmber mb-3">
                  Model Calibration (Flash vs Jev)
                </h5>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-borderHairline text-warmUmber">
                        <th className="py-2 pr-4 font-normal">Metric</th>
                        <th className="py-2 px-4 font-normal">Gemini Flash</th>
                        <th className="py-2 px-4 font-normal">Jev Engine</th>
                        <th className="py-2 pl-4 font-normal">Merged</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-borderHairline/40">
                      {SCORE_CONFIGS.map((cfg) => {
                        const f = result.flash_scores?.[cfg.key] ?? 0;
                        const j = result.jev_scores?.[cfg.key] ?? 0;
                        const m = scores[cfg.key] ?? 0;

                        return (
                          <tr key={cfg.key} className="text-espressoInk">
                            <td className="py-2 pr-4 font-medium">{cfg.label}</td>
                            <td className="py-2 px-4 font-mono">
                              {Math.round(f * 100)}%
                            </td>
                            <td className="py-2 px-4 font-mono">
                              {Math.round(j * 100)}%
                            </td>
                            <td className="py-2 pl-4 font-mono font-medium">
                              {Math.round(m * 100)}%
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Source Fallback Note */}
              <div className="pt-2 text-xs text-warmUmber border-t border-borderHairline/60">
                {isFallback ? (
                  <p>
                    One or more vision sources operated in offline deterministic stroke-analysis fallback mode.
                  </p>
                ) : (
                  <p>
                    Parallel AI evaluation active: Gemini 3.8 Flash + Jev dual calibration.
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Done Button */}
      <div className="flex justify-center mt-4">
        <button
          type="button"
          onClick={onDone}
          className="px-8 py-3.5 rounded-full bg-peachTerracotta text-canvasPaper font-medium hover:bg-peachTerracotta/90 transition-colors cursor-pointer text-base"
        >
          Finish Sanctuary Session
        </button>
      </div>

      {/* Medical Device Footnote */}
      <footer className="text-center text-xs text-warmUmber/70 pt-4 pb-8">
        Unspoken Line is not a medical device. Scores describe visual drawing dynamics, not personal health.
      </footer>
    </div>
  );
};
