import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Svg, { Path, Rect } from 'react-native-svg';
import { supabase } from '../../lib/supabase';
import { withTimeout } from '../../services/withTimeout';
import { AuthPage } from '../../components/layout/AuthPage';
import { MonoLogoMark } from '../../components/LogoMark';
import { FormInput } from '../../components/auth/FormInput';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});
type FormData = z.infer<typeof schema>;

export default function SignIn() {
  const [serverError, setServerError] = useState('');

  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async ({ email, password }: FormData) => {
    setServerError('');
    try {
      // react-hook-form's isSubmitting tracks this promise directly — a
      // stalled connection used to leave the button stuck reading "Signing
      // in…" forever with no error and no way to retry.
      const { error } = await withTimeout(supabase.auth.signInWithPassword({ email, password }), 10000);
      if (error) {
        if (error.message.includes('Invalid login') || error.message.includes('credentials')) {
          setServerError('Incorrect email or password.');
        } else if (error.message.includes('Email not confirmed')) {
          setServerError('Please confirm your email. Check your inbox.');
        } else {
          setServerError(error.message);
        }
      }
      // On success, AuthGate (root layout) picks up the new session and redirects.
    } catch {
      setServerError("Couldn't connect. Check your connection and try again.");
    }
  };

  return (
    <AuthPage>
      <View className="flex-1">
        {/* Header */}
        <View className="mt-7 items-center gap-3.5 mb-9">
          <MonoLogoMark />
          <View className="items-center">
            <Text className="text-2xl font-sans-extrabold text-ink tracking-tight">Welcome back</Text>
            <Text className="text-sm font-sans text-black/50 mt-1">Your safety, always on</Text>
          </View>
        </View>

        {/* Form */}
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
          <Controller
            control={control}
            name="password"
            render={({ field }) => (
              <FormInput
                label="Password"
                isPassword
                autoComplete="current-password"
                textContentType="password"
                placeholder="••••••••"
                error={errors.password?.message || serverError}
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
              />
            )}
          />

          <Pressable
            disabled={isSubmitting}
            onPress={handleSubmit(onSubmit)}
            className="h-[54px] rounded-2xl bg-ink items-center justify-center flex-row gap-2 mt-1.5"
            style={{ opacity: isSubmitting ? 0.6 : 1 }}
          >
            <Text className="font-sans-bold text-[15px] text-white">
              {isSubmitting ? 'Signing in…' : 'Sign in'}
            </Text>
          </Pressable>
        </View>

        <Link href="/forgot-password" asChild>
          <Text className="text-center text-[13px] font-sans-semibold text-ink mt-3.5">
            Forgot password?
          </Text>
        </Link>

        <View className="flex-1" />

        {/* Security note */}
        <View className="flex-row items-center gap-2.5 bg-fill rounded-xl px-3.5 py-3 mt-6">
          <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#0A0A0A" strokeWidth={2}>
            <Rect x={4} y={11} width={16} height={10} rx={2} />
            <Path d="M8 11V7a4 4 0 0 1 8 0v4" />
          </Svg>
          <Text className="font-sans-medium text-xs text-black/60 flex-1">
            End-to-end encrypted · PIPEDA compliant
          </Text>
        </View>

        <View className="flex-row justify-center mt-4">
          <Text className="text-[13px] font-sans text-black/50">New here? </Text>
          <Link href="/sign-up" asChild>
            <Text className="text-[13px] font-sans-semibold text-ink">Create account →</Text>
          </Link>
        </View>
      </View>
    </AuthPage>
  );
}
