type Variant = 'success' | 'warning' | 'danger' | 'info' | 'purple';
type Size = 'sm' | 'md';

interface BadgeProps {
  variant?: Variant;
  size?: Size;
  children: React.ReactNode;
  className?: string;
}

const variants: Record<Variant, string> = {
  success: 'bg-[#EAF3DE] text-[#3B6D11]',
  warning: 'bg-[#FAEEDA] text-[#854F0B]',
  danger:  'bg-[#FCEBEB] text-[#A32D2D]',
  info:    'bg-[#EEEDFE] text-[#534AB7]',
  purple:  'bg-[#EEEDFE] text-[#3C3489]',
};

const sizes: Record<Size, string> = {
  sm: 'text-[7px] px-2 py-0.5',
  md: 'text-[8px] px-2.5 py-1',
};

export function Badge({ variant = 'purple', size = 'sm', children, className = '' }: BadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center font-bold rounded-[50px]',
        variants[variant],
        sizes[size],
        className,
      ].join(' ')}
    >
      {children}
    </span>
  );
}
