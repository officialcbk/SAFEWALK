import { Loader2 } from 'lucide-react';

type Size = 'sm' | 'md' | 'lg';

interface SpinnerProps { size?: Size; className?: string; }

const sizes: Record<Size, number> = { sm: 14, md: 20, lg: 28 };

export function Spinner({ size = 'md', className = '' }: SpinnerProps) {
  return (
    <Loader2
      size={sizes[size]}
      className={`animate-spin text-[#7F77DD] ${className}`}
      aria-label="Loading"
    />
  );
}

export function FullPageSpinner() {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-white gap-3 z-50">
      <div className="w-12 h-6 bg-[#7F77DD] rounded-lg flex items-center justify-center">
        <span className="text-white font-bold text-[11px]">SW</span>
      </div>
      <Spinner size="md" />
    </div>
  );
}
