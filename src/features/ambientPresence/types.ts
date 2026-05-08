import { Vector2 } from '../../types';

// --- Presence ---

export type VibeGenre =
  | 'hip-hop'
  | 'techno'
  | 'electronic'
  | 'jazz'
  | 'soul'
  | 'r-n-b'
  | 'indie'
  | 'pop'
  | 'metal'
  | 'classical'
  | 'lo-fi'
  | 'afrobeats';

export type SilhouetteVariant = 'standing' | 'seated' | 'moving';

export type PresenceUser = {
  id: string;
  displayHandle: string;       // anonymized, e.g. "@shadow_42"
  position: Vector2;           // true world coordinates
  shadowOffset: Vector2;       // added to position on map — anonymizes exact location
  variant: SilhouetteVariant;
  vibeGenre: VibeGenre;
  vibeBpm: number;             // 60–180
  currentTrackTitle: string | null;
  interests: string[];         // surface pool for Mystery Box clues
  isRevealed: boolean;         // true during the 10-second Reveal Pulse window
};

// --- Reveal Pulse ---

export const REVEAL_INTERVAL_MS = 5 * 60 * 1000;  // 5 minutes between pulses
export const REVEAL_DURATION_MS = 10 * 1000;       // silhouettes sharpen for 10 seconds

export type RevealPulseState = {
  isActive: boolean;
  nextPulseAt: number;    // unix ms
  revealEndsAt: number;   // unix ms (only meaningful when isActive === true)
};

// --- Radio Radius ---

export const RADIO_RADIUS_UNITS = 300;   // world units — "tuning in" range
export const HARMONY_BPM_THRESHOLD = 15; // |bpmDelta| ≤ this triggers harmony notification

export type RadioMatch = {
  userId: string;
  distanceUnits: number;
  genreMatch: boolean;
  bpmDelta: number;          // absolute BPM difference
  trackTitle: string | null;
};

// --- Digital Drink ---

export type DigitalDrinkOffer = 'bar' | 'walk' | 'coffee' | 'rooftop';

export const OFFER_LABELS: Record<DigitalDrinkOffer, string> = {
  bar: 'A drink at the bar',
  walk: 'A 5-minute walk',
  coffee: 'A coffee',
  rooftop: 'Hit the rooftop',
};

// Token expires after one song — ~3.5 minutes
export const SONG_DURATION_MS = Math.round(3.5 * 60 * 1000);

export type DigitalDrinkStatus = 'pending' | 'accepted' | 'melted';

export type DigitalDrinkToken = {
  id: string;
  fromUserId: string;
  toUserId: string;
  offer: DigitalDrinkOffer;
  sentAt: number;       // unix ms
  expiresAt: number;    // sentAt + SONG_DURATION_MS
  status: DigitalDrinkStatus;
};

// --- Mystery Box ---

export const MYSTERY_INTERVAL_MS = 60 * 60 * 1000; // drop every hour
export const MYSTERY_DURATION_MS = 60 * 60 * 1000; // stays until next drop

export type MysteryClue = {
  id: string;
  text: string;
  droppedAt: number;    // unix ms
  expiresAt: number;    // droppedAt + MYSTERY_DURATION_MS
  radiusLabel: string;  // human-readable distance e.g. "500 feet"
};

// --- Top-level store state ---

export type AmbientPresenceState = {
  localUserId: string;
  users: PresenceUser[];
  revealPulse: RevealPulseState;
  nearbyRadioMatches: RadioMatch[];
  vibeMatchUserId: string | null;  // highest-scored AR target
  outgoingToken: DigitalDrinkToken | null;
  incomingToken: DigitalDrinkToken | null;
  activeMysteryClue: MysteryClue | null;
  isArMode: boolean;
};
