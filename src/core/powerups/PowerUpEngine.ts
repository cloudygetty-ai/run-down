import { PowerUp, PowerUpType } from '../../types/social';

const DURATIONS_MS: Record<PowerUpType, number> = {
  smoke_screen: Infinity, // persists until explicitly deactivated
  overclock: 10 * 60 * 1000, // 10-minute fame burst
};

export function activatePowerUp(type: PowerUpType): PowerUp {
  return { type, activatedAt: Date.now(), durationMs: DURATIONS_MS[type] };
}

export function isPowerUpActive(powerUp: PowerUp | null): boolean {
  if (!powerUp) return false;
  if (powerUp.durationMs === Infinity) return true;
  return Date.now() - powerUp.activatedAt < powerUp.durationMs;
}

export function getPowerUpRemainingMs(powerUp: PowerUp): number {
  if (powerUp.durationMs === Infinity) return Infinity;
  return Math.max(0, powerUp.durationMs - (Date.now() - powerUp.activatedAt));
}

export const POWERUP_META: Record<
  PowerUpType,
  { label: string; description: string; color: string }
> = {
  smoke_screen: {
    label: 'SMOKE SCREEN',
    description: 'Location hidden from all except Trust Key holders.',
    color: '#B388FF',
  },
  overclock: {
    label: 'OVERCLOCK',
    description: 'Profile pushed to top of every radar within 1 mile for 10 min.',
    color: '#FFD700',
  },
};
