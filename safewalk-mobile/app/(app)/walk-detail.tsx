import { useState } from 'react';
import { Pressable, ScrollView, Share, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { useWalkStore } from '../../store/walkStore';
import type { WalkSession } from '../../types';
import { formatPace } from '../../services/eta';
import { geocodeAddress, getDirections } from '../../services/directions';

function statusText(w: WalkSession): string {
  if (w.status === 'sos_triggered') return 'SOS triggered';
  if (w.status === 'escalating') return 'Off-route, resolved';
  return 'Arrived safely';
}

// Check-ins aren't individually logged today, only the interval they run at
// (90s, see hooks/useCheckIn) — this derives an approximate count from
// duration rather than showing a fabricated exact log.
function estimateCheckIns(durationSeconds: number | null): string {
  if (!durationSeconds) return '—';
  const n = Math.max(1, Math.round(durationSeconds / 90));
  return `${n} check-in${n === 1 ? '' : 's'}`;
}

export default function WalkDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const currentLocation = useWalkStore((s) => s.walk.currentLocation);
  const { setDestination, setDestinationCoords, setRouteCoords, setNavSteps, setDistance, setRouteDurationSeconds } = useWalkStore();
  const [repeating, setRepeating] = useState(false);

  const { data: walk } = useQuery({
    queryKey: ['walk-detail', id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await supabase.from('walk_sessions').select('*').eq('id', id).single();
      return data as WalkSession | null;
    },
  });

  const { data: contacts } = useQuery({
    queryKey: ['contacts', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from('trusted_contacts').select('full_name').eq('user_id', user!.id).order('created_at');
      return (data ?? []) as { full_name: string }[];
    },
  });

  if (!walk) return <View style={{ flex: 1, backgroundColor: '#fff' }} />;

  const km = walk.distance_meters ? (walk.distance_meters / 1000).toFixed(1) + ' km' : '—';
  const dur = walk.duration_seconds
    ? walk.duration_seconds < 3600
      ? `${Math.round(walk.duration_seconds / 60)} min`
      : `${Math.floor(walk.duration_seconds / 3600)}h ${Math.round((walk.duration_seconds % 3600) / 60)}m`
    : '—';
  const pace = walk.distance_meters && walk.duration_seconds ? formatPace(walk.distance_meters, walk.duration_seconds) : '—';
  const watchers = contacts?.length ? contacts.map((c) => c.full_name.split(' ')[0]).join(', ') : '—';

  const repeatWalk = async () => {
    if (!walk.destination) return;
    if (!currentLocation) { Toast.show({ type: 'error', text1: 'Enable location to see your route.' }); return; }
    setRepeating(true);
    try {
      const center = await geocodeAddress(walk.destination);
      if (!center) { Toast.show({ type: 'error', text1: "Couldn't find that place anymore." }); return; }
      const result = await getDirections([currentLocation.lng, currentLocation.lat], center);
      if (!result) { Toast.show({ type: 'error', text1: "Couldn't find a walking route there." }); return; }
      setDestination(walk.destination);
      setDestinationCoords(center);
      setRouteCoords(result.geometry);
      setNavSteps(result.steps);
      setDistance(result.totalDistance);
      setRouteDurationSeconds(result.totalDuration);
      router.push('/walk-confirm');
    } finally {
      setRepeating(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={{ height: 300, backgroundColor: '#E9E7E2' }}>
        <Pressable
          onPress={() => router.back()}
          style={{
            position: 'absolute', left: 20, top: insets.top + 12, width: 36, height: 36, borderRadius: 99,
            backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
            shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 4,
          }}
        >
          <View style={{ width: 9, height: 9, borderLeftWidth: 2, borderBottomWidth: 2, borderColor: '#0A0A0A', transform: [{ rotate: '45deg' }], marginLeft: 2 }} />
        </Pressable>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 22 }}>
        <Text style={{ fontFamily: 'IBMPlexMono_500Medium', fontSize: 9, letterSpacing: 1.08, textTransform: 'uppercase', color: 'rgba(0,0,0,.42)' }}>
          {format(new Date(walk.started_at), 'EEE d MMM, HH:mm')}
        </Text>
        <Text style={{ fontFamily: 'Archivo_700Bold', fontSize: 24, lineHeight: 27.6, letterSpacing: -0.84, color: '#0A0A0A', marginTop: 10 }} numberOfLines={2}>
          Your location → {walk.destination ?? 'Walk'}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 14, alignSelf: 'flex-start', borderWidth: 1, borderColor: 'rgba(0,0,0,.15)', borderRadius: 99, paddingHorizontal: 13, paddingVertical: 7 }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#0A0A0A' }} />
          <Text style={{ fontFamily: 'Archivo_600SemiBold', fontSize: 11, color: '#0A0A0A' }}>{statusText(walk)}</Text>
        </View>

        <View style={{ flexDirection: 'row', marginTop: 24, borderTopWidth: 1, borderBottomWidth: 1, borderColor: 'rgba(0,0,0,.1)' }}>
          {[{ l: 'Distance', v: km }, { l: 'Duration', v: dur }, { l: 'Pace', v: pace }].map(({ l, v }, i) => (
            <View key={l} style={{ flex: 1, paddingVertical: 16, paddingLeft: i > 0 ? 16 : 0, borderLeftWidth: i > 0 ? 1 : 0, borderLeftColor: 'rgba(0,0,0,.1)' }}>
              <Text style={{ fontFamily: 'IBMPlexMono_500Medium', fontSize: 8.5, letterSpacing: 1.02, textTransform: 'uppercase', color: 'rgba(0,0,0,.42)' }}>{l}</Text>
              <Text style={{ fontFamily: 'Archivo_700Bold', fontSize: 22, letterSpacing: -0.66, color: '#0A0A0A', marginTop: 9 }}>{v}</Text>
            </View>
          ))}
        </View>

        {[
          { l: 'Watched by', v: watchers },
          { l: 'Safety check-ins', v: estimateCheckIns(walk.duration_seconds) },
        ].map(({ l, v }) => (
          <View key={l} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,.08)' }}>
            <Text style={{ fontFamily: 'Archivo_400Regular', fontSize: 13.5, color: 'rgba(0,0,0,.6)' }}>{l}</Text>
            <Text style={{ fontFamily: 'Archivo_600SemiBold', fontSize: 13.5, color: '#0A0A0A' }} numberOfLines={1}>{v}</Text>
          </View>
        ))}
        <Pressable
          onPress={() => Share.share({ message: `Walk to ${walk.destination ?? 'destination'}: ${km}, ${dur}.` })}
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16 }}
        >
          <Text style={{ fontFamily: 'Archivo_400Regular', fontSize: 13.5, color: 'rgba(0,0,0,.6)' }}>Route report</Text>
          <Text style={{ fontFamily: 'Archivo_600SemiBold', fontSize: 13.5, color: '#0A0A0A' }}>Share</Text>
        </Pressable>
      </ScrollView>

      <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 34 }}>
        <Pressable
          onPress={repeatWalk}
          disabled={repeating}
          style={{ backgroundColor: '#0A0A0A', borderRadius: 14, height: 52, alignItems: 'center', justifyContent: 'center', opacity: repeating ? 0.7 : 1 }}
        >
          <Text style={{ fontFamily: 'Archivo_700Bold', fontSize: 14.5, color: '#fff' }}>
            {repeating ? 'Finding route…' : 'Walk this route again'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
