// SafeWalk shared primitives — icons, map, logo, generic helpers
// Loaded as a global Babel script. Exports onto window.

const Icon = {
  Search: ({ size = 20, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
  ),
  Pin: ({ size = 20, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
  ),
  Home: ({ size = 22, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12 12 3l9 9"/><path d="M5 10v10h14V10"/></svg>
  ),
  Users: ({ size = 22, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
  ),
  History: ({ size = 22, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l3 2"/></svg>
  ),
  Settings: ({ size = 22, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h.1a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5h.1a1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v.1a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/></svg>
  ),
  Plus: ({ size = 18, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
  ),
  Chevron: ({ size = 18, color = 'currentColor', dir = 'right' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{transform: dir === 'left' ? 'rotate(180deg)' : dir === 'down' ? 'rotate(90deg)' : 'none'}}><path d="m9 18 6-6-6-6"/></svg>
  ),
  Shield: ({ size = 22, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 13c0 5-3.5 7.5-8 9-4.5-1.5-8-4-8-9V5l8-3 8 3v8Z"/></svg>
  ),
  Clock: ({ size = 18, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
  ),
  Phone: ({ size = 18, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3-8.6A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .3 2 .6 2.9a2 2 0 0 1-.5 2L8 9.8a16 16 0 0 0 6 6l1.2-1.2a2 2 0 0 1 2-.5c1 .3 2 .5 2.9.6a2 2 0 0 1 1.7 2Z"/></svg>
  ),
  Check: ({ size = 18, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
  ),
  X: ({ size = 18, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
  ),
  Mail: ({ size = 18, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 7 10 6 10-6"/></svg>
  ),
  Lock: ({ size = 16, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>
  ),
  Eye: ({ size = 18, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>
  ),
  Bell: ({ size = 18, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10 21a2 2 0 0 0 4 0"/></svg>
  ),
  Trash: ({ size = 18, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
  ),
  Walk: ({ size = 22, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="13" cy="4" r="2"/><path d="m13 7-2 4 3 3v6"/><path d="m11 11-3 1-2 4"/><path d="M14 14h4"/></svg>
  ),
  Compass: ({ size = 18, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="m16 8-2 6-6 2 2-6 6-2Z"/></svg>
  ),
  Star: ({ size = 14, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke={color} strokeWidth="1" strokeLinejoin="round"><path d="M12 2 15 9l8 .8-6 5.5L19 23l-7-4-7 4 2-7.7-6-5.5L9 9l3-7Z"/></svg>
  ),
  Alert: ({ size = 22, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
  ),
  Download: ({ size = 18, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/></svg>
  ),
  Logout: ({ size = 18, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/></svg>
  ),
  Crosshair: ({ size = 18, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M22 12h-4M6 12H2M12 6V2M12 22v-4"/></svg>
  ),
  Layers: ({ size = 18, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 2 9 5-9 5-9-5 9-5Z"/><path d="m3 17 9 5 9-5"/><path d="m3 12 9 5 9-5"/></svg>
  ),
};

// Logo
function Logo({ size = 'sm', dark = false }) {
  const px = size === 'sm' ? 28 : size === 'lg' ? 64 : 40;
  const radius = size === 'sm' ? 8 : size === 'lg' ? 18 : 12;
  return (
    <div style={{
      width: px, height: px, borderRadius: radius,
      background: 'linear-gradient(135deg, var(--purple-400), var(--purple-600))',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: dark ? 'none' : '0 6px 20px rgba(127,119,221,0.4)',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Concentric ring mark suggesting "broadcast / safety" */}
      <svg viewBox="0 0 64 64" width={px*0.78} height={px*0.78}>
        <circle cx="32" cy="32" r="24" fill="none" stroke="rgba(255,255,255,0.32)" strokeWidth="2.2"/>
        <circle cx="32" cy="32" r="15" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2.2"/>
        <circle cx="32" cy="32" r="6" fill="white"/>
      </svg>
    </div>
  );
}

// LogoMark with text — for top of map
function LogoBadge() {
  return (
    <div className="sw-logo">
      <Logo size="sm" />
      <span className="sw-logo-text">SafeWalk</span>
    </div>
  );
}

// MapCanvas — original SVG street pattern, NOT mapbox
// Generates a believable city-grid look with parks, water, paths
function MapCanvas({ variant = 'home', children }) {
  // Pre-rendered street network — same per variant for consistency
  return (
    <div className="sw-map">
      <svg className="sw-streets" viewBox="0 0 390 800" preserveAspectRatio="xMidYMid slice">
        <defs>
          <pattern id="hatch" patternUnits="userSpaceOnUse" width="6" height="6">
            <path d="M0 6L6 0" stroke="rgba(127,119,221,0.08)" strokeWidth="0.5"/>
          </pattern>
        </defs>
        {/* Park */}
        <rect x="-20" y="120" width="180" height="140" fill="rgba(159,196,140,0.28)" rx="6"/>
        <rect x="-20" y="120" width="180" height="140" fill="url(#hatch)" rx="6"/>
        {/* Water */}
        <path d="M260 -10 C 320 80, 380 120, 420 200 L 420 -20 Z" fill="rgba(127,160,210,0.22)"/>
        <path d="M-20 580 Q 100 560 200 600 T 420 590 L 420 820 L -20 820 Z" fill="rgba(127,160,210,0.20)"/>

        {/* Major streets — wide */}
        <g stroke="white" strokeWidth="14" strokeLinecap="butt">
          <line x1="-20" y1="280" x2="420" y2="280"/>
          <line x1="-20" y1="480" x2="420" y2="480"/>
          <line x1="200" y1="-20" x2="200" y2="820"/>
        </g>
        <g stroke="rgba(0,0,0,0.05)" strokeWidth="14.5" strokeDasharray="0">
          <line x1="-20" y1="280" x2="420" y2="280"/>
          <line x1="-20" y1="480" x2="420" y2="480"/>
          <line x1="200" y1="-20" x2="200" y2="820"/>
        </g>

        {/* Minor streets */}
        <g stroke="white" strokeWidth="6" strokeLinecap="butt" opacity="0.95">
          <line x1="-20" y1="60" x2="420" y2="60"/>
          <line x1="-20" y1="180" x2="420" y2="180"/>
          <line x1="-20" y1="380" x2="420" y2="380"/>
          <line x1="-20" y1="560" x2="420" y2="560"/>
          <line x1="-20" y1="660" x2="420" y2="660"/>
          <line x1="-20" y1="740" x2="420" y2="740"/>

          <line x1="60" y1="-20" x2="60" y2="820"/>
          <line x1="120" y1="-20" x2="120" y2="820"/>
          <line x1="280" y1="-20" x2="280" y2="820"/>
          <line x1="340" y1="-20" x2="340" y2="820"/>
        </g>

        {/* Buildings — soft blocks */}
        <g fill="rgba(127,119,221,0.06)">
          <rect x="68" y="68" width="40" height="100" rx="2"/>
          <rect x="128" y="68" width="60" height="100" rx="2"/>
          <rect x="208" y="288" width="60" height="80" rx="2"/>
          <rect x="288" y="288" width="40" height="80" rx="2"/>
          <rect x="68" y="288" width="40" height="80" rx="2"/>
          <rect x="128" y="288" width="60" height="80" rx="2"/>
          <rect x="208" y="68" width="60" height="100" rx="2"/>
          <rect x="288" y="68" width="40" height="100" rx="2"/>
          <rect x="68" y="488" width="40" height="60" rx="2"/>
          <rect x="128" y="488" width="60" height="60" rx="2"/>
          <rect x="208" y="488" width="60" height="60" rx="2"/>
          <rect x="288" y="488" width="40" height="60" rx="2"/>
          <rect x="68" y="668" width="40" height="60" rx="2"/>
          <rect x="208" y="668" width="60" height="60" rx="2"/>
          <rect x="288" y="668" width="40" height="60" rx="2"/>
        </g>

        {/* Subtle labels */}
        <g fill="rgba(70,70,90,0.35)" fontFamily="Inter, sans-serif" fontSize="9" fontWeight="600" letterSpacing="0.5">
          <text x="80" y="200" transform="rotate(-90 80 200)">PORTAGE AVE</text>
          <text x="220" y="270" >MAIN ST</text>
          <text x="220" y="470" >BROADWAY</text>
          <text x="40" y="200" fill="rgba(80,140,90,0.65)">CENTRAL PARK</text>
        </g>
      </svg>
      {children}
    </div>
  );
}

// User location pin (purple, with pulse)
function UserPin({ x = '50%', y = '52%' }) {
  return <div className="sw-pin" style={{ left: x, top: y }}/>;
}

// Destination pin
function DestPin({ x = '78%', y = '28%', label = '8 min' }) {
  return (
    <div style={{
      position: 'absolute', left: x, top: y, transform: 'translate(-50%, -100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 4,
    }}>
      <div style={{
        background: 'white', color: 'var(--purple-600)', fontWeight: 700, fontSize: 11,
        padding: '6px 10px', borderRadius: 999,
        boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
        marginBottom: 4,
      }}>{label}</div>
      <div style={{
        width: 24, height: 24, borderRadius: '50% 50% 50% 0',
        background: 'var(--purple-600)', border: '3px solid white',
        transform: 'rotate(-45deg)',
        boxShadow: '0 4px 10px rgba(60,52,137,0.4)',
      }}/>
    </div>
  );
}

// Walked route polyline
function RouteLine({ points = "55,420 195,420 195,288 305,228" }) {
  return (
    <svg style={{position:'absolute', inset:0, width:'100%', height:'100%', pointerEvents:'none', zIndex:3}} viewBox="0 0 390 800" preserveAspectRatio="xMidYMid slice">
      <polyline points={points} fill="none" stroke="var(--purple-400)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" className="sw-route" opacity="0.9"/>
      <polyline points={points} fill="none" stroke="var(--purple-400)" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" opacity="0.18"/>
    </svg>
  );
}

// Floating round button on map
function FloatingMapBtn({ children, style = {}, onClick, label }) {
  return (
    <button onClick={onClick} aria-label={label} style={{
      width: 44, height: 44, borderRadius: '50%',
      background: 'white', border: 'none',
      boxShadow: '0 4px 14px rgba(0,0,0,0.12)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      cursor: 'pointer', color: 'var(--purple-600)',
      ...style,
    }}>{children}</button>
  );
}

function Avatar({ initials = 'AJ', size = 36 }) {
  return (
    <div className="sw-avatar" style={{ width: size, height: size, fontSize: size * 0.42 }}>
      {initials}
    </div>
  );
}

function Badge({ children, variant = 'purple' }) {
  return <span className={`sw-badge sw-badge-${variant}`}>{children}</span>;
}

function Toggle({ on, onChange }) {
  return <div className={`sw-toggle ${on ? 'on' : ''}`} onClick={() => onChange && onChange(!on)} role="switch" aria-checked={on}/>;
}

// Tab bar (bottom nav)
function TabBar({ active = 'home', onChange }) {
  const tabs = [
    { id: 'home', label: 'Home', Icon: Icon.Home },
    { id: 'contacts', label: 'Contacts', Icon: Icon.Users },
    { id: 'history', label: 'History', Icon: Icon.History },
    { id: 'settings', label: 'Settings', Icon: Icon.Settings },
  ];
  return (
    <div className="sw-tabs">
      {tabs.map(({ id, label, Icon: I }) => (
        <div key={id} className={`sw-tab ${active === id ? 'active' : ''}`} onClick={() => onChange && onChange(id)}>
          <I size={22} color={active === id ? 'var(--purple-600)' : 'var(--gray-text)'}/>
          <span>{label}</span>
        </div>
      ))}
    </div>
  );
}

// Generic phone-screen scaffold (fills iOS frame body)
function Screen({ children, style = {}, bg = 'white' }) {
  return (
    <div className="sw-app" style={{ background: bg, ...style }}>
      {children}
    </div>
  );
}

// iOS status bar (top safe area) — minimal, dark text on light bg
function StatusBar({ dark = false }) {
  const c = dark ? '#fff' : '#000';
  return (
    <div style={{
      height: 50, padding: '14px 24px 0',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      flexShrink: 0,
      position: 'relative', zIndex: 10,
    }}>
      <div style={{ fontFamily: '-apple-system, "SF Pro", system-ui', fontWeight: 600, fontSize: 15, color: c }}>9:41</div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        {/* signal */}
        <svg width="17" height="11" viewBox="0 0 17 11"><rect x="0" y="7" width="3" height="4" rx="0.5" fill={c}/><rect x="4.5" y="5" width="3" height="6" rx="0.5" fill={c}/><rect x="9" y="2.5" width="3" height="8.5" rx="0.5" fill={c}/><rect x="13.5" y="0" width="3" height="11" rx="0.5" fill={c}/></svg>
        {/* battery */}
        <svg width="25" height="12" viewBox="0 0 25 12"><rect x="0.5" y="0.5" width="21" height="11" rx="3" stroke={c} fill="none" opacity="0.4"/><rect x="2" y="2" width="18" height="8" rx="1.5" fill={c}/><rect x="22.5" y="4" width="2" height="4" rx="1" fill={c} opacity="0.4"/></svg>
      </div>
    </div>
  );
}

Object.assign(window, {
  Icon, Logo, LogoBadge, MapCanvas, UserPin, DestPin, RouteLine, FloatingMapBtn,
  Avatar, Badge, Toggle, TabBar, Screen, StatusBar
});
