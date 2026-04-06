// src/components/MapView.tsx
import React, { useEffect, useState } from "react";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Polyline } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { WalkState } from "../types/walk";

interface MapViewProps {
  walk: WalkState;
}

// Default position (San Francisco)
const DEFAULT_POSITION: [number, number] = [37.7749, -122.4194];

// Custom marker icon
const userIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/684/684908.png",
  iconSize: [30, 30],
});

const MapView: React.FC<MapViewProps> = ({ walk }) => {
  const [position, setPosition] = useState<[number, number]>(DEFAULT_POSITION);
  const [route, setRoute] = useState<[number, number][]>([]);

  // Mock movement every 10 seconds
  useEffect(() => {
    if (!walk.isActive) return;

    const interval = setInterval(() => {
      setPosition((prev) => [prev[0] + 0.0003, prev[1] + 0.0002]);
    }, 10000);

    return () => clearInterval(interval);
  }, [walk.isActive]);

  // Generate route to destination
  useEffect(() => {
    if (walk.destination) {
      const dest: [number, number] = [position[0] + 0.01, position[1] + 0.01];
      setRoute([position, dest]);
    } else {
      setRoute([]);
    }
  }, [walk.destination, position]);

  return (
    <div className="sw-map-card">
      <MapContainer
        center={position}
        zoom={15}
        scrollWheelZoom
        style={{ height: "220px", borderRadius: "24px" }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        <Marker position={position} icon={userIcon} />
        {route.length === 2 && <Polyline positions={route} color="lime" />}
      </MapContainer>
    </div>
  );
};

export default MapView;