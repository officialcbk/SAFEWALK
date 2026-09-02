import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, Text, Vibration, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import * as Haptics from 'expo-haptics';

const HOLD_MS = 3000;
const TICK_MS = 50;

interface SosButtonProps {
  onActivated: () => void;
  disabled?: boolean;
  size?: number;
  variant?: 'circle' | 'pill' | 'filled' | 'block';
  /** 'block' only — hold duration in seconds shown in the caption ("HOLD 3 SECONDS"). */
  holdSeconds?: number;
}

export function SosButton({ onActivated, disabled, size = 84, variant = 'circle', holdSeconds = 3 }: SosButtonProps) {
  const radius = size * 0.381; // matches the original 32/84 ratio
  const circumference = 2 * Math.PI * radius;
  const inner = size * 0.857; // matches the original 72/84 ratio
  const [holding, setHolding] = useState(false);
  const [progress, setProgress] = useState(circumference);
  const [countdown, setCountdown] = useState(3);
  const holdRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef = useRef(0);

  const cancel = useCallback(() => {
    if (holdRef.current) clearTimeout(holdRef.current);
    if (tickRef.current) clearInterval(tickRef.current);
    setHolding(false);
    setProgress(circumference);
    setCountdown(3);
  }, [circumference]);

  const start = useCallback(() => {
    if (disabled) return;
    setHolding(true);
    startRef.current = Date.now();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

    tickRef.current = setInterval(() => {
      const elapsed = Date.now() - startRef.current;
      const pct = Math.min(elapsed / HOLD_MS, 1);
      setProgress(circumference * (1 - pct));
      setCountdown(Math.max(1, Math.ceil(3 - pct * 3)));
    }, TICK_MS);

    holdRef.current = setTimeout(() => {
      cancel();
      Vibration.vibrate([100, 50, 100, 50, 200]);
      onActivated();
    }, HOLD_MS);
  }, [disabled, cancel, onActivated, circumference]);

  useEffect(() => () => cancel(), [cancel]);

  const c = size / 2;
  const heldPct = Math.max(0, Math.min(1, 1 - progress / circumference));

  if (variant === 'pill') {
    return (
      <Pressable
        onPressIn={start}
        onPressOut={cancel}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel="Emergency SOS — press and hold to activate"
        accessibilityState={{ disabled, selected: holding }}
        style={{
          flex: 1, height: 54, borderRadius: 16, borderWidth: 1.5, borderColor: '#E5342A',
          backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
          opacity: disabled ? 0.4 : 1,
        }}
      >
        <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${heldPct * 100}%`, backgroundColor: 'rgba(229,52,42,.14)' }} />
        <Text style={{ fontFamily: 'Archivo_700Bold', fontSize: 15, color: '#E5342A' }}>
          {holding ? `Hold… ${countdown}` : 'SOS'}
        </Text>
      </Pressable>
    );
  }

  // Large filled red pill — the navigation bottom sheet's SOS control.
  // Held rather than tapped; fires after HOLD_MS regardless of size/variant.
  if (variant === 'filled') {
    return (
      <Pressable
        onPressIn={start}
        onPressOut={cancel}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel="Emergency SOS — press and hold to activate"
        accessibilityState={{ disabled, selected: holding }}
        style={{
          width: 104, height: 54, borderRadius: 16, backgroundColor: '#E5342A',
          alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
          opacity: disabled ? 0.4 : 1,
        }}
      >
        <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${heldPct * 100}%`, backgroundColor: 'rgba(0,0,0,.18)' }} />
        <Text style={{ fontFamily: 'Archivo_700Bold', fontSize: 16, color: '#fff', letterSpacing: -0.2 }}>
          {holding ? countdown : 'SOS'}
        </Text>
        <Text style={{ fontFamily: 'IBMPlexMono_500Medium', fontSize: 8, letterSpacing: 0.6, color: 'rgba(255,255,255,.8)', marginTop: 2 }}>
          HOLD
        </Text>
      </Pressable>
    );
  }

  // Full-width block — one-handed mode's SOS, held longer and impossible to miss.
  if (variant === 'block') {
    return (
      <Pressable
        onPressIn={start}
        onPressOut={cancel}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={`Emergency SOS — press and hold for ${holdSeconds} seconds to activate`}
        accessibilityState={{ disabled, selected: holding }}
        style={{
          width: '100%', height: 96, borderRadius: 20, backgroundColor: '#E5342A',
          alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
          opacity: disabled ? 0.4 : 1,
        }}
      >
        <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${heldPct * 100}%`, backgroundColor: 'rgba(0,0,0,.18)' }} />
        <Text style={{ fontFamily: 'Archivo_800ExtraBold', fontSize: 24, color: '#fff', letterSpacing: -0.3 }}>
          {holding ? countdown : 'SOS'}
        </Text>
        <Text style={{ fontFamily: 'IBMPlexMono_500Medium', fontSize: 9, letterSpacing: 0.8, color: 'rgba(255,255,255,.8)', marginTop: 3, textTransform: 'uppercase' }}>
          {holding ? 'Keep holding…' : `Hold ${holdSeconds} seconds`}
        </Text>
      </Pressable>
    );
  }

  return (
    <View className="items-center gap-1.5">
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <Svg
          width={size}
          height={size}
          style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}
        >
          <Circle cx={c} cy={c} r={radius} fill="none" stroke="rgba(226,75,74,0.2)" strokeWidth={size * 0.0417} />
          <Circle
            cx={c}
            cy={c}
            r={radius}
            fill="none"
            stroke="#E24B4A"
            strokeWidth={size * 0.0417}
            strokeDasharray={circumference}
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
            width: inner, height: inner, borderRadius: inner / 2, backgroundColor: '#E24B4A',
            borderWidth: 3, borderColor: 'white',
            shadowColor: '#E24B4A', shadowOpacity: holding ? 0.55 : 0.45,
            shadowRadius: holding ? 14 : 11, shadowOffset: { width: 0, height: 4 }, elevation: 6,
          }}
        >
          <Text className="text-white font-bold text-sm tracking-wide" style={{ fontSize: size < 70 ? 12 : 14 }}>
            {holding ? countdown : 'SOS'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
