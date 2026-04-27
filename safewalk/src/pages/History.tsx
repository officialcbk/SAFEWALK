import { useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { format, isToday, isYesterday } from 'date-fns';
import { Clock, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import type { WalkSession } from '../types';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';

const PAGE_SIZE = 20;

function formatDate(iso: string) {
  const d = new Date(iso);
  if (isToday(d))     return `Today, ${format(d, 'h:mm a')}`;
  if (isYesterday(d)) return `Yesterday, ${format(d, 'h:mm a')}`;
  return format(d, 'MMM d, h:mm a');
}

function formatDur(secs: number | null) {
  if (!secs) return '—';
  const m = Math.floor(secs / 60);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m/60)}h ${m%60}m`;
}

function statusBadge(status: WalkSession['status']) {
  if (status === 'completed')    return <Badge variant="success">Completed</Badge>;
  if (status === 'sos_triggered') return <Badge variant="danger">SOS used</Badge>;
  return <Badge variant="warning">Ended early</Badge>;
}

export default function History() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState<string | null>(null);

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
    getNextPageParam: (last, all) => {
      return last.items.length < PAGE_SIZE ? undefined : last.nextOffset;
    },
  });

  const all = data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <div className="px-4 pt-5 pb-4">
      <h1 className="text-[13px] font-bold text-[#1A1A28] mb-4">Walk history</h1>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {[1,2,3].map((i) => <div key={i} className="h-[52px] bg-[#F0F0F4] rounded-[10px] animate-shimmer" />)}
        </div>
      ) : all.length === 0 ? (
        <EmptyState
          icon={Clock}
          title="No walks yet"
          body="Start your first walk to see your history here."
          actionLabel="Start your first walk"
          onAction={() => navigate('/home')}
        />
      ) : (
        <div className="flex flex-col gap-2">
          {all.map((w) => (
            <button
              key={w.id}
              onClick={() => setExpanded((e) => e === w.id ? null : w.id)}
              className="flex flex-col bg-white border border-[#E0E0E8] rounded-[10px] p-3 text-left w-full transition-all"
            >
              <div className="flex items-center gap-3 min-h-[52px]">
                <div className="w-7 h-7 rounded-full bg-[#EEEDFE] flex items-center justify-center flex-shrink-0">
                  <MapPin size={12} className="text-[#7F77DD]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold text-[#1A1A28] truncate">
                    {w.destination ?? 'Walk'}
                  </p>
                  <p className="text-[8px] text-[#888899]">{formatDate(w.started_at)}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-[9px] font-bold text-[#1A1A28]">{formatDur(w.duration_seconds)}</p>
                  <div className="mt-1">{statusBadge(w.status)}</div>
                </div>
              </div>

              {/* Expanded detail */}
              {expanded === w.id && (
                <div className="border-t border-[#F0F0F4] mt-2 pt-2 flex flex-col gap-1.5">
                  {w.distance_meters && (
                    <p className="text-[9px] text-[#888899]">
                      Distance: <strong className="text-[#1A1A28]">{(w.distance_meters / 1000).toFixed(2)} km</strong>
                    </p>
                  )}
                  <p className="text-[9px] text-[#888899]">
                    Started: <strong className="text-[#1A1A28]">{formatDate(w.started_at)}</strong>
                  </p>
                </div>
              )}
            </button>
          ))}

          {hasNextPage && (
            <button
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              className="text-[9px] text-[#7F77DD] text-center py-3"
            >
              {isFetchingNextPage ? 'Loading…' : 'Load more walks ↓'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
