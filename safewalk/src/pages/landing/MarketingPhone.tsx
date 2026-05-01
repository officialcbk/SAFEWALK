interface MarketingPhoneProps {
  children: React.ReactNode
  tilt?: number
  scale?: number
}

export function MarketingPhone({ children, tilt = 0, scale = 1 }: MarketingPhoneProps) {
  return (
    <div style={{
      width: 280, height: 594,
      borderRadius: 40, background: '#0E0E18', padding: 9,
      boxShadow: '0 30px 80px rgba(38,33,92,0.25), 0 8px 24px rgba(38,33,92,0.18), inset 0 0 0 1px rgba(255,255,255,0.05)',
      position: 'relative', transform: `scale(${scale}) rotate(${tilt}deg)`, transformOrigin: 'center',
      flexShrink: 0,
    }}>
      <div style={{
        position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)',
        width: 88, height: 24, background: '#000', borderRadius: 999, zIndex: 30,
      }}/>
      <div style={{
        width: '100%', height: '100%', borderRadius: 32, overflow: 'hidden',
        background: '#fff', position: 'relative', display: 'flex', flexDirection: 'column',
      }}>
        {children}
      </div>
    </div>
  )
}
