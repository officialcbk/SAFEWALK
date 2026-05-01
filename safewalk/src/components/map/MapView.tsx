import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import type { LatLng } from '../../types';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN as string;

const DEFAULT_CENTER: [number, number] = [-97.1384, 49.8951]; // Winnipeg
const ACTIVE_ZOOM  = 16.5;
const PREVIEW_ZOOM = 15;

interface MapViewProps {
  location: LatLng | null;
  heading?: number | null;
  // [lng, lat][] – Mapbox convention
  routeCoords?: [number, number][] | null;
  // [lng, lat] – Mapbox convention
  destinationCoords?: [number, number] | null;
  isActive?: boolean;
  followUser?: boolean;
  onUserInteract?: () => void;
}

// ── User marker SVG ───────────────────────────────────────────────────────────

function makeUserMarkerEl(): HTMLElement {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'width:40px;height:40px;display:flex;align-items:center;justify-content:center;';

  // Outer halo (pulse)
  const halo = document.createElement('div');
  halo.style.cssText = `
    position:absolute;
    width:52px;height:52px;border-radius:50%;
    background:rgba(66,133,244,0.18);
    animation:user-halo 2s ease-out infinite;
    pointer-events:none;
  `;

  // Navigation arrow circle
  const disc = document.createElement('div');
  disc.style.cssText = `
    position:relative;
    width:36px;height:36px;border-radius:50%;
    background:#4285F4;
    border:3px solid white;
    box-shadow:0 2px 8px rgba(0,0,0,0.30);
    display:flex;align-items:center;justify-content:center;
    z-index:1;
    transition:transform 0.3s ease;
  `;
  disc.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M8 2L12.5 12L8 9.5L3.5 12L8 2Z" fill="white"/>
    </svg>
  `;

  // inject keyframe once
  if (!document.getElementById('sw-map-keyframes')) {
    const style = document.createElement('style');
    style.id = 'sw-map-keyframes';
    style.textContent = `
      @keyframes user-halo {
        0%   { transform:scale(0.7); opacity:0.6; }
        70%  { transform:scale(1.4); opacity:0;   }
        100% { transform:scale(1.4); opacity:0;   }
      }
    `;
    document.head.appendChild(style);
  }

  wrap.appendChild(halo);
  wrap.appendChild(disc);
  return wrap;
}

// ── Destination pin SVG ───────────────────────────────────────────────────────

function makeDestMarkerEl(): HTMLElement {
  const el = document.createElement('div');
  el.innerHTML = `
    <svg width="32" height="42" viewBox="0 0 32 42" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 0C7.163 0 0 7.163 0 16C0 24.837 16 42 16 42C16 42 32 24.837 32 16C32 7.163 24.837 0 16 0Z"
        fill="#534AB7" />
      <circle cx="16" cy="16" r="7" fill="white"/>
      <circle cx="16" cy="16" r="4" fill="#534AB7"/>
    </svg>
  `;
  el.style.cssText = 'width:32px;height:42px;cursor:default;';
  return el;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function MapView({
  location,
  heading,
  routeCoords,
  destinationCoords,
  isActive = false,
  followUser = true,
  onUserInteract,
}: MapViewProps) {
  const containerRef  = useRef<HTMLDivElement>(null);
  const mapRef        = useRef<mapboxgl.Map | null>(null);
  const markerRef     = useRef<mapboxgl.Marker | null>(null);
  const markerDiscRef = useRef<HTMLElement | null>(null);
  const destMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const followRef     = useRef(followUser);
  const locationRef   = useRef(location);
  const initialFlyRef = useRef(false);

  followRef.current  = followUser;
  locationRef.current = location;

  // ── Init map ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: DEFAULT_CENTER,
      zoom: PREVIEW_ZOOM,
      attributionControl: false,
      pitchWithRotate: false,
    });

    map.addControl(new mapboxgl.AttributionControl({ compact: true }), 'bottom-left');

    // Pause follow mode when user manually moves the map
    const pauseFollow = () => { if (followRef.current) onUserInteract?.(); };
    map.on('dragstart',  pauseFollow);
    map.on('zoomstart',  () => {
      // Only pause follow on pinch/wheel zoom, not programmatic
      if (map.isMoving() && !followRef.current) return;
      onUserInteract?.();
    });

    // User marker
    const markerEl = makeUserMarkerEl();
    const disc = markerEl.querySelector('div:last-child') as HTMLElement;
    markerDiscRef.current = disc;

    markerRef.current = new mapboxgl.Marker({ element: markerEl, anchor: 'center' })
      .setLngLat(DEFAULT_CENTER)
      .addTo(map);

    // Destination marker (added lazily)
    destMarkerRef.current = new mapboxgl.Marker({ element: makeDestMarkerEl(), anchor: 'bottom' })
      .setLngLat(DEFAULT_CENTER);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Location + follow ───────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !location) return;

    const lngLat: [number, number] = [location.lng, location.lat];
    markerRef.current?.setLngLat(lngLat);

    // Rotate the disc based on heading
    if (markerDiscRef.current) {
      markerDiscRef.current.style.transform =
        heading != null ? `rotate(${heading}deg)` : 'none';
    }

    // Initial fly-to on first location fix
    if (!initialFlyRef.current) {
      initialFlyRef.current = true;
      map.flyTo({ center: lngLat, zoom: PREVIEW_ZOOM, duration: 1200 });
      return;
    }

    if (followUser) {
      map.easeTo({
        center: lngLat,
        zoom: isActive ? ACTIVE_ZOOM : PREVIEW_ZOOM,
        duration: 600,
        easing: (t) => t,
      });
    }
  }, [location, heading, followUser, isActive]);

  // ── Recenter when followUser toggles back to true ──────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    const loc = locationRef.current;
    if (!followUser || !map || !loc) return;
    map.flyTo({
      center: [loc.lng, loc.lat],
      zoom: isActive ? ACTIVE_ZOOM : PREVIEW_ZOOM,
      duration: 700,
    });
  }, [followUser]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Route polyline ──────────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const draw = () => {
      // Remove old layers
      ['route-casing', 'route-line'].forEach((id) => {
        if (map.getLayer(id)) map.removeLayer(id);
      });
      if (map.getSource('route')) map.removeSource('route');

      if (!routeCoords || routeCoords.length < 2) return;

      // routeCoords is already [lng, lat][]
      map.addSource('route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: routeCoords },
          properties: {},
        },
      });

      // White casing underneath
      map.addLayer({
        id: 'route-casing',
        type: 'line',
        source: 'route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#ffffff', 'line-width': 9 },
      });

      // Solid purple line on top
      map.addLayer({
        id: 'route-line',
        type: 'line',
        source: 'route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#534AB7', 'line-width': 5 },
      });

      // Fit bounds to route if not actively walking
      if (!isActive) {
        const bounds = routeCoords.reduce(
          (b, c) => b.extend(c as mapboxgl.LngLatLike),
          new mapboxgl.LngLatBounds(routeCoords[0], routeCoords[0]),
        );
        map.fitBounds(bounds, { padding: { top: 100, bottom: 240, left: 40, right: 40 }, duration: 900 });
      }
    };

    if (map.isStyleLoaded()) draw();
    else map.once('load', draw);
  }, [routeCoords, isActive]);

  // ── Destination marker ──────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (!destinationCoords) {
      destMarkerRef.current?.remove();
      return;
    }

    destMarkerRef.current?.setLngLat(destinationCoords);

    const addMarker = () => {
      if (!destMarkerRef.current) return;
      destMarkerRef.current.addTo(map);
    };

    if (map.isStyleLoaded()) addMarker();
    else map.once('load', addMarker);
  }, [destinationCoords]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      aria-label="Live route map"
    />
  );
}
