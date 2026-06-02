import { FlashZone, FlashZoneStatus } from '../../types/social';

export const FLASH_ZONE_DURATION_MS = 15 * 60 * 1000; // 15 minutes
export const REVEAL_COUNTDOWN_START_MS = 10 * 1000; // 10-second reveal countdown

const LOCATION_POOL: Array<{ name: string; lat: number; lng: number }> = [
  { name: 'The Velvet Lounge', lat: 40.7484, lng: -73.9967 },
  { name: 'Central Park East', lat: 40.7829, lng: -73.9654 },
  { name: 'Neon District Corner', lat: 40.7549, lng: -73.984 },
  { name: 'Eclipse Rooftop Bar', lat: 40.758, lng: -73.9855 },
  { name: 'The Gravity Well', lat: 40.7614, lng: -73.9776 },
];

export function generateFlashZone(index = 0): FlashZone {
  const loc = LOCATION_POOL[index % LOCATION_POOL.length];
  return {
    id: `fz_${Date.now()}`,
    locationName: loc.name,
    position: { lat: loc.lat, lng: loc.lng },
    radiusMeters: 100,
    durationMs: FLASH_ZONE_DURATION_MS,
    startedAt: Date.now(),
    status: 'active',
    participantCount: Math.floor(Math.random() * 18) + 3,
    revealCountdownMs: REVEAL_COUNTDOWN_START_MS,
  };
}

export function tickFlashZone(zone: FlashZone, deltaMs: number): FlashZone {
  const remaining = zone.durationMs - (Date.now() - zone.startedAt);
  if (remaining <= 0) return { ...zone, status: 'expired' };

  const newRevealMs = Math.max(0, zone.revealCountdownMs - deltaMs);
  let newStatus: FlashZoneStatus = zone.status;

  if (zone.status === 'active' && newRevealMs <= 0) {
    newStatus = 'revealing';
  } else if (zone.status === 'revealing') {
    newStatus = 'revealed';
  }

  return { ...zone, revealCountdownMs: newRevealMs, status: newStatus };
}

export function getFlashZoneTimeRemaining(zone: FlashZone): number {
  return Math.max(0, zone.durationMs - (Date.now() - zone.startedAt));
}

export function formatCountdown(ms: number): string {
  const totalSec = Math.ceil(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
