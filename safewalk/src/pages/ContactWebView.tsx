import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { supabase } from '../lib/supabase';
import type { WalkSession, LocationPing } from '../types';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN as string;

type SessionStatus = WalkSession['status'];

function StatusPill({ status }: { status: SessionStatus }) {
  const map: Record<SessionStatus, { label: string; bg: string; color: string; dot: string }> = {
    active:       { label: 'Walk active',   bg: '#EAF3DE', color: '#3B6D11', dot: '#4CAF50' },
    completed:    { label: 'Completed',     bg: '#F0F0F4', color: '#555566', dot: '#888899' },
    sos_triggered:{ label: 'SOS triggered', bg: '#FCEBEB', color: '#A32D2D', dot: '#E24B4A' },
    escalating:   { label: 'Escalating',   bg: '#FAEEDA', color: '#854F0B', dot: '#F59E0B' },
  };
  const s = map[status] ?? map.active;
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[7px] font-bold"
      style={{ background: s.bg, color: s.color }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.dot }} />
      {s.label}
    </span>
  );
}

async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers: { 'User-Agent': 'SafeWalk/1.0' } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    // Return the road + suburb/city for a short, readable address
    const { road, house_number, suburb, city, town, village } = data.address ?? {};
    const street = [house_number, road].filter(Boolean).join(' ');
    const area   = city ?? town ?? village ?? suburb ?? '';
    return [street, area].filter(Boolean).join(', ') || data.display_name || null;
  } catch {
    return null;
  }
}

export default function ContactWebView() {
  const { token } = useParams<{ token: string }>();
  const [session, setSession]       = useState<WalkSession | null>(null);
  const [ping, setPing]             = useState<LocationPing | null>(null);
  const [notFound, setNotFound]     = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [relativeTime, setRelativeTime] = useState('');
  const [address, setAddress]       = useState<string | null>(null);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef          = useRef<mapboxgl.Map | null>(null);
  const markerRef       = useRef<mapboxgl.Marker | null>(null);
  // Track which coord pair we last reverse-geocoded so we don't repeat calls
  const lastGeocodeRef  = useRef<string>('');

  // Fetch latest ping and refresh session status
  const fetchLatest = useCallback(async (sessionId: string) => {
    const [{ data: pingData }, { data: sessionData }] = await Promise.all([
      supabase
        .from('location_pings')
        .select('*')
        .eq('session_id', sessionId)
        .order('recorded_at', { ascending: false })
        .limit(1)
        .single(),
      supabase
        .from('walk_sessions')
        .select('status, share_expires_at')
        .eq('id', sessionId)
        .single(),
    ]);

    if (pingData) {
      setPing(pingData as LocationPing);
      setLastUpdated(new Date(pingData.recorded_at));
    }
    if (sessionData) {
      setSession((prev) => prev ? { ...prev, ...sessionData } : prev);
    }
  }, []);

  useEffect(() => {
    if (!token) { setNotFound(true); return; }

    supabase
      .from('walk_sessions')
      .select('*')
      .eq('share_token', token)
      .single()
      .then(({ data, error }) => {
        if (error || !data) { setNotFound(true); return; }
        const s = data as WalkSession;
        if (new Date(s.share_expires_at) < new Date()) { setNotFound(true); return; }
        setSession(s);
        fetchLatest(s.id);
      });
  }, [token, fetchLatest]);

  // 15-second auto-refresh (only while active)
  useEffect(() => {
    if (!session) return;
    if (session.status === 'completed') return; // no need to poll after walk ends
    const id = setInterval(() => fetchLatest(session.id), 15_000);
    return () => clearInterval(id);
  }, [session, fetchLatest]);

  // Reverse geocode whenever coordinates change (throttled by lastGeocodeRef)
  useEffect(() => {
    if (!ping) return;
    const key = `${ping.lat.toFixed(4)},${ping.lng.toFixed(4)}`;
    if (key === lastGeocodeRef.current) return;
    lastGeocodeRef.current = key;
    reverseGeocode(ping.lat, ping.lng).then(setAddress);
  }, [ping]);

  // Relative time ticker
  useEffect(() => {
    if (!lastUpdated) return;
    const update = () => {
      const secs = (Date.now() - lastUpdated.getTime()) / 1000;
      setRelativeTime(secs < 30 ? 'Just now' : formatDistanceToNow(lastUpdated, { addSuffix: true }));
    };
    update();
    const id = setInterval(update, 5_000);
    return () => clearInterval(id);
  }, [lastUpdated]);

  // Init map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [-97.1384, 49.8951],
      zoom: 15,
    });
    mapRef.current = map;

    const pinEl = document.createElement('div');
    pinEl.style.cssText = 'width:16px;height:16px;border-radius:50%;background:#7F77DD;border:2px solid #fff;';
    markerRef.current = new mapboxgl.Marker({ element: pinEl }).setLngLat([-97.1384, 49.8951]).addTo(map);

    return () => { map.remove(); mapRef.current = null; };
  }, []);

  // Update pin when ping arrives
  useEffect(() => {
    if (!ping || !mapRef.current || !markerRef.current) return;
    const lngLat: [number, number] = [ping.lng, ping.lat];
    markerRef.current.setLngLat(lngLat);
    mapRef.current.easeTo({ center: lngLat, duration: 600 });
  }, [ping]);

  if (notFound) return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="w-[50px] h-[24px] bg-[#7F77DD] rounded-[6px] flex items-center justify-center">
        <span className="text-white font-bold text-[9px]">SW</span>
      </div>
      <h1 className="text-[14px] font-bold text-[#1A1A28]">This link has expired</h1>
      <p className="text-[11px] text-[#888899] leading-relaxed max-w-[280px]">
        Walk safety links are active for 24 hours. If you're concerned, contact them directly or call emergency services.
      </p>
      <a
        href="tel:911"
        className="mt-2 w-[200px] h-12 bg-[#E24B4A] text-white font-bold text-[12px] rounded-[50px] flex items-center justify-center"
      >
        🚨 Call 911
      </a>
      <p className="text-[7px] text-[#888899] mt-4">SafeWalk · PIPEDA compliant</p>
    </div>
  );

  if (!session) return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-[#7F77DD] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const isLive = session.status === 'active' || session.status === 'escalating';

  return (
    <div className="min-h-screen bg-white flex flex-col max-w-[430px] mx-auto">
      {/* Header */}
      <div
        className="px-4 pt-3 pb-3"
        style={{
          minHeight: 70,
          background: session.status === 'sos_triggered' ? '#A32D2D' : '#7F77DD',
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-[28px] h-[14px] bg-white/20 rounded flex items-center justify-center">
              <span className="text-white font-bold text-[8px]">SW</span>
            </div>
            <span className="text-white font-bold text-[11px]">SafeWalk — Location share</span>
          </div>
          <StatusPill status={session.status} />
        </div>
        <p className="text-white/80 text-[8px] mt-1">
          {session.destination ? `Walking to ${session.destination}` : 'Shared their location with you'}
        </p>
      </div>

      {/* Map */}
      <div className="relative" style={{ height: '40vh' }}>
        <div ref={mapContainerRef} className="w-full h-full" />
        {/* Live / Ended badge */}
        <div className="absolute top-2 right-2 flex items-center gap-1 bg-white border border-[#E0E0E8] rounded-full px-2 py-0.5 shadow-sm">
          {isLive ? (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-[#E24B4A] animate-pulse" />
              <span className="text-[7px] font-bold text-[#A32D2D]">LIVE</span>
            </>
          ) : (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-[#888899]" />
              <span className="text-[7px] font-bold text-[#555566]">ENDED</span>
            </>
          )}
        </div>
      </div>

      {/* Info rows */}
      <div className="flex-1 px-4 py-3 flex flex-col divide-y divide-[#F0F0F4]">
        {/* Status row */}
        <div className="flex items-center justify-between py-2">
          <span className="text-[8px] text-[#888899]">Status</span>
          <StatusPill status={session.status} />
        </div>

        {/* Address row — shows geocoded address, falls back to coordinates */}
        {ping && (
          <div className="flex items-center justify-between py-2 gap-4">
            <span className="text-[8px] text-[#888899] flex-shrink-0">Location</span>
            <span className="text-[8px] font-bold text-[#1A1A28] text-right leading-snug">
              {address
                ? address
                : `${ping.lat.toFixed(5)}°N, ${Math.abs(ping.lng).toFixed(5)}°W`}
            </span>
          </div>
        )}

        {/* Coordinates row (always shown as secondary detail) */}
        {ping && (
          <div className="flex items-center justify-between py-2">
            <span className="text-[8px] text-[#888899]">Coordinates</span>
            <span className="text-[8px] text-[#555566]">
              {ping.lat.toFixed(5)}, {ping.lng.toFixed(5)}
            </span>
          </div>
        )}

        {[
          { label: 'Last updated', value: relativeTime || '—' },
          ping?.speed != null ? { label: 'Speed', value: `${(ping.speed * 3.6).toFixed(1)} km/h` } : null,
          { label: 'Walk started', value: new Date(session.started_at).toLocaleTimeString() },
          { label: 'Link expires', value: new Date(session.share_expires_at).toLocaleTimeString() },
        ].filter(Boolean).map((row) => (
          <div key={row!.label} className="flex items-center justify-between py-2">
            <span className="text-[8px] text-[#888899]">{row!.label}</span>
            <span className="text-[8px] font-bold text-[#1A1A28]">{row!.value}</span>
          </div>
        ))}
      </div>

      {/* Call button */}
      <div className="px-4 pb-6 flex gap-3">
        <a
          href="tel:911"
          className="flex-1 h-12 bg-[#FCEBEB] text-[#A32D2D] font-bold text-[11px] rounded-[50px] flex items-center justify-center gap-1"
        >
          🚨 Call 911
        </a>
      </div>

      <p className="text-center text-[7px] text-[#888899] pb-4">SafeWalk · PIPEDA compliant</p>
    </div>
  );
}
