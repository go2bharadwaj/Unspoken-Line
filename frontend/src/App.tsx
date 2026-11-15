import { useState, useEffect, useTransition } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { User } from "firebase/auth";
import {
  Activity,
  AnalyzeSketchResponse,
  EmotionScores,
  StoredSession,
  TimerDurationSec,
} from "./types";
import { analyzeSketch } from "./lib/api";
import {
  firebaseEnabled,
  signInWithGoogle,
  signOutUser,
  onUserChanged,
  saveSession,
  listSessions,
  markSession,
  clearHistory,
} from "./lib/firebase";
import { DrawingTimerRitual } from "./components/DrawingTimerRitual";
import { PhotoCaptureCard } from "./components/PhotoCaptureCard";
import { AnalysisResultsView } from "./components/AnalysisResultsView";
import { ActivityPlayerModal } from "./components/ActivityPlayerModal";
import { ProgressionChart } from "./components/ProgressionChart";
import { PrivacyBadge } from "./components/PrivacyBadge";
import { AboutCreators } from "./components/AboutCreators";
import { version } from "../package.json";
import { CrisisSupportView } from "./components/CrisisSupportView";

type ViewMode =
  "landing" | "ritual" | "capture" | "analyzing" | "results" | "crisis";

function computeBaseline(sessions: StoredSession[]): EmotionScores | null {
  if (!sessions || sessions.length === 0) return null;
  const recent = sessions.slice(-5);
  const sum: EmotionScores = {
    stress: 0,
    anxiety: 0,
    mental_fatigue: 0,
    calm_flow: 0,
    radiant_joy: 0,
  };
  recent.forEach((s) => {
    sum.stress += s.scores.stress;
    sum.anxiety += s.scores.anxiety;
    sum.mental_fatigue += s.scores.mental_fatigue;
    sum.calm_flow += s.scores.calm_flow;
    sum.radiant_joy += s.scores.radiant_joy;
  });
  const count = recent.length;
  return {
    stress: Number((sum.stress / count).toFixed(2)),
    anxiety: Number((sum.anxiety / count).toFixed(2)),
    mental_fatigue: Number((sum.mental_fatigue / count).toFixed(2)),
    calm_flow: Number((sum.calm_flow / count).toFixed(2)),
    radiant_joy: Number((sum.radiant_joy / count).toFixed(2)),
  };
}

export default function App() {
  const [view, setView] = useState<ViewMode>("landing");
  const [user, setUser] = useState<User | null>(null);
  const [sessions, setSessions] = useState<StoredSession[]>([]);
  const [timerDurationSec, setTimerDurationSec] =
    useState<TimerDurationSec>(15);
  const [analysisResult, setAnalysisResult] =
    useState<AnalyzeSketchResponse | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string>("");
  const [captureMessage, setCaptureMessage] = useState<string | null>(null);
  const [crisisMessage, setCrisisMessage] = useState<string | null>(null);
  const [activeActivity, setActiveActivity] = useState<Activity | null>(null);
  const [confirmingClear, setConfirmingClear] = useState<boolean>(false);

  const [, startTransition] = useTransition();
  const shouldReduceMotion = useReducedMotion();

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsub = onUserChanged((currentUser) => {
      setUser(currentUser);
      refreshSessions(currentUser);
    });
    return () => unsub();
  }, []);

  const refreshSessions = async (currentUser: User | null = user) => {
    try {
      const data = await listSessions(currentUser);
      setSessions(data);
    } catch {
      setSessions([]);
    }
  };

  const [needsSignIn, setNeedsSignIn] = useState<boolean>(false);
  const [scrolled, setScrolled] = useState<boolean>(false);

  useEffect(() => {
    // Logo leaves the hero once the snap toward section 2 is well under way (hysteresis: 40% in, 20% out)
    const onScroll = () => {
      const vh = window.innerHeight;
      setScrolled((s) =>
        s ? window.scrollY > vh * 0.2 : window.scrollY > vh * 0.4,
      );
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const logoInHero = view === "landing" && !scrolled;

  // Snap only on the three-screen landing: elsewhere the footer would be the sole snap point
  // and mandatory snapping pins the page to the bottom (e.g. the results view on phones)
  useEffect(() => {
    document.documentElement.style.scrollSnapType =
      view === "landing" ? "y mandatory" : "";
    // Each view starts at its top; otherwise results can open mid-page at the previous view's offset
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [view]);
  // Breathing radial wash: behind the message, and peeking up at the bottom of the logo screen
  const pulse = {
    className: "w-72 h-72 rounded-full pointer-events-none",
    style: {
      background:
        "radial-gradient(circle, rgba(245, 230, 196, 0.7) 0%, rgba(232, 153, 122, 0.35) 60%, rgba(250, 246, 238, 0) 100%)",
    },
    animate: { scale: shouldReduceMotion ? 1 : [0.92, 1.08, 0.92] },
    transition: {
      duration: 6,
      repeat: Infinity,
      ease: "easeInOut" as const,
    },
  };

  const logoTransition = shouldReduceMotion
    ? { duration: 0 }
    : { duration: 0.8, ease: [0.22, 1, 0.36, 1] as const };

  // One pulse that glides between the logo screen and the message; the outer element
  // carries the layout move, the inner one breathes, so the two transforms don't collide
  const movingPulse = (
    <motion.div
      layoutId="pulse"
      transition={logoTransition}
      className="w-72 h-72 shrink-0"
    >
      <motion.div {...pulse} />
    </motion.div>
  );

  const handleSignIn = async () => {
    try {
      const signedIn = await signInWithGoogle();
      if (signedIn && needsSignIn) {
        setNeedsSignIn(false);
        setView("ritual");
      }
    } catch {
      // User cancelled or auth error
    }
  };

  const handleBeginSession = () => {
    // shortcut: no Firebase config (local dev) keeps guest mode; backend /analyze is still unauthenticated
    if (firebaseEnabled && !user) {
      setNeedsSignIn(true);
      return;
    }
    setView("ritual");
  };

  const handleSignOut = async () => {
    try {
      await signOutUser();
    } catch {
      // Signout error
    }
  };

  const handleRitualComplete = (duration: TimerDurationSec) => {
    setTimerDurationSec(duration);
    setCaptureMessage(null);
    setView("capture");
  };

  const handleAnalyzeSketch = async (base64: string) => {
    setView("analyzing");
    setCaptureMessage(null);

    const baseline = computeBaseline(sessions);

    try {
      const res = await analyzeSketch({
        image_base64: base64,
        mime_type: "image/jpeg",
        timer_duration_sec: timerDurationSec,
        user_baseline_scores: baseline,
      });

      if (res.safety_status === "SAFE") {
        let savedId = `local_${Date.now()}`;
        if (res.merged_scores) {
          try {
            savedId = await saveSession(user, {
              timer_duration_sec: timerDurationSec,
              scores: res.merged_scores,
            });
            await refreshSessions(user);
          } catch {
            // Storage failure fallback
          }
        }
        setCurrentSessionId(savedId);
        setAnalysisResult(res);
        startTransition(() => {
          setView("results");
        });
      } else if (res.safety_status === "CRISIS_SUPPORT") {
        setCrisisMessage(res.retry_or_safety_message);
        startTransition(() => {
          setView("crisis");
        });
      } else {
        // RETRY_CAPTURE or BLOCKED_CONTENT
        setCaptureMessage(
          res.retry_or_safety_message ||
            "We could not read the sketch clearly. Please try again with brighter light or closer framing.",
        );
        startTransition(() => {
          setView("capture");
        });
      }
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Unable to connect to the analysis service.";
      setCaptureMessage(msg);
      startTransition(() => {
        setView("capture");
      });
    }
  };

  const handleOpenActivity = (activity: Activity) => {
    setActiveActivity(activity);
  };

  const handleCloseActivity = () => {
    setActiveActivity(null);
  };

  const handleMarkSession = async (patch: {
    calm_anchor?: boolean;
    aura_hex?: string;
  }) => {
    if (!currentSessionId) return;
    try {
      await markSession(user, currentSessionId, patch);
      await refreshSessions(user);
    } catch {
      // Ignore mark error
    }
  };

  const handleDoneResults = () => {
    setAnalysisResult(null);
    setCurrentSessionId("");
    setView("landing");
  };

  const handleClearHistory = async () => {
    try {
      await clearHistory(user);
      await refreshSessions(user);
      setConfirmingClear(false);
    } catch {
      // Handle clear error
    }
  };

  return (
    <div className="min-h-screen bg-canvasPaper text-espressoInk font-sans flex flex-col justify-between selection:bg-turmericMist">
      {/* Top Header */}
      <header className="sticky top-0 w-full bg-canvasPaper/85 backdrop-blur-sm z-30">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              if (view !== "analyzing") {
                setAnalysisResult(null);
                setView("landing");
                window.scrollTo({ top: 0 });
              }
            }}
            aria-label="Unspoken Line home"
            className="h-12 sm:h-14 cursor-pointer"
          >
            {!logoInHero && (
              <motion.img
                layoutId="brand-logo"
                transition={logoTransition}
                src="/logo.png"
                alt="Unspoken Line"
                className="h-full w-auto"
              />
            )}
          </button>

          <div className="flex items-center gap-3">
            {firebaseEnabled ? (
              user ? (
                <div className="flex items-center gap-3">
                  <span className="text-xs text-warmUmber hidden sm:inline">
                    {user.displayName || user.email || "Sanctuary Member"}
                  </span>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="px-3.5 py-1.5 rounded-full border border-borderHairline text-warmUmber hover:text-espressoInk hover:bg-turmericMist/30 transition-colors text-xs cursor-pointer"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleSignIn}
                  className="px-4 py-1.5 rounded-full border border-peachTerracotta text-espressoInk hover:bg-turmericMist/40 transition-colors text-xs font-medium cursor-pointer"
                >
                  Sign in with Google
                </button>
              )
            ) : (
              <span className="px-3 py-1 rounded-full bg-turmericMist/40 border border-borderHairline text-[11px] text-warmUmber tracking-wide">
                Guest Sanctuary
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area with 700ms sanctuary cross-fade */}
      <main className="flex-1 w-full max-w-4xl mx-auto flex flex-col items-center justify-center relative">
        <AnimatePresence mode="wait">
          {view === "landing" && (
            <motion.div
              key="landing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{
                duration: 0.7,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="w-full flex flex-col items-center text-center px-6 pb-8"
            >
              {/* Section 1 of 3: logo. Height = viewport minus the sticky header (h-12/14 + py-4) */}
              <section className="relative overflow-hidden w-full snap-start scroll-mt-20 sm:scroll-mt-[5.5rem] flex flex-col items-center justify-center h-[calc(100svh-5rem)] sm:h-[calc(100svh-5.5rem)]">
                {/* The message's pulse, parked so only its top ~56px (18rem - 14.5rem) peeks under the tagline */}
                {logoInHero && (
                  <div className="absolute inset-x-0 -bottom-[14.5rem] flex justify-center pointer-events-none">
                    {movingPulse}
                  </div>
                )}
                {logoInHero && (
                  <>
                    <div className="flex-1 flex items-center justify-center">
                      <motion.img
                        layoutId="brand-logo"
                        transition={logoTransition}
                        src="/logo.png"
                        alt="Unspoken Line"
                        className="w-[min(88vw,600px)] h-auto"
                      />
                    </div>
                    <motion.span
                      layoutId="tagline"
                      transition={logoTransition}
                      className="relative text-xs uppercase tracking-widest text-warmUmber pb-20"
                    >
                      Pen on Paper · Silent Reflection
                    </motion.span>
                  </>
                )}
              </section>

              {/* Section 2 of 3: the message, with the privacy promise pinned at the bottom */}
              <section className="w-full snap-start scroll-mt-20 sm:scroll-mt-[5.5rem] min-h-[calc(100svh-5rem)] sm:min-h-[calc(100svh-5.5rem)] flex flex-col items-center">
                <div className="flex-1 w-full flex items-center justify-center">
                  {/* Breathing Radial Wash Background */}
                  <div className="relative w-full max-w-lg flex items-center justify-center my-6">
                    {!logoInHero && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        {movingPulse}
                      </div>
                    )}

                    <div className="relative z-10 max-w-md py-12">
                      {!logoInHero && (
                        <motion.span
                          layoutId="tagline"
                          transition={logoTransition}
                          className="text-xs uppercase tracking-widest text-warmUmber mb-3 block"
                        >
                          Pen on Paper · Silent Reflection
                        </motion.span>
                      )}
                      <h2 className="font-serif text-3xl sm:text-5xl font-medium text-espressoInk tracking-tight leading-tight mb-4">
                        A cognitive imprint on paper is not random.
                      </h2>
                      <p className="text-espressoInk/80 text-sm sm:text-base leading-relaxed mb-8 max-w-sm mx-auto">
                        Take a pen and paper. In seconds of non-verbal drawing,
                        your hand reveals what words keep silent.
                      </p>

                      <button
                        type="button"
                        onClick={
                          needsSignIn ? handleSignIn : handleBeginSession
                        }
                        className="px-8 py-4 rounded-full bg-peachTerracotta text-canvasPaper font-medium hover:bg-peachTerracotta/90 transition-colors shadow-none text-base cursor-pointer"
                      >
                        {needsSignIn ? "Sign in with Google" : "Begin Session"}
                      </button>
                      {needsSignIn && (
                        <p
                          role="status"
                          className="mt-4 text-sm text-warmUmber max-w-xs mx-auto"
                        >
                          Sign in first so your sketches are saved to you. It
                          takes just a few seconds with your Google account.
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Privacy Badge */}
                <div className="w-full pb-6">
                  <PrivacyBadge />
                </div>
              </section>

              {/* Section 3 of 3: history (signed in) and the About dropdown */}
              <section className="w-full snap-start scroll-mt-20 sm:scroll-mt-[5.5rem] flex flex-col items-center">
                {/* History is per account; without Firebase (local dev) everyone is a guest, so keep it there */}
                {(user || !firebaseEnabled) && (
                  <>
                    {/* Progression History Chart */}
                    <ProgressionChart sessions={sessions} />

                    {/* Clear History Inline Confirmation */}
                    <div className="my-8">
                      {confirmingClear ? (
                        <div className="p-4 rounded-2xl bg-blushClay/10 border border-blushClay/30 flex flex-col sm:flex-row items-center gap-3">
                          <span className="text-xs text-espressoInk">
                            Clear all stored sessions? This cannot be undone.
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={handleClearHistory}
                              className="px-3 py-1 rounded-full bg-blushClay text-canvasPaper text-xs font-medium hover:bg-blushClay/90 cursor-pointer"
                            >
                              Yes, clear history
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmingClear(false)}
                              className="px-3 py-1 rounded-full border border-borderHairline text-warmUmber text-xs hover:text-espressoInk cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmingClear(true)}
                          className="text-xs text-warmUmber/70 hover:text-warmUmber underline cursor-pointer"
                        >
                          Clear My History
                        </button>
                      )}
                    </div>
                  </>
                )}

                <AboutCreators />
              </section>
            </motion.div>
          )}

          {view === "ritual" && (
            <motion.div
              key="ritual"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{
                duration: 0.7,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="w-full"
            >
              <DrawingTimerRitual onComplete={handleRitualComplete} />
            </motion.div>
          )}

          {view === "capture" && (
            <motion.div
              key="capture"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{
                duration: 0.7,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="w-full"
            >
              <PhotoCaptureCard
                timerDurationSec={timerDurationSec}
                message={captureMessage}
                onAnalyze={handleAnalyzeSketch}
              />
            </motion.div>
          )}

          {view === "analyzing" && (
            <motion.div
              key="analyzing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{
                duration: 0.7,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="w-full min-h-[60vh] flex flex-col items-center justify-center p-6 text-center"
            >
              <motion.div
                className="w-32 h-32 rounded-full border border-peachTerracotta flex items-center justify-center bg-turmericMist/20"
                animate={{
                  scale: shouldReduceMotion ? 1 : [0.95, 1.15, 0.95],
                  opacity: shouldReduceMotion ? 0.8 : [0.5, 0.9, 0.5],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                <div className="w-12 h-12 rounded-full bg-sunlitAmber/50" />
              </motion.div>

              <h3 className="font-serif text-3xl font-medium text-espressoInk tracking-tight mt-8 mb-2">
                Listening to your lines...
              </h3>
              <p className="text-warmUmber text-sm max-w-xs">
                Analyzing stroke density, cadence, and spatial openness in
                memory.
              </p>
            </motion.div>
          )}

          {view === "results" && analysisResult && (
            <motion.div
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{
                duration: 0.7,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="w-full"
            >
              <AnalysisResultsView
                result={analysisResult}
                onOpenActivity={handleOpenActivity}
                onDone={handleDoneResults}
              />
            </motion.div>
          )}

          {view === "crisis" && (
            <motion.div
              key="crisis"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{
                duration: 0.7,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="w-full"
            >
              <CrisisSupportView
                message={crisisMessage}
                onReturn={() => {
                  setCrisisMessage(null);
                  setView("landing");
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Activity Player Modal */}
      {activeActivity && (
        <ActivityPlayerModal
          activity={activeActivity}
          sessionId={currentSessionId}
          scores={
            analysisResult?.merged_scores || {
              stress: 0.2,
              anxiety: 0.2,
              mental_fatigue: 0.2,
              calm_flow: 0.2,
              radiant_joy: 0.2,
            }
          }
          onClose={handleCloseActivity}
          onMark={handleMarkSession}
        />
      )}

      {/* Footer (snap-end makes the page bottom a resting point under mandatory snap) */}
      <footer className="snap-end w-full max-w-4xl mx-auto px-6 py-6 text-center text-xs text-warmUmber/60 border-t border-borderHairline/40">
        Unspoken Line · Non-verbal mindfulness sanctuary · Privacy-first · v
        {version}
      </footer>
    </div>
  );
}
