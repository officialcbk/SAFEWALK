import { useCallback, useEffect, useRef, useState } from 'react';
import { Keyboard, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { useWalkStore } from '../../store/walkStore';
import {
  getDirections, newSearchSession, reverseGeocode, retrievePlace, searchOne, suggestPlaces,
  type PlaceSuggestion,
} from '../../services/directions';

interface Recent {
  key: string;
  name: string;
  sub: string;
}

// Real "recents" from past walks — the design doc's mocked list, backed by
// actual walk_sessions destinations instead of hardcoded copy.
function useRecentDestinations(userId: string | undefined) {
  return useQuery({
    queryKey: ['recent-destinations', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from('walk_sessions')
        .select('destination, started_at')
        .eq('user_id', userId!)
        .not('destination', 'is', null)
        .order('started_at', { ascending: false })
        .limit(20);
      const seen = new Set<string>();
      const recents: Recent[] = [];
      for (const row of data ?? []) {
        const dest = row.destination as string | null;
        if (!dest || seen.has(dest)) continue;
        seen.add(dest);
        recents.push({ key: dest, name: dest.split(',')[0], sub: dest });
        if (recents.length >= 4) break;
      }
      return recents;
    },
  });
}

export default function Search() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const currentLocation = useWalkStore((s) => s.walk.currentLocation);
  const {
    setDestination, setDestinationCoords, setDestinationFullAddress, setRouteCoords, setNavSteps,
    setDistance, setRouteDurationSeconds, setAlternateRouteCoords,
  } = useWalkStore();
  const recents = useRecentDestinations(user?.id);

  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [activeField, setActiveField] = useState<'origin' | 'destination'>('destination');
  const [committingKey, setCommittingKey] = useState<string | null>(null);
  const suggestionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionTokenRef = useRef(newSearchSession());

  // "Your location" — autofills from GPS, but the user can edit/override it.
  const [originQuery, setOriginQuery] = useState('');
  const [originCoords, setOriginCoords] = useState<[number, number] | null>(null);
  const [originMapboxId, setOriginMapboxId] = useState<string | null>(null); // resolved lazily on commit
  const originEditedRef = useRef(false);
  // A single-line TextInput filled programmatically with a long address
  // otherwise leaves its cursor wherever it last was (the end, on Android),
  // which scrolls the field to show the tail of the address instead of the
  // start. Forcing the selection to 0 right after autofill scrolls it back
  // to the beginning; onSelectionChange immediately releases control so the
  // user can still tap/select/type normally afterward.
  const [originSelection, setOriginSelection] = useState<{ start: number; end: number } | undefined>(undefined);

  useEffect(() => {
    if (!currentLocation || originEditedRef.current) return;
    setOriginCoords([currentLocation.lng, currentLocation.lat]);
    reverseGeocode([currentLocation.lng, currentLocation.lat], { full: true }).then((text) => {
      if (text && !originEditedRef.current) {
        setOriginQuery(text);
        setOriginSelection({ start: 0, end: 0 });
      }
    });
  }, [currentLocation]);

  const fetchSuggestions = useCallback((value: string) => {
    if (suggestionTimer.current) clearTimeout(suggestionTimer.current);
    if (value.trim().length < 2) { setSuggestions([]); return; }
    suggestionTimer.current = setTimeout(async () => {
      const near = originCoords ?? (currentLocation ? ([currentLocation.lng, currentLocation.lat] as [number, number]) : undefined);
      const results = await suggestPlaces(value.trim(), sessionTokenRef.current, near);
      setSuggestions(results);
    }, 280);
  }, [originCoords, currentLocation]);

  // Resolve wherever we're starting from — GPS/edited coords already in hand,
  // or a picked origin suggestion that still needs its /retrieve call.
  const resolveOrigin = async (): Promise<[number, number] | null> => {
    if (originMapboxId) return retrievePlace(originMapboxId, sessionTokenRef.current);
    return originCoords;
  };

  const commit = async (key: string, name: string, resolveCenter: () => Promise<[number, number] | null>, fullAddress: string) => {
    setCommittingKey(key);
    try {
      const [origin, center] = await Promise.all([resolveOrigin(), resolveCenter()]);
      if (!origin) { Toast.show({ type: 'error', text1: 'Enable location to see your route.' }); return; }
      if (!center) { Toast.show({ type: 'error', text1: "Couldn't find that place anymore." }); return; }
      const result = await getDirections(origin, center);
      if (!result) { Toast.show({ type: 'error', text1: "Couldn't find a walking route there." }); return; }
      sessionTokenRef.current = newSearchSession(); // a session ends once you retrieve a result
      setDestination(name);
      setDestinationFullAddress(fullAddress);
      setDestinationCoords(center);
      setRouteCoords(result.geometry);
      setAlternateRouteCoords(result.alternateGeometry);
      setNavSteps(result.steps);
      setDistance(result.totalDistance);
      setRouteDurationSeconds(result.totalDuration);
      router.push('/walk-confirm');
    } finally {
      setCommittingKey(null);
    }
  };

  const pickSuggestion = (s: PlaceSuggestion) => {
    if (activeField === 'origin') {
      setOriginQuery(s.fullAddress);
      setOriginCoords(null);
      setOriginMapboxId(s.mapboxId);
      originEditedRef.current = true;
      setSuggestions([]);
      setActiveField('destination');
      return;
    }
    Keyboard.dismiss();
    setSuggestions([]);
    commit(s.mapboxId, s.name, () => retrievePlace(s.mapboxId, sessionTokenRef.current), s.fullAddress);
  };

  const pickRecent = (r: Recent) => {
    Keyboard.dismiss();
    const near = originCoords ?? (currentLocation ? ([currentLocation.lng, currentLocation.lat] as [number, number]) : undefined);
    commit(r.key, r.name, () => searchOne(r.sub, near), r.sub);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <StatusBar style="light" />
      <View style={{ backgroundColor: '#0A0A0A', paddingTop: insets.top + 8, paddingHorizontal: 20, paddingBottom: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <Pressable
            onPress={() => router.back()}
            style={{ width: 32, height: 32, borderRadius: 99, backgroundColor: 'rgba(255,255,255,.14)', alignItems: 'center', justifyContent: 'center' }}
          >
            <View style={{ width: 9, height: 9, borderLeftWidth: 2, borderBottomWidth: 2, borderColor: '#fff', transform: [{ rotate: '45deg' }], marginLeft: 2 }} />
          </Pressable>
          <Text style={{ fontFamily: 'Archivo_600SemiBold', fontSize: 16, letterSpacing: -0.32, color: '#fff' }}>Plan your walk</Text>
        </View>

        <View style={{ marginTop: 20, flexDirection: 'row', gap: 12, alignItems: 'stretch' }}>
          <View style={{ width: 10, alignItems: 'center', paddingVertical: 18 }}>
            <View style={{ width: 8, height: 8, borderRadius: 99, backgroundColor: '#fff' }} />
            <View style={{ flex: 1, justifyContent: 'space-evenly', alignItems: 'center', paddingVertical: 6 }}>
              <View style={{ width: 3, height: 3, borderRadius: 99, backgroundColor: 'rgba(255,255,255,.5)' }} />
              <View style={{ width: 3, height: 3, borderRadius: 99, backgroundColor: 'rgba(255,255,255,.5)' }} />
              <View style={{ width: 3, height: 3, borderRadius: 99, backgroundColor: 'rgba(255,255,255,.5)' }} />
            </View>
            <View style={{ width: 8, height: 8, backgroundColor: '#fff' }} />
          </View>
          <View style={{ flex: 1, gap: 8 }}>
            <View style={{ backgroundColor: 'rgba(255,255,255,.12)', borderRadius: 12, height: 46, justifyContent: 'center', paddingHorizontal: 15 }}>
              <Text style={{ fontFamily: 'IBMPlexMono_500Medium', fontSize: 8, letterSpacing: 1.1, textTransform: 'uppercase', color: 'rgba(255,255,255,.5)' }}>
                Your location
              </Text>
              <TextInput
                value={originQuery}
                selection={originSelection}
                onSelectionChange={() => setOriginSelection(undefined)}
                onFocus={() => setActiveField('origin')}
                onChangeText={(v) => {
                  setOriginQuery(v);
                  setOriginCoords(null);
                  setOriginMapboxId(null);
                  originEditedRef.current = true;
                  fetchSuggestions(v);
                }}
                placeholder="Locating…"
                placeholderTextColor="rgba(255,255,255,.4)"
                cursorColor="#fff"
                style={{ fontFamily: 'Archivo_600SemiBold', fontSize: 13.5, color: '#fff', marginTop: 5, padding: 0 }}
              />
            </View>
            <View style={{ backgroundColor: '#fff', borderRadius: 12, height: 50, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15 }}>
              <TextInput
                autoFocus
                value={query}
                onFocus={() => setActiveField('destination')}
                onChangeText={(v) => { setQuery(v); fetchSuggestions(v); }}
                placeholder="Enter a destination"
                placeholderTextColor="rgba(0,0,0,.4)"
                cursorColor="#0A0A0A"
                editable={!committingKey}
                style={{ flex: 1, fontFamily: 'Archivo_600SemiBold', fontSize: 15, color: '#0A0A0A' }}
              />
            </View>
          </View>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 4 }} keyboardShouldPersistTaps="handled">
        {suggestions.length > 0
          ? suggestions.map((s, i) => (
              <Pressable
                key={s.mapboxId}
                onPress={() => pickSuggestion(s)}
                disabled={!!committingKey}
                style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 14, paddingVertical: 15, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: 'rgba(0,0,0,.08)', opacity: committingKey && committingKey !== s.mapboxId ? 0.5 : 1 }}
              >
                <View style={{ width: 34, height: 34, borderRadius: 9, backgroundColor: '#F1F0ED', alignItems: 'center', justifyContent: 'center' }}>
                  <View style={{ width: 10, height: 10, borderRadius: 99, borderWidth: 2, borderColor: '#0A0A0A' }} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ fontFamily: 'Archivo_600SemiBold', fontSize: 14.5, color: '#0A0A0A' }} numberOfLines={1}>{s.name}</Text>
                  <Text style={{ fontFamily: 'Archivo_400Regular', fontSize: 12, color: 'rgba(0,0,0,.5)', marginTop: 5 }} numberOfLines={1}>
                    {s.fullAddress}
                  </Text>
                </View>
              </Pressable>
            ))
          : activeField === 'destination' && recents.data?.map((r, i) => (
              <Pressable
                key={r.key}
                onPress={() => pickRecent(r)}
                disabled={!!committingKey}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 15, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: 'rgba(0,0,0,.08)', opacity: committingKey && committingKey !== r.key ? 0.5 : 1 }}
              >
                <View style={{ width: 34, height: 34, borderRadius: 9, backgroundColor: '#F1F0ED', alignItems: 'center', justifyContent: 'center' }}>
                  <View style={{ width: 11, height: 11, borderRadius: 99, backgroundColor: '#0A0A0A' }} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ fontFamily: 'Archivo_600SemiBold', fontSize: 14.5, color: '#0A0A0A' }} numberOfLines={1}>{r.name}</Text>
                  <Text style={{ fontFamily: 'Archivo_400Regular', fontSize: 12, color: 'rgba(0,0,0,.5)', marginTop: 5 }} numberOfLines={1}>{r.sub}</Text>
                </View>
              </Pressable>
            ))}
      </ScrollView>
    </View>
  );
}
