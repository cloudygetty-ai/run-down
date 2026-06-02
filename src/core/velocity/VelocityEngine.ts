import { HeatLevel } from '../../types/social';

// Thresholds map a 0–1 velocity score to a heat tier
const THRESHOLDS = { blazing: 0.85, hot: 0.6, warm: 0.25 };

export function computeHeatLevel(score: number): HeatLevel {
  if (score >= THRESHOLDS.blazing) return 'blazing';
  if (score >= THRESHOLDS.hot) return 'hot';
  if (score >= THRESHOLDS.warm) return 'warm';
  return 'cold';
}

export function computeVelocityScore(params: {
  interactionCount: number;
  msSinceLastInteraction: number;
  nearbyHighHeatUsers: number;
  isInFlashZone: boolean;
}): number {
  const { interactionCount, msSinceLastInteraction, nearbyHighHeatUsers, isInFlashZone } = params;

  // Score decays to 0 after 5 minutes of inactivity
  const decay = Math.max(0, 1 - msSinceLastInteraction / (5 * 60 * 1000));

  const interactionBase = Math.min(0.6, interactionCount * 0.1);
  const proximityBonus = Math.min(0.25, nearbyHighHeatUsers * 0.08);
  const zoneAmp = isInFlashZone ? 0.15 : 0;

  return Math.min(1.0, (interactionBase + proximityBonus + zoneAmp) * decay);
}

// Both users must be 'hot' or better AND within ~100 feet (30m) to trigger
export function shouldTriggerCollisionAlert(
  localScore: number,
  remoteScore: number,
  distanceMeters: number,
): boolean {
  return localScore >= THRESHOLDS.hot && remoteScore >= THRESHOLDS.hot && distanceMeters <= 30;
}

// Returns a CSS hex colour interpolated from cool blue → gold based on score
export function heatColor(score: number): string {
  // cold = #00D4FF (cyan-blue), blazing = #FFD700 (gold)
  const r = Math.round(0 + score * 255);
  const g = Math.round(212 + score * (215 - 212));
  const b = Math.round(255 - score * 255);
  return `rgb(${r},${g},${b})`;
}

export function heatLevelColor(heat: HeatLevel): string {
  const map: Record<HeatLevel, string> = {
    cold: '#00D4FF',
    warm: '#B388FF',
    hot: '#FF006E',
    blazing: '#FFD700',
  };
  return map[heat];
}
