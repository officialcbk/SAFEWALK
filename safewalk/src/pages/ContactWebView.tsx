import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { supabase } from '../lib/supabase';
import type { WalkSession, LocationPing } from '../types';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN as string;

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

function LiveBadge({ isLive }: { isLive: boolean }) {
  return (
    <span
      className="flex items-center gap-1.5 text-[10px] font-bold rounded-full px-2.5 py-1"
      style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ background: isLive ? '#7CE05F' : '#ccc' }}
      />
      {isLive ? 'LIVE' : 'ENDED'}
    </span>
  );
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
  const lastGeocodeRef  = useRef<string>('');

  const fetchLatest = useCallback(async (sessionId: string) => {
    const [{ data: pingData }, { data: sessionData }] = await Promise.all([
      supabase
        .from('location_pings').select('*').eq('session_id', sessionId)
        .order('recorded_at', { ascending: false }).limit(1).single(),
      supabase
        .from('walk_sessions').select('status, share_expires_at').eq('id', sessionId).single(),
    ]);
    if (pingData)    { setPing(pingData as LocationPing); setLastUpdated(new Date(pingData.recorded_at)); }
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
    const id = setInterval(() => fetchLatest(session.id), 15_000);
    return () => clearInterval(id);
  }, [session, fetchLatest]);

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
    const pinEl = document.createElement('div');
    pinEl.style.cssText = 'width:16px;height:16px;border-radius:50%;background:#7F77DD;border:3px solid #fff;box-shadow:0 4px 14px rgba(127,119,221,0.5);';
    markerRef.current = new mapboxgl.Marker({ element: pinEl }).setLngLat([-97.1384, 49.8951]).addTo(map);
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  useEffect(() => {
    if (!ping || !mapRef.current || !markerRef.current) return;
    const lngLat: [number, number] = [ping.lng, ping.lat];
    markerRef.current.setLngLat(lngLat);
    mapRef.current.easeTo({ center: lngLat, duration: 600 });
  }, [ping]);

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
  const headerBg = isSOS
    ? 'linear-gradient(135deg, #A32D2D, #E24B4A)'
    : 'linear-gradient(135deg, #7F77DD, #534AB7)';

  const ownerName = session.destination
    ? `Walking to ${session.destination}`
    : 'Shared their location with you';

  return (
    <div className="min-h-screen bg-white flex flex-col max-w-[430px] mx-auto">
      {/* Purple/red gradient header */}
      <div className="px-4 pt-3 pb-4" style={{ background: headerBg, color: 'white' }}>
        <div className="flex items-center gap-2.5 mb-1.5">
          {/* Logo mark */}
          <div
            className="w-7 h-7 rounded-[8px] flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.2)' }}
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
            <LiveBadge isLive={isLive} />
          </div>
        </div>
        <div className="text-[18px] font-bold tracking-[-0.3px]">
          {isSOS ? '🚨 Emergency active' : 'Walk shared with you'}
        </div>
        <div className="text-[12px] opacity-85 mt-0.5">{ownerName} · {relativeTime || 'just now'}</div>
      </div>

      {/* Map */}
      <div className="relative flex-shrink-0" style={{ height: 280 }}>
        <div ref={mapContainerRef} className="w-full h-full" />
        {/* Updated badge */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-white rounded-full px-2.5 py-1.5 shadow-[0_2px_8px_rgba(0,0,0,0.10)]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#3B6D11]" />
          <span className="text-[11px] font-semibold text-[#888899]">
            {relativeTime || 'Updated just now'}
          </span>
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
        {ping?.speed != null && (
          <InfoRow label="Speed" value={`${(ping.speed * 3.6).toFixed(1)} km/h`} />
        )}
        <InfoRow label="Walk started" value={new Date(session.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} />
        <InfoRow label="Link expires" value={new Date(session.share_expires_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} isLast />

        {/* Buttons */}
        <div className="flex gap-2.5 mt-4">
          <a
            href="tel:911"
            className="flex-1 h-[52px] rounded-[14px] bg-[#7F77DD] text-white font-semibold text-[15px] flex items-center justify-center gap-2"
            style={{ boxShadow: '0 6px 18px rgba(127,119,221,0.35)' }}
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
