import { useInfiniteQuery } from '@tanstack/react-query';
import { format, isToday, isYesterday } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import type { WalkSession } from '../types';
import { Badge } from '../components/ui/Badge';

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
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

function statusBadge(status: WalkSession['status']) {
  if (status === 'completed')     return <Badge variant="success">Completed</Badge>;
  if (status === 'sos_triggered') return <Badge variant="danger">SOS used</Badge>;
  return <Badge variant="amber">Ended early</Badge>;
}

function WalkIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#534AB7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="13" cy="4" r="2"/><path d="m13 7-2 4 3 3v6"/><path d="m11 11-3 1-2 4"/><path d="M14 14h4"/>
    </svg>
  );
}

export default function History() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

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
    getNextPageParam: (last) => last.items.length < PAGE_SIZE ? undefined : last.nextOffset,
  });

  const all = data?.pages.flatMap((p) => p.items) ?? [];
  const totalDist = all.reduce((sum, w) => sum + (w.distance_meters ?? 0), 0);

  return (
    <div className="min-h-full bg-[#F0F0F4]">
      {/* Header */}
      <div className="px-5 pt-3 pb-3">
        <h1 className="text-[26px] font-bold text-[#1A1A28] tracking-[-0.5px]">History</h1>
        {all.length > 0 && (
          <p className="text-[13px] text-[#888899] mt-0.5">
            {all.length} walk{all.length !== 1 ? 's' : ''} · {(totalDist / 1000).toFixed(1)} km total
          </p>
        )}
      </div>

      <div className="px-4 pb-6">
        {isLoading ? (
          <div className="flex flex-col gap-2">
            {[1, 2, 3].map((i) => <div key={i} className="h-[72px] bg-white rounded-[14px] animate-shimmer" />)}
          </div>
        ) : all.length === 0 ? (
          <div className="bg-white rounded-[14px] p-8 text-center border border-[#E0E0E8]">
            <p className="text-[15px] font-semibold text-[#1A1A28] mb-1">No walks yet</p>
            <p className="text-[13px] text-[#888899]">Start your first walk to see your history here.</p>
            <button
              onClick={() => navigate('/home')}
              className="mt-4 text-[13px] font-semibold text-[#534AB7]"
            >
              Start your first walk
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {all.map((w) => (
              <div key={w.id} className="bg-white border border-[#E0E0E8] rounded-[14px] p-3.5">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-[12px] bg-[#EEEDFE] flex items-center justify-center flex-shrink-0">
                    <WalkIcon />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[15px] font-semibold text-[#1A1A28] truncate">
                      {w.destination ?? 'Walk'}
                    </div>
                    <div className="text-[12px] text-[#888899] mt-0.5">
                      {formatDate(w.started_at)}
                      {w.duration_seconds ? ` · ${formatDur(w.duration_seconds)}` : ''}
                      {w.distance_meters ? ` · ${(w.distance_meters / 1000).toFixed(1)} km` : ''}
                    </div>
                  </div>
                  {statusBadge(w.status)}
                </div>
              </div>
            ))}

            {hasNextPage && (
              <button
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="w-full h-[52px] bg-[#EEEDFE] text-[#534AB7] rounded-[14px] text-[14px] font-semibold border border-[#DCD9FB] mt-1"
              >
                {isFetchingNextPage ? 'Loading…' : 'Load more'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
