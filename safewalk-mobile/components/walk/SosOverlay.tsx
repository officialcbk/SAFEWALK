import { useEffect, useState } from 'react';
import { Animated, Easing, Linking, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';

interface Contact { name: string; phone: string }

function PingRing({ size, borderOpacity, delay }: { size: number; borderOpacity: number; delay: number }) {
  const [anim] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(anim, { toValue: 1, duration: 2000, delay, easing: Easing.out(Easing.ease), useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, [anim, delay]);

  const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.4] });
  const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [borderOpacity, 0] });

  return (
    <Animated.View
      style={{
        position: 'absolute', width: size, height: size, borderRadius: size / 2,
        borderWidth: 2, borderColor: 'white', transform: [{ scale }], opacity,
      }}
    />
  );
}

export function SosOverlay({ onCancel, contacts }: { onCancel: () => void; contacts: Contact[] }) {
  const insets = useSafeAreaInsets();
  return (
    // Real Modal, not an absolutely-positioned View — react-native-maps'
    // native SurfaceView on Android can swallow touches meant for a plain
    // overlay drawn "on top" of it visually. See CheckInOverlay for detail.
    <Modal visible transparent animationType="fade" statusBarTranslucent>
      <View style={StyleSheet.absoluteFill}>
      <LinearGradient colors={['#E24B4A', '#c03b3a']} style={StyleSheet.absoluteFill} />
      <View
        className="flex-1 items-center justify-between px-6"
        style={{ paddingTop: insets.top + 32, paddingBottom: insets.bottom + 24 }}
      >
        <View className="items-center gap-4 mt-8 w-full">
          <View style={{ width: 160, height: 160, alignItems: 'center', justifyContent: 'center' }}>
            <PingRing size={160} borderOpacity={0.2} delay={0} />
            <PingRing size={130} borderOpacity={0.3} delay={500} />
            <View
              className="w-24 h-24 rounded-full bg-white items-center justify-center"
              style={{ shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 8 }}
            >
              <Text className="text-sos font-bold text-lg tracking-wide">SOS</Text>
            </View>
          </View>
          <View className="items-center">
            <Text className="text-[22px] font-bold text-white tracking-tight">Emergency activated</Text>
            <Text className="text-sm text-white/80 mt-1">Alerting your contacts now…</Text>
          </View>
          {contacts.length > 0 && (
            <View className="w-full gap-2 mt-2">
              {contacts.map((c) => (
                <View key={c.phone} className="flex-row items-center justify-between bg-white/15 rounded-2xl px-4 py-3">
                  <View>
                    <Text className="text-white font-semibold text-sm">{c.name}</Text>
                    <Text className="text-white/70 text-xs">{c.phone}</Text>
                  </View>
                  <View className="flex-row items-center gap-1.5 bg-white/20 rounded-full px-3 py-1">
                    <Svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5}>
                      <Path d="M20 6 9 17l-5-5" />
                    </Svg>
                    <Text className="text-white text-[11px] font-semibold">SMS sent</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        <View className="w-full gap-2.5">
          <Pressable
            onPress={onCancel}
            className="w-full h-[52px] rounded-2xl bg-white/20 border border-white/30 items-center justify-center"
          >
            <Text className="text-white font-semibold text-base">Cancel SOS — I&apos;m okay</Text>
          </Pressable>
          <Pressable
            onPress={() => Linking.openURL('tel:911')}
            className="w-full h-[52px] rounded-2xl bg-white flex-row items-center justify-center gap-2"
          >
            <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#E24B4A" strokeWidth={2}>
              <Path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3-8.6A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .3 2 .6 2.9a2 2 0 0 1-.5 2L8 9.8a16 16 0 0 0 6 6l1.2-1.2a2 2 0 0 1 2-.5c1 .3 2 .5 2.9.6a2 2 0 0 1 1.7 2Z" />
            </Svg>
            <Text className="font-semibold text-base text-sos">Call 911</Text>
          </Pressable>
        </View>
      </View>
      </View>
    </Modal>
  );
}
