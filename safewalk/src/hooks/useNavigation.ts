// Active navigation engine — step tracking, off-route detection, rerouting
import { useEffect, useRef } from 'react';
import { useWalkStore } from '../store/walkStore';
import { getDirections } from '../services/directions';
import {
  distanceToPolyline,
  findCurrentStepIndex,
  remainingRouteStats,
} from '../services/navigation';

const OFF_ROUTE_THRESHOLD_M = 40;   // metres
const OFF_ROUTE_GRACE_COUNT = 3;    // consecutive readings before rerouting

export function useNavigation(isActive: boolean) {
  const {
    walk,
    routeCoords,
    navSteps,
    destinationCoords,
    setNavStepIndex,
    setNavRemaining,
    setOffRoute,
    setRerouting,
    setRouteCoords,
    setNavSteps,
  } = useWalkStore();

  const offRouteCountRef = useRef(0);
  const reroutingRef     = useRef(false);

  useEffect(() => {
    const loc = walk.currentLocation;
    if (!isActive || !loc || !navSteps || !routeCoords) return;

    const point: [number, number] = [loc.lng, loc.lat];

    // 1. Find current step
    const stepIdx = findCurrentStepIndex(point, navSteps);
    setNavStepIndex(stepIdx);

    // 2. Remaining distance + ETA
    const { meters, seconds } = remainingRouteStats(stepIdx, navSteps);
    setNavRemaining(meters, seconds);

    // 3. Off-route detection
    const distFromRoute = distanceToPolyline(point, routeCoords);
    const offRoute = distFromRoute > OFF_ROUTE_THRESHOLD_M;

    if (offRoute) {
      offRouteCountRef.current += 1;
    } else {
      offRouteCountRef.current = 0;
      setOffRoute(false);
    }

    // 4. Grace period → reroute
    if (offRouteCountRef.current >= OFF_ROUTE_GRACE_COUNT && !reroutingRef.current && destinationCoords) {
      reroutingRef.current = true;
      setOffRoute(true);
      setRerouting(true);
      offRouteCountRef.current = 0;

      getDirections(point, destinationCoords).then((result) => {
        reroutingRef.current = false;
        setRerouting(false);
        if (!result) return;
        setRouteCoords(result.geometry);
        setNavSteps(result.steps);
        const newIdx = findCurrentStepIndex(point, result.steps);
        setNavStepIndex(newIdx);
        const stats = remainingRouteStats(newIdx, result.steps);
        setNavRemaining(stats.meters, stats.seconds);
        setOffRoute(false);
      });
    }
  }, [walk.currentLocation]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset counters when walk ends
  useEffect(() => {
    if (!isActive) {
      offRouteCountRef.current = 0;
      reroutingRef.current = false;
    }
  }, [isActive]);
}
