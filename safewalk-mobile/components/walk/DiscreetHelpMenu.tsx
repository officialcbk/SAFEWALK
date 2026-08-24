import { Linking, Pressable, Share, Text, View } from 'react-native';
import Toast from 'react-native-toast-message';
import Svg, { Circle, Path } from 'react-native-svg';
import { BottomSheet } from '../ui/BottomSheet';

export function DiscreetHelpMenu({
  isOpen,
  shareUrl,
  onClose,
  onSOS,
  onFeelingUneasy,
  onShowSafePlaces,
}: {
  isOpen: boolean;
  shareUrl: string | null;
  onClose: () => void;
  onSOS: () => void;
  onFeelingUneasy: () => void;
  onShowSafePlaces: () => void;
}) {
  const handleShare = () => {
    if (!shareUrl) { Toast.show({ type: 'error', text1: 'No share link available yet.' }); return; }
    Share.share({ title: 'Track my walk on SafeWalk', message: shareUrl }).catch(() => {});
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose}>
      <Text className="text-lg font-bold text-dark-text mb-0.5">Stay safe</Text>
      <Text className="text-xs text-gray-text mb-4">These options are discreet — no one will see your screen.</Text>

      <View className="gap-2">
        <Pressable
          onPress={() => { onClose(); onFeelingUneasy(); }}
          className="flex-row items-center gap-3.5 w-full p-3.5 rounded-2xl"
          style={{ backgroundColor: '#FFF8EC', borderWidth: 1, borderColor: '#F5DFB0' }}
        >
          <View className="w-9 h-9 rounded-full items-center justify-center" style={{ backgroundColor: 'rgba(234,163,44,0.15)' }}>
            <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#B07A00" strokeWidth={2}>
              <Circle cx={12} cy={12} r={10} />
              <Path d="M12 8v4" /><Path d="M12 16h.01" />
            </Svg>
          </View>
          <View className="flex-1 min-w-0">
            <Text className="text-sm font-semibold" style={{ color: '#7A5400' }}>I feel uneasy</Text>
            <Text className="text-[11px]" style={{ color: '#B07A00' }}>Show safe places, stay aware</Text>
          </View>
        </Pressable>

        <Pressable
          onPress={() => { handleShare(); onClose(); }}
          className="flex-row items-center gap-3.5 w-full p-3.5 rounded-2xl bg-[#F6F6FA] border border-gray-border"
        >
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#534AB7" strokeWidth={2}>
            <Circle cx={18} cy={5} r={3} /><Circle cx={6} cy={12} r={3} /><Circle cx={18} cy={19} r={3} />
            <Path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" />
          </Svg>
          <View className="flex-1 min-w-0">
            <Text className="text-sm font-semibold text-dark-text">Share my walk</Text>
            <Text className="text-[11px] text-gray-text">Send your live location link</Text>
          </View>
        </Pressable>

        <Pressable
          onPress={() => { onClose(); onShowSafePlaces(); }}
          className="flex-row items-center gap-3.5 w-full p-3.5 rounded-2xl bg-[#F6F6FA] border border-gray-border"
        >
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#2E7D32" strokeWidth={2}>
            <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
          </Svg>
          <View className="flex-1 min-w-0">
            <Text className="text-sm font-semibold text-dark-text">Find a safe place</Text>
            <Text className="text-[11px] text-gray-text">Police, hospitals, pharmacies nearby</Text>
          </View>
        </Pressable>

        <Pressable
          onPress={() => { onClose(); Linking.openURL('tel:911'); }}
          className="flex-row items-center gap-3.5 p-3.5 rounded-2xl"
          style={{ backgroundColor: '#FFF0F0', borderWidth: 1, borderColor: '#F5C6C6' }}
        >
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#A32D2D" strokeWidth={2}>
            <Path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3-8.6A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .3 2 .6 2.9a2 2 0 0 1-.5 2L8 9.8a16 16 0 0 0 6 6l1.2-1.2a2 2 0 0 1 2-.5c1 .3 2 .5 2.9.6a2 2 0 0 1 1.7 2Z" />
          </Svg>
          <View className="flex-1">
            <Text className="text-sm font-semibold text-status-danger">Call emergency services</Text>
            <Text className="text-[11px]" style={{ color: '#C54444' }}>Connects you to 911 directly</Text>
          </View>
        </Pressable>

        <Pressable
          onPress={() => { onClose(); onSOS(); }}
          className="flex-row items-center gap-3.5 p-3.5 rounded-2xl bg-sos"
        >
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2}>
            <Path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
            <Path d="M12 9v4" /><Path d="M12 17h.01" />
          </Svg>
          <View className="flex-1">
            <Text className="text-sm font-semibold text-white">Trigger SOS</Text>
            <Text className="text-[11px] text-white/80">Alerts all trusted contacts immediately</Text>
          </View>
        </Pressable>
      </View>
    </BottomSheet>
  );
}
