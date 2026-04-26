// ─── Location permission modal ────────────────────────────────────────────────
// Slice 17 – shown on first Walk Mode use to explain location access + privacy
// Fulfils NFR3.1: transparent data handling before any location is captured

import "../styles/SettingsPage.css";

interface Props {
  /** User accepted – proceed with location access. */
  onAccept: () => void;
  /** User declined – start walk without location tracking. */
  onDecline: () => void;
}

/**
 * Privacy-first permission dialog.
 * Displayed exactly once (controlled by hasSeenPermissionModal in storage).
 * Accepting does not automatically grant OS permission – the browser will
 * prompt separately when watchPosition is called.
 */
function PermissionModal({ onAccept, onDecline }: Props) {
  return (
    <div
      className="sw-permission-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Location access request"
    >
      <div className="sw-permission-panel">
        <div className="sw-permission-icon" aria-hidden="true">
          📍
        </div>
        <h2 className="sw-permission-title">Location Access</h2>
        <p className="sw-permission-body">
          SafeWalk needs your location{" "}
          <strong>only while a walk session is active</strong>. We never track
          you in the background or share your data with third parties.
        </p>

        <ul className="sw-permission-list" aria-label="Privacy highlights">
          <li>Location tracked only during active walks</li>
          <li>No background tracking at any time</li>
          <li>Data stored locally on your device only</li>
          <li>Auto-deleted after 30 days</li>
          <li>Delete everything in Settings at any time</li>
        </ul>

        <div className="sw-permission-actions">
          <button
            className="sw-button sw-button--primary"
            onClick={onAccept}
            aria-label="Allow location access and start walk"
          >
            Allow Location Access
          </button>
          <button
            className="sw-button sw-button--ghost"
            onClick={onDecline}
            aria-label="Decline location access — walk without tracking"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}

export default PermissionModal;
