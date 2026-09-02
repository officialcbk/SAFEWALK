// Trayl's map, rendered with the real Mapbox SDK (@rnmapbox/maps) — matching
// the web app's Mapbox-based renderer instead of react-native-maps/Google.
// Same external props as before, so home/walk-confirm/walk-summary don't need
// to change, only what's inside this file.

import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle as SvgCircle, Path as SvgPath } from 'react-native-svg';
import Mapbox, { Camera, MapView as RNMapboxView, PointAnnotation, ShapeSource, LineLayer } from '@rnmapbox/maps';
import type { LatLng } from '../../types';
import type { SafePlace } from '../../services/safePlaces';
import { haversine } from '../../services/navigation';

const DEFAULT_CENTER: [number, number] = [-97.1384, 49.8951]; // Winnipeg
const PREVIEW_ZOOM = 15;
// +0.81 zoom levels ≈ 75% more linear scale (Mapbox zoom is log2 — each +1
// level doubles the scale), per an explicit "zoom in 75% more" request.
const ACTIVE_ZOOM = 20.1;
const ACTIVE_PITCH = 60;
const MIN_ZOOM = 3;
const MAX_ZOOM = 22;

export interface MapViewHandle {
  zoomIn: () => void;
  zoomOut: () => void;
  recenterOnUser: () => void;
  /** Snap the camera back to north-up without changing center or zoom. */
  resetHeading: () => void;
  /** Bird's-eye fit to the whole route — the nav screen's "route overview" control. */
  showRouteOverview: () => void;
}

function lineString(coords: [number, number][]) {
  return { type: 'Feature' as const, geometry: { type: 'LineString' as const, coordinates: coords }, properties: {} };
}

// ── User puck. Preview: dot + ring + halo + a "You" tag. Active/live-nav: a
// polished two-tone disc — soft halo, white ring, black body, and a crisp
// SVG navigation-arrow chevron (not a CSS border-triangle) pointing heading. ─
function UserMarker({ active, labeled, heading }: { active: boolean; labeled?: boolean; heading?: number | null }) {
  if (active) {
    return (
      <View style={{ width: 120, height: 120, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ position: 'absolute', width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(10,10,10,.15)' }} />
        <View style={{
          width: 96, height: 96, borderRadius: 48, backgroundColor: '#fff',
          alignItems: 'center', justifyContent: 'center',
          shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 6,
        }}>
          <View style={{
            width: 84, height: 84, borderRadius: 42, backgroundColor: '#0A0A0A',
            alignItems: 'center', justifyContent: 'center', transform: [{ rotate: `${heading ?? 0}deg` }],
          }}>
            <Svg width={40} height={40} viewBox="0 0 24 24">
              <SvgPath d="M12 3 19.5 19 12 15.5 4.5 19Z" fill="#fff" />
            </Svg>
          </View>
        </View>
      </View>
    );
  }
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <View style={{ width: 22, height: 22, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ position: 'absolute', width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(10,10,10,.15)' }} />
        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#0A0A0A', borderWidth: 2.5, borderColor: '#fff' }} />
      </View>
      {labeled && (
        <View style={{ backgroundColor: '#0A0A0A', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3, marginLeft: 5 }}>
          <Text style={{ color: '#fff', fontSize: 10.5, fontWeight: '700' }}>You</Text>
        </View>
      )}
    </View>
  );
}

// ── Destination marker — the familiar Google-Maps-style teardrop pin (black,
// to stay within the app's monochrome palette instead of Google's red), with
// a white cutout circle at its head. The tip of the drop is the true
// coordinate, so callers anchor this near the bottom-center of its bounds. ──
function DestMarker({ label }: { label?: string | null }) {
  const pin = (
    <Svg width={34} height={34} viewBox="0 0 24 24">
      <SvgPath
        d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7Z"
        fill="#0A0A0A"
        stroke="#fff"
        strokeWidth={1}
      />
      <SvgCircle cx={12} cy={9} r={3} fill="#fff" />
    </Svg>
  );
  if (!label) return pin;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
      {pin}
      <View style={{ backgroundColor: '#0A0A0A', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3, marginLeft: 3, marginTop: 6, maxWidth: 160 }}>
        <Text style={{ color: '#fff', fontSize: 10.5, fontWeight: '700' }} numberOfLines={1}>{label}</Text>
      </View>
    </View>
  );
}

// ── Safe place marker ────────────────────────────────────────────────────────
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
  alternateRouteCoords?: [number, number][] | null;
  destinationCoords?: [number, number] | null;
  destinationLabel?: string | null;
  safePlaces?: SafePlace[];
  isActive?: boolean;
  followUser?: boolean;
  onUserInteract?: () => void;
  // Post-walk recap map (walk-summary): `routeCoords` still means the
  // planned route (drawn solid, same as a normal preview) and this new prop
  // carries the actual GPS trail, drawn as the dot-trail "walked" motif with
  // a start dot and a "stopped here" ring — both can be shown at once so you
  // can see where you actually ended up relative to where you were headed.
  summaryMode?: boolean;
  walkedPath?: [number, number][] | null;
}

export const MapView = forwardRef<MapViewHandle, MapViewProps>(function MapView({
  location,
  heading,
  routeCoords,
  alternateRouteCoords,
  destinationCoords,
  destinationLabel,
  safePlaces = [],
  isActive = false,
  followUser = true,
  onUserInteract,
  summaryMode = false,
  walkedPath,
}, ref) {
  const cameraRef = useRef<Camera | null>(null);
  // The native Camera view can take an extra render or two to actually attach
  // its ref after mount — any setCamera/fitBounds call issued before that
  // happens was silently no-op-ing (cameraRef.current?.x optional-chains
  // straight past a null ref), which is why the route-preview camera would
  // sometimes just never move: not a bad route or a bad location, a pure
  // mount-timing race. Queueing the call instead of dropping it means it
  // always eventually runs, the moment the ref actually attaches.
  const pendingCameraActionsRef = useRef<((cam: Camera) => void)[]>([]);
  const attachCameraRef = (instance: Camera | null) => {
    cameraRef.current = instance;
    if (instance && pendingCameraActionsRef.current.length) {
      const actions = pendingCameraActionsRef.current;
      pendingCameraActionsRef.current = [];
      actions.forEach((fn) => fn(instance));
    }
  };
  const withCamera = (fn: (cam: Camera) => void) => {
    if (cameraRef.current) fn(cameraRef.current);
    else pendingCameraActionsRef.current.push(fn);
  };
  const initialFlyRef = useRef(false);
  const zoomRef = useRef(isActive ? ACTIVE_ZOOM : PREVIEW_ZOOM);
  // Mapbox's onCameraChanged reports `gestures.isGestureActive` during our OWN
  // programmatic setCamera/fitBounds animations too, not just real touch-drag
  // — without this guard, the very flyTo that's supposed to center the map on
  // the walker at start immediately tripped onUserInteract and killed follow
  // mode, which is why the map never auto-centered and had to be dragged
  // into place by hand. Any setCamera call we issue marks a window (its own
  // duration + a buffer) during which a reported gesture is treated as an
  // artifact of that animation, not a real pan.
  const suppressUntilRef = useRef(0);
  const markProgrammatic = (durationMs: number) => {
    suppressUntilRef.current = Date.now() + durationMs + 400;
  };

  useImperativeHandle(ref, () => ({
    zoomIn: () => {
      zoomRef.current = Math.min(MAX_ZOOM, zoomRef.current + 1);
      markProgrammatic(250);
      withCamera((cam) => cam.setCamera({ zoomLevel: zoomRef.current, animationDuration: 250 }));
    },
    zoomOut: () => {
      zoomRef.current = Math.max(MIN_ZOOM, zoomRef.current - 1);
      markProgrammatic(250);
      withCamera((cam) => cam.setCamera({ zoomLevel: zoomRef.current, animationDuration: 250 }));
    },
    // For screens with no live-follow mechanism (e.g. the static Route Preview) —
    // just centers on the current location once, on demand.
    recenterOnUser: () => {
      if (!location) return;
      zoomRef.current = isActive ? ACTIVE_ZOOM : PREVIEW_ZOOM;
      markProgrammatic(600);
      withCamera((cam) => cam.setCamera({
        centerCoordinate: [location.lng, location.lat],
        zoomLevel: zoomRef.current,
        pitch: isActive ? ACTIVE_PITCH : 0,
        heading: isActive ? (heading ?? 0) : 0,
        animationDuration: 600,
      }));
    },
    resetHeading: () => {
      markProgrammatic(300);
      withCamera((cam) => cam.setCamera({ heading: 0, animationDuration: 300 }));
    },
    showRouteOverview: () => {
      if (!routeCoords || routeCoords.length < 2) return;
      let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
      for (const [lng, lat] of routeCoords) {
        if (lng < minLng) minLng = lng;
        if (lng > maxLng) maxLng = lng;
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
      }
      markProgrammatic(700);
      withCamera((cam) => {
        cam.setCamera({ pitch: 0, heading: 0, animationDuration: 300 });
        cam.fitBounds([maxLng, maxLat], [minLng, minLat], [140, 60, 260, 60], 700);
      });
    },
  }), [location, heading, isActive, routeCoords]);

  // Places the camera correctly for a screen that has just become ready:
  // fit-to-route for a preview with a route already known, otherwise fly to
  // the current location. Called on mount via the effect below, and AGAIN
  // whenever the native map reports it has (re)finished loading — Android can
  // legitimately tear down and recreate the map's GL surface shortly after a
  // cold start (a real OS lifecycle event, not just a mount-timing quirk),
  // which silently drops whatever camera position was set on the surface
  // that no longer exists. Re-applying on that signal makes the placement
  // self-healing instead of a one-shot bet on mount timing.
  const placeInitialCamera = () => {
    if (!location) return;
    if (!isActive && routeCoords && routeCoords.length >= 2) {
      let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
      for (const [lng, lat] of routeCoords) {
        if (lng < minLng) minLng = lng;
        if (lng > maxLng) maxLng = lng;
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
      }
      markProgrammatic(900);
      withCamera((cam) => cam.fitBounds([maxLng, maxLat], [minLng, minLat], [46, 34, 46, 34], 900));
      return;
    }
    zoomRef.current = isActive ? ACTIVE_ZOOM : PREVIEW_ZOOM;
    markProgrammatic(1200);
    withCamera((cam) => cam.setCamera({
      centerCoordinate: [location.lng, location.lat],
      zoomLevel: zoomRef.current,
      pitch: isActive ? ACTIVE_PITCH : 0,
      heading: isActive ? (heading ?? 0) : 0,
      animationDuration: 1200,
    }));
  };

  // ── Location update + follow ───────────────────────────────────────────────
  useEffect(() => {
    if (!location) return;
    const center: [number, number] = [location.lng, location.lat];

    // The active-walk MapView is only ever mounted once a walk is already
    // under way (home.tsx conditionally renders it), so there is no live
    // false→true transition to catch — the very first camera placement IS
    // the "walk start" camera, and must already carry the zoomed-in, tilted
    // active framing rather than the flatter preview one.
    if (!initialFlyRef.current) {
      initialFlyRef.current = true;
      // A preview map (walk-confirm) that already has a route mounts with
      // both `location` and `routeCoords` available at once, which used to
      // fire this fly-to-user camera move in the same tick as the separate
      // fit-route-bounds effect below — two competing setCamera calls racing
      // on mount, and whichever animation's completion order won varied by
      // route/tile-load timing, silently leaving some routes never actually
      // framed. Skip this move entirely and let the route-fit effect be the
      // only camera action in that case.
      if (!isActive && routeCoords && routeCoords.length >= 2) return;
      zoomRef.current = isActive ? ACTIVE_ZOOM : PREVIEW_ZOOM;
      markProgrammatic(1200);
      withCamera((cam) => cam.setCamera({
        centerCoordinate: center,
        zoomLevel: zoomRef.current,
        pitch: isActive ? ACTIVE_PITCH : 0,
        heading: isActive ? (heading ?? 0) : 0,
        animationDuration: 1200,
      }));
      return;
    }

    if (!followUser) return;

    if (isActive) {
      zoomRef.current = ACTIVE_ZOOM;
      markProgrammatic(500);
      withCamera((cam) => cam.setCamera({
        centerCoordinate: center, zoomLevel: ACTIVE_ZOOM, heading: heading ?? 0, pitch: ACTIVE_PITCH, animationDuration: 500,
      }));
    } else {
      zoomRef.current = PREVIEW_ZOOM;
      markProgrammatic(600);
      withCamera((cam) => cam.setCamera({ centerCoordinate: center, zoomLevel: PREVIEW_ZOOM, heading: 0, pitch: 0, animationDuration: 600 }));
    }
  }, [location, heading, followUser, isActive, routeCoords]);

  // ── Recenter when followUser becomes true ──────────────────────────────────
  useEffect(() => {
    if (!followUser || !location) return;
    zoomRef.current = isActive ? ACTIVE_ZOOM : PREVIEW_ZOOM;
    markProgrammatic(900);
    withCamera((cam) => cam.setCamera({
      centerCoordinate: [location.lng, location.lat],
      zoomLevel: zoomRef.current,
      pitch: isActive ? ACTIVE_PITCH : 0,
      heading: isActive ? (heading ?? 0) : 0,
      animationDuration: 900,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [followUser]);

  // ── Fit route bounds when previewing (not walking) ─────────────────────────
  // Fits over the union of the planned route and the walked trail, so a
  // summary where the two diverge (ended early, went off-route) still frames
  // both instead of just whichever one this effect happened to look at.
  useEffect(() => {
    if (isActive) return;
    const points = [...(routeCoords ?? []), ...(walkedPath ?? [])];
    if (points.length < 2) return;
    let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
    for (const [lng, lat] of points) {
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    }
    markProgrammatic(900);
    withCamera((cam) => cam.fitBounds([maxLng, maxLat], [minLng, minLat], [46, 34, 46, 34], 900));
  }, [routeCoords, walkedPath, isActive]);

  // ── Completed vs remaining route split ──────────────────────────────────────
  const { remainingGeoJSON, completedGeoJSON } = useMemo(() => {
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
    return {
      remainingGeoJSON: remainingCoords.length > 1 ? lineString(remainingCoords) : null,
      completedGeoJSON: completedCoords.length > 1 ? lineString(completedCoords) : null,
    };
  }, [routeCoords, isActive, location]);

  const alternateGeoJSON = useMemo(
    () => (!isActive && alternateRouteCoords && alternateRouteCoords.length > 1 ? lineString(alternateRouteCoords) : null),
    [alternateRouteCoords, isActive],
  );

  const walkedGeoJSON = useMemo(
    () => (summaryMode && walkedPath && walkedPath.length > 1 ? lineString(walkedPath) : null),
    [summaryMode, walkedPath],
  );

  return (
    <RNMapboxView
      style={StyleSheet.absoluteFill}
      styleURL={Mapbox.StyleURL.Light}
      scaleBarEnabled={false}
      compassEnabled={false}
      logoPosition={{ bottom: 8, left: 8 }}
      attributionPosition={{ bottom: 8, left: 76 }}
      onCameraChanged={(state) => {
        if (state.gestures.isGestureActive && followUser && Date.now() > suppressUntilRef.current) onUserInteract?.();
      }}
      onDidFinishLoadingMap={placeInitialCamera}
    >
      <Camera ref={attachCameraRef} defaultSettings={{ centerCoordinate: DEFAULT_CENTER, zoomLevel: PREVIEW_ZOOM }} />

      {/* Alternate route — thin gray, drawn under the chosen route */}
      {alternateGeoJSON && (
        <ShapeSource id="route-alternate" shape={alternateGeoJSON}>
          <LineLayer id="route-alternate-line" style={{ lineColor: '#B8B8B0', lineWidth: 3.5, lineJoin: 'round', lineCap: 'round' }} />
        </ShapeSource>
      )}

      {/* Route ahead / planned route — solid black line, per the route motif */}
      {remainingGeoJSON && (
        <ShapeSource id="route-remaining" shape={remainingGeoJSON}>
          <LineLayer id="route-remaining-casing" style={{ lineColor: '#ffffff', lineWidth: 9, lineJoin: 'round', lineCap: 'round' }} />
          <LineLayer id="route-remaining-line" style={{ lineColor: '#0A0A0A', lineWidth: 5, lineJoin: 'round', lineCap: 'round' }} aboveLayerID="route-remaining-casing" />
        </ShapeSource>
      )}
      {/* Summary mode — the actual walked GPS trail, dot-trail style, with a
          start dot and a "stopped here" ring distinct from the planned route */}
      {walkedGeoJSON && (
        <ShapeSource id="route-walked" shape={walkedGeoJSON}>
          <LineLayer id="route-walked-line" style={{ lineColor: '#0A0A0A', lineWidth: 7, lineCap: 'round', lineDasharray: [0.01, 1.6] }} />
        </ShapeSource>
      )}
      {summaryMode && walkedPath && walkedPath.length > 1 && (
        <>
          <PointAnnotation id="walk-start" coordinate={walkedPath[0]} anchor={{ x: 0.5, y: 0.5 }}>
            <View style={styles.walkStartMarker} />
          </PointAnnotation>
          <PointAnnotation id="walk-end" coordinate={walkedPath[walkedPath.length - 1]} anchor={{ x: 0.5, y: 0.5 }}>
            <View style={styles.walkEndMarker}><View style={styles.walkEndMarkerDot} /></View>
          </PointAnnotation>
        </>
      )}
      {/* Route walked — dot trail */}
      {completedGeoJSON && (
        <ShapeSource id="route-completed" shape={completedGeoJSON}>
          <LineLayer
            id="route-completed-line"
            style={{ lineColor: '#0A0A0A', lineWidth: 7, lineCap: 'round', lineDasharray: [0.01, 1.6] }}
          />
        </ShapeSource>
      )}

      {location && (
        <PointAnnotation
          id="user-location"
          coordinate={[location.lng, location.lat]}
          anchor={isActive ? { x: 0.5, y: 0.5 } : { x: 0.15, y: 0.5 }}
        >
          <UserMarker active={isActive} labeled={!isActive} heading={heading} />
        </PointAnnotation>
      )}

      {destinationCoords && (
        <PointAnnotation
          id="destination"
          coordinate={destinationCoords}
          // The pin's point (not its visual center) is the true coordinate —
          // anchor near the bottom of the glyph, shifted further down/left
          // when a name label is riding alongside it.
          anchor={!isActive && destinationLabel ? { x: 0.12, y: 0.75 } : { x: 0.5, y: 0.917 }}
        >
          <DestMarker label={!isActive ? destinationLabel : null} />
        </PointAnnotation>
      )}

      {safePlaces.map((place) => (
        <PointAnnotation key={place.id} id={`safe-place-${place.id}`} coordinate={place.coords} anchor={{ x: 0.5, y: 0.5 }} title={place.name}>
          <SafePlaceMarker type={place.type} />
        </PointAnnotation>
      ))}
    </RNMapboxView>
  );
});

const styles = StyleSheet.create({
  // Summary-mode trail endpoints — a solid dot where the walk began, and a
  // hollow ring around a dot where it ended ("you stopped here").
  walkStartMarker: {
    width: 14, height: 14, borderRadius: 7, backgroundColor: '#0A0A0A', borderWidth: 2.5, borderColor: '#fff',
    shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 3,
  },
  walkEndMarker: {
    width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: '#0A0A0A', borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,.6)',
  },
  walkEndMarkerDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#0A0A0A' },
  safePlaceMarker: {
    width: 34, height: 34, borderRadius: 17, borderWidth: 2.5, borderColor: 'white',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.28, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 3,
  },
  safePlaceLabel: { color: 'white', fontSize: 11, fontWeight: '700' },
});
