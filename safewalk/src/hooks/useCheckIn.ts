import { useCallback, useEffect, useRef } from 'react';
import { useWalkStore } from '../store/walkStore';

const CHECKIN_SECONDS = 90;

export function useCheckIn(isActive: boolean, onExpired: () => void) {
  const { checkInSecondsLeft, setCheckInTimer } = useWalkStore();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onExpiredRef = useRef(onExpired);
  onExpiredRef.current = onExpired;

  const reset = useCallback(() => {
    setCheckInTimer(CHECKIN_SECONDS);
  }, [setCheckInTimer]);

  useEffect(() => {
    if (!isActive) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(() => {
      useWalkStore.setState((s) => {
        const next = s.checkInSecondsLeft - 1;
        if (next <= 0) {
          onExpiredRef.current();
          return { checkInSecondsLeft: CHECKIN_SECONDS };
        }
        return { checkInSecondsLeft: next };
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isActive]);

  return { checkInSecondsLeft, reset };
}
