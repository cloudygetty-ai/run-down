// Social discovery types — gamified city-as-arena layer

export type HeatLevel = 'cold' | 'warm' | 'hot' | 'blazing';

export type VibeTicker = {
  genre: string; // e.g. "Techno", "Neo-Soul"
  mood: string; // 3-word descriptor e.g. "Seeking Something Real"
  bpm: number; // simulated BPM 60–180
};

export type NearbyUser = {
  id: string;
  distance: number; // simulated meters
  bearing: number; // 0–360 degrees from north
  heatLevel: HeatLevel;
  vibeTicker: VibeTicker;
  isIdentityRevealed: boolean;
  displayName: string | null; // only present after reveal
  accentColor: string; // color fingerprint
  dare: string | null; // social mission attached to this user
};

export type FlashZoneStatus =
  | 'active'
  | 'revealing' // identity countdown in progress
  | 'revealed' // shutter open — all identities shown
  | 'expired';

export type FlashZone = {
  id: string;
  locationName: string;
  position: { lat: number; lng: number };
  radiusMeters: number;
  durationMs: number;
  startedAt: number;
  status: FlashZoneStatus;
  participantCount: number;
  revealCountdownMs: number;
};

export type PowerUpType = 'smoke_screen' | 'overclock';

export type PowerUp = {
  type: PowerUpType;
  activatedAt: number;
  durationMs: number;
};

export type SocialUser = {
  id: string;
  displayName: string;
  accentColor: string;
  vibeTicker: VibeTicker;
  heatLevel: HeatLevel;
  dare: string;
  position: { lat: number; lng: number };
  trustKeys: string[]; // IDs that can see through smoke screen
};

export type GambitState = {
  lockedOnUserId: string | null;
  voiceNoteRecordingMs: number; // 0 = idle; >0 = recording duration so far
  voiceNoteExpiresAt: number | null;
  isListeningToNote: boolean;
  incomingNoteFrom: string | null;
  pendingDareText: string | null;
};

export type HotStreak = {
  interactionCount: number;
  lastInteractionAt: number;
  velocityScore: number; // 0.0–1.0
  heatLevel: HeatLevel;
  streakStartedAt: number;
};

export type CollisionAlert = {
  targetUserId: string;
  distanceMeters: number;
  countdownMs: number;
  isActive: boolean;
};

export type SocialPhase = 'hub' | 'social_hud' | 'ar_mode';

export type SocialState = {
  phase: SocialPhase;
  localUser: SocialUser;
  nearbyUsers: NearbyUser[];
  activeFlashZone: FlashZone | null;
  flashZoneNotification: string | null;
  hotStreak: HotStreak;
  collisionAlert: CollisionAlert | null;
  activePowerUp: PowerUp | null;
  gambit: GambitState;
  proximityHum: number; // 0.0–1.0 drives audio/visual feedback
  glitchIntensity: number; // 0.0–1.0 interference near high-compat match
  isARMode: boolean;
};
