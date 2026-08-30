import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useInfiniteQuery } from '@tanstack/react-query';
import { format, isToday, isYesterday } from 'date-fns';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import type { WalkSession } from '../../types';

const PAGE_SIZE = 20;

function formatWhen(iso: string) {
  const d = new Date(iso);
  if (isToday(d)) return `Today, ${format(d, 'HH:mm')}`;
  if (isYesterday(d)) return `Yesterday, ${format(d, 'HH:mm')}`;
  return format(d, 'EEE d MMM, HH:mm');
}

function formatDur(secs: number | null) {
  if (!secs) return '—';
  const m = Math.round(secs / 60);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

function statusText(w: WalkSession): string {
  if (w.status === 'sos_triggered') return 'SOS triggered';
  if (w.status === 'escalating') return 'Off-route, resolved';
  return 'Arrived safely';
}
function isFlagged(w: WalkSession): boolean {
  return w.status !== 'completed';
}

function TrailThumbnail() {
  // Decorative route-motif snapshot — the app doesn't persist a per-walk
  // polyline, so (matching the design prototype's own thumbnail, which is
  // the same generic motif for every row) this is a stand-in glyph, not a
  // real per-walk render.
  return (
    <View style={{ width: 56, height: 56, borderRadius: 12, backgroundColor: '#E9E7E2', overflow: 'hidden' }}>
      <View style={{ position: 'absolute', left: -10, top: 20, width: 90, height: 5, backgroundColor: '#fff', transform: [{ rotate: '-10deg' }] }} />
      <View style={{ position: 'absolute', left: 22, top: -10, width: 4, height: 90, backgroundColor: '#fff', transform: [{ rotate: '8deg' }] }} />
      {[[11, 40], [22, 31], [33, 22], [44, 14]].map(([l, t], i) => (
        <View key={i} style={{ position: 'absolute', left: l, top: t, width: 6, height: 6, borderRadius: 3, backgroundColor: '#0A0A0A' }} />
      ))}
    </View>
  );
}

export default function History() {
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const [filter, setFilter] = useState<'all' | 'month' | 'flagged'>('all');

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useInfiniteQuery({
    queryKey: ['history', user?.id],
    enabled: !!user,
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const from = pageParam as number;
      const { data } = await supabase
        .from('walk_sessions')
        .select('*')
        .eq('user_id', user!.id)
        .order('started_at', { ascending: false })
        .range(from, from + PAGE_SIZE - 1);
      return { items: (data ?? []) as WalkSession[], nextOffset: from + PAGE_SIZE };
    },
    getNextPageParam: (last) => (last.items.length < PAGE_SIZE ? undefined : last.nextOffset),
  });

  const all = data?.pages.flatMap((p) => p.items) ?? [];
  const monthStart = useMemo(() => { const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); return d; }, []);
  const filtered = all.filter((w) => {
    if (filter === 'month') return new Date(w.started_at) >= monthStart;
    if (filter === 'flagged') return isFlagged(w);
    return true;
  });

  const chips: { key: typeof filter; label: string }[] = [
    { key: 'all', label: 'All walks' },
    { key: 'month', label: 'This month' },
    { key: 'flagged', label: 'Flagged' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={{ paddingTop: 66, paddingHorizontal: 20, paddingBottom: 16 }}>
        <Text style={{ fontFamily: 'Archivo_800ExtraBold', fontSize: 28, letterSpacing: -1.12, color: '#0A0A0A' }}>History</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 18 }}>
          {chips.map((c) => {
            const active = filter === c.key;
            return (
              <Pressable
                key={c.key}
                onPress={() => setFilter(c.key)}
                style={{
                  borderRadius: 99, paddingHorizontal: 15, paddingVertical: 9,
                  backgroundColor: active ? '#0A0A0A' : 'transparent',
                  borderWidth: active ? 0 : 1, borderColor: 'rgba(0,0,0,.15)',
                }}
              >
                <Text style={{ fontFamily: 'Archivo_600SemiBold', fontSize: 11.5, color: active ? '#fff' : '#0A0A0A' }}>{c.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 20 }}>
        {isLoading ? (
          <View style={{ gap: 8 }}>
            {[1, 2, 3].map((i) => <View key={i} style={{ height: 72, backgroundColor: '#F1F0ED', borderRadius: 12 }} />)}
          </View>
        ) : filtered.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 48 }}>
            <Text style={{ fontFamily: 'Archivo_600SemiBold', fontSize: 15, color: '#0A0A0A', marginBottom: 6 }}>No walks yet</Text>
            <Pressable onPress={() => router.push('/home')}>
              <Text style={{ fontFamily: 'Archivo_600SemiBold', fontSize: 13, color: 'rgba(0,0,0,.6)' }}>Start your first walk</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {filtered.map((w, i) => (
              <Pressable
                key={w.id}
                onPress={() => router.push({ pathname: '/walk-detail', params: { id: w.id } })}
                style={{ flexDirection: 'row', gap: 14, alignItems: 'center', paddingVertical: 16, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: 'rgba(0,0,0,.09)' }}
              >
                <TrailThumbnail />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ fontFamily: 'IBMPlexMono_500Medium', fontSize: 9, letterSpacing: 1.08, textTransform: 'uppercase', color: 'rgba(0,0,0,.42)' }}>
                    {formatWhen(w.started_at)}
                  </Text>
                  <Text style={{ fontFamily: 'Archivo_600SemiBold', fontSize: 14.5, lineHeight: 18, letterSpacing: -0.22, color: '#0A0A0A', marginTop: 7 }} numberOfLines={1}>
                    Your location → {w.destination ?? 'Walk'}
                  </Text>
                  <Text style={{ fontFamily: 'Archivo_400Regular', fontSize: 11.5, color: 'rgba(0,0,0,.5)', marginTop: 6 }} numberOfLines={1}>
                    {w.distance_meters ? `${(w.distance_meters / 1000).toFixed(1)} km` : '—'} · {formatDur(w.duration_seconds)} · {statusText(w)}
                  </Text>
                </View>
                <View style={{ width: 8, height: 8, borderTopWidth: 2, borderRightWidth: 2, borderColor: 'rgba(0,0,0,.3)', transform: [{ rotate: '45deg' }] }} />
              </Pressable>
            ))}

            {hasNextPage && (
              <Pressable onPress={() => fetchNextPage()} disabled={isFetchingNextPage} style={{ paddingVertical: 16, alignItems: 'center' }}>
                <Text style={{ fontFamily: 'Archivo_600SemiBold', fontSize: 13, color: '#0A0A0A' }}>
                  {isFetchingNextPage ? 'Loading…' : 'Load more'}
                </Text>
              </Pressable>
            )}
          </>
        )}
        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}
