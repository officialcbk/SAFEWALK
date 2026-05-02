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
import { formatNavDistance, formatNavDuration, humanizeInstruction } from '../services/navigation';
import { getNearbyPlaces } from '../services/safePlaces';
import type { SafePlace } from '../services/safePlaces';
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

// Sheet snap constants
const IDLE_PEEK   = 72;
const IDLE_OPEN   = 192;
const ACTIVE_MINI = 54;
const ACTIVE_FULL = 316;

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

// ── Maneuver SVG icons (Google Maps-style directional arrows) ─────────────────
function ManeuverSvg({ type, modifier }: { type: string; modifier?: string }) {
  const props = { width: 28, height: 28, viewBox: '0 0 24 24', fill: 'none', stroke: 'white', strokeWidth: '2.5', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

  if (type === 'arrive') return (
    <svg {...props}>
      <path d="M12 2a7 7 0 0 1 7 7c0 4.9-7 13-7 13S5 13.9 5 9a7 7 0 0 1 7-7z"/>
      <circle cx="12" cy="9" r="2.5" fill="white" stroke="none"/>
    </svg>
  );

  if (type === 'roundabout' || type === 'rotary') return (
    <svg {...props}>
      <path d="M21.5 2v6h-6"/><path d="M21.34 15.57a10 10 0 1 1-.57-8.38"/>
    </svg>
  );

  if (type === 'turn' || type === 'end of road') {
    if (modifier === 'uturn') return (
      <svg {...props}>
        <path d="M9 14 4 9l5-5"/><path d="M4 9h9a4 4 0 0 1 0 8H5"/>
      </svg>
    );
    if (modifier === 'sharp left' || modifier === 'left') return (
      <svg {...props}>
        <polyline points="9 14 4 9 9 4"/>
        <path d="M20 20v-7a4 4 0 0 0-4-4H4"/>
      </svg>
    );
    if (modifier === 'slight left') return (
      <svg {...props}>
        <path d="M5 19 12 5l7 14"/><path d="M12 5v14"/>
        <path d="m8 11 4-6 4 6" strokeWidth="0"/>
        <polyline points="8 15 5 19 11 19"/>
      </svg>
    );
    if (modifier === 'sharp right' || modifier === 'right') return (
      <svg {...props}>
        <polyline points="15 14 20 9 15 4"/>
        <path d="M4 20v-7a4 4 0 0 1 4-4h12"/>
      </svg>
    );
    if (modifier === 'slight right') return (
      <svg {...props}>
        <polyline points="16 15 19 19 13 19"/>
        <path d="M4 19 12 5l7 14"/>
        <path d="M12 5v14"/>
      </svg>
    );
  }

  // straight / depart / continue / default
  return (
    <svg {...props}>
      <line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>
    </svg>
  );
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
          className="w-full h-[52px] rounded-[14px] bg-white/20 text-white font-semibold text-[16px] border border-white/30 active:scale-[0.98] flex items-center justify-center"
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

// ── Arrival prompt ────────────────────────────────────────────────────────────
function ArrivalPrompt({
  destination,
  bottomOffset,
  onEnd,
  onDismiss,
}: {
  destination: string | null;
  bottomOffset: number;
  onEnd: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="absolute left-0 right-0 z-20 px-4" style={{ bottom: bottomOffset }}>
      <div className="bg-white rounded-[18px] p-4 shadow-[0_-4px_20px_rgba(0,0,0,0.16)]">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#E8F5E9' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2E7D32" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5"/>
            </svg>
          </div>
          <div className="min-w-0">
            <div className="text-[15px] font-bold text-[#1A1A28]">You've nearly arrived!</div>
            {destination && <div className="text-[12px] text-[#888899] truncate">{destination}</div>}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onDismiss}
            className="flex-1 h-10 rounded-[12px] bg-[#F0F0F4] text-[13px] font-semibold text-[#888899] flex items-center justify-center"
          >
            Keep walking
          </button>
          <button
            onClick={onEnd}
            className="flex-1 h-10 rounded-[12px] text-[13px] font-semibold text-white flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,#7F77DD,#534AB7)' }}
          >
            End walk
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Discreet help menu ────────────────────────────────────────────────────────
function DiscreetHelpMenu({
  shareUrl,
  onClose,
  onSOS,
  onFeelingUneasy,
  onShowSafePlaces,
}: {
  shareUrl: string | null;
  onClose: () => void;
  onSOS: () => void;
  onFeelingUneasy: () => void;
  onShowSafePlaces: () => void;
}) {
  const handleShare = () => {
    if (!shareUrl) { toast.error('No share link available yet.'); return; }
    if (navigator.share) {
      navigator.share({ title: 'Track my walk on SafeWalk', url: shareUrl }).catch(() => {});
    } else {
      navigator.clipboard.writeText(shareUrl)
        .then(() => toast.success('Link copied!'))
        .catch(() => toast.error('Could not copy link.'));
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex flex-col" style={{ maxWidth: 430, margin: '0 auto' }}>
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative mt-auto z-10 bg-white rounded-[24px_24px_0_0] px-5 pb-8 pt-2 shadow-[0_-10px_40px_rgba(0,0,0,0.18)]">
        <div className="w-11 h-1 bg-[#D5D5DD] rounded-full mx-auto mt-2 mb-4" />
        <h2 className="text-[18px] font-bold text-[#1A1A28] mb-0.5">Stay safe</h2>
        <p className="text-[12px] text-[#888899] mb-4">These options are discreet — no one will see your screen.</p>
        <div className="flex flex-col gap-2">

          {/* I feel uneasy — primary warm action */}
          <button
            onClick={() => { onClose(); onFeelingUneasy(); }}
            className="flex items-center gap-3.5 w-full p-3.5 rounded-[14px] text-left"
            style={{ background: '#FFF8EC', border: '1px solid #F5DFB0' }}
          >
            <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(234,163,44,0.15)' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#B07A00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 8v4"/><path d="M12 16h.01"/>
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[14px] font-semibold text-[#7A5400]">I feel uneasy</div>
              <div className="text-[11px] text-[#B07A00]">Show safe places, stay aware</div>
            </div>
          </button>

          <button
            onClick={() => { handleShare(); onClose(); }}
            className="flex items-center gap-3.5 w-full p-3.5 rounded-[14px] bg-[#F6F6FA] border border-[#E0E0E8] text-left"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#534AB7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
              <path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/>
            </svg>
            <div className="flex-1 min-w-0">
              <div className="text-[14px] font-semibold text-[#1A1A28]">Share my walk</div>
              <div className="text-[11px] text-[#888899]">Send your live location link</div>
            </div>
          </button>

          <button
            onClick={() => { onClose(); onShowSafePlaces(); }}
            className="flex items-center gap-3.5 w-full p-3.5 rounded-[14px] bg-[#F6F6FA] border border-[#E0E0E8] text-left"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2E7D32" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/>
            </svg>
            <div className="flex-1 min-w-0">
              <div className="text-[14px] font-semibold text-[#1A1A28]">Find a safe place</div>
              <div className="text-[11px] text-[#888899]">Police, hospitals, pharmacies nearby</div>
            </div>
          </button>

          <a
            href="tel:911" onClick={onClose}
            className="flex items-center gap-3.5 p-3.5 rounded-[14px] bg-[#FFF0F0] border border-[#F5C6C6] no-underline"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#A32D2D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3-8.6A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .3 2 .6 2.9a2 2 0 0 1-.5 2L8 9.8a16 16 0 0 0 6 6l1.2-1.2a2 2 0 0 1 2-.5c1 .3 2 .5 2.9.6a2 2 0 0 1 1.7 2Z"/>
            </svg>
            <div className="flex-1">
              <div className="text-[14px] font-semibold text-[#A32D2D]">Call emergency services</div>
              <div className="text-[11px] text-[#C54444]">Connects you to 911 directly</div>
            </div>
          </a>

          <button
            onClick={() => { onClose(); onSOS(); }}
            className="flex items-center gap-3.5 p-3.5 rounded-[14px] text-left"
            style={{ background: '#E24B4A' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/>
              <path d="M12 9v4"/><path d="M12 17h.01"/>
            </svg>
            <div className="flex-1">
              <div className="text-[14px] font-semibold text-white">Trigger SOS</div>
              <div className="text-[11px] text-white/80">Alerts all trusted contacts immediately</div>
            </div>
          </button>
        </div>
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
    nearDestination, setNearDestination,
  } = useWalkStore();
  const { location, startTracking, stopTracking } = useGeolocation();
  const stats = useHomeStats(user?.id);
  const timer = useSessionTimer(walk.startedAt ? new Date(walk.startedAt) : null);

  const isActive = !!walk.sessionId;
  useNavigation(isActive);

  // ── UI state ──────────────────────────────────────────────────────────────
  const [showEndConfirm, setShowEndConfirm]   = useState(false);
  const [showCheckIn, setShowCheckIn]         = useState(false);
  const [showSosOverlay, setShowSosOverlay]   = useState(false);
  const [sosContacts, setSosContacts]         = useState<Array<{ name: string; phone: string }>>([]);

  // Destination
  const [destinationText, setDestinationText] = useState(walk.destination ?? '');
  const [destSelected, setDestSelected]       = useState(!!walk.destination && !!destinationCoords);
  const [suggestions, setSuggestions]         = useState<Suggestion[]>([]);
  const [routeLoading, setRouteLoading]       = useState(false);
  const [routeDistance, setRouteDistance]     = useState<number | null>(null);
  const [routeDuration, setRouteDuration]     = useState<number | null>(null);

  // Map follow
  const [followUser, setFollowUser] = useState(true);

  // Sheet state
  // Active walk: collapsed (mini peek) vs expanded (full controls)
  const [sheetCollapsed, setSheetCollapsed] = useState(false);
  // Idle: peek vs open
  const [idleOpen, setIdleOpen] = useState(true);
  // Live drag height (null = not dragging, use snap height)
  const [dragHeight, setDragHeight] = useState<number | null>(null);

  // Safe places
  const [showSafePlaces, setShowSafePlaces]       = useState(false);
  const [safePlaces, setSafePlaces]               = useState<SafePlace[]>([]);
  const [safePlacesLoading, setSafePlacesLoading] = useState(false);

  // Help / arrival
  const [showHelpMenu, setShowHelpMenu]       = useState(false);
  const [arrivalDismissed, setArrivalDismissed] = useState(false);

  const [currentLoc, setCurrentLoc] = useState<LatLng | null>(walk.currentLocation);

  // Refs
  const suggestionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const destCoordsRef   = useRef<[number, number] | null>(destinationCoords);
  const locRef          = useRef<LatLng | null>(null);
  const isActiveRef     = useRef(false);
  isActiveRef.current   = isActive;

  // Drag ref: tracks pointer capture for the sheet handle
  const dragRef = useRef<{ startY: number; startH: number } | null>(null);

  useEffect(() => { destCoordsRef.current = destinationCoords; }, [destinationCoords]);

  // ── GPS always on ─────────────────────────────────────────────────────────
  useEffect(() => {
    startTracking();
    return () => stopTracking();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync GPS → map + store pings
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

  // ── Route fetch ───────────────────────────────────────────────────────────
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

  // ── Destination input ─────────────────────────────────────────────────────
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

  // ── Suggestion select ─────────────────────────────────────────────────────
  const handleSuggestionSelect = useCallback((s: Suggestion) => {
    if (suggestionTimer.current) clearTimeout(suggestionTimer.current);
    setSuggestions([]);
    setDestinationText(s.place_name);
    setDestination(s.place_name);
    setRouteCoords(null);
    setNavSteps(null);
    destCoordsRef.current = s.center;
    setDestinationCoords(s.center);
    setDestSelected(true);
    setRouteDistance(null);
    setRouteDuration(null);
    // Collapse idle sheet to give the map more room for route preview
    setIdleOpen(false);

    const dest = s.center;
    if (locRef.current) {
      fetchRoute([locRef.current.lng, locRef.current.lat], dest);
    } else {
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
    setIdleOpen(true);
  }, [setDestination, setRouteCoords, setNavSteps, setDestinationCoords]);

  // ── "I feel uneasy" ───────────────────────────────────────────────────────
  const handleFeelingUneasy = useCallback(async () => {
    toast('Showing safe places nearby. Stay calm — you\'re being tracked.', { icon: '🛡' });
    if (!showSafePlaces) {
      setShowSafePlaces(true);
      if (safePlaces.length > 0) return;
      if (!locRef.current) return;
      setSafePlacesLoading(true);
      try {
        const token = import.meta.env.VITE_MAPBOX_TOKEN as string;
        const places = await getNearbyPlaces([locRef.current.lng, locRef.current.lat], token);
        setSafePlaces(places);
      } finally {
        setSafePlacesLoading(false);
      }
    }
  }, [showSafePlaces, safePlaces.length]);

  // ── Safe places ───────────────────────────────────────────────────────────
  const handleToggleSafePlaces = useCallback(async () => {
    if (showSafePlaces) { setShowSafePlaces(false); return; }
    setShowSafePlaces(true);
    if (safePlaces.length > 0) return;
    if (!locRef.current) return;
    setSafePlacesLoading(true);
    try {
      const token = import.meta.env.VITE_MAPBOX_TOKEN as string;
      const places = await getNearbyPlaces([locRef.current.lng, locRef.current.lat], token);
      setSafePlaces(places);
    } finally {
      setSafePlacesLoading(false);
    }
  }, [showSafePlaces, safePlaces.length]);

  useEffect(() => {
    if (nearDestination) setShowSafePlaces(false);
  }, [nearDestination]);

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
    setShowSafePlaces(false);
    setSafePlaces([]);
    setShowHelpMenu(false);
    setArrivalDismissed(false);
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
    setIdleOpen(true);
    setShowSafePlaces(false);
    setSafePlaces([]);
    setShowHelpMenu(false);
    setArrivalDismissed(false);
    setNearDestination(false);
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

  // ── Derived heights ───────────────────────────────────────────────────────
  const initials    = profile?.avatar_initials ?? profile?.full_name?.slice(0, 2).toUpperCase() ?? 'SW';
  const checkInMax  = 90;
  const checkInPct  = Math.max(0, Math.min(100, (checkInSecondsLeft / checkInMax) * 100));
  const checkInMin  = Math.floor(checkInSecondsLeft / 60);
  const checkInSec  = checkInSecondsLeft % 60;
  const currentStep = navSteps?.[navStepIndex];

  const baseSheetH = isActive
    ? (sheetCollapsed ? ACTIVE_MINI : ACTIVE_FULL)
    : (idleOpen ? IDLE_OPEN : IDLE_PEEK);
  const sheetHeight    = dragHeight ?? baseSheetH;
  const recenterBottom = sheetHeight + 12;

  // Whether the full idle content is visible (for smooth appearance/disappearance)
  const showIdleContent = dragHeight != null ? dragHeight > 110 : idleOpen;

  // ── Unified sheet drag handler ────────────────────────────────────────────
  const minH = isActive ? ACTIVE_MINI : IDLE_PEEK;
  const maxH = isActive ? ACTIVE_FULL : IDLE_OPEN;

  const handleDragStart = (e: React.PointerEvent) => {
    dragRef.current = { startY: e.clientY, startH: sheetHeight };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleDragMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const dy = dragRef.current.startY - e.clientY; // positive = dragged up
    const newH = Math.max(minH, Math.min(maxH, dragRef.current.startH + dy));
    setDragHeight(newH);
  };

  const handleDragEnd = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const dy = dragRef.current.startY - e.clientY;
    setDragHeight(null);
    dragRef.current = null;

    if (isActive) {
      if (Math.abs(dy) < 8) {
        setSheetCollapsed((c) => !c);
      } else {
        setSheetCollapsed(dy < 0); // down = collapse, up = expand
      }
    } else {
      if (Math.abs(dy) < 8) {
        setIdleOpen((o) => !o);
      } else {
        setIdleOpen(dy > 0); // up = open, down = peek
      }
    }
  };

  const handleDragCancel = () => { setDragHeight(null); dragRef.current = null; };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {showCheckIn && !showSosOverlay && <CheckInOverlay onSafe={handleSafe} />}
      {showSosOverlay && <SosOverlay onCancel={handleCancelSOS} contacts={sosContacts} />}

      {/* Main viewport — all absolute children position relative to this */}
      <div className="relative w-full bg-[#EEF1F6]" style={{ height: isActive ? '100vh' : 'calc(100vh - 78px)' }}>

        {/* ── Map ──────────────────────────────────────────────────────── */}
        <div className="absolute inset-0">
          <MapView
            location={currentLoc}
            heading={location?.bearing}
            routeCoords={routeCoords}
            destinationCoords={destinationCoords}
            safePlaces={showSafePlaces ? safePlaces : []}
            isActive={isActive}
            followUser={followUser}
            onUserInteract={() => setFollowUser(false)}
          />
        </div>

        {/* ── Active: unified navigation head ──────────────────────────── */}
        {isActive && (
          <div className="absolute top-0 left-0 right-0 z-20">

            {/* White nav head — status + direction as one block */}
            <div className="bg-white" style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.13)' }}>

              {/* Slim status row */}
              <div className="flex items-center justify-between px-4 pt-3 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#3B6D11] animate-pulse flex-shrink-0" />
                  <span className="text-[12px] font-semibold text-[#555566]">Walk active</span>
                </div>
                <span className="text-[13px] font-bold text-[#1A1A28] tabular-nums">{timer}</span>
              </div>

              {/* Direction row */}
              {isRerouting ? (
                <div className="mx-3 mb-3 rounded-[14px] flex items-center overflow-hidden" style={{ background: '#E8A020' }}>
                  <div className="w-[62px] self-stretch flex items-center justify-center flex-shrink-0">
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21.5 2v6h-6"/><path d="M21.34 15.57a10 10 0 1 1-.57-8.38"/>
                    </svg>
                  </div>
                  <div className="flex-1 py-3 pr-4">
                    <div className="text-white font-bold text-[16px] leading-tight">Rerouting…</div>
                    <div className="text-white/80 text-[12px] mt-0.5">Finding a new path for you</div>
                  </div>
                </div>
              ) : isOffRoute ? (
                <div className="mx-3 mb-3 rounded-[14px] flex items-center overflow-hidden" style={{ background: '#E24B4A' }}>
                  <div className="w-[62px] self-stretch flex items-center justify-center flex-shrink-0">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/>
                      <path d="M12 9v4"/><path d="M12 17h.01"/>
                    </svg>
                  </div>
                  <div className="flex-1 py-3 pr-4">
                    <div className="text-white font-bold text-[16px] leading-tight">Off route</div>
                    <div className="text-white/80 text-[12px] mt-0.5">Calculating a new route…</div>
                  </div>
                </div>
              ) : currentStep ? (
                <div className="mx-3 mb-3 rounded-[14px] flex items-stretch overflow-hidden border border-[#ECEAF8]" style={{ boxShadow: '0 1px 4px rgba(83,74,183,0.10)' }}>
                  {/* Purple icon column */}
                  <div className="flex items-center justify-center flex-shrink-0" style={{ width: 68, background: '#534AB7' }}>
                    <ManeuverSvg type={currentStep.maneuverType} modifier={currentStep.maneuverModifier} />
                  </div>

                  {/* Instruction */}
                  <div className="flex-1 min-w-0 px-3.5 py-3">
                    <div className="text-[16px] font-bold text-[#1A1A28] leading-tight">
                      {humanizeInstruction(currentStep)}
                    </div>
                    {navSteps && navStepIndex < navSteps.length - 1 && navSteps[navStepIndex + 1] && (
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <div className="w-3.5 h-3.5 rounded-full bg-[#EEEDFE] flex items-center justify-center flex-shrink-0">
                          <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="#534AB7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <path d="m9 18 6-6-6-6"/>
                          </svg>
                        </div>
                        <span className="text-[12px] text-[#888899] leading-tight truncate">
                          {humanizeInstruction(navSteps[navStepIndex + 1])}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Distance — number + unit stacked */}
                  {currentStep.distance > 30 && (() => {
                    const raw = formatNavDistance(currentStep.distance);
                    const sp  = raw.lastIndexOf(' ');
                    const num  = sp !== -1 ? raw.slice(0, sp) : raw;
                    const unit = sp !== -1 ? raw.slice(sp + 1) : '';
                    return (
                      <div className="flex flex-col items-center justify-center pr-4 pl-1 flex-shrink-0 min-w-[48px]">
                        <span className="text-[20px] font-bold text-[#1A1A28] leading-none tabular-nums">{num}</span>
                        {unit && <span className="text-[11px] text-[#888899] font-medium mt-0.5">{unit}</span>}
                      </div>
                    );
                  })()}
                </div>
              ) : (
                /* No step yet — minimal "navigating" state */
                <div className="mx-3 mb-3 rounded-[14px] bg-[#F6F6FA] border border-[#EEEEF4] px-4 py-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#EEEDFE] flex items-center justify-center flex-shrink-0">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#534AB7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/>
                    </svg>
                  </div>
                  <span className="text-[14px] font-semibold text-[#534AB7]">Calculating route…</span>
                </div>
              )}
            </div>

            {/* Safety status line — on the map background */}
            <div className="flex items-center gap-1.5 px-4 pt-1.5 pb-1">
              <div className="w-1.5 h-1.5 rounded-full bg-[#3B6D11] flex-shrink-0" />
              <span className="text-[11px] text-white" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.40)' }}>On route</span>
              <span className="text-white/60" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.30)' }}>·</span>
              <span className="text-[11px] text-white" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.40)' }}>Check-in active</span>
              <span className="text-white/60" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.30)' }}>·</span>
              <span className="text-[11px] text-white" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.40)' }}>Location sharing</span>
            </div>

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
          <div className="absolute right-4 z-20 transition-all" style={{ bottom: recenterBottom }}>
            <RecenterButton onPress={() => setFollowUser(true)} />
          </div>
        )}

        {/* ── Bottom sheet ──────────────────────────────────────────────── */}
        <div
          className="absolute bottom-0 left-0 right-0 bg-white z-20"
          style={{
            height: sheetHeight,
            borderRadius: '20px 20px 0 0',
            boxShadow: '0 -4px 24px rgba(0,0,0,0.10)',
            // CSS transition only when not actively dragging (no drag = dragRef is null)
            transition: dragRef.current ? 'none' : 'height 0.28s cubic-bezier(0.4,0,0.2,1)',
          }}
        >
          {/* Drag handle — wider and more visible when collapsed to signal expand-ability */}
          <div
            className="flex justify-center pt-2.5 pb-1 cursor-grab active:cursor-grabbing select-none"
            onPointerDown={handleDragStart}
            onPointerMove={handleDragMove}
            onPointerUp={handleDragEnd}
            onPointerCancel={handleDragCancel}
          >
            <div
              className="rounded-full transition-all duration-200"
              style={{
                width: (!isActive && !showIdleContent) ? 44 : 40,
                height: 4,
                background: (!isActive && !showIdleContent) ? '#C0C0CC' : '#D5D5DD',
              }}
            />
          </div>

          {/* ── Active walk: collapsed peek ──────────────────────────── */}
          {isActive && sheetCollapsed && !dragHeight && (
            <div className="flex items-center justify-between px-5 pt-0.5">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#3B6D11] animate-pulse" />
                <span className="text-[13px] font-bold text-[#1A1A28] tabular-nums">{timer}</span>
                {navRemainingMeters > 0 && (
                  <span className="text-[12px] text-[#6F6F84]">· {formatNavDistance(navRemainingMeters)} left</span>
                )}
              </div>
              <span className="text-[11px] text-[#888899] font-medium">Swipe up</span>
            </div>
          )}

          {/* ── Idle: peek row ───────────────────────────────────────── */}
          {!isActive && !showIdleContent && (
            <button
              className="w-full flex items-center gap-2.5 px-4 py-1.5 text-left active:bg-[#F8F8FC]"
              onClick={() => setIdleOpen(true)}
              aria-label="Expand destination panel"
            >
              {destSelected ? (
                <>
                  <div className="w-7 h-7 rounded-full bg-[#EEEDFE] flex items-center justify-center flex-shrink-0">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#534AB7" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>
                    </svg>
                  </div>
                  <span className="flex-1 text-[14px] font-semibold text-[#1A1A28] truncate">{destinationText}</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#534AB7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                    <path d="m18 15-6-6-6 6"/>
                  </svg>
                </>
              ) : (
                <>
                  <div className="w-7 h-7 rounded-full bg-[#F0F0F4] flex items-center justify-center flex-shrink-0">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#888899" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>
                    </svg>
                  </div>
                  <span className="text-[14px] text-[#888899]">Where are you going?</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#BBBBCC" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 ml-auto">
                    <path d="m18 15-6-6-6 6"/>
                  </svg>
                </>
              )}
            </button>
          )}

          {/* ── Active walk: full controls ───────────────────────────── */}
          {isActive && (
            <div
              className="flex flex-col gap-2.5 px-4 pt-2"
              style={{ visibility: (!sheetCollapsed || dragHeight != null) ? 'visible' : 'hidden', opacity: dragHeight != null ? Math.min(1, (sheetHeight - ACTIVE_MINI) / 60) : 1 }}
            >
              {/* Check-in countdown — urgent style when ≤ 20 s */}
              {(() => {
                const urgent = checkInSecondsLeft <= 20;
                const label = checkInSecondsLeft <= 0
                  ? 'Checking in now…'
                  : checkInSecondsLeft < 60
                    ? `in ${checkInSecondsLeft} sec`
                    : `in ${checkInMin}:${String(checkInSec).padStart(2, '0')}`;
                return (
                  <div
                    className="rounded-[14px] px-4 py-2.5 transition-colors duration-500"
                    style={{ background: urgent ? '#FFF4E6' : '#EEEDFE' }}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[12px] font-semibold" style={{ color: urgent ? '#B06000' : '#534AB7' }}>
                        Next check-in
                      </span>
                      <span
                        className="text-[13px] font-bold tabular-nums"
                        style={{ color: urgent ? '#B06000' : '#534AB7' }}
                        aria-live="polite"
                      >
                        {label}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: urgent ? '#F5D8A8' : '#DCD9FB' }}>
                      <div
                        className="h-full rounded-full transition-all duration-1000"
                        style={{ width: `${checkInPct}%`, background: urgent ? '#E8890A' : '#7F77DD' }}
                      />
                    </div>
                  </div>
                );
              })()}

              {/* Stats — single connected panel */}
              <div className="flex bg-[#F6F6FA] rounded-[14px] overflow-hidden border border-[#EDEDF2]">
                {[
                  { label: 'Time',      value: timer },
                  { label: 'Remaining', value: navRemainingMeters > 0 ? formatNavDistance(navRemainingMeters) : `${(walk.distanceMeters / 1000).toFixed(1)} km` },
                  { label: 'ETA',       value: navRemainingSeconds > 0 ? formatNavDuration(navRemainingSeconds) : '—' },
                ].map(({ label, value }, i) => (
                  <div key={label} className={`flex-1 flex flex-col items-center justify-center px-2 py-3 ${i > 0 ? 'border-l border-[#E4E4ED]' : ''}`}>
                    <div className="text-[11px] font-bold text-[#1A1A28] tabular-nums leading-none">{value}</div>
                    <div className="text-[10px] text-[#999AAA] font-medium mt-1 leading-none">{label}</div>
                  </div>
                ))}
              </div>

              {/* Safe places toggle */}
              <button
                onClick={handleToggleSafePlaces}
                className="w-full h-9 rounded-[10px] text-[12px] font-semibold flex items-center justify-center gap-1.5 border"
                style={{
                  background:  showSafePlaces ? '#534AB7' : '#F6F6FA',
                  borderColor: showSafePlaces ? '#534AB7' : '#E0E0E8',
                  color:       showSafePlaces ? 'white'   : '#534AB7',
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/>
                </svg>
                {showSafePlaces ? 'Hide safe places' : 'Show safe places nearby'}
              </button>

              {/* SOS + I feel uneasy + End walk */}
              <div className="flex items-center gap-2.5">
                <SosButton onActivated={handleSOS} />
                <div className="flex flex-col gap-1.5" style={{ flex: 1, height: 84 }}>
                  <button
                    onClick={() => setShowHelpMenu(true)}
                    className="rounded-[12px] text-[13px] font-semibold flex items-center justify-center gap-1.5 border"
                    style={{ background: '#FFF8EC', borderColor: '#F5DFB0', color: '#7A5400', flex: 1 }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/>
                    </svg>
                    I feel uneasy
                  </button>
                  <button
                    onClick={() => setShowEndConfirm(true)}
                    className="rounded-[12px] bg-[#F0F0F4] text-[#888899] border border-[#E0E0E8] font-medium text-[13px] flex items-center justify-center"
                    style={{ flex: 1 }}
                  >
                    End walk
                  </button>
                </div>
              </div>
              <p className="text-[10px] text-[#AAAABC] text-center -mt-1.5">Hold SOS 3 s to alert your contacts</p>
            </div>
          )}

          {/* ── Idle: full content ───────────────────────────────────── */}
          {!isActive && showIdleContent && (
            <div className="px-4 pt-1 flex flex-col gap-2.5">
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
                      onFocus={() => setIdleOpen(true)}
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
                className="w-full h-[50px] rounded-[14px] text-white font-bold text-[15px] active:scale-[0.98] flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg,#7F77DD,#534AB7)',
                  boxShadow: '0 4px 16px rgba(127,119,221,0.38)',
                }}
              >
                Start walk
              </button>

              {/* Quick stats */}
              <div className="flex gap-2">
                <div className="flex-1 bg-[#F6F6FA] rounded-[14px] py-3 flex flex-col items-center gap-0.5 border border-[#EEEEF4]">
                  <span className="text-[20px] font-bold text-[#1A1A28] tabular-nums leading-none">{stats.data?.walks ?? '—'}</span>
                  <span className="text-[10px] text-[#999AAA] font-medium text-center leading-tight">Walks<br/>this month</span>
                </div>
                <div className="flex-1 bg-[#F6F6FA] rounded-[14px] py-3 flex flex-col items-center gap-0.5 border border-[#EEEEF4]">
                  <span className="text-[20px] font-bold text-[#1A1A28] tabular-nums leading-none">{stats.data?.contacts ?? '—'}</span>
                  <span className="text-[10px] text-[#999AAA] font-medium text-center leading-tight">Trusted<br/>contacts</span>
                </div>
                <div className="flex-1 bg-[#F0FBF1] rounded-[14px] py-3 flex flex-col items-center gap-0.5 border border-[#D4EDDA]">
                  <div className="w-5 h-5 rounded-full bg-[#3B6D11] flex items-center justify-center mb-0.5">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6 9 17l-5-5"/>
                    </svg>
                  </div>
                  <span className="text-[10px] text-[#3B6D11] font-semibold text-center leading-tight">You're<br/>safe</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Safe places panel (inside container so absolute works) ──── */}
        {isActive && showSafePlaces && (
          <div className="absolute left-0 right-0 z-20 px-4" style={{ bottom: sheetHeight + 8 }}>
            <div className="bg-white rounded-[18px] shadow-[0_-4px_20px_rgba(0,0,0,0.12)] overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#F0F0F4]">
                <span className="text-[13px] font-bold text-[#1A1A28]">Nearby safe places</span>
                <div className="flex items-center gap-2">
                  {safePlacesLoading && (
                    <div className="w-4 h-4 border-2 border-[#534AB7]/30 border-t-[#534AB7] rounded-full animate-spin" />
                  )}
                  <button
                    onClick={() => setShowSafePlaces(false)}
                    className="w-6 h-6 rounded-full bg-[#F0F0F4] flex items-center justify-center"
                    aria-label="Close safe places"
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#888899" strokeWidth="3" strokeLinecap="round">
                      <path d="M18 6 6 18M6 6l12 12"/>
                    </svg>
                  </button>
                </div>
              </div>
              {!safePlacesLoading && safePlaces.length === 0 && (
                <div className="px-4 py-3 text-[13px] text-[#888899]">No safe places found nearby.</div>
              )}
              {safePlaces.slice(0, 5).map((place, i) => {
                const cfg = {
                  police:   { label: 'Police',   color: '#1565C0' },
                  hospital: { label: 'Hospital', color: '#2E7D32' },
                  pharmacy: { label: 'Pharmacy', color: '#00695C' },
                }[place.type];
                return (
                  <div
                    key={place.id}
                    className="flex items-center gap-3 px-4 py-2.5"
                    style={{ borderBottom: i < Math.min(safePlaces.length, 5) - 1 ? '1px solid #F0F0F4' : 'none' }}
                  >
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white text-[11px] font-bold"
                      style={{ background: cfg.color }}
                    >
                      {place.type === 'police' ? 'P' : place.type === 'hospital' ? 'H' : 'Rx'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-semibold text-[#1A1A28] truncate">{place.name}</div>
                      <div className="text-[11px] text-[#888899] truncate">{place.address}</div>
                    </div>
                    <span className="text-[11px] font-semibold flex-shrink-0" style={{ color: cfg.color }}>{cfg.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Arrival prompt (inside container) ────────────────────────── */}
        {isActive && nearDestination && !arrivalDismissed && !showSosOverlay && (
          <ArrivalPrompt
            destination={walk.destination}
            bottomOffset={sheetHeight + 8}
            onEnd={() => { setArrivalDismissed(true); setNearDestination(false); setShowEndConfirm(true); }}
            onDismiss={() => { setArrivalDismissed(true); setNearDestination(false); }}
          />
        )}
      </div>

      {/* ── Help menu (fixed, OK outside container) ────────────────────── */}
      {showHelpMenu && (
        <DiscreetHelpMenu
          shareUrl={walk.shareToken ? `${window.location.origin}/track/${walk.shareToken}` : null}
          onClose={() => setShowHelpMenu(false)}
          onSOS={() => { setShowHelpMenu(false); handleSOS(); }}
          onFeelingUneasy={() => { setShowHelpMenu(false); handleFeelingUneasy(); }}
          onShowSafePlaces={() => { setShowHelpMenu(false); if (!showSafePlaces) handleToggleSafePlaces(); }}
        />
      )}

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
