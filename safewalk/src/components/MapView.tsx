// ─── Interactive map component ────────────────────────────────────────────────
// Slice 3 – replaces MapPlaceholder with a real Leaflet map
// Slice 4 – position marker updates as real GPS coordinates arrive
// Navigation – walking route polyline + destination marker

import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Polyline, CircleMarker, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import type { LocationData } from "../types/walk";

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

interface Props {
  location: LocationData | null;
  isActive: boolean;
  lastUpdate: Date | null;
  routeCoords?: [number, number][] | null;
  destinationCoords?: [number, number] | null;
}

/** Re-centers the map on GPS updates only while the walk is active. */
function RecenterMap({
  location,
  isActive,
}: {
  location: LocationData | null;
  isActive: boolean;
}) {
  const map = useMap();
  useEffect(() => {
    if (location && isActive) map.setView([location.lat, location.lng], map.getZoom());
  }, [location, isActive, map]);
  return null;
}

/** Fits the map to the full route bounds the first time a route is loaded. */
function FitRoute({
  routeCoords,
}: {
  routeCoords: [number, number][] | null | undefined;
}) {
  const map = useMap();
  const fittedRef = useRef(false);
  useEffect(() => {
    if (routeCoords && routeCoords.length >= 2 && !fittedRef.current) {
      fittedRef.current = true;
      map.fitBounds(routeCoords as L.LatLngBoundsExpression, { padding: [40, 40] });
    }
    if (!routeCoords) fittedRef.current = false;
  }, [routeCoords, map]);
  return null;
}

const DEFAULT_CENTER: [number, number] = [43.6532, -79.3832];

function MapView({ location, isActive, lastUpdate, routeCoords, destinationCoords }: Props) {
  const center: [number, number] = location
    ? [location.lat, location.lng]
    : DEFAULT_CENTER;

  return (
    <section className="sw-map-card" aria-label="Live route map">
      <div className="sw-map-card-header">
        <div>
          <p className="sw-map-label">Live route preview</p>
          <p className="sw-map-title">
            {isActive ? "Tracking active" : "Tracking paused"}
          </p>
        </div>
        <div className="sw-map-status">
          <div>{isActive ? "GPS enabled" : "GPS off"}</div>
          <div className="sw-map-status-sub">
            Last update:{" "}
            {lastUpdate ? lastUpdate.toLocaleTimeString() : "no updates yet"}
          </div>
        </div>
      </div>

      <div className="sw-map-leaflet-wrapper">
        <MapContainer
          center={center}
          zoom={15}
          style={{ height: "100%", width: "100%", borderRadius: "20px" }}
          zoomControl
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
          {location && <Marker position={[location.lat, location.lng]} />}
          {routeCoords && routeCoords.length >= 2 && (
            <Polyline
              positions={routeCoords}
              pathOptions={{ color: "#3b82f6", weight: 5, opacity: 0.85 }}
            />
          )}
          {destinationCoords && (
            <CircleMarker
              center={destinationCoords}
              radius={10}
              pathOptions={{
                color: "#ef4444",
                fillColor: "#ef4444",
                fillOpacity: 0.9,
                weight: 2,
              }}
            />
          )}
          <RecenterMap location={location} isActive={isActive} />
          <FitRoute routeCoords={routeCoords} />
        </MapContainer>
      </div>
    </section>
  );
}

export default MapView;
