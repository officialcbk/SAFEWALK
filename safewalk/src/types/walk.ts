// ─── Walk session types ───────────────────────────────────────────────────────
// Slice  1 – core session state (status, isActive, lastUpdate)
// Slice  2 – destination & ETA
// Slice  4 – real GPS location snapshot
// Slice  5 – last known location (persisted via storage service)

export type WalkStatus = "inactive" | "active";

/** GPS snapshot captured during a walk. */
export interface LocationData {
  lat: number;
  lng: number;
  timestamp: Date;
  /** Compass bearing in degrees (0–360). Null when unavailable. */
  bearing: number | null;
  /** Speed in metres per second. Null when unavailable. */
  speed: number | null;
}

export interface WalkState {
  status: WalkStatus;
  isActive: boolean;
  lastUpdate: Date | null;
  /** User-entered destination address – optional (Slice 2). */
  destination: string | null;
  /** Human-readable ETA string, e.g. "~12 min" (Slice 2). */
  eta: string | null;
  /** Live GPS coordinates updated each watch tick (Slice 4). */
  location: LocationData | null;
}