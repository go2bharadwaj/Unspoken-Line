import { useState, useEffect, useCallback, useTransition } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { User } from "firebase/auth";
import {
  Activity,
  AnalyzeSketchResponse,
  EmotionScores,
  StoredSession,
  TimerDurationSec,
} from "./types";
import { analyzeSketch, summarizeReading } from "./lib/api";
import {
  firebaseEnabled,
  signInWithGoogle,
  signOutUser,
  onUserChanged,
  saveSession,
  listSessions,
  markSession,
  clearHistory,
  deleteSession,
  getSettings,
  setAge,
  setDiscardPhoto,
  savePhoto,
  loadPhoto,
} from "./lib/firebase";
import { DrawingTimerRitual } from "./components/DrawingTimerRitual";
import { PhotoCaptureCard } from "./components/PhotoCaptureCard";
import { AnalysisResultsView } from "./components/AnalysisResultsView";
import { HistorySidebar, HISTORY_PANEL_ID } from "./components/HistorySidebar";
import { sessionToResult } from "./lib/history";
import { newerVersionDeployed, reloadOnceFor } from "./lib/freshness";
import { shrinkForStorage } from "./lib/image";
import { isAdmin } from "./lib/admin";
import { ActivityPlayerModal } from "./components/ActivityPlayerModal";
import { ProgressionChart } from "./components/ProgressionChart";
import { PrivacyBadge } from "./components/PrivacyBadge";
import { AboutCreators } from "./components/AboutCreators";
import { AgeGate } from "./components/AgeGate";
import { InstallApp } from "./components/InstallApp";
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
  const [historyOpen, setHistoryOpen] = useState<boolean>(false);
  // Fresh readings stream in; ones reopened from history show at once
  const [resultIsFresh, setResultIsFresh] = useState<boolean>(false);
  // A newer deploy than the one this tab is running (path of its bundle), found when the tab returns
  const [newVersion, setNewVersion] = useState<string | null>(null);
  // The photo shown above the open reading: the one just taken (always shown), or one kept with a past reading
  const [sketchPhoto, setSketchPhoto] = useState<{
    sessionId: string;
    url: string;
    kept: boolean;
  } | null>(null);
  // Discard the photo after reading (the default), or keep it, sealed, with the reading
  const [discardPhoto, setDiscardPhotoState] = useState<boolean>(true);
  // Admin accounts evaluate readings: no personalization, every reading as if from a new person
  // null until checked, so the age question never flashes up for an admin
  const [adminMode, setAdminMode] = useState<boolean | null>(null);
  // The person's age: undefined while loading or if it couldn't be read, null if never given
  const [age, setAgeState] = useState<number | null | undefined>(undefined);

  useEffect(() => {
    const check = async () => {
      if (document.visibilityState !== "visible") return;
      const live = await newerVersionDeployed();
      if (live) setNewVersion(live);
    };
    document.addEventListener("visibilitychange", check);
    window.addEventListener("pageshow", check); // back/forward cache restores skip a reload
    window.addEventListener("focus", check);
    return () => {
      document.removeEventListener("visibilitychange", check);
      window.removeEventListener("pageshow", check);
      window.removeEventListener("focus", check);
    };
  }, []);

  const [, startTransition] = useTransition();
  const shouldReduceMotion = useReducedMotion();

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsub = onUserChanged((currentUser) => {
      setUser(currentUser);
      refreshSessions(currentUser);
      setAgeState(undefined);
      getSettings(currentUser)
        .then((s) => {
          setDiscardPhotoState(s.discardPhoto);
          setAgeState(s.age);
        })
        // Can't tell what they chose, so take the private option; readings go without an age
        .catch(() => setDiscardPhotoState(true));
      setAdminMode(null);
      isAdmin(currentUser).then(setAdminMode, () => setAdminMode(false));
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

  // On the home page nothing is in progress, so take the new version straight away;
  // mid-session we offer it instead of yanking the page
  const [newVersionDeclined, setNewVersionDeclined] = useState<boolean>(false);
  useEffect(() => {
    if (newVersion && view === "landing") reloadOnceFor(newVersion);
  }, [newVersion, view]);

  const logoInHero = view === "landing" && !scrolled;
  // History lives with the account; without Firebase (local dev) everyone is a guest with local history
  const historyAvailable =
    (Boolean(user) || !firebaseEnabled) &&
    (view === "landing" || view === "results");

  // Each view starts at its top; otherwise results can open mid-page at the previous view's offset
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [view]);
  // Snap only while the three-screen landing is on the page: elsewhere the footer is the sole snap
  // point and mandatory snapping pins the page to the bottom. Turned on when the landing mounts,
  // not when the view changes: during the previous view's fade-out the footer is the only target,
  // and Chrome would keep snapping to it as the landing grows the page.
  const landingRef = useCallback((el: HTMLDivElement | null) => {
    document.documentElement.style.scrollSnapType = el ? "y mandatory" : "";
  }, []);
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

  const historyButton = (
    <motion.button
      layoutId="history-button"
      transition={logoTransition}
      type="button"
      onClick={() => setHistoryOpen((o) => !o)}
      aria-expanded={historyOpen}
      aria-controls={HISTORY_PANEL_ID}
      aria-label="Past readings"
      className="inline-flex items-center gap-1.5 h-8 px-2.5 sm:px-3 rounded-full border border-borderHairline text-xs text-warmUmber hover:text-espressoInk hover:bg-turmericMist/30 transition-colors cursor-pointer"
    >
      <svg
        viewBox="0 0 24 24"
        className="w-3.5 h-3.5 stroke-current fill-none stroke-2"
        aria-hidden="true"
      >
        <path
          d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5M12 7v5l3 2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="hidden sm:inline">Past readings</span>
    </motion.button>
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

  const handleDiscardPhotoChange = async (on: boolean) => {
    const before = discardPhoto;
    setDiscardPhotoState(on);
    try {
      await setDiscardPhoto(user, on);
    } catch {
      setDiscardPhotoState(before); // not saved, so show what still applies
    }
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

    // Checked here too, not only from state, so a reading can never start before the check finished
    const evaluating = await isAdmin(user).catch(() => false);
    const baseline = evaluating ? null : computeBaseline(sessions);
    // S_n-1: the newest progression notes. If the last summary failed, an older one still carries the history.
    const previousSummary = evaluating
      ? null
      : ([...sessions].reverse().find((s) => s.summary)?.summary ?? null);

    try {
      const res = await analyzeSketch({
        image_base64: base64,
        mime_type: "image/jpeg",
        timer_duration_sec: timerDurationSec,
        user_baseline_scores: baseline,
        previous_summary: previousSummary,
        age: evaluating ? null : (age ?? null),
      });

      if (res.safety_status === "SAFE") {
        let savedId = `local_${Date.now()}`;
        let saved = false;
        if (res.merged_scores) {
          try {
            savedId = await saveSession(user, {
              timer_duration_sec: timerDurationSec,
              scores: res.merged_scores,
              // Kept so the reading can be reopened from history; sliced to the firestore.rules caps
              // so an unusually long reading can't make the whole session fail to save
              reading: {
                reading_text: res.visual_reflection_text?.slice(0, 20000),
                progression_text: res.progression_reflection_text?.slice(
                  0,
                  20000,
                ),
                trend_text: res.trend_summary_text?.slice(0, 2000),
                evidence: res.stroke_evidence_bullets.slice(0, 10),
                primary_class: res.primary_emotion_class ?? undefined,
                source:
                  res.analysis_sources?.flash === "gemini"
                    ? "gemini"
                    : "fallback",
              },
            });
            saved = true;
            await refreshSessions(user);
          } catch {
            // Storage failure fallback
          }
        }
        // Only a real Gemini reading of a drawing becomes notes; the backend has already stopped non-drawings
        if (
          saved &&
          !evaluating &&
          res.visual_reflection_text &&
          res.analysis_sources?.flash === "gemini"
        ) {
          // Background: T_n (+ S_n-1) -> S_n, stored on this session for next time. Never blocks the results.
          summarizeReading({
            reading_text: res.visual_reflection_text,
            progression_text: res.progression_reflection_text,
            previous_summary: previousSummary,
            reading_date: new Date().toLocaleDateString("en-CA"), // YYYY-MM-DD, local
          })
            .then((summary) =>
              markSession(user, savedId, { summary }).then(() =>
                refreshSessions(user),
              ),
            )
            .catch(() => {
              // No new notes this time; the next session falls back to S_n-1
            });
        }
        setCurrentSessionId(savedId);
        // Always shown on the first view of a reading; kept afterwards only if they turned discarding off
        const keep = saved && Boolean(user) && !discardPhoto;
        setSketchPhoto({
          sessionId: savedId,
          url: `data:image/jpeg;base64,${base64}`,
          kept: keep,
        });
        if (keep && user) {
          shrinkForStorage(base64)
            .then((small) => savePhoto(user, savedId, small))
            .catch(() =>
              // Not kept after all: say so under the photo instead of promising it's saved
              setSketchPhoto((p) =>
                p?.sessionId === savedId ? { ...p, kept: false } : p,
              ),
            );
        }
        setAnalysisResult(res);
        setResultIsFresh(true);
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

  const showPastReading = (session: StoredSession) => {
    // A photo kept with this reading loads after the text; none if it was discarded
    setSketchPhoto(null);
    loadPhoto(user, session.id)
      .then(
        (photo) =>
          photo &&
          setSketchPhoto({
            sessionId: session.id,
            url: `data:image/jpeg;base64,${photo}`,
            kept: true,
          }),
      )
      .catch(() => {});
    setAnalysisResult(sessionToResult(session));
    setResultIsFresh(false);
    setCurrentSessionId(session.id);
    setView("results");
    window.scrollTo({ top: 0, behavior: "instant" });
  };

  const handleSelectPast = (session: StoredSession) => {
    showPastReading(session);
    // Below xl the panel covers the results, so get out of the way
    if (!window.matchMedia("(min-width: 1280px)").matches)
      setHistoryOpen(false);
  };

  const handleDeletePast = async (id: string) => {
    await deleteSession(user, id);
    const remaining = sessions.filter((s) => s.id !== id);
    await refreshSessions(user);
    if (id !== currentSessionId) return;
    // The open reading was deleted: show the newest one left, or go home if none
    const newest = remaining[remaining.length - 1];
    if (newest) {
      showPastReading(newest);
    } else {
      setHistoryOpen(false);
      handleDoneResults();
    }
  };

  const currentSession = sessions.find((s) => s.id === currentSessionId);

  const handleRate = async (rating: number) => {
    const id = currentSessionId;
    const previous = currentSession?.rating;
    const setRating = (r: number | undefined) =>
      setSessions((all) =>
        all.map((s) => (s.id === id ? { ...s, rating: r } : s)),
      );
    setRating(rating); // show it straight away
    try {
      await markSession(user, id, { rating });
    } catch (err) {
      setRating(previous);
      throw err;
    }
  };

  const handleDoneResults = () => {
    setAnalysisResult(null);
    setSketchPhoto(null);
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
          {/* While the logo fills the screen, past readings take its corner; they move right as it arrives */}
          {logoInHero ? (
            <div className="h-12 sm:h-14 flex items-center">
              {historyAvailable && historyButton}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                if (view !== "analyzing") {
                  handleDoneResults();
                  window.scrollTo({ top: 0 });
                }
              }}
              aria-label="Unspoken Lines home"
              className="h-12 sm:h-14 cursor-pointer"
            >
              <motion.img
                layoutId="brand-logo"
                transition={logoTransition}
                src="/logo.png"
                alt="Unspoken Lines"
                className="h-full w-auto"
              />
            </button>
          )}

          <div className="flex items-center gap-2 sm:gap-3">
            {historyAvailable && !logoInHero && historyButton}
            {firebaseEnabled ? (
              user ? (
                <div className="flex items-center gap-3">
                  {adminMode && (
                    <span
                      title="Admin: readings use no history, and your ratings are the human eval"
                      className="px-2.5 py-1 rounded-full bg-sunlitAmber/30 border border-sunlitAmber/60 text-[11px] text-espressoInk tracking-wide"
                    >
                      Eval mode
                    </span>
                  )}
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
              ref={landingRef}
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
                        alt="Unspoken Lines"
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
                  {/* Notes belong to an account; without Firebase (local dev) the guest keeps them locally */}
                  {/* Keeping photos needs an account (sealed in Firestore), so guests don't get the switch */}
                  <PrivacyBadge
                    discardPhoto={discardPhoto}
                    onDiscardPhotoChange={
                      user ? handleDiscardPhotoChange : undefined
                    }
                  />
                </div>
              </section>

              {/* Section 3 of 3: history (signed in) and the About dropdown */}
              <section className="w-full snap-start scroll-mt-20 sm:scroll-mt-[5.5rem] flex flex-col items-center">
                {/* History is per account; without Firebase (local dev) everyone is a guest, so keep it there */}
                {(user || !firebaseEnabled) && (
                  <>
                    {/* Progression History Chart */}
                    <ProgressionChart sessions={sessions} />

                    {/* Clear History Inline Confirmation; admins keep their sessions as the human eval record */}
                    {adminMode === false && (
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
                    )}
                  </>
                )}

                <AboutCreators />
                <InstallApp />
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
              <DrawingTimerRitual
                onComplete={handleRitualComplete}
                onBack={() => setView("landing")}
              />
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
                onBack={() => setView("ritual")}
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
                key={currentSessionId}
                result={analysisResult}
                onOpenActivity={handleOpenActivity}
                onDone={handleDoneResults}
                streamText={resultIsFresh}
                photo={
                  sketchPhoto?.sessionId === currentSessionId
                    ? sketchPhoto
                    : undefined
                }
                rating={currentSession?.rating}
                onRate={currentSession ? handleRate : undefined}
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

      {newVersion && view !== "landing" && !newVersionDeclined && (
        <div
          role="status"
          className="fixed bottom-4 inset-x-4 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 z-50 flex items-center justify-between gap-3 rounded-full border border-borderHairline bg-canvasPaper shadow-sm pl-5 pr-2 py-2 text-sm text-espressoInk"
        >
          <span>A new version of Unspoken Lines is ready.</span>
          <span className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-3.5 py-1.5 rounded-full bg-peachTerracotta text-canvasPaper text-xs font-medium hover:bg-peachTerracotta/90 cursor-pointer"
            >
              Refresh
            </button>
            <button
              type="button"
              onClick={() => setNewVersionDeclined(true)}
              aria-label="Dismiss"
              className="w-8 h-8 rounded-full text-warmUmber hover:text-espressoInk cursor-pointer"
            >
              ×
            </button>
          </span>
        </div>
      )}

      {/* Asked once after sign-in; admins evaluate as an unknown person, so they skip it */}
      {(user || !firebaseEnabled) && adminMode === false && age === null && (
        <AgeGate
          onSave={async (a) => {
            await setAge(user, a);
            setAgeState(a);
          }}
          onSignOut={user ? handleSignOut : undefined}
        />
      )}

      <HistorySidebar
        open={historyOpen && historyAvailable}
        sessions={sessions}
        selectedId={currentSessionId}
        onClose={() => setHistoryOpen(false)}
        onSelect={handleSelectPast}
        onDelete={handleDeletePast}
      />

      {/* Footer (snap-end makes the page bottom a resting point under mandatory snap) */}
      <footer className="snap-end w-full max-w-4xl mx-auto px-6 py-6 text-center text-xs text-warmUmber/60 border-t border-borderHairline/40">
        Unspoken Lines · Non-verbal mindfulness sanctuary · Privacy-first · v
        {version}
      </footer>
    </div>
  );
}
