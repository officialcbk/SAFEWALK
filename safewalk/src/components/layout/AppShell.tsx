import { NavBar } from './NavBar';
import { useWalkStore } from '../../store/walkStore';

interface AppShellProps { children: React.ReactNode; }

export function AppShell({ children }: AppShellProps) {
  const isWalking = useWalkStore((s) => !!s.walk.sessionId);
  return (
    <>
      <a href="#main-content" className="skip-link">Skip to main content</a>

      <div className="min-h-screen flex justify-center">
        <div
          className="relative flex flex-col w-full bg-white max-w-[430px] min-h-screen sm:shadow-[0_0_60px_rgba(0,0,0,0.14)]"
          role="application"
          aria-label="SafeWalk"
        >
          <main
            id="main-content"
            className={`flex-1${isWalking ? '' : ' pb-[78px]'}`}
            tabIndex={-1}
            style={{ outline: 'none' }}
          >
            {children}
          </main>
          <NavBar />
        </div>
      </div>
    </>
  );
}
