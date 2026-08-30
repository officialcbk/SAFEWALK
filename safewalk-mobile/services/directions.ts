// Mapbox Directions API — walking routing with turn-by-turn steps
// All coordinates are Mapbox convention: [lng, lat]

const token = () => process.env.EXPO_PUBLIC_MAPBOX_TOKEN as string;

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
  alternateGeometry: [number, number][] | null; // an alternate route line, if Mapbox found one
  // Full data for that alternate — not just its line — so the nav screen's
  // "try another route" control can actually switch to navigating it
  // (turn-by-turn included), not just recompute the same best route again.
  alternate: {
    geometry: [number, number][];
    steps: RouteStep[];
    totalDistance: number;
    totalDuration: number;
  } | null;
}

export async function getDirections(
  from: [number, number],  // [lng, lat]
  to: [number, number],    // [lng, lat]
): Promise<DirectionsResult | null> {
  try {
    const url =
      `https://api.mapbox.com/directions/v5/mapbox/walking/` +
      `${from[0]},${from[1]};${to[0]},${to[1]}` +
      `?steps=true&overview=full&geometries=geojson&language=en&alternatives=true` +
      `&access_token=${token()}`;

    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.routes?.length) return null;

    const toSteps = (leg: any): RouteStep[] => leg.steps.map((s: any) => ({
      instruction:       s.maneuver.instruction ?? '',
      name:              s.name ?? '',
      maneuverType:      s.maneuver.type ?? 'turn',
      maneuverModifier:  s.maneuver.modifier,
      bearingAfter:      s.maneuver.bearing_after,
      distance:          s.distance,
      duration:          s.duration,
      location:          s.maneuver.location as [number, number],
    }));

    const route = data.routes[0];
    const steps = toSteps(route.legs[0]);

    const altRoute = data.routes[1];
    const alternate = altRoute ? {
      geometry:      altRoute.geometry.coordinates as [number, number][],
      steps:         toSteps(altRoute.legs[0]),
      totalDistance: altRoute.distance,
      totalDuration: altRoute.duration,
    } : null;

    return {
      geometry:      route.geometry.coordinates as [number, number][],
      steps,
      totalDistance: route.distance,
      totalDuration: route.duration,
      alternateGeometry: alternate?.geometry ?? null,
      alternate,
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

// ─── Mapbox Search Box API — POI/landmark/business search ─────────────────
// Mapbox removed point-of-interest data from the legacy Geocoding v5 API
// (geocodeAddress/reverseGeocode above) — it now only resolves addresses and
// administrative places. Searching a business or landmark by name (e.g.
// "Tim Hortons", "City Hall") needs the newer Search Box API instead, which
// is a two-step flow: /suggest (list of candidates, no coordinates yet) then
// /retrieve (fetches one candidate's actual coordinates by its mapbox_id).

export interface PlaceSuggestion {
  mapboxId: string;
  name: string;          // e.g. "Tim Hortons"
  fullAddress: string;   // e.g. "123 Main St, Winnipeg, MB R3C 1A1, Canada"
}

/** A fresh opaque token to group one /suggest…/retrieve search session, per Mapbox's billing model. */
export function newSearchSession(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** Search for places by name — businesses, landmarks, schools — not just addresses. */
export async function suggestPlaces(
  query: string,
  sessionToken: string,
  proximity?: [number, number], // [lng, lat] — biases results toward here
): Promise<PlaceSuggestion[]> {
  try {
    const near = proximity ? `&proximity=${proximity[0]},${proximity[1]}` : '';
    const url =
      `https://api.mapbox.com/search/searchbox/v1/suggest?q=${encodeURIComponent(query)}` +
      `&session_token=${sessionToken}&access_token=${token()}&country=ca&language=en&limit=6${near}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.suggestions ?? [])
      // "brand" results are a category prompt (e.g. "Tim Hortons" the chain),
      // not an actual retrievable location — exclude them.
      .filter((s: any) => s.feature_type !== 'brand')
      .map((s: any) => ({
        mapboxId: s.mapbox_id,
        name: s.name,
        fullAddress: s.full_address ?? s.place_formatted ?? s.name,
      }));
  } catch {
    return [];
  }
}

/**
 * Resolve a plain name (e.g. a saved "Tim Hortons" recent, which carries no
 * mapbox_id) back to coordinates. geocodeAddress can't do this — it's the
 * legacy address-only API — so this runs a one-shot suggest→retrieve pass
 * through the Search Box API instead, biased toward `near` when given.
 */
export async function searchOne(name: string, near?: [number, number]): Promise<[number, number] | null> {
  const session = newSearchSession();
  const results = await suggestPlaces(name, session, near);
  if (!results.length) return null;
  return retrievePlace(results[0].mapboxId, session);
}

/** Resolve a suggestion (from suggestPlaces) to its actual coordinates. */
export async function retrievePlace(mapboxId: string, sessionToken: string): Promise<[number, number] | null> {
  try {
    const url =
      `https://api.mapbox.com/search/searchbox/v1/retrieve/${mapboxId}` +
      `?session_token=${sessionToken}&access_token=${token()}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    return data.features?.[0]?.geometry?.coordinates ?? null;
  } catch {
    return null;
  }
}

/**
 * Reverse-geocode a coordinate to a label. By default returns a short label
 * (cross-street / place name) for glance UI like the Home location card.
 * Pass `{ full: true }` for the complete street address (e.g. Search's
 * "Your location" field) instead of just the street name.
 */
export async function reverseGeocode(coord: [number, number], options?: { full?: boolean }): Promise<string | null> {
  try {
    const url =
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${coord[0]},${coord[1]}.json` +
      `?types=address,poi&limit=1&access_token=${token()}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.features?.length) return null;
    const f = data.features[0];
    return options?.full ? (f.place_name ?? f.text ?? null) : (f.text ?? f.place_name ?? null);
  } catch {
    return null;
  }
}
