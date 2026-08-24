import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, Share, Text, TextInput, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { ChevronRight, Download, Gift, LogOut, Star } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Toast from 'react-native-toast-message';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { useWalkStore } from '../../store/walkStore';
import { Avatar } from '../../components/ui/Avatar';
import { Toggle } from '../../components/ui/Toggle';
import { Modal } from '../../components/ui/Modal';

function SectionHeader({ label }: { label: string }) {
  return (
    <Text className="text-[13px] font-semibold text-gray-text uppercase tracking-wide pt-4 pb-2">
      {label}
    </Text>
  );
}

function SettingRow({
  label, sub, right, onPress, danger, isLast,
}: {
  label: string;
  sub?: string;
  right?: ReactNode;
  onPress?: () => void;
  danger?: boolean;
  isLast?: boolean;
}) {
  const El = onPress ? Pressable : View;
  return (
    <El
      onPress={onPress}
      className={`flex-row items-center w-full px-4 py-3.5 gap-3 min-h-[52px] ${isLast ? '' : 'border-b border-gray-border'}`}
    >
      <View className="flex-1 min-w-0">
        <Text className={`text-sm font-semibold ${danger ? 'text-status-danger' : 'text-dark-text'}`}>{label}</Text>
        {sub && <Text className="text-xs text-gray-text mt-0.5">{sub}</Text>}
      </View>
      {right ?? (onPress && <ChevronRight size={18} color="#888899" />)}
    </El>
  );
}

export default function Settings() {
  const { user, profile, clear } = useAuthStore();
  const endWalk = useWalkStore((s) => s.endWalk);
  const router = useRouter();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');
  const [prefs, setPrefs] = useState({ checkin_reminders: true, walk_summary: true, auto_delete: true });

  const { data: profileData } = useQuery({
    queryKey: ['profile', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('*').eq('id', user!.id).single();
      return data;
    },
  });

  const displayName = profileData?.full_name ?? profile?.full_name ?? user?.email ?? 'User';
  const initials = displayName.slice(0, 2).toUpperCase();

  const signOut = async () => {
    await supabase.auth.signOut();
    endWalk();
    clear();
    router.replace('/sign-in');
  };

  const exportData = async () => {
    if (!user) return;
    const [{ data: p }, { data: c }, { data: w }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id),
      supabase.from('trusted_contacts').select('*').eq('user_id', user.id),
      supabase.from('walk_sessions').select('*').eq('user_id', user.id),
    ]);
    await Share.share({
      title: 'SafeWalk data export',
      message: JSON.stringify({ profile: p, contacts: c, walks: w }, null, 2),
    });
  };

  const deleteAll = async () => {
    if (!user || deleteInput !== 'DELETE') return;
    await Promise.all([
      supabase.from('trusted_contacts').delete().eq('user_id', user.id),
      supabase.from('walk_sessions').delete().eq('user_id', user.id),
    ]);
    await supabase.functions.invoke('delete-account', { body: { user_id: user.id } });
    await supabase.auth.signOut();
    endWalk();
    clear();
    setShowDeleteConfirm(false);
    router.replace('/sign-in');
    Toast.show({ type: 'success', text1: 'All data deleted. Account removed.' });
  };

  return (
    <View className="flex-1 bg-gray-bg">
      <View className="px-5 pt-3 pb-3">
        <Text className="text-[26px] font-bold text-dark-text tracking-tight">Settings</Text>
      </View>

      <ScrollView className="px-4" contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Profile card */}
        <View className="bg-white border border-gray-border rounded-2xl p-4 flex-row items-center gap-3.5 mb-2">
          <Avatar initials={initials} size={56} />
          <View className="flex-1 min-w-0">
            <Text className="text-base font-bold text-dark-text" numberOfLines={1}>{displayName}</Text>
            <Text className="text-xs text-gray-text" numberOfLines={1}>{user?.email}</Text>
          </View>
          <Pressable className="h-9 px-3.5 bg-purple-50 border border-purple-100 rounded-2xl items-center justify-center">
            <Text className="text-purple-600 text-[13px] font-semibold">Edit</Text>
          </Pressable>
        </View>

        {/* Refer a friend */}
        <View className="rounded-2xl mb-2 overflow-hidden">
          <LinearGradient colors={['#534AB7', '#7F77DD']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <View className="p-4 flex-row items-center gap-3.5">
              <View className="w-12 h-12 rounded-2xl bg-white/15 items-center justify-center">
                <Gift size={24} color="white" />
              </View>
              <View className="flex-1 min-w-0">
                <Text className="text-[15px] font-bold text-white leading-tight">Refer a friend</Text>
                <Text className="text-xs text-white/80 mt-0.5 leading-tight">
                  Invite someone you walk with to stay safe
                </Text>
              </View>
              <Pressable
                onPress={() => {
                  Share.share({
                    message: 'Stay safe on your walks with SafeWalk — it alerts my contacts if I need help. Check it out!',
                  }).catch(() => {});
                }}
                className="h-9 px-3.5 bg-white rounded-xl items-center justify-center"
              >
                <Text className="text-purple-600 text-[13px] font-bold">Share</Text>
              </Pressable>
            </View>
          </LinearGradient>
        </View>

        {/* Notifications */}
        <SectionHeader label="Notifications" />
        <View className="bg-white border border-gray-border rounded-2xl overflow-hidden">
          <SettingRow
            label="Check-in reminders"
            sub="In-app countdown during walks"
            right={<Toggle on={prefs.checkin_reminders} onChange={(v) => setPrefs((p) => ({ ...p, checkin_reminders: v }))} />}
          />
          <SettingRow
            label="Walk summary"
            sub="Toast when a walk ends"
            right={<Toggle on={prefs.walk_summary} onChange={(v) => setPrefs((p) => ({ ...p, walk_summary: v }))} />}
            isLast
          />
        </View>

        {/* Privacy */}
        <SectionHeader label="Privacy" />
        <View className="bg-white border border-gray-border rounded-2xl overflow-hidden">
          <SettingRow
            label="Location only during walks"
            sub="Background tracking is never used"
            right={<Toggle on={true} onChange={() => {}} />}
          />
          <SettingRow
            label="Auto-delete after 30 days"
            sub="Walks & location data"
            right={<Toggle on={prefs.auto_delete} onChange={(v) => setPrefs((p) => ({ ...p, auto_delete: v }))} />}
            isLast
          />
        </View>

        {/* Support */}
        <SectionHeader label="Support" />
        <View className="bg-white border border-gray-border rounded-2xl overflow-hidden">
          <SettingRow
            label="Rate SafeWalk"
            sub="Leave a review on the App Store"
            right={<Star size={18} color="#F5A623" />}
            onPress={() => {}}
          />
          <SettingRow label="Help & FAQ" sub="Common questions answered" onPress={() => {}} />
          <SettingRow label="Report a problem" sub="Something not working? Tell us" onPress={() => {}} isLast />
        </View>

        {/* Data */}
        <SectionHeader label="Your data" />
        <View className="bg-white border border-gray-border rounded-2xl overflow-hidden">
          <SettingRow label="Export my data" right={<Download size={18} color="#888899" />} onPress={exportData} />
          <SettingRow label="Delete all my data" danger onPress={() => setShowDeleteConfirm(true)} isLast />
        </View>

        {/* About */}
        <SectionHeader label="About" />
        <View className="bg-white border border-gray-border rounded-2xl overflow-hidden">
          <SettingRow
            label="What's new"
            sub="Version 1.0.0"
            right={
              <View className="bg-purple-600 rounded-full px-2 py-0.5">
                <Text className="text-white text-[11px] font-semibold">New</Text>
              </View>
            }
            onPress={() => {}}
          />
          <SettingRow label="Terms of service" onPress={() => {}} />
          <SettingRow label="Privacy policy" onPress={() => {}} isLast />
        </View>

        <Text className="text-center text-xs text-gray-text mt-6">SafeWalk v1.0.0 · PIPEDA compliant</Text>

        <Pressable onPress={signOut} className="flex-row items-center justify-center gap-2 mt-3 py-3.5">
          <LogOut size={16} color="#A32D2D" />
          <Text className="text-status-danger text-base font-semibold">Sign out</Text>
        </Pressable>
      </ScrollView>

      {/* Delete confirm modal */}
      <Modal isOpen={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)}>
        <Text className="text-base font-bold text-status-danger mb-3">Delete all data?</Text>
        <Text className="text-[13px] text-gray-text leading-relaxed mb-4">
          This will permanently delete your account, contacts, and walk history. Type DELETE to confirm.
        </Text>
        <TextInput
          value={deleteInput}
          onChangeText={setDeleteInput}
          placeholder="Type DELETE"
          autoCapitalize="characters"
          className="w-full h-[52px] px-4 text-sm bg-white border border-sos rounded-xl mb-4"
        />
        <View className="flex-row gap-3">
          <Pressable
            onPress={() => setShowDeleteConfirm(false)}
            className="flex-1 h-[52px] rounded-2xl border border-gray-border items-center justify-center"
          >
            <Text className="text-sm font-semibold text-gray-text">Cancel</Text>
          </Pressable>
          <Pressable
            onPress={deleteAll}
            disabled={deleteInput !== 'DELETE'}
            className="flex-1 h-[52px] rounded-2xl bg-sos items-center justify-center disabled:opacity-40"
          >
            <Text className="text-sm font-semibold text-white">Delete</Text>
          </Pressable>
        </View>
      </Modal>
    </View>
  );
}
