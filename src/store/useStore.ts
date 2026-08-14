import { create } from "zustand";

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  department: string;
}

interface FileRef {
  id?: number | null;
  name: string;
  fileUrl: string;
}

interface AppState {
  user: User | null;
  loadingUser: boolean;
  sidebarCollapsed: boolean;
  activeExcelFile: FileRef | null;
  activeDocxFile: FileRef | null;
  activePdfFile: FileRef | null;
  setUser: (user: User | null) => void;
  setLoadingUser: (loading: boolean) => void;
  toggleSidebar: () => void;
  setActiveExcelFile: (file: FileRef | null) => void;
  setActiveDocxFile: (file: FileRef | null) => void;
  setActivePdfFile: (file: FileRef | null) => void;
}

export const useStore = create<AppState>((set) => ({
  user: null,
  loadingUser: true,
  sidebarCollapsed: false,
  activeExcelFile: null,
  activeDocxFile: null,
  activePdfFile: null,
  setUser: (user) => set({ user }),
  setLoadingUser: (loadingUser) => set({ loadingUser }),
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setActiveExcelFile: (activeExcelFile) => set({ activeExcelFile }),
  setActiveDocxFile: (activeDocxFile) => set({ activeDocxFile }),
  setActivePdfFile: (activePdfFile) => set({ activePdfFile }),
}));
