import { PresenceUser, RadioMatch, RADIO_RADIUS_UNITS } from '../types';
import { distance } from '../../../utils';

// Returns all users within RADIO_RADIUS_UNITS, sorted closest-first.
export function computeRadioMatches(
  localUser: PresenceUser,
  others: PresenceUser[],
): RadioMatch[] {
  const matches: RadioMatch[] = [];
  for (const u of others) {
    const dist = distance(localUser.position, u.position);
    if (dist > RADIO_RADIUS_UNITS) continue;
    matches.push({
      userId: u.id,
      distanceUnits: dist,
      genreMatch: u.vibeGenre === localUser.vibeGenre,
      bpmDelta: Math.abs(u.vibeBpm - localUser.vibeBpm),
      trackTitle: u.currentTrackTitle,
    });
  }
  return matches.sort((a, b) => a.distanceUnits - b.distanceUnits);
}

// Scores every other user on genre overlap, BPM proximity, and closeness.
// Returns the id of the strongest Vibe Match, or null when no candidates.
export function selectVibeMatch(
  localUser: PresenceUser,
  others: PresenceUser[],
): string | null {
  if (others.length === 0) return null;

  let bestId: string | null = null;
  let bestScore = -Infinity;

  for (const u of others) {
    const dist = distance(localUser.position, u.position);
    const genreScore  = u.vibeGenre === localUser.vibeGenre ? 40 : 0;
    const bpmScore    = Math.max(0, 30 - Math.abs(u.vibeBpm - localUser.vibeBpm));
    const distScore   = Math.max(0, 30 - dist / 10);
    const total = genreScore + bpmScore + distScore;
    if (total > bestScore) {
      bestScore = total;
      bestId = u.id;
    }
  }

  return bestId;
}
