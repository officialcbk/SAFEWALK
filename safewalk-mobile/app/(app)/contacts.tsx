import { Text, View } from 'react-native';

export default function Contacts() {
  return (
    <View className="flex-1 bg-gray-bg items-center justify-center px-8 gap-2">
      <Text className="text-2xl font-bold text-dark-text">Contacts</Text>
      <Text className="text-sm text-gray-text text-center">
        Trusted-contact management is coming in the next pass.
      </Text>
    </View>
  );
}
