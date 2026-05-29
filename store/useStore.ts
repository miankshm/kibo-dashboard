import { create } from 'zustand'

export type StoreId = 'all' | 'st-clair' | 'woodbridge'
export type Language = 'ko' | 'en'

export interface LocalizedText {
  ko: string
  en: string
}

export interface Store {
  id: StoreId
  name: LocalizedText
  location: LocalizedText
}

export const STORES: Store[] = [
  {
    id: 'all',
    name: { ko: '전체 보기', en: 'All Stores' },
    location: { ko: '모든 지점', en: 'All locations' },
  },
  {
    id: 'st-clair',
    name: { ko: 'St. Clair', en: 'St. Clair' },
    location: { ko: 'St. Clair 지점', en: 'St. Clair Location' },
  },
  {
    id: 'woodbridge',
    name: { ko: 'Woodbridge', en: 'Woodbridge' },
    location: { ko: 'Woodbridge 지점', en: 'Woodbridge Location' },
  },
]

interface AppState {
  selectedStoreId: StoreId
  setSelectedStoreId: (storeId: StoreId) => void
  isSidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void
  isDarkMode: boolean
  setDarkMode: (dark: boolean) => void
  toggleDarkMode: () => void
  language: Language
  setLanguage: (language: Language) => void
  toggleLanguage: () => void
}

export const useStore = create<AppState>((set) => ({
  selectedStoreId: 'all',
  setSelectedStoreId: (storeId) => set({ selectedStoreId: storeId }),
  isSidebarOpen: false,
  setSidebarOpen: (open) => set({ isSidebarOpen: open }),
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  isDarkMode: false,
  setDarkMode: (dark) => set({ isDarkMode: dark }),
  toggleDarkMode: () => set((state) => ({ isDarkMode: !state.isDarkMode })),
  language: 'ko',
  setLanguage: (language) => set({ language }),
  toggleLanguage: () => set((state) => ({ language: state.language === 'ko' ? 'en' : 'ko' })),
}))
