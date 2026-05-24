// src/store/colourMasterStore.ts
// FIXES:
//   - updateColour: now merges server-fetched record with the update payload
//     instead of reading from potentially stale local state
//   - Minor: error logging improved

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
  colours:       ColourMaster[];
  loading:       boolean;
  refreshing:    boolean;
  error:         string | null;
  lastFetchedAt: number | null;

  fetchColours:  (force?: boolean) => Promise<void>;
  addColour:     (name: string, hexCode?: string) => Promise<ColourMaster>;
  updateColour:  (id: string, data: Partial<ColourMaster>) => Promise<ColourMaster>;
  deleteColour:  (id: string) => Promise<void>;
  toggleActive:  (id: string) => Promise<void>;
}

const API_BASE    = `${API.BASE}/api/colourmaster`;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function sortColours(colours: ColourMaster[]) {
  return [...colours].sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return a.name.localeCompare(b.name);
  });
}

export const useColourMasterStore = create<ColourMasterStore>((set, get) => ({
  colours:       [],
  loading:       false,
  refreshing:    false,
  error:         null,
  lastFetchedAt: null,

  fetchColours: async (force = false) => {
    const { loading, refreshing, lastFetchedAt, colours } = get();
    if (loading || refreshing) return;

    const cacheValid = lastFetchedAt && Date.now() - lastFetchedAt < CACHE_TTL_MS;
    if (!force && cacheValid) return;

    const hasData = colours.length > 0;
    set(hasData ? { refreshing: true, error: null } : { loading: true, error: null });

    try {
      const res = await fetch(`${API_BASE}?includeInactive=true`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error(await res.text() || `HTTP ${res.status}`);
      const data: ColourMaster[] = await res.json();
      set({ colours: sortColours(data), lastFetchedAt: Date.now(), error: null });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load colours';
      console.error('colourMasterStore.fetchColours:', msg);
      set({ error: msg });
    } finally {
      set({ loading: false, refreshing: false });
    }
  },

  addColour: async (name, hexCode) => {
    const res = await fetch(API_BASE, {
      method:  'POST',
      headers: getAuthHeaders(),
      body:    JSON.stringify({ name, hexCode: hexCode || null, isActive: true, sortOrder: 0 }),
    });
    if (!res.ok) throw new Error(await res.text() || 'Failed to add colour');
    const saved: ColourMaster = await res.json();
    set((state) => ({ colours: sortColours([...state.colours, saved]) }));
    return saved;
  },

  updateColour: async (id, data) => {
    // FIX: Fetch the current record from server instead of reading possibly stale local state
    const getRes = await fetch(`${API_BASE}/${id}`, { headers: getAuthHeaders() });
    if (!getRes.ok) throw new Error('Colour not found on server');
    const existing: ColourMaster = await getRes.json();

    const res = await fetch(`${API_BASE}/${id}`, {
      method:  'PUT',
      headers: getAuthHeaders(),
      body:    JSON.stringify({ ...existing, ...data }),
    });
    if (!res.ok) throw new Error(await res.text() || 'Failed to update colour');
    const updated: ColourMaster = await res.json();
    set((state) => ({
      colours: sortColours(state.colours.map(c => c.id === id ? updated : c)),
    }));
    return updated;
  },

  deleteColour: async (id) => {
    const res = await fetch(`${API_BASE}/${id}`, {
      method:  'DELETE',
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error(await res.text() || 'Failed to delete colour');
    set((state) => ({ colours: state.colours.filter(c => c.id !== id) }));
  },

  toggleActive: async (id) => {
    const res = await fetch(`${API_BASE}/${id}/toggle`, {
      method:  'PATCH',
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error(await res.text() || 'Failed to toggle colour');
    const updated: ColourMaster = await res.json();
    set((state) => ({
      colours: sortColours(state.colours.map(c => c.id === id ? updated : c)),
    }));
  },
}));