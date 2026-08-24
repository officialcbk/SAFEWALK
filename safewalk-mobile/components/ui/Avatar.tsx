import { Text, View } from 'react-native';

interface AvatarProps {
  initials: string;
  /** pixel size — defaults to 36 */
  size?: number;
}

export function Avatar({ initials, size = 36 }: AvatarProps) {
  const fontSize = Math.round(size * 0.38);
  return (
    <View
      className="rounded-full bg-purple-50 items-center justify-center"
      style={{ width: size, height: size }}
    >
      <Text style={{ fontSize }} className="font-bold text-purple-600">
        {initials.slice(0, 2).toUpperCase()}
      </Text>
    </View>
  );
}
