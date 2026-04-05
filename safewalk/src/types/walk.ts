export type WalkStatus = "inactive" | "active";

export interface WalkState {
  status: WalkStatus;
  isActive: boolean;
  lastUpdate: Date | null;
  destination?: string | null;
}
