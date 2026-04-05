import '../styles/Components.css';

interface Props {
  isActive: boolean;
  lastUpdate: Date | null;
}

function MapPlaceholder({ isActive, lastUpdate }: Props) {
  return (
    <section className="sw-map-card">
    
      <div className="sw-map-card-header">
        <div>
          <p className="sw-map-label">Live route preview</p>
          <p className="sw-map-title">Map coming soon</p>
        </div>

        <div className="sw-map-status">
          <div>{isActive ? "Tracking enabled" : "Tracking paused"}</div>
          <div className="sw-map-status-sub">
            Last update:{" "}
            {lastUpdate ? lastUpdate.toLocaleTimeString() : "no updates yet"}
          </div>
        </div>
      </div>

      <div className="sw-map-viewport">
        <div className="sw-map-viewport-inner">
          <div className="sw-map-viewport-pill">
            <p>We’ll draw your real route and live location here.</p>
          </div>
        </div>

        <div className="sw-map-dot sw-map-dot--left" />
        <div className="sw-map-dot sw-map-dot--right" />
      </div>
    </section>
  );
}

export default MapPlaceholder;
