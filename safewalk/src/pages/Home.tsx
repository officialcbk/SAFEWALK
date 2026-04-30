import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { differenceInSeconds, formatDuration, intervalToDuration } from 'date-fns';
import toast from 'react-hot-toast';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { useWalkStore } from '../store/walkStore';
import { useGeolocation } from '../hooks/useGeolocation';
import { useCheckIn } from '../hooks/useCheckIn';
import { geocodeAddress, getWalkingRoute } from '../services/routing';
import { haversineDistance, formatEta } from '../services/eta';
import { MapView } from '../components/map/MapView';
import { SosButton } from '../components/walk/SosButton';
import { Avatar } from '../components/ui/Avatar';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import type { LatLng } from '../types';

interface Suggestion {
  id: string;
  text: string;
  place_name: string;
  center: [number, number]; // [lng, lat]
}

// ── Stats query ───────────────────────────────────────────────────────────────
function useHomeStats(userId: string | undefined) {
  return useQuery({
    queryKey: ['home-stats', userId],
    enabled: !!userId,
    queryFn: async () => {
      const start = new Date();
      start.setDate(1); start.setHours(0, 0, 0, 0);
      const [{ count: walks }, { count: contacts }] = await Promise.all([
        supabase.from('walk_sessions').select('id', { count: 'exact', head: true })
          .eq('user_id', userId!).gte('started_at', start.toISOString()),
        supabase.from('trusted_contacts').select('id', { count: 'exact', head: true })
          .eq('user_id', userId!),
      ]);
      return { walks: walks ?? 0, contacts: contacts ?? 0 };
    },
  });
}

// ── Session timer ─────────────────────────────────────────────────────────────
function useSessionTimer(startedAt: Date | null) {
  const [elapsed, setElapsed] = useState('0:00');
  useEffect(() => {
    if (!startedAt) return;
    const id = setInterval(() => {
      const secs = differenceInSeconds(new Date(), startedAt);
      const h = Math.floor(secs / 3600);
      const m = Math.floor((secs % 3600) / 60);
      const s = secs % 60;
      setElapsed(h > 0
        ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
        : `${m}:${String(s).padStart(2, '0')}`
      );
    }, 1000);
    return () => clearInterval(id);
  }, [startedAt]);
  return elapsed;
}

// ── Logo badge (pill) ─────────────────────────────────────────────────────────
function LogoBadge() {
  return (
    <div className="inline-flex items-center gap-2 bg-white rounded-full pl-2 pr-3.5 py-2 shadow-[0_2px_10px_rgba(0,0,0,0.08)]">
      <div
        className="w-7 h-7 rounded-[8px] flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #7F77DD, #534AB7)' }}
        aria-hidden="true"
      >
        <svg viewBox="0 0 64 64" width={22} height={22}>
          <circle cx="32" cy="32" r="24" fill="none" stroke="rgba(255,255,255,0.32)" strokeWidth="2.2"/>
          <circle cx="32" cy="32" r="15" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2.2"/>
          <circle cx="32" cy="32" r="6" fill="white"/>
        </svg>
      </div>
      <span className="font-bold text-[14px] text-[#1A1A28] tracking-[-0.2px]">SafeWalk</span>
    </div>
  );
}

// ── Search icon ───────────────────────────────────────────────────────────────
function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#888899" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>
    </svg>
  );
}

// ── Check-in overlay ──────────────────────────────────────────────────────────
function CheckInOverlay({ onSafe }: { onSafe: () => void; secondsLeft: number }) {
  const [count, setCount] = useState(30);
  useEffect(() => {
    const id = setInterval(() => setCount((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="checkin-title"
      className="fixed inset-0 z-50 flex flex-col"
      style={{ maxWidth: 430, margin: '0 auto' }}
    >
      {/* Dimmed map behind */}
      <div className="flex-1 bg-black/40" />

      {/* Amber bottom sheet */}
      <div className="bg-[#FAEEDA] rounded-[24px_24px_0_0] px-6 pb-8 pt-2 shadow-[0_-10px_40px_rgba(0,0,0,0.15)]">
        <div className="w-11 h-1 bg-[#E8C088] rounded-full mx-auto mb-5" />

        {/* Alert icon */}
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center mb-3.5 mx-auto"
          style={{ background: 'rgba(133,79,11,0.12)' }}
          aria-hidden="true"
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#854F0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/>
            <path d="M12 9v4"/><path d="M12 17h.01"/>
          </svg>
        </div>

        <h2 id="checkin-title" className="text-[22px] font-bold text-[#1A1A28] text-center mb-1.5 tracking-[-0.3px]">
          Are you okay?
        </h2>
        <p className="text-[14px] text-[#854F0B] text-center mb-5">
          Your contacts will be alerted after the countdown
        </p>

        {/* Countdown box */}
        <div
          className="w-20 h-16 rounded-[16px] flex items-center justify-center mx-auto mb-6 font-bold text-[32px] text-[#854F0B] tabular-nums"
          style={{ background: 'rgba(133,79,11,0.10)' }}
          aria-live="assertive"
          aria-label={`${count} seconds remaining`}
        >
          0:{String(count).padStart(2, '0')}
        </div>

        <button
          onClick={onSafe}
          autoFocus
          className="w-full h-[52px] rounded-[14px] bg-[#854F0B] text-white font-semibold text-[16px] transition-colors hover:bg-[#6a3e09] active:scale-[0.98]"
        >
          I'm okay
        </button>
      </div>
    </div>
  );
}

// ── SOS overlay ───────────────────────────────────────────────────────────────
function SosOverlay({
  onCancel,
  contacts,
}: {
  onCancel: () => void;
  contacts: Array<{ name: string; phone: string }>;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="sos-title"
      className="fixed inset-0 z-50 flex flex-col items-center justify-between px-6 py-10"
      style={{
        maxWidth: 430,
        margin: '0 auto',
        background: 'linear-gradient(to bottom, #E24B4A 0%, #c03b3a 100%)',
      }}
    >
      {/* Pulsing rings + SOS disc */}
      <div className="flex flex-col items-center gap-4 mt-8">
        <div className="relative flex items-center justify-center" style={{ width: 160, height: 160 }} aria-hidden="true">
          {/* Outer ring */}
          <div className="absolute w-[160px] h-[160px] rounded-full border-[2px] border-white/20 animate-[ping_2s_ease-out_infinite]" />
          <div className="absolute w-[130px] h-[130px] rounded-full border-[2px] border-white/30 animate-[ping_2s_ease-out_0.5s_infinite]" />
          {/* White disc */}
          <div
            className="w-[96px] h-[96px] rounded-full bg-white flex items-center justify-center z-10"
            style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.25)' }}
          >
            <span className="text-[#E24B4A] font-bold text-[18px] tracking-[1px]">SOS</span>
          </div>
        </div>

        <div className="text-center">
          <p id="sos-title" className="text-[22px] font-bold text-white tracking-[-0.3px]">Emergency activated</p>
          <p className="text-[14px] text-white/80 mt-1" aria-live="polite">Alerting your contacts now…</p>
        </div>

        {/* Contacts list */}
        {contacts.length > 0 && (
          <div className="w-full flex flex-col gap-2 mt-2">
            {contacts.map((c) => (
              <div key={c.phone} className="flex items-center justify-between bg-white/15 rounded-[14px] px-4 py-3">
                <div>
                  <div className="text-white font-semibold text-[14px]">{c.name}</div>
                  <div className="text-white/70 text-[12px]">{c.phone}</div>
                </div>
                <div className="flex items-center gap-1.5 bg-white/20 rounded-full px-3 py-1">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M20 6 9 17l-5-5"/>
                  </svg>
                  <span className="text-white text-[11px] font-semibold">SMS sent</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Buttons */}
      <div className="w-full flex flex-col gap-2.5">
        <button
          onClick={onCancel}
          autoFocus
          className="w-full h-[52px] rounded-[14px] bg-white/20 text-white font-semibold text-[16px] border border-white/30 active:scale-[0.98]"
        >
          Cancel SOS — I'm okay
        </button>
        <a
          href="tel:911"
          className="w-full h-[52px] rounded-[14px] bg-white flex items-center justify-center gap-2 font-semibold text-[16px] text-[#E24B4A]"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3-8.6A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .3 2 .6 2.9a2 2 0 0 1-.5 2L8 9.8a16 16 0 0 0 6 6l1.2-1.2a2 2 0 0 1 2-.5c1 .3 2 .5 2.9.6a2 2 0 0 1 1.7 2Z"/>
          </svg>
          Call 911
        </a>
      </div>
    </div>
  );
}

// ── Main Home component ───────────────────────────────────────────────────────
export default function Home() {
  const navigate = useNavigate();
  const { user, profile } = useAuthStore();
  const {
    walk, startWalk, endWalk, setLocation, setDistance, setStatus, setEscalationStage, setDestination,
    routeCoords, setRouteCoords, destinationCoords, setDestinationCoords,
  } = useWalkStore();
  const { location, startTracking, stopTracking } = useGeolocation();
  const stats = useHomeStats(user?.id);
  const timer = useSessionTimer(walk.startedAt ? new Date(walk.startedAt) : null);

  const [showEndConfirm, setShowEndConfirm]   = useState(false);
  const [showCheckIn, setShowCheckIn]         = useState(false);
  const [showSosOverlay, setShowSosOverlay]   = useState(false);
  const [sosContacts, setSosContacts]         = useState<Array<{ name: string; phone: string }>>([]);
  const [destinationText, setDestinationText] = useState(walk.destination ?? '');
  const [eta, setEta]                         = useState<string | null>(
    walk.distanceMeters > 0 ? formatEta(walk.distanceMeters) : null
  );
  const [currentLoc, setCurrentLoc]           = useState<LatLng | null>(walk.currentLocation);

  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

  const geocodeTimer    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suggestionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const destCoordsRef   = useRef<[number, number] | null>(destinationCoords);
  const routeLoaded   = useRef(!!routeCoords);
  const locRef        = useRef<LatLng | null>(null);
  const isActiveRef   = useRef(false);

  isActiveRef.current = !!walk.sessionId;

  useEffect(() => { destCoordsRef.current = destinationCoords; }, [destinationCoords]);

  // Re-start GPS if Home remounts during an active walk (tab switch recovery)
  useEffect(() => {
    if (walk.sessionId) startTracking();
    return () => stopTracking();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync GPS → store + map
  useEffect(() => {
    if (!location || !walk.sessionId) return;
    const ll: LatLng = { lat: location.lat, lng: location.lng };
    setLocation(ll);
    setCurrentLoc(ll);
    locRef.current = ll;

    if (destCoordsRef.current) {
      const dist = haversineDistance(ll.lat, ll.lng, destCoordsRef.current[1], destCoordsRef.current[0]);
      setDistance(dist);
      setEta(formatEta(dist));
    }

    if (destCoordsRef.current && !routeLoaded.current) {
      routeLoaded.current = true;
      getWalkingRoute([ll.lat, ll.lng], [destCoordsRef.current[1], destCoordsRef.current[0]]).then((r) => {
        if (r) setRouteCoords(r.waypoints);
      });
    }

    if (walk.sessionId) {
      supabase.from('location_pings').insert({
        session_id: walk.sessionId, user_id: user?.id,
        lat: location.lat, lng: location.lng,
        bearing: location.bearing, speed: location.speed,
      });
    }
  }, [location, walk.sessionId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Destination geocoding (debounced)
  const handleDestination = useCallback((value: string) => {
    setDestinationText(value);
    setDestination(value || null);
    routeLoaded.current = false;
    setRouteCoords(null);
    setDestinationCoords(null);
    destCoordsRef.current = null;
    setEta(null);
    if (geocodeTimer.current) clearTimeout(geocodeTimer.current);
    if (!value.trim()) return;
    geocodeTimer.current = setTimeout(async () => {
      const coords = await geocodeAddress(value.trim());
      if (!coords) return;
      const mapboxCoords: [number, number] = [coords[1], coords[0]];
      destCoordsRef.current = mapboxCoords;
      setDestinationCoords(mapboxCoords);
      if (isActiveRef.current && locRef.current) {
        routeLoaded.current = true;
        getWalkingRoute([locRef.current.lat, locRef.current.lng], coords).then((r) => {
          if (r) setRouteCoords(r.waypoints);
        });
      }
    }, 1000);
  }, [setDestination, setRouteCoords, setDestinationCoords]);

  // Address autocomplete (Mapbox Geocoding)
  const fetchSuggestions = useCallback((value: string) => {
    if (suggestionTimer.current) clearTimeout(suggestionTimer.current);
    if (value.trim().length < 2) { setSuggestions([]); return; }
    suggestionTimer.current = setTimeout(async () => {
      try {
        const token = import.meta.env.VITE_MAPBOX_TOKEN as string;
        const res = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(value.trim())}.json?access_token=${token}&types=address,place,poi&limit=5&country=ca`
        );
        if (!res.ok) return;
        const data = await res.json();
        setSuggestions(data.features ?? []);
      } catch { /* ignore */ }
    }, 300);
  }, []);

  const handleSuggestionSelect = useCallback((s: Suggestion) => {
    if (geocodeTimer.current) clearTimeout(geocodeTimer.current);
    if (suggestionTimer.current) clearTimeout(suggestionTimer.current);
    setSuggestions([]);
    setDestinationText(s.place_name);
    setDestination(s.place_name);
    routeLoaded.current = false;
    setRouteCoords(null);
    const mapboxCoords: [number, number] = [s.center[0], s.center[1]];
    destCoordsRef.current = mapboxCoords;
    setDestinationCoords(mapboxCoords);
    setEta(null);
    if (isActiveRef.current && locRef.current) {
      routeLoaded.current = true;
      getWalkingRoute(
        [locRef.current.lat, locRef.current.lng],
        [s.center[1], s.center[0]]
      ).then((r) => { if (r) setRouteCoords(r.waypoints); });
    }
  }, [setDestination, setRouteCoords, setDestinationCoords]);

  // Check-in hook
  const { checkInSecondsLeft, reset: resetCheckIn } = useCheckIn(
    !!walk.sessionId,
    () => { setShowCheckIn(true); setEscalationStage(1); }
  );

  const handleSafe = () => {
    setShowCheckIn(false);
    setEscalationStage(0);
    resetCheckIn();
    toast.success("Great, glad you're safe.");
  };

  // Start walk
  const handleStart = async () => {
    if (!user) return;
    const { data: session, error } = await supabase.from('walk_sessions').insert({
      user_id: user.id, destination: destinationText || null,
    }).select().single();
    if (error || !session) { toast.error("Couldn't start walk. Try again."); return; }
    setSuggestions([]);
    startWalk(session.id, session.share_token);
    startTracking();
    stats.refetch();
  };

  // End walk
  const handleEnd = async () => {
    setShowEndConfirm(false);
    stopTracking();
    if (walk.sessionId) {
      const secs = walk.startedAt ? differenceInSeconds(new Date(), new Date(walk.startedAt)) : 0;
      await supabase.from('walk_sessions').update({
        status: 'completed',
        ended_at: new Date().toISOString(),
        duration_seconds: secs,
        distance_meters: Math.round(walk.distanceMeters),
      }).eq('id', walk.sessionId);
    }
    endWalk();
    setEta(null);
    setCurrentLoc(null);
    setDestinationText('');
    locRef.current = null;
    destCoordsRef.current = null;
    routeLoaded.current = false;
    const dist = (walk.distanceMeters / 1000).toFixed(1);
    const secs = walk.startedAt ? differenceInSeconds(new Date(), new Date(walk.startedAt)) : 0;
    const dur = formatDuration(intervalToDuration({ start: 0, end: secs * 1000 }), { format: ['hours', 'minutes'] });
    toast.success(`Walk saved · ${dist} km${dur ? ` · ${dur}` : ''}`);
    stats.refetch();
  };

  // SOS
  const handleSOS = async () => {
    if (!user || !walk.sessionId) return;
    setStatus('sos_triggered');
    setEscalationStage(2);

    await supabase.from('walk_sessions').update({ status: 'sos_triggered' }).eq('id', walk.sessionId);

    const { data: contacts } = await supabase
      .from('trusted_contacts').select('full_name, phone').eq('user_id', user.id);

    const list = (contacts ?? []).map((c) => ({ name: c.full_name, phone: c.phone }));
    setSosContacts(list);
    setShowSosOverlay(true);

    if (list.length) {
      const shareUrl = walk.shareToken ? `${window.location.origin}/track/${walk.shareToken}` : null;
      const name = profile?.full_name || user.email || 'Someone';
      const message = shareUrl
        ? `EMERGENCY: ${name} has triggered an SOS on SafeWalk. Track their live location: ${shareUrl}`
        : `EMERGENCY: ${name} has triggered an SOS on SafeWalk. Please check on them immediately.`;
      await supabase.functions.invoke('send-alert', {
        body: { contacts: list, message },
      });
    } else {
      toast.error('No trusted contacts — add contacts so they can be alerted.');
    }
  };

  const handleCancelSOS = () => {
    setShowSosOverlay(false);
    setShowCheckIn(false);
    setEscalationStage(0);
    setStatus('active');
    resetCheckIn();
    if (walk.sessionId) {
      supabase.from('walk_sessions').update({ status: 'active' }).eq('id', walk.sessionId);
    }
    toast.success("Glad you're safe. Emergency cancelled.");
  };

  const isActive = !!walk.sessionId;
  const initials = profile?.avatar_initials ?? profile?.full_name?.slice(0, 2).toUpperCase() ?? 'SW';

  // Check-in progress bar (90s countdown)
  const checkInMax = 90;
  const checkInPct = Math.max(0, Math.min(100, (checkInSecondsLeft / checkInMax) * 100));
  const checkInMin = Math.floor(checkInSecondsLeft / 60);
  const checkInSec = checkInSecondsLeft % 60;

  return (
    <>
      {/* Overlays */}
      {showCheckIn && !showSosOverlay && (
        <CheckInOverlay onSafe={handleSafe} secondsLeft={checkInSecondsLeft} />
      )}
      {showSosOverlay && (
        <SosOverlay onCancel={handleCancelSOS} contacts={sosContacts} />
      )}

      {/* Full-viewport layout */}
      <div className="relative w-full bg-[#EEF1F6]" style={{ height: 'calc(100vh - 78px)' }}>

        {/* Map fills entire background */}
        <div className="absolute inset-0">
          <MapView
            location={currentLoc}
            routeCoords={routeCoords}
            destinationCoords={destinationCoords}
            isActive={isActive}
          />
        </div>

        {/* Active walk: top status banner */}
        {isActive && (
          <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 py-2.5 bg-white/95 border-b border-[#E0E0E8]">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#3B6D11]" aria-hidden="true" />
              <span className="text-[13px] font-semibold text-[#1A1A28]">Walk in progress</span>
            </div>
            <span className="text-[13px] font-bold text-[#1A1A28] tabular-nums">{timer}</span>
          </div>
        )}

        {/* Top chrome (idle) */}
        {!isActive && (
          <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 pt-3 z-20">
            <LogoBadge />
            <button
              className="w-11 h-11 rounded-full bg-white flex items-center justify-center shadow-[0_4px_14px_rgba(0,0,0,0.12)]"
              onClick={() => navigate('/settings')}
              aria-label="Settings"
            >
              <Avatar initials={initials} size={36} />
            </button>
          </div>
        )}

        {/* Floating map buttons (idle) */}
        {!isActive && (
          <div className="absolute right-4 bottom-[228px] z-20 flex flex-col gap-2">
            <button
              className="w-11 h-11 bg-white rounded-full flex items-center justify-center shadow-[0_4px_14px_rgba(0,0,0,0.12)]"
              aria-label="Center on my location"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#534AB7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="9"/><path d="M22 12h-4M6 12H2M12 6V2M12 22v-4"/>
              </svg>
            </button>
          </div>
        )}

        {/* Bottom sheet */}
        <div
          className="absolute bottom-0 left-0 right-0 bg-white rounded-t-[24px] z-20 transition-all duration-300"
          style={{
            height: isActive ? 290 : 222,
            boxShadow: '0 -4px 24px rgba(0,0,0,0.08)',
          }}
        >
          {/* Handle */}
          <div className="flex justify-center pt-2 pb-1">
            <div className="w-11 h-1 bg-[#D5D5DD] rounded-full" />
          </div>

          {!isActive ? (
            /* ── Idle sheet ───────────────────────────────────── */
            <div className="px-4 flex flex-col gap-3 pt-1">
              {/* Search bar + suggestion dropdown */}
              <div className="relative">
                <div className="flex items-center gap-2.5 bg-[#F0F0F4] rounded-[14px] px-3.5 py-0" style={{ height: 52 }}>
                  <SearchIcon />
                  <input
                    type="text"
                    placeholder="Where are you going?"
                    value={destinationText}
                    onChange={(e) => { handleDestination(e.target.value); fetchSuggestions(e.target.value); }}
                    onBlur={() => setTimeout(() => setSuggestions([]), 150)}
                    className="flex-1 text-[15px] text-[#1A1A28] placeholder:text-[#888899] bg-transparent outline-none font-[Inter,sans-serif]"
                  />
                  {destinationText.length > 0 && (
                    <button
                      onClick={() => { handleDestination(''); setSuggestions([]); }}
                      className="flex-shrink-0 text-[#888899] hover:text-[#1A1A28]"
                      aria-label="Clear destination"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                        <path d="M18 6 6 18M6 6l12 12"/>
                      </svg>
                    </button>
                  )}
                </div>

                {suggestions.length > 0 && (
                  <div className="absolute left-0 right-0 bottom-full mb-2 bg-white rounded-[14px] border border-[#E0E0E8] overflow-hidden z-10 shadow-[0_-8px_24px_rgba(0,0,0,0.10)]">
                    {suggestions.map((s, i) => {
                      const addressPart = s.place_name.startsWith(s.text)
                        ? s.place_name.slice(s.text.length + 2)
                        : s.place_name;
                      return (
                        <button
                          key={s.id}
                          className={`w-full flex items-start gap-3 px-3.5 py-3 text-left transition-colors active:bg-[#F0F0F4] hover:bg-[#F8F8FC] ${i < suggestions.length - 1 ? 'border-b border-[#E0E0E8]' : ''}`}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => handleSuggestionSelect(s)}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#888899" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5" aria-hidden="true">
                            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>
                          </svg>
                          <div className="flex-1 min-w-0">
                            <div className="text-[14px] font-semibold text-[#1A1A28] truncate">{s.text}</div>
                            {addressPart && (
                              <div className="text-[11px] text-[#888899] mt-0.5 truncate">{addressPart}</div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Stat cards */}
              <div className="flex gap-2">
                {[
                  { label: 'Walks this month', value: stats.data?.walks ?? '—' },
                  { label: 'Contacts ready', value: stats.data?.contacts ?? '—' },
                  { label: 'Status', value: 'Safe', valueColor: '#3B6D11' },
                ].map(({ label, value, valueColor }) => (
                  <div key={label} className="flex-1 bg-[#F0F0F4] rounded-[14px] p-3 flex flex-col gap-0.5">
                    <span className="text-[11px] text-[#888899] font-medium">{label}</span>
                    <span
                      className="text-[18px] font-bold text-[#1A1A28] tracking-[-0.3px]"
                      style={valueColor ? { color: valueColor } : undefined}
                    >
                      {value}
                    </span>
                  </div>
                ))}
              </div>

              {/* Start walk CTA */}
              <button
                onClick={handleStart}
                className="w-full h-[52px] rounded-[14px] bg-[#7F77DD] text-white font-semibold text-[16px] transition-colors hover:bg-[#6B62D4] active:scale-[0.98]"
                style={{ boxShadow: '0 6px 18px rgba(127,119,221,0.35), inset 0 1px 0 rgba(255,255,255,0.18)' }}
              >
                Start walk
              </button>
            </div>
          ) : (
            /* ── Active walk sheet ────────────────────────────── */
            <div className="flex flex-col gap-3 px-4 pt-1.5">
              {/* Check-in countdown card */}
              <div className="bg-[#EEEDFE] rounded-[14px] px-4 py-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[13px] font-semibold text-[#534AB7]">Next check-in in</span>
                  <span
                    className="text-[15px] font-bold text-[#534AB7] tabular-nums"
                    aria-live="polite"
                    aria-label={`${checkInMin} minutes ${checkInSec} seconds`}
                  >
                    {checkInMin}:{String(checkInSec).padStart(2, '0')}
                  </span>
                </div>
                <div className="h-1.5 bg-[#DCD9FB] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#7F77DD] rounded-full transition-all duration-1000"
                    style={{ width: `${checkInPct}%` }}
                  />
                </div>
              </div>

              {/* Stat cards */}
              <div className="flex gap-2">
                {[
                  { label: 'Time', value: timer },
                  { label: 'Distance', value: `${(walk.distanceMeters / 1000).toFixed(2)} km` },
                  { label: 'ETA', value: eta ?? '—' },
                ].map(({ label, value }) => (
                  <div key={label} className="flex-1 bg-[#F0F0F4] rounded-[14px] p-2.5 flex flex-col gap-0.5">
                    <span className="text-[11px] text-[#888899] font-medium">{label}</span>
                    <span className="text-[14px] font-bold text-[#1A1A28] tabular-nums tracking-[-0.2px]">{value}</span>
                  </div>
                ))}
              </div>

              {/* SOS + End walk */}
              <div className="flex items-center gap-4">
                <SosButton onActivated={handleSOS} />
                <div className="flex-1 flex flex-col gap-1.5">
                  <p className="text-[11px] text-[#888899] leading-relaxed">
                    Press &amp; hold 3 s to alert contacts
                  </p>
                  <button
                    onClick={() => setShowEndConfirm(true)}
                    className="h-[44px] rounded-[14px] bg-[#EEEDFE] text-[#534AB7] border border-[#DCD9FB] font-semibold text-[14px] w-full"
                  >
                    End walk
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={showEndConfirm}
        onClose={() => setShowEndConfirm(false)}
        onConfirm={handleEnd}
        title="End walk?"
        body="Your session will be saved to history."
        confirmLabel="End walk"
      />
    </>
  );
}
