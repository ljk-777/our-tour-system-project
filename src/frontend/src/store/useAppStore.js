import { create } from 'zustand';

export const useAppStore = create((set) => ({
  selectedMarker: null,
  activeTab: 'explore',
  isFlying: false,
  setSelectedMarker: (marker) => set({ selectedMarker: marker }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setIsFlying: (v) => set({ isFlying: v }),
}));
