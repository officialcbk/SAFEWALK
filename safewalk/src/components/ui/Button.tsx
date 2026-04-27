import { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

type Variant = 'primary' | 'ghost' | 'danger' | 'link';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
}

const base =
  'inline-flex items-center justify-center font-semibold rounded-[50px] transition-all duration-150 cursor-pointer select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7F77DD] disabled:opacity-45 disabled:cursor-not-allowed';

const variants: Record<Variant, string> = {
  primary: 'bg-[#7F77DD] text-white hover:bg-[#534AB7] active:scale-[0.97] active:bg-[#3C3489]',
  ghost:   'bg-transparent border border-[#7F77DD] text-[#7F77DD] hover:bg-[#EEEDFE] active:scale-[0.97]',
  danger:  'bg-[#E24B4A] text-white hover:bg-[#A32D2D] active:scale-[0.97]',
  link:    'bg-transparent text-[#7F77DD] underline-offset-2 hover:underline p-0 rounded-none',
};

const sizes: Record<Size, string> = {
  sm: 'text-[10px] h-8 px-4',
  md: 'text-[11px] h-10 px-5 min-h-[48px]',
  lg: 'text-[12px] h-12 px-6 min-h-[48px]',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { variant = 'primary', size = 'md', loading, fullWidth, children, disabled, className = '', ...props },
    ref
  ) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={[
        base,
        variants[variant],
        sizes[size],
        fullWidth ? 'w-full' : '',
        className,
      ].join(' ')}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 className="mr-2 animate-spin" size={14} />
          {children}
        </>
      ) : (
        children
      )}
    </button>
  )
);
Button.displayName = 'Button';
