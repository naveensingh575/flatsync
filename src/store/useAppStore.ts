import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { GroceryItem, OrderingSession, Profile, Flat } from '@/types/app.types';

interface AppState {
  // Current user profile
  profile: Profile | null;
  setProfile: (profile: Profile | null) => void;

  // Multi-group state
  userGroups: Flat[];
  setUserGroups: (groups: Flat[]) => void;
  currentGroupId: string | null;
  setCurrentGroupId: (id: string | null) => void;

  // Active ordering session for this group
  activeSession: OrderingSession | null;
  setActiveSession: (session: OrderingSession | null) => void;

  // UI state
  isAddItemOpen: boolean;
  setIsAddItemOpen: (open: boolean) => void;

  isOrderDrawerOpen: boolean;
  setIsOrderDrawerOpen: (open: boolean) => void;

  isOrderingMode: boolean;
  setIsOrderingMode: (mode: boolean) => void;

  // Selected category filter
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;

  // Optimistic items (local cache before server confirms)
  optimisticItems: GroceryItem[];
  addOptimisticItem: (item: GroceryItem) => void;
  removeOptimisticItem: (id: string) => void;
  clearOptimisticItems: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      profile: null,
      setProfile: (profile) => set({ profile }),

      userGroups: [],
      setUserGroups: (userGroups) => set({ userGroups }),
      currentGroupId: null,
      setCurrentGroupId: (currentGroupId) => set({ currentGroupId }),

      activeSession: null,
      setActiveSession: (session) => set({ activeSession: session }),

      isAddItemOpen: false,
      setIsAddItemOpen: (open) => set({ isAddItemOpen: open }),

      isOrderDrawerOpen: false,
      setIsOrderDrawerOpen: (open) => set({ isOrderDrawerOpen: open }),

      isOrderingMode: false,
      setIsOrderingMode: (mode) => set({ isOrderingMode: mode }),

      selectedCategory: 'all',
      setSelectedCategory: (cat) => set({ selectedCategory: cat }),

      optimisticItems: [],
      addOptimisticItem: (item) =>
        set((s) => ({ optimisticItems: [item, ...s.optimisticItems] })),
      removeOptimisticItem: (id) =>
        set((s) => ({ optimisticItems: s.optimisticItems.filter((i) => i.id !== id) })),
      clearOptimisticItems: () => set({ optimisticItems: [] }),
    }),
    {
      name: 'grocerysync-app-storage',
      storage: createJSONStorage(() => ({
        getItem: (key: string) => {
          if (typeof window === 'undefined') return null;
          return localStorage.getItem(key) || localStorage.getItem('flatsync-app-storage');
        },
        setItem: (key: string, value: string) => {
          if (typeof window === 'undefined') return;
          localStorage.setItem(key, value);
        },
        removeItem: (key: string) => {
          if (typeof window === 'undefined') return;
          localStorage.removeItem(key);
          localStorage.removeItem('flatsync-app-storage');
        },
      })),
      partialize: (state) => ({
        profile: state.profile,
        userGroups: state.userGroups,
        currentGroupId: state.currentGroupId,
        selectedCategory: state.selectedCategory,
      }),
    }
  )
);
