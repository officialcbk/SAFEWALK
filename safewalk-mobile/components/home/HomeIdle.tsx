import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/authStore';
import type { LatLng, RecentDestination, TrustedContact } from '../../types';
import { LocationCard } from './LocationCard';

function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return 'Good night';
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?';
}

interface StandbySlot {
  key: string;
  kind: 'contact' | 'add';
  contact?: TrustedContact;
}

function StandbyCard({ slot, onPress }: { slot: StandbySlot; onPress: () => void }) {
  if (slot.kind === 'add') {
    return (
      <Pressable
        onPress={onPress}
        style={{ flex: 1, borderWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(0,0,0,.2)', borderRadius: 12, alignItems: 'center', justifyContent: 'center', minHeight: 76 }}
      >
        <Text style={{ fontFamily: 'Archivo_400Regular', fontSize: 22, color: 'rgba(0,0,0,.3)' }}>+</Text>
      </Pressable>
    );
  }
  const c = slot.contact!;
  return (
    <Pressable onPress={onPress} style={{ flex: 1, borderWidth: 1, borderColor: 'rgba(0,0,0,.12)', borderRadius: 12, padding: 12 }}>
      <View
        style={{
          width: 28, height: 28, borderRadius: 99, alignItems: 'center', justifyContent: 'center',
          backgroundColor: c.is_primary ? '#0A0A0A' : '#EFEEEB',
        }}
      >
        <Text style={{ fontFamily: 'Archivo_600SemiBold', fontSize: 10, color: c.is_primary ? '#fff' : '#0A0A0A' }}>
          {initialsOf(c.full_name)}
        </Text>
      </View>
      <Text style={{ fontFamily: 'Archivo_600SemiBold', fontSize: 12.5, color: '#0A0A0A', marginTop: 11 }} numberOfLines={1}>
        {c.full_name.split(' ')[0]}
      </Text>
      <Text style={{ fontFamily: 'IBMPlexMono_500Medium', fontSize: 8.5, letterSpacing: 0.7, textTransform: 'uppercase', color: 'rgba(0,0,0,.45)', marginTop: 5 }}>
        {c.is_primary ? 'Primary' : 'Contact'}
      </Text>
    </Pressable>
  );
}

interface HomeIdleProps {
  currentLoc: LatLng | null;
  standbyContacts: TrustedContact[] | undefined;
  destination: string | null;
  recents: RecentDestination[] | undefined;
  pickingRecentKey: string | null;
  onPickRecent: (recent: RecentDestination) => void;
}

export function HomeIdle({ currentLoc, standbyContacts, destination, recents, pickingRecentKey, onPickRecent }: HomeIdleProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const profile = useAuthStore((s) => s.profile);
  const firstName = profile?.full_name?.split(' ')[0] ?? 'there';

  const sorted = [...(standbyContacts ?? [])].sort((a, b) => Number(b.is_primary) - Number(a.is_primary));
  const slots: StandbySlot[] = [
    ...sorted.slice(0, 2).map((c) => ({ key: c.id, kind: 'contact' as const, contact: c })),
  ];
  while (slots.length < 3) slots.push({ key: `add-${slots.length}`, kind: 'add' });

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }} bounces={false}>
        {/* ── Dark header ─────────────────────────────────────────────── */}
        <View style={{ backgroundColor: '#0A0A0A', paddingTop: insets.top + 22, paddingHorizontal: 20, paddingBottom: 22 }}>
          <Text style={{ fontFamily: 'Archivo_800ExtraBold', fontSize: 22, letterSpacing: -0.88, color: '#fff' }}>Trayl</Text>
          <Text style={{ fontFamily: 'Archivo_700Bold', fontSize: 27, lineHeight: 31, letterSpacing: -0.945, color: '#fff', marginTop: 22 }}>
            {greeting()}, {firstName}.{'\n'}Where are you walking?
          </Text>
          <Pressable
            onPress={() => router.push('/search')}
            style={{ marginTop: 18, backgroundColor: '#fff', borderRadius: 14, height: 52, flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 16 }}
          >
            <View style={{ width: 9, height: 9, borderRadius: 2, backgroundColor: '#0A0A0A' }} />
            <Text
              numberOfLines={1}
              style={{ flex: 1, fontFamily: 'Archivo_600SemiBold', fontSize: 15, color: destination ? '#0A0A0A' : 'rgba(0,0,0,.45)' }}
            >
              {destination || 'Enter a destination'}
            </Text>
          </Pressable>
        </View>

        {/* ── Recent destinations ─────────────────────────────────────── */}
        {!!recents?.length && (
          <View style={{ paddingHorizontal: 20, paddingTop: 18 }}>
            <Text style={{ fontFamily: 'IBMPlexMono_500Medium', fontSize: 9.5, letterSpacing: 1.4, textTransform: 'uppercase', color: 'rgba(0,0,0,.42)' }}>
              Recent
            </Text>
            <View style={{ marginTop: 10 }}>
              {recents.map((r, i) => {
                const picking = pickingRecentKey === r.key;
                return (
                  <Pressable
                    key={r.key}
                    onPress={() => onPickRecent(r)}
                    disabled={!!pickingRecentKey}
                    style={{
                      flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12,
                      borderTopWidth: i === 0 ? 0 : 1, borderTopColor: 'rgba(0,0,0,.08)', opacity: picking ? 0.6 : 1,
                    }}
                  >
                    <View style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: '#F1F0ED', alignItems: 'center', justifyContent: 'center' }}>
                      <View style={{ width: 10, height: 10, borderRadius: 99, backgroundColor: '#0A0A0A' }} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={{ fontFamily: 'Archivo_600SemiBold', fontSize: 14, color: '#0A0A0A' }} numberOfLines={1}>{r.name}</Text>
                      <Text style={{ fontFamily: 'Archivo_400Regular', fontSize: 11.5, color: 'rgba(0,0,0,.5)', marginTop: 2 }} numberOfLines={1}>{r.sub}</Text>
                    </View>
                    {picking && <ActivityIndicator size="small" color="#0A0A0A" />}
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {/* ── On standby ──────────────────────────────────────────────── */}
        <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <Text style={{ fontFamily: 'IBMPlexMono_500Medium', fontSize: 9.5, letterSpacing: 1.4, textTransform: 'uppercase', color: 'rgba(0,0,0,.42)' }}>
              On standby
            </Text>
            <Pressable onPress={() => router.push('/contacts')}>
              <Text style={{ fontFamily: 'Archivo_600SemiBold', fontSize: 11, color: '#0A0A0A' }}>Manage</Text>
            </Pressable>
          </View>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
            {slots.map((slot) => (
              <StandbyCard key={slot.key} slot={slot} onPress={() => router.push('/contacts')} />
            ))}
          </View>
        </View>

        {/* ── Location card ───────────────────────────────────────────── */}
        <LocationCard location={currentLoc} />
      </ScrollView>
    </View>
  );
}
