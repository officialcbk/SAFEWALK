import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ManeuverIcon } from './ManeuverIcon';
import { SosButton } from './SosButton';
import { formatNavDistance, humanizeInstruction } from '../../services/navigation';
import { formatArrivalClock } from '../../services/eta';
import type { RouteStep } from '../../services/directions';
import type { TrustedContact } from '../../types';

// The fifth nav state — no map at all. Full-width text and a held SOS block
// so the phone can stay pocketed or barely glanced at while walking.
export function OneHandedScreen({
  currentStep,
  navRemainingMeters,
  navRemainingSeconds,
  watchingContacts,
  onShowMap,
  onSOS,
}: {
  currentStep?: RouteStep | null;
  nextStep?: RouteStep | null;
  navRemainingMeters: number;
  navRemainingSeconds: number;
  watchingContacts: TrustedContact[];
  onShowMap: () => void;
  onSOS: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: '#0A0A0A', paddingHorizontal: 24, paddingTop: insets.top + 14, paddingBottom: insets.bottom + 24 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontFamily: 'IBMPlexMono_500Medium', fontSize: 8.5, letterSpacing: 1, textTransform: 'uppercase', color: 'rgba(255,255,255,.4)' }}>
          One-handed
        </Text>
        <Pressable onPress={onShowMap} accessibilityRole="button" accessibilityLabel="Show map">
          <Text style={{ fontFamily: 'Archivo_600SemiBold', fontSize: 13, color: '#fff' }}>Show map</Text>
        </Pressable>
      </View>

      <View style={{ flex: 1, justifyContent: 'center' }}>
        {currentStep ? (
          <>
            <ManeuverIcon type={currentStep.maneuverType} modifier={currentStep.maneuverModifier} color="#fff" size={48} />
            <Text style={{ fontFamily: 'Archivo_800ExtraBold', fontSize: 44, color: '#fff', letterSpacing: -1, marginTop: 14 }}>
              {formatNavDistance(currentStep.distance)}
            </Text>
            <Text style={{ fontFamily: 'Archivo_700Bold', fontSize: 20, color: '#fff', marginTop: 6 }}>
              {humanizeInstruction(currentStep)}
            </Text>
          </>
        ) : (
          <Text style={{ fontFamily: 'Archivo_700Bold', fontSize: 22, color: '#fff' }}>On your way</Text>
        )}

        <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,.12)', marginVertical: 22 }} />

        <Text style={{ fontFamily: 'Archivo_700Bold', fontSize: 26, color: '#fff', letterSpacing: -0.4 }}>
          {navRemainingSeconds > 0 ? `${Math.max(1, Math.round(navRemainingSeconds / 60))} min` : 'Almost there'}
        </Text>
        <Text style={{ fontFamily: 'Archivo_400Regular', fontSize: 13.5, color: 'rgba(255,255,255,.55)', marginTop: 4 }}>
          {navRemainingMeters > 0
            ? `${formatNavDistance(navRemainingMeters)} · arrive ${formatArrivalClock(navRemainingSeconds)}`
            : 'Almost at your destination'}
        </Text>

        <Text style={{ fontFamily: 'Archivo_400Regular', fontSize: 12.5, color: 'rgba(255,255,255,.45)', marginTop: 14 }}>
          {watchingContacts.length === 0
            ? 'No one notified'
            : `${watchingContacts.map((c) => c.full_name.split(' ')[0]).join(', ')} notified`}
        </Text>
      </View>

      <SosButton onActivated={onSOS} variant="block" holdSeconds={3} />
    </View>
  );
}
