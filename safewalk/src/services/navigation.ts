// Navigation helpers: off-route detection, step tracking, distance/duration formatting
// All coordinates are [lng, lat] (Mapbox convention)

import type { RouteStep } from './directions';

// ── Geometry ──────────────────────────────────────────────────────────────────

/** Haversine distance in metres between two [lng, lat] points */
export function haversine(a: [number, number], b: [number, number]): number {
  const R = 6_371_000;
  const lat1 = (a[1] * Math.PI) / 180;
  const lat2 = (b[1] * Math.PI) / 180;
  const dLat = lat2 - lat1;
  const dLng = ((b[0] - a[0]) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(x));
}

function distanceToSegment(
  p: [number, number],
  a: [number, number],
  b: [number, number],
): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  if (dx === 0 && dy === 0) return haversine(p, a);
  const t = Math.max(
    0,
    Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy)),
  );
  return haversine(p, [a[0] + t * dx, a[1] + t * dy]);
}

/** Shortest perpendicular distance in metres from a point to a polyline */
export function distanceToPolyline(
  point: [number, number],
  polyline: [number, number][],
): number {
  if (polyline.length === 0) return Infinity;
  if (polyline.length === 1) return haversine(point, polyline[0]);
  let min = Infinity;
  for (let i = 0; i < polyline.length - 1; i++) {
    const d = distanceToSegment(point, polyline[i], polyline[i + 1]);
    if (d < min) min = d;
  }
  return min;
}

// ── Step tracking ─────────────────────────────────────────────────────────────

/**
 * Find which step index the user is currently approaching.
 * Looks at the start location of each step (except the final "arrive" step).
 */
export function findCurrentStepIndex(
  location: [number, number],
  steps: RouteStep[],
): number {
  if (steps.length <= 1) return 0;
  // Search the first N-1 steps (exclude the final "arrive")
  const limit = steps.length - 1;
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < limit; i++) {
    const d = haversine(location, steps[i].location);
    if (d < bestDist) { bestDist = d; best = i; }
  }
  return best;
}

/** Sum remaining distance + duration from the given step index */
export function remainingRouteStats(
  stepIndex: number,
  steps: RouteStep[],
): { meters: number; seconds: number } {
  const remaining = steps.slice(stepIndex);
  return {
    meters:  remaining.reduce((s, r) => s + r.distance, 0),
    seconds: remaining.reduce((s, r) => s + r.duration, 0),
  };
}

// ── Formatting ────────────────────────────────────────────────────────────────

export function formatNavDistance(meters: number): string {
  if (meters < 50)   return 'Arriving';
  if (meters < 1000) return `${Math.round(meters / 10) * 10} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

export function formatNavDuration(seconds: number): string {
  if (seconds < 60) return '< 1 min';
  const m = Math.round(seconds / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem > 0 ? `${h} h ${rem} min` : `${h} h`;
}

// ── Maneuver icons ────────────────────────────────────────────────────────────

export function maneuverIcon(type: string, modifier?: string): string {
  if (type === 'depart')  return '↑';
  if (type === 'arrive')  return '⬤';
  if (type === 'roundabout' || type === 'rotary') return '↻';
  if (type === 'merge')   return '⤴';
  if (type === 'fork') {
    if (modifier?.includes('left'))  return '↖';
    if (modifier?.includes('right')) return '↗';
    return '↑';
  }
  if (type === 'turn' || type === 'end of road') {
    if (modifier === 'left' || modifier === 'sharp left')  return '←';
    if (modifier === 'right' || modifier === 'sharp right') return '→';
    if (modifier === 'slight left')  return '↖';
    if (modifier === 'slight right') return '↗';
    if (modifier === 'uturn')        return '↩';
  }
  return '↑'; // straight / continue / default
}
