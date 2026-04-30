// ─── Browser Geolocation API hook ────────────────────────────────────────────
// Slice 4 – real geolocation: starts/stops a watchPosition on walk start/end

import { useCallback, useRef, useState } from "react";
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

const GEO_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  maximumAge: 10_000,  // accept cached positions up to 10 s old
  timeout: 15_000,     // give up after 15 s if no fix
};

/**
 * Thin wrapper around navigator.geolocation.watchPosition.
 *
 * Usage:
 *   const { location, permissionDenied, error, startTracking, stopTracking } = useGeolocation();
 */
export function useGeolocation(): UseGeolocationReturn {
  const watchIdRef = useRef<number | null>(null);

  const [state, setState] = useState<GeolocationState>({
    location: null,
    permissionDenied: false,
    error: null,
  });

  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setState((prev) => ({
        ...prev,
        error: "Geolocation is not supported by this browser.",
      }));
      return;
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
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
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setState((prev) => ({
            ...prev,
            permissionDenied: true,
            error:
              "Location permission was denied. Enable it in your browser settings to track your walk.",
          }));
        } else {
          setState((prev) => ({
            ...prev,
            error: "Unable to retrieve your location. Please try again.",
          }));
        }
      },
      GEO_OPTIONS
    );
  }, []);

  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  return { ...state, startTracking, stopTracking };
}