import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { supabase } from '../lib/supabase';
import type { WalkSession, LocationPing } from '../types';
import {
  haversine,
  distanceToPolyline,
  findCurrentStepIndex,
  remainingRouteStats,
  humanizeInstruction,
  formatNavDistance,
  formatNavDuration,
} from '../services/navigation';
import { getDirections, type DirectionsResult, type RouteStep } from '../services/directions';
import { formatEta } from '../services/eta';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN as string;

const OFF_ROUTE_METERS = 60;
const STALE_AFTER_SECONDS = 45;
// How far (metres) or how long (ms) the last known position has to move/age
// before we spend another Directions API call re-routing from it.
const REROUTE_MIN_METERS = 25;
const REROUTE_MIN_MS = 20_000;

/** Translate a bearing angle to a compass abbreviation. */
function bearingToCompass(deg: number): string {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] as const;
  return dirs[Math.round(deg / 45) % 8];
}

async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers: { 'User-Agent': 'SafeWalk/1.0' } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const { road, house_number, suburb, city, town, village } = data.address ?? {};
    const street = [house_number, road].filter(Boolean).join(' ');
    const area   = city ?? town ?? village ?? suburb ?? '';
    return [street, area].filter(Boolean).join(', ') || data.display_name || null;
  } catch {
    return null;
  }
}

function toPoint(ping: LocationPing): [number, number] {
  return [Number(ping.lng), Number(ping.lat)];
}

function normalizeRoute(value: unknown): [number, number][] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((point): point is [number, number] =>
      Array.isArray(point) &&
      point.length >= 2 &&
      Number.isFinite(Number(point[0])) &&
      Number.isFinite(Number(point[1]))
    )
    .map((point) => [Number(point[0]), Number(point[1])]);
}

function normalizePoint(value: unknown): [number, number] | null {
  if (!Array.isArray(value) || value.length < 2) return null;
  const lng = Number(value[0]);
  const lat = Number(value[1]);
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
  return [lng, lat];
}

function lineFeature(coords: [number, number][]): GeoJSON.Feature<GeoJSON.LineString> {
  return {
    type: 'Feature',
    geometry: { type: 'LineString', coordinates: coords },
    properties: {},
  };
}

function upsertLine(
  map: mapboxgl.Map,
  sourceId: string,
  layerId: string,
  coords: [number, number][],
  paint: mapboxgl.LineLayer['paint'],
) {
  if (coords.length < 2) return;
  const source = map.getSource(sourceId) as mapboxgl.GeoJSONSource | undefined;
  if (source) {
    source.setData(lineFeature(coords));
  } else {
    map.addSource(sourceId, { type: 'geojson', data: lineFeature(coords) });
  }
  if (!map.getLayer(layerId)) {
    map.addLayer({
      id: layerId,
      type: 'line',
      source: sourceId,
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint,
    });
  }
}

/** Cumulative walked distance along a trail of GPS points, in metres. */
function trailDistance(trail: [number, number][]): number {
  let total = 0;
  for (let i = 1; i < trail.length; i++) total += haversine(trail[i - 1], trail[i]);
  return total;
}

// Same directional glyph set as the mobile app's ManeuverIcon / Home's
// ManeuverSvg, so a trusted contact reading turn-by-turn on the web sees the
// same shapes the walker sees on their phone.
function ManeuverGlyph({ type, modifier }: { type: string; modifier?: string }) {
  const props = {
    width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none' as const,
    stroke: 'currentColor', strokeWidth: 2.2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
  };
  if (type === 'arrive') {
    return (
      <svg {...props}>
        <path d="M12 2a7 7 0 0 1 7 7c0 4.9-7 13-7 13S5 13.9 5 9a7 7 0 0 1 7-7z" />
        <circle cx="12" cy="9" r="2.5" fill="currentColor" stroke="none" />
      </svg>
    );
  }
  if (type === 'roundabout' || type === 'rotary') {
    return (
      <svg {...props}>
        <path d="M21.5 2v6h-6" /><path d="M21.34 15.57a10 10 0 1 1-.57-8.38" />
      </svg>
    );
  }
  if (type === 'turn' || type === 'end of road') {
    if (modifier === 'uturn') {
      return <svg {...props}><path d="M9 14 4 9l5-5" /><path d="M4 9h9a4 4 0 0 1 0 8H5" /></svg>;
    }
    if (modifier === 'sharp left' || modifier === 'left') {
      return <svg {...props}><polyline points="9 14 4 9 9 4" /><path d="M20 20v-7a4 4 0 0 0-4-4H4" /></svg>;
    }
    if (modifier === 'slight left') {
      return <svg {...props}><path d="M5 19 12 5l7 14" /><path d="M12 5v14" /><polyline points="8 15 5 19 11 19" /></svg>;
    }
    if (modifier === 'sharp right' || modifier === 'right') {
      return <svg {...props}><polyline points="15 14 20 9 15 4" /><path d="M4 20v-7a4 4 0 0 1 4-4h12" /></svg>;
    }
    if (modifier === 'slight right') {
      return <svg {...props}><polyline points="16 15 19 19 13 19" /><path d="M4 19 12 5l7 14" /><path d="M12 5v14" /></svg>;
    }
  }
  return <svg {...props}><path d="M12 19V5" /><polyline points="5 12 12 5 19 12" /></svg>;
}

function CompassDial({ bearing }: { bearing: number }) {
  return (
    <svg viewBox="0 0 100 100" width={54} height={54} aria-hidden="true">
      <circle cx="50" cy="50" r="46" fill="#F6F6FA" stroke="#E0E0E8" strokeWidth="2" />
      <g stroke="#D5D5DD" strokeWidth="2" strokeLinecap="round">
        <path d="M50 8v7" /><path d="M92 50h-7" /><path d="M50 92v-7" /><path d="M8 50h7" />
      </g>
      <text x="50" y="25" textAnchor="middle" fontSize="11" fontWeight="700" fill="#888899">N</text>
      <g style={{ transformOrigin: '50px 50px', transition: 'transform .5s ease', transform: `rotate(${bearing}deg)` }}>
        <path d="M50 20 L57 56 L50 51 L43 56 Z" fill="#0A0A0A" />
      </g>
      <circle cx="50" cy="50" r="3" fill="#0A0A0A" />
    </svg>
  );
}

function MapChip({ status }: { status: 'live' | 'lost' | 'sos' | 'ended' }) {
  const style = {
    live:  { bg: '#fff',    fg: '#0A0A0A', dot: '#3B6D11', text: 'Live',        pulse: true  },
    lost:  { bg: '#FAEEDA', fg: '#854F0B', dot: '#854F0B', text: 'Signal lost', pulse: false },
    sos:   { bg: '#E24B4A', fg: '#fff',    dot: '#fff',    text: 'Emergency',   pulse: true  },
    ended: { bg: 'rgba(255,255,255,.94)', fg: '#888899', dot: '#BBBBCC', text: 'Walk ended', pulse: false },
  }[status];
  return (
    <div
      className="absolute top-4 left-4 z-10 flex items-center gap-2 rounded-full pl-2.5 pr-3.5 py-2 text-[12px] font-semibold shadow-[0_2px_10px_rgba(0,0,0,0.14)]"
      style={{ background: style.bg, color: style.fg }}
    >
      <span
        className={`w-[7px] h-[7px] rounded-full ${style.pulse ? 'animate-pulse' : ''}`}
        style={{ background: style.dot }}
      />
      {style.text}
    </div>
  );
}

function StatCell({ label, value, unit, isFirst }: { label: string; value: string; unit?: string; isFirst?: boolean }) {
  return (
    <div className={`flex-1 flex flex-col items-center justify-center px-2 py-3.5 ${isFirst ? '' : 'border-l border-[#E4E4ED]'}`}>
      <div className="text-[16px] font-extrabold text-[#0A0A0A] tabular-nums leading-none tracking-[-.01em]">
        {value}{unit && <span className="text-[11px] font-medium text-[#999AAA] ml-1">{unit}</span>}
      </div>
      <div className="text-[10px] text-[#999AAA] font-semibold uppercase tracking-[.05em] mt-1.5 leading-none">{label}</div>
    </div>
  );
}

function CoordRow({ label, value, isLast }: { label: string; value: string; isLast?: boolean }) {
  return (
    <div className={`flex justify-between items-baseline gap-3 py-2.5 ${isLast ? '' : 'border-b border-[#F0F0F4]'}`}>
      <span className="text-[13px] text-[#888899]">{label}</span>
      <span className="text-[13.5px] font-mono tabular-nums text-[#0A0A0A] text-right">{value}</span>
    </div>
  );
}

export default function ContactWebView() {
  const { token } = useParams<{ token: string }>();
  const [session, setSession]       = useState<WalkSession | null>(null);
  const [ping, setPing]             = useState<LocationPing | null>(null);
  const [trail, setTrail]           = useState<[number, number][]>([]);
  const [notFound, setNotFound]     = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [relativeTime, setRelativeTime] = useState('');
  const [address, setAddress]       = useState<string | null>(null);
  const [isStale, setIsStale]       = useState(false);
  const [directions, setDirections] = useState<DirectionsResult | null>(null);
  const [showCallConfirm, setShowCallConfirm] = useState(false);
  const [nowTick, setNowTick]       = useState(() => Date.now());

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef          = useRef<mapboxgl.Map | null>(null);
  const markerRef       = useRef<mapboxgl.Marker | null>(null);
  const markerRotorRef  = useRef<HTMLDivElement | null>(null);
  const markerPulseRef  = useRef<HTMLDivElement | null>(null);
  const destinationMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const hasFitRouteRef = useRef(false);
  const lastGeocodeRef  = useRef<string>('');
  const lastRerouteRef  = useRef<{ time: number; pos: [number, number] } | null>(null);

  const fetchLatest = useCallback(async (sessionId: string) => {
    const [{ data: pingData }, { data: trailData }, { data: sessionData }] = await Promise.all([
      supabase
        .from('location_pings').select('*').eq('session_id', sessionId)
        .order('recorded_at', { ascending: false }).limit(1).single(),
      supabase
        .from('location_pings').select('*').eq('session_id', sessionId)
        .order('recorded_at', { ascending: false }).limit(200),
      supabase
        .from('walk_sessions').select('status, share_expires_at, route_coords, destination_coords').eq('id', sessionId).single(),
    ]);
    if (pingData)    { setPing(pingData as LocationPing); setLastUpdated(new Date(pingData.recorded_at)); }
    if (trailData)   { setTrail([...trailData].reverse().map((p) => toPoint(p as LocationPing))); }
    if (sessionData) { setSession((prev) => prev ? { ...prev, ...sessionData } : prev); }
  }, []);

  useEffect(() => {
    if (!token) return;
    supabase.from('walk_sessions').select('*').eq('share_token', token).single()
      .then(({ data, error }) => {
        if (error || !data) { setNotFound(true); return; }
        const s = data as WalkSession;
        if (new Date(s.share_expires_at) < new Date()) { setNotFound(true); return; }
        setSession(s);
        fetchLatest(s.id);
      });
  }, [token, fetchLatest]);

  useEffect(() => {
    if (!session || session.status === 'completed') return;
    const id = setInterval(() => fetchLatest(session.id), 5_000);
    return () => clearInterval(id);
  }, [session, fetchLatest]);

  useEffect(() => {
    if (!session || session.status === 'completed') return;
    const channel = supabase
      .channel(`track:${session.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'location_pings', filter: `session_id=eq.${session.id}` },
        (payload) => {
          const next = payload.new as LocationPing;
          setPing(next);
          setLastUpdated(new Date(next.recorded_at));
          setTrail((current) => [...current.slice(-199), toPoint(next)]);
        },
      )
      .subscribe();
    return () => { channel.unsubscribe(); };
  }, [session]);

  useEffect(() => {
    if (!ping) return;
    const key = `${ping.lat.toFixed(4)},${ping.lng.toFixed(4)}`;
    if (key === lastGeocodeRef.current) return;
    lastGeocodeRef.current = key;
    reverseGeocode(ping.lat, ping.lng).then(setAddress);
  }, [ping]);

  useEffect(() => {
    if (!lastUpdated) return;
    const update = () => {
      const secs = (Date.now() - lastUpdated.getTime()) / 1000;
      setRelativeTime(secs < 30 ? 'Just now' : formatDistanceToNow(lastUpdated, { addSuffix: true }));
      // The mobile app pings roughly every 3s during a walk (GPS watch
      // interval), so anything past this means tracking actually broke —
      // phone off, destroyed, out of signal — not just a normal gap between
      // updates. This is the theft/emergency case: a contact needs to know
      // tracking stopped, not just see a slowly-aging timestamp.
      setIsStale(secs > STALE_AFTER_SECONDS);
    };
    update();
    const id = setInterval(update, 5_000);
    return () => clearInterval(id);
  }, [lastUpdated]);

  // Live-feeling "updated Ns ago" — ticks every second, independent of the
  // coarser 5s relativeTime/stale check above.
  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), 1_000);
    return () => clearInterval(id);
  }, []);

  // Re-route from the walker's last known position to their stated
  // destination — real Mapbox Directions, the same service the mobile app
  // itself calls, recomputed as they move rather than a one-time fetch. This
  // is what powers the ETA/turn-by-turn card; if it fails or there's no
  // destination, that card just doesn't render — never a fabricated fallback.
  useEffect(() => {
    if (!ping || !session) return;
    const destination = normalizePoint(session.destination_coords);
    if (!destination) return;
    const pos: [number, number] = [ping.lng, ping.lat];
    const last = lastRerouteRef.current;
    const now = Date.now();
    const movedFar = !last || haversine(pos, last.pos) > REROUTE_MIN_METERS;
    const longEnough = !last || now - last.time > REROUTE_MIN_MS;
    if (last && !movedFar && !longEnough) return;
    lastRerouteRef.current = { time: now, pos };
    getDirections(pos, destination).then((result) => { if (result) setDirections(result); });
  }, [ping, session]);

  useEffect(() => {
    // The map container only exists once the loading/not-found early
    // returns above have resolved — session starts null, so this effect
    // fires once on mount, sees no container yet, and must fire again once
    // session actually loads. `[]` deps would only ever get the first
    // (empty) shot, forever, so this depends on session readiness instead.
    if (!mapContainerRef.current || mapRef.current) return;
    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [-97.1384, 49.8951],
      zoom: 15,
      attributionControl: false,
    });
    map.addControl(new mapboxgl.AttributionControl({ compact: true }), 'bottom-right');
    mapRef.current = map;
    // Same directional puck as the app's own live map (components/map/MapView.tsx):
    // Google-blue dot, soft accuracy ring, pulsing halo, rotating chevron.
    const pinEl = document.createElement('div');
    pinEl.style.cssText = 'width:48px;height:48px;position:relative;display:flex;align-items:center;justify-content:center;';
    pinEl.innerHTML = `
      <div style="position:absolute;width:48px;height:48px;border-radius:50%;background:rgba(66,133,244,0.10);pointer-events:none;"></div>
      <div data-pulse style="position:absolute;width:56px;height:56px;border-radius:50%;background:rgba(66,133,244,0.18);pointer-events:none;"></div>
      <div data-rotor style="position:relative;width:38px;height:38px;border-radius:50%;background:#4285F4;border:3px solid #fff;box-shadow:0 3px 12px rgba(66,133,244,0.45),0 1px 4px rgba(0,0,0,0.20);display:flex;align-items:center;justify-content:center;transition:transform .4s ease;z-index:1;">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 2.5L13.5 13L9 10.5L4.5 13L9 2.5Z" fill="#fff"/></svg>
      </div>`;
    markerRotorRef.current = pinEl.querySelector('[data-rotor]');
    markerPulseRef.current = pinEl.querySelector('[data-pulse]');
    markerPulseRef.current?.classList.add('animate-ping');
    markerRef.current = new mapboxgl.Marker({ element: pinEl }).setLngLat([-97.1384, 49.8951]).addTo(map);
    return () => { map.remove(); mapRef.current = null; };
    // Re-run once `session` actually loads and the container mounts (see
    // comment above) — not on every session update, so `!!session` rather
    // than `session` itself.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!session]);

  useEffect(() => {
    if (!ping || !mapRef.current || !markerRef.current) return;
    const lngLat: [number, number] = [ping.lng, ping.lat];
    markerRef.current.setLngLat(lngLat);
    if (markerRotorRef.current && ping.bearing != null) {
      markerRotorRef.current.style.transform = `rotate(${ping.bearing}deg)`;
    }
    const live = session?.status === 'active' || session?.status === 'escalating';
    markerPulseRef.current?.classList.toggle('hidden', !(live && !isStale));
    mapRef.current.easeTo({ center: lngLat, duration: 600 });
  }, [ping, session, isStale]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !session) return;
    const drawLines = () => {
      const plannedRoute = normalizeRoute(session.route_coords);
      const destination = normalizePoint(session.destination_coords);

      // Split the planned route into what's ahead vs already passed, the
      // same nearest-point projection the walker's own map uses — so the
      // contact sees "the route they're on" the same way the walker does,
      // not just a static line drawn once at the start.
      let remainingRoute = plannedRoute;
      let completedRoute: [number, number][] = [];
      if (ping && plannedRoute.length > 1) {
        const userPt: [number, number] = [ping.lng, ping.lat];
        let nearestIdx = 0;
        let nearestDist = Infinity;
        for (let i = 0; i < plannedRoute.length; i++) {
          const d = haversine(userPt, plannedRoute[i]);
          if (d < nearestDist) { nearestDist = d; nearestIdx = i; }
        }
        completedRoute = plannedRoute.slice(0, nearestIdx + 1);
        remainingRoute = plannedRoute.slice(nearestIdx);
      }

      // Same recipe as the app's own MapView: white casing under a solid
      // colour line. Planned route in brand purple, already-passed portion
      // faded gray, and the walker's actual GPS trail in blue (matching the
      // live-location puck) drawn on top so any detour from the plan reads
      // at a glance.
      upsertLine(map, 'route-completed', 'route-completed-casing', completedRoute, {
        'line-color': '#ffffff', 'line-width': 8, 'line-opacity': 0.9,
      });
      upsertLine(map, 'route-completed', 'route-completed-line', completedRoute, {
        'line-color': '#B8B8CC', 'line-width': 4,
      });
      upsertLine(map, 'route-remaining', 'route-remaining-casing', remainingRoute, {
        'line-color': '#ffffff', 'line-width': 9, 'line-opacity': 0.95,
      });
      upsertLine(map, 'route-remaining', 'route-remaining-line', remainingRoute, {
        'line-color': '#0A0A0A', 'line-width': 5,
      });
      upsertLine(map, 'live-trail', 'live-trail-casing', trail, {
        'line-color': '#ffffff', 'line-width': 6, 'line-opacity': 0.85,
      });
      upsertLine(map, 'live-trail', 'live-trail-line', trail, {
        'line-color': '#4285F4', 'line-width': 3,
      });
      if (destination && !destinationMarkerRef.current) {
        const destinationEl = document.createElement('div');
        destinationEl.innerHTML = `<svg width="32" height="42" viewBox="0 0 32 42" fill="none">
          <path d="M16 0C7.163 0 0 7.163 0 16C0 24.837 16 42 16 42C16 42 32 24.837 32 16C32 7.163 24.837 0 16 0Z" fill="#0A0A0A"/>
          <circle cx="16" cy="16" r="7" fill="white"/>
          <circle cx="16" cy="16" r="4" fill="#0A0A0A"/>
        </svg>`;
        destinationEl.style.cssText = 'width:32px;height:42px;cursor:default;';
        destinationMarkerRef.current = new mapboxgl.Marker({ element: destinationEl, anchor: 'bottom' }).setLngLat(destination).addTo(map);
      } else if (destination) {
        destinationMarkerRef.current?.setLngLat(destination);
      }
      const boundsPoints = [...plannedRoute, ...trail, ...(destination ? [destination] : [])];
      if (boundsPoints.length > 1 && !hasFitRouteRef.current) {
        const bounds = boundsPoints.reduce(
          (b, point) => b.extend(point),
          new mapboxgl.LngLatBounds(boundsPoints[0], boundsPoints[0]),
        );
        map.fitBounds(bounds, { padding: 52, maxZoom: 16, duration: 500 });
        hasFitRouteRef.current = true;
      }
    };
    if (map.isStyleLoaded()) drawLines();
    else map.once('load', drawLines);
  }, [session, trail, ping]);

  useEffect(() => {
    if (!showCallConfirm) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowCallConfirm(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showCallConfirm]);

  // â”€â”€ Not found state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (notFound || !token) return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-5 px-6 text-center max-w-[430px] mx-auto">
      <div
        className="w-14 h-14 rounded-[16px] flex items-center justify-center bg-[#0A0A0A]"
        aria-hidden="true"
      >
        <svg viewBox="0 0 64 64" width={30} height={30}>
          <circle cx="32" cy="32" r="24" fill="none" stroke="rgba(255,255,255,0.32)" strokeWidth="2.2"/>
          <circle cx="32" cy="32" r="15" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2.2"/>
          <circle cx="32" cy="32" r="6" fill="white"/>
        </svg>
      </div>
      <div>
        <h1 className="text-[20px] font-bold text-[#0A0A0A] mb-2">This link has expired</h1>
        <p className="text-[14px] text-[#888899] leading-relaxed max-w-[280px]">
          Walk safety links are active for 24 hours. If you're concerned, contact them directly or call emergency services.
        </p>
      </div>
      <a
        href="tel:911"
        className="h-[52px] w-[200px] bg-[#E24B4A] text-white font-bold text-[16px] rounded-[14px] flex items-center justify-center gap-2 active:scale-[0.98]"
        style={{ boxShadow: '0 6px 18px rgba(226,75,74,0.28)' }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3-8.6A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .3 2 .6 2.9a2 2 0 0 1-.5 2L8 9.8a16 16 0 0 0 6 6l1.2-1.2a2 2 0 0 1 2-.5c1 .3 2 .5 2.9.6a2 2 0 0 1 1.7 2Z"/>
        </svg>
        Call 911
      </a>
      <p className="text-[12px] text-[#AAAABC]">SafeWalk · PIPEDA compliant</p>
    </div>
  );

  // â”€â”€ Loading state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (!session) return (
    <div className="min-h-screen bg-white flex items-center justify-center max-w-[430px] mx-auto">
      <div className="w-7 h-7 border-[2.5px] border-[#0A0A0A] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const isLive  = session.status === 'active' || session.status === 'escalating';
  const isSOS   = session.status === 'sos_triggered';
  // Signal loss only means something while the walk is still supposed to be
  // ongoing — a properly ended walk is expected to stop updating.
  const isSignalLost = isLive && isStale;
  const plannedRoute = normalizeRoute(session.route_coords);
  // 0.3 m/s (~1 km/h) — below normal GPS/walking noise, so a stationary
  // phone doesn't flicker "Moving" from drift alone.
  const isMoving = isLive && !isSignalLost && (ping?.speed ?? 0) > 0.3;
  const chipStatus = isSOS ? 'sos' : isSignalLost ? 'lost' : isLive ? 'live' : 'ended';

  const ownerName = session.destination
    ? `Walking to ${session.destination}`
    : 'Shared their location with you';

  // Off-route compares the live position against the route they actually
  // committed to (session.route_coords) — distinct from the re-routed
  // directions below, which always describe "the best path from here" and
  // so can never themselves be "off route".
  const isOffRoute = !!ping && plannedRoute.length > 1
    && distanceToPolyline([ping.lng, ping.lat], plannedRoute) > OFF_ROUTE_METERS;

  const currentPos: [number, number] | null = ping ? [ping.lng, ping.lat] : null;
  const destinationCoords = normalizePoint(session.destination_coords);
  let currentStep: RouteStep | null = null;
  let nextStep: RouteStep | null = null;
  let upcomingSteps: RouteStep[] = [];
  let remainingMeters: number | null = null;
  let remainingSeconds: number | null = null;
  let progressPct = 0;
  if (directions && currentPos) {
    const idx = findCurrentStepIndex(currentPos, directions.steps);
    currentStep = directions.steps[idx] ?? null;
    nextStep = directions.steps[idx + 1] ?? null;
    upcomingSteps = directions.steps.slice(idx, idx + 6);
    const stats = remainingRouteStats(idx, directions.steps);
    remainingMeters = stats.meters;
    remainingSeconds = stats.seconds;
    progressPct = directions.totalDistance > 0
      ? Math.max(2, Math.min(100, (1 - stats.meters / directions.totalDistance) * 100))
      : 100;
  } else if (currentPos && destinationCoords) {
    remainingMeters = haversine(currentPos, destinationCoords);
  }

  const etaClock = remainingSeconds != null
    ? new Date(nowTick + remainingSeconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null;
  const etaLabel = remainingSeconds != null ? formatNavDuration(remainingSeconds) : (remainingMeters != null ? formatEta(remainingMeters) : null);

  const ageSeconds = lastUpdated ? Math.max(0, Math.round((nowTick - lastUpdated.getTime()) / 1000)) : null;
  const walked = trailDistance(trail);

  const relayText = ping
    ? `${ping.lat.toFixed(6)}, ${ping.lng.toFixed(6)} · ±${ping.accuracy ? Math.round(ping.accuracy) : '?'} m${address ? ` · ${address}` : ''}`
    : 'Location unavailable';

  return (
    <div className="min-h-screen bg-white flex flex-col max-w-[430px] mx-auto">
      {/* Map */}
      <div className="relative flex-shrink-0" style={{ height: '38vh', minHeight: 260 }}>
        <div ref={mapContainerRef} className="w-full h-full" />
        <MapChip status={chipStatus} />
      </div>

      {/* Sheet */}
      <section className="flex-1 bg-white rounded-t-[20px] -mt-4 relative z-[5] flex flex-col" style={{ boxShadow: '0 -4px 24px rgba(0,0,0,0.10)' }}>
        <div className="w-10 h-1 rounded-full bg-[#D5D5DD] mx-auto mt-2.5" />

        {/* Map legend — kept off the map itself so it never competes with
            Mapbox's own required logo/attribution in the map's corners. */}
        <div className="flex items-center justify-center gap-5 pt-2.5 pb-1">
          <span className="flex items-center gap-1.5 text-[11px] font-medium text-[#888899]">
            <span className="block w-4 h-[3px] rounded-full bg-[#4285F4]" /> Live movement
          </span>
          <span className="flex items-center gap-1.5 text-[11px] font-medium text-[#888899]">
            <span className="block w-4 h-[3px] rounded-full bg-[#0A0A0A]" /> Planned route
          </span>
        </div>

        <div className="px-5 pt-2 pb-1">
          <div className="flex items-center gap-2.5">
            {(isSOS || isSignalLost) && (
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: isSOS ? 'rgba(226,75,74,0.14)' : 'rgba(133,79,11,0.12)' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={isSOS ? '#E24B4A' : '#854F0B'} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/>
                  <path d="M12 9v4"/><path d="M12 17h.01"/>
                </svg>
              </div>
            )}
            <h1 className="text-[20px] font-bold text-[#0A0A0A] tracking-[-0.3px]">
              {isSOS ? 'Emergency active' : isSignalLost ? 'Signal lost' : 'Walk shared with you'}
            </h1>
          </div>
          <p className="text-[13px] text-[#888899] mt-1">
            {isSignalLost
              ? `Last seen ${relativeTime || 'a moment ago'}${address ? ` near ${address}` : ''}`
              : `${ownerName} · ${relativeTime || 'just now'}`}
          </p>
        </div>

        {isSignalLost && (
          <div className="mx-5 mt-2 mb-1 px-3.5 py-3 rounded-[14px] flex items-start gap-2.5" style={{ background: '#FAEEDA' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#854F0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-none mt-0.5">
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>
            </svg>
            <p className="text-[12px] leading-relaxed" style={{ color: '#854F0B' }}>
              Location hasn't updated in over {STALE_AFTER_SECONDS} seconds — the phone may be off, out of signal, or
              tracking stopped. The map shows their <strong>last known location</strong>, not a live position.
            </p>
          </div>
        )}

        <div className="h-px bg-[#F0F0F4] mx-5 mt-3" />

        {/* Arrival */}
        {etaLabel && (
          <div className="px-5 py-4">
            <div className="text-[11px] font-semibold text-[#888899] uppercase tracking-[.05em]">Arriving</div>
            {etaClock && <h2 className="text-[32px] font-extrabold text-[#0A0A0A] tracking-[-.02em] leading-none mt-1 tabular-nums">{etaClock}</h2>}
            <div className="text-[13.5px] text-[#888899] mt-1.5">
              {etaLabel} away {isLive && `· ${isMoving ? 'moving' : 'stopped'}`} {isLive && (isOffRoute ? '· off planned route' : '· on route')}
            </div>
            <div className="h-1.5 bg-[#F1F0ED] rounded-full mt-3.5 overflow-hidden">
              <div className="h-full rounded-full transition-[width] bg-[#0A0A0A]" style={{ width: `${progressPct}%` }} />
            </div>
            {session.destination && (
              <div className="flex gap-2.5 items-start mt-3.5 text-[13.5px] text-[#0A0A0A]">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0A0A0A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-none mt-0.5">
                  <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" />
                </svg>
                <span className="font-medium">{session.destination}</span>
              </div>
            )}
          </div>
        )}

        {(etaLabel || currentStep) && <div className="h-px bg-[#F0F0F4] mx-5" />}

        {/* Turn-by-turn — same recipe as the app's own live-nav head */}
        {currentStep && (
          <>
            <div className="mx-5 my-3.5 rounded-[14px] flex items-stretch overflow-hidden border border-[#EAEAEA]" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
              <div className="flex items-center justify-center flex-shrink-0" style={{ width: 60, background: '#0A0A0A' }}>
                <span className="text-white"><ManeuverGlyph type={currentStep.maneuverType} modifier={currentStep.maneuverModifier} /></span>
              </div>
              <div className="flex-1 min-w-0 px-3.5 py-3">
                <div className="text-[14.5px] font-bold text-[#0A0A0A] leading-tight truncate">{humanizeInstruction(currentStep)}</div>
                {nextStep && (
                  <div className="text-[12px] text-[#888899] mt-1 truncate">
                    {formatNavDistance(currentStep.distance)}, then {humanizeInstruction(nextStep).toLowerCase()}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Heading */}
        {ping?.bearing != null && (
          <>
            <div className="px-5 py-4">
              <div className="text-[11px] font-semibold text-[#888899] uppercase tracking-[.05em] mb-3">Location &amp; heading</div>
              <div className="flex items-center gap-4">
                <CompassDial bearing={ping.bearing} />
                <div className="min-w-0">
                  <h3 className="text-[15px] font-bold text-[#0A0A0A]">
                    {bearingToCompass(ping.bearing)} · {Math.round(ping.bearing)}°
                  </h3>
                  <p className="text-[12.5px] text-[#888899] mt-0.5 truncate">{address ?? 'Fetching address…'}</p>
                </div>
              </div>
            </div>
            <div className="h-px bg-[#F0F0F4] mx-5" />
          </>
        )}

        {/* Remaining steps */}
        {upcomingSteps.length > 1 && (
          <>
            <div className="px-5 py-4">
              <div className="text-[11px] font-semibold text-[#888899] uppercase tracking-[.05em] mb-2.5">Route remaining</div>
              <ol className="grid gap-0">
                {upcomingSteps.map((step, i) => (
                  <li key={i} className={`flex items-baseline gap-3 py-2 text-[13.5px] text-[#0A0A0A] ${i === upcomingSteps.length - 1 ? '' : 'border-b border-[#F0F0F4]'}`}>
                    <span className={`w-[18px] h-[18px] flex-none rounded-full text-[10.5px] font-bold flex items-center justify-center ${i === 0 ? 'bg-[#0A0A0A] text-white' : 'bg-[#F1F0ED] text-[#0A0A0A]'}`}>
                      {i + 1}
                    </span>
                    <span className={i === 0 ? 'font-semibold' : ''}>{humanizeInstruction(step)}</span>
                    <span className="ml-auto tabular-nums text-[12px] text-[#999AAA]">{formatNavDistance(step.distance)}</span>
                  </li>
                ))}
              </ol>
            </div>
            <div className="h-px bg-[#F0F0F4] mx-5" />
          </>
        )}

        {/* Walk stats */}
        <div className="px-5 py-4">
          <div className="text-[11px] font-semibold text-[#888899] uppercase tracking-[.05em] mb-3">Walk</div>
          <div className="flex bg-[#F6F6FA] rounded-[14px] overflow-hidden border border-[#EDEDF2]">
            <StatCell label="Pace" value={ping?.speed != null ? (ping.speed * 3.6).toFixed(1) : '—'} unit="km/h" isFirst />
            <StatCell label="Walked" value={(walked / 1000).toFixed(2)} unit="km" />
            <StatCell label="Remaining" value={remainingMeters != null ? (remainingMeters / 1000).toFixed(2) : '—'} unit="km" />
          </div>
        </div>
        <div className="h-px bg-[#F0F0F4] mx-5" />

        {/* Signal & coordinates */}
        <div className="px-5 py-4">
          <div className="text-[11px] font-semibold text-[#888899] uppercase tracking-[.05em] mb-1">Location data</div>
          {ping && (
            <>
              <CoordRow label="Latitude" value={ping.lat.toFixed(6)} />
              <CoordRow label="Longitude" value={ping.lng.toFixed(6)} />
              <CoordRow label="Accuracy" value={ping.accuracy != null ? `±${Math.round(ping.accuracy)} m` : '—'} />
              <CoordRow label="Points received" value={String(trail.length)} isLast />
            </>
          )}
          {ageSeconds != null && (
            <div className="flex items-center gap-1.5 text-[11.5px] text-[#999AAA] border-t border-[#F0F0F4] pt-2.5 mt-0.5">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="9" /><path d="M12 7.5V12l3 2" />
              </svg>
              Updated {ageSeconds}s ago · GPS
            </div>
          )}
        </div>
        <div className="h-px bg-[#F0F0F4] mx-5" />

        {/* CTA */}
        <div className="px-5 py-4">
          <button
            type="button"
            onClick={() => setShowCallConfirm(true)}
            className="w-full h-[52px] rounded-[14px] bg-[#E24B4A] text-white font-bold text-[15px] flex items-center justify-center gap-2 active:scale-[0.98]"
            style={{ boxShadow: '0 6px 18px rgba(226,75,74,.28)' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3-8.6A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .3 2 .6 2.9a2 2 0 0 1-.5 2L8 9.8a16 16 0 0 0 6 6l1.2-1.2a2 2 0 0 1 2-.5c1 .3 2 .5 2.9.6a2 2 0 0 1 1.7 2Z" />
            </svg>
            Emergency call 911
          </button>
          <p className="text-[11.5px] text-[#AAAABC] text-center mt-2.5 leading-relaxed">
            Only if you believe {session.destination ? 'they are' : 'this person is'} in danger.
          </p>
        </div>

        <div className="mt-auto px-5 py-4 border-t border-[#F0F0F4] text-[11px] text-[#AAAABC] grid gap-1">
          <div>View-only link. Location is hidden once the walk ends.</div>
          <div>Link expires {new Date(session.share_expires_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · Walk ID {session.id.slice(0, 8).toUpperCase()}</div>
        </div>
      </section>

      {/* Call confirmation — bottom sheet, matching the app's own modal idiom */}
      {showCallConfirm && (
        <div
          className="fixed inset-0 z-50 flex flex-col"
          style={{ maxWidth: 430, margin: '0 auto' }}
        >
          <div className="flex-1 bg-black/40" onClick={() => setShowCallConfirm(false)} />
          <div className="bg-white rounded-[24px_24px_0_0] px-5 pb-8 pt-2 shadow-[0_-10px_40px_rgba(0,0,0,0.18)]">
            <div className="w-11 h-1 bg-[#D5D5DD] rounded-full mx-auto mt-2 mb-4" />
            <h3 className="text-[19px] font-bold text-[#0A0A0A] mb-1.5 tracking-[-.02em]">Call 911 now?</h3>
            <p className="text-[13.5px] text-[#888899] leading-relaxed">
              This dials emergency services on your phone. Their last known coordinates are shown below to read out.
            </p>
            <div className="mt-4 bg-[#F6F6FA] border border-[#E0E0E8] rounded-[10px] px-3.5 py-3 text-[12.5px] font-mono text-[#0A0A0A]">
              {relayText}
            </div>
            <div className="grid gap-2 mt-4">
              <a
                href="tel:911"
                className="h-[52px] rounded-[14px] bg-[#E24B4A] text-white font-bold text-[15px] flex items-center justify-center active:scale-[0.98]"
              >
                Call 911
              </a>
              <button
                type="button"
                onClick={() => setShowCallConfirm(false)}
                className="h-[46px] rounded-[14px] bg-[#F0F0F4] text-[#888899] font-semibold text-[14px]"
              >
                Not now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
