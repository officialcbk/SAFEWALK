import { Modal, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatNavDistance } from '../../services/navigation';

function joinNames(names: string[]): string {
  if (names.length === 0) return 'No one';
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

export function EndWalkSheet({
  isOpen,
  onClose,
  onConfirm,
  destination,
  remainingMeters,
  contactNames,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  destination: string | null;
  remainingMeters: number;
  contactNames: string[];
}) {
  const insets = useSafeAreaInsets();
  if (!isOpen) return null;

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,.4)' }} onPress={onClose} />
        <View
          style={{
            backgroundColor: '#fff', paddingHorizontal: 20, paddingTop: 10,
            borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingBottom: insets.bottom + 20,
          }}
        >
          <View style={{ width: 38, height: 4, borderRadius: 2, backgroundColor: 'rgba(0,0,0,.15)', alignSelf: 'center', marginBottom: 18 }} />

          <Text style={{ fontFamily: 'Archivo_700Bold', fontSize: 21, color: '#0A0A0A', letterSpacing: -0.3 }}>
            End this walk early?
          </Text>
          <Text style={{ fontFamily: 'Archivo_400Regular', fontSize: 13.5, color: 'rgba(0,0,0,.55)', marginTop: 8, lineHeight: 19 }}>
            You&apos;re {formatNavDistance(remainingMeters)} from {destination ?? 'your destination'}.{' '}
            {joinNames(contactNames)} will be told you ended the walk before arriving, and live tracking stops.
          </Text>

          <Pressable
            onPress={onConfirm}
            style={{ height: 56, borderRadius: 14, backgroundColor: '#0A0A0A', alignItems: 'center', justifyContent: 'center', marginTop: 20 }}
          >
            <Text style={{ fontFamily: 'Archivo_700Bold', fontSize: 15.5, color: '#fff' }}>End walk</Text>
          </Pressable>
          <Pressable
            onPress={onClose}
            style={{ height: 56, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(0,0,0,.15)', alignItems: 'center', justifyContent: 'center', marginTop: 10 }}
          >
            <Text style={{ fontFamily: 'Archivo_700Bold', fontSize: 15.5, color: '#0A0A0A' }}>Keep walking</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
