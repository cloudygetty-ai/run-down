import { create } from 'zustand';
import {
  SocialState,
  SocialUser,
  NearbyUser,
  HeatLevel,
  VibeTicker,
  PowerUpType,
  CollisionAlert,
} from '../../types/social';
import {
  computeVelocityScore,
  computeHeatLevel,
  shouldTriggerCollisionAlert,
} from '../../core/velocity/VelocityEngine';
import {
  computeProximityHum,
  computeGlitchIntensity,
} from '../../core/proximity/ProximityDetector';
import { generateFlashZone, tickFlashZone } from '../../core/flashzone/FlashZoneManager';
import { activatePowerUp } from '../../core/powerups/PowerUpEngine';

// --- Simulation seed data ---

const GENRES = [
  'Hip-Hop',
  'Techno',
  'Afrobeats',
  'Jazz Fusion',
  'Dark Wave',
  'Neo-Soul',
  'Drum & Bass',
];
const MOODS = [
  'Seeking Something Real',
  'Electric Right Now',
  'Low Key Vibing',
  'On A Mission',
  'Feeling The Pull',
  'Lost And Found',
  'Beautifully Unhinged',
];
const DARES = [
  'Ask me for my favorite hip-hop deep cut.',
  'Tell me the last city you cried in.',
  "If you find me, ask me what I'm running from.",
  "Find me and I'll buy you one drink.",
  'Tell me something true in under 10 words.',
  'Ask me about the last song that broke me.',
];
const ACCENT_COLORS = ['#FF006E', '#39FF14', '#B388FF', '#00D4FF', '#FFD700', '#FF4500', '#00FF88'];
const DISPLAY_NAMES = [
  'Camille',
  'Elias',
  'Nadia',
  'Remy',
  'Sage',
  'Zuri',
  'Luca',
  'Mira',
  'Osei',
  'Vera',
];

function rnd<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function makeTicker(): VibeTicker {
  return { genre: rnd(GENRES), mood: rnd(MOODS), bpm: Math.floor(Math.random() * 120) + 60 };
}

function makeNearby(id: string, distance: number, heat: HeatLevel): NearbyUser {
  return {
    id,
    distance,
    bearing: Math.random() * 360,
    heatLevel: heat,
    vibeTicker: makeTicker(),
    isIdentityRevealed: false,
    displayName: null,
    accentColor: rnd(ACCENT_COLORS),
    dare: rnd(DARES),
  };
}

function buildSimulatedNearby(): NearbyUser[] {
  return [
    makeNearby('u1', 15, 'blazing'),
    makeNearby('u2', 42, 'hot'),
    makeNearby('u3', 87, 'hot'),
    makeNearby('u4', 130, 'warm'),
    makeNearby('u5', 210, 'warm'),
    makeNearby('u6', 340, 'cold'),
    makeNearby('u7', 420, 'cold'),
  ];
}

const LOCAL_USER: SocialUser = {
  id: 'local',
  displayName: 'You',
  accentColor: '#B388FF',
  vibeTicker: { genre: 'Dark Wave', mood: 'Electric Right Now', bpm: 128 },
  heatLevel: 'warm',
  dare: 'Ask me about the last city I disappeared in.',
  position: { lat: 40.7484, lng: -73.9967 },
  trustKeys: [],
};

function buildInitialSocial(): SocialState {
  return {
    phase: 'hub',
    localUser: LOCAL_USER,
    nearbyUsers: buildSimulatedNearby(),
    activeFlashZone: null,
    flashZoneNotification: null,
    hotStreak: {
      interactionCount: 0,
      lastInteractionAt: Date.now(),
      velocityScore: 0.15,
      heatLevel: 'warm',
      streakStartedAt: Date.now(),
    },
    collisionAlert: null,
    activePowerUp: null,
    gambit: {
      lockedOnUserId: null,
      voiceNoteRecordingMs: 0,
      voiceNoteExpiresAt: null,
      isListeningToNote: false,
      incomingNoteFrom: null,
      pendingDareText: null,
    },
    proximityHum: 0.3,
    glitchIntensity: 0.6,
    isARMode: false,
  };
}

// --- Store ---

type SocialStore = {
  social: SocialState;
  enterSocialMode: () => void;
  exitSocialMode: () => void;
  enterARMode: () => void;
  exitARMode: () => void;
  recordInteraction: (targetUserId: string) => void;
  triggerPowerUp: (type: PowerUpType) => void;
  deactivatePowerUp: () => void;
  triggerFlashZone: (zoneIndex?: number) => void;
  dismissFlashZone: () => void;
  lockOnUser: (userId: string) => void;
  unlockUser: () => void;
  startVoiceNote: () => void;
  stopVoiceNote: () => void;
  revealIdentity: (userId: string) => void;
  tick: (deltaMs: number) => void;
};

export const useSocialStore = create<SocialStore>((set, get) => ({
  social: buildInitialSocial(),

  enterSocialMode: () => set((s) => ({ social: { ...s.social, phase: 'social_hud' } })),

  exitSocialMode: () => set((s) => ({ social: { ...s.social, phase: 'hub', isARMode: false } })),

  enterARMode: () => set((s) => ({ social: { ...s.social, phase: 'ar_mode', isARMode: true } })),

  exitARMode: () => set((s) => ({ social: { ...s.social, phase: 'social_hud', isARMode: false } })),

  recordInteraction: (targetUserId: string) => {
    const { social } = get();
    const { hotStreak, nearbyUsers, activeFlashZone } = social;

    const newCount = hotStreak.interactionCount + 1;
    const nearbyHot = nearbyUsers.filter(
      (u) => u.heatLevel === 'hot' || u.heatLevel === 'blazing',
    ).length;

    const newScore = computeVelocityScore({
      interactionCount: newCount,
      msSinceLastInteraction: 0,
      nearbyHighHeatUsers: nearbyHot,
      isInFlashZone: activeFlashZone !== null,
    });
    const newHeat = computeHeatLevel(newScore);

    const target = nearbyUsers.find((u) => u.id === targetUserId);
    let collisionAlert: CollisionAlert | null = social.collisionAlert;
    if (target && shouldTriggerCollisionAlert(newScore, 0.8, target.distance)) {
      collisionAlert = {
        targetUserId,
        distanceMeters: target.distance,
        countdownMs: 5000,
        isActive: true,
      };
    }

    set((s) => ({
      social: {
        ...s.social,
        hotStreak: {
          ...hotStreak,
          interactionCount: newCount,
          lastInteractionAt: Date.now(),
          velocityScore: newScore,
          heatLevel: newHeat,
        },
        localUser: { ...s.social.localUser, heatLevel: newHeat },
        collisionAlert,
      },
    }));
  },

  triggerPowerUp: (type: PowerUpType) =>
    set((s) => ({ social: { ...s.social, activePowerUp: activatePowerUp(type) } })),

  deactivatePowerUp: () => set((s) => ({ social: { ...s.social, activePowerUp: null } })),

  triggerFlashZone: (zoneIndex = 0) => {
    const zone = generateFlashZone(zoneIndex);
    set((s) => ({
      social: {
        ...s.social,
        activeFlashZone: zone,
        flashZoneNotification: `THE DROP is active at ${zone.locationName}`,
      },
    }));
  },

  dismissFlashZone: () =>
    set((s) => ({
      social: { ...s.social, activeFlashZone: null, flashZoneNotification: null },
    })),

  lockOnUser: (userId: string) =>
    set((s) => ({
      social: { ...s.social, gambit: { ...s.social.gambit, lockedOnUserId: userId } },
    })),

  unlockUser: () =>
    set((s) => ({
      social: {
        ...s.social,
        gambit: { ...s.social.gambit, lockedOnUserId: null, pendingDareText: null },
      },
    })),

  startVoiceNote: () =>
    set((s) => ({
      social: { ...s.social, gambit: { ...s.social.gambit, voiceNoteRecordingMs: 1 } },
    })),

  stopVoiceNote: () => {
    const expiresAt = Date.now() + 10_000;
    set((s) => ({
      social: {
        ...s.social,
        gambit: { ...s.social.gambit, voiceNoteRecordingMs: 0, voiceNoteExpiresAt: expiresAt },
      },
    }));
  },

  revealIdentity: (userId: string) =>
    set((s) => ({
      social: {
        ...s.social,
        nearbyUsers: s.social.nearbyUsers.map((u) =>
          u.id === userId ? { ...u, isIdentityRevealed: true, displayName: rnd(DISPLAY_NAMES) } : u,
        ),
      },
    })),

  tick: (deltaMs: number) => {
    const { social } = get();

    // Drain collision alert countdown
    let { collisionAlert } = social;
    if (collisionAlert?.isActive) {
      const next = collisionAlert.countdownMs - deltaMs;
      collisionAlert = next <= 0 ? null : { ...collisionAlert, countdownMs: next };
    }

    // Drift nearby users to simulate live movement
    const nearbyUsers = social.nearbyUsers.map((u) => ({
      ...u,
      distance: Math.max(5, u.distance + (Math.random() - 0.52) * 2.5),
    }));

    const nearest = nearbyUsers[0];
    const proximityHum = nearest ? computeProximityHum(nearest.distance) : 0;
    const nearestHot = nearbyUsers.find((u) => u.heatLevel === 'hot' || u.heatLevel === 'blazing');
    const glitchIntensity = nearestHot ? computeGlitchIntensity(nearestHot.distance) : 0;

    // Velocity decay over time
    const { hotStreak } = social;
    const msSince = Date.now() - hotStreak.lastInteractionAt;
    const decayedScore = computeVelocityScore({
      interactionCount: hotStreak.interactionCount,
      msSinceLastInteraction: msSince,
      nearbyHighHeatUsers: nearbyUsers.filter(
        (u) => u.heatLevel === 'hot' || u.heatLevel === 'blazing',
      ).length,
      isInFlashZone: social.activeFlashZone !== null,
    });

    // Tick flash zone reveal countdown
    const activeFlashZone = social.activeFlashZone
      ? tickFlashZone(social.activeFlashZone, deltaMs)
      : null;

    // Expire flash zone
    const liveFlashZone = activeFlashZone?.status === 'expired' ? null : activeFlashZone;

    // Voice note expiry
    let { gambit } = social;
    if (gambit.voiceNoteExpiresAt && Date.now() > gambit.voiceNoteExpiresAt) {
      gambit = { ...gambit, voiceNoteExpiresAt: null };
    }

    set({
      social: {
        ...social,
        nearbyUsers,
        collisionAlert,
        proximityHum,
        glitchIntensity,
        activeFlashZone: liveFlashZone,
        flashZoneNotification: null,
        gambit,
        hotStreak: {
          ...hotStreak,
          velocityScore: decayedScore,
          heatLevel: computeHeatLevel(decayedScore),
        },
        localUser: {
          ...social.localUser,
          heatLevel: computeHeatLevel(decayedScore),
        },
      },
    });
  },
}));
