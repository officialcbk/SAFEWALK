import { Link, Stack } from 'expo-router';
import { Text, View } from 'react-native';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <View className="flex-1 items-center justify-center gap-4 p-5 bg-white">
        <Text className="text-lg font-bold text-dark-text">This screen doesn&apos;t exist.</Text>
        <Link href="/" className="text-purple-600 font-semibold">
          Go to home screen
        </Link>
      </View>
    </>
  );
}
