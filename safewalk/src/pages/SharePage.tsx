// ─── Trusted contact share page ───────────────────────────────────────────────
// Slice 12 – public read-only location view opened via short URL
//            route: /share/:sessionId (no login required)

import { lazy, Suspense, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import type { ShareSessionData } from "../types/location";
import { getShareSessionDB, subscribeToShareSession } from "../services/db";
import type { ShareSessionRow } from "../services/db";
import "../styles/SharePage.css";

const ShareMapView = lazy(() => import("../components/ShareMapView"));

/** Translate a bearing angle to a compass abbreviation. */
function bearingToCompass(deg: number): string {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"] as const;
  return dirs[Math.round(deg / 45) % 8];
}

function rowToSession(row: ShareSessionRow): ShareSessionData {
  return {
    sessionId: row.id,
    userName: row.user_name,
    location: {
      lat: row.last_lat ?? 0,
      lng: row.last_lng ?? 0,
    },
    bearing: row.last_bearing ?? 0,
    speed: row.last_speed ?? 0,
    lastUpdated: row.last_updated_at ? new Date(row.last_updated_at) : new Date(),
    expiresAt: new Date(row.expires_at),
    userPhone: row.user_phone ?? "",
  };
}

function SharePage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [session, setSession] = useState<ShareSessionData | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!sessionId) return;

    getShareSessionDB(sessionId).then((row) => {
      if (!row) { setNotFound(true); return; }
      setSession(rowToSession(row));
    });

    const channel = subscribeToShareSession(sessionId, (row) => {
      setSession(rowToSession(row));
    });

    return () => { channel.unsubscribe(); };
  }, [sessionId]);

  if (notFound) {
    return (
      <div className="sw-share-layout">
        <section className="sw-share-card">
          <div className="sw-share-expired" role="alert">
            <p>⚠️ This tracking link was not found or has already expired.</p>
          </div>
        </section>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="sw-share-layout">
        <p className="sw-share-loading">Loading session…</p>
      </div>
    );
  }

  const isExpired = new Date() > session.expiresAt;
  const hasLocation = session.location.lat !== 0 || session.location.lng !== 0;

  return (
    <div className="sw-share-layout">
      <section className="sw-share-card" aria-label="Live location tracking">
        <div className="sw-share-header">
          <div className="sw-share-avatar" aria-hidden="true">🚶</div>
          <div>
            <p className="sw-walk-eyebrow">Live tracking</p>
            <h1 className="sw-share-name">{session.userName}</h1>
            <p className="sw-share-subtitle">
              is on a walk — you're receiving their live location
            </p>
          </div>
        </div>

        {isExpired ? (
          <div className="sw-share-expired" role="alert">
            <p>⏰ This tracking link has expired. Links are valid for 24 hours.</p>
          </div>
        ) : (
          <>
            <div className="sw-share-data-grid">
              <div className="sw-share-data-cell">
                <span className="sw-walk-meta-label">Coordinates</span>
                <span className="sw-share-data-value">
                  {hasLocation
                    ? `${session.location.lat.toFixed(5)}°N, ${Math.abs(session.location.lng).toFixed(5)}°W`
                    : "Waiting for GPS…"}
                </span>
              </div>
              <div className="sw-share-data-cell">
                <span className="sw-walk-meta-label">Direction</span>
                <span className="sw-share-data-value">
                  {bearingToCompass(session.bearing)} ({Math.round(session.bearing)}°)
                </span>
              </div>
              <div className="sw-share-data-cell">
                <span className="sw-walk-meta-label">Speed</span>
                <span className="sw-share-data-value">
                  {(session.speed * 3.6).toFixed(1)} km/h
                </span>
              </div>
              <div className="sw-share-data-cell">
                <span className="sw-walk-meta-label">Last update</span>
                <span
                  className="sw-share-data-value"
                  aria-live="polite"
                  aria-label={`Last updated at ${session.lastUpdated.toLocaleTimeString()}`}
                >
                  {session.lastUpdated.toLocaleTimeString()}
                </span>
              </div>
            </div>

            <Suspense
              fallback={
                <div className="sw-share-map-wrapper sw-share-map-loading" aria-label="Loading map">
                  Loading map…
                </div>
              }
            >
              <ShareMapView
                location={hasLocation ? session.location : null}
                lastUpdated={session.lastUpdated}
              />
            </Suspense>

            {session.userPhone && (
              <a
                href={`tel:${session.userPhone}`}
                className="sw-button sw-button--primary sw-share-call-btn"
                aria-label={`Call ${session.userName}`}
              >
                📞 Call {session.userName}
              </a>
            )}

            <p className="sw-share-expiry-note">
              Link valid until {session.expiresAt.toLocaleTimeString()} (24h window)
            </p>
          </>
        )}
      </section>
    </div>
  );
}

export default SharePage;
