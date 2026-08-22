import { ActivityIndicator, View } from 'react-native';

export function FullPageSpinner() {
  return (
    <View className="flex-1 items-center justify-center bg-gray-bg">
      <ActivityIndicator size="large" color="#534AB7" />
    </View>
  );
}
