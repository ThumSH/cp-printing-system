// src/store/storeProductionStore.ts
// FIXES:
//   - All operations now throw on error (were silently failing with if(res.ok) pattern)
//   - Added error propagation so UI can show failure messages
//
// NOTE: This store is kept for backward compat with any pages that still import it,
// but new code should use inventoryStore.ts (productionRecords / batchAddProductionRecords)
// which provides a superset of this store's functionality.

import { create } from 'zustand';
import { API, getAuthHeaders } from '../api/client';

export interface StoreProductionRecord {
  id: string;
  issueDate: string;
  styleNo: string;
  components: string;
  cutNo: string;
  issueQty: number;
  balanceQty: number;
  lineNo: string;
}

interface StoreProductionStore {
  productionRecords: StoreProductionRecord[];
  loading: boolean;
  error: string;
  fetchRecords: () => Promise<void>;
  addRecord: (record: Partial<StoreProductionRecord>) => Promise<StoreProductionRecord>;
  updateRecord: (id: string, record: StoreProductionRecord) => Promise<void>;
  deleteRecord: (id: string) => Promise<void>;
}

const API_URL = `${API.INVENTORY}/production`;

export const useStoreProductionStore = create<StoreProductionStore>((set) => ({
  productionRecords: [],
  loading:           false,
  error:             '',

  fetchRecords: async () => {
    set({ loading: true, error: '' });
    try {
      const res = await fetch(API_URL, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error(await res.text() || `HTTP ${res.status}`);
      set({ productionRecords: await res.json() });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to fetch production records';
      set({ error: msg });
      console.error('storeProductionStore.fetchRecords:', msg);
      throw e;
    } finally {
      set({ loading: false });
    }
  },

  addRecord: async (record) => {
    const res = await fetch(API_URL, {
      method:  'POST',
      headers: getAuthHeaders(),
      body:    JSON.stringify(record),
    });
    // FIX: was `if (res.ok) { ... }` with no else — silently did nothing on error
    if (!res.ok) throw new Error(await res.text() || 'Failed to create production record');
    const saved: StoreProductionRecord = await res.json();
    set((state) => ({ productionRecords: [saved, ...state.productionRecords] }));
    return saved;
  },

  updateRecord: async (id, updatedRecord) => {
    const res = await fetch(`${API_URL}/${id}`, {
      method:  'PUT',
      headers: getAuthHeaders(),
      body:    JSON.stringify(updatedRecord),
    });
    // FIX: was `if (res.ok) { ... }` — silently did nothing on error
    if (!res.ok) throw new Error(await res.text() || 'Failed to update production record');
    set((state) => ({
      productionRecords: state.productionRecords.map(r => r.id === id ? updatedRecord : r),
    }));
  },

  deleteRecord: async (id) => {
    const res = await fetch(`${API_URL}/${id}`, {
      method:  'DELETE',
      headers: getAuthHeaders(),
    });
    // FIX: was `if (res.ok) { ... }` — silently did nothing on error
    if (!res.ok) throw new Error(await res.text() || 'Failed to delete production record');
    set((state) => ({
      productionRecords: state.productionRecords.filter(r => r.id !== id),
    }));
  },
}));