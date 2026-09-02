import { useState } from 'react';
import { Text, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import Toast from 'react-native-toast-message';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { withTimeout } from '../../services/withTimeout';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { AccountPageShell, SettingsSection } from '../../components/account/SettingsPrefs';

export default function AccountFeedback() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const { data: past } = useQuery({
    queryKey: ['feedback', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from('feedback')
        .select('id, message, created_at')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      return data ?? [];
    },
  });

  const submit = async () => {
    if (!user || !message.trim() || sending) return;
    setSending(true);
    try {
      const { error } = await withTimeout(
        supabase.from('feedback').insert({ user_id: user.id, message: message.trim() }),
        10000,
      );
      if (error) { Toast.show({ type: 'error', text1: 'Could not send feedback.' }); return; }
      setMessage('');
      qc.invalidateQueries({ queryKey: ['feedback', user.id] });
      Toast.show({ type: 'success', text1: 'Thanks — we read every one of these.' });
    } catch {
      Toast.show({ type: 'error', text1: "Couldn't connect.", text2: 'Try again.' });
    } finally {
      setSending(false);
    }
  };

  return (
    <AccountPageShell title="Feedback">
      <SettingsSection label="What should we build next?">
        <Text className="text-[13px] text-gray-text leading-relaxed">
          A feature you wish Trayl had, something that felt off, anything. This goes straight to the team.
        </Text>
        <Input
          value={message}
          onChangeText={setMessage}
          placeholder="I wish Trayl could..."
          multiline
          textAlignVertical="top"
        />
      </SettingsSection>
      <Button variant="dark" loading={sending} disabled={!message.trim()} fullWidth onPress={submit}>
        Send feedback
      </Button>

      {!!past?.length && (
        <View style={{ marginTop: 28 }}>
          <SettingsSection label="Your past feedback">
            {past.map((item) => (
              <View key={item.id} className="bg-gray-bg rounded-xl px-3.5 py-3">
                <Text className="text-sm text-dark-text leading-relaxed">{item.message}</Text>
                <Text className="text-xs text-gray-text mt-2">
                  {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                </Text>
              </View>
            ))}
          </SettingsSection>
        </View>
      )}
    </AccountPageShell>
  );
}
