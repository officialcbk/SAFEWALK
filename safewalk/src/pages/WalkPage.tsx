// ─── Walk Mode page ───────────────────────────────────────────────────────────
// Slice  1 – core walk session lifecycle
// Slice  2 – destination input + ETA calculation
// Slice  4 – real browser geolocation (useGeolocation hook)
// Slice  5 – last known location display + clear
// Slice  6 – SOS button (SOSButton component)
// Slice  7 – press-and-hold SOS activation (inside SOSButton)
// Slice  8 – escalation panel (useEscalation hook + EscalationPanel)
// Slice  9 – 911 call flow (inside EscalationPanel at stage 4)
// Slice 11 – alert preview on SOS (AlertPreview component)
// Slice 13 – inactivity check-in (useInactivity hook + CheckInPrompt)
// Slice 14 – missed check-in → escalation trigger
// Slice 15 – lazy-loaded MapView (Suspense wrapper)
// Slice 17 – permission modal on first walk start (PermissionModal)
// Navigation – geocoded destination, OSRM walking route, real-time haversine ETA

import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import type { WalkState, LocationData } from "../types/walk";
import StatusBadge from "../components/StatusBadge";
import SOSButton from "../components/SOSButton";
import EscalationPanel from "../components/EscalationPanel";
import AlertPreview from "../components/AlertPreview";
import CheckInPrompt from "../components/CheckInPrompt";
import PermissionModal from "../components/PermissionModal";
import MapPlaceholder from "../components/MapPlaceHolder";
import { useGeolocation } from "../hooks/useGeolocation";
import { useEscalation } from "../hooks/useEscalation";
import { useInactivity } from "../hooks/useInactivity";
import {
  saveLastKnownLocation,
  loadLastKnownLocation,
  clearLastKnownLocation,
  loadContacts,
  hasSeenPermissionModal,
  markPermissionSeen,
} from "../services/storage";
import { haversineDistance, tickDistance, formatEta } from "../services/eta";
import { sendAlert, buildShareUrl } from "../services/alert";
import { geocodeAddress, getWalkingRoute } from "../services/routing";
import {
  createWalkSessionDB,
  endWalkSessionDB,
  updateWalkDestinationDB,
  pushLocationSnapshotDB,
  createShareSessionDB,
  updateShareSessionLocationDB,
} from "../services/db";
import "../styles/WalkPage.css";

const MapView = lazy(() => import("../components/MapView"));

const UPDATE_INTERVAL_MS = 10_000;

function WalkPage() {
  // ── Core walk state ────────────────────────────────────────────────────────
  const [walk, setWalk] = useState<WalkState>({
    status: "inactive",
    isActive: false,
    lastUpdate: null,
    destination: null,
    eta: null,
    location: null,
  });

  // ── Last known location ────────────────────────────────────────────────────
  const [lastKnownLocation, setLastKnownLocation] = useState<LocationData | null>(
    loadLastKnownLocation
  );

  // ── Navigation / routing state ─────────────────────────────────────────────
  const [routeCoords, setRouteCoords] = useState<[number, number][] | null>(null);
  const [destinationCoords, setDestinationCoords] = useState<[number, number] | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);

  // ── Refs (avoid stale closures in effects/callbacks) ──────────────────────
  const remainingDistRef = useRef<number>(0);
  const walkDbSessionIdRef = useRef<string | null>(null);
  const destinationCoordsRef = useRef<[number, number] | null>(null);
  const locationRef = useRef<LocationData | null>(null);
  const isActiveRef = useRef(false);
  const routeLoadedRef = useRef(false);
  const geocodeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const destinationTextRef = useRef<string>("");

  // ── Permission modal ───────────────────────────────────────────────────────
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const pendingStartRef = useRef(false);

  // ── Alert preview ──────────────────────────────────────────────────────────
  const [showAlertPreview, setShowAlertPreview] = useState(false);
  const [sessionId] = useState(() => Math.random().toString(36).slice(2, 9));

  // ── Sub-hooks ──────────────────────────────────────────────────────────────
  const {
    location,
    permissionDenied,
    error: geoError,
    startTracking,
    stopTracking,
  } = useGeolocation();

  const { escalation, secondsRemaining, startEscalation, cancelEscalation } =
    useEscalation();

  const handleMissedCheckIn = useCallback(() => {
    startEscalation("checkin");
  }, [startEscalation]);

  const { showCheckIn, dismissCheckIn } = useInactivity(
    walk.isActive,
    handleMissedCheckIn
  );

  // Keep isActiveRef in sync so callbacks don't capture stale walk.isActive
  useEffect(() => {
    isActiveRef.current = walk.isActive;
  }, [walk.isActive]);

  // ── Route fetcher ──────────────────────────────────────────────────────────
  const fetchRouteIfReady = useCallback(() => {
    const loc = locationRef.current;
    const dest = destinationCoordsRef.current;
    if (!loc || !dest || routeLoadedRef.current) return;
    routeLoadedRef.current = true;
    setRouteLoading(true);
    setRouteError(null);
    getWalkingRoute([loc.lat, loc.lng], dest).then((result) => {
      setRouteLoading(false);
      if (result) {
        setRouteCoords(result.waypoints);
        remainingDistRef.current = result.distanceMetres;
        setWalk((prev) => ({ ...prev, eta: formatEta(result.distanceMetres) }));
      } else {
        routeLoadedRef.current = false; // allow retry on next GPS ping
        setRouteError("Routing unavailable — try a different address");
      }
    });
  }, []);

  // ── Sync real GPS into walk state + push to Supabase ──────────────────────
  useEffect(() => {
    if (!location) return;
    locationRef.current = location;
    if (!walk.isActive) return;

    const dest = destinationCoordsRef.current;
    const dist = dest
      ? haversineDistance(location.lat, location.lng, dest[0], dest[1])
      : null;

    if (dist !== null) remainingDistRef.current = dist;

    setWalk((prev) => ({
      ...prev,
      location,
      lastUpdate: location.timestamp,
      ...(dist !== null ? { eta: formatEta(dist) } : {}),
    }));

    if (walkDbSessionIdRef.current) {
      pushLocationSnapshotDB(walkDbSessionIdRef.current, location);
      updateShareSessionLocationDB(sessionId, location);
    }

    // Fetch walking route on first GPS fix after destination is geocoded
    if (dest && !routeLoadedRef.current) {
      fetchRouteIfReady();
    }
  }, [location, walk.isActive, sessionId, fetchRouteIfReady]);

  // ── 10-second update interval: timestamp + ETA tick ───────────────────────
  useEffect(() => {
    if (!walk.isActive) return;

    const id = setInterval(() => {
      setWalk((prev) => {
        if (prev.destination && remainingDistRef.current > 0) {
          remainingDistRef.current = tickDistance(remainingDistRef.current);
          return {
            ...prev,
            lastUpdate: new Date(),
            eta: formatEta(remainingDistRef.current),
          };
        }
        return { ...prev, lastUpdate: new Date() };
      });
    }, UPDATE_INTERVAL_MS);

    setWalk((prev) => ({ ...prev, lastUpdate: new Date() }));

    return () => clearInterval(id);
  }, [walk.isActive]);

  // ── Walk start / end ───────────────────────────────────────────────────────

  const doStart = useCallback(async () => {
    startTracking();
    routeLoadedRef.current = false;
    setRouteCoords(null);
    setRouteError(null);
    setWalk((prev) => ({
      status: "active",
      isActive: true,
      lastUpdate: null,
      destination: prev.destination, // keep any pre-entered destination
      eta: null,
      location: null,
    }));
    remainingDistRef.current = 0;
    const destText = destinationTextRef.current;
    const dbId = await createWalkSessionDB(destText || null);
    walkDbSessionIdRef.current = dbId;
    if (dbId) {
      await createShareSessionDB(sessionId, dbId, "SafeWalk User", "", null);
    }
  }, [startTracking, sessionId]);

  const handleStart = useCallback(() => {
    if (!hasSeenPermissionModal()) {
      pendingStartRef.current = true;
      setShowPermissionModal(true);
      return;
    }
    doStart();
  }, [doStart]);

  const handlePermissionAccept = useCallback(() => {
    markPermissionSeen();
    setShowPermissionModal(false);
    if (pendingStartRef.current) {
      pendingStartRef.current = false;
      doStart();
    }
  }, [doStart]);

  const handlePermissionDecline = useCallback(() => {
    markPermissionSeen();
    setShowPermissionModal(false);
    pendingStartRef.current = false;
    doStart();
  }, [doStart]);

  const handleEnd = useCallback(() => {
    stopTracking();
    if (geocodeTimerRef.current) clearTimeout(geocodeTimerRef.current);
    if (walkDbSessionIdRef.current) {
      endWalkSessionDB(walkDbSessionIdRef.current, "completed");
      walkDbSessionIdRef.current = null;
    }
    const locToSave = walk.location ?? location;
    if (locToSave) {
      saveLastKnownLocation(locToSave);
      setLastKnownLocation(locToSave);
    }
    setWalk({
      status: "inactive",
      isActive: false,
      lastUpdate: null,
      destination: null,
      eta: null,
      location: null,
    });
    setRouteCoords(null);
    setDestinationCoords(null);
    destinationCoordsRef.current = null;
    destinationTextRef.current = "";
    routeLoadedRef.current = false;
    remainingDistRef.current = 0;
  }, [stopTracking, walk.location, location]);

  // ── Destination input ──────────────────────────────────────────────────────
  const handleDestinationChange = useCallback(
    (value: string) => {
      destinationTextRef.current = value;
      if (geocodeTimerRef.current) clearTimeout(geocodeTimerRef.current);

      // Clear any existing route when the destination text changes
      setRouteCoords(null);
      setDestinationCoords(null);
      destinationCoordsRef.current = null;
      routeLoadedRef.current = false;
      setRouteError(null);

      if (!value.trim()) {
        remainingDistRef.current = 0;
        setWalk((prev) => ({ ...prev, destination: null, eta: null }));
        return;
      }

      setWalk((prev) => ({ ...prev, destination: value }));

      if (walkDbSessionIdRef.current) {
        updateWalkDestinationDB(walkDbSessionIdRef.current, value.trim());
      }

      // Debounce: geocode 1 second after the user stops typing
      geocodeTimerRef.current = setTimeout(async () => {
        setRouteLoading(true);
        setRouteError(null);
        const coords = await geocodeAddress(value.trim());
        setRouteLoading(false);
        if (!coords) {
          setRouteError("Address not found — try a more specific location");
          return;
        }
        destinationCoordsRef.current = coords;
        setDestinationCoords(coords);
        // If walk is already active and GPS is available, fetch the route now
        if (isActiveRef.current && locationRef.current) {
          fetchRouteIfReady();
        }
      }, 1000);
    },
    [fetchRouteIfReady]
  );

  // ── SOS activated ──────────────────────────────────────────────────────────
  const handleSOSActivated = useCallback(() => {
    if (geocodeTimerRef.current) clearTimeout(geocodeTimerRef.current);
    const contacts = loadContacts();
    sendAlert({
      userName: "User",
      contacts,
      location: walk.location,
      sessionUrl: buildShareUrl(sessionId),
      triggeredAt: new Date(),
    });
    if (walkDbSessionIdRef.current) {
      endWalkSessionDB(walkDbSessionIdRef.current, "escalated");
      walkDbSessionIdRef.current = null;
    }
    setShowAlertPreview(true);
    startEscalation("sos");
  }, [walk.location, sessionId, startEscalation]);

  const isActive = walk.isActive;

  return (
    <>
      {showPermissionModal && (
        <PermissionModal
          onAccept={handlePermissionAccept}
          onDecline={handlePermissionDecline}
        />
      )}

      <EscalationPanel
        escalation={escalation}
        secondsRemaining={secondsRemaining}
        location={walk.location}
        onCancel={cancelEscalation}
      />

      {showCheckIn && <CheckInPrompt onSafe={dismissCheckIn} />}

      <div className="sw-walk-layout">
        <section className="sw-walk-card">
          <div className="sw-walk-card-header">
            <div>
              <p className="sw-walk-eyebrow">Active session</p>
              <h1 className="sw-walk-title">Walk Mode</h1>
              <p className="sw-walk-description">
                Start a safety session and we'll keep an eye on your route
                until you arrive.
              </p>
            </div>
            <StatusBadge status={walk.status} />
          </div>

          {/* Destination + ETA */}
          <div className="sw-walk-destination-row">
            <label htmlFor="destination-input" className="sw-walk-meta-label">
              Destination (optional)
            </label>
            <input
              id="destination-input"
              className="sw-walk-destination-input"
              type="text"
              placeholder="Enter destination to see walking route…"
              value={walk.destination ?? ""}
              onChange={(e) => handleDestinationChange(e.target.value)}
              aria-describedby={walk.eta ? "eta-display" : undefined}
            />
            {routeLoading && (
              <p className="sw-walk-route-status" aria-live="polite">
                Finding route…
              </p>
            )}
            {routeError && !routeLoading && (
              <p className="sw-walk-route-error" role="alert">
                {routeError}
              </p>
            )}
            {walk.eta && !routeLoading && (
              <p
                id="eta-display"
                className="sw-walk-eta"
                aria-live="polite"
                aria-label={`Estimated time of arrival: ${walk.eta}`}
              >
                ETA: <strong>{walk.eta}</strong>
              </p>
            )}
          </div>

          {/* Session meta */}
          <div className="sw-walk-meta-row">
            <div>
              <div className="sw-walk-meta-label">Session</div>
              <div className="sw-walk-meta-value">
                {isActive ? "Monitoring in progress" : "Not started"}
              </div>
            </div>
            <div className="sw-walk-meta-right">
              <div className="sw-walk-meta-label">
                {walk.location ? "GPS" : "Mock update window"}
              </div>
              <div className="sw-walk-meta-value">
                {walk.location
                  ? `${walk.location.lat.toFixed(3)}°, ${walk.location.lng.toFixed(3)}°`
                  : "Every 10 seconds"}
              </div>
            </div>
          </div>

          {permissionDenied && (
            <p className="sw-walk-error" role="alert">
              ⚠️ Location permission denied. Enable it in browser settings for
              full tracking.
            </p>
          )}
          {geoError && !permissionDenied && (
            <p className="sw-walk-error" role="alert">
              {geoError}
            </p>
          )}

          <div className="sw-walk-actions">
            <button
              onClick={handleStart}
              disabled={isActive}
              className={
                isActive
                  ? "sw-button sw-button--primary sw-button--disabled"
                  : "sw-button sw-button--primary"
              }
              aria-label={isActive ? "Walk in progress" : "Start walk session"}
            >
              {isActive ? "Walk in progress" : "Start Walk"}
            </button>
            <button
              onClick={handleEnd}
              disabled={!isActive}
              aria-label="End walk session"
              title="End walk"
              className={
                !isActive
                  ? "sw-button-icon sw-button-icon--disabled"
                  : "sw-button-icon sw-button-icon--stop"
              }
            >
              ■
            </button>
          </div>
        </section>

        <SOSButton isWalkActive={isActive} onActivated={handleSOSActivated} />

        {showAlertPreview && (
          <AlertPreview
            contacts={loadContacts()}
            location={walk.location}
            sessionId={sessionId}
            onDismiss={() => setShowAlertPreview(false)}
          />
        )}

        <Suspense
          fallback={
            <MapPlaceholder
              isActive={walk.isActive}
              lastUpdate={walk.lastUpdate}
            />
          }
        >
          <MapView
            location={walk.location}
            isActive={walk.isActive}
            lastUpdate={walk.lastUpdate}
            routeCoords={routeCoords}
            destinationCoords={destinationCoords}
          />
        </Suspense>

        {!isActive && lastKnownLocation && (
          <section
            className="sw-last-known-card"
            aria-label="Last known location"
          >
            <p className="sw-walk-eyebrow">Last known location</p>
            <p className="sw-last-known-coords">
              {lastKnownLocation.lat.toFixed(5)}°,{" "}
              {lastKnownLocation.lng.toFixed(5)}°
            </p>
            <p className="sw-last-known-time">
              Recorded{" "}
              {new Date(lastKnownLocation.timestamp).toLocaleString()}
            </p>
            <button
              className="sw-button-text"
              onClick={() => {
                clearLastKnownLocation();
                setLastKnownLocation(null);
              }}
              aria-label="Clear last known location"
            >
              Clear
            </button>
          </section>
        )}

        <p className="sw-walk-footnote" aria-live="polite">
          {isActive
            ? "Walk session active — monitoring every 10 seconds."
            : "Start a walk to begin safety monitoring."}
        </p>
      </div>
    </>
  );
}

export default WalkPage;
