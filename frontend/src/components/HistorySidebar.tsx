import React, { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { StoredSession } from "../types";
import { groupByDay, topClass } from "../lib/history";

interface Props {
  open: boolean;
  sessions: StoredSession[];
  selectedId: string;
  onClose: () => void;
  onSelect: (session: StoredSession) => void;
  onDelete: (id: string) => Promise<void>;
}

export const HISTORY_PANEL_ID = "history-panel";

/**
 * Past readings, like a chat history: a column beside the results on wide screens (xl, where the
 * centred results leave room), a drawer over them with a backdrop below that.
 */
export const HistorySidebar: React.FC<Props> = ({
  open,
  sessions,
  selectedId,
  onClose,
  onSelect,
  onDelete,
}) => {
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const reduceMotion = useReducedMotion();
  const slide = {
    duration: reduceMotion ? 0 : 0.35,
    ease: [0.22, 1, 0.36, 1] as const,
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    setDeleteError(null);
    try {
      await onDelete(id);
      setConfirmingId(null);
    } catch {
      setDeleteError(
        "Couldn't delete that reading. Check your connection and try again.",
      );
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop only where the panel covers the results */}
          <motion.div
            key="history-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={slide}
            onClick={onClose}
            aria-hidden="true"
            className="xl:hidden fixed inset-x-0 bottom-0 top-20 sm:top-[5.5rem] z-30 bg-espressoInk/20"
          />
          <motion.nav
            key="history-panel"
            id={HISTORY_PANEL_ID}
            aria-label="Past readings"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={slide}
            className="fixed left-0 bottom-0 top-20 sm:top-[5.5rem] z-40 w-72 max-w-[85vw] bg-canvasPaper border-r border-borderHairline overflow-y-auto overscroll-contain"
          >
            <div className="sticky top-0 bg-canvasPaper flex items-center justify-between px-4 py-3 border-b border-borderHairline">
              <h2 className="text-xs uppercase tracking-widest text-warmUmber">
                Past readings
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close past readings"
                className="w-8 h-8 rounded-full flex items-center justify-center text-warmUmber hover:text-espressoInk hover:bg-turmericMist/40 cursor-pointer"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="w-4 h-4 stroke-current fill-none stroke-2"
                  aria-hidden="true"
                >
                  <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            {sessions.length === 0 ? (
              <p className="px-4 py-6 text-sm text-warmUmber">
                No past readings yet.
              </p>
            ) : (
              groupByDay(sessions).map((group) => (
                <section key={group.label} className="px-2 py-3">
                  <h3 className="px-2 pb-1.5 text-[11px] uppercase tracking-widest text-warmUmber/80">
                    {group.label}
                  </h3>
                  <ul className="flex flex-col gap-1">
                    {group.items.map((s) => {
                      const time = new Date(s.created_at).toLocaleTimeString(
                        [],
                        { hour: "numeric", minute: "2-digit" },
                      );
                      const selected = s.id === selectedId;
                      return (
                        <li key={s.id}>
                          {confirmingId === s.id ? (
                            <div
                              className="rounded-xl border border-blushClay/40 bg-blushClay/10 px-3 py-2.5 flex flex-col gap-2"
                              role="group"
                              aria-label={`Delete reading from ${group.label} ${time}?`}
                            >
                              <span className="text-xs text-espressoInk">
                                Delete this reading? This can't be undone.
                              </span>
                              {deleteError && (
                                <span
                                  role="alert"
                                  className="text-xs text-blushClay"
                                >
                                  {deleteError}
                                </span>
                              )}
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  disabled={deletingId === s.id}
                                  onClick={() => handleDelete(s.id)}
                                  className="px-3 py-1 rounded-full bg-blushClay text-canvasPaper text-xs font-medium hover:bg-blushClay/90 cursor-pointer disabled:opacity-50"
                                >
                                  {deletingId === s.id ? "Deleting…" : "Delete"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmingId(null)}
                                  className="px-3 py-1 rounded-full border border-borderHairline text-warmUmber text-xs hover:text-espressoInk cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div
                              className={`group flex items-start rounded-xl transition-colors ${
                                selected
                                  ? "bg-turmericMist/60"
                                  : "hover:bg-turmericMist/30"
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => onSelect(s)}
                                aria-current={selected ? "true" : undefined}
                                className="flex-1 min-w-0 text-left px-3 py-2.5 cursor-pointer"
                              >
                                <span className="flex items-baseline justify-between gap-2">
                                  <span className="font-serif text-base text-espressoInk">
                                    {s.primary_class ?? topClass(s.scores)}
                                  </span>
                                  <span className="text-[11px] text-warmUmber shrink-0">
                                    {time}
                                  </span>
                                </span>
                                <span className="block text-xs text-warmUmber mt-0.5 line-clamp-2">
                                  {s.reading_text ??
                                    "Scores only (saved before readings were kept)"}
                                </span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setDeleteError(null);
                                  setConfirmingId(s.id);
                                }}
                                aria-label={`Delete reading from ${group.label} ${time}`}
                                className="m-1.5 w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-warmUmber/70 hover:text-blushClay hover:bg-blushClay/10 cursor-pointer"
                              >
                                <svg
                                  viewBox="0 0 24 24"
                                  className="w-4 h-4 stroke-current fill-none stroke-[1.75]"
                                  aria-hidden="true"
                                >
                                  <path
                                    d="M4 7h16M10 11v6M14 11v6M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12M9 7V4h6v3"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                              </button>
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))
            )}
          </motion.nav>
        </>
      )}
    </AnimatePresence>
  );
};
