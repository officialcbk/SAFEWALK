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
}

interface WalkStore {
  walk: ActiveWalkState;
  checkInSecondsLeft: number;

  // Route geometry — [lng, lat][] (Mapbox convention)
  routeCoords: [number, number][] | null;
  // Destination pin — [lng, lat] (Mapbox convention)
  destinationCoords: [number, number] | null;
  // Mapbox's estimated walking duration for the current route, in seconds —
  // powers the ETA shown on the walk-confirm screen before a walk starts.
  routeDurationSeconds: number | null;
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
  setRouteCoords: (coords: [number, number][] | null) => void;
  setDestinationCoords: (coords: [number, number] | null) => void;
  setRouteDurationSeconds: (seconds: number | null) => void;
  addVisitedPoint: (coord: [number, number]) => void;
  setNavSteps: (steps: RouteStep[] | null) => void;
  setNavStepIndex: (i: number) => void;
  setNavRemaining: (meters: number, seconds: number) => void;
  setOffRoute: (v: boolean) => void;
  setRerouting: (v: boolean) => void;
  setNearDestination: (v: boolean) => void;
  startWalk: (sessionId: string, shareToken: string) => void;
  endWalk: () => void;
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
      routeCoords: null,
      destinationCoords: null,
      routeDurationSeconds: null,
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
      setRouteCoords:     (coords) => set({ routeCoords: coords }),
      setDestinationCoords: (coords) => set({ destinationCoords: coords }),
      setRouteDurationSeconds: (seconds) => set({ routeDurationSeconds: seconds }),
      addVisitedPoint:    (coord) => set((s) => ({ visitedPath: [...s.visitedPath, coord] })),
      setNavSteps:        (steps) => set({ navSteps: steps }),
      setNavStepIndex:    (i) => set({ navStepIndex: i }),
      setNavRemaining:    (meters, seconds) => set({ navRemainingMeters: meters, navRemainingSeconds: seconds }),
      setOffRoute:        (v) => set({ isOffRoute: v }),
      setRerouting:       (v) => set({ isRerouting: v }),
      setNearDestination: (v) => set({ nearDestination: v }),

      startWalk: (sessionId, shareToken) =>
        set({
          walk: { ...EMPTY_WALK, sessionId, shareToken, status: 'active', startedAt: new Date() },
          checkInSecondsLeft: 90,
          visitedPath: [],
          ...NAV_RESET,
          // routeCoords + destinationCoords intentionally preserved
          // so a geocoded destination set before starting survives walk start
        }),

      endWalk: () =>
        set((s) => ({
          lastWalkSummary: {
            distanceMeters: s.walk.distanceMeters,
            durationSeconds: s.walk.startedAt ? Math.max(0, Math.round((Date.now() - s.walk.startedAt.getTime()) / 1000)) : 0,
            destination: s.walk.destination,
            visitedPath: s.visitedPath,
          },
          walk: EMPTY_WALK,
          checkInSecondsLeft: 90,
          routeCoords: null,
          destinationCoords: null,
          routeDurationSeconds: null,
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
