import { create } from 'zustand';
import type { CruiseMode, UserProfile } from '../types';

type UserStore = {
  mode: CruiseMode;
  profile: UserProfile;
  joinedGroupId: string | null;
  checkedInSpotId: string | null;

  setMode: (m: CruiseMode) => void;
  joinGroup: (id: string) => void;
  leaveGroup: () => void;
  checkIn: (spotId: string) => void;
  checkOut: () => void;
};

export const useUserStore = create<UserStore>((set) => ({
  mode: 'offline',
  profile: {
    displayName: 'You',
    age: 28,
    tribe: 'jock',
    height: '5\'11"',
    bio: 'Out here tonight.',
    lookingFor: 'Whatever happens',
    gradientId: 0,
    verified: true,
    hasVideo: true,
  },
  joinedGroupId: null,
  checkedInSpotId: null,

  setMode: (mode) => set({ mode }),
  joinGroup: (id) => set({ joinedGroupId: id }),
  leaveGroup: () => set({ joinedGroupId: null }),
  checkIn: (spotId) => set({ checkedInSpotId: spotId }),
  checkOut: () => set({ checkedInSpotId: null }),
}));
