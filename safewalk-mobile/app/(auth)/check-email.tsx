import { useState } from 'react';
import { Linking as RNLinking, Text, View } from 'react-native';
import { Link, useLocalSearchParams } from 'expo-router';
import Svg, { Path, Rect } from 'react-native-svg';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { AuthPage } from '../../components/layout/AuthPage';

export default function CheckEmail() {
  const { email = '' } = useLocalSearchParams<{ email?: string }>();
  const [cooldown, setCooldown] = useState(0);

  const resend = async () => {
    if (!email || cooldown > 0) return;
    await supabase.auth.resend({ type: 'signup', email });
    setCooldown(60);
    const t = setInterval(() => {
      setCooldown((s) => {
        if (s <= 1) { clearInterval(t); return 0; }
        return s - 1;
      });
    }, 1000);
  };

  return (
    <AuthPage>
      <View className="flex-1 items-center justify-center gap-6 py-8">
        <View className="w-[88px] h-[88px] rounded-full items-center justify-center bg-status-safe-bg">
          <Svg width={36} height={36} viewBox="0 0 24 24" fill="none" stroke="#3B6D11" strokeWidth={2}>
            <Rect x={2} y={4} width={20} height={16} rx={2} />
            <Path d="m2 7 10 6 10-6" />
          </Svg>
        </View>

        <View className="items-center gap-1.5">
          <Text className="text-[26px] font-bold text-dark-text tracking-tight">Check your email</Text>
          <Text className="text-sm text-[#4A4A5A]">We sent a confirmation link to</Text>
          <Text className="text-[15px] font-bold text-dark-text">{email || 'your inbox'}</Text>
          <Text className="text-sm text-[#4A4A5A]">Click it to activate your account.</Text>
        </View>

        <View className="w-full gap-2.5">
          {!!email && (
            <Button fullWidth onPress={() => RNLinking.openURL(`mailto:${email}`)}>
              Open email app
            </Button>
          )}
          <Button variant="ghost" fullWidth disabled={cooldown > 0} onPress={resend}>
            {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend email'}
          </Button>
        </View>

        <Link href="/sign-in" asChild>
          <Text className="text-[13px] font-semibold text-purple-600 mt-2">← Back to sign in</Text>
        </Link>
      </View>
    </AuthPage>
  );
}
