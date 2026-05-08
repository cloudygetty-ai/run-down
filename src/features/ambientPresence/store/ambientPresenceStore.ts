import { create } from 'zustand';
import {
  AmbientPresenceState,
  PresenceUser,
  RevealPulseState,
  DigitalDrinkOffer,
  REVEAL_INTERVAL_MS,
  REVEAL_DURATION_MS,
  MYSTERY_INTERVAL_MS,
} from '../types';
import { RevealPulseEngine } from '../services/RevealPulseEngine';
import { computeRadioMatches, selectVibeMatch } from '../services/RadioRadiusService';
import { createToken, resolveToken, isMelted } from '../services/DigitalDrinkService';
import { generateClue } from '../services/MysteryBoxService';

const INITIAL_PULSE: RevealPulseState = {
  isActive: false,
  nextPulseAt: Date.now() + REVEAL_INTERVAL_MS,
  revealEndsAt: 0,
};

type AmbientPresenceStore = AmbientPresenceState & {
  // Lifecycle — call on screen mount / unmount
  mount: () => void;
  unmount: () => void;

  // Presence data — driven by your real-time transport (socket, polling, etc.)
  setLocalUserId: (id: string) => void;
  setUsers: (users: PresenceUser[]) => void;

  // Internal — called by RevealPulseEngine
  _onPulse: (isActive: boolean) => void;

  // Radio
  refreshRadio: () => void;

  // Digital Drink
  sendToken: (toUserId: string, offer: DigitalDrinkOffer) => void;
  acceptToken: () => void;
  declineToken: () => void;
  tickTokens: () => void;

  // Mystery Box
  dropMysteryClue: () => void;

  // AR overlay
  setArMode: (on: boolean) => void;
};

// Module-level engine refs — one per store instance (singleton pattern).
let _pulseEngine: RevealPulseEngine | null = null;
let _mysteryId: ReturnType<typeof setInterval> | null = null;
let _tokenTickId: ReturnType<typeof setInterval> | null = null;

export const useAmbientPresenceStore = create<AmbientPresenceStore>((set, get) => ({
  localUserId: 'local',
  users: [],
  revealPulse: INITIAL_PULSE,
  nearbyRadioMatches: [],
  vibeMatchUserId: null,
  outgoingToken: null,
  incomingToken: null,
  activeMysteryClue: null,
  isArMode: false,

  mount: () => {
    _pulseEngine = new RevealPulseEngine((active) => get()._onPulse(active));
    _pulseEngine.start();

    // Drop first clue shortly after mount so the screen isn't empty
    setTimeout(() => get().dropMysteryClue(), 1500);
    _mysteryId  = setInterval(() => get().dropMysteryClue(), MYSTERY_INTERVAL_MS);
    _tokenTickId = setInterval(() => get().tickTokens(), 5_000);
  },

  unmount: () => {
    _pulseEngine?.stop();
    _pulseEngine = null;
    if (_mysteryId) clearInterval(_mysteryId);
    if (_tokenTickId) clearInterval(_tokenTickId);
    _mysteryId = null;
    _tokenTickId = null;
  },

  setLocalUserId: (localUserId) => set({ localUserId }),

  setUsers: (users) => {
    set({ users });
    get().refreshRadio();
  },

  _onPulse: (isActive) => {
    const now = Date.now();
    set((s) => ({
      revealPulse: {
        isActive,
        nextPulseAt: isActive ? s.revealPulse.nextPulseAt : now + REVEAL_INTERVAL_MS,
        revealEndsAt: isActive ? now + REVEAL_DURATION_MS : s.revealPulse.revealEndsAt,
      },
      users: s.users.map((u) => ({ ...u, isRevealed: isActive })),
    }));
  },

  refreshRadio: () => {
    const { users, localUserId } = get();
    const local = users.find((u) => u.id === localUserId);
    if (!local) return;
    const others = users.filter((u) => u.id !== localUserId);
    set({
      nearbyRadioMatches: computeRadioMatches(local, others),
      vibeMatchUserId: selectVibeMatch(local, others),
    });
  },

  sendToken: (toUserId, offer) => {
    const { localUserId } = get();
    set({ outgoingToken: createToken(localUserId, toUserId, offer) });
  },

  acceptToken: () => {
    const { incomingToken } = get();
    if (!incomingToken) return;
    set({ incomingToken: resolveToken(incomingToken, true) });
  },

  declineToken: () => {
    const { incomingToken } = get();
    if (!incomingToken) return;
    set({ incomingToken: resolveToken(incomingToken, false) });
  },

  tickTokens: () => {
    const { outgoingToken, incomingToken } = get();
    const now = Date.now();
    const patch: Partial<AmbientPresenceState> = {};

    if (outgoingToken && isMelted(outgoingToken, now) && outgoingToken.status === 'pending') {
      patch.outgoingToken = { ...outgoingToken, status: 'melted' };
    }
    if (incomingToken && isMelted(incomingToken, now) && incomingToken.status === 'pending') {
      patch.incomingToken = { ...incomingToken, status: 'melted' };
    }
    if (Object.keys(patch).length > 0) set(patch as AmbientPresenceState);
  },

  dropMysteryClue: () => {
    const { users, localUserId } = get();
    const clue = generateClue(users, localUserId);
    if (clue) set({ activeMysteryClue: clue });
  },

  setArMode: (isArMode) => set({ isArMode }),
}));
