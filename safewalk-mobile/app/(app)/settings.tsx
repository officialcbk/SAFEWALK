import { Text, View } from 'react-native';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../../components/ui/Button';

export default function Settings() {
  const profile = useAuthStore((s) => s.profile);

  return (
    <View className="flex-1 bg-gray-bg px-5 pt-6 gap-6">
      <View>
        <Text className="text-2xl font-bold text-dark-text">Settings</Text>
        {!!profile?.full_name && <Text className="text-sm text-gray-text mt-1">{profile.full_name}</Text>}
      </View>
      <Button variant="danger" onPress={() => supabase.auth.signOut()}>
        Sign out
      </Button>
    </View>
  );
}
