import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ActiveWalkState, LatLng, WalkStatus } from '../types';
import type { RouteStep } from '../services/directions';

interface WalkStore {
  walk: ActiveWalkState;
  checkInSecondsLeft: number;

  // Route geometry — [lng, lat][] (Mapbox convention)
  routeCoords: [number, number][] | null;
  // Destination pin — [lng, lat] (Mapbox convention)
  destinationCoords: [number, number] | null;

  // Turn-by-turn navigation state
  navSteps: RouteStep[] | null;
  navStepIndex: number;
  navRemainingMeters: number;
  navRemainingSeconds: number;
  isOffRoute: boolean;
  isRerouting: boolean;

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
  setNavSteps: (steps: RouteStep[] | null) => void;
  setNavStepIndex: (i: number) => void;
  setNavRemaining: (meters: number, seconds: number) => void;
  setOffRoute: (v: boolean) => void;
  setRerouting: (v: boolean) => void;
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
};

export const useWalkStore = create<WalkStore>()(
  persist(
    (set) => ({
      walk: EMPTY_WALK,
      checkInSecondsLeft: 90,
      routeCoords: null,
      destinationCoords: null,
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
      setNavSteps:        (steps) => set({ navSteps: steps }),
      setNavStepIndex:    (i) => set({ navStepIndex: i }),
      setNavRemaining:    (meters, seconds) => set({ navRemainingMeters: meters, navRemainingSeconds: seconds }),
      setOffRoute:        (v) => set({ isOffRoute: v }),
      setRerouting:       (v) => set({ isRerouting: v }),

      startWalk: (sessionId, shareToken) =>
        set({
          walk: { ...EMPTY_WALK, sessionId, shareToken, status: 'active', startedAt: new Date() },
          checkInSecondsLeft: 90,
          ...NAV_RESET,
          // routeCoords + destinationCoords intentionally preserved
          // so a geocoded destination set before starting survives walk start
        }),

      endWalk: () =>
        set({
          walk: EMPTY_WALK,
          checkInSecondsLeft: 90,
          routeCoords: null,
          destinationCoords: null,
          ...NAV_RESET,
        }),
    }),
    { name: 'safewalk-walk-state' },
  ),
);
