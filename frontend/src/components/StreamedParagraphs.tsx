import React, { useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";

interface Props {
  text: string;
  /** Reveal word by word, as if being written now. Off for readings reopened from history. */
  animate: boolean;
  onDone?: () => void;
}

const TICK_MS = 50;
const MIN_TOKENS_PER_TICK = 2; // a word plus its following space: ~20 words/s, a calm writing pace
const MAX_STREAM_MS = 7000; // long readings speed up rather than keep the reader waiting

/**
 * Gemini's text is already complete; this only paces its appearance so it reads like it is being
 * written. Paragraph breaks are kept. Screen readers get the full text once, not word by word.
 */
export const StreamedParagraphs: React.FC<Props> = ({
  text,
  animate,
  onDone,
}) => {
  const reduceMotion = useReducedMotion();
  // Tokens keep the original whitespace (split with a capture group), so spacing and single line breaks survive
  const paragraphs = useMemo(
    () =>
      text
        .split(/\n\s*\n/)
        .map((p) => p.trim())
        .filter(Boolean)
        .map((p) => p.split(/(\s+)/)),
    [text],
  );
  const total = useMemo(
    () => paragraphs.reduce((n, t) => n + t.length, 0),
    [paragraphs],
  );

  const stream = animate && !reduceMotion;
  const [shown, setShown] = useState(stream ? 0 : total);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    if (!stream) {
      setShown(total);
      return;
    }
    setShown(0);
    const perTick = Math.max(
      MIN_TOKENS_PER_TICK,
      Math.ceil(total / (MAX_STREAM_MS / TICK_MS)),
    );
    const id = window.setInterval(() => {
      setShown((n) => {
        const next = Math.min(total, n + perTick);
        if (next >= total) window.clearInterval(id);
        return next;
      });
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [stream, total]);

  const done = shown >= total;
  useEffect(() => {
    if (done) onDoneRef.current?.();
  }, [done]);

  let index = 0;
  return (
    <>
      <p className="sr-only">{text}</p>
      <div
        aria-hidden="true"
        onClick={done ? undefined : () => setShown(total)}
        className="flex flex-col gap-3 text-base text-espressoInk/90 leading-relaxed"
      >
        {paragraphs.map((tokens, pi) => {
          const start = index;
          index += tokens.length;
          if (start >= shown) return null;
          const visible = tokens.slice(0, shown - start);
          const isLastVisible = !done && index >= shown;
          return (
            <p key={pi} className="whitespace-pre-line">
              {visible.map((tok, ti) =>
                /^\s+$/.test(tok) ? (
                  tok
                ) : (
                  // Mounts once; the CSS animation runs as each word appears
                  <span key={ti} className={stream ? "stream-word" : undefined}>
                    {tok}
                  </span>
                ),
              )}
              {isLastVisible && <span className="stream-caret" />}
            </p>
          );
        })}
      </div>
    </>
  );
};
