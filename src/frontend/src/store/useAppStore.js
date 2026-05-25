import { create } from 'zustand';

export const useAppStore = create((set) => ({
  selectedMarker:    null,
  activeTab:         'explore',
  isFlying:          false,
  selectedTraveler:  null,
  aiRoute:           null,
  aiPlaying:         false,
  searchMarker:      null,
  searchMode:        false,
  focusedCity:       null,   // 沉浸式聚焦的城市 marker，触发地球转向动画

  setSelectedMarker:   (m) => set({ selectedMarker: m }),
  setActiveTab:        (t) => set({ activeTab: t }),
  setIsFlying:         (v) => set({ isFlying: v }),
  setSelectedTraveler: (t) => set({ selectedTraveler: t }),
  setAiRoute:          (r) => set({ aiRoute: r }),
  setAiPlaying:        (v) => set({ aiPlaying: v }),
  setSearchMarker:     (m) => set({ searchMarker: m, searchMode: !!m }),
  clearSearch:         ()  => set({ searchMarker: null, searchMode: false }),
  setFocusedCity:      (c) => set({ focusedCity: c }),
}));
