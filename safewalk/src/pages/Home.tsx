import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { differenceInSeconds, formatDuration, intervalToDuration } from 'date-fns';
import toast from 'react-hot-toast';
import { useQuery } from '@tanstack/react-query';
import { MapPin } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { useWalkStore } from '../store/walkStore';
import { useGeolocation } from '../hooks/useGeolocation';
import { useCheckIn } from '../hooks/useCheckIn';
import { geocodeAddress, getWalkingRoute } from '../services/routing';
import { haversineDistance, formatEta } from '../services/eta';
import { MapView } from '../components/map/MapView';
import { CheckInBar } from '../components/walk/CheckInBar';
import { SosButton } from '../components/walk/SosButton';
import { EscalationLadder } from '../components/sos/EscalationLadder';
import { Avatar } from '../components/ui/Avatar';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import type { LatLng } from '../types';

// ── Stats query ──────────────────────────────────────────────────────────────
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

// ── Session timer ────────────────────────────────────────────────────────────
function useSessionTimer(startedAt: Date | null) {
  const [elapsed, setElapsed] = useState('0:00:00');
  useEffect(() => {
    if (!startedAt) return;
    const id = setInterval(() => {
      const secs = differenceInSeconds(new Date(), startedAt);
      const h = Math.floor(secs / 3600);
      const m = Math.floor((secs % 3600) / 60);
      const s = secs % 60;
      setElapsed(`${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
    }, 1000);
    return () => clearInterval(id);
  }, [startedAt]);
  return elapsed;
}

// ── Check-in overlay ─────────────────────────────────────────────────────────
function CheckInOverlay({ onSafe, escalationStage }: { onSafe: () => void; escalationStage: number }) {
  const [count, setCount] = useState(30);
  useEffect(() => {
    const id = setInterval(() => setCount((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col">
      {/* Amber status bar */}
      <div className="h-[22px] bg-[#FAEEDA] flex items-center px-4">
        <span className="text-[9px] font-bold text-[#854F0B]">Check-in needed</span>
      </div>

      {/* Top section */}
      <div className="bg-[#FAEEDA] px-6 py-6 flex flex-col items-center gap-3">
        <h2 className="text-[18px] font-bold text-[#1A1A28]">Are you okay?</h2>
        <p className="text-[11px] text-[#854F0B] text-center leading-relaxed">
          We haven't heard from you. Tap to confirm you're safe.
        </p>
        <p className="text-[32px] font-bold text-[#854F0B] tabular-nums" aria-live="polite">
          0:{String(count).padStart(2, '0')}
        </p>
        <button
          onClick={onSafe}
          className="w-full py-3 bg-[#E24B4A] text-white text-[12px] font-bold rounded-[50px] min-h-[48px]"
        >
          I'm okay
        </button>
        <p className="text-[8px] text-[#854F0B]">Your contacts will be alerted if no response</p>
      </div>

      {/* Escalation ladder */}
      <div className="flex-1 bg-white px-6 py-4 overflow-y-auto">
        <div className="border-t border-[#E0E0E8] pt-4">
          <p className="text-[10px] font-bold text-[#1A1A28] mb-3">Escalation ladder</p>
          <EscalationLadder activeStage={escalationStage as 1} />
        </div>
      </div>
    </div>
  );
}

// ── SOS overlay ──────────────────────────────────────────────────────────────
function SosOverlay({ onCancel, escalationStage }: { onCancel: () => void; escalationStage: number }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col">
      <div className="h-[22px] bg-[#FCEBEB] flex items-center px-4">
        <span className="text-[9px] font-bold text-[#A32D2D]">EMERGENCY ACTIVE</span>
      </div>
      <div className="bg-[#FCEBEB] px-6 py-6 flex flex-col items-center gap-3">
        {/* SOS circle */}
        <div className="relative flex items-center justify-center" style={{ width: 104, height: 104 }}>
          <div className="absolute w-[104px] h-[104px] rounded-full border-[3px] border-[#E24B4A]/30" />
          <div className="absolute w-[88px] h-[88px] rounded-full border-[3px] border-[#E24B4A]/50" />
          <div className="w-[72px] h-[72px] rounded-full bg-[#E24B4A] flex items-center justify-center z-10"
            style={{ boxShadow: '0 0 0 0 #E24B4A44, 0 4px 24px rgba(226,75,74,0.5)' }}>
            <span className="text-white font-bold text-[16px]">SOS</span>
          </div>
        </div>
        <p className="text-[12px] font-bold text-[#A32D2D]">Emergency activated</p>
        <p className="text-[9px] text-[#888899]">Alerting your contacts now</p>
        <button
          onClick={onCancel}
          className="w-full py-3 bg-[#EAF3DE] text-[#3B6D11] text-[11px] font-bold rounded-[50px] min-h-[48px]"
        >
          I'm okay — Cancel SOS
        </button>
      </div>
      <div className="flex-1 bg-white px-6 py-4 overflow-y-auto">
        <div className="border-t border-[#E0E0E8] pt-4">
          <p className="text-[10px] font-bold text-[#1A1A28] mb-3">Escalation ladder</p>
          <EscalationLadder activeStage={escalationStage as 2} />
        </div>
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

  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [showCheckIn, setShowCheckIn]       = useState(false);
  const [showSosOverlay, setShowSosOverlay] = useState(false);
  const [destinationText, setDestinationText] = useState(walk.destination ?? '');
  const [eta, setEta]                         = useState<string | null>(
    walk.distanceMeters > 0 ? formatEta(walk.distanceMeters) : null
  );
  const [currentLoc, setCurrentLoc]           = useState<LatLng | null>(walk.currentLocation);

  const geocodeTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  // destCoordsRef mirrors the store's destinationCoords for use in callbacks
  const destCoordsRef = useRef<[number, number] | null>(destinationCoords);
  const routeLoaded   = useRef(!!routeCoords);
  const locRef        = useRef<LatLng | null>(null);
  const isActiveRef   = useRef(false);

  isActiveRef.current = !!walk.sessionId;

  // Keep ref in sync with store (survives re-renders without stale closures)
  useEffect(() => {
    destCoordsRef.current = destinationCoords;
  }, [destinationCoords]);

  // Re-start GPS if Home remounts during an active walk (user switched tabs)
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

    // Fetch route on first GPS fix (skip if already loaded and stored)
    if (destCoordsRef.current && !routeLoaded.current) {
      routeLoaded.current = true;
      getWalkingRoute([ll.lat, ll.lng], [destCoordsRef.current[1], destCoordsRef.current[0]]).then((r) => {
        if (r) setRouteCoords(r.waypoints);
      });
    }

    // Push ping to Supabase (fire-and-forget)
    if (walk.sessionId) {
      supabase.from('location_pings').insert({
        session_id: walk.sessionId,
        user_id:    user?.id,
        lat:        location.lat,
        lng:        location.lng,
        bearing:    location.bearing,
        speed:      location.speed,
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
      // coords = [lat, lng] → mapbox wants [lng, lat]
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

  // Check-in hook
  const { checkInSecondsLeft, reset: resetCheckIn } = useCheckIn(
    !!walk.sessionId,
    () => {
      setShowCheckIn(true);
      setEscalationStage(1);
    }
  );

  const handleSafe = () => {
    setShowCheckIn(false);
    setEscalationStage(0);
    resetCheckIn();
    toast.success("Great, glad you're safe. Check-in reset.");
  };

  // Start walk
  const handleStart = async () => {
    if (!user) return;
    const { data: session, error } = await supabase.from('walk_sessions').insert({
      user_id: user.id,
      destination: destinationText || null,
    }).select().single();
    if (error || !session) { toast.error("Couldn't start walk. Try again."); return; }
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
    endWalk(); // clears routeCoords + destinationCoords in store
    setEta(null);
    setCurrentLoc(null);
    setDestinationText('');
    locRef.current = null;
    destCoordsRef.current = null;
    routeLoaded.current = false;
    const dist = (walk.distanceMeters / 1000).toFixed(1);
    const secs = walk.startedAt ? differenceInSeconds(new Date(), new Date(walk.startedAt)) : 0;
    const dur = formatDuration(intervalToDuration({ start: 0, end: secs * 1000 }), { format: ['hours', 'minutes'] });
    toast.success(`Walk saved. Walked ${dist} km${dur ? ` in ${dur}` : ''}.`);
    stats.refetch();
  };

  // SOS
  const handleSOS = async () => {
    if (!user || !walk.sessionId) return;
    setShowSosOverlay(true);
    setEscalationStage(2);
    setStatus('sos_triggered');

    await supabase.from('walk_sessions').update({ status: 'sos_triggered' }).eq('id', walk.sessionId);

    // Fetch contacts and send alerts
    const { data: contacts } = await supabase
      .from('trusted_contacts')
      .select('full_name, phone')
      .eq('user_id', user.id);

    if (contacts?.length) {
      const shareUrl = walk.shareToken
        ? `${window.location.origin}/track/${walk.shareToken}`
        : null;
      const name = profile?.full_name || user.email || 'Someone';
      const message = shareUrl
        ? `EMERGENCY: ${name} has triggered an SOS on SafeWalk. Track their live location: ${shareUrl}`
        : `EMERGENCY: ${name} has triggered an SOS on SafeWalk. Please check on them immediately.`;

      await supabase.functions.invoke('send-alert', {
        body: {
          contacts: contacts.map((c) => ({ name: c.full_name, phone: c.phone })),
          message,
        },
      });
    } else {
      toast.error('No trusted contacts set up. Add contacts so they can be alerted.');
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
    toast.success("Great, glad you're safe. Check-in reset.");
  };

  const isActive = !!walk.sessionId;
  const initials = profile?.avatar_initials ?? profile?.full_name?.slice(0, 2).toUpperCase() ?? 'SW';
  const sheetHeight = isActive ? 280 : 220;

  return (
    <>
      {/* Overlays */}
      {showCheckIn && !showSosOverlay && (
        <CheckInOverlay onSafe={handleSafe} escalationStage={walk.escalationStage} />
      )}
      {showSosOverlay && (
        <SosOverlay onCancel={handleCancelSOS} escalationStage={walk.escalationStage} />
      )}

      {/* Full-viewport layout */}
      <div className="relative w-full bg-[#F0F0F4]" style={{ height: 'calc(100vh - 52px)' }}>

        {/* Map fills entire background */}
        <div className="absolute inset-0">
          <MapView
            location={currentLoc}
            routeCoords={routeCoords}
            destinationCoords={destinationCoords}
            isActive={isActive}
          />
        </div>

        {/* Top gradient overlay */}
        <div className="absolute top-0 left-0 right-0 h-[60px] bg-gradient-to-b from-white/90 to-transparent pointer-events-none z-10" />

        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 pt-3 z-20 pointer-events-none">
          <div className="flex items-center gap-1.5 pointer-events-auto">
            <div className="w-[38px] h-[16px] bg-[#7F77DD] rounded-[8px] flex items-center justify-center">
              <span className="text-white font-bold text-[9px]">SW</span>
            </div>
            <span className="text-[11px] font-bold text-[#1A1A28]">SafeWalk</span>
          </div>
          <button
            className="pointer-events-auto"
            onClick={() => navigate('/settings')}
            aria-label="Go to settings"
          >
            <Avatar initials={initials} size="sm" />
          </button>
        </div>

        {/* Status bar (active walk) */}
        {isActive && (
          <div className="absolute top-0 left-0 right-0 h-[22px] bg-[#3C3489] flex items-center justify-between px-4 z-20">
            <span className="text-white text-[9px]">Walk active</span>
            <span className="text-white text-[9px] font-bold">{timer}</span>
          </div>
        )}

        {/* Bottom sheet */}
        <div
          className="absolute bottom-0 left-0 right-0 bg-white border-t border-[#E0E0E8] transition-all duration-300 ease-out z-20"
          style={{ height: sheetHeight, boxShadow: '0 -4px 24px rgba(0,0,0,0.10)' }}
        >
          <div className="pt-3 pb-1 flex justify-center">
            <div className="sheet-handle" />
          </div>

          {!isActive ? (
            /* ── Idle sheet ───────────────────────────────────────────── */
            <div className="px-4 flex flex-col gap-3">
              {/* Location row / destination input */}
              <div className="flex items-center gap-2 h-[28px] bg-white border border-[#E0E0E8] rounded-[8px] px-2">
                <MapPin size={10} className="text-[#7F77DD] flex-shrink-0" />
                <input
                  type="text"
                  placeholder="Where are you going?"
                  value={destinationText}
                  onChange={(e) => handleDestination(e.target.value)}
                  className="flex-1 text-[11px] text-[#1A1A28] placeholder:text-[#888899] bg-transparent outline-none"
                />
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Walks this month', value: stats.data?.walks ?? '—', color: '#7F77DD' },
                  { label: 'Contacts', value: stats.data?.contacts ?? '—', color: (stats.data?.contacts ?? 1) === 0 ? '#854F0B' : '#7F77DD' },
                  { label: 'Status', value: 'Safe', color: '#3B6D11' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="bg-[#F0F0F4] rounded-[8px] p-2 flex flex-col items-center gap-0.5">
                    <span className="text-[14px] font-bold" style={{ color }}>{value}</span>
                    <span className="text-[7px] text-[#888899] text-center">{label}</span>
                  </div>
                ))}
              </div>

              <Button fullWidth size="lg" onClick={handleStart}>Start Walk</Button>
            </div>
          ) : (
            /* ── Active walk sheet ────────────────────────────────────── */
            <div className="flex flex-col gap-0">
              <CheckInBar secondsLeft={checkInSecondsLeft} />

              <div className="px-4 py-2 flex items-start justify-between">
                {/* Walk timer + distance */}
                <div>
                  <p className="text-[18px] font-bold text-[#1A1A28] tabular-nums">{timer}</p>
                  <p className="text-[8px] text-[#888899]">
                    {(walk.distanceMeters / 1000).toFixed(2)} km walked
                  </p>
                </div>
                {/* Destination + status */}
                <div className="text-right">
                  <p className="text-[10px] font-bold text-[#1A1A28] truncate max-w-[120px]">
                    {walk.destination ?? 'No destination'}
                  </p>
                  {eta && <p className="text-[8px] text-[#888899]">{eta}</p>}
                  <Badge variant="success" className="mt-1">All good</Badge>
                </div>
              </div>

              <div className="px-4 flex items-end gap-4 pb-2">
                <SosButton onActivated={handleSOS} />
                <div className="flex-1 flex flex-col gap-1.5">
                  <p className="text-[8px] text-[#888899] leading-relaxed">
                    Press and hold 3 seconds to activate emergency
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowEndConfirm(true)}
                  >
                    End walk
                  </Button>
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
