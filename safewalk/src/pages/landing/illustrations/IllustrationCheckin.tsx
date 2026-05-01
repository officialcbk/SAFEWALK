export function IllustrationCheckin() {
  return (
    <svg viewBox="0 0 240 200" width="100%" height="100%">
      <defs>
        <linearGradient id="ill1bg" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#EEEDFE"/><stop offset="1" stopColor="#DCD9FB"/>
        </linearGradient>
      </defs>
      <rect width="240" height="200" fill="url(#ill1bg)" rx="20"/>
      <circle cx="120" cy="100" r="74" fill="none" stroke="#AFA9EC" strokeWidth="1.5" opacity="0.7"/>
      <circle cx="120" cy="100" r="54" fill="none" stroke="#AFA9EC" strokeWidth="1.5"/>
      <circle cx="120" cy="100" r="34" fill="#7F77DD" opacity="0.18"/>
      <g transform="translate(120 100)">
        <rect x="-44" y="-30" width="88" height="60" rx="14" fill="white" stroke="#AFA9EC" strokeWidth="1"/>
        <circle cx="-22" cy="0" r="14" fill="none" stroke="#6B62D4" strokeWidth="2"/>
        <path d="M-22 -8 V 0 L -16 4" stroke="#6B62D4" strokeWidth="2" strokeLinecap="round" fill="none"/>
        <rect x="-2" y="-7" width="38" height="4" rx="2" fill="#6B62D4"/>
        <rect x="-2" y="1" width="26" height="4" rx="2" fill="#AFA9EC"/>
      </g>
    </svg>
  )
}
