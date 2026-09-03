import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Share, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { differenceInSeconds } from 'date-fns';
import Toast from 'react-native-toast-message';
import { useQuery } from '@tanstack/react-query';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { useWalkStore } from '../../store/walkStore';
import { useGeolocation } from '../../hooks/useGeolocation';
import { useCheckIn } from '../../hooks/useCheckIn';
import { useNavigation } from '../../hooks/useNavigation';
import { formatNavDistance, humanizeInstruction } from '../../services/navigation';
import { formatPace, formatArrivalClock } from '../../services/eta';
import { getNearbyPlaces, type SafePlace } from '../../services/safePlaces';
import { buildShareUrl, MISSED_CHECKINS_THRESHOLD, triggerMissedCheckInAlert, triggerSOS } from '../../services/alert';
import { dismissWalkNotification, showWalkNotification, updateWalkNotification } from '../../services/sosNotification';
import { getDirections, searchOne } from '../../services/directions';
import { withTimeout } from '../../services/withTimeout';
import { MapView, type MapViewHandle } from '../../components/map/MapView';
import { useSettingsPrefs } from '../../components/account/SettingsPrefs';
import { HomeIdle } from '../../components/home/HomeIdle';
import { SosButton } from '../../components/walk/SosButton';
import { CheckInOverlay } from '../../components/walk/CheckInOverlay';
import { SosOverlay } from '../../components/walk/SosOverlay';
import { ArrivalPrompt } from '../../components/walk/ArrivalPrompt';
import { DiscreetHelpMenu } from '../../components/walk/DiscreetHelpMenu';
import { ManeuverIcon } from '../../components/walk/ManeuverIcon';
import { OneHandedScreen } from '../../components/walk/OneHandedScreen';
import { EndWalkSheet } from '../../components/walk/EndWalkSheet';
import type { LatLng, RecentDestination, TrustedContact } from '../../types';

// Dark bottom bar height (arrival info + I'm safe/SOS row) — idle uses no
// sheet at all, and the active bar is a fixed height, not a draggable sheet.
const BOTTOM_BAR_H = 172;

// ── On-standby contacts (shares the Contacts screen's query/cache) ─────────────
function useStandbyContacts(userId: string | undefined) {
  return useQuery({
    queryKey: ['contacts', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from('trusted_contacts')
        .select('*')
        .eq('user_id', userId!)
        .order('created_at');
      return (data ?? []) as TrustedContact[];
    },
  });
}

// ── Recent destinations (Home's quick-tap glance list) — distinct destinations
// from past walks, each carrying its last known distance/duration so a row
// can show "9 min" without re-fetching directions just to render the list. ────
function useHomeRecents(userId: string | undefined) {
  return useQuery({
    queryKey: ['home-recents', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from('walk_sessions')
        .select('destination, destination_address, distance_meters, duration_seconds, started_at')
        .eq('user_id', userId!)
        .not('destination', 'is', null)
        .order('started_at', { ascending: false })
        .limit(20);
      const seen = new Set<string>();
      const recents: RecentDestination[] = [];
      for (const row of data ?? []) {
        const dest = row.destination as string | null;
        if (!dest || seen.has(dest)) continue;
        seen.add(dest);
        recents.push({
          key: dest,
          name: dest.split(',')[0],
          // Older rows predate the destination_address column — fall back
          // to the name so the subtitle is never blank.
          sub: (row.destination_address as string | null) || dest,
          lastDistanceMeters: row.distance_meters,
          lastDurationSeconds: row.duration_seconds,
        });
        if (recents.length >= 3) break;
      }
      return recents;
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
  const { prefs } = useSettingsPrefs();
  const {
    walk, endWalk, setLocation, setStatus, setEscalationStage,
    routeCoords, destinationCoords, addVisitedPoint,
    navSteps, navStepIndex, navRemainingMeters, navRemainingSeconds,
    isOffRoute, isRerouting, sharedContactIds, checkInsCompleted, incrementCheckIns, incrementCheckInsTriggered, markSOS,
    missedCheckInsInRow, incrementMissedCheckIns, resetMissedCheckIns,
    sosContacts, setSosContacts,
    nearDestination, setNearDestination,
    setDestination, setDestinationCoords, setRouteCoords, setNavSteps,
    setDistance, setRouteDurationSeconds, setAlternateRouteCoords,
  } = useWalkStore();
  const { location, startTracking, stopTracking } = useGeolocation();
  const standbyContacts = useStandbyContacts(user?.id);
  const homeRecents = useHomeRecents(user?.id);
  const [pickingRecentKey, setPickingRecentKey] = useState<string | null>(null);
  const { seconds: elapsedSeconds } = useSessionTimer(walk.startedAt ? new Date(walk.startedAt) : null);

  const isActive = !!walk.sessionId;
  useNavigation(isActive);

  // Lock-screen SOS notification tracks the walk itself, not this screen —
  // shown whenever a walk is active (including on a fresh app launch that
  // resumes a persisted walk), dismissed the moment it ends.
  useEffect(() => {
    if (isActive) {
      showWalkNotification(walk.destination);
    } else {
      dismissWalkNotification();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [endingWalk, setEndingWalk] = useState(false);
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [findingAlternate, setFindingAlternate] = useState(false);
  // Shared with the lock-screen notification path — an SOS armed there while
  // Home isn't focused still needs to render here the moment the app reopens.
  const showSosOverlay = walk.status === 'sos_triggered';

  const [followUser, setFollowUser] = useState(true);
  // The bottom sheet's real height varies with device inset (3-button nav
  // bars eat extra space the BOTTOM_BAR_H estimate doesn't know about) and
  // with which content it's showing (arrival prompt vs. off-route vs. normal
  // nav card) — floating controls anchored to a fixed guess could end up
  // rendering underneath it. Measure it and anchor to that instead.
  const [bottomSheetHeight, setBottomSheetHeight] = useState(BOTTOM_BAR_H);

  const [showSafePlaces, setShowSafePlaces] = useState(false);
  const [safePlaces, setSafePlaces] = useState<SafePlace[]>([]);
  const [safePlacesLoading, setSafePlacesLoading] = useState(false);

  const [showHelpMenu, setShowHelpMenu] = useState(false);
  const [oneHandedMode, setOneHandedMode] = useState(false);

  const [currentLoc, setCurrentLoc] = useState<LatLng | null>(walk.currentLocation);

  const locRef = useRef<LatLng | null>(null);
  const mapRef = useRef<MapViewHandle>(null);

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
    // This insert is what feeds the trusted-contact web page's live map —
    // it had no error handling at all, so it could (and did) fail on every
    // single walk with zero visibility.
    supabase.from('location_pings').insert({
      session_id: walk.sessionId, user_id: user?.id,
      lat: location.lat, lng: location.lng,
      bearing: location.bearing, speed: location.speed,
    }).then(({ error }) => {
      if (error) console.warn('[Trayl] location_pings insert failed:', error.message, error.details, error.hint);
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
    resetMissedCheckIns();
    // Triggered and completed increment together — this build doesn't yet
    // track a genuinely missed (never-answered) check-in as a terminal state,
    // so "answered" and "due" stay in lockstep rather than risking a
    // misleading "4 of 3 answered" if an early proactive check-in outpaced
    // the interval that would have triggered it.
    incrementCheckIns();
    incrementCheckInsTriggered();
    Toast.show({ type: 'success', text1: "Great, glad you're safe." });
  };

  // Miss MISSED_CHECKINS_THRESHOLD check-ins in a row and contacts actually
  // get alerted — this used to be a promise the walk-confirm screen made in
  // copy only.
  const handleCheckInExpired = async () => {
    incrementCheckInsTriggered();
    incrementMissedCheckIns();
    const missedNow = missedCheckInsInRow + 1;
    if (missedNow < MISSED_CHECKINS_THRESHOLD) {
      Toast.show({ type: 'info', text1: "Missed that one — we'll ask again shortly." });
      return;
    }
    resetMissedCheckIns();
    if (!user || !walk.sessionId) return;
    const { alertError } = await triggerMissedCheckInAlert({
      sessionId: walk.sessionId,
      userId: user.id,
      userName: profile?.full_name || user.email || 'Someone',
      shareToken: walk.shareToken,
    });
    Toast.show(
      alertError
        ? { type: 'error', text1: `Missed ${MISSED_CHECKINS_THRESHOLD} check-ins — couldn't alert contacts.`, text2: alertError }
        : { type: 'info', text1: `Missed ${MISSED_CHECKINS_THRESHOLD} check-ins in a row.`, text2: 'Your contacts have been alerted.' },
    );
  };

  // ── Manual "Rejoin route" — off-route already auto-reroutes after a few
  // GPS readings, but the Off-route sheet also offers an immediate, explicit
  // recompute so the walker isn't just waiting on the grace period. ────────
  const handleRejoinRoute = async () => {
    if (!currentLoc || !destinationCoords) return;
    const result = await getDirections([currentLoc.lng, currentLoc.lat], destinationCoords);
    if (!result) { Toast.show({ type: 'error', text1: "Couldn't find a new route." }); return; }
    setRouteCoords(result.geometry);
    setNavSteps(result.steps);
    setDistance(result.totalDistance);
    setRouteDurationSeconds(result.totalDuration);
    Toast.show({ type: 'success', text1: 'Route updated.' });
  };

  // ── Reroute button (next to SOS while on-route) — this one is about
  // offering a DIFFERENT way to the destination, not recovering from a wrong
  // turn. Mapbox's own alternate for this origin/destination is the only
  // honest candidate for "another route" — swap to it (with its own real
  // turn-by-turn, not just a repositioned line) and demote the old primary
  // to the thin secondary line so it's still visible as a fallback.
  const handleTryAlternateRoute = async () => {
    if (!currentLoc || !destinationCoords || findingAlternate) return;
    setFindingAlternate(true);
    try {
      const result = await getDirections([currentLoc.lng, currentLoc.lat], destinationCoords);
      if (!result) { Toast.show({ type: 'error', text1: "Couldn't find a route." }); return; }
      if (!result.alternate) {
        Toast.show({ type: 'info', text1: 'No alternate route available.', text2: "This is the only way Mapbox knows to get there." });
        return;
      }
      setRouteCoords(result.alternate.geometry);
      setAlternateRouteCoords(result.geometry);
      setNavSteps(result.alternate.steps);
      setDistance(result.alternate.totalDistance);
      setRouteDurationSeconds(result.alternate.totalDuration);
      Toast.show({ type: 'success', text1: 'Switched to an alternate route.' });
    } finally {
      setFindingAlternate(false);
    }
  };

  const handleShareLiveLink = () => {
    const url = walk.shareToken ? buildShareUrl(walk.shareToken) : null;
    if (!url) { Toast.show({ type: 'error', text1: 'No share link available yet.' }); return; }
    Share.share({ title: 'Track my walk on Trayl', message: url }).catch(() => {});
  };

  // ── Quick-pick a recent destination straight from Home ────────────────────
  const handlePickRecent = async (recent: RecentDestination) => {
    if (!currentLoc) {
      Toast.show({ type: 'error', text1: 'Enable location to see your route.' });
      return;
    }
    setPickingRecentKey(recent.key);
    try {
      const center = await searchOne(recent.sub, [currentLoc.lng, currentLoc.lat]);
      if (!center) {
        Toast.show({ type: 'error', text1: "Couldn't find that place anymore." });
        return;
      }
      const result = await getDirections([currentLoc.lng, currentLoc.lat], center);
      if (!result) {
        Toast.show({ type: 'error', text1: "Couldn't find a walking route there." });
        return;
      }
      setDestination(recent.name);
      setDestinationCoords(center);
      setRouteCoords(result.geometry);
      setAlternateRouteCoords(result.alternateGeometry);
      setNavSteps(result.steps);
      setDistance(result.totalDistance);
      setRouteDurationSeconds(result.totalDuration);
      router.push('/walk-confirm');
    } finally {
      setPickingRecentKey(null);
    }
  };

  // ── End walk ──────────────────────────────────────────────────────────────
  const handleEnd = async () => {
    if (endingWalk) return;
    setEndingWalk(true);
    setShowEndConfirm(false);
    stopTracking();
    if (walk.sessionId) {
      const secs = walk.startedAt ? differenceInSeconds(new Date(), new Date(walk.startedAt)) : 0;
      try {
        // A stalled connection can leave this await neither resolving nor
        // rejecting, which used to leave the walk stuck "active" forever
        // with no error and no way out — see withTimeout.ts. Ending the
        // walk locally must never depend on this call actually landing.
        await withTimeout(
          supabase.from('walk_sessions').update({
            status: 'completed',
            ended_at: new Date().toISOString(),
            duration_seconds: secs,
            distance_meters: Math.round(walk.distanceMeters),
          }).eq('id', walk.sessionId),
          10000,
        );
      } catch {
        Toast.show({ type: 'error', text1: "Couldn't sync this walk", text2: "It ended on your device but may not be saved to history." });
      }
    }
    endWalk(watchingContacts.map((c) => c.full_name.split(' ')[0])); // snapshots lastWalkSummary in the store before resetting
    setCurrentLoc(null);
    locRef.current = null;
    setFollowUser(true);
    setShowSafePlaces(false);
    setSafePlaces([]);
    setShowHelpMenu(false);
    setOneHandedMode(false);
    setNearDestination(false);
    setEndingWalk(false);
    startTracking();
    router.replace('/walk-summary');
  };

  // ── SOS ───────────────────────────────────────────────────────────────────
  const handleSOS = async () => {
    if (!user || !walk.sessionId) return;
    setStatus('sos_triggered');
    setEscalationStage(2);
    markSOS();
    // Show the overlay (Cancel SOS / Call 911 are already live) before any
    // network call — a stalled connection must never delay this, and used
    // to leave the whole SOS flow silent with no visible feedback at all
    // while these awaits hung. See withTimeout.ts. setStatus above already
    // makes showSosOverlay true (it's derived from walk.status).
    setSosContacts([]);

    const { contacts, alertError } = await triggerSOS({
      sessionId: walk.sessionId,
      userId: user.id,
      userName: profile?.full_name || user.email || 'Someone',
      shareToken: walk.shareToken,
    });
    setSosContacts(contacts);
    if (alertError) {
      Toast.show({ type: 'error', text1: alertError, text2: 'Call your contacts directly if you can.' });
    }
  };

  const handleCancelSOS = () => {
    setShowCheckIn(false);
    setEscalationStage(0);
    setStatus('active');
    setSosContacts([]);
    resetCheckIn();
    if (walk.sessionId) supabase.from('walk_sessions').update({ status: 'active' }).eq('id', walk.sessionId);
    Toast.show({ type: 'success', text1: "Glad you're safe. Emergency cancelled." });
  };

  const checkInMin = Math.floor(checkInSecondsLeft / 60);
  const checkInSec = checkInSecondsLeft % 60;
  const currentStep = navSteps?.[navStepIndex];
  const watchingContacts = sharedContactIds
    ? (standbyContacts.data ?? []).filter((c) => sharedContactIds.includes(c.id))
    : (standbyContacts.data ?? []);
  const primaryContact = standbyContacts.data?.find((c) => c.is_primary) ?? standbyContacts.data?.[0];
  const walkProgressPct = navRemainingMeters > 0
    ? Math.max(2, Math.min(100, (walk.distanceMeters / (walk.distanceMeters + navRemainingMeters)) * 100))
    : 100;
  const elapsedLabel = elapsedSeconds < 60 ? '< 1 min' : `${Math.round(elapsedSeconds / 60)} min`;

  // Keep the lock-screen notification showing live turn-by-turn, same as the
  // in-app nav card — not just a static "Trayl is tracking your walk".
  useEffect(() => {
    if (!isActive || !currentStep) return;
    updateWalkNotification(currentStep, navRemainingMeters, navRemainingSeconds);
  }, [isActive, currentStep, navRemainingMeters, navRemainingSeconds]);

  return (
    <View className="flex-1 bg-[#EEF1F6]">
      {showCheckIn && !showSosOverlay && (
        <CheckInOverlay
          contactName={primaryContact?.full_name.split(' ')[0] ?? null}
          onSafe={handleSafe}
          onSOS={() => { setShowCheckIn(false); handleSOS(); }}
          onExpire={handleCheckInExpired}
        />
      )}
      {showSosOverlay && <SosOverlay onCancel={handleCancelSOS} contacts={sosContacts} />}

      {!isActive && (
        <HomeIdle
          currentLoc={currentLoc}
          standbyContacts={standbyContacts.data}
          destination={walk.destination}
          recents={homeRecents.data}
          pickingRecentKey={pickingRecentKey}
          onPickRecent={handlePickRecent}
        />
      )}

      {isActive && oneHandedMode && (
        <OneHandedScreen
          currentStep={currentStep}
          nextStep={navSteps && navStepIndex < navSteps.length - 1 ? navSteps[navStepIndex + 1] : null}
          navRemainingMeters={navRemainingMeters}
          navRemainingSeconds={navRemainingSeconds}
          watchingContacts={watchingContacts}
          onShowMap={() => setOneHandedMode(false)}
          onSOS={handleSOS}
          holdSeconds={prefs.sosHoldSeconds}
        />
      )}

      {isActive && !oneHandedMode && (
      <View style={{ flex: 1 }}>
        <MapView
          ref={mapRef}
          location={currentLoc}
          heading={location?.bearing}
          routeCoords={routeCoords}
          destinationCoords={destinationCoords}
          safePlaces={showSafePlaces ? safePlaces : []}
          isActive={isActive}
          followUser={followUser}
          onUserInteract={() => setFollowUser(false)}
        />

        {/* ── Turn banner — black floating card, exit button built in ────── */}
        <View className="absolute left-0 right-0 px-3" style={{ top: insets.top + 10, zIndex: 20 }}>
          {isRerouting ? (
            <View
              className="rounded-2xl flex-row items-center overflow-hidden"
              style={{ backgroundColor: '#0A0A0A', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 6 }}
            >
              <View className="items-center justify-center" style={{ width: 54, alignSelf: 'stretch' }}>
                <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.5}>
                  <Path d="M21.5 2v6h-6" /><Path d="M21.34 15.57a10 10 0 1 1-.57-8.38" />
                </Svg>
              </View>
              <View className="flex-1 py-2.5 pr-4">
                <Text style={{ fontFamily: 'Archivo_700Bold', fontSize: 14, color: '#fff' }}>Rerouting…</Text>
                <Text style={{ fontFamily: 'Archivo_400Regular', fontSize: 11, color: 'rgba(255,255,255,.55)', marginTop: 2 }}>Finding a new path for you</Text>
              </View>
            </View>
          ) : isOffRoute ? (
            <View
              className="rounded-2xl flex-row items-center overflow-hidden"
              style={{ backgroundColor: '#0A0A0A', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 6 }}
            >
              <View className="items-center justify-center" style={{ width: 54, alignSelf: 'stretch' }}>
                <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#E5342A" strokeWidth={2.5}>
                  <Path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
                  <Path d="M12 9v4" /><Path d="M12 17h.01" />
                </Svg>
              </View>
              <View className="flex-1 py-2.5 pr-4">
                <Text style={{ fontFamily: 'Archivo_700Bold', fontSize: 14, color: '#E5342A' }}>You&apos;re off your route</Text>
                <Text style={{ fontFamily: 'Archivo_400Regular', fontSize: 11, color: 'rgba(255,255,255,.55)', marginTop: 2 }}>Your contacts can see this</Text>
              </View>
              <Pressable
                onPress={() => setShowEndConfirm(true)}
                accessibilityRole="button"
                accessibilityLabel="Exit navigation"
                style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,.15)', alignItems: 'center', justifyContent: 'center', marginRight: 11 }}
              >
                <Svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3}>
                  <Path d="M18 6 6 18M6 6l12 12" />
                </Svg>
              </Pressable>
            </View>
          ) : currentStep ? (
            <View
              className="rounded-2xl overflow-hidden"
              style={{ backgroundColor: '#0A0A0A', shadowColor: '#000', shadowOpacity: 0.22, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 8 }}
            >
              <View className="flex-row items-center px-3.5 py-3.5" style={{ gap: 12 }}>
                <View style={{ width: 46, height: 46, borderRadius: 13, backgroundColor: 'rgba(255,255,255,.12)', alignItems: 'center', justifyContent: 'center' }}>
                  <ManeuverIcon type={currentStep.maneuverType} modifier={currentStep.maneuverModifier} color="#fff" size={24} />
                </View>
                <View className="flex-1 min-w-0">
                  <Text style={{ fontFamily: 'Archivo_700Bold', fontSize: 17, color: '#fff', letterSpacing: -0.3 }} numberOfLines={1}>
                    {humanizeInstruction(currentStep)}
                  </Text>
                  {currentStep.distance > 30 && (
                    <Text style={{ fontFamily: 'Archivo_400Regular', fontSize: 12.5, color: 'rgba(255,255,255,.6)', marginTop: 2 }}>
                      in {formatNavDistance(currentStep.distance)}
                      {currentStep.name ? ` · toward ${currentStep.name}` : ''}
                    </Text>
                  )}
                </View>
                <Pressable
                  onPress={() => setShowEndConfirm(true)}
                  accessibilityRole="button"
                  accessibilityLabel="Exit navigation"
                  style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,.15)', alignItems: 'center', justifyContent: 'center' }}
                >
                  <Svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3}>
                    <Path d="M18 6 6 18M6 6l12 12" />
                  </Svg>
                </Pressable>
              </View>
              {navSteps && navStepIndex < navSteps.length - 1 && navSteps[navStepIndex + 1] && (
                <>
                  <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,.12)', marginHorizontal: 14 }} />
                  <View className="flex-row items-center px-3.5 py-3" style={{ gap: 10 }}>
                    <ManeuverIcon
                      type={navSteps[navStepIndex + 1].maneuverType}
                      modifier={navSteps[navStepIndex + 1].maneuverModifier}
                      color="rgba(255,255,255,.5)"
                      size={16}
                    />
                    <Text style={{ flex: 1, fontFamily: 'Archivo_500Medium', fontSize: 12.5, color: 'rgba(255,255,255,.55)' }} numberOfLines={1}>
                      Then {humanizeInstruction(navSteps[navStepIndex + 1])}
                    </Text>
                    <Text style={{ fontFamily: 'Archivo_500Medium', fontSize: 12, color: 'rgba(255,255,255,.45)' }}>
                      {formatNavDistance(navSteps[navStepIndex + 1].distance)}
                    </Text>
                  </View>
                </>
              )}
            </View>
          ) : (
            <View
              className="rounded-2xl px-4 py-2.5 flex-row items-center gap-2.5"
              style={{ backgroundColor: '#0A0A0A', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 6 }}
            >
              <View className="w-7 h-7 rounded-full items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,.12)' }}>
                <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.5}>
                  <Circle cx={12} cy={12} r={10} /><Path d="M12 8v4l3 3" />
                </Svg>
              </View>
              <Text style={{ fontFamily: 'Archivo_600SemiBold', fontSize: 13, color: '#fff', flex: 1 }}>Calculating route…</Text>
              <Pressable
                onPress={() => setShowEndConfirm(true)}
                accessibilityRole="button"
                accessibilityLabel="Exit navigation"
                style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,.15)', alignItems: 'center', justifyContent: 'center' }}
              >
                <Svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3}>
                  <Path d="M18 6 6 18M6 6l12 12" />
                </Svg>
              </Pressable>
            </View>
          )}
        </View>

        {/* ── Check-in card (floating, top-left) — tap to check in early ─── */}
        {(() => {
          const urgent = checkInSecondsLeft <= 20;
          const label = checkInSecondsLeft <= 0
            ? 'now'
            : checkInSecondsLeft < 60
              ? `${checkInSecondsLeft}s`
              : `${checkInMin}:${String(checkInSec).padStart(2, '0')}`;
          return (
            <View className="absolute" style={{ top: insets.top + 136, left: 12, zIndex: 20 }}>
              <Pressable
                onPress={handleSafe}
                accessibilityRole="button"
                accessibilityLabel="Check in now"
                className="rounded-2xl bg-white px-3.5 py-2.5"
                style={{ shadowColor: '#000', shadowOpacity: 0.14, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 6 }}
              >
                <Text style={{ fontFamily: 'IBMPlexMono_500Medium', fontSize: 8, letterSpacing: 0.8, textTransform: 'uppercase', color: 'rgba(0,0,0,.42)' }}>
                  Next check-in
                </Text>
                <Text style={{ fontFamily: 'Archivo_700Bold', fontSize: 17, color: urgent ? '#E5342A' : '#0A0A0A', marginTop: 2 }}>{label}</Text>
                <Text style={{ fontFamily: 'Archivo_400Regular', fontSize: 9.5, color: 'rgba(0,0,0,.4)', marginTop: 1 }}>Tap to check in</Text>
              </Pressable>
            </View>
          );
        })()}

        {/* ── Right-edge control stack — compass, route overview, one-handed ── */}
        <View className="absolute right-4 gap-2.5" style={{ top: insets.top + 150, zIndex: 20 }}>
          <Pressable
            onPress={() => mapRef.current?.resetHeading()}
            accessibilityRole="button"
            accessibilityLabel="Reset compass to north"
            style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 5 }}
          >
            <View style={{ transform: [{ rotate: `${-(location?.bearing ?? 0)}deg` }] }}>
              <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                <Path d="M12 2 16 12 12 22 8 12Z" fill="#0A0A0A" />
                <Path d="M12 2 16 12 12 12Z" fill="#E5342A" />
              </Svg>
            </View>
          </Pressable>
          <Pressable
            onPress={() => { setFollowUser(false); mapRef.current?.showRouteOverview(); }}
            accessibilityRole="button"
            accessibilityLabel="Show whole route"
            style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 5 }}
          >
            <Svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="#0A0A0A" strokeWidth={2}>
              <Rect x={3} y={3} width={18} height={18} rx={4} />
              <Circle cx={8} cy={16} r={1.6} fill="#0A0A0A" stroke="none" />
              <Circle cx={16} cy={8} r={1.6} fill="#0A0A0A" stroke="none" />
              <Path d="M8 16 16 8" strokeDasharray="1.5,2.5" />
            </Svg>
          </Pressable>
          <Pressable
            onPress={() => setOneHandedMode(true)}
            accessibilityRole="button"
            accessibilityLabel="One-handed mode"
            style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 5 }}
          >
            <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#0A0A0A" strokeWidth={2}>
              <Rect x={6} y={2} width={12} height={20} rx={2.5} />
              <Path d="M10 19h4" />
            </Svg>
          </Pressable>
        </View>

        {/* ── Re-center pill — left edge, always available; snaps the camera
             back onto the route/user (e.g. after panning or the route-overview
             control has zoomed out) ──────────────────────────────────────── */}
        <View className="absolute left-3" style={{ bottom: bottomSheetHeight + 14, zIndex: 20 }}>
          <Pressable
            onPress={() => { setFollowUser(true); mapRef.current?.recenterOnUser(); }}
            accessibilityRole="button"
            accessibilityLabel="Re-center on my route"
            className="flex-row items-center rounded-full"
            style={{ backgroundColor: '#0A0A0A', paddingHorizontal: 14, height: 38, gap: 7, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 5 }}
          >
            <Svg width={11} height={11} viewBox="0 0 24 24" fill="#fff"><Path d="M12 2 20 20 12 16 4 20Z" /></Svg>
            <Text style={{ fontFamily: 'Archivo_600SemiBold', fontSize: 12.5, color: '#fff' }}>Re-center</Text>
          </Pressable>
        </View>

        {/* ── Safe places panel ───────────────────────────────────────────*/}
        {showSafePlaces && (
          <View className="absolute left-0 right-0 px-4" style={{ bottom: bottomSheetHeight + 8, zIndex: 20 }}>
            <View
              className="bg-white rounded-[18px] overflow-hidden"
              style={{ shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 20, shadowOffset: { width: 0, height: -4 }, elevation: 8 }}
            >
              <View className="flex-row items-center justify-between px-4 py-2.5 border-b border-gray-bg">
                <Text style={{ fontFamily: 'Archivo_700Bold', fontSize: 13, color: '#0A0A0A' }}>Nearby safe places</Text>
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

        {/* ── Bottom sheet ─────────────────────────────────────────────── */}
        <View
          className="absolute bottom-0 left-0 right-0 bg-white"
          onLayout={(e) => setBottomSheetHeight(e.nativeEvent.layout.height)}
          style={{
            borderTopLeftRadius: 22,
            borderTopRightRadius: 22,
            paddingHorizontal: 20,
            paddingTop: 10,
            paddingBottom: insets.bottom + 16,
            zIndex: 20,
            shadowColor: '#000', shadowOpacity: 0.14, shadowRadius: 24, shadowOffset: { width: 0, height: -4 }, elevation: 10,
          }}
        >
          <View style={{ width: 38, height: 4, borderRadius: 2, backgroundColor: 'rgba(0,0,0,.15)', alignSelf: 'center', marginBottom: 14 }} />

          {nearDestination ? (
            <ArrivalPrompt
              destination={walk.destination}
              timeLabel={elapsedLabel}
              distanceLabel={`${(walk.distanceMeters / 1000).toFixed(1)} km`}
              checkIns={checkInsCompleted}
              onEnd={() => { setNearDestination(false); handleEnd(); }}
            />
          ) : isOffRoute ? (
            <View>
              <Text style={{ fontFamily: 'Archivo_700Bold', fontSize: 15, color: '#0A0A0A' }}>
                {formatNavDistance(navRemainingMeters || 0)} off your planned route
              </Text>
              <Text style={{ fontFamily: 'Archivo_400Regular', fontSize: 12.5, color: 'rgba(0,0,0,.5)', marginTop: 4 }}>
                Your contacts can see this. Rejoin the route, pick a new one, or send SOS if something is wrong.
              </Text>
              <View className="flex-row items-center gap-3 mt-4">
                <Pressable
                  onPress={handleRejoinRoute}
                  style={{ flex: 1, height: 54, borderRadius: 16, backgroundColor: '#0A0A0A', alignItems: 'center', justifyContent: 'center' }}
                >
                  <Text style={{ fontFamily: 'Archivo_700Bold', fontSize: 15, color: '#fff' }}>Rejoin route</Text>
                </Pressable>
                <SosButton onActivated={handleSOS} variant="filled" holdSeconds={prefs.sosHoldSeconds} />
              </View>
            </View>
          ) : (
            <View>
              <View className="flex-row items-start justify-between">
                <View className="flex-1 min-w-0 pr-3">
                  <View className="flex-row items-center" style={{ gap: 7 }}>
                    <Text style={{ fontFamily: 'Archivo_800ExtraBold', fontSize: 24, color: '#0A0A0A', letterSpacing: -0.4 }} numberOfLines={1}>
                      {navRemainingSeconds > 0 ? `${Math.max(1, Math.round(navRemainingSeconds / 60))} min` : 'On your way'}
                    </Text>
                    <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="#0A0A0A" strokeWidth={2}>
                      <Circle cx={12} cy={4.5} r={1.8} fill="#0A0A0A" stroke="none" />
                      <Path d="M9 22l1.5-7L8 13l1-5 3-1 3 2 2 3.5M10.5 15l3.5 1 2 6" />
                    </Svg>
                  </View>
                  <Text style={{ fontFamily: 'Archivo_400Regular', fontSize: 12.5, color: 'rgba(0,0,0,.5)', marginTop: 3 }} numberOfLines={1}>
                    {navRemainingMeters > 0
                      ? `${formatNavDistance(navRemainingMeters)} · arrive ${formatArrivalClock(navRemainingSeconds)}`
                      : `${(walk.distanceMeters / 1000).toFixed(2)} km walked · ${formatPace(walk.distanceMeters, elapsedSeconds)}`}
                  </Text>
                </View>
                <View className="flex-row items-center" style={{ gap: 8 }}>
                  <Pressable
                    onPress={handleTryAlternateRoute}
                    disabled={findingAlternate}
                    accessibilityRole="button"
                    accessibilityLabel="Try an alternate route"
                    style={{ width: 42, height: 54, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(0,0,0,.12)', alignItems: 'center', justifyContent: 'center', opacity: findingAlternate ? 0.5 : 1 }}
                  >
                    {findingAlternate ? (
                      <ActivityIndicator size="small" color="#0A0A0A" />
                    ) : (
                      <Svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="#0A0A0A" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                        <Path d="M17 2.5 21 6l-4 3.5" /><Path d="M21 6H8a5 5 0 0 0-5 5v0" />
                        <Path d="M7 21.5 3 18l4-3.5" /><Path d="M3 18h13a5 5 0 0 0 5-5v0" />
                      </Svg>
                    )}
                  </Pressable>
                  <SosButton onActivated={handleSOS} variant="filled" holdSeconds={prefs.sosHoldSeconds} />
                </View>
              </View>

              <View className="rounded-full overflow-hidden mt-4" style={{ height: 4, backgroundColor: 'rgba(0,0,0,.08)' }}>
                <View className="h-full rounded-full" style={{ width: `${walkProgressPct}%`, backgroundColor: '#0A0A0A' }} />
              </View>

              <View className="flex-row items-center justify-between mt-4">
                <Pressable
                  onPress={() => setShowHelpMenu(true)}
                  accessibilityRole="button"
                  accessibilityLabel="More safety options"
                  className="flex-1 min-w-0"
                >
                  {watchingContacts.length === 0 ? (
                    <Text style={{ fontFamily: 'Archivo_400Regular', fontSize: 12, color: 'rgba(0,0,0,.5)' }}>No one notified — add a trusted contact</Text>
                  ) : (
                    watchingContacts.slice(0, 2).map((c) => (
                      <View key={c.id} className="flex-row items-center" style={{ gap: 6, marginTop: 2 }}>
                        <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#0A0A0A' }} />
                        <Text style={{ fontFamily: 'Archivo_500Medium', fontSize: 12.5, color: '#0A0A0A' }} numberOfLines={1}>
                          {c.full_name.split(' ')[0]} notified
                        </Text>
                      </View>
                    ))
                  )}
                </Pressable>
                <Pressable
                  onPress={handleShareLiveLink}
                  accessibilityRole="button"
                  accessibilityLabel="Share live link"
                  style={{ borderRadius: 99, borderWidth: 1, borderColor: 'rgba(0,0,0,.15)', paddingHorizontal: 14, height: 34, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Text style={{ fontFamily: 'Archivo_600SemiBold', fontSize: 11.5, color: '#0A0A0A' }}>Share live link</Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>
      </View>
      )}

      <DiscreetHelpMenu
        isOpen={showHelpMenu}
        shareUrl={walk.shareToken ? buildShareUrl(walk.shareToken) : null}
        onClose={() => setShowHelpMenu(false)}
        onSOS={() => { setShowHelpMenu(false); handleSOS(); }}
        onFeelingUneasy={() => { setShowHelpMenu(false); handleFeelingUneasy(); }}
        onShowSafePlaces={() => { setShowHelpMenu(false); if (!showSafePlaces) handleToggleSafePlaces(); }}
      />

      <EndWalkSheet
        isOpen={showEndConfirm}
        onClose={() => setShowEndConfirm(false)}
        onConfirm={handleEnd}
        destination={walk.destination}
        remainingMeters={navRemainingMeters}
        contactNames={watchingContacts.map((c) => c.full_name.split(' ')[0])}
      />
    </View>
  );
}
