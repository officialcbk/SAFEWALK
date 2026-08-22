// ─── expo-location tracking hook ─────────────────────────────────────────────
// RN port of the web app's navigator.geolocation wrapper — same return shape
// (location, permissionDenied, error, startTracking, stopTracking) so call
// sites don't need to change.

import { useCallback, useRef, useState } from "react";
import * as Location from "expo-location";
import type { LocationData } from "../types/walk";

interface GeolocationState {
  location: LocationData | null;
  permissionDenied: boolean;
  error: string | null;
}

export interface UseGeolocationReturn extends GeolocationState {
  /** Begin watching the device position. Call on walk start. */
  startTracking: () => void;
  /** Stop the active watch. Call on walk end. */
  stopTracking: () => void;
}

/**
 * Thin wrapper around expo-location's watchPositionAsync.
 *
 * Usage:
 *   const { location, permissionDenied, error, startTracking, stopTracking } = useGeolocation();
 */
export function useGeolocation(): UseGeolocationReturn {
  const subscriptionRef = useRef<Location.LocationSubscription | null>(null);

  const [state, setState] = useState<GeolocationState>({
    location: null,
    permissionDenied: false,
    error: null,
  });

  const startTracking = useCallback(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setState((prev) => ({
          ...prev,
          permissionDenied: true,
          error:
            "Location permission was denied. Enable it in Settings to track your walk.",
        }));
        return;
      }

      subscriptionRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 3_000,
          distanceInterval: 5,
        },
        (pos) => {
          const { latitude, longitude, heading, speed } = pos.coords;
          setState({
            permissionDenied: false,
            error: null,
            location: {
              lat: latitude,
              lng: longitude,
              timestamp: new Date(pos.timestamp),
              bearing: heading,
              speed,
            },
          });
        }
      );
    })().catch(() => {
      setState((prev) => ({
        ...prev,
        error: "Unable to retrieve your location. Please try again.",
      }));
    });
  }, []);

  const stopTracking = useCallback(() => {
    subscriptionRef.current?.remove();
    subscriptionRef.current = null;
  }, []);

  return { ...state, startTracking, stopTracking };
}
