// Mapbox Directions API — walking routing with turn-by-turn steps
// All coordinates are Mapbox convention: [lng, lat]

const token = () => import.meta.env.VITE_MAPBOX_TOKEN as string;

export interface RouteStep {
  instruction: string;    // e.g. "Turn left onto Main St"
  name: string;           // street name (may be empty)
  maneuverType: string;   // "depart" | "turn" | "continue" | "arrive" | "roundabout" | …
  maneuverModifier?: string; // "left" | "right" | "slight left" | "uturn" | …
  bearingAfter?: number;  // heading out of this maneuver
  distance: number;       // metres for this step
  duration: number;       // seconds for this step
  location: [number, number]; // [lng, lat] — start of step
}

export interface DirectionsResult {
  geometry: [number, number][]; // [lng, lat][] full polyline
  steps: RouteStep[];
  totalDistance: number; // metres
  totalDuration: number; // seconds
}

export async function getDirections(
  from: [number, number],  // [lng, lat]
  to: [number, number],    // [lng, lat]
): Promise<DirectionsResult | null> {
  try {
    const url =
      `https://api.mapbox.com/directions/v5/mapbox/walking/` +
      `${from[0]},${from[1]};${to[0]},${to[1]}` +
      `?steps=true&overview=full&geometries=geojson&language=en` +
      `&access_token=${token()}`;

    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.routes?.length) return null;

    const route = data.routes[0];
    const leg   = route.legs[0];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const steps: RouteStep[] = leg.steps.map((s: any) => ({
      instruction:       s.maneuver.instruction ?? '',
      name:              s.name ?? '',
      maneuverType:      s.maneuver.type ?? 'turn',
      maneuverModifier:  s.maneuver.modifier,
      bearingAfter:      s.maneuver.bearing_after,
      distance:          s.distance,
      duration:          s.duration,
      location:          s.maneuver.location as [number, number],
    }));

    return {
      geometry:      route.geometry.coordinates as [number, number][],
      steps,
      totalDistance: route.distance,
      totalDuration: route.duration,
    };
  } catch {
    return null;
  }
}

/** Geocode a free-text address via Mapbox; returns [lng, lat] or null. */
export async function geocodeAddress(query: string): Promise<[number, number] | null> {
  try {
    const url =
      `https://api.mapbox.com/geocoding/v5/mapbox.places/` +
      `${encodeURIComponent(query)}.json?limit=1&access_token=${token()}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.features?.length) return null;
    return data.features[0].center as [number, number]; // [lng, lat]
  } catch {
    return null;
  }
}
