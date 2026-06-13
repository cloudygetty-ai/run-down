import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import type { Map as MLMap, Marker } from 'maplibre-gl';
import { useMapStore } from '../../store/map.store';
import { useUserStore } from '../../store/user.store';
import type { NearbyUser, CruisingSpot } from '../../types';
import { GRADIENTS } from '../../services/geo';
import { DEFAULT_CENTER } from '../../services/mock.service';

const MAP_STYLE =
  (import.meta.env.VITE_MAP_STYLE as string | undefined) ??
  'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

const SPOT_ICON: Record<string, string> = {
  bar:    '🍸',
  park:   '🌲',
  sauna:  '♨',
  beach:  '🏖',
  venue:  '⚡',
  social: '◈',
};

function createUserMarkerEl(u: NearbyUser): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = `user-marker ${u.revealStatus}`;

  const pulse = document.createElement('div');
  pulse.className = 'user-pulse';
  pulse.style.background = GRADIENTS[u.profile?.gradientId ?? 0].split(',')[1].trim();
  pulse.style.opacity = String(u.pulseIntensity * 0.4);

  const dot = document.createElement('div');
  dot.className = 'user-dot';
  dot.style.background =
    u.revealStatus === 'matched'
      ? GRADIENTS[u.profile?.gradientId ?? 0]
      : `rgba(139,92,246,${0.4 + u.pulseIntensity * 0.5})`;

  wrap.appendChild(pulse);
  wrap.appendChild(dot);
  return wrap;
}

function createSpotMarkerEl(s: CruisingSpot): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'spot-marker';

  const pin = document.createElement('div');
  pin.className = 'spot-pin';
  pin.style.backgroundColor = s.activeCount > 8 ? '#8B5CF6' : '#3D2A6E';
  if (s.activeCount > 8) pin.style.boxShadow = '0 0 10px rgba(139,92,246,0.5)';

  const icon = document.createElement('span');
  icon.className = 'spot-pin-icon';
  icon.textContent = SPOT_ICON[s.type] ?? '📍';
  pin.appendChild(icon);

  if (s.activeCount > 0) {
    const badge = document.createElement('div');
    badge.className = 'spot-active-badge';
    badge.textContent = String(s.activeCount);
    wrap.appendChild(badge);
  }

  wrap.appendChild(pin);
  return wrap;
}

function createMeMarkerEl(): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'me-marker';
  wrap.appendChild(Object.assign(document.createElement('div'), { className: 'me-pulse-ring' }));
  wrap.appendChild(Object.assign(document.createElement('div'), { className: 'me-pulse-ring' }));
  wrap.appendChild(Object.assign(document.createElement('div'), { className: 'me-dot' }));
  return wrap;
}

export function CruiseMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const userMarkersRef = useRef<Map<string, Marker>>(new Map());
  const spotMarkersRef = useRef<Map<string, Marker>>(new Map());
  const meMarkerRef = useRef<Marker | null>(null);

  const nearbyUsers = useMapStore((s) => s.nearbyUsers);
  const spots = useMapStore((s) => s.spots);
  const selectUser = useMapStore((s) => s.selectUser);
  const selectSpot = useMapStore((s) => s.selectSpot);
  const mode = useUserStore((s) => s.mode);

  // Init map
  useEffect(() => {
    if (!containerRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE,
      center: [DEFAULT_CENTER.lng, DEFAULT_CENTER.lat],
      zoom: 15,
      pitchWithRotate: false,
      attributionControl: false,
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');
    mapRef.current = map;
    return () => {
      userMarkersRef.current.forEach((m) => m.remove());
      spotMarkersRef.current.forEach((m) => m.remove());
      meMarkerRef.current?.remove();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Spot markers (static positions)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const render = () => {
      spots.forEach((spot) => {
        if (spotMarkersRef.current.has(spot.id)) return;
        const el = createSpotMarkerEl(spot);
        el.addEventListener('click', (e) => { e.stopPropagation(); selectSpot(spot.id); });
        const marker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
          .setLngLat([spot.position.lng, spot.position.lat])
          .addTo(map);
        spotMarkersRef.current.set(spot.id, marker);
      });
    };
    if (map.loaded()) render(); else map.once('load', render);
  }, [spots, selectSpot]);

  // User markers — re-runs on every store update
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.loaded()) return;

    Object.values(nearbyUsers).forEach((u) => {
      const existing = userMarkersRef.current.get(u.id);
      if (existing) {
        existing.setLngLat([u.position.lng, u.position.lat]);
        const el = existing.getElement();
        el.className = `user-marker ${u.revealStatus}`;
      } else {
        const el = createUserMarkerEl(u);
        el.addEventListener('click', (e) => { e.stopPropagation(); selectUser(u.id); });
        const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
          .setLngLat([u.position.lng, u.position.lat])
          .addTo(map);
        userMarkersRef.current.set(u.id, marker);
      }
    });

    userMarkersRef.current.forEach((marker, id) => {
      if (!nearbyUsers[id]) { marker.remove(); userMarkersRef.current.delete(id); }
    });
  }, [nearbyUsers, selectUser]);

  // My position marker
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.loaded()) return;
    if (mode === 'active' && !meMarkerRef.current) {
      const el = createMeMarkerEl();
      meMarkerRef.current = new maplibregl.Marker({ element: el, anchor: 'center' })
        .setLngLat([DEFAULT_CENTER.lng, DEFAULT_CENTER.lat])
        .addTo(map);
    } else if (mode === 'offline' && meMarkerRef.current) {
      meMarkerRef.current.remove();
      meMarkerRef.current = null;
    }
  }, [mode]);

  return <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />;
}
