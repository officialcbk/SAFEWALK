// ─── Settings & privacy page ──────────────────────────────────────────────────
// Slice 17 – privacy policy summary, export my data, delete all data

import { useCallback, useState } from "react";
import { deleteAllData, exportAllData } from "../services/storage";
import { deleteAllUserDataDB } from "../services/db";
import "../styles/SettingsPage.css";

function SettingsPage() {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleted, setDeleted] = useState(false);

  /**
   * Serialize all stored SafeWalk data to a JSON file and trigger
   * a browser download (Slice 17 – "Export My Data").
   */
  const handleExport = useCallback(() => {
    const json = exportAllData();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `safewalk-export-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }, []);

  /** Wipe all SafeWalk data from localStorage and Supabase (Slice 17 – "Delete All Data"). */
  const handleDeleteAll = useCallback(async () => {
    await deleteAllUserDataDB();
    deleteAllData();
    setShowDeleteConfirm(false);
    setDeleted(true);
  }, []);

  return (
    <div className="sw-settings-layout">
      <section className="sw-settings-card">
        <div>
          <p className="sw-walk-eyebrow">Preferences</p>
          <h1 className="sw-settings-title">Settings</h1>
        </div>

        {/* Privacy policy summary */}
        <div className="sw-settings-section">
          <h2 className="sw-settings-section-title">Privacy Policy Summary</h2>
          <ul
            className="sw-settings-privacy-list"
            aria-label="Privacy highlights"
          >
            <li>📍 Location tracked <strong>only during active walks</strong></li>
            <li>🚫 No background tracking at any time</li>
            <li>☁️ Walk sessions, contacts, and location data synced to a <strong>private cloud database</strong> (Supabase) — encrypted in transit and at rest</li>
            <li>🔑 Your data is scoped to your anonymous device ID — no account or email required</li>
            <li>🗑️ Data auto-deleted after <strong>30 days</strong></li>
            <li>🤝 Your data is never sold or shared with third parties</li>
            <li>🛡️ Compliant with PIPEDA privacy requirements</li>
          </ul>
        </div>

        {/* Data retention notice */}
        <div className="sw-settings-section">
          <h2 className="sw-settings-section-title">Data Retention</h2>
          <p className="sw-settings-body">
            Walk session history and GPS data are automatically purged 30 days
            after capture. Trusted contacts are retained until you remove them
            manually. All data is encrypted at rest using AES-256 and in transit
            using TLS 1.3 via Supabase.
          </p>
        </div>

        {/* Export */}
        <div className="sw-settings-section">
          <h2 className="sw-settings-section-title">Your Data</h2>
          <p className="sw-settings-body">
            Download a full copy of all SafeWalk data stored on your device.
          </p>
          <button
            className="sw-button sw-button--secondary"
            onClick={handleExport}
            aria-label="Export all my SafeWalk data as JSON"
          >
            ⬇️ Export My Data
          </button>
        </div>

        {/* Delete all */}
        <div className="sw-settings-section">
          <h2 className="sw-settings-section-title">Delete All Data</h2>
          <p className="sw-settings-body">
            Permanently remove all contacts, walk history, and app settings from
            this device. This action cannot be undone.
          </p>

          {deleted ? (
            <p
              className="sw-settings-deleted"
              role="status"
              aria-live="polite"
            >
              ✅ All data has been deleted.
            </p>
          ) : showDeleteConfirm ? (
            <div
              className="sw-settings-confirm"
              role="alertdialog"
              aria-modal="true"
              aria-label="Confirm data deletion"
            >
              <p className="sw-settings-confirm-text">
                Are you sure? This will permanently erase all your SafeWalk
                data including contacts and walk history.
              </p>
              <div className="sw-settings-confirm-actions">
                <button
                  className="sw-button sw-button--danger"
                  onClick={handleDeleteAll}
                  aria-label="Confirm — delete all data"
                >
                  Yes, delete everything
                </button>
                <button
                  className="sw-button sw-button--ghost"
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              className="sw-button sw-button--danger"
              onClick={() => setShowDeleteConfirm(true)}
              aria-label="Delete all SafeWalk data from this device"
            >
              🗑️ Delete All Data
            </button>
          )}
        </div>
      </section>
    </div>
  );
}

export default SettingsPage;
