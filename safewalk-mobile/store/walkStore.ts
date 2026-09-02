import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ActiveWalkState, LatLng, WalkStatus } from '../types';
import type { RouteStep } from '../services/directions';

export interface WalkSummary {
  distanceMeters: number;
  durationSeconds: number;
  destination: string | null;
  visitedPath: [number, number][];
  // The planned route, so the summary map can show it alongside the actual
  // walked trail (e.g. how far off you ended up, or exactly the same line
  // if you completed it) — captured before endWalk() resets routeCoords.
  plannedRouteCoords: [number, number][] | null;
  destinationCoords: [number, number] | null;
  // Real, counted data captured the instant the walk ends — never fabricated
  // safety claims. endedEarly / remainingMetersAtEnd come from the live nav
  // state at the moment of ending; watchedByNames is passed in by the caller
  // (home.tsx already resolves contact names, the store only holds ids).
  endedEarly: boolean;
  remainingMetersAtEnd: number;
  watchedByNames: string[];
  hadSOS: boolean;
  checkInsAnswered: number;
  checkInsTriggered: number;
  sessionId: string | null;
}

interface WalkStore {
  walk: ActiveWalkState;
  checkInSecondsLeft: number;
  // How many check-ins have been answered this walk — real, counted data for
  // the Arrived sheet's stat strip (never a fabricated safety number).
  checkInsCompleted: number;
  // How many times the check-in overlay was actually shown this walk — the
  // denominator for the summary's "X of Y answered" stat.
  checkInsTriggered: number;
  // Whether SOS was triggered at any point this walk — real, counted.
  hadSOS: boolean;
  // Contacts notified by the current SOS, if any — lives in the shared store
  // (not component state) so an SOS fired from the lock-screen notification
  // while Home isn't the focused screen still has something for Home to show
  // once the app is reopened. Overlay visibility itself is walk.status ===
  // 'sos_triggered', which is already shared state.
  sosContacts: { name: string; phone: string }[];

  // Route geometry — [lng, lat][] (Mapbox convention)
  routeCoords: [number, number][] | null;
  // Destination pin — [lng, lat] (Mapbox convention)
  destinationCoords: [number, number] | null;
  // The full geocoded address (e.g. "41 Ashfield Terrace, Winnipeg, MB…") —
  // walk.destination stays the short name ("Home"); this is the subtitle
  // shown underneath it on the Walk Detail screen and the map's dest label.
  destinationFullAddress: string | null;
  // Mapbox's estimated walking duration for the current route, in seconds —
  // powers the ETA shown on the walk-confirm screen before a walk starts.
  routeDurationSeconds: number | null;
  // A second Mapbox route option, drawn as a thin "alternate" line on the
  // Route Preview screen — purely a secondary visual reference, not a
  // computed safety comparison.
  alternateRouteCoords: [number, number][] | null;
  // Per-walk prefs chosen on the Plan-your-walk screen before starting.
  // null sharedContactIds means "all trusted contacts" (the prior behavior).
  sharedContactIds: string[] | null;
  checkInIntervalSeconds: number;
  // Actual GPS trail walked so far this session — [lng, lat][], distinct from
  // routeCoords (the planned route). Powers the Strava-style summary map.
  visitedPath: [number, number][];
  // Snapshot captured by endWalk() right before it resets the active walk —
  // the walk-summary screen reads this instead of taking router params.
  lastWalkSummary: WalkSummary | null;

  // Turn-by-turn navigation state
  navSteps: RouteStep[] | null;
  navStepIndex: number;
  navRemainingMeters: number;
  navRemainingSeconds: number;
  isOffRoute: boolean;
  isRerouting: boolean;
  nearDestination: boolean;

  // Setters
  setWalk: (walk: Partial<ActiveWalkState>) => void;
  setLocation: (location: LatLng) => void;
  setDistance: (meters: number) => void;
  setDestination: (destination: string | null) => void;
  setStatus: (status: WalkStatus) => void;
  setEscalationStage: (stage: ActiveWalkState['escalationStage']) => void;
  setCheckInTimer: (seconds: number) => void;
  incrementCheckIns: () => void;
  incrementCheckInsTriggered: () => void;
  markSOS: () => void;
  setSosContacts: (contacts: { name: string; phone: string }[]) => void;
  setRouteCoords: (coords: [number, number][] | null) => void;
  setDestinationCoords: (coords: [number, number] | null) => void;
  setDestinationFullAddress: (address: string | null) => void;
  setRouteDurationSeconds: (seconds: number | null) => void;
  setAlternateRouteCoords: (coords: [number, number][] | null) => void;
  setSharedContactIds: (ids: string[] | null) => void;
  setCheckInIntervalSeconds: (seconds: number) => void;
  addVisitedPoint: (coord: [number, number]) => void;
  setNavSteps: (steps: RouteStep[] | null) => void;
  setNavStepIndex: (i: number) => void;
  setNavRemaining: (meters: number, seconds: number) => void;
  setOffRoute: (v: boolean) => void;
  setRerouting: (v: boolean) => void;
  setNearDestination: (v: boolean) => void;
  startWalk: (sessionId: string, shareToken: string) => void;
  endWalk: (watchedByNames?: string[]) => void;
}

const EMPTY_WALK: ActiveWalkState = {
  sessionId: null,
  shareToken: null,
  status: 'active',
  startedAt: null,
  destination: null,
  currentLocation: null,
  distanceMeters: 0,
  escalationStage: 0,
};

const NAV_RESET = {
  navSteps: null,
  navStepIndex: 0,
  navRemainingMeters: 0,
  navRemainingSeconds: 0,
  isOffRoute: false,
  isRerouting: false,
  nearDestination: false,
};

export const useWalkStore = create<WalkStore>()(
  persist(
    (set) => ({
      walk: EMPTY_WALK,
      checkInSecondsLeft: 90,
      checkInsCompleted: 0,
      checkInsTriggered: 0,
      hadSOS: false,
      sosContacts: [],
      routeCoords: null,
      destinationCoords: null,
      destinationFullAddress: null,
      routeDurationSeconds: null,
      alternateRouteCoords: null,
      sharedContactIds: null,
      checkInIntervalSeconds: 90,
      visitedPath: [],
      lastWalkSummary: null,
      ...NAV_RESET,

      setWalk:            (partial) => set((s) => ({ walk: { ...s.walk, ...partial } })),
      setLocation:        (location) => set((s) => ({ walk: { ...s.walk, currentLocation: location } })),
      setDistance:        (meters) => set((s) => ({ walk: { ...s.walk, distanceMeters: meters } })),
      setDestination:     (destination) => set((s) => ({ walk: { ...s.walk, destination } })),
      setStatus:          (status) => set((s) => ({ walk: { ...s.walk, status } })),
      setEscalationStage: (stage) => set((s) => ({ walk: { ...s.walk, escalationStage: stage } })),
      setCheckInTimer:    (seconds) => set({ checkInSecondsLeft: seconds }),
      incrementCheckIns:  () => set((s) => ({ checkInsCompleted: s.checkInsCompleted + 1 })),
      incrementCheckInsTriggered: () => set((s) => ({ checkInsTriggered: s.checkInsTriggered + 1 })),
      markSOS:            () => set({ hadSOS: true }),
      setSosContacts:     (contacts) => set({ sosContacts: contacts }),
      setRouteCoords:     (coords) => set({ routeCoords: coords }),
      setDestinationCoords: (coords) => set({ destinationCoords: coords }),
      setDestinationFullAddress: (address) => set({ destinationFullAddress: address }),
      setRouteDurationSeconds: (seconds) => set({ routeDurationSeconds: seconds }),
      setAlternateRouteCoords: (coords) => set({ alternateRouteCoords: coords }),
      setSharedContactIds: (ids) => set({ sharedContactIds: ids }),
      setCheckInIntervalSeconds: (seconds) => set({ checkInIntervalSeconds: seconds }),
      addVisitedPoint:    (coord) => set((s) => ({ visitedPath: [...s.visitedPath, coord] })),
      setNavSteps:        (steps) => set({ navSteps: steps }),
      setNavStepIndex:    (i) => set({ navStepIndex: i }),
      setNavRemaining:    (meters, seconds) => set({ navRemainingMeters: meters, navRemainingSeconds: seconds }),
      setOffRoute:        (v) => set({ isOffRoute: v }),
      setRerouting:       (v) => set({ isRerouting: v }),
      setNearDestination: (v) => set({ nearDestination: v }),

      startWalk: (sessionId, shareToken) =>
        set((s) => ({
          walk: {
            ...EMPTY_WALK, sessionId, shareToken, status: 'active', startedAt: new Date(),
            // EMPTY_WALK.currentLocation is null — without carrying the real
            // fix over, Home mounts with nowhere to point the camera and the
            // map sits on its hardcoded fallback center until the next GPS
            // update arrives, which can take several seconds on a real device.
            currentLocation: s.walk.currentLocation,
          },
          checkInSecondsLeft: s.checkInIntervalSeconds,
          checkInsCompleted: 0,
          checkInsTriggered: 0,
          hadSOS: false,
          sosContacts: [],
          visitedPath: [],
          ...NAV_RESET,
          // navSteps is the one NAV_RESET field that must survive — it's the
          // turn-by-turn list already fetched for Plan-your-walk, and nulling
          // it here left the nav screen stuck on "Calculating route…" forever.
          navSteps: s.navSteps,
          // routeCoords + destinationCoords + the chosen sharedContactIds/
          // checkInIntervalSeconds are intentionally preserved so the prefs
          // picked on Plan-your-walk survive into the active walk
        })),

      endWalk: (watchedByNames = []) =>
        set((s) => ({
          lastWalkSummary: {
            distanceMeters: s.walk.distanceMeters,
            durationSeconds: s.walk.startedAt ? Math.max(0, Math.round((Date.now() - s.walk.startedAt.getTime()) / 1000)) : 0,
            destination: s.walk.destination,
            visitedPath: s.visitedPath,
            plannedRouteCoords: s.routeCoords,
            destinationCoords: s.destinationCoords,
            // 50m matches the "arrived" threshold used elsewhere (useNavigation) —
            // anything farther out than that when the walk ends counts as early.
            endedEarly: s.navRemainingMeters > 50,
            remainingMetersAtEnd: s.navRemainingMeters,
            watchedByNames,
            hadSOS: s.hadSOS,
            checkInsAnswered: s.checkInsCompleted,
            checkInsTriggered: s.checkInsTriggered,
            sessionId: s.walk.sessionId,
          },
          walk: EMPTY_WALK,
          checkInSecondsLeft: 90,
          checkInsCompleted: 0,
          checkInsTriggered: 0,
          hadSOS: false,
          sosContacts: [],
          routeCoords: null,
          destinationCoords: null,
          destinationFullAddress: null,
          routeDurationSeconds: null,
          alternateRouteCoords: null,
          sharedContactIds: null,
          checkInIntervalSeconds: 90,
          visitedPath: [],
          ...NAV_RESET,
        })),
    }),
    {
      name: 'safewalk-walk-state',
      storage: createJSONStorage(() => AsyncStorage),
      // Dates survive JSON.stringify as ISO strings but don't come back as
      // Date instances on their own — revive walk.startedAt after rehydration.
      merge: (persisted, current) => {
        const merged = { ...current, ...(persisted as Partial<WalkStore>) };
        const startedAt = merged.walk?.startedAt;
        if (startedAt && typeof startedAt === 'string') {
          merged.walk = { ...merged.walk, startedAt: new Date(startedAt) };
        }
        return merged;
      },
    },
  ),
);
