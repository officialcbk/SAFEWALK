// ─── Inactivity detection hook ────────────────────────────────────────────────
// Slice 13 – detects user inactivity during walk; shows check-in prompt
// Slice 14 – calls onMissed() when prompt is ignored → triggers escalation

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

  const lastInteractionRef = useRef<number>(Date.now());
  const responseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Dismiss / reset ──────────────────────────────────────────────────────
  const resetInactivity = useCallback(() => {
    lastInteractionRef.current = Date.now();
    if (responseTimerRef.current) clearTimeout(responseTimerRef.current);
    setShowCheckIn(false);
  }, []);

  const dismissCheckIn = useCallback(() => {
    resetInactivity();
  }, [resetInactivity]);

  // ── Global interaction listeners – silently update the clock ────────────
  useEffect(() => {
    if (!isWalkActive) return;
    const touch = () => { lastInteractionRef.current = Date.now(); };
    window.addEventListener("click", touch);
    window.addEventListener("keydown", touch);
    window.addEventListener("touchstart", touch);
    return () => {
      window.removeEventListener("click", touch);
      window.removeEventListener("keydown", touch);
      window.removeEventListener("touchstart", touch);
    };
  }, [isWalkActive]);

  // ── Main inactivity poll ─────────────────────────────────────────────────
  useEffect(() => {
    if (!isWalkActive) {
      // Tidy up when walk ends
      if (pollRef.current) clearInterval(pollRef.current);
      if (responseTimerRef.current) clearTimeout(responseTimerRef.current);
      setShowCheckIn(false);
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

  return { showCheckIn, resetInactivity, dismissCheckIn };
}