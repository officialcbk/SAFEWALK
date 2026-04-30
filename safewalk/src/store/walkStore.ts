import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ActiveWalkState, LatLng, WalkStatus } from '../types';

interface WalkStore {
  walk: ActiveWalkState;
  checkInSecondsLeft: number;
  /** Route polyline in [lat, lng][] as returned by routing.ts */
  routeCoords: [number, number][] | null;
  /** Destination pin in [lng, lat][] for Mapbox */
  destinationCoords: [number, number] | null;
  setWalk: (walk: Partial<ActiveWalkState>) => void;
  setLocation: (location: LatLng) => void;
  setDistance: (meters: number) => void;
  setDestination: (destination: string | null) => void;
  setStatus: (status: WalkStatus) => void;
  setEscalationStage: (stage: ActiveWalkState['escalationStage']) => void;
  setCheckInTimer: (seconds: number) => void;
  setRouteCoords: (coords: [number, number][] | null) => void;
  setDestinationCoords: (coords: [number, number] | null) => void;
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

export const useWalkStore = create<WalkStore>()(
  persist(
    (set) => ({
      walk: EMPTY_WALK,
      checkInSecondsLeft: 90,
      routeCoords: null,
      destinationCoords: null,

      setWalk: (partial) =>
        set((s) => ({ walk: { ...s.walk, ...partial } })),

      setLocation: (location) =>
        set((s) => ({ walk: { ...s.walk, currentLocation: location } })),

      setDistance: (meters) =>
        set((s) => ({ walk: { ...s.walk, distanceMeters: meters } })),

      setDestination: (destination) =>
        set((s) => ({ walk: { ...s.walk, destination } })),

      setStatus: (status) =>
        set((s) => ({ walk: { ...s.walk, status } })),

      setEscalationStage: (stage) =>
        set((s) => ({ walk: { ...s.walk, escalationStage: stage } })),

      setCheckInTimer: (seconds) =>
        set({ checkInSecondsLeft: seconds }),

      setRouteCoords: (coords) =>
        set({ routeCoords: coords }),

      setDestinationCoords: (coords) =>
        set({ destinationCoords: coords }),

      startWalk: (sessionId, shareToken) =>
        set({
          walk: {
            ...EMPTY_WALK,
            sessionId,
            shareToken,
            status: 'active',
            startedAt: new Date(),
          },
          checkInSecondsLeft: 90,
          // routeCoords + destinationCoords intentionally preserved
          // so a geocoded destination set before starting survives the walk start
        }),

      endWalk: () =>
        set({ walk: EMPTY_WALK, checkInSecondsLeft: 90, routeCoords: null, destinationCoords: null }),
    }),
    { name: 'safewalk-walk-state' }
  )
);
