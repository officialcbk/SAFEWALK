import { useEffect, useState } from "react";
import type { WalkState } from "../types/walk";
import StatusBadge from "../components/StatusBadge";
import MapPlaceholder from "../components/MapPlaceHolder";

const UPDATE_INTERVAL_MS = 10_000;

// Simple fake ETA calculation (distance in km / average speed km/h)
const calculateETA = (distanceKm: number, avgSpeedKmh = 5): string => {
  const minutes = Math.round((distanceKm / avgSpeedKmh) * 60);
  return `${minutes} min`;
};

function WalkPage() {
  const [walk, setWalk] = useState<WalkState>({
    status: "inactive",
    isActive: false,
    lastUpdate: null,
    destination: null, // new field for Slice 2
  });

  const [distanceToDestination, setDistanceToDestination] = useState<number>(0);
  const [eta, setEta] = useState<string | null>(null);

  // 10-second update interval
  useEffect(() => {
    if (!walk.isActive) return;

    const id = setInterval(() => {
      setWalk((prev) => ({ ...prev, lastUpdate: new Date() }));

      if (walk.destination) {
        const fakeDistance = Math.max(distanceToDestination - 0.05, 0); // decrement 50m
        setDistanceToDestination(fakeDistance);
        setEta(calculateETA(fakeDistance));
      }
    }, UPDATE_INTERVAL_MS);

    // initial timestamp
    setWalk((prev) => ({ ...prev, lastUpdate: new Date() }));

    return () => clearInterval(id);
  }, [walk.isActive, walk.destination, distanceToDestination]);

  const handleStart = () => {
    setWalk((prev) => ({
      ...prev,
      status: "active",
      isActive: true,
      lastUpdate: new Date(),
    }));

    if (walk.destination) {
      setDistanceToDestination(2); // fake initial distance in km
      setEta(calculateETA(2));
    }
  };

  const handleEnd = () => {
    setWalk({
      status: "inactive",
      isActive: false,
      lastUpdate: null,
      destination: null,
    });
    setDistanceToDestination(0);
    setEta(null);
  };

  const isActive = walk.isActive;

  return (
    <div className="sw-walk-layout">
      <section className="sw-walk-card">
        <div className="sw-walk-card-header">
          <div>
            <p className="sw-walk-eyebrow">Active session</p>
            <h1 className="sw-walk-title">Walk Mode</h1>
            <p className="sw-walk-description">
              Start a safety session and we’ll keep an eye on your route until
              you arrive.
            </p>
          </div>
          <StatusBadge status={walk.status} />
        </div>

        <div className="sw-walk-meta-row">
          <div>
            <div className="sw-walk-meta-label">Session</div>
            <div className="sw-walk-meta-value">
              {isActive ? "Monitoring in progress" : "Not started"}
            </div>
          </div>
          <div className="sw-walk-meta-right">
            <div className="sw-walk-meta-label">Mock update window</div>
            <div className="sw-walk-meta-value">Every 10 seconds</div>
          </div>
        </div>

        {/* Slice 2: Destination Input */}
        <div className="sw-walk-meta-row" style={{ marginTop: "0.75rem" }}>
          <input
            type="text"
            placeholder="Enter destination (optional)"
            value={walk.destination ?? ""}
            disabled={isActive}
            onChange={(e) =>
              setWalk((prev) => ({
                ...prev,
                destination: e.target.value || null,
              }))
            }
            className="sw-walk-destination-input"
          />
          {eta && <p className="sw-walk-meta-value">ETA: {eta}</p>}
        </div>

        <div className="sw-walk-actions">
          <button
            onClick={handleStart}
            disabled={isActive}
            className={
              isActive
                ? "sw-button sw-button--primary sw-button--disabled"
                : "sw-button sw-button--primary"
            }
          >
            {isActive ? "Walk in progress" : "Start Walk"}
          </button>

          <button
            onClick={handleEnd}
            disabled={!isActive}
            aria-label="End walk"
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

      <MapPlaceholder isActive={walk.isActive} lastUpdate={walk.lastUpdate} />

      <p className="sw-walk-footnote">
        Now supports optional destination and ETA calculation. Walk works with
        or without a destination.
      </p>
    </div>
  );
}

export default WalkPage;