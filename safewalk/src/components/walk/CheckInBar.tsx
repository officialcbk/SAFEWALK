interface CheckInBarProps {
  secondsLeft: number;
}

function fmt(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

export function CheckInBar({ secondsLeft }: CheckInBarProps) {
  const urgent = secondsLeft <= 15;
  return (
    <div
      className="w-full flex items-center justify-between px-4 py-1.5 transition-colors"
      style={{
        background: urgent ? undefined : '#EEEDFE',
        animation: urgent ? 'checkin-pulse 1s ease infinite' : undefined,
        height: 24,
      }}
      aria-live="polite"
      aria-label={`Next check-in in ${fmt(secondsLeft)}`}
    >
      <span className="text-[9px] font-bold text-[#534AB7]">Next check-in</span>
      <span className="text-[12px] font-bold text-[#3C3489] tabular-nums">{fmt(secondsLeft)}</span>
    </div>
  );
}
