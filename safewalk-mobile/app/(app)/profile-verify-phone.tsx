import { useState } from 'react';
import { Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { withTimeout } from '../../services/withTimeout';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { AccountPageShell, SettingsSection } from '../../components/account/SettingsPrefs';

export default function ProfileVerifyPhone() {
  const router = useRouter();
  const { user, profile } = useAuthStore();
  const qc = useQueryClient();
  const [verifyCode, setVerifyCode] = useState('');
  const [sendingCode, setSendingCode] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);

  const { data: profileData } = useQuery({
    queryKey: ['profile', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('*').eq('id', user!.id).single();
      return data;
    },
  });

  const displayPhone = profileData?.phone ?? profile?.phone ?? '';

  const sendPhoneCode = async () => {
    if (!displayPhone) {
      Toast.show({ type: 'info', text1: 'Add a phone number first.' });
      return;
    }
    setSendingCode(true);
    try {
      const { error } = await withTimeout(supabase.auth.updateUser({ phone: displayPhone }), 10000);
      if (error) {
        Toast.show({ type: 'error', text1: 'Could not send code.', text2: error.message });
        return;
      }
      Toast.show({ type: 'success', text1: 'Verification code sent.' });
    } catch {
      Toast.show({ type: 'error', text1: "Couldn't connect.", text2: 'Try again.' });
    } finally {
      setSendingCode(false);
    }
  };

  const verifyPhoneCode = async () => {
    if (!user || !displayPhone || !verifyCode.trim()) return;
    setVerifyingCode(true);
    try {
      const { error } = await withTimeout(
        supabase.auth.verifyOtp({ phone: displayPhone, token: verifyCode.trim(), type: 'phone_change' }),
        10000,
      );
      if (error) {
        Toast.show({ type: 'error', text1: 'Invalid code.', text2: error.message });
        return;
      }
      await withTimeout(
        supabase.from('profiles').update({ phone_verified_at: new Date().toISOString() }).eq('id', user.id),
        10000,
      );
      qc.invalidateQueries({ queryKey: ['profile', user.id] });
      Toast.show({ type: 'success', text1: 'Phone verified.' });
      router.navigate('/profile');
    } catch {
      Toast.show({ type: 'error', text1: "Couldn't connect.", text2: 'Try again.' });
    } finally {
      setVerifyingCode(false);
    }
  };

  return (
    <AccountPageShell title="Verify phone" backTo="/profile">
      <SettingsSection label="Verification">
        <Text className="text-[13px] text-gray-text leading-relaxed">
          Enter the code sent to {displayPhone || 'your phone'}.
        </Text>
        <Input label="Verification code" keyboardType="number-pad" value={verifyCode} onChangeText={setVerifyCode} />
      </SettingsSection>
      <Button variant="dark" loading={verifyingCode} fullWidth onPress={verifyPhoneCode}>Verify phone</Button>
      <Button variant="ghost-dark" loading={sendingCode} fullWidth onPress={sendPhoneCode}>Resend code</Button>
    </AccountPageShell>
  );
}
