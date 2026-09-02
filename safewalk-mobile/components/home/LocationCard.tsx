import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Mapbox, { Camera, MapView as RNMapboxView } from '@rnmapbox/maps';
import type { LatLng } from '../../types';
import { reverseGeocode } from '../../services/directions';

const REGEOCODE_INTERVAL_MS = 45_000;

// Home's "you are here" glance card — a small, non-interactive map region.
// Deliberately its own lightweight MapView instance rather than the shared
// full-feature components/map/MapView.tsx: that component's route/nav/follow
// behavior belongs to the active-walk experience, while this card only ever
// needs a static muted map + a dot for "where am I right now". The dot is a
// fixed screen-center overlay (not a map marker) since the camera always
// keeps the user centered here.
export function LocationCard({ location }: { location: LatLng | null }) {
  const cameraRef = useRef<Camera>(null);
  const flownRef = useRef(false);
  const [label, setLabel] = useState<string | null>(null);
  const lastGeocodedRef = useRef<LatLng | null>(null);

  useEffect(() => {
    if (!location) return;
    if (!flownRef.current) {
      flownRef.current = true;
      cameraRef.current?.setCamera({ centerCoordinate: [location.lng, location.lat], zoomLevel: 16, animationDuration: 600 });
    }
  }, [location]);

  useEffect(() => {
    if (!location) return;
    const last = lastGeocodedRef.current;
    if (last) {
      const moved = Math.hypot(last.lat - location.lat, last.lng - location.lng);
      if (moved < 0.0003) return; // ~30m — avoid re-geocoding every GPS tick
    }
    lastGeocodedRef.current = location;
    reverseGeocode([location.lng, location.lat]).then((text) => {
      if (text) setLabel(text);
    });
    const id = setInterval(() => {
      if (!lastGeocodedRef.current) return;
      reverseGeocode([lastGeocodedRef.current.lng, lastGeocodedRef.current.lat]).then((text) => {
        if (text) setLabel(text);
      });
    }, REGEOCODE_INTERVAL_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location?.lat, location?.lng]);

  return (
    <View style={{ marginHorizontal: 20, marginTop: 18, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(0,0,0,.12)' }}>
      <View style={{ height: 150, backgroundColor: '#E9E7E2' }}>
        {location && (
          <RNMapboxView
            style={StyleSheet.absoluteFill}
            styleURL={Mapbox.StyleURL.Light}
            scrollEnabled={false}
            zoomEnabled={false}
            rotateEnabled={false}
            pitchEnabled={false}
            scaleBarEnabled={false}
            compassEnabled={false}
            logoPosition={{ bottom: 4, left: 4 }}
            attributionPosition={{ bottom: 4, left: 44 }}
          >
            <Camera
              ref={cameraRef}
              defaultSettings={{ centerCoordinate: [location.lng, location.lat], zoomLevel: 16 }}
            />
          </RNMapboxView>
        )}
        {/* accuracy halo + user dot, matching the route-motif user puck */}
        <View pointerEvents="none" style={styles.haloWrap}>
          <View style={styles.halo} />
          <View style={styles.dot} />
        </View>
      </View>
      <View style={{ backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 13 }}>
        <Text style={{ fontFamily: 'Archivo_400Regular', fontSize: 12.5, color: 'rgba(0,0,0,.6)' }} numberOfLines={1}>
          {label ?? 'Locating…'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  haloWrap: { position: 'absolute', left: '50%', top: '50%', marginLeft: -11, marginTop: -11, width: 22, height: 22, alignItems: 'center', justifyContent: 'center' },
  halo: { position: 'absolute', width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(10,10,10,.14)' },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#0A0A0A', borderWidth: 2.5, borderColor: '#fff' },
});
