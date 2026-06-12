import { create } from 'zustand';
import type { Cruiser, CruisingSpot, CruiseGroup, ActivityEvent, MapMode } from '../types';

const MAX_FEED_EVENTS = 30;

type MapStore = {
  cruisers: Record<string, Cruiser>;
  spots: CruisingSpot[];
  groups: Record<string, CruiseGroup>;
  feed: ActivityEvent[];
  selectedSpotId: string | null;
  selectedCruiserId: string | null;
  mode: MapMode;
  activeCruiserCount: number;
  activeGroupCount: number;

  setCruiser: (c: Cruiser) => void;
  removeCruiser: (id: string) => void;
  setSpots: (spots: CruisingSpot[]) => void;
  updateSpotActivity: (id: string, delta: number) => void;
  setGroups: (groups: Record<string, CruiseGroup>) => void;
  pushFeed: (e: ActivityEvent) => void;
  selectSpot: (id: string | null) => void;
  selectCruiser: (id: string | null) => void;
  setMode: (mode: MapMode) => void;
};

export const useMapStore = create<MapStore>((set, get) => ({
  cruisers: {},
  spots: [],
  groups: {},
  feed: [],
  selectedSpotId: null,
  selectedCruiserId: null,
  mode: 'explore',
  activeCruiserCount: 0,
  activeGroupCount: 0,

  setCruiser: (c) =>
    set((s) => {
      const next = { ...s.cruisers, [c.id]: c };
      return {
        cruisers: next,
        activeCruiserCount: Object.values(next).filter((x) => x.isLive).length,
      };
    }),

  removeCruiser: (id) =>
    set((s) => {
      const next = { ...s.cruisers };
      delete next[id];
      return {
        cruisers: next,
        activeCruiserCount: Object.values(next).filter((x) => x.isLive).length,
      };
    }),

  setSpots: (spots) => set({ spots }),

  updateSpotActivity: (id, delta) =>
    set((s) => ({
      spots: s.spots.map((sp) =>
        sp.id === id
          ? { ...sp, activeCruisers: Math.max(0, sp.activeCruisers + delta) }
          : sp,
      ),
    })),

  setGroups: (groups) =>
    set({ groups, activeGroupCount: Object.keys(groups).length }),

  pushFeed: (e) =>
    set((s) => ({
      feed: [e, ...s.feed].slice(0, MAX_FEED_EVENTS),
    })),

  selectSpot: (id) => set({ selectedSpotId: id, selectedCruiserId: null }),
  selectCruiser: (id) => set({ selectedCruiserId: id, selectedSpotId: null }),
  setMode: (mode) => set({ mode }),
}));
