// ─── Escalation ladder types ──────────────────────────────────────────────────
// Slice  8 – 5-stage escalation state machine
// Slice  9 – 911 call flow at stage 4
// Slice 14 – missed check-in entry point (trigger = "checkin")

export type EscalationStage = 1 | 2 | 3 | 4 | 5;

/** What triggered the escalation sequence. */
export type EscalationTrigger = "sos" | "checkin";

export interface EscalationState {
  isActive: boolean;
  stage: EscalationStage;
  trigger: EscalationTrigger | null;
  /** Timestamp when the current stage started – used for countdown display. */
  stageStartedAt: Date | null;
}