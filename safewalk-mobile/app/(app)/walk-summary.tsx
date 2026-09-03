import { useEffect } from 'react';
import { Pressable, ScrollView, Share, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useWalkStore } from '../../store/walkStore';
import { MapView } from '../../components/map/MapView';
import { formatPace } from '../../services/eta';
import { formatNavDistance } from '../../services/navigation';

function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${m}:${String(s).padStart(2, '0')}`;
}

function joinNames(names: string[]): string {
  if (names.length === 0) return 'No one';
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

function nowClock(): string {
  const d = new Date();
  let h = d.getHours();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${String(d.getMinutes()).padStart(2, '0')} ${ampm}`;
}

export default function WalkSummary() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const summary = useWalkStore((s) => s.lastWalkSummary);

  // No walk to summarize (e.g. screen reached directly) — bounce to Home.
  useEffect(() => {
    if (!summary) router.replace('/home');
  }, [summary, router]);

  if (!summary) return <View style={{ flex: 1, backgroundColor: '#fff' }} />;

  const km = summary.distanceMeters / 1000;
  const destinationLabel = summary.destination ?? 'your destination';
  const watchedNames = joinNames(summary.watchedByNames);
  const lastPoint = summary.visitedPath.length ? summary.visitedPath[summary.visitedPath.length - 1] : null;
  const endLocation = lastPoint ? { lng: lastPoint[0], lat: lastPoint[1] } : null;

  const handleShare = () => {
    const line = summary.endedEarly
      ? `I ended a Trayl walk early, ${formatNavDistance(summary.remainingMetersAtEnd)} from ${destinationLabel}. ${km.toFixed(1)} km in ${formatDuration(summary.durationSeconds)}.`
      : `I just finished a ${km.toFixed(1)} km walk to ${destinationLabel} on Trayl in ${formatDuration(summary.durationSeconds)}.`;
    Share.share({ message: line }).catch(() => {});
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
        <View style={{ height: 260 }}>
          <MapView
            location={endLocation}
            routeCoords={summary.plannedRouteCoords}
            walkedPath={summary.visitedPath.length > 1 ? summary.visitedPath : null}
            destinationCoords={summary.destinationCoords}
            destinationLabel={summary.destination}
            isActive={false}
            followUser={false}
            summaryMode
          />
          {summary.visitedPath.length <= 1 && !summary.plannedRouteCoords && (
            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E9E7E2' }}>
              <Text style={{ fontFamily: 'Archivo_400Regular', fontSize: 13, color: 'rgba(0,0,0,.45)' }}>No route recorded for this walk.</Text>
            </View>
          )}
          <View style={{ position: 'absolute', left: 20, bottom: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            {summary.visitedPath.length > 1 && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={{ flexDirection: 'row', gap: 2 }}>
                  {[0, 1, 2].map((i) => <View key={i} style={{ width: 3, height: 3, borderRadius: 1.5, backgroundColor: 'rgba(0,0,0,.4)' }} />)}
                </View>
                <Text style={{ fontFamily: 'IBMPlexMono_500Medium', fontSize: 8.5, letterSpacing: 0.8, textTransform: 'uppercase', color: 'rgba(0,0,0,.5)' }}>
                  Path you walked
                </Text>
              </View>
            )}
            {summary.plannedRouteCoords && summary.plannedRouteCoords.length > 1 && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={{ width: 10, height: 2, backgroundColor: 'rgba(0,0,0,.6)' }} />
                <Text style={{ fontFamily: 'IBMPlexMono_500Medium', fontSize: 8.5, letterSpacing: 0.8, textTransform: 'uppercase', color: 'rgba(0,0,0,.5)' }}>
                  Planned route
                </Text>
              </View>
            )}
          </View>
          <Pressable
            onPress={() => router.replace('/home')}
            accessibilityRole="button"
            accessibilityLabel="Close and return home"
            style={{
              position: 'absolute', left: 16, top: insets.top + 12, width: 36, height: 36, borderRadius: 99,
              backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
              shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 4,
            }}
          >
            <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#0A0A0A" strokeWidth={2.5}>
              <Path d="M18 6 6 18M6 6l12 12" />
            </Svg>
          </Pressable>
        </View>

        <View style={{ backgroundColor: '#fff', paddingHorizontal: 20, paddingTop: 20 }}>
          <View style={{ width: 38, height: 4, borderRadius: 2, backgroundColor: 'rgba(0,0,0,.15)', alignSelf: 'center', marginBottom: 18 }} />

        {summary.endedEarly ? (
          <>
            <Text style={{ fontFamily: 'IBMPlexMono_500Medium', fontSize: 8.5, letterSpacing: 1, textTransform: 'uppercase', color: 'rgba(0,0,0,.42)' }}>
              Walk ended early · {nowClock()}
            </Text>
            <Text style={{ fontFamily: 'Archivo_800ExtraBold', fontSize: 24, color: '#0A0A0A', marginTop: 6, letterSpacing: -0.4 }}>
              Ended before arriving
            </Text>
            <Text style={{ fontFamily: 'Archivo_400Regular', fontSize: 13, color: 'rgba(0,0,0,.55)', marginTop: 6, lineHeight: 19 }}>
              You stopped {formatNavDistance(summary.remainingMetersAtEnd)} from {destinationLabel}. {watchedNames} were told you ended the walk, and live tracking has stopped.
            </Text>
          </>
        ) : (
          <>
            <Text style={{ fontFamily: 'IBMPlexMono_500Medium', fontSize: 8.5, letterSpacing: 1, textTransform: 'uppercase', color: 'rgba(0,0,0,.42)' }}>
              Arrived safely · {nowClock()}
            </Text>
            <Text style={{ fontFamily: 'Archivo_800ExtraBold', fontSize: 24, color: '#0A0A0A', marginTop: 6, letterSpacing: -0.4 }}>
              Walk complete
            </Text>
            {!!summary.destination && (
              <Text style={{ fontFamily: 'Archivo_400Regular', fontSize: 13, color: 'rgba(0,0,0,.55)', marginTop: 6, lineHeight: 19 }} numberOfLines={1}>
                You arrived at {destinationLabel}. {watchedNames} were notified.
              </Text>
            )}
          </>
        )}

        <View style={{ flexDirection: 'row', marginTop: 18, borderTopWidth: 1, borderBottomWidth: 1, borderColor: 'rgba(0,0,0,.1)' }}>
          {[
            { l: 'Distance', v: `${km.toFixed(1)} km` },
            { l: 'Duration', v: formatDuration(summary.durationSeconds) },
            { l: 'Pace', v: formatPace(summary.distanceMeters, summary.durationSeconds) },
          ].map(({ l, v }, i) => (
            <View key={l} style={{ flex: 1, paddingVertical: 14, paddingLeft: i > 0 ? 14 : 0, borderLeftWidth: i > 0 ? 1 : 0, borderLeftColor: 'rgba(0,0,0,.1)' }}>
              <Text style={{ fontFamily: 'IBMPlexMono_500Medium', fontSize: 8, letterSpacing: 0.9, textTransform: 'uppercase', color: 'rgba(0,0,0,.42)' }}>{l}</Text>
              <Text style={{ fontFamily: 'Archivo_700Bold', fontSize: 20, color: '#0A0A0A', marginTop: 5 }}>{v}</Text>
            </View>
          ))}
        </View>

        <Text style={{ fontFamily: 'IBMPlexMono_500Medium', fontSize: 8, letterSpacing: 0.9, textTransform: 'uppercase', color: 'rgba(0,0,0,.42)', marginTop: 18, marginBottom: 4 }}>
          This walk
        </Text>
        {[
          { label: 'Route', value: `Your location → ${destinationLabel}` },
          { label: 'Check-ins', value: `${summary.checkInsAnswered} of ${summary.checkInsTriggered} answered` },
          { label: 'Watched by', value: summary.watchedByNames.length ? summary.watchedByNames.join(', ') : 'No one' },
          { label: 'Alerts raised', value: summary.hadSOS ? 'SOS triggered' : 'None' },
        ].map(({ label, value }) => (
          <View key={label} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 13, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,.08)' }}>
            <Text style={{ fontFamily: 'Archivo_400Regular', fontSize: 13.5, color: 'rgba(0,0,0,.6)' }}>{label}</Text>
            <Text style={{ fontFamily: 'Archivo_600SemiBold', fontSize: 13.5, color: '#0A0A0A', flexShrink: 1, textAlign: 'right' }} numberOfLines={1}>{value}</Text>
          </View>
        ))}
        {summary.sessionId && (
          <Pressable
            onPress={() => router.push({ pathname: '/walk-detail', params: { id: summary.sessionId! } })}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 13, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,.08)' }}
          >
            <Text style={{ fontFamily: 'Archivo_400Regular', fontSize: 13.5, color: 'rgba(0,0,0,.6)' }}>Saved to history</Text>
            <Text style={{ fontFamily: 'Archivo_600SemiBold', fontSize: 13.5, color: '#0A0A0A' }}>View  ›</Text>
          </Pressable>
        )}

        <Pressable
          onPress={() => router.replace('/home')}
          style={{ height: 54, borderRadius: 14, backgroundColor: '#0A0A0A', alignItems: 'center', justifyContent: 'center', marginTop: 22 }}
        >
          <Text style={{ fontFamily: 'Archivo_700Bold', fontSize: 15, color: '#fff' }}>Back to home</Text>
        </Pressable>
        <Pressable onPress={handleShare} style={{ alignItems: 'center', paddingVertical: 14 }}>
          <Text style={{ fontFamily: 'Archivo_600SemiBold', fontSize: 13, color: 'rgba(0,0,0,.55)' }}>Share this walk</Text>
        </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
