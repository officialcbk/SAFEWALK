import { useState } from 'react';
import { Text, View } from 'react-native';
import { Link } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Svg, { Path, Rect } from 'react-native-svg';
import { supabase } from '../../lib/supabase';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { AuthPage } from '../../components/layout/AuthPage';
import { LogoMark } from '../../components/LogoMark';

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
    const { error } = await supabase.auth.signInWithPassword({ email, password });
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
  };

  return (
    <AuthPage>
      <View className="flex-1">
        {/* Header */}
        <View className="mt-7 items-center gap-3.5 mb-9">
          <LogoMark />
          <View className="items-center">
            <Text className="text-2xl font-bold text-dark-text tracking-tight">Welcome back</Text>
            <Text className="text-sm text-gray-text mt-1">Your safety, always on</Text>
          </View>
        </View>

        {/* Form */}
        <View className="gap-3.5">
          <Controller
            control={control}
            name="email"
            render={({ field }) => (
              <Input
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
              <Input
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

          <Button loading={isSubmitting} fullWidth onPress={handleSubmit(onSubmit)} className="mt-1.5">
            Sign in
          </Button>
        </View>

        <Link href="/forgot-password" asChild>
          <Text className="text-center text-[13px] font-semibold text-purple-600 mt-3.5">
            Forgot password?
          </Text>
        </Link>

        <View className="flex-1" />

        {/* Security note */}
        <View className="flex-row items-center gap-2.5 bg-purple-50 rounded-md px-3.5 py-3 mt-6">
          <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#534AB7" strokeWidth={2}>
            <Rect x={4} y={11} width={16} height={10} rx={2} />
            <Path d="M8 11V7a4 4 0 0 1 8 0v4" />
          </Svg>
          <Text className="text-xs font-medium text-purple-800 flex-1">
            End-to-end encrypted · PIPEDA compliant
          </Text>
        </View>

        <View className="flex-row justify-center mt-4">
          <Text className="text-[13px] text-gray-text">New here? </Text>
          <Link href="/sign-up" asChild>
            <Text className="text-[13px] font-semibold text-purple-600">Create account →</Text>
          </Link>
        </View>
      </View>
    </AuthPage>
  );
}
