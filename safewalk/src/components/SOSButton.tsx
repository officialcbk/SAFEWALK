// ─── SOS button component ─────────────────────────────────────────────────────
// Slice 6 – visible, prominent SOS button with ARIA labels
// Slice 7 – press-and-hold activation: 3-second countdown, cancel on release,
//           Web Audio API beep each second

import { useCallback, useEffect, useRef, useState } from "react";
import "../styles/SOS.css";

/** Total hold duration in milliseconds before SOS activates. */
const HOLD_DURATION_MS = 3_000;
const TICK_MS = 1_000;

interface Props {
  /** SOS is only activatable while a walk is active. */
  isWalkActive: boolean;
  /** Fired when the full 3-second hold completes. */
  onActivated: () => void;
}

/**
 * Emergency SOS button.
 * User must press and hold for 3 seconds to trigger – prevents accidental taps.
 * Releasing before countdown ends cancels the activation.
 * Plays a descending audio beep each second via the Web Audio API.
 */
function SOSButton({ isWalkActive, onActivated }: Props) {
  const [holding, setHolding] = useState(false);
  const [countdown, setCountdown] = useState(3);

  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  /** Play a short tone using the Web Audio API (silent if unavailable). */
  const playBeep = useCallback((frequency = 880) => {
    try {
      audioCtxRef.current ??= new AudioContext();
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = frequency;
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
      osc.start();
      osc.stop(ctx.currentTime + 0.18);
    } catch {
      // Audio context unavailable – continue silently
    }
  }, []);

  const clearHoldTimers = useCallback(() => {
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    if (tickRef.current) clearInterval(tickRef.current);
    holdTimerRef.current = null;
    tickRef.current = null;
  }, []);

  const handlePressStart = useCallback(() => {
    if (!isWalkActive) return;
    setHolding(true);
    setCountdown(3);
    playBeep(880);

    tickRef.current = setInterval(() => {
      setCountdown((prev) => {
        const next = prev - 1;
        // Descending tones: 3→880Hz, 2→660Hz, 1→440Hz
        if (next > 0) playBeep(220 + next * 220);
        return next;
      });
    }, TICK_MS);

    holdTimerRef.current = setTimeout(() => {
      clearHoldTimers();
      setHolding(false);
      setCountdown(3);
      onActivated();
    }, HOLD_DURATION_MS);
  }, [isWalkActive, playBeep, clearHoldTimers, onActivated]);

  const handlePressEnd = useCallback(() => {
    if (!holding) return;
    clearHoldTimers();
    setHolding(false);
    setCountdown(3);
  }, [holding, clearHoldTimers]);

  // Attach touchstart with passive:false so preventDefault() works (prevents scroll on hold)
  useEffect(() => {
    const btn = buttonRef.current;
    if (!btn) return;
    const onTouchStart = (e: TouchEvent) => { e.preventDefault(); handlePressStart(); };
    btn.addEventListener("touchstart", onTouchStart, { passive: false });
    return () => btn.removeEventListener("touchstart", onTouchStart);
  }, [handlePressStart]);

  // Clean up all timers on unmount
  useEffect(() => () => clearHoldTimers(), [clearHoldTimers]);

  if (!isWalkActive) {
    return (
      <div className="sw-sos-wrapper sw-sos-wrapper--disabled">
        <button
          className="sw-sos-btn sw-sos-btn--disabled"
          disabled
          aria-label="SOS emergency button — start a walk to enable"
          aria-disabled="true"
        >
          SOS
        </button>
        <p className="sw-sos-hint">Start a walk to enable SOS</p>
      </div>
    );
  }

  return (
    <div className="sw-sos-wrapper">
      <button
        ref={buttonRef}
        className={holding ? "sw-sos-btn sw-sos-btn--holding" : "sw-sos-btn"}
        onMouseDown={handlePressStart}
        onMouseUp={handlePressEnd}
        onMouseLeave={handlePressEnd}
        onTouchEnd={handlePressEnd}
        aria-label="SOS emergency button — press and hold for 3 seconds to activate"
        aria-pressed={holding}
      >
        {holding ? countdown : "SOS"}
      </button>
      <p className="sw-sos-hint" aria-live="polite">
        {holding ? "Release to cancel" : "Hold 3 s to activate"}
      </p>
    </div>
  );
}

export default SOSButton;
