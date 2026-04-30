// ─── Check-in prompt component ────────────────────────────────────────────────
// Slice 13 – prompt displayed after 90 s of inactivity during a walk
// Slice 14 – ignored prompt triggers escalation via useInactivity.onMissed

import "../styles/Escalation.css";

interface Props {
  /** Called when the user taps "I'm OK" to dismiss the prompt. */
  onSafe: () => void;
}

/**
 * Full-screen modal shown when the inactivity timer fires.
 * The user has 30 seconds to respond before escalation begins.
 * Uses autoFocus on the safe button for keyboard + accessibility.
 */
function CheckInPrompt({ onSafe }: Props) {
  return (
    <div
      className="sw-checkin-backdrop"
      role="alertdialog"
      aria-modal="true"
      aria-live="assertive"
      aria-label="Safety check — are you safe?"
    >
      <div className="sw-checkin-panel">
        <div className="sw-checkin-icon" aria-hidden="true">
          👁
        </div>
        <h2 className="sw-checkin-title">Are you safe?</h2>
        <p className="sw-checkin-body">
          We haven't detected any activity for a while. Tap "I'm OK" within
          30 seconds or we'll alert your trusted contacts.
        </p>
        <button
          className="sw-button sw-button--primary"
          onClick={onSafe}
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus
          aria-label="I am OK — dismiss safety check"
        >
          ✓ I'm OK
        </button>
      </div>
    </div>
  );
}

export default CheckInPrompt;
