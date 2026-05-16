// src/store/colourMasterStore.ts
import { create } from 'zustand';
import { API, getAuthHeaders } from '../api/client';

export interface ColourMaster {
  id: string;
  name: string;
  hexCode?: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
}

interface ColourMasterStore {
  colours: ColourMaster[];
  loading: boolean;        // true ONLY on the very first fetch (no data yet)
  refreshing: boolean;     // true on background refreshes (data already shown)
  lastFetchedAt: number | null;
  fetchColours: (force?: boolean) => Promise<void>;
  addColour: (name: string, hexCode?: string) => Promise<ColourMaster>;
  updateColour: (id: string, data: Partial<ColourMaster>) => Promise<ColourMaster>;
  deleteColour: (id: string) => Promise<void>;
  toggleActive: (id: string) => Promise<void>;
}

const API_BASE = `${API.BASE}/api/colourmaster`;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function sortColours(colours: ColourMaster[]) {
  return [...colours].sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return a.name.localeCompare(b.name);
  });
}

export const useColourMasterStore = create<ColourMasterStore>((set, get) => ({
  colours: [],
  loading: false,
  refreshing: false,
  lastFetchedAt: null,

  fetchColours: async (force = false) => {
    const { lastFetchedAt, loading, refreshing, colours } = get();

    // Already in flight — don't double-fetch
    if (loading || refreshing) return;

    const cacheValid = lastFetchedAt && Date.now() - lastFetchedAt < CACHE_TTL_MS;

    // Cache is fresh and not forced — skip entirely
    if (!force && cacheValid) return;

    const hasData = colours.length > 0;

    // If we already have data (returning to page), use background refresh
    // so the UI never goes blank with a spinner
    if (hasData) {
      set({ refreshing: true });
    } else {
      set({ loading: true });
    }

    try {
      const res = await fetch(`${API_BASE}?includeInactive=true`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error(await res.text());
      const data: ColourMaster[] = await res.json();
      set({ colours: sortColours(data), lastFetchedAt: Date.now() });
    } catch (e) {
      console.error('Failed to fetch colour master:', e);
    } finally {
      set({ loading: false, refreshing: false });
    }
  },

  addColour: async (name, hexCode) => {
    const res = await fetch(API_BASE, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ name, hexCode: hexCode || null, isActive: true, sortOrder: 0 }),
    });
    if (!res.ok) throw new Error(await res.text());
    const saved: ColourMaster = await res.json();
    set((state) => ({ colours: sortColours([...state.colours, saved]) }));
    return saved;
  },

  updateColour: async (id, data) => {
    const existing = get().colours.find((c) => c.id === id);
    if (!existing) throw new Error('Colour not found');
    const res = await fetch(`${API_BASE}/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ ...existing, ...data }),
    });
    if (!res.ok) throw new Error(await res.text());
    const updated: ColourMaster = await res.json();
    set((state) => ({
      colours: sortColours(state.colours.map((c) => (c.id === id ? updated : c))),
    }));
    return updated;
  },

  deleteColour: async (id) => {
    const res = await fetch(`${API_BASE}/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error(await res.text());
    set((state) => ({ colours: state.colours.filter((c) => c.id !== id) }));
  },

  toggleActive: async (id) => {
    const res = await fetch(`${API_BASE}/${id}/toggle`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error(await res.text());
    const updated: ColourMaster = await res.json();
    set((state) => ({
      colours: sortColours(state.colours.map((c) => (c.id === id ? updated : c))),
    }));
  },
}));