// ─── Escalation panel component ──────────────────────────────────────────────
// Slice 8 – 5-stage escalation UI: stage pips, countdown, cancel button
// Slice 9 – 911 call flow: coordinate display + confirmation dialog at stage 4

import { useState } from "react";
import type { EscalationState, EscalationStage } from "../types/escalation";
import type { LocationData } from "../types/walk";
import "../styles/Escalation.css";

interface Props {
  escalation: EscalationState;
  /** Countdown seconds remaining in the current timed stage. Null if no timer. */
  secondsRemaining: number | null;
  location: LocationData | null;
  onCancel: () => void;
}

const STAGE_TITLES: Record<EscalationStage, string> = {
  1: "Are you OK?",
  2: "Alerting your contacts",
  3: "Calling primary contact",
  4: "Emergency guidance",
  5: "Ongoing monitoring",
};

const STAGE_DESCRIPTIONS: Record<EscalationStage, string> = {
  1: "We detected a possible emergency. Tap Im Safe to cancel the alert.",
  2: "Sending your location to all trusted contacts via SMS and push notification.",
  3: "Attempting a call to your primary trusted contact on your behalf.",
  4: "If you need emergency services, call 911 now. Your coordinates are shown below.",
  5: "Your contacts have been notified and are tracking your location. Confirm you're safe to end.",
};

/**
 * Full-screen escalation overlay.
 * Rendered only when escalation.isActive is true.
 * Wraps in an alertdialog role so screen readers announce it immediately.
 */
function EscalationPanel({ escalation, secondsRemaining, location, onCancel }: Props) {
  const [show911Confirm, setShow911Confirm] = useState(false);
  const [called911, setCalled911] = useState(false);

  if (!escalation.isActive) return null;

  const { stage, trigger } = escalation;
  const triggerLabel = trigger === "sos" ? "SOS activated" : "Missed check-in";

  /** Open the phone dialer and log the event for backend integration. */
  const handleCall911 = () => {
    setCalled911(true);
    setShow911Confirm(false);
    console.log("[SafeWalk] 🚨 911 call initiated", {
      timestamp: new Date().toISOString(),
      location,
    });
    window.location.href = "tel:911";
  };

  return (
    <>
      <div
        className="sw-esc-backdrop"
        role="alertdialog"
        aria-modal="true"
        aria-live="assertive"
        aria-label={`Escalation stage ${stage}: ${STAGE_TITLES[stage]}`}
      >
        <div className="sw-esc-panel">
          {/* Header: trigger label + stage progress pips */}
          <div className="sw-esc-header">
            <span className="sw-esc-trigger-label">{triggerLabel}</span>
            <div className="sw-esc-stage-pips" aria-label="Escalation progress">
              {([1, 2, 3, 4, 5] as EscalationStage[]).map((s) => (
                <div
                  key={s}
                  className={
                    s < stage
                      ? "sw-esc-pip sw-esc-pip--done"
                      : s === stage
                      ? "sw-esc-pip sw-esc-pip--active"
                      : "sw-esc-pip"
                  }
                  aria-label={`Stage ${s}${s === stage ? " – current" : s < stage ? " – complete" : ""}`}
                />
              ))}
            </div>
          </div>

          {/* Stage content */}
          <div className="sw-esc-body">
            <p className="sw-esc-stage-number">Stage {stage} of 5</p>
            <h2 className="sw-esc-stage-title">{STAGE_TITLES[stage]}</h2>
            <p className="sw-esc-stage-desc">{STAGE_DESCRIPTIONS[stage]}</p>

            {/* Countdown timer for timed stages 1–3 */}
            {secondsRemaining !== null && (
              <div className="sw-esc-countdown" aria-live="polite">
                <span className="sw-esc-countdown-num">{secondsRemaining}</span>
                <span className="sw-esc-countdown-label">
                  second{secondsRemaining !== 1 ? "s" : ""} until next stage
                </span>
              </div>
            )}

            {/* Stage 4: location display + 911 call (Slice 9) */}
            {stage === 4 && (
              <div className="sw-esc-911-section">
                {location && (
                  <p className="sw-esc-coords" aria-label="Your current coordinates">
                    📍 {location.lat.toFixed(5)}°, {location.lng.toFixed(5)}°
                  </p>
                )}
                {called911 ? (
                  <p className="sw-esc-911-confirmed" role="status">
                    ✅ Emergency services contacted
                  </p>
                ) : (
                  <button
                    className="sw-esc-911-btn"
                    onClick={() => setShow911Confirm(true)}
                    aria-label="Call 911 emergency services"
                  >
                    📞 Call 911
                  </button>
                )}
              </div>
            )}

            {/* Stage 5: monitoring message */}
            {stage === 5 && (
              <p className="sw-esc-monitoring-note">
                Contacts are monitoring your session in real time.
                Tap "I'm Safe" once you've reached safety.
              </p>
            )}
          </div>

          {/* Cancel / safe button – always available */}
          <button
            className="sw-esc-safe-btn"
            onClick={onCancel}
            aria-label="I am safe — cancel escalation"
          >
            ✓ I'm Safe
          </button>
        </div>
      </div>

      {/* 911 confirmation dialog (Slice 9) */}
      {show911Confirm && (
        <div
          className="sw-esc-confirm-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Confirm 911 call"
        >
          <div className="sw-esc-confirm">
            <p className="sw-esc-confirm-title">Call 911 now?</p>
            <p className="sw-esc-confirm-body">
              This will open your phone dialer. Emergency services will be contacted.
              {location && (
                <> Your location ({location.lat.toFixed(4)}°, {location.lng.toFixed(4)}°) is ready to share.</>
              )}
            </p>
            <div className="sw-esc-confirm-actions">
              <button
                className="sw-esc-911-btn"
                onClick={handleCall911}
                aria-label="Confirm call to 911"
              >
                Confirm – Call 911
              </button>
              <button
                className="sw-button sw-button--ghost"
                onClick={() => setShow911Confirm(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default EscalationPanel;
