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
import { useNavigation } from '../hooks/useNavigation';
import { getDirections } from '../services/directions';
import { maneuverIcon, formatNavDistance, formatNavDuration } from '../services/navigation';
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
      setElapsed(
        h > 0
          ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
          : `${m}:${String(s).padStart(2, '0')}`,
      );
    }, 1000);
    return () => clearInterval(id);
  }, [startedAt]);
  return elapsed;
}

// ── Logo badge ────────────────────────────────────────────────────────────────
function LogoBadge() {
  return (
    <div className="inline-flex items-center gap-2 bg-white rounded-full pl-2 pr-3.5 py-2 shadow-[0_2px_10px_rgba(0,0,0,0.10)]">
      <div
        className="w-7 h-7 rounded-[8px] flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg,#7F77DD,#534AB7)' }}
      >
        <svg viewBox="0 0 64 64" width={20} height={20}>
          <circle cx="32" cy="32" r="24" fill="none" stroke="rgba(255,255,255,0.32)" strokeWidth="2.2"/>
          <circle cx="32" cy="32" r="15" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2.2"/>
          <circle cx="32" cy="32" r="6" fill="white"/>
        </svg>
      </div>
      <span className="font-bold text-[14px] text-[#1A1A28] tracking-[-0.2px]">SafeWalk</span>
    </div>
  );
}

// ── Recenter FAB ──────────────────────────────────────────────────────────────
function RecenterButton({ onPress }: { onPress: () => void }) {
  return (
    <button
      onClick={onPress}
      aria-label="Return to my location"
      className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-[0_4px_16px_rgba(0,0,0,0.18)] active:scale-95 transition-transform"
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="4" fill="#4285F4"/>
        <path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke="#4285F4" strokeWidth="2" strokeLinecap="round"/>
        <circle cx="12" cy="12" r="9" stroke="#4285F4" strokeWidth="1.5" fill="none"/>
      </svg>
    </button>
  );
}

// ── Check-in overlay ──────────────────────────────────────────────────────────
function CheckInOverlay({ onSafe }: { onSafe: () => void }) {
  const [count, setCount] = useState(30);
  useEffect(() => {
    const id = setInterval(() => setCount((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      role="dialog" aria-modal="true" aria-labelledby="checkin-title"
      className="fixed inset-0 z-50 flex flex-col"
      style={{ maxWidth: 430, margin: '0 auto' }}
    >
      <div className="flex-1 bg-black/40" />
      <div className="bg-[#FAEEDA] rounded-[24px_24px_0_0] px-6 pb-8 pt-2 shadow-[0_-10px_40px_rgba(0,0,0,0.15)]">
        <div className="w-11 h-1 bg-[#E8C088] rounded-full mx-auto mb-5" />
        <div className="w-14 h-14 rounded-full flex items-center justify-center mb-3.5 mx-auto" style={{ background: 'rgba(133,79,11,0.12)' }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#854F0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/>
            <path d="M12 9v4"/><path d="M12 17h.01"/>
          </svg>
        </div>
        <h2 id="checkin-title" className="text-[22px] font-bold text-[#1A1A28] text-center mb-1.5 tracking-[-0.3px]">Are you okay?</h2>
        <p className="text-[14px] text-[#854F0B] text-center mb-5">Your contacts will be alerted after the countdown</p>
        <div
          className="w-20 h-16 rounded-[16px] flex items-center justify-center mx-auto mb-6 font-bold text-[32px] text-[#854F0B] tabular-nums"
          style={{ background: 'rgba(133,79,11,0.10)' }}
          aria-live="assertive"
        >
          0:{String(count).padStart(2, '0')}
        </div>
        <button
          onClick={onSafe} autoFocus
          className="w-full h-[52px] rounded-[14px] bg-[#854F0B] text-white font-semibold text-[16px] hover:bg-[#6a3e09] active:scale-[0.98] flex items-center justify-center"
        >
          I'm okay
        </button>
      </div>
    </div>
  );
}

// ── SOS overlay ───────────────────────────────────────────────────────────────
function SosOverlay({ onCancel, contacts }: { onCancel: () => void; contacts: Array<{ name: string; phone: string }> }) {
  return (
    <div
      role="dialog" aria-modal="true" aria-labelledby="sos-title"
      className="fixed inset-0 z-50 flex flex-col items-center justify-between px-6 py-10"
      style={{ maxWidth: 430, margin: '0 auto', background: 'linear-gradient(to bottom,#E24B4A 0%,#c03b3a 100%)' }}
    >
      <div className="flex flex-col items-center gap-4 mt-8">
        <div className="relative flex items-center justify-center" style={{ width: 160, height: 160 }}>
          <div className="absolute w-[160px] h-[160px] rounded-full border-[2px] border-white/20 animate-[ping_2s_ease-out_infinite]" />
          <div className="absolute w-[130px] h-[130px] rounded-full border-[2px] border-white/30 animate-[ping_2s_ease-out_0.5s_infinite]" />
          <div className="w-[96px] h-[96px] rounded-full bg-white flex items-center justify-center z-10" style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.25)' }}>
            <span className="text-[#E24B4A] font-bold text-[18px] tracking-[1px]">SOS</span>
          </div>
        </div>
        <div className="text-center">
          <p id="sos-title" className="text-[22px] font-bold text-white tracking-[-0.3px]">Emergency activated</p>
          <p className="text-[14px] text-white/80 mt-1" aria-live="polite">Alerting your contacts now…</p>
        </div>
        {contacts.length > 0 && (
          <div className="w-full flex flex-col gap-2 mt-2">
            {contacts.map((c) => (
              <div key={c.phone} className="flex items-center justify-between bg-white/15 rounded-[14px] px-4 py-3">
                <div>
                  <div className="text-white font-semibold text-[14px]">{c.name}</div>
                  <div className="text-white/70 text-[12px]">{c.phone}</div>
                </div>
                <div className="flex items-center gap-1.5 bg-white/20 rounded-full px-3 py-1">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6 9 17l-5-5"/>
                  </svg>
                  <span className="text-white text-[11px] font-semibold">SMS sent</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="w-full flex flex-col gap-2.5">
        <button
          onClick={onCancel} autoFocus
          className="w-full h-[52px] rounded-[14px] bg-white/20 text-white font-semibold text-[16px] border border-white/30 active:scale-[0.98]"
        >
          Cancel SOS — I'm okay
        </button>
        <a
          href="tel:911"
          className="w-full h-[52px] rounded-[14px] bg-white flex items-center justify-center gap-2 font-semibold text-[16px] text-[#E24B4A]"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3-8.6A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .3 2 .6 2.9a2 2 0 0 1-.5 2L8 9.8a16 16 0 0 0 6 6l1.2-1.2a2 2 0 0 1 2-.5c1 .3 2 .5 2.9.6a2 2 0 0 1 1.7 2Z"/>
          </svg>
          Call 911
        </a>
      </div>
    </div>
  );
}

// ── Main Home ─────────────────────────────────────────────────────────────────
export default function Home() {
  const navigate  = useNavigate();
  const { user, profile } = useAuthStore();
  const {
    walk, startWalk, endWalk, setLocation, setDistance, setStatus, setEscalationStage, setDestination,
    routeCoords, setRouteCoords, destinationCoords, setDestinationCoords,
    navSteps, navStepIndex, navRemainingMeters, navRemainingSeconds,
    isOffRoute, isRerouting, setNavSteps,
  } = useWalkStore();
  const { location, startTracking, stopTracking } = useGeolocation();
  const stats = useHomeStats(user?.id);
  const timer = useSessionTimer(walk.startedAt ? new Date(walk.startedAt) : null);

  const isActive = !!walk.sessionId;

  // Navigation engine (runs when walk is active)
  useNavigation(isActive);

  const [showEndConfirm, setShowEndConfirm]   = useState(false);
  const [showCheckIn, setShowCheckIn]         = useState(false);
  const [showSosOverlay, setShowSosOverlay]   = useState(false);
  const [sosContacts, setSosContacts]         = useState<Array<{ name: string; phone: string }>>([]);

  // Destination UI state
  const [destinationText, setDestinationText] = useState(walk.destination ?? '');
  const [destSelected, setDestSelected]       = useState(!!walk.destination && !!destinationCoords);
  const [suggestions, setSuggestions]         = useState<Suggestion[]>([]);
  const [routeLoading, setRouteLoading]       = useState(false);
  const [routeDistance, setRouteDistance]     = useState<number | null>(null);
  const [routeDuration, setRouteDuration]     = useState<number | null>(null);

  // Map follow mode
  const [followUser, setFollowUser] = useState(true);

  // Active walk sheet: collapsable
  const [sheetCollapsed, setSheetCollapsed] = useState(false);
  const dragRef = useRef<{ startY: number; collapsed: boolean } | null>(null);

  const [currentLoc, setCurrentLoc] = useState<LatLng | null>(walk.currentLocation);

  const suggestionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const destCoordsRef   = useRef<[number, number] | null>(destinationCoords);
  const locRef          = useRef<LatLng | null>(null);
  const isActiveRef     = useRef(false);
  isActiveRef.current   = isActive;

  useEffect(() => { destCoordsRef.current = destinationCoords; }, [destinationCoords]);

  // Always track GPS so location is available for route preview before a walk starts
  useEffect(() => {
    startTracking();
    return () => stopTracking();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync GPS → map marker always; store + ping only during active walk
  useEffect(() => {
    if (!location) return;
    const ll: LatLng = { lat: location.lat, lng: location.lng };
    setCurrentLoc(ll);
    locRef.current = ll;

    if (!walk.sessionId) return;

    setLocation(ll);
    supabase.from('location_pings').insert({
      session_id: walk.sessionId, user_id: user?.id,
      lat: location.lat, lng: location.lng,
      bearing: location.bearing, speed: location.speed,
    });
  }, [location, walk.sessionId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Fetch directions (Mapbox) ─────────────────────────────────────────────
  const fetchRoute = useCallback(async (from: [number, number], to: [number, number]) => {
    setRouteLoading(true);
    try {
      const result = await getDirections(from, to);
      if (!result) return;
      setRouteCoords(result.geometry);
      setNavSteps(result.steps);
      setRouteDistance(result.totalDistance);
      setRouteDuration(result.totalDuration);
      setDistance(result.totalDistance);
    } finally {
      setRouteLoading(false);
    }
  }, [setRouteCoords, setNavSteps, setDistance]);

  // ── Suggestion search ─────────────────────────────────────────────────────
  const fetchSuggestions = useCallback((value: string) => {
    if (suggestionTimer.current) clearTimeout(suggestionTimer.current);
    if (value.trim().length < 2) { setSuggestions([]); return; }
    suggestionTimer.current = setTimeout(async () => {
      try {
        const token = import.meta.env.VITE_MAPBOX_TOKEN as string;
        const res = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(value.trim())}.json?access_token=${token}&types=address,place,poi&limit=5&country=ca`,
        );
        if (!res.ok) return;
        const data = await res.json();
        setSuggestions(data.features ?? []);
      } catch { /* ignore */ }
    }, 280);
  }, []);

  // ── Destination text input — only updates text and fetches suggestions ───────
  // Routes are ONLY fetched when the user explicitly selects a suggestion.
  const handleDestinationInput = useCallback((value: string) => {
    setDestinationText(value);
    setDestSelected(false);
    setDestination(value || null);
    setRouteCoords(null);
    setNavSteps(null);
    setDestinationCoords(null);
    destCoordsRef.current = null;
    setRouteDistance(null);
    setRouteDuration(null);
  }, [setDestination, setRouteCoords, setNavSteps, setDestinationCoords]);

  // ── Suggestion select — the only place that triggers a route fetch ───────────
  const handleSuggestionSelect = useCallback((s: Suggestion) => {
    if (suggestionTimer.current) clearTimeout(suggestionTimer.current);
    setSuggestions([]);
    setDestinationText(s.place_name);
    setDestination(s.place_name);
    setRouteCoords(null);
    setNavSteps(null);
    destCoordsRef.current = s.center; // [lng, lat]
    setDestinationCoords(s.center);
    setDestSelected(true);
    setRouteDistance(null);
    setRouteDuration(null);

    const dest = s.center;
    if (locRef.current) {
      fetchRoute([locRef.current.lng, locRef.current.lat], dest);
    } else {
      // GPS hasn't delivered a fix yet — do a one-shot lookup
      navigator.geolocation?.getCurrentPosition(
        (pos) => {
          const from: [number, number] = [pos.coords.longitude, pos.coords.latitude];
          const ll: LatLng = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          locRef.current = ll;
          setCurrentLoc(ll);
          fetchRoute(from, dest);
        },
        () => toast.error('Enable location to see your route.'),
        { enableHighAccuracy: true, timeout: 8000 },
      );
    }
  }, [setDestination, setRouteCoords, setNavSteps, setDestinationCoords, fetchRoute]);

  // ── Clear destination ─────────────────────────────────────────────────────
  const clearDestination = useCallback(() => {
    setDestinationText('');
    setDestSelected(false);
    setDestination(null);
    setRouteCoords(null);
    setNavSteps(null);
    setDestinationCoords(null);
    destCoordsRef.current = null;
    setRouteDistance(null);
    setRouteDuration(null);
    setSuggestions([]);
  }, [setDestination, setRouteCoords, setNavSteps, setDestinationCoords]);

  // ── Check-in ──────────────────────────────────────────────────────────────
  const { checkInSecondsLeft, reset: resetCheckIn } = useCheckIn(
    isActive,
    () => { setShowCheckIn(true); setEscalationStage(1); },
  );

  const handleSafe = () => {
    setShowCheckIn(false);
    setEscalationStage(0);
    resetCheckIn();
    toast.success("Great, glad you're safe.");
  };

  // ── Start walk ────────────────────────────────────────────────────────────
  const handleStart = async () => {
    if (!user) return;
    const { data: session, error } = await supabase
      .from('walk_sessions')
      .insert({ user_id: user.id, destination: destinationText || null })
      .select()
      .single();
    if (error || !session) { toast.error("Couldn't start walk. Try again."); return; }
    setSuggestions([]);
    startWalk(session.id, session.share_token);
    startTracking();
    setFollowUser(true);
    setSheetCollapsed(false);
    // Fetch route if destination already set
    if (destCoordsRef.current && locRef.current) {
      fetchRoute([locRef.current.lng, locRef.current.lat], destCoordsRef.current);
    }
    stats.refetch();
  };

  // ── End walk ──────────────────────────────────────────────────────────────
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
    setCurrentLoc(null);
    setDestinationText('');
    setDestSelected(false);
    setRouteDistance(null);
    setRouteDuration(null);
    locRef.current = null;
    destCoordsRef.current = null;
    setFollowUser(true);
    setSheetCollapsed(false);
    const dist = (walk.distanceMeters / 1000).toFixed(1);
    const secs = walk.startedAt ? differenceInSeconds(new Date(), new Date(walk.startedAt)) : 0;
    const dur = formatDuration(intervalToDuration({ start: 0, end: secs * 1000 }), { format: ['hours', 'minutes'] });
    toast.success(`Walk saved · ${dist} km${dur ? ` · ${dur}` : ''}`);
    stats.refetch();
  };

  // ── SOS ───────────────────────────────────────────────────────────────────
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
      await supabase.functions.invoke('send-alert', { body: { contacts: list, message } });
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
    if (walk.sessionId) supabase.from('walk_sessions').update({ status: 'active' }).eq('id', walk.sessionId);
    toast.success("Glad you're safe. Emergency cancelled.");
  };

  // ── Derived values ────────────────────────────────────────────────────────
  const initials = profile?.avatar_initials ?? profile?.full_name?.slice(0, 2).toUpperCase() ?? 'SW';
  const checkInMax = 90;
  const checkInPct = Math.max(0, Math.min(100, (checkInSecondsLeft / checkInMax) * 100));
  const checkInMin = Math.floor(checkInSecondsLeft / 60);
  const checkInSec = checkInSecondsLeft % 60;

  const currentStep    = navSteps?.[navStepIndex];
  const activeSheetH   = sheetCollapsed ? 54 : 232;
  const sheetHeight    = isActive ? activeSheetH : (destSelected && routeCoords ? 188 : 168);
  const recenterBottom = sheetHeight + 12;

  return (
    <>
      {showCheckIn && !showSosOverlay && <CheckInOverlay onSafe={handleSafe} />}
      {showSosOverlay && <SosOverlay onCancel={handleCancelSOS} contacts={sosContacts} />}

      <div className="relative w-full bg-[#EEF1F6]" style={{ height: 'calc(100vh - 78px)' }}>

        {/* ── Map (full background) ─────────────────────────────────────── */}
        <div className="absolute inset-0">
          <MapView
            location={currentLoc}
            heading={location?.bearing}
            routeCoords={routeCoords}
            destinationCoords={destinationCoords}
            isActive={isActive}
            followUser={followUser}
            onUserInteract={() => setFollowUser(false)}
          />
        </div>

        {/* ── Active walk: top status bar ───────────────────────────────── */}
        {isActive && (
          <div className="absolute top-0 left-0 right-0 z-20">
            {/* Walk status row */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-white/96 backdrop-blur-sm border-b border-[#E0E0E8]">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#3B6D11] animate-pulse" />
                <span className="text-[13px] font-semibold text-[#1A1A28]">Walk in progress</span>
              </div>
              <span className="text-[13px] font-bold text-[#1A1A28] tabular-nums">{timer}</span>
            </div>

            {/* Direction banner */}
            {isRerouting ? (
              <div className="mx-3 mt-2 bg-[#E8A020] rounded-[16px] px-4 py-3 flex items-center gap-3 shadow-[0_4px_16px_rgba(0,0,0,0.14)]">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 text-[20px]">↻</div>
                <div>
                  <div className="text-white font-bold text-[15px]">Rerouting…</div>
                  <div className="text-white/80 text-[12px]">Finding a new route</div>
                </div>
              </div>
            ) : isOffRoute ? (
              <div className="mx-3 mt-2 bg-[#E24B4A] rounded-[16px] px-4 py-3 flex items-center gap-3 shadow-[0_4px_16px_rgba(0,0,0,0.14)]">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 text-[20px]">⚠</div>
                <div>
                  <div className="text-white font-bold text-[15px]">Off route</div>
                  <div className="text-white/80 text-[12px]">Calculating new route…</div>
                </div>
              </div>
            ) : currentStep ? (
              <div
                className="mx-3 mt-2 bg-white rounded-[16px] px-4 py-3 flex items-center gap-3 shadow-[0_4px_16px_rgba(0,0,0,0.12)]"
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-[22px] font-bold"
                  style={{ background: '#534AB7', color: 'white' }}
                >
                  {maneuverIcon(currentStep.maneuverType, currentStep.maneuverModifier)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[15px] font-bold text-[#1A1A28] truncate">{currentStep.instruction}</div>
                  {navSteps && navStepIndex < navSteps.length - 1 && navSteps[navStepIndex + 1] && (
                    <div className="text-[12px] text-[#6F6F84] mt-0.5">
                      Then: {navSteps[navStepIndex + 1].instruction}
                    </div>
                  )}
                </div>
                {currentStep.distance > 0 && (
                  <div className="text-right flex-shrink-0">
                    <div className="text-[14px] font-bold text-[#534AB7]">{formatNavDistance(currentStep.distance)}</div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        )}

        {/* ── Idle: top chrome ──────────────────────────────────────────── */}
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

        {/* ── Recenter FAB ──────────────────────────────────────────────── */}
        {!followUser && (
          <div
            className="absolute right-4 z-20 transition-all"
            style={{ bottom: recenterBottom }}
          >
            <RecenterButton onPress={() => setFollowUser(true)} />
          </div>
        )}

        {/* ── Bottom sheet ──────────────────────────────────────────────── */}
        <div
          className="absolute bottom-0 left-0 right-0 bg-white z-20 transition-all duration-300"
          style={{
            height: sheetHeight,
            borderRadius: '20px 20px 0 0',
            boxShadow: '0 -4px 24px rgba(0,0,0,0.10)',
          }}
        >
          {/* Drag handle — active during walk, tap/drag to collapse/expand */}
          <div
            className="flex justify-center pt-2.5 pb-1 cursor-grab active:cursor-grabbing select-none"
            onPointerDown={(e) => {
              if (!isActive) return;
              dragRef.current = { startY: e.clientY, collapsed: sheetCollapsed };
              (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
            }}
            onPointerMove={() => {
              // no-op — we snap on release only
            }}
            onPointerUp={(e) => {
              if (!dragRef.current || !isActive) return;
              const dy = dragRef.current.startY - e.clientY; // positive = dragged up
              if (Math.abs(dy) < 8) {
                // tap → toggle
                setSheetCollapsed((c) => !c);
              } else if (dy < -24) {
                // dragged down → collapse
                setSheetCollapsed(true);
              } else if (dy > 24) {
                // dragged up → expand
                setSheetCollapsed(false);
              }
              dragRef.current = null;
            }}
            onPointerCancel={() => { dragRef.current = null; }}
          >
            <div className="w-10 h-1 bg-[#D5D5DD] rounded-full" />
          </div>

          {/* Collapsed active walk peek */}
          {isActive && sheetCollapsed && (
            <div className="flex items-center justify-between px-5 pt-0.5">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#3B6D11] animate-pulse" />
                <span className="text-[13px] font-bold text-[#1A1A28] tabular-nums">{timer}</span>
                {navRemainingMeters > 0 && (
                  <span className="text-[12px] text-[#6F6F84]">· {formatNavDistance(navRemainingMeters)} left</span>
                )}
              </div>
              <span className="text-[11px] text-[#888899] font-medium">Swipe up to expand</span>
            </div>
          )}

          {!isActive ? (
            /* ── IDLE SHEET ─────────────────────────────────────────── */
            <div className="px-4 pt-3 flex flex-col gap-2.5">

              {destSelected && destinationCoords ? (
                /* Compact destination chip */
                <div className="flex items-center gap-2 bg-[#F0F0F4] rounded-[14px] px-3.5" style={{ height: 50 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#534AB7" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>
                  </svg>
                  <span className="flex-1 text-[14px] font-semibold text-[#1A1A28] truncate">{destinationText}</span>
                  {routeLoading && (
                    <div className="w-4 h-4 border-2 border-[#534AB7]/30 border-t-[#534AB7] rounded-full animate-spin flex-shrink-0" />
                  )}
                  {!routeLoading && routeDistance && routeDuration && (
                    <span className="text-[12px] text-[#6F6F84] font-medium flex-shrink-0">
                      {formatNavDistance(routeDistance)} · {formatNavDuration(routeDuration)}
                    </span>
                  )}
                  <button
                    onClick={clearDestination}
                    className="w-7 h-7 rounded-full bg-[#E0E0E8] flex items-center justify-center flex-shrink-0 hover:bg-[#D0D0D8]"
                    aria-label="Clear destination"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2.5" strokeLinecap="round">
                      <path d="M18 6 6 18M6 6l12 12"/>
                    </svg>
                  </button>
                </div>
              ) : (
                /* Search bar + suggestions */
                <div className="relative">
                  <div className="flex items-center gap-2.5 bg-[#F0F0F4] rounded-[14px] px-3.5" style={{ height: 50 }}>
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#888899" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>
                    </svg>
                    <input
                      type="text"
                      placeholder="Where are you going?"
                      value={destinationText}
                      onChange={(e) => { handleDestinationInput(e.target.value); fetchSuggestions(e.target.value); }}
                      onBlur={() => setTimeout(() => setSuggestions([]), 150)}
                      className="flex-1 text-[15px] text-[#1A1A28] placeholder:text-[#888899] bg-transparent outline-none"
                    />
                    {destinationText.length > 0 && (
                      <button onClick={() => { handleDestinationInput(''); setSuggestions([]); }} aria-label="Clear">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#888899" strokeWidth="2.5" strokeLinecap="round">
                          <path d="M18 6 6 18M6 6l12 12"/>
                        </svg>
                      </button>
                    )}
                  </div>

                  {suggestions.length > 0 && (
                    <div className="absolute left-0 right-0 bottom-full mb-2 bg-white rounded-[14px] border border-[#E0E0E8] overflow-hidden z-10 shadow-[0_-8px_24px_rgba(0,0,0,0.10)]">
                      {suggestions.map((s, i) => {
                        const sub = s.place_name.startsWith(s.text) ? s.place_name.slice(s.text.length + 2) : s.place_name;
                        return (
                          <button
                            key={s.id}
                            className={`w-full flex items-start gap-3 px-3.5 py-3 text-left hover:bg-[#F8F8FC] active:bg-[#F0F0F4] ${i < suggestions.length - 1 ? 'border-b border-[#F0F0F4]' : ''}`}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => handleSuggestionSelect(s)}
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#888899" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
                              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>
                            </svg>
                            <div className="flex-1 min-w-0">
                              <div className="text-[14px] font-semibold text-[#1A1A28] truncate">{s.text}</div>
                              {sub && <div className="text-[11px] text-[#888899] mt-0.5 truncate">{sub}</div>}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Start walk button */}
              <button
                onClick={handleStart}
                className="w-full h-[50px] rounded-[14px] text-white font-bold text-[15px] transition-colors active:scale-[0.98] flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg,#7F77DD,#534AB7)',
                  boxShadow: '0 4px 16px rgba(127,119,221,0.38)',
                }}
              >
                Start walk
              </button>

              {/* Quick stats row */}
              <div className="flex gap-2">
                {[
                  { label: 'Walks this month', value: stats.data?.walks ?? '—' },
                  { label: 'Contacts',          value: stats.data?.contacts ?? '—' },
                  { label: 'Status',            value: 'Safe', color: '#3B6D11' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="flex-1 bg-[#F6F6FA] rounded-[12px] px-2.5 py-2">
                    <div className="text-[10px] text-[#888899] font-medium">{label}</div>
                    <div className="text-[16px] font-bold tracking-[-0.2px]" style={{ color: color ?? '#1A1A28' }}>{value}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* ── ACTIVE WALK SHEET ──────────────────────────────────── */
            <div className={`flex flex-col gap-2.5 px-4 pt-2 ${sheetCollapsed ? 'invisible' : ''}`}>

              {/* Check-in countdown */}
              <div className="bg-[#EEEDFE] rounded-[14px] px-4 py-2.5">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[12px] font-semibold text-[#534AB7]">Next check-in</span>
                  <span className="text-[13px] font-bold text-[#534AB7] tabular-nums" aria-live="polite">
                    {checkInMin}:{String(checkInSec).padStart(2, '0')}
                  </span>
                </div>
                <div className="h-1.5 bg-[#DCD9FB] rounded-full overflow-hidden">
                  <div className="h-full bg-[#7F77DD] rounded-full transition-all duration-1000" style={{ width: `${checkInPct}%` }} />
                </div>
              </div>

              {/* Distance / ETA / Time stats */}
              <div className="flex gap-2">
                {[
                  { label: 'Time',      value: timer },
                  { label: 'Remaining', value: navRemainingMeters > 0 ? formatNavDistance(navRemainingMeters) : `${(walk.distanceMeters / 1000).toFixed(2)} km` },
                  { label: 'ETA',       value: navRemainingSeconds > 0 ? formatNavDuration(navRemainingSeconds) : '—' },
                ].map(({ label, value }) => (
                  <div key={label} className="flex-1 bg-[#F6F6FA] rounded-[12px] px-2.5 py-2">
                    <div className="text-[10px] text-[#888899] font-medium">{label}</div>
                    <div className="text-[13px] font-bold text-[#1A1A28] tabular-nums tracking-[-0.2px]">{value}</div>
                  </div>
                ))}
              </div>

              {/* SOS + End */}
              <div className="flex items-center gap-3">
                <SosButton onActivated={handleSOS} />
                <div className="flex-1">
                  <button
                    onClick={() => setShowEndConfirm(true)}
                    className="w-full h-[44px] rounded-[14px] bg-[#EEEDFE] text-[#534AB7] border border-[#DCD9FB] font-semibold text-[14px] flex items-center justify-center"
                  >
                    End walk
                  </button>
                  <p className="text-[10px] text-[#888899] text-center mt-1">Hold SOS 3 s to alert contacts</p>
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
