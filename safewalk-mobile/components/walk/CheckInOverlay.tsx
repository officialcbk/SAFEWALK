import { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const WINDOW_SECONDS = 28;

export function CheckInOverlay({
  contactName,
  onSafe,
  onSOS,
  onExpire,
}: {
  contactName: string | null;
  onSafe: () => void;
  onSOS: () => void;
  onExpire: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [secondsLeft, setSecondsLeft] = useState(WINDOW_SECONDS);
  const onExpireRef = useRef(onExpire);
  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    const id = setInterval(() => setSecondsLeft((s) => (s <= 1 ? WINDOW_SECONDS : s - 1)), 1000);
    return () => clearInterval(id);
  }, []);

  // Firing onExpire directly inside the setSecondsLeft updater above (React
  // calls that updater during this component's own render/reconciliation)
  // tripped "Cannot update a component while rendering a different
  // component" the moment onExpire called Toast.show, which itself sets
  // state on the toast library's component. Detecting the wrap-around here
  // — secondsLeft jumping back up to WINDOW_SECONDS — keeps the interval's
  // state transition pure and fires the side effect only after render,
  // without a second setState call in the same effect.
  const prevSecondsRef = useRef(secondsLeft);
  useEffect(() => {
    if (secondsLeft > prevSecondsRef.current) onExpireRef.current();
    prevSecondsRef.current = secondsLeft;
  }, [secondsLeft]);

  const pct = (secondsLeft / WINDOW_SECONDS) * 100;

  return (
    // A real Modal (separate native layer), not an absolutely-positioned
    // View — on Android, the map's native SurfaceView can swallow touches
    // meant for plain overlay Views drawn "on top" of it, even though they
    // render correctly visually. Modal sits in its own window and isn't
    // affected by that.
    <Modal visible transparent animationType="fade" statusBarTranslucent>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,.4)' }} />
        <View
          style={{
            backgroundColor: '#0A0A0A', paddingHorizontal: 20, paddingTop: 10,
            borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingBottom: insets.bottom + 24,
          }}
        >
          <View style={{ width: 38, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,.25)', alignSelf: 'center', marginBottom: 20 }} />
          <Text style={{ fontFamily: 'IBMPlexMono_500Medium', fontSize: 8.5, letterSpacing: 1.02, textTransform: 'uppercase', color: 'rgba(255,255,255,.45)' }}>
            Check-in due
          </Text>
          <Text style={{ fontFamily: 'Archivo_700Bold', fontSize: 23, color: '#fff', marginTop: 6, letterSpacing: -0.3 }}>
            Are you okay?
          </Text>
          <Text style={{ fontFamily: 'Archivo_400Regular', fontSize: 13, color: 'rgba(255,255,255,.6)', marginTop: 6, lineHeight: 18 }}>
            If you don&apos;t answer, {contactName ?? 'your primary contact'} gets your location and a call in{' '}
            <Text style={{ color: '#fff', fontFamily: 'Archivo_600SemiBold' }}>{secondsLeft} seconds</Text>.
          </Text>

          <View style={{ height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,.15)', marginTop: 16, overflow: 'hidden' }}>
            <View style={{ height: '100%', width: `${pct}%`, backgroundColor: '#fff', borderRadius: 2 }} />
          </View>

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
            <Pressable
              onPress={onSafe}
              style={{ flex: 1, height: 54, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{ fontFamily: 'Archivo_700Bold', fontSize: 15, color: '#0A0A0A' }}>I&apos;m okay</Text>
            </Pressable>
            <Pressable
              onPress={onSOS}
              style={{ width: 104, height: 54, borderRadius: 14, backgroundColor: '#E5342A', alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{ fontFamily: 'Archivo_700Bold', fontSize: 15, color: '#fff' }}>SOS</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
