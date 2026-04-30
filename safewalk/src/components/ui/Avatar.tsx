interface AvatarProps {
  initials: string;
  /** pixel size — defaults to 36 */
  size?: number | 'sm' | 'md' | 'lg';
  className?: string;
}

const presetSizes: Record<string, number> = { sm: 28, md: 36, lg: 44 };

export function Avatar({ initials, size = 36, className = '' }: AvatarProps) {
  const px = typeof size === 'number' ? size : presetSizes[size] ?? 36;
  const fontSize = Math.round(px * 0.38);

  return (
    <div
      className={['rounded-full bg-[#EEEDFE] flex items-center justify-center flex-shrink-0', className].join(' ')}
      style={{ width: px, height: px }}
      aria-hidden="true"
    >
      <span className="font-bold text-[#534AB7]" style={{ fontSize }}>
        {initials.slice(0, 2).toUpperCase()}
      </span>
    </div>
  );
}
