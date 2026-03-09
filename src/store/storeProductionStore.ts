// src/store/storeProductionStore.ts
import { create } from 'zustand';

export interface StoreProductionRecord {
  id: string;
  issueDate: string;
  styleNo: string;
  components: string;
  cutNo: string;
  issueQty: number;
  balanceQty: number; // The remaining qty AFTER this specific issue
  lineNo: string;
}

interface StoreProductionStore {
  productionRecords: StoreProductionRecord[];
  addRecord: (record: StoreProductionRecord) => void;
  updateRecord: (id: string, record: StoreProductionRecord) => void;
  deleteRecord: (id: string) => void;
}

export const useStoreProductionStore = create<StoreProductionStore>((set) => ({
  productionRecords: [],
  addRecord: (record) => set((state) => ({ 
    productionRecords: [record, ...state.productionRecords] 
  })),
  updateRecord: (id, updatedRecord) => set((state) => ({
    productionRecords: state.productionRecords.map((rec) => (rec.id === id ? updatedRecord : rec)),
  })),
  deleteRecord: (id) => set((state) => ({
    productionRecords: state.productionRecords.filter((rec) => rec.id !== id),
  })),
}));