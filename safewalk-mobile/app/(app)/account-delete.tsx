import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { useWalkStore } from '../../store/walkStore';
import { withTimeout } from '../../services/withTimeout';
import { AccountPageShell } from '../../components/account/SettingsPrefs';

export default function AccountDelete() {
  const router = useRouter();
  const { user, clear } = useAuthStore();
  const endWalk = useWalkStore((s) => s.endWalk);
  const [deleteInput, setDeleteInput] = useState('');
  const [deleting, setDeleting] = useState(false);

  const deleteAll = async () => {
    if (!user || deleteInput !== 'DELETE' || deleting) return;
    setDeleting(true);
    try {
      // The edge function deletes everything (contacts, walks, profile,
      // feedback, and the auth account itself) atomically server-side —
      // it used to not exist at all, so this call silently failed and the
      // app claimed success anyway while the real auth account lived on.
      const { error } = await withTimeout(
        supabase.functions.invoke('delete-account'),
        15000,
      );
      if (error) {
        Toast.show({ type: 'error', text1: "Couldn't delete your account.", text2: 'Try again.' });
        return;
      }
      await supabase.auth.signOut();
      endWalk();
      clear();
      router.replace('/sign-in');
      Toast.show({ type: 'success', text1: 'All data deleted. Account removed.' });
    } catch {
      Toast.show({ type: 'error', text1: "Couldn't delete your account.", text2: 'Try again.' });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AccountPageShell title="Delete all data?">
      <Text className="text-[13px] text-gray-text leading-relaxed mb-5">
        This will permanently delete your account, contacts, and walk history. This can&apos;t be undone. Type
        DELETE below to confirm.
      </Text>
      <TextInput
        value={deleteInput}
        onChangeText={setDeleteInput}
        placeholder="Type DELETE"
        autoCapitalize="characters"
        className="w-full h-[52px] px-4 text-sm bg-white border border-alert rounded-xl mb-5"
      />
      <View className="flex-row gap-3">
        <Pressable
          onPress={() => router.navigate('/settings')}
          className="flex-1 h-[52px] rounded-2xl border border-gray-border items-center justify-center"
        >
          <Text className="text-sm font-semibold text-gray-text">Cancel</Text>
        </Pressable>
        <Pressable
          onPress={deleteAll}
          disabled={deleteInput !== 'DELETE' || deleting}
          className="flex-1 h-[52px] rounded-2xl bg-alert items-center justify-center disabled:opacity-40"
        >
          <Text className="text-sm font-semibold text-white">{deleting ? 'Deleting…' : 'Delete'}</Text>
        </Pressable>
      </View>
    </AccountPageShell>
  );
}
