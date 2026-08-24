import { Pressable } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

export function RecenterButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel="Return to my location"
      className="w-12 h-12 bg-white rounded-full items-center justify-center"
      style={{ shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 5 }}
    >
      <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
        <Circle cx={12} cy={12} r={4} fill="#4285F4" />
        <Path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke="#4285F4" strokeWidth={2} strokeLinecap="round" />
        <Circle cx={12} cy={12} r={9} stroke="#4285F4" strokeWidth={1.5} fill="none" />
      </Svg>
    </Pressable>
  );
}
