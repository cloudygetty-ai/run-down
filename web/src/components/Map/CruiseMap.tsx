import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import type { Map as MLMap, Marker } from 'maplibre-gl';
import { useMapStore } from '../../store/map.store';
import type { Cruiser, CruisingSpot, VehicleClass } from '../../types';

const MAP_STYLE = import.meta.env.VITE_MAP_STYLE ||
  'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

const DEFAULT_CENTER: [number, number] = [-118.3650, 34.0520]; // Central LA
const DEFAULT_ZOOM = 12;

const CLASS_ICON: Record<VehicleClass, string> = {
  lowrider: '🚗',
  muscle:   '🏎',
  classic:  '🚘',
  truck:    '🛻',
  import:   '🚙',
  euro:     '🏁',
  suv:      '🚐',
};

const VIBE_ICON: Record<string, string> = {
  strip:    '🛣',
  meetup:   '📍',
  lookout:  '🔭',
  parking:  '🅿',
  'drive-in': '🎬',
  historic: '⭐',
};

function createCruiserEl(c: Cruiser): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'cruiser-marker';
  wrap.title = c.handle;

  const pulse = document.createElement('div');
  pulse.className = 'cruiser-pulse';
  pulse.style.backgroundColor = `${c.color}30`;
  pulse.style.border = `1.5px solid ${c.color}`;

  const dot = document.createElement('div');
  dot.className = 'cruiser-dot';
  dot.style.backgroundColor = c.color;
  dot.textContent = CLASS_ICON[c.vehicleClass] ?? '🚗';
  dot.style.fontSize = '10px';

  const arrow = document.createElement('div');
  arrow.className = 'cruiser-heading';
  arrow.style.borderBottomColor = c.color;

  wrap.appendChild(pulse);
  wrap.appendChild(dot);
  wrap.appendChild(arrow);
  return wrap;
}

function createSpotEl(s: CruisingSpot): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'spot-marker';

  const heatSize = 20 + s.activeCruisers * 3.5;
  const heatOpacity = s.vibeScore === 'lit' ? 0.8 :
                      s.vibeScore === 'active' ? 0.5 :
                      s.vibeScore === 'quiet' ? 0.3 : 0.15;

  for (let i = 0; i < (s.vibeScore === 'lit' ? 3 : s.vibeScore === 'active' ? 2 : 1); i++) {
    const ring = document.createElement('div');
    ring.className = 'spot-heat-ring';
    ring.style.width = `${heatSize}px`;
    ring.style.height = `${heatSize}px`;
    ring.style.top = `${-heatSize / 2 + 14}px`;
    ring.style.left = `${-heatSize / 2 + 14}px`;
    ring.style.opacity = String(heatOpacity);
    ring.style.borderColor = s.vibeScore === 'lit' ? '#F0C96A' : '#C9A84C';
    wrap.appendChild(ring);
  }

  const pin = document.createElement('div');
  pin.className = 'spot-pin';
  const pinColor = s.vibeScore === 'lit' ? '#C9A84C' :
                   s.vibeScore === 'active' ? '#7A6228' :
                   '#3D3548';
  pin.style.backgroundColor = pinColor;
  pin.style.boxShadow = s.vibeScore === 'lit' ? `0 0 12px ${pinColor}80` : 'none';

  const icon = document.createElement('span');
  icon.className = 'spot-pin-icon';
  icon.textContent = VIBE_ICON[s.category] ?? '📍';
  pin.appendChild(icon);
  wrap.appendChild(pin);
  return wrap;
}

export function CruiseMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const cruiserMarkersRef = useRef<Map<string, Marker>>(new Map());
  const spotMarkersRef = useRef<Map<string, Marker>>(new Map());

  const cruisers = useMapStore((s) => s.cruisers);
  const spots = useMapStore((s) => s.spots);
  const selectSpot = useMapStore((s) => s.selectSpot);
  const selectCruiser = useMapStore((s) => s.selectCruiser);

  // Initialize map
  useEffect(() => {
    if (!containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE,
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      pitchWithRotate: false,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');

    mapRef.current = map;

    return () => {
      cruiserMarkersRef.current.forEach((m) => m.remove());
      cruiserMarkersRef.current.clear();
      spotMarkersRef.current.forEach((m) => m.remove());
      spotMarkersRef.current.clear();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Sync spot markers (spots are static, only update activeCruisers counts)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.loaded()) {
      const onLoad = () => syncSpots();
      mapRef.current?.once('load', onLoad);
      return;
    }
    syncSpots();

    function syncSpots() {
      if (!mapRef.current) return;
      const m = mapRef.current;

      spots.forEach((spot) => {
        const existing = spotMarkersRef.current.get(spot.id);
        if (existing) return; // spots are static positions

        const el = createSpotEl(spot);
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          selectSpot(spot.id);
        });

        const marker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
          .setLngLat([spot.position.lng, spot.position.lat])
          .addTo(m);

        spotMarkersRef.current.set(spot.id, marker);
      });
    }
  }, [spots, selectSpot]);

  // Sync cruiser markers — runs on every tick
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const cruiserList = Object.values(cruisers);

    cruiserList.forEach((c) => {
      const existing = cruiserMarkersRef.current.get(c.id);
      if (existing) {
        existing.setLngLat([c.position.lng, c.position.lat]);
        // Rotate heading arrow via the wrap element's transform
        const el = existing.getElement();
        const arrow = el.querySelector('.cruiser-heading') as HTMLElement | null;
        if (arrow) arrow.style.transform = `translateX(-50%) rotate(${c.heading}deg)`;
      } else {
        if (!map.loaded()) return;

        const el = createCruiserEl(c);
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          selectCruiser(c.id);
        });

        const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
          .setLngLat([c.position.lng, c.position.lat])
          .addTo(map);

        cruiserMarkersRef.current.set(c.id, marker);
      }
    });

    // Remove stale markers
    cruiserMarkersRef.current.forEach((marker, id) => {
      if (!cruisers[id]) {
        marker.remove();
        cruiserMarkersRef.current.delete(id);
      }
    });
  }, [cruisers, selectCruiser]);

  return (
    <div
      ref={containerRef}
      style={{ position: 'absolute', inset: 0 }}
    />
  );
}
