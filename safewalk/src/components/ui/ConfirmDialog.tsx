import { Modal } from './Modal';
import { Button } from './Button';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  body: string;
  confirmLabel?: string;
  confirmVariant?: 'primary' | 'danger';
  loading?: boolean;
}

export function ConfirmDialog({
  isOpen, onClose, onConfirm, title, body,
  confirmLabel = 'Confirm', confirmVariant = 'primary', loading,
}: ConfirmDialogProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <p className="text-[13px] text-[#888899] leading-relaxed mb-5">{body}</p>
      <div className="flex gap-2.5">
        <Button variant="ghost" fullWidth onClick={onClose} disabled={loading}>Cancel</Button>
        <Button variant={confirmVariant} fullWidth onClick={onConfirm} loading={loading}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
