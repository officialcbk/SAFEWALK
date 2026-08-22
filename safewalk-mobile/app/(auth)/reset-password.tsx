import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '../../lib/supabase';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { AuthPage } from '../../components/layout/AuthPage';

const schema = z
  .object({
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, { message: 'Passwords do not match', path: ['confirm'] });
type FormData = z.infer<typeof schema>;

export default function ResetPassword() {
  const router = useRouter();
  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { password: '', confirm: '' },
  });

  const onSubmit = async ({ password }: FormData) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (!error) router.replace('/home');
  };

  return (
    <AuthPage>
      <View className="flex-1 items-center justify-center gap-6">
        <Text className="text-base font-bold text-dark-text">New password</Text>
        <View className="w-full max-w-[280px] gap-4">
          <Controller
            control={control}
            name="password"
            render={({ field }) => (
              <Input
                label="New password"
                isPassword
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
              <Input
                label="Confirm password"
                isPassword
                placeholder="••••••••"
                error={errors.confirm?.message}
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
              />
            )}
          />
          <Button loading={isSubmitting} fullWidth onPress={handleSubmit(onSubmit)}>
            Set new password
          </Button>
        </View>
      </View>
    </AuthPage>
  );
}
