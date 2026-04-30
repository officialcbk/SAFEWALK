import { useCallback, useEffect, useRef, useState } from 'react';

const HOLD_MS = 3000;
const CIRCUMFERENCE = 201; // 2π × 32

interface SosButtonProps {
  onActivated: () => void;
  disabled?: boolean;
}

export function SosButton({ onActivated, disabled }: SosButtonProps) {
  const [holding, setHolding]     = useState(false);
  const [progress, setProgress]   = useState(CIRCUMFERENCE);
  const [countdown, setCountdown] = useState(3);
  const holdRef   = useRef<ReturnType<typeof setTimeout>  | null>(null);
  const tickRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef  = useRef(0);
  const rafRef    = useRef(0);
  const btnRef    = useRef<HTMLButtonElement>(null);

  const cancel = useCallback(() => {
    if (holdRef.current)  clearTimeout(holdRef.current);
    if (tickRef.current)  clearInterval(tickRef.current);
    if (rafRef.current)   cancelAnimationFrame(rafRef.current);
    setHolding(false);
    setProgress(CIRCUMFERENCE);
    setCountdown(3);
  }, []);

  const start = useCallback(() => {
    if (disabled) return;
    setHolding(true);
    startRef.current = performance.now();

    const animate = () => {
      const elapsed = performance.now() - startRef.current;
      const pct     = Math.min(elapsed / HOLD_MS, 1);
      setProgress(CIRCUMFERENCE * (1 - pct));
      setCountdown(Math.max(1, Math.ceil(3 - pct * 3)));
      if (pct < 1) rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);

    holdRef.current = setTimeout(() => {
      cancel();
      navigator.vibrate?.([100, 50, 100, 50, 200]);
      onActivated();
    }, HOLD_MS);
  }, [disabled, cancel, onActivated]);

  // Touch with passive:false to prevent scroll
  useEffect(() => {
    const btn = btnRef.current;
    if (!btn) return;
    const onTouch = (e: TouchEvent) => { e.preventDefault(); start(); };
    btn.addEventListener('touchstart', onTouch, { passive: false });
    return () => btn.removeEventListener('touchstart', onTouch);
  }, [start]);

  // Keyboard: hold Space/Enter to activate (same 3s hold behaviour)
  useEffect(() => {
    const btn = btnRef.current;
    if (!btn) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.code === 'Space' || e.code === 'Enter') && !e.repeat) {
        e.preventDefault();
        start();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        cancel();
      }
    };
    btn.addEventListener('keydown', onKeyDown);
    btn.addEventListener('keyup', onKeyUp);
    return () => {
      btn.removeEventListener('keydown', onKeyDown);
      btn.removeEventListener('keyup', onKeyUp);
    };
  }, [start, cancel]);

  useEffect(() => () => cancel(), [cancel]);

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative flex items-center justify-center" style={{ width: 84, height: 84 }}>
        {/* Progress ring */}
        <svg className="absolute" width="84" height="84" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="42" cy="42" r="32" fill="none" stroke="rgba(226,75,74,0.2)" strokeWidth="3.5" />
          <circle
            cx="42" cy="42" r="32"
            fill="none" stroke="#E24B4A" strokeWidth="3.5"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={progress}
            strokeLinecap="round"
            style={{ transition: holding ? 'none' : 'stroke-dashoffset 0.1s' }}
          />
        </svg>
        <button
          ref={btnRef}
          onPointerDown={start}
          onPointerUp={cancel}
          onPointerLeave={cancel}
          disabled={disabled}
          aria-label="Emergency SOS — press and hold to activate"
          aria-pressed={holding}
          className="w-[72px] h-[72px] rounded-full bg-[#E24B4A] text-white font-bold text-[14px] tracking-[1px] flex items-center justify-center relative z-10 border-[3px] border-white disabled:opacity-40 disabled:cursor-not-allowed select-none active:scale-[0.96]"
          style={{
            boxShadow: holding
              ? '0 0 0 3px #E24B4A, 0 8px 28px rgba(226,75,74,0.55)'
              : '0 0 0 3px #E24B4A, 0 8px 22px rgba(226,75,74,0.45)',
          }}
        >
          {holding ? countdown : 'SOS'}
        </button>
      </div>
    </div>
  );
}
