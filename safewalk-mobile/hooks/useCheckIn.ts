import { useCallback, useEffect, useRef } from 'react';
import { useWalkStore } from '../store/walkStore';

export function useCheckIn(isActive: boolean, onExpired: () => void) {
  const { checkInSecondsLeft, checkInIntervalSeconds, setCheckInTimer } = useWalkStore();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onExpiredRef = useRef(onExpired);
  useEffect(() => {
    onExpiredRef.current = onExpired;
  }, [onExpired]);

  const reset = useCallback(() => {
    setCheckInTimer(checkInIntervalSeconds);
  }, [setCheckInTimer, checkInIntervalSeconds]);

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
          return { checkInSecondsLeft: s.checkInIntervalSeconds };
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
