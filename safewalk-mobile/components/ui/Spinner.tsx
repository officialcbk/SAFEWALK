import { useEffect, useState } from 'react';
import { Animated, Easing, View } from 'react-native';

/**
 * Full-screen brand loading state — same dark background as the native splash
 * screen (app.json's expo-splash-screen config) so the handoff from native
 * splash to this JS-rendered screen reads as one continuous screen instead of
 * a jarring color flash.
 */
export function FullPageSpinner() {
  const [pulse] = useState(() => new Animated.Value(0.4));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.4, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <View className="flex-1 items-center justify-center" style={{ backgroundColor: '#0a0a0a' }}>
      <Animated.Image
        source={require('../../assets/images/icon.png')}
        style={{ width: 96, height: 96, borderRadius: 24, opacity: pulse }}
      />
    </View>
  );
}
