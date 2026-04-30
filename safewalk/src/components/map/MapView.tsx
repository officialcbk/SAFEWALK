import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import type { LatLng } from '../../types';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN as string;

// Default: Winnipeg, MB
const DEFAULT_CENTER: [number, number] = [-97.1384, 49.8951];

interface MapViewProps {
  location: LatLng | null;
  routeCoords?: [number, number][] | null;
  destinationCoords?: [number, number] | null;
  isActive?: boolean;
}

export function MapView({ location, routeCoords, destinationCoords, isActive }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<mapboxgl.Map | null>(null);
  const markerRef    = useRef<mapboxgl.Marker | null>(null);
  const pulse1Ref    = useRef<mapboxgl.Marker | null>(null);
  const pulse2Ref    = useRef<mapboxgl.Marker | null>(null);
  const destMarkerRef = useRef<mapboxgl.Marker | null>(null);

  // Init map
  useEffect(() => {
    if (!containerRef.current) return;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: location ? [location.lng, location.lat] : DEFAULT_CENTER,
      zoom: 15,
      attributionControl: false,
    });

    map.addControl(new mapboxgl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: false,
      showUserHeading: false,
    }), 'bottom-right');

    mapRef.current = map;

    // User pin (purple circle)
    const pinEl = document.createElement('div');
    pinEl.style.cssText = `
      width:16px; height:16px; border-radius:50%;
      background:#7F77DD; border:2px solid #fff;
      box-shadow:0 0 0 0 #7F77DD66;
    `;
    markerRef.current = new mapboxgl.Marker({ element: pinEl }).setLngLat(
      location ? [location.lng, location.lat] : DEFAULT_CENTER
    ).addTo(map);

    // Pulse rings
    const makePulse = (size: number, delay: string) => {
      const el = document.createElement('div');
      el.style.cssText = `
        width:${size}px; height:${size}px; border-radius:50%;
        background:#7F77DD; opacity:0.4;
        animation:pin-pulse 2s ${delay} ease-out infinite;
        pointer-events:none;
      `;
      return new mapboxgl.Marker({ element: el, anchor: 'center' });
    };

    pulse1Ref.current = makePulse(32, '0s').setLngLat(DEFAULT_CENTER);
    pulse2Ref.current = makePulse(48, '0.4s').setLngLat(DEFAULT_CENTER);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Update user pin when location changes
  useEffect(() => {
    if (!mapRef.current || !location) return;
    const lngLat: [number, number] = [location.lng, location.lat];
    markerRef.current?.setLngLat(lngLat);
    pulse1Ref.current?.setLngLat(lngLat);
    pulse2Ref.current?.setLngLat(lngLat);

    if (isActive) {
      pulse1Ref.current?.addTo(mapRef.current);
      pulse2Ref.current?.addTo(mapRef.current);
      mapRef.current.easeTo({ center: lngLat, zoom: 16, duration: 600 });
    }
  }, [location, isActive]);

  // Draw route polyline
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const addRoute = () => {
      if (map.getSource('route')) {
        map.removeLayer('route-line');
        map.removeSource('route');
      }
      if (!routeCoords || routeCoords.length < 2) return;

      // routing.ts returns [lat, lng] — flip to [lng, lat] for Mapbox GeoJSON
      const lngLatCoords = routeCoords.map(([lat, lng]) => [lng, lat] as [number, number]);

      map.addSource('route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: lngLatCoords },
          properties: {},
        },
      });
      map.addLayer({
        id: 'route-line',
        type: 'line',
        source: 'route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '#7F77DD',
          'line-width': 3,
          'line-dasharray': [2, 1.5],
        },
      });

      // Fit bounds to route
      const bounds = lngLatCoords.reduce(
        (b, c) => b.extend(c as mapboxgl.LngLatLike),
        new mapboxgl.LngLatBounds(lngLatCoords[0], lngLatCoords[0])
      );
      map.fitBounds(bounds, { padding: 60, duration: 800 });
    };

    if (map.isStyleLoaded()) addRoute();
    else map.once('load', addRoute);
  }, [routeCoords]);

  // Destination marker
  useEffect(() => {
    if (!mapRef.current) return;
    destMarkerRef.current?.remove();
    if (!destinationCoords) return;

    const el = document.createElement('div');
    el.style.cssText = `
      width:12px; height:12px; border-radius:50%;
      background:#E24B4A; border:2px solid #fff;
    `;
    destMarkerRef.current = new mapboxgl.Marker({ element: el })
      .setLngLat(destinationCoords)
      .addTo(mapRef.current);
  }, [destinationCoords]);

  return (
    <div ref={containerRef} className="w-full h-full" aria-label="Live route map" />
  );
}
