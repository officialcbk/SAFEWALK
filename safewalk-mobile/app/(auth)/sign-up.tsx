import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '../../lib/supabase';
import { AuthPage } from '../../components/layout/AuthPage';
import { MonoLogoMark } from '../../components/LogoMark';
import { FormInput } from '../../components/auth/FormInput';

const schema = z.object({
  full_name: z.string().min(1, 'Name is required'),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});
type FormData = z.infer<typeof schema>;

// Semantic strength colors — separate from the app's monochrome accent, same
// as the safe/warn/danger tokens used for check-in and status elsewhere.
function strengthInfo(pw: string) {
  if (pw.length < 6) return { label: 'Weak', color: '#E5342A', w: '30%' as const };
  if (pw.length < 10) return { label: 'Fair', color: '#B5860B', w: '60%' as const };
  return { label: 'Strong', color: '#3B6D11', w: '100%' as const };
}

export default function SignUp() {
  const router = useRouter();
  const [serverError, setServerError] = useState('');

  const { control, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { full_name: '', email: '', password: '' },
  });
  const password = watch('password');

  const onSubmit = async ({ full_name, email, password }: FormData) => {
    setServerError('');
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name } },
    });
    if (error) {
      if (error.message.includes('already registered') || error.message.includes('already exists')) {
        setServerError('An account with this email already exists.');
      } else {
        setServerError(error.message);
      }
      return;
    }
    router.push({ pathname: '/check-email', params: { email } });
  };

  const strength = password?.length > 0 ? strengthInfo(password) : null;

  return (
    <AuthPage>
      <View className="flex-1">
        <View className="mt-4 items-center gap-3 mb-6">
          <MonoLogoMark />
          <View className="items-center">
            <Text className="text-[22px] font-sans-extrabold text-ink tracking-tight">Create account</Text>
            <Text className="text-[13px] font-sans text-black/50 mt-0.5">Safe in 2 minutes</Text>
          </View>
        </View>

        <View className="gap-3.5">
          <Controller
            control={control}
            name="full_name"
            render={({ field }) => (
              <FormInput
                label="Full name"
                autoComplete="name"
                placeholder="Alex Johnson"
                error={errors.full_name?.message}
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
              />
            )}
          />
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
          <View>
            <Controller
              control={control}
              name="password"
              render={({ field }) => (
                <FormInput
                  label="Password"
                  isPassword
                  autoComplete="new-password"
                  textContentType="newPassword"
                  placeholder="Min. 8 characters"
                  error={errors.password?.message || serverError}
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                />
              )}
            />
            {strength && (
              <View className="flex-row items-center gap-2 mt-1.5">
                <View className="flex-1 h-1 bg-fill rounded-full overflow-hidden">
                  <View style={{ width: strength.w, backgroundColor: strength.color }} className="h-full rounded-full" />
                </View>
                <Text style={{ color: strength.color }} className="text-[11px] font-sans-semibold">
                  {strength.label}
                </Text>
              </View>
            )}
          </View>

          <Pressable
            disabled={isSubmitting}
            onPress={handleSubmit(onSubmit)}
            className="h-[54px] rounded-2xl bg-ink items-center justify-center flex-row gap-2 mt-1"
            style={{ opacity: isSubmitting ? 0.6 : 1 }}
          >
            <Text className="font-sans-bold text-[15px] text-white">
              {isSubmitting ? 'Creating account…' : 'Create account'}
            </Text>
          </Pressable>
        </View>

        <Text className="text-center mt-3 text-xs font-sans text-black/50">
          By creating an account you agree to our{' '}
          <Text className="text-ink font-sans-semibold">Terms</Text> ·{' '}
          <Text className="text-ink font-sans-semibold">Privacy</Text>
        </Text>

        <View className="flex-1" />

        <View className="flex-row justify-center mt-4">
          <Text className="text-[13px] font-sans text-black/50">Already have an account? </Text>
          <Link href="/sign-in" asChild>
            <Text className="text-[13px] font-sans-semibold text-ink">Sign in →</Text>
          </Link>
        </View>
      </View>
    </AuthPage>
  );
}
