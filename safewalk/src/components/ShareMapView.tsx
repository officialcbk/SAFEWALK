// ─── Share page map component ─────────────────────────────────────────────────
// FR8.2 – interactive map on the trusted contact tracking view.
// Reuses the Leaflet stack already in the project.

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Circle, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

interface Props {
  location: { lat: number; lng: number } | null;
  lastUpdated: Date;
}

const DEFAULT_CENTER: [number, number] = [43.6532, -79.3832];

function RecenterMap({ location }: { location: { lat: number; lng: number } | null }) {
  const map = useMap();
  useEffect(() => {
    if (location) map.setView([location.lat, location.lng], map.getZoom());
  }, [location, map]);
  return null;
}

function ShareMapView({ location, lastUpdated }: Props) {
  const center: [number, number] = location
    ? [location.lat, location.lng]
    : DEFAULT_CENTER;

  return (
    <div className="sw-share-map-wrapper">
      <MapContainer
        center={center}
        zoom={15}
        style={{ height: "100%", width: "100%" }}
        zoomControl
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        {location && (
          <>
            <Marker position={[location.lat, location.lng]} />
            <Circle
              center={[location.lat, location.lng]}
              radius={25}
              pathOptions={{
                color: "#3b82f6",
                fillColor: "#3b82f6",
                fillOpacity: 0.12,
                weight: 1.5,
              }}
            />
          </>
        )}
        <RecenterMap location={location} />
      </MapContainer>
      <p className="sw-share-map-caption" aria-live="polite">
        Last updated {lastUpdated.toLocaleTimeString()} · Live via Supabase Realtime
      </p>
    </div>
  );
}

export default ShareMapView;
