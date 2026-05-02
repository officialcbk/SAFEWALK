import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import type { LatLng } from '../../types';
import type { SafePlace } from '../../services/safePlaces';
import { haversine } from '../../services/navigation';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN as string;

const DEFAULT_CENTER: [number, number] = [-97.1384, 49.8951]; // Winnipeg
const ACTIVE_ZOOM   = 17;
const PREVIEW_ZOOM  = 15;
const ACTIVE_PITCH  = 30;

// ── User marker ───────────────────────────────────────────────────────────────

function makeUserMarkerEl(): HTMLElement {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'width:48px;height:48px;display:flex;align-items:center;justify-content:center;position:relative;';

  // Outer soft accuracy ring (static, decorative)
  const ring = document.createElement('div');
  ring.style.cssText = `
    position:absolute;width:48px;height:48px;border-radius:50%;
    background:rgba(66,133,244,0.10);
    pointer-events:none;
  `;

  // Pulsing halo
  const halo = document.createElement('div');
  halo.style.cssText = `
    position:absolute;width:56px;height:56px;border-radius:50%;
    background:rgba(66,133,244,0.15);
    animation:user-halo 2.2s ease-out infinite;
    pointer-events:none;
  `;

  const disc = document.createElement('div');
  disc.style.cssText = `
    position:relative;width:38px;height:38px;border-radius:50%;
    background:#4285F4;border:3px solid white;
    box-shadow:0 3px 12px rgba(66,133,244,0.45),0 1px 4px rgba(0,0,0,0.20);
    display:flex;align-items:center;justify-content:center;
    z-index:1;transition:transform 0.3s cubic-bezier(0.34,1.56,0.64,1);
  `;
  disc.innerHTML = `<svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <path d="M9 2.5L13.5 13L9 10.5L4.5 13L9 2.5Z" fill="white"/>
  </svg>`;

  if (!document.getElementById('sw-map-keyframes')) {
    const s = document.createElement('style');
    s.id = 'sw-map-keyframes';
    s.textContent = `@keyframes user-halo {
      0%   { transform:scale(0.6); opacity:0.7; }
      70%  { transform:scale(1.5); opacity:0;   }
      100% { transform:scale(1.5); opacity:0;   }
    }`;
    document.head.appendChild(s);
  }

  wrap.appendChild(ring);
  wrap.appendChild(halo);
  wrap.appendChild(disc);
  return wrap;
}

// ── Destination pin ───────────────────────────────────────────────────────────

function makeDestMarkerEl(): HTMLElement {
  const el = document.createElement('div');
  el.innerHTML = `<svg width="32" height="42" viewBox="0 0 32 42" fill="none">
    <path d="M16 0C7.163 0 0 7.163 0 16C0 24.837 16 42 16 42C16 42 32 24.837 32 16C32 7.163 24.837 0 16 0Z" fill="#534AB7"/>
    <circle cx="16" cy="16" r="7" fill="white"/>
    <circle cx="16" cy="16" r="4" fill="#534AB7"/>
  </svg>`;
  el.style.cssText = 'width:32px;height:42px;cursor:default;';
  return el;
}

// ── Safe place marker ─────────────────────────────────────────────────────────

const SAFE_PLACE_STYLE: Record<SafePlace['type'], { bg: string; label: string }> = {
  police:   { bg: '#1565C0', label: 'P'  },
  hospital: { bg: '#2E7D32', label: 'H'  },
  pharmacy: { bg: '#00695C', label: 'Rx' },
};

function makeSafePlaceMarkerEl(type: SafePlace['type']): HTMLElement {
  const { bg, label } = SAFE_PLACE_STYLE[type];
  const el = document.createElement('div');
  el.style.cssText = `
    width:34px;height:34px;border-radius:50%;background:${bg};
    border:2.5px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.28);
    display:flex;align-items:center;justify-content:center;
    color:white;font-size:11px;font-weight:700;font-family:system-ui,sans-serif;cursor:pointer;
  `;
  el.textContent = label;
  return el;
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface MapViewProps {
  location: LatLng | null;
  heading?: number | null;
  routeCoords?: [number, number][] | null;
  destinationCoords?: [number, number] | null;
  safePlaces?: SafePlace[];
  isActive?: boolean;
  followUser?: boolean;
  onUserInteract?: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function MapView({
  location,
  heading,
  routeCoords,
  destinationCoords,
  safePlaces = [],
  isActive = false,
  followUser = true,
  onUserInteract,
}: MapViewProps) {
  const containerRef        = useRef<HTMLDivElement>(null);
  const mapRef              = useRef<mapboxgl.Map | null>(null);
  const markerRef           = useRef<mapboxgl.Marker | null>(null);
  const markerDiscRef       = useRef<HTMLElement | null>(null);
  const destMarkerRef       = useRef<mapboxgl.Marker | null>(null);
  const safePlaceMarkersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());

  const followRef       = useRef(followUser);
  const locationRef     = useRef(location);
  const headingRef      = useRef(heading);
  const isActiveRef     = useRef(isActive);
  const prevIsActiveRef = useRef(isActive);
  const initialFlyRef   = useRef(false);
  const routeCoordsRef  = useRef(routeCoords);

  followRef.current      = followUser;
  locationRef.current    = location;
  headingRef.current     = heading;
  isActiveRef.current    = isActive;
  routeCoordsRef.current = routeCoords;

  // ── Init map ──────────────────────────────────────────────────────────────
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pauseFollow = (e: any) => {
      if (e.originalEvent && followRef.current) onUserInteract?.();
    };
    map.on('dragstart',   pauseFollow);
    map.on('zoomstart',   pauseFollow);
    map.on('pitchstart',  pauseFollow);
    map.on('rotatestart', pauseFollow);

    const markerEl = makeUserMarkerEl();
    markerDiscRef.current = markerEl.querySelector('div:last-child') as HTMLElement;
    markerRef.current = new mapboxgl.Marker({ element: markerEl, anchor: 'center' })
      .setLngLat(DEFAULT_CENTER)
      .addTo(map);

    destMarkerRef.current = new mapboxgl.Marker({ element: makeDestMarkerEl(), anchor: 'bottom' })
      .setLngLat(DEFAULT_CENTER);

    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Walk start / end camera ───────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    const loc = locationRef.current;

    if (isActive && !prevIsActiveRef.current) {
      if (map && loc) {
        map.flyTo({
          center: [loc.lng, loc.lat],
          zoom: ACTIVE_ZOOM,
          pitch: ACTIVE_PITCH,
          bearing: headingRef.current ?? 0,
          duration: 1400,
          essential: true,
        });
      }
    } else if (!isActive && prevIsActiveRef.current) {
      if (map) {
        map.easeTo({ pitch: 0, bearing: 0, zoom: PREVIEW_ZOOM, duration: 900 });
      }
    }
    prevIsActiveRef.current = isActive;
  }, [isActive]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Location update + follow + completed route ────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !location) return;

    const lngLat: [number, number] = [location.lng, location.lat];
    markerRef.current?.setLngLat(lngLat);

    if (markerDiscRef.current) {
      markerDiscRef.current.style.transform =
        heading != null ? `rotate(${heading}deg)` : 'none';
    }

    // Update completed-route source when walking
    const rc = routeCoordsRef.current;
    if (isActive && rc && rc.length > 1 && map.getSource('route-completed')) {
      const userPt: [number, number] = [location.lng, location.lat];
      let nearestIdx = 0;
      let nearestDist = Infinity;
      for (let i = 0; i < rc.length; i++) {
        const d = haversine(userPt, rc[i]);
        if (d < nearestDist) { nearestDist = d; nearestIdx = i; }
      }
      (map.getSource('route-completed') as mapboxgl.GeoJSONSource).setData({
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: rc.slice(0, nearestIdx + 1) },
        properties: {},
      });
    }

    if (!initialFlyRef.current) {
      initialFlyRef.current = true;
      map.flyTo({ center: lngLat, zoom: PREVIEW_ZOOM, duration: 1200 });
      return;
    }

    if (!followUser) return;

    if (isActive) {
      map.easeTo({
        center: lngLat,
        zoom: ACTIVE_ZOOM,
        bearing: heading ?? map.getBearing(),
        pitch: ACTIVE_PITCH,
        duration: 500,
        easing: (t) => 1 - Math.pow(1 - t, 3),
      });
    } else {
      map.easeTo({
        center: lngLat,
        zoom: PREVIEW_ZOOM,
        pitch: 0,
        bearing: 0,
        duration: 600,
        easing: (t) => t,
      });
    }
  }, [location, heading, followUser, isActive]);

  // ── Recenter when followUser becomes true ─────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    const loc = locationRef.current;
    if (!followUser || !map || !loc) return;
    map.flyTo({
      center: [loc.lng, loc.lat],
      zoom: isActiveRef.current ? ACTIVE_ZOOM : PREVIEW_ZOOM,
      pitch: isActiveRef.current ? ACTIVE_PITCH : 0,
      bearing: isActiveRef.current ? (headingRef.current ?? 0) : 0,
      duration: 900,
    });
  }, [followUser]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Route polyline ────────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const draw = () => {
      // Remove existing layers/sources
      ['route-completed-line', 'route-completed-casing', 'route-casing', 'route-line'].forEach((id) => {
        if (map.getLayer(id)) map.removeLayer(id);
      });
      ['route-completed', 'route'].forEach((id) => {
        if (map.getSource(id)) map.removeSource(id);
      });

      if (!routeCoords || routeCoords.length < 2) return;

      // ── Remaining route (purple) ──
      map.addSource('route', {
        type: 'geojson',
        data: { type: 'Feature', geometry: { type: 'LineString', coordinates: routeCoords }, properties: {} },
      });
      map.addLayer({
        id: 'route-casing', type: 'line', source: 'route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#ffffff', 'line-width': 10 },
      });
      map.addLayer({
        id: 'route-line', type: 'line', source: 'route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#534AB7', 'line-width': 6 },
      });

      // ── Completed route (gray overlay drawn on top of purple) ──
      map.addSource('route-completed', {
        type: 'geojson',
        data: { type: 'Feature', geometry: { type: 'LineString', coordinates: [routeCoords[0]] }, properties: {} },
      });
      map.addLayer({
        id: 'route-completed-casing', type: 'line', source: 'route-completed',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#ffffff', 'line-width': 10 },
      });
      map.addLayer({
        id: 'route-completed-line', type: 'line', source: 'route-completed',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#B8B8CC', 'line-width': 6 },
      });

      if (!isActiveRef.current) {
        const bounds = routeCoords.reduce(
          (b, c) => b.extend(c as mapboxgl.LngLatLike),
          new mapboxgl.LngLatBounds(routeCoords[0], routeCoords[0]),
        );
        map.fitBounds(bounds, { padding: { top: 120, bottom: 260, left: 40, right: 40 }, duration: 900 });
      }
    };

    if (map.isStyleLoaded()) draw();
    else map.once('load', draw);
  }, [routeCoords]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Destination marker ────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!destinationCoords) { destMarkerRef.current?.remove(); return; }
    destMarkerRef.current?.setLngLat(destinationCoords);
    const add = () => destMarkerRef.current?.addTo(map);
    if (map.isStyleLoaded()) add();
    else map.once('load', add);
  }, [destinationCoords]);

  // ── Safe place markers ────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const current = safePlaceMarkersRef.current;
    const newIds = new Set(safePlaces.map((p) => p.id));

    for (const [id, marker] of current) {
      if (!newIds.has(id)) { marker.remove(); current.delete(id); }
    }

    for (const place of safePlaces) {
      if (current.has(place.id)) continue;
      const el = makeSafePlaceMarkerEl(place.type);
      const popup = new mapboxgl.Popup({ offset: 22, closeButton: false, maxWidth: '220px' })
        .setHTML(
          `<div style="font-family:system-ui;padding:2px 0">` +
          `<div style="font-size:13px;font-weight:700;color:#1A1A28">${place.name}</div>` +
          `<div style="font-size:11px;color:#888;margin-top:2px">${place.address}</div></div>`,
        );
      const marker = new mapboxgl.Marker({ element: el, anchor: 'center' })
        .setLngLat(place.coords)
        .setPopup(popup);
      el.addEventListener('click', () => marker.togglePopup());
      const add = () => marker.addTo(map);
      if (map.isStyleLoaded()) add();
      else map.once('load', add);
      current.set(place.id, marker);
    }
  }, [safePlaces]);

  return (
    <div ref={containerRef} className="w-full h-full" aria-label="Live route map" />
  );
}
