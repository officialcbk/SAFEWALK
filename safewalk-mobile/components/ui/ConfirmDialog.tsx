import { Text, View } from 'react-native';
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
      <Text className="text-[13px] text-gray-text leading-relaxed mb-5">{body}</Text>
      <View className="flex-row gap-2.5">
        <View className="flex-1">
          <Button variant="ghost" fullWidth onPress={onClose} disabled={loading}>
            Cancel
          </Button>
        </View>
        <View className="flex-1">
          <Button variant={confirmVariant} fullWidth onPress={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </View>
      </View>
    </Modal>
  );
}
