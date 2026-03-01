import { useEffect, useState } from "react";
import type { WalkState } from "../types/walk";
import StatusBadge from "../components/StatusBadge";
import MapPlaceholder from "../components/MapPlaceHolder";

const UPDATE_INTERVAL_MS = 10_000;

function WalkPage() {
  const [walk, setWalk] = useState<WalkState>({
    status: "inactive",
    isActive: false,
    lastUpdate: null,
  });

  useEffect(() => {
    if (!walk.isActive) return;

    const id = setInterval(() => {
      setWalk((prev) => ({ ...prev, lastUpdate: new Date() }));
    }, UPDATE_INTERVAL_MS);

    setWalk((prev) => ({ ...prev, lastUpdate: new Date() }));

    return () => clearInterval(id);
  }, [walk.isActive]);

  const handleStart = () => {
    setWalk({
      status: "active",
      isActive: true,
      lastUpdate: null,
    });
  };

  const handleEnd = () => {
    setWalk({
      status: "inactive",
      isActive: false,
      lastUpdate: null,
    });
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
        This first slice covers your basic Walk Mode session: start, mock
        10‑second updates, and end. It matches a small part of your MVP
        requirements so you can iterate vertically from here.
      </p>
    </div>
  );
}

export default WalkPage;
