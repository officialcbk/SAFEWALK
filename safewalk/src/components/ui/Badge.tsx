type Variant = 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'amber';

interface BadgeProps {
  variant?: Variant;
  children: React.ReactNode;
  className?: string;
}

const variants: Record<Variant, string> = {
  success: 'bg-[#EAF3DE] text-[#3B6D11]',
  warning: 'bg-[#FAEEDA] text-[#854F0B]',
  amber:   'bg-[#FAEEDA] text-[#854F0B]',
  danger:  'bg-[#FCEBEB] text-[#A32D2D]',
  info:    'bg-[#EEEDFE] text-[#534AB7]',
  purple:  'bg-[#EEEDFE] text-[#534AB7]',
};

export function Badge({ variant = 'purple', children, className = '' }: BadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center gap-1 h-[22px] px-2 rounded-full text-[11px] font-semibold tracking-[0.1px]',
        variants[variant],
        className,
      ].join(' ')}
    >
      {children}
    </span>
  );
}
