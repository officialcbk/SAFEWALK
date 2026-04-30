interface AuthPageProps {
  children: React.ReactNode;
  title: string;
}

export function AuthPage({ children, title }: AuthPageProps) {
  return (
    <div className="min-h-screen bg-white flex flex-col sm:bg-gradient-to-br sm:from-[#EEEDFE] sm:via-[#F0F0F4] sm:to-[#E8E8F4] sm:items-center sm:justify-center sm:p-6">
      <main
        aria-label={title}
        className="flex-1 flex flex-col px-7 pb-8 sm:flex-none sm:w-full sm:max-w-[420px] sm:bg-white sm:rounded-[24px] sm:shadow-[0_8px_48px_rgba(127,119,221,0.18)] sm:px-10 sm:py-10"
      >
        {children}
      </main>
    </div>
  );
}
