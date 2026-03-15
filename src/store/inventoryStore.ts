import { create } from 'zustand';

export interface EligibleStoreInItem {
  submissionId: string;
  revisionNo: number;
  styleNo: string;
  customerName: string;
  submissionDate: string;
  level: string;
  approvalStatus: string;
  reviewedAt: string;
  bodyColour: string;
  printColour: string;
  season: string;
  components: string;
  approvedBulkQty: number;
}

export interface EligibleProductionItem {
  storeInRecordId: string;
  submissionId: string;
  revisionNo: number;
  styleNo: string;
  customerName: string;
  components: string;
  cutNo: string;
  availableQty: number;
  inspectionStatus: string;
  checkedBy: string;
  summaryDate: string;
}

export interface StoreInRecord {
  id: string;
  submissionId: string;
  revisionNo: number;
  styleNo: string;
  customerName: string;
  bodyColour: string;
  printColour: string;
  components: string;
  season: string;
  cutInDate: string;
  bulkQty: number;
  inQty: number;
  balanceBulkQty: number;
  cutQty: number;
  availableQty: number;
  scheduleNo: string;
  cutNo: string;
  bundleQty: number;
  numberRange: string;
  size: string;
}

export interface StoreProductionRecord {
  id: string;
  storeInRecordId: string;
  submissionId: string;
  revisionNo: number;
  issueDate: string;
  styleNo: string;
  customerName: string;
  components: string;
  cutNo: string;
  issueQty: number;
  balanceQty: number;
  lineNo: string;
}

interface InventoryStore {
  storeInRecords: StoreInRecord[];
  eligibleStoreInItems: EligibleStoreInItem[];
  productionRecords: StoreProductionRecord[];
  eligibleProductionItems: EligibleProductionItem[];
  fetchRecords: () => Promise<void>;
  fetchEligibleStoreInItems: () => Promise<void>;
  addStoreInRecord: (record: Omit<StoreInRecord, 'id' | 'styleNo' | 'customerName' | 'revisionNo' | 'bodyColour' | 'printColour' | 'components' | 'season'>) => Promise<StoreInRecord>;
  updateStoreInRecord: (id: string, record: StoreInRecord) => Promise<void>;
  deleteStoreInRecord: (id: string) => Promise<void>;
  fetchProductionRecords: () => Promise<void>;
  fetchEligibleProductionItems: () => Promise<void>;
  addProductionRecord: (record: Omit<StoreProductionRecord, 'id' | 'submissionId' | 'revisionNo' | 'styleNo' | 'customerName' | 'components' | 'cutNo' | 'balanceQty'>) => Promise<StoreProductionRecord>;
  updateProductionRecord: (id: string, record: StoreProductionRecord) => Promise<void>;
  deleteProductionRecord: (id: string) => Promise<void>;
}

const API_BASE = 'http://localhost:5000/api/inventory';

const getHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token')}`,
});

const sortByDateAndRevision = <T extends { revisionNo: number }>(
  items: T[],
  dateField: keyof T
) => {
  return [...items].sort((a, b) => {
    const bTime = new Date(String(b[dateField] || '')).getTime();
    const aTime = new Date(String(a[dateField] || '')).getTime();
    if (bTime !== aTime) return bTime - aTime;
    return b.revisionNo - a.revisionNo;
  });
};

export const useInventoryStore = create<InventoryStore>((set) => ({
  storeInRecords: [],
  eligibleStoreInItems: [],
  productionRecords: [],
  eligibleProductionItems: [],

  fetchRecords: async () => {
    const res = await fetch(`${API_BASE}/store-in`, { headers: getHeaders() });
    if (!res.ok) throw new Error(await res.text() || 'Failed to fetch store-in records');
    const data: StoreInRecord[] = await res.json();
    set({ storeInRecords: sortByDateAndRevision(data, 'cutInDate') });
  },

  fetchEligibleStoreInItems: async () => {
    const res = await fetch(`${API_BASE}/eligible-store-in`, { headers: getHeaders() });
    if (!res.ok) throw new Error(await res.text() || 'Failed to fetch eligible store-in items');
    const data: EligibleStoreInItem[] = await res.json();
    set({ eligibleStoreInItems: data });
  },

  addStoreInRecord: async (record) => {
    const res = await fetch(`${API_BASE}/store-in`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(record),
    });
    if (!res.ok) throw new Error(await res.text() || 'Failed to create store-in record');
    const saved: StoreInRecord = await res.json();
    set((state) => ({
      storeInRecords: sortByDateAndRevision([saved, ...state.storeInRecords], 'cutInDate'),
    }));
    return saved;
  },

  updateStoreInRecord: async (id, updatedRecord) => {
    const res = await fetch(`${API_BASE}/store-in/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(updatedRecord),
    });
    if (!res.ok) throw new Error(await res.text() || 'Failed to update store-in record');
    set((state) => ({
      storeInRecords: sortByDateAndRevision(
        state.storeInRecords.map((rec) => (rec.id === id ? updatedRecord : rec)),
        'cutInDate'
      ),
    }));
  },

  deleteStoreInRecord: async (id) => {
    const res = await fetch(`${API_BASE}/store-in/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error(await res.text() || 'Failed to delete store-in record');
    set((state) => ({
      storeInRecords: state.storeInRecords.filter((rec) => rec.id !== id),
    }));
  },

  fetchProductionRecords: async () => {
    const res = await fetch(`${API_BASE}/production`, { headers: getHeaders() });
    if (!res.ok) throw new Error(await res.text() || 'Failed to fetch production records');
    const data: StoreProductionRecord[] = await res.json();
    set({ productionRecords: sortByDateAndRevision(data, 'issueDate') });
  },

  fetchEligibleProductionItems: async () => {
    const res = await fetch(`${API_BASE}/eligible-production`, { headers: getHeaders() });
    if (!res.ok) throw new Error(await res.text() || 'Failed to fetch eligible production items');
    const data: EligibleProductionItem[] = await res.json();
    set({ eligibleProductionItems: data });
  },

  addProductionRecord: async (record) => {
    const res = await fetch(`${API_BASE}/production`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(record),
    });
    if (!res.ok) throw new Error(await res.text() || 'Failed to create production record');
    const saved: StoreProductionRecord = await res.json();
    set((state) => ({
      productionRecords: sortByDateAndRevision([saved, ...state.productionRecords], 'issueDate'),
    }));
    return saved;
  },

  updateProductionRecord: async (id, updatedRecord) => {
    const res = await fetch(`${API_BASE}/production/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(updatedRecord),
    });
    if (!res.ok) throw new Error(await res.text() || 'Failed to update production record');
    set((state) => ({
      productionRecords: sortByDateAndRevision(
        state.productionRecords.map((rec) => (rec.id === id ? updatedRecord : rec)),
        'issueDate'
      ),
    }));
  },

  deleteProductionRecord: async (id) => {
    const res = await fetch(`${API_BASE}/production/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error(await res.text() || 'Failed to delete production record');
    set((state) => ({
      productionRecords: state.productionRecords.filter((rec) => rec.id !== id),
    }));
  },
}));