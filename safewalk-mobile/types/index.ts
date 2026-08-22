// ─── Shared TypeScript types ───────────────────────────────────────────────

export interface Profile {
  id: string;
  full_name: string;
  phone: string | null;
  avatar_initials: string | null;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface TrustedContact {
  id: string;
  user_id: string;
  full_name: string;
  phone: string;
  email: string | null;
  is_primary: boolean;
  created_at: string;
}

export type WalkStatus = 'active' | 'completed' | 'sos_triggered' | 'escalating';

export interface WalkSession {
  id: string;
  user_id: string;
  status: WalkStatus;
  destination: string | null;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  distance_meters: number | null;
  share_token: string;
  share_expires_at: string;
}

export interface LocationPing {
  id: string;
  session_id: string;
  user_id: string;
  lat: number;
  lng: number;
  accuracy: number | null;
  bearing: number | null;
  speed: number | null;
  recorded_at: string;
}

export type EscalationStage = 1 | 2 | 3 | 4 | 5;
export type EscalationEventType =
  | 'check_in_missed'
  | 'sms_sent'
  | 'call_initiated'
  | '911_shown'
  | 'resolved';

export interface EscalationEvent {
  id: string;
  session_id: string;
  user_id: string;
  stage: EscalationStage;
  event_type: EscalationEventType;
  contact_id: string | null;
  resolved: boolean;
  created_at: string;
}

export interface LatLng {
  lat: number;
  lng: number;
}

export interface ActiveWalkState {
  sessionId: string | null;
  shareToken: string | null;
  status: WalkStatus;
  startedAt: Date | null;
  destination: string | null;
  currentLocation: LatLng | null;
  distanceMeters: number;
  /** Stage 0 = not escalating */
  escalationStage: 0 | EscalationStage;
}
