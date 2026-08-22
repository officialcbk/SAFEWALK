import { useState } from 'react';
import { Text, View } from 'react-native';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../../components/ui/Button';
import { LogoBadge } from '../../components/LogoMark';

// Placeholder — the full multi-step onboarding flow (location permission
// explainer, add-a-contact prompt, etc.) is built in the next pass. For now
// this just flips profiles.onboarding_completed so the auth round trip is
// fully testable end to end.
export default function Onboarding() {
  const { session, setProfile } = useAuthStore();
  const [loading, setLoading] = useState(false);

  const finish = async () => {
    if (!session) return;
    setLoading(true);
    const { data } = await supabase
      .from('profiles')
      .update({ onboarding_completed: true })
      .eq('id', session.user.id)
      .select()
      .single();
    setProfile(data as any);
    setLoading(false);
  };

  return (
    <View className="flex-1 bg-white items-center justify-center px-8 gap-6">
      <LogoBadge size={56} />
      <View className="items-center gap-2">
        <Text className="text-2xl font-bold text-dark-text tracking-tight">Welcome to SafeWalk</Text>
        <Text className="text-sm text-gray-text text-center leading-relaxed">
          A guided setup (location permissions, your first trusted contact) is coming soon.
        </Text>
      </View>
      <Button loading={loading} onPress={finish}>
        Get started
      </Button>
    </View>
  );
}
