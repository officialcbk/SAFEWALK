import { Pressable, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';

export function ArrivalPrompt({
  destination,
  bottomOffset,
  onEnd,
  onDismiss,
}: {
  destination: string | null;
  bottomOffset: number;
  onEnd: () => void;
  onDismiss: () => void;
}) {
  return (
    <View className="absolute left-0 right-0 px-4" style={{ bottom: bottomOffset, zIndex: 20 }}>
      <View
        className="bg-white rounded-[18px] p-4"
        style={{ shadowColor: '#000', shadowOpacity: 0.16, shadowRadius: 20, shadowOffset: { width: 0, height: -4 }, elevation: 8 }}
      >
        <View className="flex-row items-center gap-3 mb-3">
          <View className="w-10 h-10 rounded-full items-center justify-center" style={{ backgroundColor: '#E8F5E9' }}>
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#2E7D32" strokeWidth={2.5}>
              <Path d="M20 6 9 17l-5-5" />
            </Svg>
          </View>
          <View className="flex-1 min-w-0">
            <Text className="text-[15px] font-bold text-dark-text">You&apos;ve nearly arrived!</Text>
            {destination && <Text className="text-xs text-gray-text" numberOfLines={1}>{destination}</Text>}
          </View>
        </View>
        <View className="flex-row gap-2">
          <Pressable onPress={onDismiss} className="flex-1 h-10 rounded-xl bg-gray-bg items-center justify-center">
            <Text className="text-[13px] font-semibold text-gray-text">Keep walking</Text>
          </Pressable>
          <Pressable onPress={onEnd} className="flex-1 h-10 rounded-xl overflow-hidden items-center justify-center">
            <LinearGradient colors={['#7F77DD', '#534AB7']} style={{ position: 'absolute', inset: 0 }} />
            <Text className="text-[13px] font-semibold text-white">End walk</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
