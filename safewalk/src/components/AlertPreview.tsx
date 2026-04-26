// ─── Alert preview panel ──────────────────────────────────────────────────────
// Slice 11 – shows which contacts would be alerted + simulated SMS preview

import type { TrustedContact } from "../types/contact";
import type { LocationData } from "../types/walk";
import { buildSmsMessage, buildShareUrl } from "../services/alert";
import "../styles/Escalation.css";

interface Props {
  contacts: TrustedContact[];
  location: LocationData | null;
  sessionId: string;
  onDismiss: () => void;
}

/**
 * Displayed after SOS is activated.
 * Shows a real-looking preview of the SMS + push notification that
 * would be sent to each trusted contact in a real backend integration.
 */
function AlertPreview({ contacts, location, sessionId, onDismiss }: Props) {
  const shareUrl = buildShareUrl(sessionId);

  return (
    <div
      className="sw-alert-preview"
      role="region"
      aria-label="Alert preview — contacts notified"
    >
      <div className="sw-alert-preview-header">
        <p className="sw-alert-preview-title">
          🚨 Alerts sent to {contacts.length} contact
          {contacts.length !== 1 ? "s" : ""}
        </p>
      </div>

      {contacts.length > 0 ? (
        <ul className="sw-alert-preview-list" aria-label="Contact alert list">
          {contacts.map((c) => (
            <li key={c.id} className="sw-alert-preview-item">
              <div className="sw-alert-preview-contact">
                <span className="sw-alert-preview-name">{c.name}</span>
                {c.isPrimary && (
                  <span className="sw-alert-preview-primary" aria-label="Primary contact">
                    Primary
                  </span>
                )}
              </div>
              <span className="sw-alert-preview-sms-label">SMS preview</span>
              <p className="sw-alert-preview-sms-text">
                {buildSmsMessage(c.name, location, shareUrl)}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="sw-alert-preview-empty">
          No trusted contacts saved.{" "}
          <a href="/contacts" className="sw-button-text">
            Add contacts
          </a>{" "}
          to enable alerts.
        </p>
      )}

      <button
        className="sw-button sw-button--ghost"
        onClick={onDismiss}
        aria-label="Dismiss alert preview"
      >
        Dismiss
      </button>
    </div>
  );
}

export default AlertPreview;
