import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, Text, Vibration, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import * as Haptics from 'expo-haptics';

const HOLD_MS = 3000;
const CIRCUMFERENCE = 201; // 2π × 32
const TICK_MS = 50;

interface SosButtonProps {
  onActivated: () => void;
  disabled?: boolean;
}

export function SosButton({ onActivated, disabled }: SosButtonProps) {
  const [holding, setHolding] = useState(false);
  const [progress, setProgress] = useState(CIRCUMFERENCE);
  const [countdown, setCountdown] = useState(3);
  const holdRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef = useRef(0);

  const cancel = useCallback(() => {
    if (holdRef.current) clearTimeout(holdRef.current);
    if (tickRef.current) clearInterval(tickRef.current);
    setHolding(false);
    setProgress(CIRCUMFERENCE);
    setCountdown(3);
  }, []);

  const start = useCallback(() => {
    if (disabled) return;
    setHolding(true);
    startRef.current = Date.now();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

    tickRef.current = setInterval(() => {
      const elapsed = Date.now() - startRef.current;
      const pct = Math.min(elapsed / HOLD_MS, 1);
      setProgress(CIRCUMFERENCE * (1 - pct));
      setCountdown(Math.max(1, Math.ceil(3 - pct * 3)));
    }, TICK_MS);

    holdRef.current = setTimeout(() => {
      cancel();
      Vibration.vibrate([100, 50, 100, 50, 200]);
      onActivated();
    }, HOLD_MS);
  }, [disabled, cancel, onActivated]);

  useEffect(() => () => cancel(), [cancel]);

  return (
    <View className="items-center gap-1.5">
      <View style={{ width: 84, height: 84, alignItems: 'center', justifyContent: 'center' }}>
        <Svg
          width={84}
          height={84}
          style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}
        >
          <Circle cx={42} cy={42} r={32} fill="none" stroke="rgba(226,75,74,0.2)" strokeWidth={3.5} />
          <Circle
            cx={42}
            cy={42}
            r={32}
            fill="none"
            stroke="#E24B4A"
            strokeWidth={3.5}
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={progress}
            strokeLinecap="round"
          />
        </Svg>
        <Pressable
          onPressIn={start}
          onPressOut={cancel}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel="Emergency SOS — press and hold to activate"
          accessibilityState={{ disabled, selected: holding }}
          className="items-center justify-center disabled:opacity-40"
          style={{
            width: 72, height: 72, borderRadius: 36, backgroundColor: '#E24B4A',
            borderWidth: 3, borderColor: 'white',
            shadowColor: '#E24B4A', shadowOpacity: holding ? 0.55 : 0.45,
            shadowRadius: holding ? 14 : 11, shadowOffset: { width: 0, height: 4 }, elevation: 6,
          }}
        >
          <Text className="text-white font-bold text-sm tracking-wide">{holding ? countdown : 'SOS'}</Text>
        </Pressable>
      </View>
    </View>
  );
}
