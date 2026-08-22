import Svg, { Circle } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { Text, View } from 'react-native';

/** Gradient badge with the SafeWalk concentric-ring pin mark. */
export function LogoBadge({ size = 40 }: { size?: number }) {
  const iconSize = Math.round(size * 0.8);
  return (
    <LinearGradient
      colors={['#7F77DD', '#534AB7']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.3,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Svg width={iconSize} height={iconSize} viewBox="0 0 64 64">
        <Circle cx={32} cy={32} r={24} fill="none" stroke="rgba(255,255,255,0.32)" strokeWidth={2.2} />
        <Circle cx={32} cy={32} r={15} fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth={2.2} />
        <Circle cx={32} cy={32} r={6} fill="white" />
      </Svg>
    </LinearGradient>
  );
}

/** Pill-shaped "SafeWalk" wordmark used at the top of the sign-in screen. */
export function LogoMark() {
  return (
    <View
      className="flex-row items-center gap-2 bg-white rounded-full px-3.5 py-2 self-center"
      style={{ shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: 2 }, elevation: 2 }}
    >
      <LogoBadge size={28} />
      <Text className="font-bold text-sm text-dark-text">SafeWalk</Text>
    </View>
  );
}
