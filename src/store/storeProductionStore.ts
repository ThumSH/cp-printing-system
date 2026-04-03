import { create } from 'zustand';
import { API, getAuthHeaders } from '../api/client';

export interface StoreProductionRecord {
  id: string; issueDate: string; styleNo: string; components: string;
  cutNo: string; issueQty: number; balanceQty: number; lineNo: string;
}

interface StoreProductionStore {
  productionRecords: StoreProductionRecord[];
  fetchRecords: () => Promise<void>;
  addRecord: (record: StoreProductionRecord) => Promise<void>;
  updateRecord: (id: string, record: StoreProductionRecord) => Promise<void>;
  deleteRecord: (id: string) => Promise<void>;
}

const API_URL = `${API.INVENTORY}/production`;
const getHeaders = getAuthHeaders;

export const useStoreProductionStore = create<StoreProductionStore>((set) => ({
  productionRecords: [],
  fetchRecords: async () => {
    const res = await fetch(API_URL, { headers: getHeaders() });
    if (res.ok) set({ productionRecords: await res.json() });
  },
  addRecord: async (record) => {
    const res = await fetch(API_URL, { method: 'POST', headers: getHeaders(), body: JSON.stringify(record) });
    if (res.ok) {
      const saved = await res.json();
      set((state) => ({ productionRecords: [saved, ...state.productionRecords] }));
    }
  },
  updateRecord: async (id, updatedRecord) => {
    const res = await fetch(`${API_URL}/${id}`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify(updatedRecord) });
    if (res.ok) set((state) => ({ productionRecords: state.productionRecords.map((rec) => (rec.id === id ? updatedRecord : rec)) }));
  },
  deleteRecord: async (id) => {
    const res = await fetch(`${API_URL}/${id}`, { method: 'DELETE', headers: getHeaders() });
    if (res.ok) set((state) => ({ productionRecords: state.productionRecords.filter((rec) => rec.id !== id) }));
  },
}));