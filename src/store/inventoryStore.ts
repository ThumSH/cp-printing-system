// src/store/inventoryStore.ts
import { create } from 'zustand';

export interface StoreInRecord {
  id: string;
  styleNo: string;
  bodyColour: string;
  printColour: string;
  components: string;
  season: string;
  cutInDate: string;
  
  // --- NEW QUANTITY WATERFALL ---
  bulkQty: number;        // From Admin
  inQty: number;          // Received by Store
  balanceBulkQty: number; // bulkQty - inQty (Pending to receive)
  cutQty: number;         // Processed by Store
  availableQty: number;   // inQty - cutQty (Ready on shelf)
  
  scheduleNo: string;
  cutNo: string;
  bundleQty: number;
  numberRange: string;
  size: string;
}

interface InventoryStore {
  storeInRecords: StoreInRecord[];
  addStoreInRecord: (record: StoreInRecord) => void;
  updateStoreInRecord: (id: string, record: StoreInRecord) => void;
  deleteStoreInRecord: (id: string) => void;
}

export const useInventoryStore = create<InventoryStore>((set) => ({
  storeInRecords: [],
  addStoreInRecord: (record) => set((state) => ({ storeInRecords: [record, ...state.storeInRecords] })),
  updateStoreInRecord: (id, updatedRecord) => set((state) => ({
    storeInRecords: state.storeInRecords.map((rec) => (rec.id === id ? updatedRecord : rec)),
  })),
  deleteStoreInRecord: (id) => set((state) => ({
    storeInRecords: state.storeInRecords.filter((rec) => rec.id !== id),
  })),
}));