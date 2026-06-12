import type { Vec2 } from '../types';

const R = 3958.8; // Earth radius in miles

export function haversineDistance(a: Vec2, b: Vec2): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function headingBetween(a: Vec2, b: Vec2): number {
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

export function interpolateVec2(a: Vec2, b: Vec2, t: number): Vec2 {
  return {
    lat: a.lat + (b.lat - a.lat) * t,
    lng: a.lng + (b.lng - a.lng) * t,
  };
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function formatMiles(miles: number): string {
  if (miles >= 1000) return `${(miles / 1000).toFixed(1)}k`;
  return miles.toFixed(0);
}

export function formatRep(rep: number): string {
  if (rep >= 1000) return `${(rep / 1000).toFixed(1)}k`;
  return rep.toString();
}

export function timeAgo(ms: number): string {
  const secs = Math.floor((Date.now() - ms) / 1000);
  if (secs < 60) return 'just now';
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  return `${Math.floor(secs / 3600)}h ago`;
}
