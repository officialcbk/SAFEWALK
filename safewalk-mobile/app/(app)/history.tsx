import { Text, View } from 'react-native';

export default function History() {
  return (
    <View className="flex-1 bg-gray-bg items-center justify-center px-8 gap-2">
      <Text className="text-2xl font-bold text-dark-text">History</Text>
      <Text className="text-sm text-gray-text text-center">
        Past walk sessions will show up here.
      </Text>
    </View>
  );
}
