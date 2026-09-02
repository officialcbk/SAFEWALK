import { Pressable, Text, View } from 'react-native';

// The "Arrived" state's bottom-sheet content — rendered in place of the
// normal ETA/SOS row once the walker reaches the destination. Time, distance
// and check-ins are all real counted numbers, never estimates.
export function ArrivalPrompt({
  destination,
  timeLabel,
  distanceLabel,
  checkIns,
  onEnd,
}: {
  destination: string | null;
  timeLabel: string;
  distanceLabel: string;
  checkIns: number;
  onEnd: () => void;
}) {
  return (
    <View>
      <Text style={{ fontFamily: 'IBMPlexMono_500Medium', fontSize: 8.5, letterSpacing: 1.02, textTransform: 'uppercase', color: 'rgba(0,0,0,.42)' }}>
        You&apos;ve arrived
      </Text>
      <Text style={{ fontFamily: 'Archivo_700Bold', fontSize: 21, color: '#0A0A0A', marginTop: 4, letterSpacing: -0.3 }} numberOfLines={1}>
        {destination ?? 'Your destination'}
      </Text>

      <View style={{ flexDirection: 'row', marginTop: 16, borderTopWidth: 1, borderBottomWidth: 1, borderColor: 'rgba(0,0,0,.1)' }}>
        {[
          { l: 'Time', v: timeLabel },
          { l: 'Distance', v: distanceLabel },
          { l: 'Check-in', v: String(checkIns) },
        ].map(({ l, v }, i) => (
          <View key={l} style={{ flex: 1, paddingVertical: 12, paddingLeft: i > 0 ? 14 : 0, borderLeftWidth: i > 0 ? 1 : 0, borderLeftColor: 'rgba(0,0,0,.1)' }}>
            <Text style={{ fontFamily: 'IBMPlexMono_500Medium', fontSize: 8, letterSpacing: 0.9, textTransform: 'uppercase', color: 'rgba(0,0,0,.42)' }}>{l}</Text>
            <Text style={{ fontFamily: 'Archivo_700Bold', fontSize: 20, color: '#0A0A0A', marginTop: 5 }}>{v}</Text>
          </View>
        ))}
      </View>

      <Pressable
        onPress={onEnd}
        style={{ height: 56, borderRadius: 14, backgroundColor: '#0A0A0A', alignItems: 'center', justifyContent: 'center', marginTop: 16 }}
      >
        <Text style={{ fontFamily: 'Archivo_700Bold', fontSize: 15.5, color: '#fff' }}>I&apos;m here, end walk</Text>
      </Pressable>
    </View>
  );
}
