import React, { useState, useEffect, useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { TimerDurationSec } from '../types';
import { unlockAudio, playChime } from '../lib/sound';
import { BackButton } from './BackButton';

interface Props {
  onComplete: (durationSec: TimerDurationSec) => void;
  onBack: () => void;
}

type RitualState = 'idle' | 'pause' | 'drawing' | 'ended';

export const DrawingTimerRitual: React.FC<Props> = ({ onComplete, onBack }) => {
  const [duration, setDuration] = useState<TimerDurationSec>(15);
  const [state, setState] = useState<RitualState>('idle');
  const [pauseCount, setPauseCount] = useState(3);
  const [announcement, setAnnouncement] = useState('');
  const shouldReduceMotion = useReducedMotion();

  const timersRef = useRef<number[]>([]);

  const addTimer = (id: number) => {
    timersRef.current.push(id);
  };

  const clearAllTimers = () => {
    timersRef.current.forEach((id) => clearTimeout(id));
    timersRef.current = [];
  };

  useEffect(() => {
    return () => clearAllTimers();
  }, []);

  const handleStart = async () => {
    clearAllTimers();
    await unlockAudio();
    setState('pause');
    setPauseCount(3);
    setAnnouncement('Pen to paper...');

    const p3 = window.setTimeout(() => setPauseCount(2), 1000);
    const p2 = window.setTimeout(() => setPauseCount(1), 2000);
    const p1 = window.setTimeout(() => {
      setState('drawing');
      setAnnouncement('Drawing');
      startDrawingTimer();
    }, 3000);

    addTimer(p3);
    addTimer(p2);
    addTimer(p1);
  };

  const startDrawingTimer = () => {
    const endTimer = window.setTimeout(() => {
      finishRitual();
    }, duration * 1000);
    addTimer(endTimer);
  };

  const finishRitual = () => {
    clearAllTimers();
    setState('ended');
    setAnnouncement('Time to lay your pen down');
    playChime({ fundamental: 196, gain: 0.35 });

    const completeTimer = window.setTimeout(() => {
      onComplete(duration);
    }, 1200);
    addTimer(completeTimer);
  };

  const handleStopEarly = () => {
    finishRitual();
  };

  return (
    <div className="w-full min-h-[75vh] flex flex-col items-center justify-center p-6 text-center relative select-none">
      {/* Screen Reader Live Region */}
      <div className="sr-only" aria-live="polite">
        {announcement}
      </div>

      {state === 'idle' && (
        <div className="w-full max-w-md mx-auto flex flex-col items-center">
          <BackButton onClick={onBack} />
          <span className="text-xs uppercase tracking-widest text-warmUmber mb-2">
            Non-Verbal Ritual
          </span>

          <h2 className="font-serif text-3xl sm:text-4xl font-medium text-espressoInk tracking-tight mb-4">
            Take a pen and paper.
          </h2>

          <p className="text-espressoInk/80 text-base leading-relaxed mb-8 max-w-sm">
            Let your hand move without speaking. Follow the rhythm of the lines without expectation.
          </p>

          {/* Duration Pills */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-10">
            {([5, 10, 15, 30, 60] as TimerDurationSec[]).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDuration(d)}
                aria-pressed={duration === d}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all cursor-pointer ${
                  duration === d
                    ? 'bg-peachTerracotta text-canvasPaper shadow-none'
                    : 'bg-turmericMist/40 border border-borderHairline text-warmUmber hover:text-espressoInk'
                }`}
              >
                {d}s {d === 15 && <span className="opacity-75 text-xs">(Default)</span>}
              </button>
            ))}
          </div>

          {/* Begin CTA */}
          <button
            type="button"
            onClick={handleStart}
            className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-peachTerracotta text-canvasPaper font-medium hover:bg-peachTerracotta/90 transition-colors shadow-none text-base cursor-pointer"
          >
            Begin Drawing
          </button>
        </div>
      )}

      {state === 'pause' && (
        <div className="flex flex-col items-center justify-center">
          <motion.div
            key={pauseCount}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="w-32 h-32 rounded-full border border-peachTerracotta/60 flex items-center justify-center bg-turmericMist/20"
          >
            <span className="font-serif text-4xl text-espressoInk font-medium">
              {pauseCount}
            </span>
          </motion.div>
          <p className="font-serif text-2xl text-espressoInk tracking-tight mt-6">
            Pen to paper...
          </p>
          <p className="text-sm text-warmUmber mt-1">
            Let your breath settle as your hand readies.
          </p>
        </div>
      )}

      {(state === 'drawing' || state === 'ended') && (
        <div className="fixed inset-0 z-40 bg-canvasPaper flex flex-col items-center justify-center overflow-hidden">
          {/* Growing Orb */}
          <motion.div
            className="rounded-full flex items-center justify-center pointer-events-none"
            style={{
              background:
                'radial-gradient(circle, #F2C97D 0%, #E8997A 60%, #FAF6EE 100%)',
            }}
            initial={{
              width: '20vmin',
              height: '20vmin',
              opacity: 0.5,
            }}
            animate={{
              width: shouldReduceMotion ? '60vmin' : '180vmax',
              height: shouldReduceMotion ? '60vmin' : '180vmax',
              opacity: shouldReduceMotion ? 0.8 : 0.9,
            }}
            transition={{
              duration: duration,
              ease: 'linear',
            }}
          />

          {/* Status Label (No ticking digits) */}
          <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none">
            <p className="font-serif text-2xl sm:text-3xl text-espressoInk/90 tracking-tight">
              {state === 'drawing'
                ? 'Let your lines flow freely'
                : 'Time to lay your pen down'}
            </p>
            <p className="text-warmUmber text-sm mt-2">
              {state === 'drawing' ? 'No words. Only movement.' : 'Listen to the bowl chime...'}
            </p>
          </div>

          {/* Stop Early quiet button */}
          {state === 'drawing' && (
            <div className="absolute bottom-10 z-20">
              <button
                type="button"
                onClick={handleStopEarly}
                className="px-5 py-2 rounded-full border border-espressoInk/20 text-espressoInk/70 hover:text-espressoInk hover:bg-canvasPaper/40 transition-colors text-xs tracking-wider uppercase cursor-pointer"
              >
                Stop early
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
