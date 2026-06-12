import { create } from 'zustand';
import type { VehicleClass } from '../types';

type UserStore = {
  handle: string;
  vehicleClass: VehicleClass;
  vehicleName: string;
  repScore: number;
  milesLogged: number;
  currentGroupId: string | null;
  isLive: boolean;
  totalCheckins: number;
  honksSent: number;
  honksReceived: number;

  goLive: () => void;
  goOffline: () => void;
  joinGroup: (groupId: string) => void;
  leaveGroup: () => void;
  addRep: (amount: number) => void;
  addMiles: (miles: number) => void;
  recordCheckin: () => void;
  recordHonk: () => void;
};

export const useUserStore = create<UserStore>((set) => ({
  handle: 'CHROME_DREAM',
  vehicleClass: 'lowrider',
  vehicleName: '1964 Chevy Impala',
  repScore: 1847,
  milesLogged: 4230,
  currentGroupId: null,
  isLive: false,
  totalCheckins: 62,
  honksSent: 214,
  honksReceived: 380,

  goLive: () => set({ isLive: true }),
  goOffline: () => set({ isLive: false }),
  joinGroup: (groupId) => set({ currentGroupId: groupId }),
  leaveGroup: () => set({ currentGroupId: null }),
  addRep: (amount) => set((s) => ({ repScore: s.repScore + amount })),
  addMiles: (miles) => set((s) => ({ milesLogged: s.milesLogged + miles })),
  recordCheckin: () => set((s) => ({ totalCheckins: s.totalCheckins + 1 })),
  recordHonk: () => set((s) => ({ honksSent: s.honksSent + 1 })),
}));
