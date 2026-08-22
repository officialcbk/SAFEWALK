import { Text, View } from 'react-native';
import { useAuthStore } from '../../store/authStore';

export default function Home() {
  const profile = useAuthStore((s) => s.profile);

  return (
    <View className="flex-1 bg-gray-bg items-center justify-center px-8 gap-2">
      <Text className="text-2xl font-bold text-dark-text">
        Hey{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''} 👋
      </Text>
      <Text className="text-sm text-gray-text text-center">
        The walk map, SOS button, and live check-ins land here next.
      </Text>
    </View>
  );
}
