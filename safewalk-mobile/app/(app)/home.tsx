import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Keyboard,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  type GestureResponderEvent,
  type PanResponderGestureState,
} from 'react-native';
import { PanResponder } from 'react-native';
import { useRouter } from 'expo-router';
import { differenceInSeconds } from 'date-fns';
import Toast from 'react-native-toast-message';
import { useQuery } from '@tanstack/react-query';
import * as Location from 'expo-location';
import Svg, { Circle, Path, Polyline } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { useWalkStore } from '../../store/walkStore';
import { useGeolocation } from '../../hooks/useGeolocation';
import { useCheckIn } from '../../hooks/useCheckIn';
import { useNavigation } from '../../hooks/useNavigation';
import { getDirections } from '../../services/directions';
import { formatNavDistance, formatNavDuration, humanizeInstruction } from '../../services/navigation';
import { formatPace } from '../../services/eta';
import { getNearbyPlaces, type SafePlace } from '../../services/safePlaces';
import { buildShareUrl } from '../../services/alert';
import { MapView } from '../../components/map/MapView';
import { SosButton } from '../../components/walk/SosButton';
import { CheckInOverlay } from '../../components/walk/CheckInOverlay';
import { SosOverlay } from '../../components/walk/SosOverlay';
import { ArrivalPrompt } from '../../components/walk/ArrivalPrompt';
import { DiscreetHelpMenu } from '../../components/walk/DiscreetHelpMenu';
import { RecenterButton } from '../../components/walk/RecenterButton';
import { ManeuverIcon } from '../../components/walk/ManeuverIcon';
import { LogoMark } from '../../components/LogoMark';
import { Avatar } from '../../components/ui/Avatar';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import type { LatLng } from '../../types';

interface Suggestion {
  id: string;
  text: string;
  place_name: string;
  center: [number, number]; // [lng, lat]
}

// Sheet snap heights
const IDLE_PEEK = 72;
const IDLE_OPEN = 192;
const ACTIVE_MINI = 54;
const ACTIVE_FULL = 316;
const SNAP_MS = 280;

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
  const [state, setState] = useState({ text: '0:00', seconds: 0 });
  useEffect(() => {
    if (!startedAt) return;
    const id = setInterval(() => {
      const secs = differenceInSeconds(new Date(), startedAt);
      const h = Math.floor(secs / 3600);
      const m = Math.floor((secs % 3600) / 60);
      const s = secs % 60;
      setState({
        text: h > 0
          ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
          : `${m}:${String(s).padStart(2, '0')}`,
        seconds: secs,
      });
    }, 1000);
    return () => clearInterval(id);
  }, [startedAt]);
  return state;
}

export default function Home() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, profile } = useAuthStore();
  const {
    walk, startWalk, endWalk, setLocation, setDistance, setStatus, setEscalationStage, setDestination,
    routeCoords, setRouteCoords, destinationCoords, setDestinationCoords, setRouteDurationSeconds, addVisitedPoint,
    navSteps, navStepIndex, navRemainingMeters, navRemainingSeconds,
    isOffRoute, isRerouting, setNavSteps,
    nearDestination, setNearDestination,
  } = useWalkStore();
  const { location, startTracking, stopTracking } = useGeolocation();
  const stats = useHomeStats(user?.id);
  const { text: timer, seconds: elapsedSeconds } = useSessionTimer(walk.startedAt ? new Date(walk.startedAt) : null);

  const isActive = !!walk.sessionId;
  useNavigation(isActive);

  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [showSosOverlay, setShowSosOverlay] = useState(false);
  const [sosContacts, setSosContacts] = useState<{ name: string; phone: string }[]>([]);

  const [destinationText, setDestinationText] = useState(walk.destination ?? '');
  const [destSelected, setDestSelected] = useState(!!walk.destination && !!destinationCoords);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeDistance, setRouteDistance] = useState<number | null>(null);
  const [routeDuration, setRouteDuration] = useState<number | null>(null);

  const [followUser, setFollowUser] = useState(true);

  const [sheetCollapsed, setSheetCollapsed] = useState(false);
  const [idleOpen, setIdleOpen] = useState(true);
  const [isDragging, setIsDragging] = useState(false);

  const [showSafePlaces, setShowSafePlaces] = useState(false);
  const [safePlaces, setSafePlaces] = useState<SafePlace[]>([]);
  const [safePlacesLoading, setSafePlacesLoading] = useState(false);

  const [showHelpMenu, setShowHelpMenu] = useState(false);
  const [arrivalDismissed, setArrivalDismissed] = useState(false);

  const [currentLoc, setCurrentLoc] = useState<LatLng | null>(walk.currentLocation);

  const suggestionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const destCoordsRef = useRef<[number, number] | null>(destinationCoords);
  const locRef = useRef<LatLng | null>(null);

  const minH = isActive ? ACTIVE_MINI : IDLE_PEEK;
  const maxH = isActive ? ACTIVE_FULL : IDLE_OPEN;
  const baseSheetH = isActive ? (sheetCollapsed ? ACTIVE_MINI : ACTIVE_FULL) : (idleOpen ? IDLE_OPEN : IDLE_PEEK);

  // useState (not useRef) so passing heightAnim to style/interpolate during
  // render doesn't trip the "no ref access during render" rule — it still
  // holds one stable Animated.Value instance across renders either way.
  const [heightAnim] = useState(() => new Animated.Value(baseSheetH));
  const heightRef = useRef(baseSheetH);
  const dragStartRef = useRef<{ y: number; h: number } | null>(null);

  useEffect(() => {
    const id = heightAnim.addListener(({ value }) => { heightRef.current = value; });
    return () => heightAnim.removeListener(id);
  }, [heightAnim]);

  useEffect(() => {
    if (isDragging) return;
    Animated.timing(heightAnim, { toValue: baseSheetH, duration: SNAP_MS, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [baseSheetH, isDragging, heightAnim]);

  // Recreated each render (not memoized) so its handlers always see the
  // current minH/maxH/isActive — memoizing via useRef/useState would freeze
  // them at their first-render values. PanResponder's API is inherently
  // ref-based (gesture tracking has no non-ref equivalent here); the refs
  // it closes over are only ever read inside the event-handler callbacks
  // below, never during render itself.
  // eslint-disable-next-line react-hooks/refs
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dy) > 2,
    onPanResponderGrant: () => {
      setIsDragging(true);
      dragStartRef.current = { y: 0, h: heightRef.current };
    },
    onPanResponderMove: (_e: GestureResponderEvent, g: PanResponderGestureState) => {
      if (!dragStartRef.current) return;
      const newH = Math.max(minH, Math.min(maxH, dragStartRef.current.h - g.dy));
      heightAnim.setValue(newH);
    },
    onPanResponderRelease: (_e, g) => {
      setIsDragging(false);
      dragStartRef.current = null;
      if (isActive) {
        if (Math.abs(g.dy) < 8) setSheetCollapsed((c) => !c);
        else setSheetCollapsed(g.dy > 0); // dragged down = collapse
      } else {
        if (Math.abs(g.dy) < 8) setIdleOpen((o) => !o);
        else setIdleOpen(g.dy < 0); // dragged up = open
      }
    },
    onPanResponderTerminate: () => { setIsDragging(false); dragStartRef.current = null; },
  });

  const showIdleContent = idleOpen;
  const recenterBottom = baseSheetH + 12;

  useEffect(() => { destCoordsRef.current = destinationCoords; }, [destinationCoords]);

  // ── GPS always on ─────────────────────────────────────────────────────────
  useEffect(() => {
    startTracking();
    return () => stopTracking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync GPS → map + store. The store's copy is kept live regardless of
  // whether a walk is active — the walk-confirm screen (pre-walk) needs a
  // current position too, not just the active-walk screen. Only the
  // Supabase location_pings log stays scoped to an active session.
  useEffect(() => {
    if (!location) return;
    const ll: LatLng = { lat: location.lat, lng: location.lng };
    // Syncing an external system (GPS watch callback) into state, not
    // mirroring props/state — legitimate per the rule's own guidance.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentLoc(ll);
    locRef.current = ll;
    setLocation(ll);
    if (!walk.sessionId) return;
    supabase.from('location_pings').insert({
      session_id: walk.sessionId, user_id: user?.id,
      lat: location.lat, lng: location.lng,
      bearing: location.bearing, speed: location.speed,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location, walk.sessionId]);

  // Track the actually-walked GPS trail while active (distinct from the
  // planned route) — powers the Strava-style summary map after ending.
  useEffect(() => {
    if (!isActive || !location) return;
    addVisitedPoint([location.lng, location.lat]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location, isActive]);

  // ── Route fetch ───────────────────────────────────────────────────────────
  const fetchRoute = useCallback(async (from: [number, number], to: [number, number]) => {
    setRouteLoading(true);
    try {
      const result = await getDirections(from, to);
      if (!result) {
        Toast.show({ type: 'error', text1: "Couldn't find a walking route there." });
        return false;
      }
      setRouteCoords(result.geometry);
      setNavSteps(result.steps);
      setRouteDistance(result.totalDistance);
      setRouteDuration(result.totalDuration);
      setDistance(result.totalDistance);
      setRouteDurationSeconds(result.totalDuration);
      return true;
    } finally {
      setRouteLoading(false);
    }
  }, [setRouteCoords, setNavSteps, setDistance, setRouteDurationSeconds]);

  // ── Suggestion search ─────────────────────────────────────────────────────
  const fetchSuggestions = useCallback((value: string) => {
    if (suggestionTimer.current) clearTimeout(suggestionTimer.current);
    if (value.trim().length < 2) { setSuggestions([]); return; }
    suggestionTimer.current = setTimeout(async () => {
      try {
        const token = process.env.EXPO_PUBLIC_MAPBOX_TOKEN as string;
        const res = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(value.trim())}.json?access_token=${token}&types=address,place,poi&limit=5&country=ca`,
        );
        if (!res.ok) return;
        const data = await res.json();
        setSuggestions(data.features ?? []);
      } catch { /* ignore */ }
    }, 280);
  }, []);

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

  const handleSuggestionSelect = useCallback(async (s: Suggestion) => {
    if (suggestionTimer.current) clearTimeout(suggestionTimer.current);
    setSuggestions([]);
    Keyboard.dismiss();
    setDestinationText(s.place_name);
    setDestination(s.place_name);
    setRouteCoords(null);
    setNavSteps(null);
    destCoordsRef.current = s.center;
    setDestinationCoords(s.center);
    setDestSelected(true);
    setRouteDistance(null);
    setRouteDuration(null);
    setIdleOpen(false);

    const dest = s.center;
    if (locRef.current) {
      const ok = await fetchRoute([locRef.current.lng, locRef.current.lat], dest);
      if (ok) router.push('/walk-confirm');
    } else {
      try {
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        const from: [number, number] = [pos.coords.longitude, pos.coords.latitude];
        const ll: LatLng = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        locRef.current = ll;
        setCurrentLoc(ll);
        const ok = await fetchRoute(from, dest);
        if (ok) router.push('/walk-confirm');
      } catch {
        Toast.show({ type: 'error', text1: 'Enable location to see your route.' });
      }
    }
  }, [setDestination, setRouteCoords, setNavSteps, setDestinationCoords, fetchRoute, router]);

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

  // ── Safe places ───────────────────────────────────────────────────────────
  const loadSafePlaces = useCallback(async () => {
    if (safePlaces.length > 0 || !locRef.current) return;
    setSafePlacesLoading(true);
    try {
      const token = process.env.EXPO_PUBLIC_MAPBOX_TOKEN as string;
      const places = await getNearbyPlaces([locRef.current.lng, locRef.current.lat], token);
      setSafePlaces(places);
    } finally {
      setSafePlacesLoading(false);
    }
  }, [safePlaces.length]);

  const handleFeelingUneasy = useCallback(async () => {
    Toast.show({ type: 'info', text1: 'Showing safe places nearby.', text2: "Stay calm — you're being tracked." });
    if (!showSafePlaces) { setShowSafePlaces(true); await loadSafePlaces(); }
  }, [showSafePlaces, loadSafePlaces]);

  const handleToggleSafePlaces = useCallback(async () => {
    if (showSafePlaces) { setShowSafePlaces(false); return; }
    setShowSafePlaces(true);
    await loadSafePlaces();
  }, [showSafePlaces, loadSafePlaces]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
    Toast.show({ type: 'success', text1: "Great, glad you're safe." });
  };

  // ── Start walk ────────────────────────────────────────────────────────────
  const handleStart = async () => {
    if (!user) return;
    const { data: session, error } = await supabase
      .from('walk_sessions')
      .insert({ user_id: user.id, destination: destinationText || null })
      .select()
      .single();
    if (error || !session) { Toast.show({ type: 'error', text1: "Couldn't start walk. Try again." }); return; }
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
    endWalk(); // snapshots lastWalkSummary in the store before resetting
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
    startTracking();
    stats.refetch();
    router.replace('/walk-summary');
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
      const shareUrl = walk.shareToken ? buildShareUrl(walk.shareToken) : null;
      const name = profile?.full_name || user.email || 'Someone';
      const message = shareUrl
        ? `EMERGENCY: ${name} has triggered an SOS on SafeWalk. Track their live location: ${shareUrl}`
        : `EMERGENCY: ${name} has triggered an SOS on SafeWalk. Please check on them immediately.`;
      await supabase.functions.invoke('send-alert', { body: { contacts: list, message } });
    } else {
      Toast.show({ type: 'error', text1: 'No trusted contacts', text2: 'Add contacts so they can be alerted.' });
    }
  };

  const handleCancelSOS = () => {
    setShowSosOverlay(false);
    setShowCheckIn(false);
    setEscalationStage(0);
    setStatus('active');
    resetCheckIn();
    if (walk.sessionId) supabase.from('walk_sessions').update({ status: 'active' }).eq('id', walk.sessionId);
    Toast.show({ type: 'success', text1: "Glad you're safe. Emergency cancelled." });
  };

  const initials = profile?.avatar_initials ?? profile?.full_name?.slice(0, 2).toUpperCase() ?? 'SW';
  const checkInMax = 90;
  const checkInPct = Math.max(0, Math.min(100, (checkInSecondsLeft / checkInMax) * 100));
  const checkInMin = Math.floor(checkInSecondsLeft / 60);
  const checkInSec = checkInSecondsLeft % 60;
  const currentStep = navSteps?.[navStepIndex];

  return (
    <View className="flex-1 bg-[#EEF1F6]">
      {showCheckIn && !showSosOverlay && <CheckInOverlay onSafe={handleSafe} />}
      {showSosOverlay && <SosOverlay onCancel={handleCancelSOS} contacts={sosContacts} />}

      <View style={{ flex: 1 }}>
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

        {/* ── Active: compact floating nav card (Uber-style) ─────────────── */}
        {isActive && (
          <View className="absolute left-0 right-0 px-3" style={{ top: insets.top + 10, zIndex: 20 }}>
            {isRerouting ? (
              <View
                className="rounded-2xl flex-row items-center overflow-hidden"
                style={{ backgroundColor: '#E8A020', shadowColor: '#000', shadowOpacity: 0.16, shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 6 }}
              >
                <View className="items-center justify-center" style={{ width: 54, alignSelf: 'stretch' }}>
                  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5}>
                    <Path d="M21.5 2v6h-6" /><Path d="M21.34 15.57a10 10 0 1 1-.57-8.38" />
                  </Svg>
                </View>
                <View className="flex-1 py-2.5 pr-4">
                  <Text className="text-white font-bold text-sm leading-tight">Rerouting…</Text>
                  <Text className="text-white/80 text-[11px] mt-0.5">Finding a new path for you</Text>
                </View>
              </View>
            ) : isOffRoute ? (
              <View
                className="rounded-2xl flex-row items-center overflow-hidden bg-sos"
                style={{ shadowColor: '#000', shadowOpacity: 0.16, shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 6 }}
              >
                <View className="items-center justify-center" style={{ width: 54, alignSelf: 'stretch' }}>
                  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5}>
                    <Path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
                    <Path d="M12 9v4" /><Path d="M12 17h.01" />
                  </Svg>
                </View>
                <View className="flex-1 py-2.5 pr-4">
                  <Text className="text-white font-bold text-sm leading-tight">Off route</Text>
                  <Text className="text-white/80 text-[11px] mt-0.5">Calculating a new route…</Text>
                </View>
              </View>
            ) : currentStep ? (
              <View
                className="rounded-2xl flex-row overflow-hidden bg-white"
                style={{ shadowColor: '#000', shadowOpacity: 0.16, shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 6 }}
              >
                <View className="items-center justify-center" style={{ width: 54, backgroundColor: '#534AB7' }}>
                  <ManeuverIcon type={currentStep.maneuverType} modifier={currentStep.maneuverModifier} />
                </View>
                <View className="flex-1 min-w-0 px-3 py-2.5">
                  <Text className="text-[15px] font-bold text-dark-text leading-tight" numberOfLines={1}>
                    {humanizeInstruction(currentStep)}
                  </Text>
                  {navSteps && navStepIndex < navSteps.length - 1 && navSteps[navStepIndex + 1] && (
                    <Text className="text-[11px] text-gray-text leading-tight mt-1" numberOfLines={1}>
                      Then {humanizeInstruction(navSteps[navStepIndex + 1])}
                    </Text>
                  )}
                </View>
                {currentStep.distance > 30 && (() => {
                  const raw = formatNavDistance(currentStep.distance);
                  const sp = raw.lastIndexOf(' ');
                  const num = sp !== -1 ? raw.slice(0, sp) : raw;
                  const unit = sp !== -1 ? raw.slice(sp + 1) : '';
                  return (
                    <View className="items-center justify-center pr-3.5 pl-1" style={{ minWidth: 40 }}>
                      <Text className="text-base font-bold text-dark-text leading-none">{num}</Text>
                      {!!unit && <Text className="text-[10px] text-gray-text font-medium mt-0.5">{unit}</Text>}
                    </View>
                  );
                })()}
              </View>
            ) : (
              <View
                className="rounded-2xl bg-white px-4 py-2.5 flex-row items-center gap-2.5"
                style={{ shadowColor: '#000', shadowOpacity: 0.16, shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 6 }}
              >
                <View className="w-7 h-7 rounded-full bg-purple-50 items-center justify-center">
                  <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#534AB7" strokeWidth={2.5}>
                    <Circle cx={12} cy={12} r={10} /><Path d="M12 8v4l3 3" />
                  </Svg>
                </View>
                <Text className="text-sm font-semibold text-purple-600">Calculating route…</Text>
              </View>
            )}

            <View
              className="flex-row items-center self-start gap-1.5 bg-black/45 rounded-full px-3 py-1 mt-2"
            >
              <View className="w-1.5 h-1.5 rounded-full bg-status-safe" />
              <Text className="text-[11px] text-white font-semibold">{timer}</Text>
              <Text className="text-white/50 text-[11px]">·</Text>
              <Text className="text-[11px] text-white">Sharing location</Text>
            </View>
          </View>
        )}

        {/* ── Idle: top chrome ──────────────────────────────────────────── */}
        {!isActive && (
          <View
            className="absolute left-0 right-0 flex-row items-center justify-between px-4"
            style={{ top: insets.top + 12, zIndex: 20 }}
          >
            <LogoMark />
            <Pressable
              onPress={() => router.push('/settings')}
              accessibilityLabel="Settings"
              className="w-11 h-11 rounded-full bg-white items-center justify-center"
              style={{ shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 4 }}
            >
              <Avatar initials={initials} size={36} />
            </Pressable>
          </View>
        )}

        {/* ── Recenter FAB ──────────────────────────────────────────────── */}
        {!followUser && (
          <View className="absolute right-4" style={{ bottom: recenterBottom, zIndex: 20 }}>
            <RecenterButton onPress={() => setFollowUser(true)} />
          </View>
        )}

        {/* ── Safe places panel ───────────────────────────────────────────*/}
        {isActive && showSafePlaces && (
          <View className="absolute left-0 right-0 px-4" style={{ bottom: baseSheetH + 8, zIndex: 20 }}>
            <View
              className="bg-white rounded-[18px] overflow-hidden"
              style={{ shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 20, shadowOffset: { width: 0, height: -4 }, elevation: 8 }}
            >
              <View className="flex-row items-center justify-between px-4 py-2.5 border-b border-gray-bg">
                <Text className="text-[13px] font-bold text-dark-text">Nearby safe places</Text>
                <Pressable
                  onPress={() => setShowSafePlaces(false)}
                  accessibilityLabel="Close safe places"
                  className="w-6 h-6 rounded-full bg-gray-bg items-center justify-center"
                >
                  <Svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="#888899" strokeWidth={3}>
                    <Path d="M18 6 6 18M6 6l12 12" />
                  </Svg>
                </Pressable>
              </View>
              {!safePlacesLoading && safePlaces.length === 0 && (
                <Text className="px-4 py-3 text-[13px] text-gray-text">No safe places found nearby.</Text>
              )}
              {safePlaces.slice(0, 5).map((place, i) => {
                const cfg = {
                  police: { label: 'Police', color: '#1565C0' },
                  hospital: { label: 'Hospital', color: '#2E7D32' },
                  pharmacy: { label: 'Pharmacy', color: '#00695C' },
                }[place.type];
                return (
                  <View
                    key={place.id}
                    className="flex-row items-center gap-3 px-4 py-2.5"
                    style={i < Math.min(safePlaces.length, 5) - 1 ? { borderBottomWidth: 1, borderBottomColor: '#F0F0F4' } : undefined}
                  >
                    <View className="w-8 h-8 rounded-full items-center justify-center" style={{ backgroundColor: cfg.color }}>
                      <Text className="text-white text-[11px] font-bold">
                        {place.type === 'police' ? 'P' : place.type === 'hospital' ? 'H' : 'Rx'}
                      </Text>
                    </View>
                    <View className="flex-1 min-w-0">
                      <Text className="text-[13px] font-semibold text-dark-text" numberOfLines={1}>{place.name}</Text>
                      <Text className="text-[11px] text-gray-text" numberOfLines={1}>{place.address}</Text>
                    </View>
                    <Text className="text-[11px] font-semibold" style={{ color: cfg.color }}>{cfg.label}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* ── Arrival prompt ───────────────────────────────────────────── */}
        {isActive && nearDestination && !arrivalDismissed && !showSosOverlay && (
          <ArrivalPrompt
            destination={walk.destination}
            bottomOffset={baseSheetH + 8}
            onEnd={() => { setArrivalDismissed(true); setNearDestination(false); setShowEndConfirm(true); }}
            onDismiss={() => { setArrivalDismissed(true); setNearDestination(false); }}
          />
        )}

        {/* ── Bottom sheet ──────────────────────────────────────────────── */}
        <Animated.View
          className="absolute bottom-0 left-0 right-0 bg-white"
          style={{
            height: heightAnim,
            zIndex: 20,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 24, shadowOffset: { width: 0, height: -4 }, elevation: 10,
          }}
        >
          <View className="items-center pt-2.5 pb-1" {...panResponder.panHandlers}>
            <View
              className="rounded-full"
              style={{
                width: (!isActive && !showIdleContent) ? 44 : 40, height: 4,
                backgroundColor: (!isActive && !showIdleContent) ? '#C0C0CC' : '#D5D5DD',
              }}
            />
          </View>

          {isActive && sheetCollapsed && !isDragging && (
            <View className="flex-row items-center justify-between px-5 pt-0.5">
              <View className="flex-row items-center gap-2">
                <View className="w-2 h-2 rounded-full bg-status-safe" />
                <Text className="text-[13px] font-bold text-dark-text">{timer}</Text>
                {navRemainingMeters > 0 && (
                  <Text className="text-xs text-[#6F6F84]">· {formatNavDistance(navRemainingMeters)} left</Text>
                )}
              </View>
              <Text className="text-[11px] text-gray-text font-medium">Swipe up</Text>
            </View>
          )}

          {!isActive && !showIdleContent && (
            <Pressable
              className="w-full flex-row items-center gap-2.5 px-4 py-1.5"
              onPress={() => setIdleOpen(true)}
              accessibilityLabel="Expand destination panel"
            >
              {destSelected ? (
                <>
                  <View className="w-7 h-7 rounded-full bg-purple-50 items-center justify-center">
                    <Svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="#534AB7" strokeWidth={2.2}>
                      <Path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><Circle cx={12} cy={10} r={3} />
                    </Svg>
                  </View>
                  <Text className="flex-1 text-sm font-semibold text-dark-text" numberOfLines={1}>{destinationText}</Text>
                  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#534AB7" strokeWidth={2.5}>
                    <Path d="m18 15-6-6-6 6" />
                  </Svg>
                </>
              ) : (
                <>
                  <View className="w-7 h-7 rounded-full bg-gray-bg items-center justify-center">
                    <Svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="#888899" strokeWidth={2}>
                      <Circle cx={11} cy={11} r={7} /><Path d="m21 21-4.3-4.3" />
                    </Svg>
                  </View>
                  <Text className="text-sm text-gray-text">Where are you going?</Text>
                  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#BBBBCC" strokeWidth={2.5} style={{ marginLeft: 'auto' }}>
                    <Path d="m18 15-6-6-6 6" />
                  </Svg>
                </>
              )}
            </Pressable>
          )}

          {isActive && (!sheetCollapsed || isDragging) && (
            <ScrollView className="px-4 pt-2" contentContainerStyle={{ gap: 10 }} scrollEnabled={!isDragging}>
              {(() => {
                const urgent = checkInSecondsLeft <= 20;
                const label = checkInSecondsLeft <= 0
                  ? 'Checking in now…'
                  : checkInSecondsLeft < 60
                    ? `in ${checkInSecondsLeft} sec`
                    : `in ${checkInMin}:${String(checkInSec).padStart(2, '0')}`;
                return (
                  <View className="rounded-2xl px-4 py-2.5" style={{ backgroundColor: urgent ? '#FFF4E6' : '#EEEDFE' }}>
                    <View className="flex-row items-center justify-between mb-1.5">
                      <Text className="text-xs font-semibold" style={{ color: urgent ? '#B06000' : '#534AB7' }}>
                        Next check-in
                      </Text>
                      <Text className="text-[13px] font-bold" style={{ color: urgent ? '#B06000' : '#534AB7' }}>
                        {label}
                      </Text>
                    </View>
                    <View className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: urgent ? '#F5D8A8' : '#DCD9FB' }}>
                      <View className="h-full rounded-full" style={{ width: `${checkInPct}%`, backgroundColor: urgent ? '#E8890A' : '#7F77DD' }} />
                    </View>
                  </View>
                );
              })()}

              <View className="rounded-2xl overflow-hidden bg-dark-text px-4 pt-3.5 pb-3">
                <View className="flex-row items-end justify-between">
                  <View>
                    <Text className="text-white text-[34px] font-bold leading-none tracking-tight">
                      {(walk.distanceMeters / 1000).toFixed(2)}
                    </Text>
                    <Text className="text-white/50 text-[11px] font-semibold mt-1">KM WALKED</Text>
                  </View>
                  {navRemainingMeters > 0 && (
                    <View className="items-end">
                      <Text className="text-white text-lg font-bold leading-none">{formatNavDistance(navRemainingMeters)}</Text>
                      <Text className="text-white/50 text-[10px] font-semibold mt-1">REMAINING</Text>
                    </View>
                  )}
                </View>
                <View className="flex-row mt-3.5" style={{ borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.12)' }}>
                  {[
                    { label: 'TIME', value: timer },
                    { label: 'PACE', value: formatPace(walk.distanceMeters, elapsedSeconds) },
                    { label: 'ETA', value: navRemainingSeconds > 0 ? formatNavDuration(navRemainingSeconds) : '—' },
                  ].map(({ label, value }, i) => (
                    <View key={label} className="flex-1 items-center pt-2.5" style={i > 0 ? { borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.12)' } : undefined}>
                      <Text className="text-white text-[15px] font-bold leading-none">{value}</Text>
                      <Text className="text-white/50 text-[10px] font-semibold mt-1 leading-none">{label}</Text>
                    </View>
                  ))}
                </View>
              </View>

              <Pressable
                onPress={handleToggleSafePlaces}
                className="w-full h-9 rounded-[10px] flex-row items-center justify-center gap-1.5 border"
                style={{
                  backgroundColor: showSafePlaces ? '#534AB7' : '#F6F6FA',
                  borderColor: showSafePlaces ? '#534AB7' : '#E0E0E8',
                }}
              >
                <Svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={showSafePlaces ? 'white' : '#534AB7'} strokeWidth={2}>
                  <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
                </Svg>
                <Text className="text-xs font-semibold" style={{ color: showSafePlaces ? 'white' : '#534AB7' }}>
                  {showSafePlaces ? 'Hide safe places' : 'Show safe places nearby'}
                </Text>
              </Pressable>

              <View className="flex-row items-center gap-2.5">
                <SosButton onActivated={handleSOS} />
                <View className="gap-1.5" style={{ flex: 1, height: 84 }}>
                  <Pressable
                    onPress={() => setShowHelpMenu(true)}
                    className="rounded-xl flex-row items-center justify-center gap-1.5 border"
                    style={{ backgroundColor: '#FFF8EC', borderColor: '#F5DFB0', flex: 1 }}
                  >
                    <Svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="#7A5400" strokeWidth={2.2}>
                      <Circle cx={12} cy={12} r={10} /><Path d="M12 8v4" /><Path d="M12 16h.01" />
                    </Svg>
                    <Text className="text-[13px] font-semibold" style={{ color: '#7A5400' }}>I feel uneasy</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setShowEndConfirm(true)}
                    className="rounded-xl bg-gray-bg border border-gray-border items-center justify-center"
                    style={{ flex: 1 }}
                  >
                    <Text className="text-[13px] font-medium text-gray-text">End walk</Text>
                  </Pressable>
                </View>
              </View>
              <Text className="text-[10px] text-[#AAAABC] text-center" style={{ marginTop: -6 }}>
                Hold SOS 3s to alert your contacts
              </Text>
            </ScrollView>
          )}

          {!isActive && showIdleContent && (
            <View className="px-4 pt-1 gap-2.5">
              {destSelected && destinationCoords ? (
                <View className="flex-row items-center gap-2 bg-gray-bg rounded-2xl px-3.5" style={{ height: 50 }}>
                  <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#534AB7" strokeWidth={2.2}>
                    <Path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><Circle cx={12} cy={10} r={3} />
                  </Svg>
                  <Text className="flex-1 text-sm font-semibold text-dark-text" numberOfLines={1}>{destinationText}</Text>
                  {!routeLoading && routeDistance && routeDuration && (
                    <Text className="text-xs text-[#6F6F84] font-medium">
                      {formatNavDistance(routeDistance)} · {formatNavDuration(routeDuration)}
                    </Text>
                  )}
                  <Pressable onPress={clearDestination} accessibilityLabel="Clear destination" className="w-7 h-7 rounded-full bg-gray-border items-center justify-center">
                    <Svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth={2.5}>
                      <Path d="M18 6 6 18M6 6l12 12" />
                    </Svg>
                  </Pressable>
                </View>
              ) : (
                <View>
                  <View className="flex-row items-center gap-2.5 bg-gray-bg rounded-2xl px-3.5" style={{ height: 50 }}>
                    <Svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="#888899" strokeWidth={2}>
                      <Circle cx={11} cy={11} r={7} /><Path d="m21 21-4.3-4.3" />
                    </Svg>
                    <TextInput
                      placeholder="Where are you going?"
                      placeholderTextColor="#888899"
                      value={destinationText}
                      onChangeText={(v) => { handleDestinationInput(v); fetchSuggestions(v); }}
                      onFocus={() => setIdleOpen(true)}
                      className="flex-1 text-[15px] text-dark-text"
                    />
                    {destinationText.length > 0 && (
                      <Pressable onPress={() => { handleDestinationInput(''); setSuggestions([]); }} accessibilityLabel="Clear">
                        <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="#888899" strokeWidth={2.5}>
                          <Path d="M18 6 6 18M6 6l12 12" />
                        </Svg>
                      </Pressable>
                    )}
                  </View>
                  {suggestions.length > 0 && (
                    <View className="absolute left-0 right-0 bottom-full mb-2 bg-white rounded-2xl border border-gray-border overflow-hidden">
                      {suggestions.map((s, i) => {
                        const sub = s.place_name.startsWith(s.text) ? s.place_name.slice(s.text.length + 2) : s.place_name;
                        return (
                          <Pressable
                            key={s.id}
                            onPress={() => handleSuggestionSelect(s)}
                            className="w-full flex-row items-start gap-3 px-3.5 py-3"
                            style={i < suggestions.length - 1 ? { borderBottomWidth: 1, borderBottomColor: '#F0F0F4' } : undefined}
                          >
                            <Svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="#888899" strokeWidth={2} style={{ marginTop: 2 }}>
                              <Path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><Circle cx={12} cy={10} r={3} />
                            </Svg>
                            <View className="flex-1 min-w-0">
                              <Text className="text-sm font-semibold text-dark-text" numberOfLines={1}>{s.text}</Text>
                              {!!sub && <Text className="text-[11px] text-gray-text mt-0.5" numberOfLines={1}>{sub}</Text>}
                            </View>
                          </Pressable>
                        );
                      })}
                    </View>
                  )}
                </View>
              )}

              <Pressable onPress={handleStart} className="w-full h-[50px] rounded-2xl items-center justify-center overflow-hidden">
                <LinearGradient colors={['#7F77DD', '#534AB7']} style={{ position: 'absolute', inset: 0 }} />
                <Text className="text-white font-bold text-[15px]">Start walk</Text>
              </Pressable>

              <View className="flex-row gap-2">
                <View className="flex-1 bg-[#F6F6FA] rounded-2xl py-3 items-center gap-0.5 border border-[#EEEEF4]">
                  <Text className="text-xl font-bold text-dark-text leading-none">{stats.data?.walks ?? '—'}</Text>
                  <Text className="text-[10px] text-[#999AAA] font-medium text-center leading-tight">Walks{'\n'}this month</Text>
                </View>
                <View className="flex-1 bg-[#F6F6FA] rounded-2xl py-3 items-center gap-0.5 border border-[#EEEEF4]">
                  <Text className="text-xl font-bold text-dark-text leading-none">{stats.data?.contacts ?? '—'}</Text>
                  <Text className="text-[10px] text-[#999AAA] font-medium text-center leading-tight">Trusted{'\n'}contacts</Text>
                </View>
                <View className="flex-1 bg-[#F0FBF1] rounded-2xl py-3 items-center gap-0.5 border border-[#D4EDDA]">
                  <View className="w-5 h-5 rounded-full bg-status-safe items-center justify-center mb-0.5">
                    <Svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={3}>
                      <Polyline points="20 6 9 17 4 12" />
                    </Svg>
                  </View>
                  <Text className="text-[10px] text-status-safe font-semibold text-center leading-tight">You&apos;re{'\n'}safe</Text>
                </View>
              </View>
            </View>
          )}
        </Animated.View>
      </View>

      <DiscreetHelpMenu
        isOpen={showHelpMenu}
        shareUrl={walk.shareToken ? buildShareUrl(walk.shareToken) : null}
        onClose={() => setShowHelpMenu(false)}
        onSOS={() => { setShowHelpMenu(false); handleSOS(); }}
        onFeelingUneasy={() => { setShowHelpMenu(false); handleFeelingUneasy(); }}
        onShowSafePlaces={() => { setShowHelpMenu(false); if (!showSafePlaces) handleToggleSafePlaces(); }}
      />

      <ConfirmDialog
        isOpen={showEndConfirm}
        onClose={() => setShowEndConfirm(false)}
        onConfirm={handleEnd}
        title="End walk?"
        body="Your session will be saved to history."
        confirmLabel="End walk"
      />
    </View>
  );
}
