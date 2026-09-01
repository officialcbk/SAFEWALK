import { useState } from 'react';
import { Linking as RNLinking, Pressable, Text, View } from 'react-native';
import { Link, useLocalSearchParams } from 'expo-router';
import Svg, { Path, Rect } from 'react-native-svg';
import { supabase } from '../../lib/supabase';
import { AuthPage } from '../../components/layout/AuthPage';
import { MonoLogoMark } from '../../components/LogoMark';

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
        <MonoLogoMark />

        {/* Semantic success color — same green used for check-in/status elsewhere in the app. */}
        <View className="w-[88px] h-[88px] rounded-full items-center justify-center bg-fill">
          <Svg width={36} height={36} viewBox="0 0 24 24" fill="none" stroke="#3B6D11" strokeWidth={2}>
            <Rect x={2} y={4} width={20} height={16} rx={2} />
            <Path d="m2 7 10 6 10-6" />
          </Svg>
        </View>

        <View className="items-center gap-1.5">
          <Text className="text-[26px] font-sans-extrabold text-ink tracking-tight">Check your email</Text>
          <Text className="text-sm font-sans text-black/50">We sent a confirmation link to</Text>
          <Text className="text-[15px] font-sans-bold text-ink">{email || 'your inbox'}</Text>
          <Text className="text-sm font-sans text-black/50">Click it to activate your account.</Text>
        </View>

        <View className="w-full gap-2.5">
          {!!email && (
            <Pressable
              onPress={() => RNLinking.openURL(`mailto:${email}`)}
              className="h-[54px] rounded-2xl bg-ink items-center justify-center flex-row gap-2"
            >
              <Text className="font-sans-bold text-[15px] text-white">Open email app</Text>
            </Pressable>
          )}
          <Pressable
            disabled={cooldown > 0}
            onPress={resend}
            className="h-[54px] rounded-2xl bg-fill items-center justify-center flex-row gap-2"
            style={{ opacity: cooldown > 0 ? 0.5 : 1 }}
          >
            <Text className="font-sans-semibold text-[15px] text-ink">
              {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend email'}
            </Text>
          </Pressable>
        </View>

        <Link href="/sign-in" asChild>
          <Text className="text-[13px] font-sans-semibold text-ink mt-2">← Back to sign in</Text>
        </Link>
      </View>
    </AuthPage>
  );
}
