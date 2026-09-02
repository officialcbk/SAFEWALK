import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { useWalkStore } from '../../store/walkStore';
import { MapView, type MapViewHandle } from '../../components/map/MapView';
import { BottomSheet } from '../../components/ui/BottomSheet';
import { ManeuverIcon } from '../../components/walk/ManeuverIcon';
import { useSettingsPrefs } from '../../components/account/SettingsPrefs';
import { formatNavDistance, formatNavDuration, formatStepDistance, humanizeInstruction } from '../../services/navigation';
import { formatArrivalClock } from '../../services/eta';
import { withTimeout } from '../../services/withTimeout';
import type { TrustedContact } from '../../types';

const CHECKIN_PRESETS = [3, 5, 10, 15];

function useContacts(userId: string | undefined) {
  return useQuery({
    queryKey: ['contacts', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from('trusted_contacts')
        .select('*')
        .eq('user_id', userId!)
        .order('created_at');
      return (data ?? []) as TrustedContact[];
    },
  });
}

export default function WalkConfirm() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const mapRef = useRef<MapViewHandle>(null);
  const hasPickedCheckInRef = useRef(false);
  const { prefs } = useSettingsPrefs();
  const {
    walk, startWalk, routeCoords, alternateRouteCoords, destinationCoords, destinationFullAddress,
    routeDurationSeconds, navSteps, setSharedContactIds, setCheckInIntervalSeconds,
  } = useWalkStore();
  const [starting, setStarting] = useState(false);
  const [pickedContactIds, setPickedContactIds] = useState<string[] | null>(null); // null until contacts load
  const [checkInMinutes, setCheckInMinutes] = useState(5);
  const [showSharePicker, setShowSharePicker] = useState(false);

  const contacts = useContacts(user?.id);
  const primaryContact = contacts.data?.find((c) => c.is_primary) ?? contacts.data?.[0];
  const effectiveContactIds = pickedContactIds ?? contacts.data?.map((c) => c.id) ?? [];

  const notifiedNames = (() => {
    if (!contacts.data?.length) return 'No one — add a trusted contact first';
    const names = contacts.data.filter((c) => effectiveContactIds.includes(c.id)).map((c) => c.full_name.split(' ')[0]);
    if (names.length === 0) return 'No one';
    if (names.length === 1) return `${names[0]} is`;
    if (names.length === 2) return `${names[0]} and ${names[1]} are`;
    return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]} are`;
  })();

  const shareLabel = (() => {
    if (!contacts.data?.length) return 'No contacts yet';
    if (effectiveContactIds.length === contacts.data.length) return 'Everyone';
    if (effectiveContactIds.length === 0) return 'No one';
    return contacts.data.filter((c) => effectiveContactIds.includes(c.id)).map((c) => c.full_name.split(' ')[0]).join(', ');
  })();

  const handleStart = async () => {
    if (!user || starting) return;
    setStarting(true);
    try {
      const { data: session, error } = await withTimeout(
        supabase
          .from('walk_sessions')
          .insert({
            user_id: user.id,
            destination: walk.destination,
            destination_address: destinationFullAddress,
            route_coords: routeCoords,
            destination_coords: destinationCoords,
          })
          .select()
          .single(),
        10000,
      );
      if (error || !session) {
        Toast.show({ type: 'error', text1: "Couldn't start walk. Try again." });
        return;
      }
      const allIds = contacts.data?.map((c) => c.id) ?? [];
      setSharedContactIds(effectiveContactIds.length === allIds.length ? null : effectiveContactIds);
      setCheckInIntervalSeconds(checkInMinutes * 60);
      startWalk(session.id, session.share_token);
      router.replace('/home');
    } catch {
      // A thrown network error (dropped signal, timeout) used to leave the
      // button stuck on "Starting…" forever, with `starting` blocking any
      // retry — this is the only path that guarantees it always resets.
      Toast.show({ type: 'error', text1: "Couldn't start walk.", text2: 'Check your connection and try again.' });
    } finally {
      setStarting(false);
    }
  };

  useEffect(() => {
    if (!hasPickedCheckInRef.current) {
      setCheckInMinutes(Number(prefs.checkinInterval));
    }
  }, [prefs.checkinInterval]);

  const arriveAt = routeDurationSeconds != null ? formatArrivalClock(routeDurationSeconds) : '—';
  const durationLabel = routeDurationSeconds != null ? formatNavDuration(routeDurationSeconds) : '—';

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 200 }}>
        {/* ── Route map (bounded, not full-bleed — this screen scrolls) ──── */}
        <View style={{ height: 300, backgroundColor: '#E9E7E2' }}>
          <MapView
            ref={mapRef}
            location={walk.currentLocation}
            routeCoords={routeCoords}
            alternateRouteCoords={alternateRouteCoords}
            destinationCoords={destinationCoords}
            destinationLabel={walk.destination}
            isActive={false}
            followUser={false}
          />
          <Pressable
            onPress={() => router.back()}
            accessibilityLabel="Back"
            style={{
              position: 'absolute', left: 16, top: insets.top + 12, width: 36, height: 36, borderRadius: 99,
              backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
              shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 4,
            }}
          >
            <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#0A0A0A" strokeWidth={2.5}>
              <Path d="M15 18 9 12l6-6" />
            </Svg>
          </Pressable>
        </View>

        <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
          {/* ── Route legend ─────────────────────────────────────────────── */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 }}>
            <View style={{ width: 14, height: 2, backgroundColor: '#0A0A0A' }} />
            <Text style={{ fontFamily: 'IBMPlexMono_500Medium', fontSize: 8.5, letterSpacing: 0.8, color: 'rgba(0,0,0,.4)' }}>YOUR ROUTE</Text>
            {!!alternateRouteCoords?.length && (
              <>
                <View style={{ width: 14, height: 2, backgroundColor: '#B8B8B0', marginLeft: 10 }} />
                <Text style={{ fontFamily: 'IBMPlexMono_500Medium', fontSize: 8.5, letterSpacing: 0.8, color: 'rgba(0,0,0,.4)' }}>ALTERNATE</Text>
              </>
            )}
          </View>

          {/* ── Walking to / Arrive ──────────────────────────────────────── */}
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ fontFamily: 'IBMPlexMono_500Medium', fontSize: 8.5, letterSpacing: 1.02, textTransform: 'uppercase', color: 'rgba(0,0,0,.42)' }}>
                Walking to
              </Text>
              <Text style={{ fontFamily: 'Archivo_700Bold', fontSize: 22, color: '#0A0A0A', marginTop: 5 }} numberOfLines={1}>
                {walk.destination ?? 'Destination'}
              </Text>
              {!!destinationFullAddress && (
                <Text style={{ fontFamily: 'Archivo_400Regular', fontSize: 12.5, color: 'rgba(0,0,0,.5)', marginTop: 2 }} numberOfLines={1}>
                  {destinationFullAddress}
                </Text>
              )}
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontFamily: 'IBMPlexMono_500Medium', fontSize: 8.5, letterSpacing: 1.02, textTransform: 'uppercase', color: 'rgba(0,0,0,.42)' }}>
                Arrive
              </Text>
              <Text style={{ fontFamily: 'Archivo_700Bold', fontSize: 22, color: '#0A0A0A', marginTop: 5 }}>{arriveAt}</Text>
            </View>
          </View>

          {/* ── Time / Distance ──────────────────────────────────────────── */}
          <View style={{ flexDirection: 'row', marginTop: 18, borderTopWidth: 1, borderBottomWidth: 1, borderColor: 'rgba(0,0,0,.1)' }}>
            {[
              { l: 'Time', v: durationLabel },
              { l: 'Distance', v: formatNavDistance(walk.distanceMeters) },
            ].map(({ l, v }, i) => (
              <View key={l} style={{ flex: 1, paddingVertical: 14, paddingLeft: i > 0 ? 14 : 0, borderLeftWidth: i > 0 ? 1 : 0, borderLeftColor: 'rgba(0,0,0,.1)' }}>
                <Text style={{ fontFamily: 'IBMPlexMono_500Medium', fontSize: 8, letterSpacing: 0.9, textTransform: 'uppercase', color: 'rgba(0,0,0,.42)' }}>{l}</Text>
                <Text style={{ fontFamily: 'Archivo_700Bold', fontSize: 18, color: '#0A0A0A', marginTop: 6 }}>{v}</Text>
              </View>
            ))}
          </View>

          {/* ── Check in every ───────────────────────────────────────────── */}
          <View style={{ marginTop: 22 }}>
            <Text style={{ fontFamily: 'IBMPlexMono_500Medium', fontSize: 8.5, letterSpacing: 1.02, textTransform: 'uppercase', color: 'rgba(0,0,0,.42)', marginBottom: 10 }}>
              Check in every
            </Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {CHECKIN_PRESETS.map((mins) => {
                const active = checkInMinutes === mins;
                return (
                  <Pressable
                    key={mins}
                    onPress={() => {
                      hasPickedCheckInRef.current = true;
                      setCheckInMinutes(mins);
                    }}
                    style={{
                      flex: 1, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
                      backgroundColor: active ? '#0A0A0A' : '#fff', borderWidth: 1, borderColor: active ? '#0A0A0A' : 'rgba(0,0,0,.15)',
                    }}
                  >
                    <Text style={{ fontFamily: 'Archivo_600SemiBold', fontSize: 13, color: active ? '#fff' : '#0A0A0A' }}>{mins} min</Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={{ fontFamily: 'Archivo_400Regular', fontSize: 12, color: 'rgba(0,0,0,.5)', marginTop: 10, lineHeight: 17 }}>
              Trayl asks if you&apos;re okay every {checkInMinutes} min. Miss two in a row and{' '}
              {primaryContact ? primaryContact.full_name.split(' ')[0] : 'your primary contact'} is called.
            </Text>
          </View>

          {/* ── Share with ───────────────────────────────────────────────── */}
          <Pressable
            onPress={() => setShowSharePicker(true)}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16, marginTop: 6, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,.08)' }}
          >
            <Text style={{ fontFamily: 'Archivo_400Regular', fontSize: 13.5, color: 'rgba(0,0,0,.6)' }}>Share with</Text>
            <Text style={{ fontFamily: 'Archivo_600SemiBold', fontSize: 13.5, color: '#0A0A0A' }} numberOfLines={1}>{shareLabel}</Text>
          </Pressable>

          {/* ── Directions ───────────────────────────────────────────────── */}
          {!!navSteps?.length && (
            <View style={{ marginTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,.08)', paddingTop: 16 }}>
              <Text style={{ fontFamily: 'IBMPlexMono_500Medium', fontSize: 8.5, letterSpacing: 1.02, textTransform: 'uppercase', color: 'rgba(0,0,0,.42)', marginBottom: 4 }}>
                Directions · {navSteps.length} steps
              </Text>
              {navSteps.map((step, i) => (
                <View
                  key={i}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: 'rgba(0,0,0,.06)' }}
                >
                  <View style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: '#F1F0ED', alignItems: 'center', justifyContent: 'center' }}>
                    <ManeuverIcon type={step.maneuverType} modifier={step.maneuverModifier} color="#0A0A0A" size={16} />
                  </View>
                  <Text style={{ flex: 1, fontFamily: 'Archivo_500Medium', fontSize: 13.5, color: '#0A0A0A' }} numberOfLines={1}>
                    {humanizeInstruction(step)}
                  </Text>
                  {step.distance > 0 && (
                    <Text style={{ fontFamily: 'Archivo_500Medium', fontSize: 12, color: 'rgba(0,0,0,.45)' }}>
                      {formatStepDistance(step.distance)}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* ── Start walk (fixed) ─────────────────────────────────────────── */}
      <View
        style={{
          position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#0A0A0A',
          paddingHorizontal: 20, paddingTop: 14, paddingBottom: insets.bottom + 14,
        }}
      >
        <Pressable
          onPress={handleStart}
          disabled={starting}
          style={{
            backgroundColor: '#fff', borderRadius: 16, height: 54, flexDirection: 'row', alignItems: 'center',
            justifyContent: 'space-between', paddingHorizontal: 20, opacity: starting ? 0.7 : 1,
          }}
        >
          <Text style={{ fontFamily: 'Archivo_700Bold', fontSize: 15, color: '#0A0A0A' }}>
            {starting ? 'Starting…' : 'Start walk'}
          </Text>
          {!starting && (
            <Text style={{ fontFamily: 'IBMPlexMono_500Medium', fontSize: 11, color: 'rgba(0,0,0,.5)' }}>
              {durationLabel.toUpperCase()} · {arriveAt}
            </Text>
          )}
        </Pressable>
        <Text style={{ fontFamily: 'Archivo_400Regular', fontSize: 11, color: 'rgba(255,255,255,.45)', textAlign: 'center', marginTop: 10 }}>
          {notifiedNames} notified when you start
        </Text>
      </View>

      {/* ── Share with picker ────────────────────────────────────────────── */}
      <BottomSheet isOpen={showSharePicker} onClose={() => setShowSharePicker(false)}>
        <Text style={{ fontFamily: 'Archivo_700Bold', fontSize: 17, color: '#0A0A0A', marginBottom: 4 }}>Share with</Text>
        <Text style={{ fontFamily: 'Archivo_400Regular', fontSize: 12.5, color: 'rgba(0,0,0,.5)', marginBottom: 16 }}>
          These contacts can watch this walk live.
        </Text>
        {contacts.data?.map((c) => {
          const active = effectiveContactIds.includes(c.id);
          return (
            <Pressable
              key={c.id}
              onPress={() => setPickedContactIds((prev) => {
                const cur = prev ?? contacts.data?.map((x) => x.id) ?? [];
                return active ? cur.filter((id) => id !== c.id) : [...cur, c.id];
              })}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,.06)' }}
            >
              <Text style={{ fontFamily: 'Archivo_500Medium', fontSize: 14.5, color: '#0A0A0A' }}>{c.full_name}</Text>
              <View style={{
                width: 22, height: 22, borderRadius: 6, alignItems: 'center', justifyContent: 'center',
                backgroundColor: active ? '#0A0A0A' : 'transparent', borderWidth: active ? 0 : 1.5, borderColor: 'rgba(0,0,0,.25)',
              }}>
                {active && <View style={{ width: 8, height: 4, borderLeftWidth: 2, borderBottomWidth: 2, borderColor: '#fff', transform: [{ rotate: '-45deg' }, { translateY: -1 }] }} />}
              </View>
            </Pressable>
          );
        })}
      </BottomSheet>
    </View>
  );
}
