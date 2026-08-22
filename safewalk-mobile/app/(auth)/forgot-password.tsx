import { useState } from 'react';
import { Text, View } from 'react-native';
import { Link } from 'expo-router';
import * as Linking from 'expo-linking';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Svg, { Path, Rect } from 'react-native-svg';
import { supabase } from '../../lib/supabase';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { AuthPage } from '../../components/layout/AuthPage';
import { LogoBadge } from '../../components/LogoMark';

const schema = z.object({ email: z.string().email('Enter a valid email') });
type FormData = z.infer<typeof schema>;

export default function ForgotPassword() {
  const [sent, setSent] = useState(false);

  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  });

  const onSubmit = async ({ email }: FormData) => {
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: Linking.createURL('callback'),
    });
    setSent(true);
  };

  return (
    <AuthPage>
      <View className="flex-1">
        <View className="mt-7 items-center gap-3 mb-8">
          <LogoBadge />
          <Text className="text-[22px] font-bold text-dark-text tracking-tight">Reset password</Text>
        </View>

        {sent ? (
          <View className="items-center gap-4">
            <View className="w-[72px] h-[72px] rounded-full bg-status-safe-bg items-center justify-center">
              <Svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="#3B6D11" strokeWidth={2}>
                <Rect x={2} y={4} width={20} height={16} rx={2} />
                <Path d="m2 7 10 6 10-6" />
              </Svg>
            </View>
            <Text className="text-sm text-[#4A4A5A] text-center leading-relaxed">
              If an account exists for that email, a reset link has been sent. Check your inbox.
            </Text>
            <Link href="/sign-in" asChild>
              <Text className="text-[13px] font-semibold text-purple-600">← Back to sign in</Text>
            </Link>
          </View>
        ) : (
          <View className="gap-3.5">
            <Text className="text-sm text-gray-text leading-relaxed mb-1">
              Enter your email and we&apos;ll send you a reset link.
            </Text>
            <Controller
              control={control}
              name="email"
              render={({ field }) => (
                <Input
                  label="Email"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  placeholder="you@email.com"
                  error={errors.email?.message}
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                />
              )}
            />
            <Button loading={isSubmitting} fullWidth onPress={handleSubmit(onSubmit)}>
              Send reset link
            </Button>
            <Link href="/sign-in" asChild>
              <Text className="text-[13px] font-semibold text-purple-600 text-center mt-1">
                ← Back to sign in
              </Text>
            </Link>
          </View>
        )}
      </View>
    </AuthPage>
  );
}
