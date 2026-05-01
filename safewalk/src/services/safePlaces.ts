export interface SafePlace {
  id: string;
  name: string;
  type: 'police' | 'hospital' | 'pharmacy';
  coords: [number, number]; // [lng, lat]
  address: string;
}

const CATEGORIES: Array<{ query: string; type: SafePlace['type'] }> = [
  { query: 'police station', type: 'police'   },
  { query: 'hospital',       type: 'hospital' },
  { query: 'pharmacy',       type: 'pharmacy' },
];

export async function getNearbyPlaces(
  center: [number, number],
  token: string,
): Promise<SafePlace[]> {
  const seen = new Set<string>();
  const results: SafePlace[] = [];

  await Promise.all(
    CATEGORIES.map(async ({ query, type }) => {
      try {
        const [lng, lat] = center;
        const res = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json` +
          `?access_token=${token}&proximity=${lng},${lat}&types=poi&limit=3`,
        );
        if (!res.ok) return;
        const data = (await res.json()) as {
          features?: Array<{ id: string; text: string; place_name: string; center: [number, number] }>;
        };
        for (const f of data.features ?? []) {
          if (seen.has(f.id)) continue;
          seen.add(f.id);
          const address = f.place_name.startsWith(f.text + ', ')
            ? f.place_name.slice(f.text.length + 2)
            : f.place_name;
          results.push({ id: f.id, name: f.text, type, coords: f.center, address });
        }
      } catch { /* ignore */ }
    }),
  );

  return results;
}
