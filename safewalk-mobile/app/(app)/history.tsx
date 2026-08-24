import { Pressable, ScrollView, Text, View } from 'react-native';
import { useInfiniteQuery } from '@tanstack/react-query';
import { format, isToday, isYesterday } from 'date-fns';
import { useRouter } from 'expo-router';
import { Footprints } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import type { WalkSession } from '../../types';
import { Badge } from '../../components/ui/Badge';

const PAGE_SIZE = 20;

function formatDate(iso: string) {
  const d = new Date(iso);
  if (isToday(d)) return `Today, ${format(d, 'h:mm a')}`;
  if (isYesterday(d)) return `Yesterday, ${format(d, 'h:mm a')}`;
  return format(d, 'MMM d, h:mm a');
}

function formatDur(secs: number | null) {
  if (!secs) return '—';
  const m = Math.floor(secs / 60);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

function StatusBadge({ status }: { status: WalkSession['status'] }) {
  if (status === 'completed') return <Badge variant="success">Completed</Badge>;
  if (status === 'sos_triggered') return <Badge variant="danger">SOS used</Badge>;
  return <Badge variant="amber">Ended early</Badge>;
}

export default function History() {
  const user = useAuthStore((s) => s.user);
  const router = useRouter();

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
  const totalDist = all.reduce((sum, w) => sum + (w.distance_meters ?? 0), 0);

  return (
    <View className="flex-1 bg-gray-bg">
      <View className="px-5 pt-3 pb-3">
        <Text className="text-[26px] font-bold text-dark-text tracking-tight">History</Text>
        {all.length > 0 && (
          <Text className="text-[13px] text-gray-text mt-0.5">
            {all.length} walk{all.length !== 1 ? 's' : ''} · {(totalDist / 1000).toFixed(1)} km total
          </Text>
        )}
      </View>

      <ScrollView className="px-4" contentContainerStyle={{ paddingBottom: 24 }}>
        {isLoading ? (
          <View className="gap-2">
            {[1, 2, 3].map((i) => (
              <View key={i} className="h-[72px] bg-white rounded-2xl opacity-60" />
            ))}
          </View>
        ) : all.length === 0 ? (
          <View className="bg-white rounded-2xl p-8 items-center border border-gray-border">
            <Text className="text-[15px] font-semibold text-dark-text mb-1">No walks yet</Text>
            <Text className="text-[13px] text-gray-text">Start your first walk to see your history here.</Text>
            <Pressable onPress={() => router.push('/home')} className="mt-4">
              <Text className="text-[13px] font-semibold text-purple-600">Start your first walk</Text>
            </Pressable>
          </View>
        ) : (
          <View className="gap-2">
            {all.map((w) => (
              <View key={w.id} className="bg-white border border-gray-border rounded-2xl p-3.5">
                <View className="flex-row items-center gap-3">
                  <View className="w-11 h-11 rounded-xl bg-purple-50 items-center justify-center">
                    <Footprints size={22} color="#534AB7" />
                  </View>
                  <View className="flex-1 min-w-0">
                    <Text className="text-[15px] font-semibold text-dark-text" numberOfLines={1}>
                      {w.destination ?? 'Walk'}
                    </Text>
                    <Text className="text-xs text-gray-text mt-0.5">
                      {formatDate(w.started_at)}
                      {w.duration_seconds ? ` · ${formatDur(w.duration_seconds)}` : ''}
                      {w.distance_meters ? ` · ${(w.distance_meters / 1000).toFixed(1)} km` : ''}
                    </Text>
                  </View>
                  <StatusBadge status={w.status} />
                </View>
              </View>
            ))}

            {hasNextPage && (
              <Pressable
                onPress={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="w-full h-[52px] bg-purple-50 rounded-2xl items-center justify-center border border-purple-100 mt-1"
              >
                <Text className="text-purple-600 text-sm font-semibold">
                  {isFetchingNextPage ? 'Loading…' : 'Load more'}
                </Text>
              </Pressable>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
