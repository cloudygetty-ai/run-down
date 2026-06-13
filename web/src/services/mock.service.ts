import type { NearbyUser, CruisingSpot, CruiseGroup, UserProfile, Tribe, Vec2 } from '../types';
import { useMapStore } from '../store/map.store';
import { useChatStore } from '../store/chat.store';
import { haversineDistanceFt } from './geo';

// West Hollywood default center
export const DEFAULT_CENTER: Vec2 = { lat: 34.0902, lng: -118.3640 };

// ── WeHo cruising spots ──────────────────────────────────────────

export const INITIAL_SPOTS: CruisingSpot[] = [
  {
    id: 'abbey',
    name: 'The Abbey',
    type: 'bar',
    position: { lat: 34.0902, lng: -118.3665 },
    activeCount: 14,
    hasGroup: true,
    groupId: 'grp-abbey',
    description: 'WeHo institution. Always poppin\' on weekends.',
  },
  {
    id: 'mickys',
    name: "Micky's",
    type: 'bar',
    position: { lat: 34.0898, lng: -118.3648 },
    activeCount: 9,
    hasGroup: true,
    groupId: 'grp-mickys',
    description: 'Go-go boys, good vibes, great cruising.',
  },
  {
    id: 'weho-park',
    name: 'West Hollywood Park',
    type: 'park',
    position: { lat: 34.0912, lng: -118.3622 },
    activeCount: 6,
    hasGroup: false,
    groupId: null,
    description: 'Low-key. Benches by the east side after dark.',
  },
  {
    id: 'griffith',
    name: 'Griffith Park — East',
    type: 'park',
    position: { lat: 34.1322, lng: -118.2946 },
    activeCount: 11,
    hasGroup: true,
    groupId: 'grp-griffith',
    description: 'Classic. The trails past the carousel.',
  },
  {
    id: 'factory',
    name: 'The Factory',
    type: 'venue',
    position: { lat: 34.0905, lng: -118.3653 },
    activeCount: 7,
    hasGroup: false,
    groupId: null,
    description: 'Late night. Circuit crowd.',
  },
  {
    id: 'oil-can-harrys',
    name: "Oil Can Harry's",
    type: 'bar',
    position: { lat: 34.1604, lng: -118.3942 },
    activeCount: 4,
    hasGroup: false,
    groupId: null,
    description: 'Country western. Friendly crowd.',
  },
];

export const INITIAL_GROUPS: Record<string, CruiseGroup> = {
  'grp-abbey': {
    id: 'grp-abbey',
    spotId: 'abbey',
    spotName: 'The Abbey',
    vibe: 'social',
    memberCount: 8,
    maxMembers: 20,
    isOpen: true,
    startedAt: Date.now() - 45 * 60000,
  },
  'grp-mickys': {
    id: 'grp-mickys',
    spotId: 'mickys',
    spotName: "Micky's",
    vibe: 'cruising',
    memberCount: 5,
    maxMembers: 20,
    isOpen: true,
    startedAt: Date.now() - 22 * 60000,
  },
  'grp-griffith': {
    id: 'grp-griffith',
    spotId: 'griffith',
    spotName: 'Griffith Park — East',
    vibe: 'chill',
    memberCount: 6,
    maxMembers: 15,
    isOpen: true,
    startedAt: Date.now() - 90 * 60000,
  },
};

// ── Mock nearby user profiles ────────────────────────────────────

const MOCK_PROFILES: UserProfile[] = [
  { displayName: 'Marco',  age: 29, tribe: 'jock',  height: '6\'1"',  bio: 'Gym rat. DDF.',       lookingFor: 'Fun tonight',          gradientId: 0, verified: true,  hasVideo: true  },
  { displayName: 'Dario',  age: 34, tribe: 'bear',  height: '5\'10"', bio: 'Bearded. Friendly.',  lookingFor: 'Whatever feels right', gradientId: 1, verified: true,  hasVideo: false },
  { displayName: 'Eli',    age: 26, tribe: 'twink', height: '5\'9"',  bio: 'Down for anything.',  lookingFor: 'Company tonight',      gradientId: 2, verified: false, hasVideo: true  },
  { displayName: 'Rafael', age: 38, tribe: 'daddy', height: '6\'0"',  bio: 'Latin. Masc.',        lookingFor: 'NSA',                  gradientId: 3, verified: true,  hasVideo: true  },
  { displayName: 'Caden',  age: 23, tribe: 'otter', height: '5\'11"', bio: 'New in town.',        lookingFor: 'Explore',              gradientId: 4, verified: false, hasVideo: false },
  { displayName: 'Jordan', age: 31, tribe: 'masc',  height: '6\'2"',  bio: 'Discreet.',           lookingFor: 'Tonight only',         gradientId: 5, verified: true,  hasVideo: true  },
  { displayName: 'Theo',   age: 27, tribe: 'jock',  height: '5\'10"', bio: 'Hockey player.',      lookingFor: 'Fun',                  gradientId: 6, verified: true,  hasVideo: true  },
  { displayName: 'Marcus', age: 42, tribe: 'bear',  height: '6\'1"',  bio: 'Daddy energy.',       lookingFor: 'Anything',             gradientId: 7, verified: true,  hasVideo: true  },
  { displayName: 'Luca',   age: 25, tribe: 'femme', height: '5\'8"',  bio: 'Cute. Loud.',         lookingFor: 'Good time',            gradientId: 0, verified: false, hasVideo: false },
  { displayName: 'Dev',    age: 33, tribe: 'other', height: '5\'9"',  bio: 'Vers.',               lookingFor: 'See what happens',     gradientId: 1, verified: true,  hasVideo: true  },
  { displayName: 'Mateo',  age: 30, tribe: 'masc',  height: '5\'11"', bio: 'Pro athlete.',        lookingFor: 'Discreet',             gradientId: 2, verified: true,  hasVideo: true  },
  { displayName: 'Ash',    age: 24, tribe: 'twink', height: '5\'10"', bio: 'Artsy.',              lookingFor: 'Cute guys',            gradientId: 3, verified: false, hasVideo: false },
];

// User IDs that auto-match when you express interest (within a few seconds)
const AUTO_MATCH_IDS = new Set(['user-1', 'user-4', 'user-7']);
// Users pre-matched at app start (demo purposes)
const PRE_MATCHED_IDS = new Set(['user-0', 'user-3']);

function randomOffset(scale: number): number {
  return (Math.random() - 0.5) * scale;
}

function buildNearbyUser(idx: number): NearbyUser {
  const profile = MOCK_PROFILES[idx % MOCK_PROFILES.length];
  const position: Vec2 = {
    lat: DEFAULT_CENTER.lat + randomOffset(0.012),
    lng: DEFAULT_CENTER.lng + randomOffset(0.018),
  };
  const distanceFt = haversineDistanceFt(DEFAULT_CENTER, position);
  const id = `user-${idx}`;
  const isPreMatched = PRE_MATCHED_IDS.has(id);

  return {
    id,
    position,
    distanceFt,
    lastActive: Date.now() - Math.floor(Math.random() * 300000),
    pulseIntensity: 0.3 + Math.random() * 0.7,
    revealStatus: isPreMatched ? 'matched' : 'hidden',
    profile: isPreMatched ? profile : null,
  };
}

// ── Auto-reply messages ───────────────────────────────────────────

const AUTO_REPLIES = [
  'Hey 👋',
  'What\'s up?',
  'Looking tonight?',
  'You nearby?',
  'Cute profile 😏',
  'Come find me.',
  'Where are you?',
];

let autoReplyTimers: ReturnType<typeof setTimeout>[] = [];
let mainInterval: ReturnType<typeof setInterval> | null = null;

// ── Service API ───────────────────────────────────────────────────

export function startMockService(): () => void {
  const mapStore = useMapStore.getState();

  mapStore.setSpots(INITIAL_SPOTS);
  mapStore.setGroups(INITIAL_GROUPS);

  // Seed nearby users
  for (let i = 0; i < 12; i++) {
    mapStore.setUser(buildNearbyUser(i));
  }

  // Open pre-matched conversations
  PRE_MATCHED_IDS.forEach((id) => {
    const user = useMapStore.getState().nearbyUsers[id];
    if (user?.profile) {
      useChatStore.getState().openConversation(id, user.profile);
      useChatStore.getState().receiveMessage(`conv-${id}`, AUTO_REPLIES[0]);
    }
  });

  // Occasional drift (users slightly reposition)
  mainInterval = setInterval(() => {
    const { nearbyUsers } = useMapStore.getState();
    Object.values(nearbyUsers).forEach((u) => {
      if (Math.random() > 0.85) {
        useMapStore.getState().setUser({
          ...u,
          position: {
            lat: u.position.lat + randomOffset(0.0002),
            lng: u.position.lng + randomOffset(0.0003),
          },
          lastActive: Math.random() > 0.7 ? Date.now() : u.lastActive,
        });
      }
    });
  }, 3000);

  return () => {
    if (mainInterval) clearInterval(mainInterval);
    autoReplyTimers.forEach(clearTimeout);
    autoReplyTimers = [];
  };
}

// Called when the user expresses interest in someone
export function scheduleAutoMatch(userId: string): void {
  if (!AUTO_MATCH_IDS.has(userId)) return;

  const idx = parseInt(userId.replace('user-', ''), 10);
  const profile = MOCK_PROFILES[idx % MOCK_PROFILES.length];

  const t1 = setTimeout(() => {
    useMapStore.getState().confirmMatch(userId, profile);

    const convId = `conv-${userId}`;
    useChatStore.getState().openConversation(userId, profile);

    const t2 = setTimeout(() => {
      useChatStore.getState().receiveMessage(convId, AUTO_REPLIES[Math.floor(Math.random() * AUTO_REPLIES.length)]);
    }, 2500);

    autoReplyTimers.push(t2);
  }, 2000 + Math.random() * 2000);

  autoReplyTimers.push(t1);
}
