import type { ReactNode } from 'react';
import { Modal as RNModal, Pressable, Text, View } from 'react-native';
import { X } from 'lucide-react-native';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  return (
    <RNModal visible={isOpen} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center p-4 bg-black/50">
        <Pressable className="absolute inset-0" onPress={onClose} />
        <View className="relative bg-white rounded-[18px] w-full max-w-[320px] p-6">
          {title && (
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-xl font-bold text-dark-text tracking-tight flex-1 pr-2">{title}</Text>
              <Pressable onPress={onClose} className="w-8 h-8 bg-gray-bg rounded-full items-center justify-center">
                <X size={14} color="#888899" />
              </Pressable>
            </View>
          )}
          {children}
        </View>
      </View>
    </RNModal>
  );
}
