import { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useWalkStore } from '../../store/walkStore';
import { MapView } from '../../components/map/MapView';
import { formatPace } from '../../services/eta';

function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${m}:${String(s).padStart(2, '0')}`;
}

export default function WalkSummary() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const summary = useWalkStore((s) => s.lastWalkSummary);

  // No walk to summarize (e.g. screen reached directly) — bounce to Home.
  useEffect(() => {
    if (!summary) router.replace('/home');
  }, [summary, router]);

  if (!summary) return <View className="flex-1 bg-[#EEF1F6]" />;

  const km = summary.distanceMeters / 1000;

  return (
    <View className="flex-1 bg-[#EEF1F6]">
      <View style={{ height: '52%' }}>
        <MapView
          location={null}
          routeCoords={summary.visitedPath.length > 1 ? summary.visitedPath : null}
          destinationCoords={null}
          isActive={false}
          followUser={false}
        />
        {summary.visitedPath.length <= 1 && (
          <View className="absolute inset-0 items-center justify-center">
            <Text className="text-sm text-gray-text">No route recorded for this walk.</Text>
          </View>
        )}
      </View>

      <View className="flex-1 bg-white px-5 pt-6" style={{ borderTopLeftRadius: 24, borderTopRightRadius: 24, marginTop: -24 }}>
        <View className="w-11 h-1 bg-[#E0E0E8] rounded-full self-center mb-5" />

        <View className="items-center mb-1">
          <View className="w-12 h-12 rounded-full bg-status-safe-bg items-center justify-center mb-3">
            <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#3B6D11" strokeWidth={2.5}>
              <Path d="M20 6 9 17l-5-5" />
            </Svg>
          </View>
          <Text className="text-[22px] font-bold text-dark-text tracking-tight">Walk complete</Text>
          {!!summary.destination && (
            <Text className="text-sm text-gray-text mt-1" numberOfLines={1}>{summary.destination}</Text>
          )}
        </View>

        <View className="items-center my-6">
          <Text className="text-dark-text font-bold tracking-tight" style={{ fontSize: 56, lineHeight: 60 }}>
            {km.toFixed(2)}
          </Text>
          <Text className="text-[#999AAA] text-xs font-semibold mt-1">KILOMETRES</Text>
        </View>

        <View className="flex-row bg-[#F6F6FA] rounded-2xl overflow-hidden border border-[#EDEDF2] mb-6">
          {[
            { label: 'DURATION', value: formatDuration(summary.durationSeconds) },
            { label: 'AVG PACE', value: formatPace(summary.distanceMeters, summary.durationSeconds) },
          ].map(({ label, value }, i) => (
            <View key={label} className="flex-1 items-center py-4" style={i > 0 ? { borderLeftWidth: 1, borderLeftColor: '#E4E4ED' } : undefined}>
              <Text className="text-lg font-bold text-dark-text leading-none">{value}</Text>
              <Text className="text-[10px] text-[#999AAA] font-semibold mt-1.5">{label}</Text>
            </View>
          ))}
        </View>

        <Pressable
          onPress={() => router.replace('/home')}
          className="w-full h-[54px] rounded-2xl items-center justify-center overflow-hidden"
          style={{ marginBottom: insets.bottom + 8 }}
        >
          <LinearGradient colors={['#7F77DD', '#534AB7']} style={{ position: 'absolute', inset: 0 }} />
          <Text className="text-white font-bold text-base">Done</Text>
        </Pressable>
      </View>
    </View>
  );
}
