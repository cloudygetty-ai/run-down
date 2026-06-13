import type { Vec2 } from '../types';

const R_MILES = 3958.8;

export function haversineDistanceFt(a: Vec2, b: Vec2): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R_MILES * Math.asin(Math.sqrt(h)) * 5280;
}

export function formatDistance(ft: number): string {
  if (ft < 1000) return `${Math.round(ft / 10) * 10} ft`;
  return `${(ft / 5280).toFixed(1)} mi`;
}

export function timeAgo(ms: number): string {
  const secs = Math.floor((Date.now() - ms) / 1000);
  if (secs < 60) return 'just now';
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  return `${Math.floor(secs / 3600)}h ago`;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

// Gradient palette for anonymous user avatars (index 0–7)
export const GRADIENTS = [
  'linear-gradient(135deg, #8B5CF6, #EC4899)',
  'linear-gradient(135deg, #06B6D4, #8B5CF6)',
  'linear-gradient(135deg, #F59E0B, #EF4444)',
  'linear-gradient(135deg, #10B981, #06B6D4)',
  'linear-gradient(135deg, #EF4444, #8B5CF6)',
  'linear-gradient(135deg, #3B82F6, #10B981)',
  'linear-gradient(135deg, #F59E0B, #8B5CF6)',
  'linear-gradient(135deg, #EC4899, #F59E0B)',
];
