// src/store/inventoryStore.ts
import { create } from 'zustand';
import { API, getAuthHeaders } from '../api/client';

// ==========================================
// TYPES — matches backend DTOs
// ==========================================

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
  remainingBulkQty: number; // NEW: global bulk balance
}

export interface BundleResponse {
  id: string;
  bundleNo: string;
  bundleQty: number;
  size: string;
  numberRange: string;
}

export interface CutResponse {
  id: string;
  cutNo: string;
  cutQty: number;
  bundles: BundleResponse[];
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
  scheduleNo: string;
  cutInDate: string;
  bulkQty: number;
  inQty: number;
  balanceBulkQty: number;
  totalCutQty: number;
  uncutBalance: number;
  availableQty: number;
  cuts: CutResponse[];
}

export interface BulkBalance {
  submissionId: string;
  styleNo: string;
  customerName: string;
  approvedBulkQty: number;
  totalInQty: number;
  remainingBulkQty: number;
  entryCount: number;
}

// ==========================================
// CREATE REQUEST — sent to backend
// ==========================================

export interface CreateBundleInput {
  bundleNo: string;
  bundleQty: number;
  size: string;
  numberRange: string;
}

export interface CreateCutInput {
  cutNo: string;
  cutQty: number;
  bundles: CreateBundleInput[];
}

export interface CreateStoreInInput {
  submissionId: string;
  scheduleNo: string;
  cutInDate: string;
  inQty: number;
  cuts: CreateCutInput[];
}

// ==========================================
// PRODUCTION types (unchanged)
// ==========================================

export interface ProductionCutInfo {
  cutRecordId: string;
  cutNo: string;
  cutQty: number;
  alreadyIssued: number;
  availableQty: number;
}

export interface EligibleProductionItem {
  storeInRecordId: string;
  submissionId: string;
  revisionNo: number;
  styleNo: string;
  customerName: string;
  components: string;
  scheduleNo: string;
  bodyColour: string;
  printColour: string;
  season: string;
  bulkQty: number;
  bulkBalance: number;
  totalAvailableQty: number;
  inspectionStatus: string;
  checkedBy: string;
  summaryDate: string;
  cuts: ProductionCutInfo[];
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

// ==========================================
// STORE
// ==========================================

interface InventoryStore {
  storeInRecords: StoreInRecord[];
  eligibleStoreInItems: EligibleStoreInItem[];
  bulkBalances: BulkBalance[];
  productionRecords: StoreProductionRecord[];
  eligibleProductionItems: EligibleProductionItem[];

  fetchRecords: () => Promise<void>;
  fetchEligibleStoreInItems: () => Promise<void>;
  fetchBulkBalances: () => Promise<void>;
  addStoreInRecord: (input: CreateStoreInInput) => Promise<StoreInRecord>;
  updateStoreInRecord: (id: string, input: CreateStoreInInput) => Promise<void>;
  deleteStoreInRecord: (id: string) => Promise<void>;

  fetchProductionRecords: () => Promise<void>;
  fetchEligibleProductionItems: () => Promise<void>;
  addProductionRecord: (record: Partial<StoreProductionRecord>) => Promise<StoreProductionRecord>;
  batchAddProductionRecords: (records: Partial<StoreProductionRecord>[]) => Promise<StoreProductionRecord[]>;
  updateProductionRecord: (id: string, record: StoreProductionRecord) => Promise<void>;
  deleteProductionRecord: (id: string) => Promise<void>;
}

const API_BASE = API.INVENTORY;
 
const getHeaders = getAuthHeaders;

const sortByDateAndRevision = (records: StoreInRecord[]) => {
  return [...records].sort((a, b) => {
    const bTime = new Date(b.cutInDate).getTime();
    const aTime = new Date(a.cutInDate).getTime();
    if (bTime !== aTime) return bTime - aTime;
    return b.revisionNo - a.revisionNo;
  });
};

export const useInventoryStore = create<InventoryStore>((set) => ({
  storeInRecords: [],
  eligibleStoreInItems: [],
  bulkBalances: [],
  productionRecords: [],
  eligibleProductionItems: [],

  // --- STORE IN ---

  fetchRecords: async () => {
    const res = await fetch(`${API_BASE}/store-in`, { headers: getHeaders() });
    if (!res.ok) throw new Error(await res.text() || 'Failed to fetch store-in records');
    const data: StoreInRecord[] = await res.json();
    set({ storeInRecords: sortByDateAndRevision(data) });
  },

  fetchEligibleStoreInItems: async () => {
    const res = await fetch(`${API_BASE}/eligible-store-in`, { headers: getHeaders() });
    if (!res.ok) throw new Error(await res.text() || 'Failed to fetch eligible store-in items');
    const data: EligibleStoreInItem[] = await res.json();
    set({ eligibleStoreInItems: data });
  },

  fetchBulkBalances: async () => {
    const res = await fetch(`${API_BASE}/bulk-balance`, { headers: getHeaders() });
    if (!res.ok) throw new Error(await res.text() || 'Failed to fetch bulk balances');
    const data: BulkBalance[] = await res.json();
    set({ bulkBalances: data });
  },

  addStoreInRecord: async (input) => {
    const res = await fetch(`${API_BASE}/store-in`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(input),
    });
    if (!res.ok) throw new Error(await res.text() || 'Failed to create store-in record');
    const saved: StoreInRecord = await res.json();
    set((state) => ({
      storeInRecords: sortByDateAndRevision([saved, ...state.storeInRecords]),
    }));
    return saved;
  },

  updateStoreInRecord: async (id, input) => {
    const res = await fetch(`${API_BASE}/store-in/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(input),
    });
    if (!res.ok) throw new Error(await res.text() || 'Failed to update store-in record');
    // Re-fetch to get updated children
    const detailRes = await fetch(`${API_BASE}/store-in/${id}`, { headers: getHeaders() });
    if (detailRes.ok) {
      const updated: StoreInRecord = await detailRes.json();
      set((state) => ({
        storeInRecords: sortByDateAndRevision(
          state.storeInRecords.map((rec) => (rec.id === id ? updated : rec))
        ),
      }));
    }
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

  // --- PRODUCTION ---

  fetchProductionRecords: async () => {
    const res = await fetch(`${API_BASE}/production`, { headers: getHeaders() });
    if (!res.ok) throw new Error(await res.text() || 'Failed to fetch production records');
    const data: StoreProductionRecord[] = await res.json();
    set({ productionRecords: data });
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
      productionRecords: [saved, ...state.productionRecords],
    }));
    return saved;
  },

  batchAddProductionRecords: async (records) => {
    const res = await fetch(`${API_BASE}/production/batch`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(records),
    });
    if (!res.ok) throw new Error(await res.text() || 'Failed to create production records');
    const saved: StoreProductionRecord[] = await res.json();
    set((state) => ({
      productionRecords: [...saved, ...state.productionRecords],
    }));
    return saved;
  },

  updateProductionRecord: async (id, record) => {
    const res = await fetch(`${API_BASE}/production/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(record),
    });
    if (!res.ok) throw new Error(await res.text() || 'Failed to update production record');
    set((state) => ({
      productionRecords: state.productionRecords.map((r) => (r.id === id ? record : r)),
    }));
  },

  deleteProductionRecord: async (id) => {
    const res = await fetch(`${API_BASE}/production/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error(await res.text() || 'Failed to delete production record');
    set((state) => ({
      productionRecords: state.productionRecords.filter((r) => r.id !== id),
    }));
  },
}));