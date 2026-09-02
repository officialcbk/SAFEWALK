import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '../../lib/supabase';
import { withTimeout } from '../../services/withTimeout';
import { AuthPage } from '../../components/layout/AuthPage';
import { MonoLogoMark } from '../../components/LogoMark';
import { FormInput } from '../../components/auth/FormInput';

const schema = z
  .object({
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, { message: 'Passwords do not match', path: ['confirm'] });
type FormData = z.infer<typeof schema>;

export default function ResetPassword() {
  const router = useRouter();
  const [serverError, setServerError] = useState('');
  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { password: '', confirm: '' },
  });

  const onSubmit = async ({ password }: FormData) => {
    setServerError('');
    try {
      const { error } = await withTimeout(supabase.auth.updateUser({ password }), 10000);
      // Previously silent on failure — a rejected password or an expired
      // reset link just re-enabled the button with zero explanation.
      if (error) { setServerError(error.message); return; }
      router.replace('/home');
    } catch {
      setServerError("Couldn't connect. Check your connection and try again.");
    }
  };

  return (
    <AuthPage>
      <View className="flex-1 items-center justify-center gap-6">
        <MonoLogoMark />
        <Text className="text-2xl font-sans-extrabold text-ink tracking-tight">New password</Text>
        <View className="w-full max-w-[320px] gap-3.5">
          <Controller
            control={control}
            name="password"
            render={({ field }) => (
              <FormInput
                label="New password"
                isPassword
                autoComplete="new-password"
                textContentType="newPassword"
                placeholder="Min. 8 characters"
                error={errors.password?.message}
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
              />
            )}
          />
          <Controller
            control={control}
            name="confirm"
            render={({ field }) => (
              <FormInput
                label="Confirm password"
                isPassword
                autoComplete="new-password"
                textContentType="newPassword"
                placeholder="••••••••"
                error={errors.confirm?.message || serverError}
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
              {isSubmitting ? 'Saving…' : 'Set new password'}
            </Text>
          </Pressable>
        </View>
      </View>
    </AuthPage>
  );
}
