import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AnalyzeSketchResponse,
  Activity,
  EmotionKey,
  EmotionScores,
  RATING_CHOICES,
} from '../types';
import { LEARN_MORE, formatDuration, getActivitiesForClass } from '../lib/activities';
import { StreamedParagraphs } from './StreamedParagraphs';

interface Props {
  result: AnalyzeSketchResponse;
  onOpenActivity: (activity: Activity) => void;
  onDone: () => void;
  /** A reading that was just generated streams in; one reopened from history shows at once */
  streamText?: boolean;
  /** The photo just analyzed, held only in this tab's memory; past readings have none */
  photoUrl?: string;
  /** This reading's accuracy rating, if given */
  rating?: number;
  /** Absent when the session wasn't saved, so there is nothing to attach a rating to */
  onRate?: (rating: number) => Promise<void>;
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
  streamText = false,
  photoUrl,
  rating,
  onRate,
}) => {
  const [ratingError, setRatingError] = useState(false);
  const rate = async (n: number) => {
    setRatingError(false);
    try {
      await onRate?.(n);
    } catch {
      setRatingError(true);
    }
  };
  const [learnMoreOpen, setLearnMoreOpen] = useState(false);
  // The progression part follows the reading, like a second paragraph being written
  const [readingDone, setReadingDone] = useState(!streamText);
  const [showAllPractices, setShowAllPractices] = useState(false);

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

  // Jev is off, so Gemini is the only model; when it fails, scores come from stroke measurements.
  // Unknown for readings saved before history kept the source.
  const source = result.analysis_sources?.flash;
  const geminiAnswered = source === 'gemini';

  return (
    <div className="w-full max-w-2xl mx-auto p-6 flex flex-col gap-6 text-left">
      <div className="flex items-center justify-between gap-3">
        {/* The practices sit below a long reading, so offer a way straight to them */}
        <button
          type="button"
          onClick={() =>
            document.getElementById('practices')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-turmericMist/50 border border-peachTerracotta/40 text-xs font-medium text-espressoInk hover:bg-turmericMist/80 transition-colors cursor-pointer"
        >
          <PlayIcon className="w-3 h-3" />
          Try a practice
        </button>
        <button
          type="button"
          onClick={onDone}
          className="text-xs text-warmUmber hover:text-espressoInk underline cursor-pointer"
        >
          Return to Sanctuary
        </button>
      </div>

      {!result.visual_reflection_text && (
        <p className="rounded-2xl border border-dashed border-borderHairline px-5 py-4 text-sm text-warmUmber">
          This session was saved before readings were kept, so only its scores are here.
        </p>
      )}

      {photoUrl && (
        <figure className="rounded-3xl border border-borderHairline bg-turmericMist/15 p-3 flex flex-col items-center gap-2">
          <img
            src={photoUrl}
            alt="The drawing you just photographed"
            className="w-full max-h-72 sm:max-h-96 object-contain rounded-2xl"
          />
          <figcaption className="text-[11px] text-warmUmber">
            Your drawing · shown only on this screen, never saved
          </figcaption>
        </figure>
      )}

      {/* Gemini's free-form reading of the drawing */}
      {result.visual_reflection_text && (
        <section className="rounded-3xl border border-borderHairline bg-canvasPaper p-6 sm:p-8">
          <h2 className="font-serif text-2xl sm:text-3xl font-medium text-espressoInk tracking-tight leading-snug mb-4">
            What does this drawing say about my current mental state?
          </h2>
          <StreamedParagraphs
            text={result.visual_reflection_text}
            animate={streamText}
            onDone={() => setReadingDone(true)}
          />

          {/* From the second session on: how this reading compares with the user's progression notes */}
          {result.progression_reflection_text && readingDone && (
            <div className="mt-6 pt-6 border-t border-borderHairline">
              <h3 className="font-serif text-xl sm:text-2xl font-medium text-espressoInk tracking-tight mb-3">
                Since your last drawing
              </h3>
              <StreamedParagraphs text={result.progression_reflection_text} animate={streamText} />
            </div>
          )}
        </section>
      )}

      {/* Recommended practices: small squares side by side, styled as things to press */}
      <section id="practices" className="scroll-mt-24">
        <h3 className="font-serif text-xl sm:text-2xl font-medium text-espressoInk tracking-tight">
          Try a practice
        </h3>
        <p className="text-sm text-warmUmber mb-3">
          Three short exercises for {primaryClass}. Tap one to begin.
        </p>
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {(showAllPractices ? activities : activities.slice(0, 3)).map((act) => (
            <button
              key={act.id}
              type="button"
              onClick={() => onOpenActivity(act)}
              className="aspect-square p-2.5 sm:p-4 rounded-2xl border border-peachTerracotta/40 bg-turmericMist/40 hover:bg-turmericMist/70 hover:border-peachTerracotta text-left transition-colors flex flex-col justify-between cursor-pointer group"
            >
              <span className="w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-peachTerracotta text-canvasPaper flex items-center justify-center group-hover:scale-105 transition-transform">
                <PlayIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5 ml-0.5" />
              </span>
              <span>
                <span className="block font-serif text-sm sm:text-lg leading-tight font-medium text-espressoInk">
                  {act.title}
                </span>
                <span className="block text-[11px] sm:text-xs text-warmUmber mt-0.5">
                  {formatDuration(act.duration_sec)}
                </span>
              </span>
            </button>
          ))}
        </div>
        {activities.length > 3 && (
          <button
            type="button"
            onClick={() => setShowAllPractices((v) => !v)}
            className="mt-3 text-sm text-warmUmber hover:text-espressoInk underline cursor-pointer"
          >
            {showAllPractices ? 'Show fewer' : `More practices (${activities.length - 3})`}
          </button>
        )}
      </section>

      {/* Emotion scores */}
      <div className="rounded-3xl border border-borderHairline bg-canvasPaper p-6 sm:p-8">
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

              {/* Gemini calibration (Jev is off) */}
              <div>
                <h5 className="text-xs uppercase tracking-widest text-warmUmber mb-3">
                  Model Calibration (Gemini)
                </h5>
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-borderHairline text-warmUmber">
                      <th className="py-2 pr-4 font-normal">Metric</th>
                      <th className="py-2 pl-4 font-normal text-right">
                        {geminiAnswered ? 'Gemini' : source ? 'Stroke analysis' : 'Score'}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-borderHairline/40">
                    {SCORE_CONFIGS.map((cfg) => (
                      <tr key={cfg.key} className="text-espressoInk">
                        <td className="py-2 pr-4 font-medium">{cfg.label}</td>
                        <td className="py-2 pl-4 font-mono text-right">
                          {Math.round((result.flash_scores?.[cfg.key] ?? 0) * 100)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {source && (
                <div className="pt-2 text-xs text-warmUmber border-t border-borderHairline/60">
                  {geminiAnswered ? (
                    <p>Scored by Gemini from the photo of your sketch.</p>
                  ) : (
                    <p>
                      Gemini was unavailable for this sketch, so the reading and scores come from
                      stroke measurements instead.
                    </p>
                  )}
                </div>
              )}
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

      {/* Accuracy rating: quiet, at the bottom */}
      {onRate && (
        <section
          aria-labelledby="rating-label"
          className="flex flex-col items-center gap-2 text-center"
        >
          <span id="rating-label" className="text-xs text-warmUmber">
            {rating ? `You rated this reading ${rating} out of 10` : 'How accurate was this reading?'}
          </span>
          <div className="flex flex-wrap justify-center gap-1">
            {RATING_CHOICES.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => rate(n)}
                aria-pressed={rating === n}
                aria-label={`${n} out of 10`}
                className={`w-7 h-7 rounded-full text-[11px] transition-colors cursor-pointer ${
                  rating === n
                    ? 'bg-peachTerracotta text-canvasPaper'
                    : 'border border-borderHairline text-warmUmber/80 hover:text-espressoInk hover:border-warmUmber/50'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
          <span className="text-[11px] text-warmUmber/60">
            1 is way off, 10 is spot on. You can't give it a 7.
          </span>
          {ratingError && (
            <span role="alert" className="text-[11px] text-blushClay">
              Couldn't save your rating. Try again.
            </span>
          )}
        </section>
      )}

      {/* Medical Device Footnote */}
      <footer className="text-center text-xs text-warmUmber/70 pt-4 pb-8">
        Unspoken Lines is not a medical device. Scores describe visual drawing dynamics, not personal health.
      </footer>
    </div>
  );
};

const PlayIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" className={`fill-current ${className ?? ''}`} aria-hidden="true">
    <path d="M7 4.5v15l13-7.5z" />
  </svg>
);
