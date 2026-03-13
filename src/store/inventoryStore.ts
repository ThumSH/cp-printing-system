import { create } from 'zustand';

export interface StoreInRecord {
  id: string; styleNo: string; bodyColour: string; printColour: string;
  components: string; season: string; cutInDate: string; bulkQty: number;
  inQty: number; balanceBulkQty: number; cutQty: number; availableQty: number;
  scheduleNo: string; cutNo: string; bundleQty: number; numberRange: string; size: string;
}

interface InventoryStore {
  storeInRecords: StoreInRecord[];
  fetchRecords: () => Promise<void>;
  addStoreInRecord: (record: StoreInRecord) => Promise<void>;
  updateStoreInRecord: (id: string, record: StoreInRecord) => Promise<void>;
  deleteStoreInRecord: (id: string) => Promise<void>;
}

const API_URL = 'http://localhost:5000/api/inventory/store-in';
const getHeaders = () => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` });

export const useInventoryStore = create<InventoryStore>((set) => ({
  storeInRecords: [],
  fetchRecords: async () => {
    const res = await fetch(API_URL, { headers: getHeaders() });
    if (res.ok) set({ storeInRecords: await res.json() });
  },
  addStoreInRecord: async (record) => {
    const res = await fetch(API_URL, { method: 'POST', headers: getHeaders(), body: JSON.stringify(record) });
    if (res.ok) {
      const saved = await res.json();
      set((state) => ({ storeInRecords: [saved, ...state.storeInRecords] }));
    }
  },
  updateStoreInRecord: async (id, updatedRecord) => {
    const res = await fetch(`${API_URL}/${id}`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify(updatedRecord) });
    if (res.ok) set((state) => ({ storeInRecords: state.storeInRecords.map((rec) => (rec.id === id ? updatedRecord : rec)) }));
  },
  deleteStoreInRecord: async (id) => {
    const res = await fetch(`${API_URL}/${id}`, { method: 'DELETE', headers: getHeaders() });
    if (res.ok) set((state) => ({ storeInRecords: state.storeInRecords.filter((rec) => rec.id !== id) }));
  },
}));