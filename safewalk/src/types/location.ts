// ─── Shared location / session types ─────────────────────────────────────────
// Slice 12 – trusted contact web view reads mock data of this shape

export interface ShareSessionData {
  sessionId: string;
  userName: string;
  location: {
    lat: number;
    lng: number;
  };
  /** Compass bearing in degrees. */
  bearing: number;
  /** Speed in metres per second. */
  speed: number;
  lastUpdated: Date;
  /** Timestamp after which the public share link is invalid. */
  expiresAt: Date;
  userPhone: string;
}