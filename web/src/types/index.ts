export type Vec2 = { lat: number; lng: number };

// ── Reveal lifecycle ─────────────────────────────────────────────
export type RevealStatus = 'hidden' | 'liked' | 'matched' | 'blocked';

// ── User profile (only visible post-reveal) ──────────────────────
export type Tribe =
  | 'jock' | 'bear' | 'otter' | 'twink' | 'daddy' | 'masc' | 'femme' | 'other';

export type UserProfile = {
  displayName: string;
  age: number;
  tribe: Tribe;
  height: string;
  bio: string;
  lookingFor: string;
  gradientId: number; // 0–7, drives avatar color gradient
  verified: boolean;
};

// ── Nearby user (always present, profile gated by reveal) ─────────
export type NearbyUser = {
  id: string;
  position: Vec2;
  distanceFt: number;
  lastActive: number;
  pulseIntensity: number; // 0–1
  revealStatus: RevealStatus;
  profile: UserProfile | null; // null until matched
};

// ── Cruising spot ─────────────────────────────────────────────────
export type SpotType = 'bar' | 'park' | 'sauna' | 'beach' | 'venue' | 'social';

export type CruisingSpot = {
  id: string;
  name: string;
  type: SpotType;
  position: Vec2;
  activeCount: number;
  hasGroup: boolean;
  groupId: string | null;
  description: string;
};

// ── Group hangout ─────────────────────────────────────────────────
export type GroupVibe = 'cruising' | 'social' | 'party' | 'chill';

export type CruiseGroup = {
  id: string;
  spotId: string;
  spotName: string;
  vibe: GroupVibe;
  memberCount: number;
  maxMembers: number;
  isOpen: boolean;
  startedAt: number;
};

// ── Direct message / chat ─────────────────────────────────────────
export type Message = {
  id: string;
  senderId: string;
  text: string;
  timestamp: number;
  read: boolean;
};

export type Conversation = {
  id: string;
  partnerId: string;
  partnerProfile: UserProfile;
  messages: Message[];
  unreadCount: number;
  lastActivity: number;
};

// ── App navigation ────────────────────────────────────────────────
export type NavTab = 'map' | 'nearby' | 'chats' | 'profile';
export type CruiseMode = 'offline' | 'active';
