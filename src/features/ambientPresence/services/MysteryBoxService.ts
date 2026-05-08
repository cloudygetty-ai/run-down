import { PresenceUser, MysteryClue, MYSTERY_DURATION_MS } from '../types';

type ClueTemplate = (interest: string, radius: string) => string;

const TEMPLATES: ClueTemplate[] = [
  (interest, radius) => `Someone within ${radius} is also into ${interest}.`,
  (interest, radius) => `Someone nearby just finished a project in ${interest}.`,
  (interest, radius) => `A ${interest} enthusiast is within ${radius}.`,
  (interest, radius) => `Someone ${radius} away shares your passion for ${interest}.`,
];

const RADIUS_LABELS = ['100 feet', '250 feet', '500 feet'];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function makeClueId(): string {
  return `clue_${Date.now().toString(36)}`;
}

// Selects a random nearby user, picks one of their interests, and wraps it
// in a mystery clue string. Returns null when no eligible candidates exist.
export function generateClue(
  users: PresenceUser[],
  localUserId: string,
): MysteryClue | null {
  const candidates = users.filter((u) => u.id !== localUserId && u.interests.length > 0);
  if (candidates.length === 0) return null;

  const target   = pick(candidates);
  const interest = pick(target.interests);
  const radius   = pick(RADIUS_LABELS);
  const text     = pick(TEMPLATES)(interest, radius);
  const now      = Date.now();

  return {
    id: makeClueId(),
    text,
    droppedAt: now,
    expiresAt: now + MYSTERY_DURATION_MS,
    radiusLabel: radius,
  };
}
