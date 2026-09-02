import { useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import type { Profile } from '../../types';
import { withTimeout } from '../../services/withTimeout';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { AccountPageShell, ChoicePill, SettingsSection } from '../../components/account/SettingsPrefs';

type ProfileRow = Partial<Profile> & { phone_verified_at?: string | null };

// A separate component, mounted only once server data has actually arrived —
// gender/pronouns/date of birth/accessibility notes only exist on the
// `profiles` row (the auth-store profile carries just name/phone), so
// seeding these useState calls before that row loads left every field but
// name/phone permanently blank.
function EditForm({ userId, initial }: { userId: string; initial: ProfileRow }) {
  const router = useRouter();
  const { profile, setProfile } = useAuthStore();
  const qc = useQueryClient();

  const [name, setName] = useState(initial.full_name ?? '');
  const [phone, setPhone] = useState(initial.phone ?? '');
  const [gender, setGender] = useState(initial.gender ?? '');
  const [pronouns, setPronouns] = useState(initial.pronouns ?? '');
  const [dateOfBirth, setDateOfBirth] = useState(initial.date_of_birth ?? '');
  const [accessibilityNotes, setAccessibilityNotes] = useState(initial.accessibility_notes ?? '');
  const [saving, setSaving] = useState(false);

  const saveEdit = async () => {
    setSaving(true);
    try {
      const payload = {
        full_name: name,
        phone: phone || null,
        phone_verified_at: phone && phone !== initial.phone ? null : initial.phone_verified_at ?? null,
        gender: gender || null,
        pronouns: pronouns || null,
        date_of_birth: dateOfBirth || null,
        accessibility_notes: accessibilityNotes || null,
      };
      const { error } = await withTimeout(supabase.from('profiles').update(payload).eq('id', userId), 10000);
      if (error) { Toast.show({ type: 'error', text1: 'Could not save.' }); return; }
      if (profile) setProfile({ ...profile, ...payload });
      qc.invalidateQueries({ queryKey: ['profile', userId] });
      Toast.show({ type: 'success', text1: 'Profile updated.' });
      router.navigate('/profile');
    } catch {
      Toast.show({ type: 'error', text1: "Couldn't connect.", text2: 'Try again.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AccountPageShell title="Edit profile" backTo="/profile">
      <SettingsSection label="Details">
        <Input label="Full name" value={name} onChangeText={setName} />
        <Input label="Phone number" keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
        <View>
          <Text className="text-xs font-semibold text-gray-text tracking-wide mb-1.5">Gender</Text>
          <View className="flex-row flex-wrap gap-2">
            {['Woman', 'Man', 'Non-binary', 'Prefer not'].map((option) => (
              <ChoicePill key={option} label={option} value={option} selected={gender === option} onPress={setGender} />
            ))}
          </View>
        </View>
        <Input label="Pronouns" value={pronouns} onChangeText={setPronouns} placeholder="She/her, he/him, they/them" />
        <Input label="Date of birth" value={dateOfBirth} onChangeText={setDateOfBirth} placeholder="YYYY-MM-DD" />
        <Input
          label="Safety or accessibility notes"
          value={accessibilityNotes}
          onChangeText={setAccessibilityNotes}
          placeholder="Mobility needs, language preferences, medical context"
          multiline
          textAlignVertical="top"
        />
      </SettingsSection>
      <Button variant="dark" loading={saving} fullWidth onPress={saveEdit}>Save</Button>
    </AccountPageShell>
  );
}

export default function ProfileEdit() {
  const { user, profile } = useAuthStore();

  const { data: profileData, isLoading } = useQuery({
    queryKey: ['profile', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('*').eq('id', user!.id).single();
      return data;
    },
  });

  if (!user || isLoading) {
    return (
      <AccountPageShell title="Edit profile" backTo="/profile">
        <View style={{ paddingTop: 40, alignItems: 'center' }}>
          <ActivityIndicator color="#0A0A0A" />
        </View>
      </AccountPageShell>
    );
  }

  const initial: ProfileRow = profileData ?? profile ?? {};
  return <EditForm key={user.id} userId={user.id} initial={initial} />;
}
