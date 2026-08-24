import { useEffect, useState } from 'react';
import { Modal, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { Button } from '../ui/Button';

export function CheckInOverlay({ onSafe }: { onSafe: () => void }) {
  const insets = useSafeAreaInsets();
  const [count, setCount] = useState(30);

  useEffect(() => {
    const id = setInterval(() => setCount((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    // A real Modal (separate native layer), not an absolutely-positioned
    // View — on Android, react-native-maps' native SurfaceView can swallow
    // touches meant for plain overlay Views drawn "on top" of it, even
    // though they render correctly visually. Modal sits in its own window
    // and isn't affected by that.
    <Modal visible transparent animationType="fade" statusBarTranslucent>
      <View className="flex-1 justify-end">
        <View className="absolute inset-0 bg-black/40" />
        <View
          className="bg-status-warn-bg px-6 pt-2"
          style={{ borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: insets.bottom + 24 }}
        >
          <View className="w-11 h-1 bg-[#E8C088] rounded-full self-center mb-5" />
          <View className="w-14 h-14 rounded-full items-center justify-center mb-3.5 self-center" style={{ backgroundColor: 'rgba(133,79,11,0.12)' }}>
            <Svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="#854F0B" strokeWidth={2}>
              <Path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
              <Path d="M12 9v4" /><Path d="M12 17h.01" />
            </Svg>
          </View>
          <Text className="text-[22px] font-bold text-dark-text text-center mb-1.5 tracking-tight">Are you okay?</Text>
          <Text className="text-sm text-status-warn text-center mb-5">Your contacts will be alerted after the countdown</Text>
          <View className="w-20 h-16 rounded-2xl items-center justify-center self-center mb-6" style={{ backgroundColor: 'rgba(133,79,11,0.10)' }}>
            <Text className="font-bold text-[32px] text-status-warn">0:{String(count).padStart(2, '0')}</Text>
          </View>
          <Button fullWidth onPress={onSafe} className="bg-status-warn">
            I&apos;m okay
          </Button>
        </View>
      </View>
    </Modal>
  );
}
