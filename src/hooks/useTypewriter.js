import { useEffect, useRef, useState } from 'react';

/**
 * useTypewriter — smooth, incremental reveal of streamed text.
 *
 * Fast cloud models (e.g. Groq) often deliver a whole response in one or two
 * network chunks, so React batches the state update and the message appears to
 * "dump" all at once — which also makes the chat container jump before it can
 * grow. This hook decouples the *displayed* text from the *target* text: while
 * `active`, it advances the visible slice a few characters per animation frame,
 * so content grows smoothly and the scroll container keeps pace.
 *
 * When `active` becomes false (generation finished) it snaps to the full text so
 * nothing is ever lost or delayed after completion.
 *
 * @param {string} target   the full (possibly still-growing) text
 * @param {boolean} active  whether streaming is in progress
 * @param {object} [opts]
 * @param {number} [opts.cps]  characters per second while catching up
 * @returns {string} the text to display
 */
export function useTypewriter(target, active, { cps = 1200 } = {}) {
  const full = typeof target === 'string' ? target : String(target ?? '');
  const [shown, setShown] = useState(active ? '' : full);
  const shownLenRef = useRef(active ? 0 : full.length);
  const rafRef = useRef(0);
  const lastTsRef = useRef(0);

  useEffect(() => {
    // Not streaming: show everything immediately (and keep in sync on edits).
    if (!active) {
      cancelAnimationFrame(rafRef.current);
      shownLenRef.current = full.length;
      setShown(full);
      return undefined;
    }

    // If the target shrank/reset (new turn), restart from 0.
    if (shownLenRef.current > full.length) {
      shownLenRef.current = 0;
      setShown('');
    }

    const step = (ts) => {
      if (!lastTsRef.current) lastTsRef.current = ts;
      const dt = (ts - lastTsRef.current) / 1000;
      lastTsRef.current = ts;

      const remaining = full.length - shownLenRef.current;
      if (remaining <= 0) {
        rafRef.current = requestAnimationFrame(step);
        return;
      }
      // Advance proportionally to elapsed time; never fall too far behind (if a
      // huge chunk arrived, accelerate so we don't lag for seconds).
      const baseAdvance = Math.max(1, Math.ceil(cps * dt));
      const catchUp = remaining > 400 ? Math.ceil(remaining / 8) : 0;
      const advance = Math.min(remaining, baseAdvance + catchUp);
      shownLenRef.current += advance;
      setShown(full.slice(0, shownLenRef.current));
      rafRef.current = requestAnimationFrame(step);
    };

    rafRef.current = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(rafRef.current);
      lastTsRef.current = 0;
    };
  }, [full, active, cps]);

  return active ? shown : full;
}
