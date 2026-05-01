export function IllustrationSOS() {
  return (
    <svg viewBox="0 0 240 200" width="100%" height="100%">
      <defs>
        <linearGradient id="ill2bg" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#FCEBEB"/><stop offset="1" stopColor="#FAEEDA"/>
        </linearGradient>
      </defs>
      <rect width="240" height="200" fill="url(#ill2bg)" rx="20"/>
      <circle cx="120" cy="100" r="68" fill="none" stroke="#E24B4A" strokeWidth="1.5" opacity="0.4"/>
      <circle cx="120" cy="100" r="50" fill="none" stroke="#E24B4A" strokeWidth="1.5" opacity="0.6"/>
      <circle cx="120" cy="100" r="34" fill="#E24B4A"/>
      <text x="120" y="108" textAnchor="middle" fontFamily="Inter" fontWeight="800" fontSize="18" fill="white" letterSpacing="2">SOS</text>
    </svg>
  )
}
