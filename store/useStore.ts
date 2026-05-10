import { create } from 'zustand'

export type StoreId = 'all' | 'kibo-north' | 'kibo-south'

export interface Store {
  id: StoreId
  name: string
  location: string
}

export const STORES: Store[] = [
  { id: 'all', name: '전체 보기', location: 'All Locations' },
  { id: 'kibo-north', name: 'Kibo Sushi North', location: 'North Location' },
  { id: 'kibo-south', name: 'Kibo Sushi South', location: 'South Location' },
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
}))
