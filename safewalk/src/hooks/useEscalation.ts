// ─── Escalation ladder hook ───────────────────────────────────────────────────
// Slice  8 – 5-stage escalation state machine with auto-progression
// Slice  9 – provides stage state to EscalationPanel for 911 flow
// Slice 14 – accepts "checkin" trigger from missed check-in

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  EscalationState,
  EscalationStage,
  EscalationTrigger,
} from "../types/escalation";

/** Milliseconds each stage waits before auto-advancing. null = no auto-advance. */
const STAGE_TIMEOUTS_MS: Record<EscalationStage, number | null> = {
  1: 30_000, // 30 s "Are you OK?" window
  2: 20_000, // 20 s alerting contacts
  3: 20_000, // 20 s calling primary contact
  4: null,   // Stage 4 waits for user to act (call 911 or cancel)
  5: null,   // Stage 5 waits for user to confirm safe
};

const INITIAL_STATE: EscalationState = {
  isActive: false,
  stage: 1,
  trigger: null,
  stageStartedAt: null,
};

export interface UseEscalationReturn {
  escalation: EscalationState;
  /** Seconds remaining in the current stage's auto-advance countdown. Null if no timer. */
  secondsRemaining: number | null;
  startEscalation: (trigger: EscalationTrigger) => void;
  advanceStage: () => void;
  cancelEscalation: () => void;
}

/**
 * Manages the 5-stage safety escalation state machine.
 *
 * Automatic progression: each timed stage will advance to the next stage
 * after its timeout elapses. Stages 4 and 5 require explicit user action.
 */
export function useEscalation(): UseEscalationReturn {
  const [escalation, setEscalation] = useState<EscalationState>(INITIAL_STATE);
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);

  const autoAdvanceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /** Cancel all running timers without resetting escalation state. */
  const clearTimers = useCallback(() => {
    if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    autoAdvanceRef.current = null;
    countdownRef.current = null;
  }, []);

  /** Arm the display countdown and auto-advance timer for the given stage. */
  const armStageTimers = useCallback(
    (stage: EscalationStage) => {
      clearTimers();
      const timeout = STAGE_TIMEOUTS_MS[stage];
      if (timeout === null) {
        setSecondsRemaining(null);
        return;
      }

      setSecondsRemaining(timeout / 1000);

      countdownRef.current = setInterval(() => {
        setSecondsRemaining((prev) =>
          prev !== null && prev > 1 ? prev - 1 : 0
        );
      }, 1_000);

      autoAdvanceRef.current = setTimeout(() => {
        setEscalation((prev) => {
          if (!prev.isActive || prev.stage >= 5) return prev;
          return {
            ...prev,
            stage: (prev.stage + 1) as EscalationStage,
            stageStartedAt: new Date(),
          };
        });
      }, timeout);
    },
    [clearTimers]
  );

  // Re-arm timers whenever the active stage changes.
  useEffect(() => {
    if (!escalation.isActive) return;
    armStageTimers(escalation.stage);
    return clearTimers;
  }, [escalation.isActive, escalation.stage, armStageTimers, clearTimers]);

  const startEscalation = useCallback((trigger: EscalationTrigger) => {
    setEscalation({
      isActive: true,
      stage: 1,
      trigger,
      stageStartedAt: new Date(),
    });
  }, []);

  const advanceStage = useCallback(() => {
    setEscalation((prev) => {
      if (!prev.isActive || prev.stage >= 5) return prev;
      return {
        ...prev,
        stage: (prev.stage + 1) as EscalationStage,
        stageStartedAt: new Date(),
      };
    });
  }, []);

  const cancelEscalation = useCallback(() => {
    clearTimers();
    setSecondsRemaining(null);
    setEscalation(INITIAL_STATE);
  }, [clearTimers]);

  return {
    escalation,
    secondsRemaining,
    startEscalation,
    advanceStage,
    cancelEscalation,
  };
}