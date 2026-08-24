import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import Svg, { Circle, Path } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { useWalkStore } from '../../store/walkStore';
import { MapView } from '../../components/map/MapView';
import { formatNavDistance, formatNavDuration } from '../../services/navigation';

export default function WalkConfirm() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { walk, startWalk, routeCoords, destinationCoords, routeDurationSeconds } = useWalkStore();
  const [starting, setStarting] = useState(false);

  const handleStart = async () => {
    if (!user || starting) return;
    setStarting(true);
    const { data: session, error } = await supabase
      .from('walk_sessions')
      .insert({ user_id: user.id, destination: walk.destination })
      .select()
      .single();
    if (error || !session) {
      Toast.show({ type: 'error', text1: "Couldn't start walk. Try again." });
      setStarting(false);
      return;
    }
    startWalk(session.id, session.share_token);
    router.replace('/home');
  };

  return (
    <View className="flex-1 bg-[#EEF1F6]">
      <MapView
        location={walk.currentLocation}
        routeCoords={routeCoords}
        destinationCoords={destinationCoords}
        isActive={false}
        followUser={false}
      />

      <View className="absolute left-0 right-0 flex-row items-center justify-between px-4" style={{ top: insets.top + 12 }}>
        <Pressable
          onPress={() => router.back()}
          accessibilityLabel="Cancel"
          className="w-11 h-11 rounded-full bg-white items-center justify-center"
          style={{ shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 4 }}
        >
          <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#1A1A28" strokeWidth={2.5}>
            <Path d="M18 6 6 18M6 6l12 12" />
          </Svg>
        </Pressable>
      </View>

      <View
        className="absolute left-0 right-0 bottom-0 bg-white px-5"
        style={{
          borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 20, paddingBottom: insets.bottom + 20,
          shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 24, shadowOffset: { width: 0, height: -6 }, elevation: 10,
        }}
      >
        <View className="flex-row items-center gap-3 mb-5">
          <View className="w-10 h-10 rounded-full bg-purple-50 items-center justify-center">
            <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#534AB7" strokeWidth={2.2}>
              <Path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><Circle cx={12} cy={10} r={3} />
            </Svg>
          </View>
          <View className="flex-1 min-w-0">
            <Text className="text-[11px] text-gray-text font-medium">Walking to</Text>
            <Text className="text-base font-bold text-dark-text" numberOfLines={2}>{walk.destination ?? 'Destination'}</Text>
          </View>
        </View>

        <View className="flex-row bg-[#F6F6FA] rounded-2xl overflow-hidden border border-[#EDEDF2] mb-5">
          <View className="flex-1 items-center py-3.5">
            <Text className="text-xl font-bold text-dark-text leading-none">{formatNavDistance(walk.distanceMeters)}</Text>
            <Text className="text-[10px] text-[#999AAA] font-medium mt-1">DISTANCE</Text>
          </View>
          <View className="flex-1 items-center py-3.5" style={{ borderLeftWidth: 1, borderLeftColor: '#E4E4ED' }}>
            <Text className="text-xl font-bold text-dark-text leading-none">
              {routeDurationSeconds != null ? formatNavDuration(routeDurationSeconds) : '—'}
            </Text>
            <Text className="text-[10px] text-[#999AAA] font-medium mt-1">ETA</Text>
          </View>
        </View>

        <Pressable
          onPress={handleStart}
          disabled={starting}
          className="w-full h-[54px] rounded-2xl items-center justify-center overflow-hidden"
          style={{ opacity: starting ? 0.7 : 1 }}
        >
          <LinearGradient colors={['#7F77DD', '#534AB7']} style={{ position: 'absolute', inset: 0 }} />
          <Text className="text-white font-bold text-base">{starting ? 'Starting…' : 'Start walk'}</Text>
        </Pressable>
      </View>
    </View>
  );
}
