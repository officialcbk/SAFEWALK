import type { ReactNode } from 'react';
import { Modal as RNModal, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
}

export function BottomSheet({ isOpen, onClose, children }: BottomSheetProps) {
  const insets = useSafeAreaInsets();
  return (
    <RNModal visible={isOpen} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/40">
        <Pressable className="absolute inset-0" onPress={onClose} />
        <View
          className="bg-white rounded-t-[24px] max-h-[90%]"
          style={{ paddingBottom: insets.bottom + 12 }}
        >
          <View className="pt-2 pb-1 items-center">
            <View className="w-11 h-1 bg-[#D5D5DD] rounded-full" />
          </View>
          <ScrollView className="px-6" contentContainerStyle={{ paddingTop: 8, paddingBottom: 8 }}>
            {children}
          </ScrollView>
        </View>
      </View>
    </RNModal>
  );
}
