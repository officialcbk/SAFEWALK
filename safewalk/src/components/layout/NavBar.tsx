import { NavLink } from 'react-router-dom';
import { MapPin, Users, Clock, Settings } from 'lucide-react';

const tabs = [
  { to: '/home',     icon: MapPin,  label: 'Home'     },
  { to: '/contacts', icon: Users,   label: 'Contacts' },
  { to: '/history',  icon: Clock,   label: 'History'  },
  { to: '/settings', icon: Settings, label: 'Settings' },
] as const;

export function NavBar() {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 h-[52px] bg-white border-t border-[#E0E0E8] flex z-30"
      style={{ maxWidth: 430, margin: '0 auto' }}
      aria-label="Main navigation"
    >
      {tabs.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center justify-center gap-0.5 relative transition-colors ${
              isActive ? 'text-[#7F77DD]' : 'text-[#888899]'
            }`
          }
          aria-label={label}
        >
          {({ isActive }) => (
            <>
              <Icon size={18} />
              <span className="text-[7px] font-medium">{label}</span>
              {isActive && (
                <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-[#7F77DD]" />
              )}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
