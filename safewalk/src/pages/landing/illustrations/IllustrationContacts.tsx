export function IllustrationContacts() {
  const contacts = [
    { x: 60, y: 60, l: 'SJ', c: '#534AB7' },
    { x: 180, y: 60, l: 'MC', c: '#6B62D4' },
    { x: 60, y: 140, l: 'PP', c: '#AFA9EC' },
    { x: 180, y: 140, l: 'DK', c: '#7F77DD' },
  ]
  return (
    <svg viewBox="0 0 240 200" width="100%" height="100%">
      <defs>
        <linearGradient id="ill3bg" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#EEEDFE"/><stop offset="1" stopColor="#DCD9FB"/>
        </linearGradient>
      </defs>
      <rect width="240" height="200" fill="url(#ill3bg)" rx="20"/>
      <circle cx="120" cy="100" r="22" fill="#7F77DD"/>
      <text x="120" y="106" textAnchor="middle" fontFamily="Inter" fontWeight="700" fontSize="14" fill="white">AJ</text>
      {contacts.map((c, i) => (
        <g key={i}>
          <line x1="120" y1="100" x2={c.x} y2={c.y} stroke="#AFA9EC" strokeWidth="1.5" strokeDasharray="3 3"/>
          <circle cx={c.x} cy={c.y} r="18" fill="white" stroke={c.c} strokeWidth="2"/>
          <text x={c.x} y={c.y + 5} textAnchor="middle" fontFamily="Inter" fontWeight="700" fontSize="11" fill={c.c}>{c.l}</text>
        </g>
      ))}
    </svg>
  )
}
