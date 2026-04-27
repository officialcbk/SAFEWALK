import type { LucideIcon } from 'lucide-react';
import { Button } from './Button';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon: Icon, title, body, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center gap-3">
      <div className="w-14 h-14 rounded-full bg-[#EEEDFE] flex items-center justify-center">
        <Icon size={22} className="text-[#7F77DD]" />
      </div>
      <h3 className="text-[14px] font-bold text-[#1A1A28]">{title}</h3>
      <p className="text-[11px] text-[#888899] leading-relaxed max-w-[240px]">{body}</p>
      {actionLabel && onAction && (
        <Button variant="primary" size="md" onClick={onAction} className="mt-1">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
