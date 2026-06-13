import { create } from 'zustand';
import type { NearbyUser, CruisingSpot, CruiseGroup } from '../types';

type MapStore = {
  nearbyUsers: Record<string, NearbyUser>;
  spots: CruisingSpot[];
  groups: Record<string, CruiseGroup>;
  selectedUserId: string | null;
  selectedSpotId: string | null;
  nearbyCount: number;

  setUser: (u: NearbyUser) => void;
  removeUser: (id: string) => void;
  setSpots: (spots: CruisingSpot[]) => void;
  setGroups: (groups: Record<string, CruiseGroup>) => void;
  updateSpotCount: (id: string, delta: number) => void;
  selectUser: (id: string | null) => void;
  selectSpot: (id: string | null) => void;
  expressInterest: (id: string) => void;
  confirmMatch: (id: string, profile: NearbyUser['profile']) => void;
};

export const useMapStore = create<MapStore>((set) => ({
  nearbyUsers: {},
  spots: [],
  groups: {},
  selectedUserId: null,
  selectedSpotId: null,
  nearbyCount: 0,

  setUser: (u) =>
    set((s) => {
      const next = { ...s.nearbyUsers, [u.id]: u };
      return { nearbyUsers: next, nearbyCount: Object.keys(next).length };
    }),

  removeUser: (id) =>
    set((s) => {
      const next = { ...s.nearbyUsers };
      delete next[id];
      return { nearbyUsers: next, nearbyCount: Object.keys(next).length };
    }),

  setSpots: (spots) => set({ spots }),
  setGroups: (groups) => set({ groups }),

  updateSpotCount: (id, delta) =>
    set((s) => ({
      spots: s.spots.map((sp) =>
        sp.id === id ? { ...sp, activeCount: Math.max(0, sp.activeCount + delta) } : sp,
      ),
    })),

  selectUser: (id) => set({ selectedUserId: id, selectedSpotId: null }),
  selectSpot: (id) => set({ selectedSpotId: id, selectedUserId: null }),

  expressInterest: (id) =>
    set((s) => {
      const user = s.nearbyUsers[id];
      if (!user || user.revealStatus !== 'hidden') return s;
      return {
        nearbyUsers: {
          ...s.nearbyUsers,
          [id]: { ...user, revealStatus: 'liked' },
        },
      };
    }),

  confirmMatch: (id, profile) =>
    set((s) => {
      const user = s.nearbyUsers[id];
      if (!user) return s;
      return {
        nearbyUsers: {
          ...s.nearbyUsers,
          [id]: { ...user, revealStatus: 'matched', profile },
        },
      };
    }),
}));
