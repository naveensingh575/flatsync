import { create } from 'zustand';
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

export const useAppStore = create<AppState>((set) => ({
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
}));
