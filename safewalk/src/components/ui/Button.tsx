import { forwardRef } from 'react';

type Variant = 'primary' | 'ghost' | 'danger' | 'text';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
}

const base =
  'inline-flex items-center justify-center gap-2 font-semibold transition-all cursor-pointer select-none disabled:opacity-45 disabled:cursor-not-allowed active:scale-[0.98]';

const variants: Record<Variant, string> = {
  primary:
    'bg-[#7F77DD] text-white rounded-[14px] hover:bg-[#6B62D4]',
  ghost:
    'bg-[#EEEDFE] text-[#534AB7] border border-[#DCD9FB] rounded-[14px] hover:bg-[#DCD9FB]',
  danger:
    'bg-[#E24B4A] text-white rounded-[14px] hover:bg-[#c93d3c]',
  text:
    'bg-transparent text-[#534AB7] hover:text-[#3C3489] rounded-[14px]',
};

const sizes: Record<Size, string> = {
  sm:  'text-[13px] h-10 px-4',
  md:  'text-[16px] h-[52px] px-5',
  lg:  'text-[16px] h-[52px] px-6',
};

const shadows: Record<Variant, string> = {
  primary: 'shadow-[0_6px_18px_rgba(127,119,221,0.35),inset_0_1px_0_rgba(255,255,255,0.18)]',
  danger:  'shadow-[0_6px_18px_rgba(226,75,74,0.35)]',
  ghost:   '',
  text:    '',
};

function Spinner() {
  return (
    <span
      className="w-[18px] h-[18px] rounded-full border-[2.5px] border-white/35 border-t-white animate-spin"
      aria-hidden="true"
    />
  );
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, fullWidth, children, disabled, className = '', ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={[
        base,
        variants[variant],
        sizes[size],
        shadows[variant],
        fullWidth ? 'w-full' : '',
        className,
      ].join(' ')}
      {...props}
    >
      {loading ? <Spinner /> : null}
      {children}
    </button>
  )
);
Button.displayName = 'Button';
