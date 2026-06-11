import { create } from 'zustand';
import type { MergedFile, SidebarView } from '@/types';

interface UIState {
  /** Current sidebar selection driving the main grid. */
  view: SidebarView;
  setView: (view: SidebarView) => void;

  /** Command palette (Cmd+K) visibility. */
  paletteOpen: boolean;
  setPaletteOpen: (open: boolean) => void;

  /** File currently shown in the preview modal. */
  previewFile: MergedFile | null;
  setPreviewFile: (file: MergedFile | null) => void;

  /** Free-text/main search query (mirrors palette input when used inline). */
  query: string;
  setQuery: (q: string) => void;

  /** Id of the card with keyboard focus in the grid. */
  focusedId: string | null;
  setFocusedId: (id: string | null) => void;

  /** Drive sync status, surfaced in the header. */
  syncing: boolean;
  setSyncing: (v: boolean) => void;
  syncError: string | null;
  setSyncError: (e: string | null) => void;
}

export const useUIStore = create<UIState>((set) => ({
  view: { kind: 'smart', id: 'recent' },
  setView: (view) => set({ view, focusedId: null }),

  paletteOpen: false,
  setPaletteOpen: (paletteOpen) => set({ paletteOpen }),

  previewFile: null,
  setPreviewFile: (previewFile) => set({ previewFile }),

  query: '',
  setQuery: (query) => set({ query }),

  focusedId: null,
  setFocusedId: (focusedId) => set({ focusedId }),

  syncing: false,
  setSyncing: (syncing) => set({ syncing }),
  syncError: null,
  setSyncError: (syncError) => set({ syncError }),
}));
