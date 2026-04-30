type Screen = 'idle' | 'active' | 'contacts' | 'history' | 'track'

function MapPlaceholder() {
  return (
    <div className="flex-1 bg-[#EEF1F6] relative overflow-hidden">
      <svg viewBox="0 0 300 400" className="absolute inset-0 w-full h-full opacity-50">
        <line x1="0" y1="100" x2="300" y2="100" stroke="#ccc" strokeWidth="1"/>
        <line x1="0" y1="200" x2="300" y2="200" stroke="#ccc" strokeWidth="1"/>
        <line x1="0" y1="300" x2="300" y2="300" stroke="#ccc" strokeWidth="1"/>
        <line x1="100" y1="0" x2="100" y2="400" stroke="#ccc" strokeWidth="1"/>
        <line x1="200" y1="0" x2="200" y2="400" stroke="#ccc" strokeWidth="1"/>
        <path d="M40 260 Q 120 180 180 220 T 260 160" stroke="#7F77DD" strokeWidth="3" fill="none" strokeDasharray="8 5"/>
        <circle cx="180" cy="220" r="8" fill="#7F77DD" stroke="white" strokeWidth="2.5"/>
        <circle cx="180" cy="220" r="18" fill="#7F77DD" opacity="0.15"/>
        <circle cx="180" cy="220" r="28" fill="#7F77DD" opacity="0.07"/>
      </svg>
    </div>
  )
}

function TopBar() {
  return (
    <div className="flex items-center justify-between px-4 pt-8 pb-2 absolute top-0 left-0 right-0 z-10">
      <div className="flex items-center gap-1.5">
        <div className="w-6 h-6 rounded-[6px] bg-purple-400 flex items-center justify-center">
          <svg viewBox="0 0 64 64" width={16} height={16}>
            <circle cx="32" cy="32" r="24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="3"/>
            <circle cx="32" cy="32" r="6" fill="white"/>
          </svg>
        </div>
        <span className="text-[12px] font-bold text-dark">SafeWalk</span>
      </div>
      <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center text-purple-800 text-[10px] font-bold">AJ</div>
    </div>
  )
}

export function AppScreenPreview({ screen }: { screen: Screen }) {
  if (screen === 'idle') return (
    <div className="flex flex-col h-full relative">
      <MapPlaceholder />
      <TopBar />
      <div className="bg-white rounded-t-[20px] px-4 py-3 shadow-[0_-4px_24px_rgba(0,0,0,0.08)]">
        <div className="w-10 h-1 bg-gray-border rounded-full mx-auto mb-3"/>
        <div className="flex items-center gap-2 bg-gray-bg rounded-[12px] px-3 py-2 mb-3">
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#888899" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <span className="text-[12px] text-gray-text">Where are you going?</span>
        </div>
        <div className="grid grid-cols-3 gap-1.5 mb-3">
          {[['3','Walks'],['2','Contacts'],['Safe','Status']].map(([n,l]) => (
            <div key={l} className="bg-gray-bg rounded-[10px] p-2 text-center">
              <div className="text-[13px] font-bold text-purple-400">{n}</div>
              <div className="text-[9px] text-gray-text">{l}</div>
            </div>
          ))}
        </div>
        <div className="h-10 bg-purple-400 rounded-[12px] flex items-center justify-center text-white text-[13px] font-semibold">Start walk</div>
      </div>
    </div>
  )

  if (screen === 'active') return (
    <div className="flex flex-col h-full relative">
      <MapPlaceholder />
      <TopBar />
      <div className="bg-white rounded-t-[20px] px-4 py-3 shadow-[0_-4px_24px_rgba(0,0,0,0.08)]">
        <div className="w-10 h-1 bg-gray-border rounded-full mx-auto mb-3"/>
        <div className="flex justify-between items-center bg-purple-50 rounded-[10px] px-3 py-2 mb-3">
          <span className="text-[10px] font-semibold text-purple-800">Next check-in</span>
          <span className="text-[12px] font-bold text-purple-600">1:24</span>
        </div>
        <div className="flex justify-between items-center mb-3">
          <div>
            <div className="text-[15px] font-bold text-dark">0:08:32</div>
            <div className="text-[10px] text-gray-text">0.4 km walked</div>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="w-12 h-12 rounded-full bg-status-red flex items-center justify-center text-white text-[10px] font-bold" style={{ boxShadow: '0 0 0 3px #E24B4A, 0 4px 12px rgba(226,75,74,0.4)' }}>SOS</div>
            <div className="h-8 px-3 border border-gray-border rounded-[10px] flex items-center text-[11px] font-semibold text-gray-text">End</div>
          </div>
        </div>
      </div>
    </div>
  )

  if (screen === 'contacts') return (
    <div className="flex flex-col h-full bg-gray-bg px-3 pt-10 pb-3">
      <div className="text-[13px] font-bold text-dark mb-3">Trusted contacts</div>
      <div className="bg-purple-50 rounded-[10px] px-3 py-2 mb-3 text-[10px] text-purple-800">Primary contact gets a voice call during SOS.</div>
      {[{i:'SJ',n:'Sara Johnson',p:'+1 (204) 555-0001',primary:true},{i:'MC',n:'Mike Chen',p:'+1 (204) 555-0002',primary:false}].map((c) => (
        <div key={c.n} className="bg-white border border-gray-border rounded-[12px] px-3 py-2.5 mb-2 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-purple-50 text-purple-800 text-[10px] font-bold flex items-center justify-center">{c.i}</div>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-bold text-dark">{c.n}</div>
            <div className="text-[9px] text-gray-text">{c.p}</div>
          </div>
          {c.primary && <span className="text-[8px] font-bold bg-purple-50 text-purple-800 px-1.5 py-0.5 rounded-full">Primary</span>}
        </div>
      ))}
    </div>
  )

  if (screen === 'history') return (
    <div className="flex flex-col h-full bg-gray-bg px-3 pt-10 pb-3">
      <div className="text-[13px] font-bold text-dark mb-3">Walk history</div>
      {[
        {dest:'Osborne Village',time:'Today, 8:45 AM',dur:'22 min',status:'Completed',bg:'#EAF3DE',tc:'#3B6D11'},
        {dest:'The Forks',time:'Yesterday, 7:12 PM',dur:'18 min',status:'Completed',bg:'#EAF3DE',tc:'#3B6D11'},
        {dest:'Walk',time:'Apr 23, 6:30 PM',dur:'31 min',status:'SOS used',bg:'#FCEBEB',tc:'#A32D2D'},
      ].map((w) => (
        <div key={w.time} className="bg-white border border-gray-border rounded-[12px] px-3 py-2.5 mb-2 flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-purple-50 flex items-center justify-center flex-shrink-0">
            <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="#7F77DD" strokeWidth="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/></svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-bold text-dark truncate">{w.dest}</div>
            <div className="text-[9px] text-gray-text">{w.time}</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-bold text-dark">{w.dur}</div>
            <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full" style={{background:w.bg,color:w.tc}}>{w.status}</span>
          </div>
        </div>
      ))}
    </div>
  )

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 pt-3 pb-2.5" style={{background:'linear-gradient(135deg,#7F77DD,#534AB7)',color:'white'}}>
        <div className="flex items-center gap-1.5 mb-1">
          <div className="w-5 h-5 rounded-[5px] bg-white/20 flex items-center justify-center">
            <svg viewBox="0 0 64 64" width={14} height={14}><circle cx="32" cy="32" r="6" fill="white"/></svg>
          </div>
          <span className="text-[11px] font-bold">SafeWalk</span>
          <span className="ml-auto flex items-center gap-1 text-[8px] font-bold bg-white/20 px-1.5 py-0.5 rounded-full">
            <span className="w-1 h-1 rounded-full bg-[#7CE05F]"/>LIVE
          </span>
        </div>
        <div className="text-[12px] font-bold">Walk shared with you</div>
        <div className="text-[9px] opacity-80">Anya · just now</div>
      </div>
      <div className="flex-1 bg-[#EEF1F6] relative">
        <svg viewBox="0 0 280 120" className="w-full h-full opacity-60">
          <line x1="0" y1="40" x2="280" y2="40" stroke="#ccc" strokeWidth="1"/>
          <line x1="0" y1="80" x2="280" y2="80" stroke="#ccc" strokeWidth="1"/>
          <line x1="90" y1="0" x2="90" y2="120" stroke="#ccc" strokeWidth="1"/>
          <line x1="190" y1="0" x2="190" y2="120" stroke="#ccc" strokeWidth="1"/>
          <circle cx="140" cy="60" r="7" fill="#7F77DD" stroke="white" strokeWidth="2"/>
        </svg>
      </div>
      <div className="px-3 py-3 bg-white">
        <div className="flex gap-2">
          <div className="flex-1 h-9 bg-purple-400 rounded-[10px] flex items-center justify-center text-white text-[11px] font-semibold gap-1">Call Anya</div>
          <div className="flex-1 h-9 bg-status-red rounded-[10px] flex items-center justify-center text-white text-[11px] font-semibold">Call 911</div>
        </div>
      </div>
    </div>
  )
}
