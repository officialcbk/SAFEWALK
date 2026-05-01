export function IllustrationStudent() {
  const stars: [number, number][] = [[40, 30], [80, 20], [150, 18], [210, 80]]
  return (
    <svg viewBox="0 0 240 200" width="100%" height="100%">
      <defs>
        <linearGradient id="ill6bg" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#3C3489"/><stop offset="1" stopColor="#26215C"/>
        </linearGradient>
      </defs>
      <rect width="240" height="200" fill="url(#ill6bg)" rx="20"/>
      <circle cx="190" cy="40" r="14" fill="#FAEEDA"/>
      <circle cx="183" cy="38" r="14" fill="url(#ill6bg)"/>
      {stars.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="1.5" fill="#EEEDFE" opacity="0.8"/>
      ))}
      <path d="M0 170 Q 60 150 120 160 T 240 150" stroke="#7F77DD" strokeWidth="3" fill="none" strokeDasharray="6 6"/>
      <g transform="translate(108 110)">
        <circle cx="0" cy="0" r="7" fill="#FAEEDA"/>
        <rect x="-5" y="6" width="10" height="22" rx="3" fill="#7F77DD"/>
        <rect x="-3" y="26" width="3" height="14" rx="1" fill="#3C3489"/>
        <rect x="2" y="26" width="3" height="14" rx="1" fill="#3C3489"/>
        <rect x="-12" y="14" width="6" height="3" rx="1" fill="#7F77DD" transform="rotate(-30)"/>
      </g>
      <circle cx="108" cy="110" r="50" fill="none" stroke="#AFA9EC" strokeWidth="1" opacity="0.5"/>
      <circle cx="108" cy="110" r="35" fill="none" stroke="#AFA9EC" strokeWidth="1" opacity="0.7"/>
    </svg>
  )
}
