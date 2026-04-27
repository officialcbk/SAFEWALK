import { NavBar } from './NavBar';

interface AppShellProps { children: React.ReactNode; }

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="relative flex flex-col min-h-screen max-w-[430px] mx-auto bg-white">
      <main className="flex-1 pb-[52px]">
        {children}
      </main>
      <NavBar />
    </div>
  );
}
