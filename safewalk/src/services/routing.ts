// ─── Routing & geocoding service ─────────────────────────────────────────────
// Nominatim (OSM) for address → coordinates
// OSRM public API for walking route geometry + distance

export interface RouteResult {
  /** [lat, lng] polyline waypoints for Leaflet */
  waypoints: [number, number][];
  distanceMetres: number;
  durationSeconds: number;
  destinationCoords: [number, number];
}

/**
 * Convert a free-text address into GPS coordinates using Nominatim.
 * Returns null if the address is not found or the request fails.
 */
export async function geocodeAddress(query: string): Promise<[number, number] | null> {
  try {
    const params = new URLSearchParams({
      q: query,
      format: "json",
      limit: "1",
      addressdetails: "0",
    });
    const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
      headers: { "User-Agent": "SafeWalk/1.0" },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data) || !data.length) return null;
    return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
  } catch {
    return null;
  }
}

/**
 * Fetch a walking route between two GPS coordinates using the OSRM public API.
 * Returns null if the route cannot be computed.
 */
export async function getWalkingRoute(
  from: [number, number], // [lat, lng]
  to: [number, number]    // [lat, lng]
): Promise<RouteResult | null> {
  try {
    // OSRM expects [lng, lat] in the URL
    const url =
      `https://router.project-osrm.org/route/v1/foot/` +
      `${from[1]},${from[0]};${to[1]},${to[0]}` +
      `?overview=full&geometries=geojson`;

    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.code !== "Ok" || !data.routes?.length) return null;

    const route = data.routes[0];
    // OSRM returns [lng, lat] – flip to [lat, lng] for Leaflet
    const waypoints: [number, number][] = route.geometry.coordinates.map(
      ([lng, lat]: [number, number]) => [lat, lng]
    );

    return {
      waypoints,
      distanceMetres: route.distance,
      durationSeconds: route.duration,
      destinationCoords: to,
    };
  } catch {
    return null;
  }
}
