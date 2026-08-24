// RN port of the web app's Mapbox GL MapView — same props/behavior, rendered
// with react-native-maps (Apple Maps on iOS, Google Maps on Android).
//
// NOTE: Android requires a Google Maps API key (app.json → android.config.
// googleMaps.apiKey) or the basemap renders blank/gray behind the markers.

import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import RNMapView, { Marker, Polyline, Callout, type Region } from 'react-native-maps';
import Svg, { Path, Circle as SvgCircle } from 'react-native-svg';
import type { LatLng } from '../../types';
import type { SafePlace } from '../../services/safePlaces';
import { haversine } from '../../services/navigation';

const DEFAULT_CENTER = { latitude: 49.8951, longitude: -97.1384 }; // Winnipeg
const PREVIEW_ZOOM_DELTA = 0.02;
const ACTIVE_PITCH = 45;

function toLatLng(coord: [number, number]) {
  return { latitude: coord[1], longitude: coord[0] };
}

// ── User marker (pulsing halo + heading-rotated disc) ─────────────────────────
function UserMarker({ heading }: { heading?: number | null }) {
  // useState (not useRef) so reading .interpolate() during render doesn't
  // trip the "no ref access during render" rule — the Animated.Value itself
  // is still a stable, mutable instance across renders either way.
  const [pulse] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(pulse, { toValue: 1, duration: 2200, easing: Easing.out(Easing.ease), useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const scale = pulse.interpolate({ inputRange: [0, 0.7, 1], outputRange: [0.6, 1.5, 1.5] });
  const opacity = pulse.interpolate({ inputRange: [0, 0.7, 1], outputRange: [0.7, 0, 0] });

  return (
    <View style={styles.userMarkerWrap}>
      <View style={styles.userAccuracyRing} />
      <Animated.View style={[styles.userHalo, { transform: [{ scale }], opacity }]} />
      <View style={[styles.userDisc, { transform: [{ rotate: `${heading ?? 0}deg` }] }]}>
        <Svg width={18} height={18} viewBox="0 0 18 18">
          <Path d="M9 2.5L13.5 13L9 10.5L4.5 13L9 2.5Z" fill="white" />
        </Svg>
      </View>
    </View>
  );
}

// ── Destination pin ────────────────────────────────────────────────────────────
function DestMarker() {
  return (
    <Svg width={32} height={42} viewBox="0 0 32 42">
      <Path d="M16 0C7.163 0 0 7.163 0 16C0 24.837 16 42 16 42C16 42 32 24.837 32 16C32 7.163 24.837 0 16 0Z" fill="#534AB7" />
      <SvgCircle cx={16} cy={16} r={7} fill="white" />
      <SvgCircle cx={16} cy={16} r={4} fill="#534AB7" />
    </Svg>
  );
}

// ── Safe place marker ──────────────────────────────────────────────────────────
const SAFE_PLACE_STYLE: Record<SafePlace['type'], { bg: string; label: string }> = {
  police: { bg: '#1565C0', label: 'P' },
  hospital: { bg: '#2E7D32', label: 'H' },
  pharmacy: { bg: '#00695C', label: 'Rx' },
};

function SafePlaceMarker({ type }: { type: SafePlace['type'] }) {
  const { bg, label } = SAFE_PLACE_STYLE[type];
  return (
    <View style={[styles.safePlaceMarker, { backgroundColor: bg }]}>
      <Text style={styles.safePlaceLabel}>{label}</Text>
    </View>
  );
}

interface MapViewProps {
  location: LatLng | null;
  heading?: number | null;
  routeCoords?: [number, number][] | null;
  destinationCoords?: [number, number] | null;
  safePlaces?: SafePlace[];
  isActive?: boolean;
  followUser?: boolean;
  onUserInteract?: () => void;
}

export function MapView({
  location,
  heading,
  routeCoords,
  destinationCoords,
  safePlaces = [],
  isActive = false,
  followUser = true,
  onUserInteract,
}: MapViewProps) {
  const mapRef = useRef<RNMapView>(null);
  const initialFlyRef = useRef(false);
  const prevIsActiveRef = useRef(isActive);
  const programmaticMoveRef = useRef(false);

  // ── Walk start / end camera ───────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (isActive && !prevIsActiveRef.current && location) {
      programmaticMoveRef.current = true;
      map?.animateCamera(
        { center: { latitude: location.lat, longitude: location.lng }, heading: heading ?? 0, pitch: ACTIVE_PITCH, zoom: 17 },
        { duration: 1400 },
      );
    } else if (!isActive && prevIsActiveRef.current) {
      programmaticMoveRef.current = true;
      map?.animateCamera({ heading: 0, pitch: 0, zoom: 15 }, { duration: 900 });
    }
    prevIsActiveRef.current = isActive;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  // ── Location update + follow ───────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !location) return;
    const center = { latitude: location.lat, longitude: location.lng };

    if (!initialFlyRef.current) {
      initialFlyRef.current = true;
      programmaticMoveRef.current = true;
      map.animateCamera({ center, zoom: 15 }, { duration: 1200 });
      return;
    }

    if (!followUser) return;

    programmaticMoveRef.current = true;
    if (isActive) {
      map.animateCamera({ center, zoom: 17, heading: heading ?? 0, pitch: ACTIVE_PITCH }, { duration: 500 });
    } else {
      map.animateCamera({ center, zoom: 15, heading: 0, pitch: 0 }, { duration: 600 });
    }
  }, [location, heading, followUser, isActive]);

  // ── Recenter when followUser becomes true ──────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!followUser || !map || !location) return;
    programmaticMoveRef.current = true;
    map.animateCamera(
      {
        center: { latitude: location.lat, longitude: location.lng },
        zoom: isActive ? 17 : 15,
        pitch: isActive ? ACTIVE_PITCH : 0,
        heading: isActive ? (heading ?? 0) : 0,
      },
      { duration: 900 },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [followUser]);

  // ── Fit route bounds when previewing (not walking) ─────────────────────────
  useEffect(() => {
    if (isActive || !routeCoords || routeCoords.length < 2) return;
    mapRef.current?.fitToCoordinates(routeCoords.map(toLatLng), {
      edgePadding: { top: 120, bottom: 260, left: 40, right: 40 },
      animated: true,
    });
  }, [routeCoords, isActive]);

  // ── Completed vs remaining route split ──────────────────────────────────────
  let remainingCoords = routeCoords ?? [];
  let completedCoords: [number, number][] = [];
  if (isActive && routeCoords && routeCoords.length > 1 && location) {
    const userPt: [number, number] = [location.lng, location.lat];
    let nearestIdx = 0;
    let nearestDist = Infinity;
    for (let i = 0; i < routeCoords.length; i++) {
      const d = haversine(userPt, routeCoords[i]);
      if (d < nearestDist) { nearestDist = d; nearestIdx = i; }
    }
    completedCoords = routeCoords.slice(0, nearestIdx + 1);
    remainingCoords = routeCoords.slice(nearestIdx);
  }

  const handleRegionChange = (_region: Region, details?: { isGesture?: boolean }) => {
    if (programmaticMoveRef.current) {
      programmaticMoveRef.current = false;
      return;
    }
    if (details?.isGesture && followUser) onUserInteract?.();
  };

  return (
    <RNMapView
      ref={mapRef}
      style={StyleSheet.absoluteFill}
      initialRegion={{
        ...DEFAULT_CENTER,
        latitudeDelta: PREVIEW_ZOOM_DELTA,
        longitudeDelta: PREVIEW_ZOOM_DELTA,
      }}
      onPanDrag={() => followUser && onUserInteract?.()}
      onRegionChangeComplete={handleRegionChange}
      showsUserLocation={false}
      showsMyLocationButton={false}
      showsCompass={false}
      toolbarEnabled={false}
      rotateEnabled
      pitchEnabled={isActive}
    >
      {location && (
        <Marker
          coordinate={{ latitude: location.lat, longitude: location.lng }}
          anchor={{ x: 0.5, y: 0.5 }}
          tracksViewChanges
        >
          <UserMarker heading={heading} />
        </Marker>
      )}

      {remainingCoords.length > 1 && (
        <>
          <Polyline coordinates={remainingCoords.map(toLatLng)} strokeColor="#ffffff" strokeWidth={10} lineJoin="round" lineCap="round" />
          <Polyline coordinates={remainingCoords.map(toLatLng)} strokeColor="#534AB7" strokeWidth={6} lineJoin="round" lineCap="round" />
        </>
      )}
      {completedCoords.length > 1 && (
        <>
          <Polyline coordinates={completedCoords.map(toLatLng)} strokeColor="#ffffff" strokeWidth={10} lineJoin="round" lineCap="round" />
          <Polyline coordinates={completedCoords.map(toLatLng)} strokeColor="#B8B8CC" strokeWidth={6} lineJoin="round" lineCap="round" />
        </>
      )}

      {destinationCoords && (
        <Marker coordinate={toLatLng(destinationCoords)} anchor={{ x: 0.5, y: 1 }} tracksViewChanges={false}>
          <DestMarker />
        </Marker>
      )}

      {safePlaces.map((place) => (
        <Marker key={place.id} coordinate={toLatLng(place.coords)} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={false}>
          <SafePlaceMarker type={place.type} />
          <Callout tooltip={false}>
            <View style={{ padding: 2, maxWidth: 200 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#1A1A28' }}>{place.name}</Text>
              <Text style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{place.address}</Text>
            </View>
          </Callout>
        </Marker>
      ))}
    </RNMapView>
  );
}

const styles = StyleSheet.create({
  userMarkerWrap: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  userAccuracyRing: { position: 'absolute', width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(66,133,244,0.10)' },
  userHalo: { position: 'absolute', width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(66,133,244,0.15)' },
  userDisc: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: '#4285F4', borderWidth: 3, borderColor: 'white',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#4285F4', shadowOpacity: 0.45, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 4,
  },
  safePlaceMarker: {
    width: 34, height: 34, borderRadius: 17, borderWidth: 2.5, borderColor: 'white',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.28, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 3,
  },
  safePlaceLabel: { color: 'white', fontSize: 11, fontWeight: '700' },
});
