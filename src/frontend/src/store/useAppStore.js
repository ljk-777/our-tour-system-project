import { create } from 'zustand';

export const useAppStore = create((set) => ({
  selectedMarker:    null,
  activeTab:         'explore',
  isFlying:          false,
  selectedTraveler:  null,   // 当前高亮的旅行者
  aiRoute:           null,   // AI 规划的路线 {from, to, coords}
  aiPlaying:         false,  // 路线动画播放中

  setSelectedMarker:   (m) => set({ selectedMarker: m }),
  setActiveTab:        (t) => set({ activeTab: t }),
  setIsFlying:         (v) => set({ isFlying: v }),
  setSelectedTraveler: (t) => set({ selectedTraveler: t }),
  setAiRoute:          (r) => set({ aiRoute: r }),
  setAiPlaying:        (v) => set({ aiPlaying: v }),
}));
