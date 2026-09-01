import { useState } from 'react';
import { Pressable, ScrollView, Share, Text, TextInput, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { useWalkStore } from '../../store/walkStore';
import { Modal } from '../../components/ui/Modal';

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?';
}

function StatStrip({ items }: { items: { label: string; value: string }[] }) {
  return (
    <View style={{ flexDirection: 'row', marginTop: 16, borderTopWidth: 1, borderBottomWidth: 1, borderColor: 'rgba(0,0,0,.1)' }}>
      {items.map(({ label, value }, i) => (
        <View key={label} style={{ flex: 1, paddingVertical: 14, paddingLeft: i > 0 ? 16 : 0, borderLeftWidth: i > 0 ? 1 : 0, borderLeftColor: 'rgba(0,0,0,.1)' }}>
          <Text style={{ fontFamily: 'IBMPlexMono_500Medium', fontSize: 8.5, letterSpacing: 1.02, textTransform: 'uppercase', color: 'rgba(0,0,0,.42)' }}>{label}</Text>
          <Text style={{ fontFamily: 'Archivo_700Bold', fontSize: 19, letterSpacing: -0.57, color: '#0A0A0A', marginTop: 9 }}>{value}</Text>
        </View>
      ))}
    </View>
  );
}

function Eyebrow({ children }: { children: string }) {
  return (
    <Text style={{ fontFamily: 'IBMPlexMono_500Medium', fontSize: 9.5, letterSpacing: 1.33, textTransform: 'uppercase', color: 'rgba(0,0,0,.42)', paddingBottom: 4 }}>
      {children}
    </Text>
  );
}

function AccountTile({ name, sub, isFirst, onPress }: { name: string; sub: string; isFirst?: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16, borderTopWidth: isFirst ? 0 : 1, borderTopColor: 'rgba(0,0,0,.09)' }}
    >
      <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: '#F1F0ED' }} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontFamily: 'Archivo_600SemiBold', fontSize: 14.5, letterSpacing: -0.22, color: '#0A0A0A' }}>{name}</Text>
        <Text style={{ fontFamily: 'Archivo_400Regular', fontSize: 11.5, color: 'rgba(0,0,0,.5)', marginTop: 6 }} numberOfLines={1}>{sub}</Text>
      </View>
      <View style={{ width: 8, height: 8, borderTopWidth: 2, borderRightWidth: 2, borderColor: 'rgba(0,0,0,.3)', transform: [{ rotate: '45deg' }] }} />
    </Pressable>
  );
}

export default function Settings() {
  const { user, profile, clear } = useAuthStore();
  const endWalk = useWalkStore((s) => s.endWalk);
  const router = useRouter();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');

  const { data: profileData } = useQuery({
    queryKey: ['profile', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('*').eq('id', user!.id).single();
      return data;
    },
  });

  const { data: stats } = useQuery({
    queryKey: ['account-stats', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [{ data: walks }, { count: contacts }] = await Promise.all([
        supabase.from('walk_sessions').select('distance_meters').eq('user_id', user!.id),
        supabase.from('trusted_contacts').select('id', { count: 'exact', head: true }).eq('user_id', user!.id),
      ]);
      const distanceM = (walks ?? []).reduce((sum, w) => sum + (w.distance_meters ?? 0), 0);
      return { walkCount: walks?.length ?? 0, distanceKm: distanceM / 1000, contacts: contacts ?? 0 };
    },
  });

  const displayName = profileData?.full_name ?? profile?.full_name ?? user?.email ?? 'User';
  const phone = profileData?.phone ?? profile?.phone ?? '';

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
      title: 'Trayl data export',
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

  const accountTiles = [
    { name: 'Settings', sub: 'Units, map, appearance', onPress: () => router.push('/account-app-settings') },
    { name: 'Security', sub: 'Password, phone verification', onPress: () => router.push('/account-security') },
    { name: 'Notifications', sub: 'Check-ins, arrivals', onPress: () => router.push('/account-notifications') },
    { name: 'Safety', sub: 'SOS, escalation, check-in timing', onPress: () => router.push('/account-safety') },
    { name: 'Emergency info', sub: 'Shared with responders only', onPress: () => router.push('/account-emergency') },
    { name: 'Places', sub: 'Home, Work, saved locations', onPress: () => router.push('/account-places') },
    { name: 'Privacy', sub: 'Who can see your live route', onPress: () => router.push('/account-privacy') },
  ];

  const supportTiles = [
    {
      name: 'Refer friends', sub: 'Invite a walker, both get 1 month',
      onPress: () => Share.share({ message: 'Stay safe on your walks with Trayl — it alerts my contacts if I need help. Check it out!' }).catch(() => {}),
    },
    { name: 'Help', sub: 'Guides and contact', onPress: () => router.push('/account-help') },
    { name: 'Legal', sub: 'Terms, privacy, licences', onPress: () => router.push('/account-legal') },
    { name: 'Sign out', sub: displayName, onPress: signOut },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={{ paddingTop: 66, paddingHorizontal: 20 }}>
        <Text style={{ fontFamily: 'Archivo_800ExtraBold', fontSize: 28, letterSpacing: -1.12, color: '#0A0A0A' }}>Account</Text>

        <Pressable
          onPress={() => router.push('/profile')}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 22, padding: 16, borderWidth: 1, borderColor: 'rgba(0,0,0,.12)', borderRadius: 16 }}
        >
          <View style={{ width: 48, height: 48, borderRadius: 99, backgroundColor: '#0A0A0A', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontFamily: 'Archivo_600SemiBold', fontSize: 15, color: '#fff' }}>{initialsOf(displayName)}</Text>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ fontFamily: 'Archivo_700Bold', fontSize: 16.5, letterSpacing: -0.33, color: '#0A0A0A' }} numberOfLines={1}>{displayName}</Text>
            <Text style={{ fontFamily: 'IBMPlexMono_500Medium', fontSize: 11, color: 'rgba(0,0,0,.5)', marginTop: 8 }} numberOfLines={1}>{phone || user?.email}</Text>
          </View>
          <View style={{ width: 8, height: 8, borderTopWidth: 2, borderRightWidth: 2, borderColor: 'rgba(0,0,0,.3)', transform: [{ rotate: '45deg' }] }} />
        </Pressable>

        <StatStrip items={[
          { label: 'Walks', value: String(stats?.walkCount ?? '—') },
          { label: 'Distance', value: stats ? `${stats.distanceKm.toFixed(0)} km` : '—' },
          { label: 'Watchers', value: String(stats?.contacts ?? '—') },
        ]} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 18 }}>
        <View style={{ flexDirection: 'row', gap: 8, paddingBottom: 18 }}>
          <Pressable onPress={() => router.push('/contacts')} style={{ flex: 1, borderWidth: 1, borderColor: 'rgba(0,0,0,.12)', borderRadius: 12, padding: 13 }}>
            <Text style={{ fontFamily: 'Archivo_600SemiBold', fontSize: 12.5, color: '#0A0A0A' }}>Add a contact</Text>
            <Text style={{ fontFamily: 'Archivo_400Regular', fontSize: 11, color: 'rgba(0,0,0,.5)', marginTop: 6 }}>
              {stats?.contacts ?? 0} on standby
            </Text>
          </Pressable>
          <Pressable
            onPress={() => Toast.show({ type: 'info', text1: 'SOS test complete.', text2: 'No alert was actually sent.' })}
            style={{ flex: 1, borderWidth: 1, borderColor: 'rgba(0,0,0,.12)', borderRadius: 12, padding: 13 }}
          >
            <Text style={{ fontFamily: 'Archivo_600SemiBold', fontSize: 12.5, color: '#0A0A0A' }}>Test SOS</Text>
            <Text style={{ fontFamily: 'Archivo_400Regular', fontSize: 11, color: 'rgba(0,0,0,.5)', marginTop: 6 }}>No alert sent</Text>
          </Pressable>
        </View>

        <Eyebrow>Your account</Eyebrow>
        <View>
          {accountTiles.map((t, i) => <AccountTile key={t.name} {...t} isFirst={i === 0} />)}
        </View>

        <View style={{ paddingTop: 22 }}>
          <Eyebrow>Support</Eyebrow>
        </View>
        <View>
          {supportTiles.map((t, i) => <AccountTile key={t.name} {...t} isFirst={i === 0} />)}
        </View>

        <View style={{ paddingTop: 22 }}>
          <Eyebrow>Your data</Eyebrow>
        </View>
        <View>
          <AccountTile name="Export my data" sub="Download everything we have on you" isFirst onPress={exportData} />
          <AccountTile name="Delete all my data" sub="Permanently removes your account" onPress={() => setShowDeleteConfirm(true)} />
        </View>

        <Text style={{ fontFamily: 'IBMPlexMono_500Medium', fontSize: 9, letterSpacing: 0.9, textTransform: 'uppercase', color: 'rgba(0,0,0,.32)', paddingTop: 18, paddingBottom: 20, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,.09)', marginTop: 22 }}>
          Trayl v1.0.0 · PIPEDA compliant
        </Text>
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
