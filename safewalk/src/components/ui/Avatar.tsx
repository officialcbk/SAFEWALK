type Size = 'sm' | 'md' | 'lg';

interface AvatarProps {
  initials: string;
  size?: Size;
  className?: string;
}

const sizes: Record<Size, { outer: string; text: string }> = {
  sm: { outer: 'w-7 h-7',  text: 'text-[8px]' },
  md: { outer: 'w-8 h-8',  text: 'text-[9px]' },
  lg: { outer: 'w-10 h-10', text: 'text-[11px]' },
};

export function Avatar({ initials, size = 'md', className = '' }: AvatarProps) {
  const s = sizes[size];
  return (
    <div
      className={[
        'rounded-full bg-[#EEEDFE] flex items-center justify-center flex-shrink-0',
        s.outer,
        className,
      ].join(' ')}
      aria-hidden="true"
    >
      <span className={`font-bold text-[#3C3489] ${s.text}`}>
        {initials.slice(0, 2).toUpperCase()}
      </span>
    </div>
  );
}
