// ─── ETA calculation helpers ──────────────────────────────────────────────────
// Slice 2 – destination & ETA display
// Slice 4 – can be extended later to use real GPS delta

const WALKING_SPEED_KPH = 5;
const WALKING_SPEED_MPS = WALKING_SPEED_KPH / 3.6; // ~1.39 m/s

/**
 * Haversine great-circle distance between two GPS coordinates.
 * @returns Distance in metres.
 */
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6_371_000; // Earth radius in metres
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Format a remaining distance as a human-readable ETA string.
 * @example formatEta(750)  → "~9 min"
 * @example formatEta(5400) → "~1h 17m"
 * @example formatEta(0)    → "Arrived"
 */
export function formatEta(distanceMetres: number): string {
  if (distanceMetres <= 0) return "Arrived";
  const seconds = distanceMetres / WALKING_SPEED_MPS;
  const minutes = Math.ceil(seconds / 60);
  if (minutes < 60) return `~${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rem = minutes % 60;
  return rem > 0 ? `~${hours}h ${rem}m` : `~${hours}h`;
}

/**
 * Simulate a starting distance when real geocoding is unavailable.
 * Returns a random value between 400 m and 2.5 km.
 * Used in Slice 2 before real GPS is available in Slice 4.
 */
export function mockInitialDistance(): number {
  return 400 + Math.random() * 2_100;
}

/**
 * Reduce a remaining distance by the metres covered in one 10-second
 * update tick at average walking speed.
 */
export function tickDistance(currentMetres: number): number {
  const covered = WALKING_SPEED_MPS * 10; // distance per 10 s interval
  return Math.max(0, currentMetres - covered);
}