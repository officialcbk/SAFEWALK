import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?';
}

export default function Profile() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, profile, setProfile } = useAuthStore();
  const qc = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);

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
      const { data: walks } = await supabase.from('walk_sessions').select('distance_meters, status').eq('user_id', user!.id);
      const distanceM = (walks ?? []).reduce((sum, w) => sum + (w.distance_meters ?? 0), 0);
      const arrived = (walks ?? []).filter((w) => w.status === 'completed').length;
      return { walkCount: walks?.length ?? 0, distanceKm: distanceM / 1000, arrived };
    },
  });

  const displayName = profileData?.full_name ?? profile?.full_name ?? user?.email ?? 'User';
  const displayPhone = profileData?.phone ?? profile?.phone ?? '';
  const since = profileData?.created_at ? format(new Date(profileData.created_at), 'MMM yyyy').toUpperCase() : null;

  const openEdit = () => {
    setName(displayName);
    setPhone(displayPhone);
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('profiles').update({ full_name: name, phone: phone || null }).eq('id', user.id);
      if (error) { Toast.show({ type: 'error', text1: 'Could not save.' }); return; }
      if (profile) setProfile({ ...profile, full_name: name, phone: phone || null });
      qc.invalidateQueries({ queryKey: ['profile', user.id] });
      setEditOpen(false);
      Toast.show({ type: 'success', text1: 'Profile updated.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={{ backgroundColor: '#0A0A0A', paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: 26 }}>
        <Pressable
          onPress={() => router.back()}
          style={{ width: 32, height: 32, borderRadius: 99, backgroundColor: 'rgba(255,255,255,.14)', alignItems: 'center', justifyContent: 'center' }}
        >
          <View style={{ width: 9, height: 9, borderLeftWidth: 2, borderBottomWidth: 2, borderColor: '#fff', transform: [{ rotate: '45deg' }], marginLeft: 2 }} />
        </Pressable>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 22 }}>
          <View style={{ width: 62, height: 62, borderRadius: 99, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontFamily: 'Archivo_600SemiBold', fontSize: 19, color: '#0A0A0A' }}>{initialsOf(displayName)}</Text>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ fontFamily: 'Archivo_700Bold', fontSize: 23, lineHeight: 25.3, letterSpacing: -0.69, color: '#fff' }} numberOfLines={1}>{displayName}</Text>
            {since && (
              <Text style={{ fontFamily: 'IBMPlexMono_500Medium', fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase', color: 'rgba(255,255,255,.55)', marginTop: 9 }}>
                Walking since {since}
              </Text>
            )}
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', marginTop: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,.25)', borderRadius: 99, paddingHorizontal: 14, paddingVertical: 8 }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff' }} />
          <Text style={{ fontFamily: 'Archivo_600SemiBold', fontSize: 11.5, color: '#fff' }}>Phone and email verified</Text>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20 }}>
        <Text style={{ fontFamily: 'IBMPlexMono_500Medium', fontSize: 9.5, letterSpacing: 1.33, textTransform: 'uppercase', color: 'rgba(0,0,0,.42)', paddingBottom: 4 }}>Details</Text>
        {[
          { l: 'Name', v: displayName },
          { l: 'Phone', v: displayPhone || '—' },
          { l: 'Email', v: user?.email ?? '—' },
        ].map(({ l, v }) => (
          <Pressable key={l} onPress={openEdit} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 14, paddingVertical: 16, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,.09)' }}>
            <Text style={{ fontFamily: 'Archivo_400Regular', fontSize: 13.5, color: 'rgba(0,0,0,.6)' }}>{l}</Text>
            <Text style={{ fontFamily: 'Archivo_600SemiBold', fontSize: 13.5, color: '#0A0A0A' }} numberOfLines={1}>{v}</Text>
          </Pressable>
        ))}

        <Text style={{ fontFamily: 'IBMPlexMono_500Medium', fontSize: 9.5, letterSpacing: 1.33, textTransform: 'uppercase', color: 'rgba(0,0,0,.42)', paddingTop: 22, paddingBottom: 4, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,.09)' }}>
          Walking record
        </Text>
        <View style={{ flexDirection: 'row', borderTopWidth: 1, borderBottomWidth: 1, borderColor: 'rgba(0,0,0,.09)' }}>
          {[
            { l: 'Walks', v: String(stats?.walkCount ?? '—') },
            { l: 'Distance', v: stats ? `${stats.distanceKm.toFixed(0)} km` : '—' },
            { l: 'Arrived', v: String(stats?.arrived ?? '—') },
          ].map(({ l, v }, i) => (
            <View key={l} style={{ flex: 1, paddingVertical: 16, paddingLeft: i > 0 ? 16 : 0, borderLeftWidth: i > 0 ? 1 : 0, borderLeftColor: 'rgba(0,0,0,.1)' }}>
              <Text style={{ fontFamily: 'IBMPlexMono_500Medium', fontSize: 8.5, letterSpacing: 1.02, textTransform: 'uppercase', color: 'rgba(0,0,0,.42)' }}>{l}</Text>
              <Text style={{ fontFamily: 'Archivo_700Bold', fontSize: 21, letterSpacing: -0.63, color: '#0A0A0A', marginTop: 9 }}>{v}</Text>
            </View>
          ))}
        </View>
        <Text style={{ fontFamily: 'Archivo_400Regular', fontSize: 12.5, lineHeight: 18.75, color: 'rgba(0,0,0,.5)', paddingVertical: 16 }}>
          Your name and photo are shown to contacts you invite. Nothing else on this page is shared.
        </Text>
      </ScrollView>

      <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 34 }}>
        <Pressable onPress={openEdit} style={{ backgroundColor: '#0A0A0A', borderRadius: 14, height: 52, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontFamily: 'Archivo_700Bold', fontSize: 14.5, color: '#fff' }}>Edit profile</Text>
        </Pressable>
      </View>

      <Modal isOpen={editOpen} onClose={() => setEditOpen(false)}>
        <Text className="text-base font-bold text-dark-text mb-4">Edit profile</Text>
        <View className="gap-3.5">
          <Input label="Full name" value={name} onChangeText={setName} />
          <Input label="Phone number" keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
          <Button loading={saving} fullWidth onPress={saveEdit}>Save</Button>
        </View>
      </Modal>
    </View>
  );
}
