import { create } from 'zustand';

export const useAppStore = create((set) => ({
  selectedMarker:    null,
  activeTab:         'explore',
  isFlying:          false,
  selectedTraveler:  null,
  aiRoute:           null,
  aiPlaying:         false,
  searchMarker:      null,   // 搜索结果地标 { title, lat, lng, description }
  searchMode:        false,  // 搜索模式：隐藏其他地标

  setSelectedMarker:   (m) => set({ selectedMarker: m }),
  setActiveTab:        (t) => set({ activeTab: t }),
  setIsFlying:         (v) => set({ isFlying: v }),
  setSelectedTraveler: (t) => set({ selectedTraveler: t }),
  setAiRoute:          (r) => set({ aiRoute: r }),
  setAiPlaying:        (v) => set({ aiPlaying: v }),
  setSearchMarker:     (m) => set({ searchMarker: m, searchMode: !!m }),
  clearSearch:         ()  => set({ searchMarker: null, searchMode: false }),
}));
