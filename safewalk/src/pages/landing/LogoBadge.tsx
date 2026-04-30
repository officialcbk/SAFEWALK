export function LogoBadge({ size = 28 }: { size?: number }) {
  return (
    <div
      style={{
        width: size, height: size, borderRadius: Math.round(size * 0.3),
        background: 'linear-gradient(135deg, #7F77DD, #534AB7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}
    >
      <svg viewBox="0 0 64 64" width={size * 0.7} height={size * 0.7}>
        <circle cx="32" cy="32" r="24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2.5"/>
        <circle cx="32" cy="32" r="15" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2.5"/>
        <circle cx="32" cy="32" r="6" fill="white"/>
      </svg>
    </div>
  )
}
