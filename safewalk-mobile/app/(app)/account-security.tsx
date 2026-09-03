import { useState } from 'react';
import { Text, View } from 'react-native';
import Toast from 'react-native-toast-message';
import { useRouter } from 'expo-router';
import { AccountPageShell, SettingsActionRow, SettingsSection } from '../../components/account/SettingsPrefs';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { withTimeout } from '../../services/withTimeout';

export default function AccountSecurity() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);

  const changePassword = async () => {
    if (password.length < 8) {
      Toast.show({ type: 'error', text1: 'Password must be at least 8 characters.' });
      return;
    }
    if (password !== confirm) {
      Toast.show({ type: 'error', text1: 'Passwords do not match.' });
      return;
    }
    setSaving(true);
    try {
      const { error } = await withTimeout(supabase.auth.updateUser({ password }), 10000);
      if (error) {
        Toast.show({ type: 'error', text1: 'Could not change password.', text2: error.message });
        return;
      }
      setPassword('');
      setConfirm('');
      Toast.show({ type: 'success', text1: 'Password changed.' });
    } catch {
      Toast.show({ type: 'error', text1: "Couldn't connect.", text2: 'Try again.' });
    } finally {
      setSaving(false);
    }
  };

  const sendResetLink = async () => {
    if (!user?.email) return;
    setSendingReset(true);
    try {
      const { error } = await withTimeout(supabase.auth.resetPasswordForEmail(user.email), 10000);
      if (error) {
        Toast.show({ type: 'error', text1: 'Could not send reset link.', text2: error.message });
        return;
      }
      Toast.show({ type: 'success', text1: 'Reset link sent.', text2: user.email });
    } catch {
      Toast.show({ type: 'error', text1: "Couldn't connect.", text2: 'Try again.' });
    } finally {
      setSendingReset(false);
    }
  };

  return (
    <AccountPageShell title="Security">
      <SettingsSection label="Password">
        <Input label="New password" isPassword value={password} onChangeText={setPassword} placeholder="Min. 8 characters" autoComplete="new-password" textContentType="newPassword" />
        <Input label="Confirm password" isPassword value={confirm} onChangeText={setConfirm} placeholder="Re-enter password" autoComplete="new-password" textContentType="newPassword" />
        <Button variant="dark" loading={saving} fullWidth onPress={changePassword}>Change password</Button>
        <Button variant="ghost-dark" loading={sendingReset} fullWidth onPress={sendResetLink}>Email reset link</Button>
      </SettingsSection>

      <SettingsSection label="Verification">
        <SettingsActionRow title="Phone verification" sub="Add or verify your number from Profile" value="Open" onPress={() => router.push('/profile')} />
        <SettingsActionRow title="Email status" sub={user?.email ?? 'No email on account'} value={user?.email_confirmed_at ? 'Verified' : 'Pending'} onPress={() => Toast.show({ type: 'info', text1: user?.email_confirmed_at ? 'Email verified.' : 'Check your inbox for the verification email.' })} />
      </SettingsSection>

      <View style={{ paddingTop: 2 }}>
        <Text className="text-xs text-gray-text leading-relaxed">
          Use a password you do not use anywhere else. Trayl will never ask for your password during an active walk.
        </Text>
      </View>
    </AccountPageShell>
  );
}
