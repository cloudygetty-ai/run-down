import { NearbyUser } from '../../types/social';

export function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6_371_000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function bearingTo(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const y = Math.sin(dLng) * Math.cos((lat2 * Math.PI) / 180);
  const x =
    Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
    Math.sin((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.cos(dLng);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

export function sortByProximity(users: NearbyUser[]): NearbyUser[] {
  return [...users].sort((a, b) => a.distance - b.distance);
}

// Returns 0–1; peaks at 0m, zero beyond 500m
export function computeProximityHum(nearestDistanceMeters: number): number {
  if (nearestDistanceMeters > 500) return 0;
  return Math.max(0, 1 - nearestDistanceMeters / 500);
}

// Returns 0–1 interference intensity; peaks at 0m, zero beyond 200m
export function computeGlitchIntensity(nearestHighCompatDistanceMeters: number): number {
  if (nearestHighCompatDistanceMeters > 200) return 0;
  return Math.max(0, 1 - nearestHighCompatDistanceMeters / 200);
}
