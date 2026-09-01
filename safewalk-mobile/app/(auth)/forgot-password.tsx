import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Link } from 'expo-router';
import * as Linking from 'expo-linking';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Svg, { Path, Rect } from 'react-native-svg';
import { supabase } from '../../lib/supabase';
import { AuthPage } from '../../components/layout/AuthPage';
import { MonoLogoMark } from '../../components/LogoMark';
import { FormInput } from '../../components/auth/FormInput';

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
        <View className="mt-7 items-center gap-3.5 mb-9">
          <MonoLogoMark />
          <View className="items-center">
            <Text className="text-2xl font-sans-extrabold text-ink tracking-tight">Reset password</Text>
            {!sent && (
              <Text className="text-sm font-sans text-black/50 mt-1 text-center">
                Enter your email and we&apos;ll send you a reset link.
              </Text>
            )}
          </View>
        </View>

        {sent ? (
          <View className="items-center gap-4">
            {/* Semantic success color — same green used for check-in/status elsewhere in the app. */}
            <View className="w-[72px] h-[72px] rounded-full items-center justify-center bg-fill">
              <Svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="#3B6D11" strokeWidth={2}>
                <Rect x={2} y={4} width={20} height={16} rx={2} />
                <Path d="m2 7 10 6 10-6" />
              </Svg>
            </View>
            <Text className="text-sm font-sans text-black/60 text-center leading-relaxed px-2">
              If an account exists for that email, a reset link has been sent. Check your inbox.
            </Text>
            <Link href="/sign-in" asChild>
              <Text className="text-[13px] font-sans-semibold text-ink">← Back to sign in</Text>
            </Link>
          </View>
        ) : (
          <View className="gap-3.5">
            <Controller
              control={control}
              name="email"
              render={({ field }) => (
                <FormInput
                  label="Email"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  textContentType="emailAddress"
                  placeholder="you@email.com"
                  error={errors.email?.message}
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                />
              )}
            />

            <Pressable
              disabled={isSubmitting}
              onPress={handleSubmit(onSubmit)}
              className="h-[54px] rounded-2xl bg-ink items-center justify-center flex-row gap-2 mt-1"
              style={{ opacity: isSubmitting ? 0.6 : 1 }}
            >
              <Text className="font-sans-bold text-[15px] text-white">
                {isSubmitting ? 'Sending…' : 'Send reset link'}
              </Text>
            </Pressable>

            <Link href="/sign-in" asChild>
              <Text className="text-[13px] font-sans-semibold text-ink text-center mt-1">
                ← Back to sign in
              </Text>
            </Link>
          </View>
        )}
      </View>
    </AuthPage>
  );
}
