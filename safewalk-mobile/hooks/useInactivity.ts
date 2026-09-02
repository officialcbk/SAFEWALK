// ─── Inactivity detection hook ────────────────────────────────────────────────
// Detects user inactivity during a walk; shows a check-in prompt, and calls
// onMissed() if it's ignored past the response window → triggers escalation.
//
// RN port note: there's no window/document to attach global listeners to, so
// activity is reported by the screen itself via `reportActivity()` — wrap the
// active walk screen's root in a Pressable/GestureDetector (or call
// reportActivity() from onTouchStart/onScroll) to feed the idle clock.

import { useCallback, useEffect, useRef, useState } from "react";

/** Idle time (ms) before the "Are you safe?" prompt appears. */
const INACTIVITY_THRESHOLD_MS = 90_000; // 90 s

/** How often the inactivity clock is polled. */
const POLL_INTERVAL_MS = 10_000; // 10 s

export interface UseInactivityReturn {
  /** True when the check-in prompt should be displayed. */
  showCheckIn: boolean;
  /** Reset the idle clock + dismiss the prompt on any user gesture. */
  resetInactivity: () => void;
  /** Explicit "I'm OK" tap – same effect as resetInactivity. */
  dismissCheckIn: () => void;
  /** Call from a touch/scroll handler on the walk screen to mark activity. */
  reportActivity: () => void;
}

/**
 * Tracks user inactivity during an active walk session.
 *
 * After INACTIVITY_THRESHOLD_MS of no interaction, showCheckIn becomes true.
 * If the user does not dismiss within responseWindowMs, onMissed() is called.
 *
 * @param isWalkActive  Whether a walk is currently in progress.
 * @param onMissed      Callback fired when the check-in response window expires.
 * @param responseWindowMs  How long (ms) the user has to respond before onMissed fires.
 */
export function useInactivity(
  isWalkActive: boolean,
  onMissed: () => void,
  responseWindowMs = 30_000
): UseInactivityReturn {
  const [showCheckIn, setShowCheckIn] = useState(false);

  const lastInteractionRef = useRef<number>(0);
  const responseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Baseline the idle clock once on mount (Date.now() must run in an effect,
  // not during render, to stay a pure function of props/state).
  useEffect(() => {
    lastInteractionRef.current = Date.now();
  }, []);

  // ── Dismiss / reset ──────────────────────────────────────────────────────
  const resetInactivity = useCallback(() => {
    lastInteractionRef.current = Date.now();
    if (responseTimerRef.current) clearTimeout(responseTimerRef.current);
    setShowCheckIn(false);
  }, []);

  const dismissCheckIn = useCallback(() => {
    resetInactivity();
  }, [resetInactivity]);

  const reportActivity = useCallback(() => {
    lastInteractionRef.current = Date.now();
  }, []);

  // ── Main inactivity poll ─────────────────────────────────────────────────
  useEffect(() => {
    if (!isWalkActive) {
      // Tidy up when walk ends — showCheckIn is derived (isWalkActive && showCheckIn)
      // below, so it doesn't need a setState call here.
      if (pollRef.current) clearInterval(pollRef.current);
      if (responseTimerRef.current) clearTimeout(responseTimerRef.current);
      return;
    }

    pollRef.current = setInterval(() => {
      const elapsed = Date.now() - lastInteractionRef.current;
      if (elapsed >= INACTIVITY_THRESHOLD_MS && !showCheckIn) {
        setShowCheckIn(true);
        // Start the response window; call onMissed if not dismissed in time
        responseTimerRef.current = setTimeout(() => {
          setShowCheckIn(false);
          onMissed();
        }, responseWindowMs);
      }
    }, POLL_INTERVAL_MS);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isWalkActive, showCheckIn]);

  return { showCheckIn: isWalkActive && showCheckIn, resetInactivity, dismissCheckIn, reportActivity };
}
