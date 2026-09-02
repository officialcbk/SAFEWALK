import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { supabase } from '../lib/supabase';
import type { WalkSession, LocationPing } from '../types';
import { haversine } from '../services/navigation';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN as string;

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

function InfoRow({ label, value, isLast }: { label: string; value: string; isLast?: boolean }) {
  return (
    <div
      className={`flex justify-between items-center py-3 ${isLast ? '' : 'border-b border-[#E0E0E8]'}`}
    >
      <span className="text-[12px] text-[#888899] font-medium">{label}</span>
      <span className="text-[13px] font-semibold text-[#1A1A28] text-right max-w-[200px]">{value}</span>
    </div>
  );
}

function LiveBadge({ status }: { status: 'live' | 'lost' | 'ended' }) {
  const style = {
    live: { bg: '#0A0A0A', fg: 'white', dot: '#7CE05F', text: 'LIVE' },
    lost: { bg: 'var(--color-status-warn)', fg: 'white', dot: 'var(--color-status-warn-bg)', text: 'SIGNAL LOST' },
    ended: { bg: '#F1F0ED', fg: '#0A0A0A', dot: '#9A9A9A', text: 'ENDED' },
  }[status];
  return (
    <span
      className="flex items-center gap-1.5 text-[10px] font-bold rounded-full px-2.5 py-1"
      style={{ background: style.bg, color: style.fg }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: style.dot }} />
      {style.text}
    </span>
  );
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

const STALE_AFTER_SECONDS = 45;

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
  // Casing + line pairs share one sourceId with two different layerIds —
  // the source-exists check and the layer-exists check must be independent,
  // or the second upsertLine call for the same source (adding the casing's
  // companion line) would update the shared geometry but silently never add
  // its own layer.
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

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef          = useRef<mapboxgl.Map | null>(null);
  const markerRef       = useRef<mapboxgl.Marker | null>(null);
  const markerRotorRef  = useRef<HTMLDivElement | null>(null);
  const destinationMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const lastGeocodeRef  = useRef<string>('');

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
    if (!token) { setNotFound(true); return; }
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

  useEffect(() => {
    if (!mapContainerRef.current) return;
    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [-97.1384, 49.8951],
      zoom: 15,
    });
    mapRef.current = map;
    // Directional puck — same visual language as the walker's own live-nav
    // marker (white ring, black disc, chevron pointing the way they're
    // heading) so a contact reads the map the same way the walker does.
    const pinEl = document.createElement('div');
    pinEl.style.cssText = 'width:40px;height:40px;position:relative;';
    pinEl.innerHTML = `
      <div style="position:absolute;inset:0;border-radius:50%;background:rgba(10,10,10,.15);"></div>
      <div style="position:absolute;inset:3px;border-radius:50%;background:#fff;box-shadow:0 4px 12px rgba(0,0,0,.32);display:flex;align-items:center;justify-content:center;">
        <div data-rotor style="width:28px;height:28px;border-radius:50%;background:#0A0A0A;display:flex;align-items:center;justify-content:center;transition:transform .4s ease;">
          <svg width="16" height="16" viewBox="0 0 24 24"><path d="M12 3 19.5 19 12 15.5 4.5 19Z" fill="#fff"/></svg>
        </div>
      </div>`;
    markerRotorRef.current = pinEl.querySelector('[data-rotor]');
    markerRef.current = new mapboxgl.Marker({ element: pinEl }).setLngLat([-97.1384, 49.8951]).addTo(map);
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  useEffect(() => {
    if (!ping || !mapRef.current || !markerRef.current) return;
    const lngLat: [number, number] = [ping.lng, ping.lat];
    markerRef.current.setLngLat(lngLat);
    if (markerRotorRef.current && ping.bearing != null) {
      markerRotorRef.current.style.transform = `rotate(${ping.bearing}deg)`;
    }
    mapRef.current.easeTo({ center: lngLat, duration: 600 });
  }, [ping]);

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

      upsertLine(map, 'route-completed', 'route-completed-casing', completedRoute, {
        'line-color': '#ffffff', 'line-width': 8, 'line-opacity': 0.8,
      });
      upsertLine(map, 'route-completed', 'route-completed-line', completedRoute, {
        'line-color': '#0A0A0A', 'line-width': 4, 'line-dasharray': [0.01, 1.6], 'line-opacity': 0.45,
      });
      upsertLine(map, 'route-remaining', 'route-remaining-casing', remainingRoute, {
        'line-color': '#ffffff', 'line-width': 9,
      });
      upsertLine(map, 'route-remaining', 'route-remaining-line', remainingRoute, {
        'line-color': '#0A0A0A', 'line-width': 5,
      });
      // Actual walked GPS trail — can diverge from the planned route
      // (wrong turn, detour), so it's drawn on top in a distinct accent
      // color rather than folded into the planned-route styling above.
      upsertLine(map, 'live-trail', 'live-trail-line', trail, {
        'line-color': '#534AB7', // --color-purple-600 — Mapbox paint can't read CSS vars
        'line-width': 3,
        'line-opacity': 0.85,
      });
      if (destination && !destinationMarkerRef.current) {
        const destinationEl = document.createElement('div');
        destinationEl.style.cssText = 'width:18px;height:18px;border-radius:50% 50% 50% 0;background:#fff;border:3px solid #0A0A0A;transform:rotate(-45deg);box-shadow:0 4px 12px rgba(0,0,0,0.22);';
        destinationMarkerRef.current = new mapboxgl.Marker({ element: destinationEl, anchor: 'bottom' }).setLngLat(destination).addTo(map);
      } else if (destination) {
        destinationMarkerRef.current?.setLngLat(destination);
      }
      const boundsPoints = [...plannedRoute, ...trail, ...(destination ? [destination] : [])];
      if (boundsPoints.length > 1) {
        const bounds = boundsPoints.reduce(
          (b, point) => b.extend(point),
          new mapboxgl.LngLatBounds(boundsPoints[0], boundsPoints[0]),
        );
        map.fitBounds(bounds, { padding: 52, maxZoom: 16, duration: 500 });
      }
    };
    if (map.isStyleLoaded()) drawLines();
    else map.once('load', drawLines);
  }, [session, trail, ping]);

  // ── Not found state ───────────────────────────────────────────────────────
  if (notFound) return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-5 px-6 text-center">
      <div
        className="w-10 h-10 rounded-[12px] flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #7F77DD, #534AB7)' }}
        aria-hidden="true"
      >
        <svg viewBox="0 0 64 64" width={30} height={30}>
          <circle cx="32" cy="32" r="24" fill="none" stroke="rgba(255,255,255,0.32)" strokeWidth="2.2"/>
          <circle cx="32" cy="32" r="15" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2.2"/>
          <circle cx="32" cy="32" r="6" fill="white"/>
        </svg>
      </div>
      <div>
        <h1 className="text-[20px] font-bold text-[#1A1A28] mb-2">This link has expired</h1>
        <p className="text-[14px] text-[#888899] leading-relaxed max-w-[280px]">
          Walk safety links are active for 24 hours. If you're concerned, contact them directly or call emergency services.
        </p>
      </div>
      <a
        href="tel:911"
        className="h-[52px] w-[200px] bg-[#E24B4A] text-white font-semibold text-[16px] rounded-[14px] flex items-center justify-center gap-2"
        style={{ boxShadow: '0 6px 18px rgba(226,75,74,0.35)' }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3-8.6A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .3 2 .6 2.9a2 2 0 0 1-.5 2L8 9.8a16 16 0 0 0 6 6l1.2-1.2a2 2 0 0 1 2-.5c1 .3 2 .5 2.9.6a2 2 0 0 1 1.7 2Z"/>
        </svg>
        Call 911
      </a>
      <p className="text-[12px] text-[#888899]">SafeWalk · PIPEDA compliant</p>
    </div>
  );

  // ── Loading state ─────────────────────────────────────────────────────────
  if (!session) return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="w-7 h-7 border-[2.5px] border-[#7F77DD] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const isLive  = session.status === 'active' || session.status === 'escalating';
  const isSOS   = session.status === 'sos_triggered';
  // Signal loss only means something while the walk is still supposed to be
  // ongoing — a properly ended walk is expected to stop updating.
  const isSignalLost = isLive && isStale;
  const headerBg = isSOS ? 'var(--color-status-danger)' : isSignalLost ? 'var(--color-status-warn)' : '#FFFFFF';
  const headerFg = isSOS || isSignalLost ? 'white' : '#0A0A0A';
  const plannedRoute = normalizeRoute(session.route_coords);
  // 0.3 m/s (~1 km/h) — below normal GPS/walking noise, so a stationary
  // phone doesn't flicker "Moving" from drift alone.
  const isMoving = isLive && !isSignalLost && (ping?.speed ?? 0) > 0.3;
  const badgeStatus = isSignalLost ? 'lost' : isLive ? 'live' : 'ended';

  const ownerName = session.destination
    ? `Walking to ${session.destination}`
    : 'Shared their location with you';

  return (
    <div className="min-h-screen bg-white flex flex-col max-w-[430px] mx-auto">
      <div className="px-4 pt-4 pb-3 border-b border-[rgba(0,0,0,.08)]" style={{ background: headerBg, color: headerFg }}>
        <div className="flex items-center gap-2.5 mb-1.5">
          <div
            className="w-7 h-7 rounded-[8px] flex items-center justify-center"
            style={{ background: isSOS || isSignalLost ? 'rgba(255,255,255,0.18)' : '#0A0A0A' }}
            aria-hidden="true"
          >
            <svg viewBox="0 0 64 64" width={22} height={22}>
              <circle cx="32" cy="32" r="24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2.2"/>
              <circle cx="32" cy="32" r="15" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2.2"/>
              <circle cx="32" cy="32" r="6" fill="white"/>
            </svg>
          </div>
          <span className="font-bold text-[14px] tracking-[-0.2px]">SafeWalk</span>
          <div className="ml-auto">
            <LiveBadge status={badgeStatus} />
          </div>
        </div>
        <div className="text-[22px] font-bold tracking-[-0.4px] mt-3">
          {isSOS ? '🚨 Emergency active' : isSignalLost ? '⚠️ Signal lost' : 'Walk shared with you'}
        </div>
        <div className="text-[12px] opacity-85 mt-0.5">
          {isSignalLost
            ? `Last seen ${relativeTime || 'a moment ago'}${address ? ` near ${address}` : ''}`
            : `${ownerName} · ${relativeTime || 'just now'}`}
        </div>
      </div>

      {isSignalLost && (
        <div className="px-4 py-3 bg-status-warn-bg flex items-start gap-2.5">
          <span aria-hidden="true" className="text-[16px] leading-none mt-0.5">📍</span>
          <p className="text-[12.5px] text-status-warn leading-relaxed">
            Location hasn't updated in over {STALE_AFTER_SECONDS} seconds — the phone may be off, out of signal, or
            tracking stopped. The map below shows their <strong>last known location</strong>, not a live position.
          </p>
        </div>
      )}

      {/* Map */}
      <div className="relative flex-shrink-0" style={{ height: 330 }}>
        <div ref={mapContainerRef} className="w-full h-full" />
        {/* Updated badge */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-white rounded-full px-2.5 py-1.5 shadow-[0_2px_8px_rgba(0,0,0,0.10)]">
          <span className={`w-1.5 h-1.5 rounded-full ${isSignalLost ? 'bg-status-warn' : 'bg-status-safe'}`} />
          <span className="text-[11px] font-semibold text-[#888899]">
            {isSignalLost ? `Signal lost · ${relativeTime}` : (relativeTime || 'Updated just now')}
          </span>
        </div>
        {/* Moving / stopped badge */}
        {isLive && !isSignalLost && (
          <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-white rounded-full px-2.5 py-1.5 shadow-[0_2px_8px_rgba(0,0,0,0.10)]">
            <span className={`w-1.5 h-1.5 rounded-full ${isMoving ? 'bg-purple-600' : 'bg-[#9A9A9A]'}`} />
            <span className="text-[11px] font-semibold text-[#888899]">
              {isMoving ? 'Moving' : 'Stopped'}
            </span>
          </div>
        )}
        <div className="absolute bottom-3 left-3 right-3 bg-white rounded-[12px] px-3 py-2 shadow-[0_4px_18px_rgba(0,0,0,0.14)]">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="block w-6 h-[3px] rounded-full bg-purple-600" />
              <span className="text-[11px] font-semibold text-[#0A0A0A]">Live movement</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="block w-6 h-[3px] rounded-full bg-[#0A0A0A]" />
              <span className="text-[11px] font-semibold text-[#888899]">Route ahead</span>
            </div>
          </div>
        </div>
      </div>

      {/* Info rows */}
      <div className="flex-1 px-4 py-2 overflow-y-auto">
        {ping && (
          <InfoRow
            label="Last location"
            value={address ?? `${ping.lat.toFixed(5)}°N, ${Math.abs(ping.lng).toFixed(5)}°W`}
          />
        )}
        {ping && (
          <InfoRow
            label="Coordinates"
            value={`${ping.lat.toFixed(5)}, ${ping.lng.toFixed(5)}`}
          />
        )}
        {isLive && (
          <InfoRow label="Status" value={isSignalLost ? 'Signal lost' : isMoving ? 'Moving' : 'Stopped'} />
        )}
        {ping?.bearing != null && (
          <InfoRow label="Direction" value={`${bearingToCompass(ping.bearing)} (${Math.round(ping.bearing)}°)`} />
        )}
        {ping?.speed != null && (
          <InfoRow label="Speed" value={`${(ping.speed * 3.6).toFixed(1)} km/h`} />
        )}
        <InfoRow label="Planned route" value={plannedRoute.length > 1 ? 'Visible on map' : 'Waiting for route'} />
        <InfoRow label="Live movement" value={trail.length > 1 ? `${trail.length} points received` : 'Waiting for movement'} />
        <InfoRow label="Walk started" value={new Date(session.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} />
        <InfoRow label="Link expires" value={new Date(session.share_expires_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} isLast />

        {/* Buttons */}
        <div className="flex gap-2.5 mt-4">
          <a
            href="tel:911"
            className="flex-1 h-[52px] rounded-[14px] bg-[#0A0A0A] text-white font-semibold text-[15px] flex items-center justify-center gap-2"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3-8.6A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .3 2 .6 2.9a2 2 0 0 1-.5 2L8 9.8a16 16 0 0 0 6 6l1.2-1.2a2 2 0 0 1 2-.5c1 .3 2 .5 2.9.6a2 2 0 0 1 1.7 2Z"/>
            </svg>
            Call
          </a>
          <a
            href="tel:911"
            className="flex-1 h-[52px] rounded-[14px] bg-[#E24B4A] text-white font-semibold text-[15px] flex items-center justify-center gap-2"
            style={{ boxShadow: '0 6px 18px rgba(226,75,74,0.35)' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3-8.6A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .3 2 .6 2.9a2 2 0 0 1-.5 2L8 9.8a16 16 0 0 0 6 6l1.2-1.2a2 2 0 0 1 2-.5c1 .3 2 .5 2.9.6a2 2 0 0 1 1.7 2Z"/>
            </svg>
            Call 911
          </a>
        </div>

        {/* Trust footer */}
        <div className="mt-4 bg-[#F0F0F4] rounded-[12px] px-3.5 py-3 mb-4">
          <p className="text-[12px] text-[#888899] leading-relaxed">
            You received this link because someone listed you as a trusted contact.
            SafeWalk shares live location only during active walks.
          </p>
        </div>
      </div>
    </div>
  );
}
