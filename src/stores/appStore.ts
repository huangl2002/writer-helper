import { create } from "zustand";
import type { Chapter, Theme, TodayStats, Volume, Work } from "../types";

interface AppState {
  works: Work[];
  volumes: Volume[];
  chapters: Chapter[];
  activeWorkId: string | null;
  activeChapterId: string | null;

  theme: Theme;
  sidebarOpen: boolean;
  helperPanelOpen: boolean;
  layoutMode: "default" | "focus" | "outline";
  todayStats: TodayStats;

  setWorks: (works: Work[]) => void;
  setVolumes: (volumes: Volume[]) => void;
  setChapters: (chapters: Chapter[]) => void;
  setActiveWork: (id: string | null) => void;
  setActiveChapter: (id: string | null) => void;
  setTheme: (theme: Theme) => void;
  toggleSidebar: () => void;
  toggleHelperPanel: () => void;
  setLayoutMode: (mode: "default" | "focus" | "outline") => void;
  setTodayStats: (stats: TodayStats) => void;
}

export const useAppStore = create<AppState>((set) => ({
  works: [],
  volumes: [],
  chapters: [],
  activeWorkId: null,
  activeChapterId: null,
  theme: "light",
  sidebarOpen: true,
  helperPanelOpen: false,
  layoutMode: "default",
  todayStats: { total_words: 0, session_count: 0 },

  setWorks: (works) => set({ works }),
  setVolumes: (volumes) => set({ volumes }),
  setChapters: (chapters) => set({ chapters }),
  setActiveWork: (id) => set({ activeWorkId: id, activeChapterId: null }),
  setActiveChapter: (id) => set({ activeChapterId: id }),
  setTheme: (theme) => set({ theme }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  toggleHelperPanel: () =>
    set((s) => ({ helperPanelOpen: !s.helperPanelOpen })),
  setLayoutMode: (mode) => set({ layoutMode: mode }),
  setTodayStats: (stats) => set({ todayStats: stats }),
}));
