
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
  remainingBulkQty: number;
}

export interface BundleResponse {
  id: string;
  bundleNo: string;
  bundleOrder?: number;
  bundleQty: number;
  size: string;
  numberRange: string;
}

export interface CutResponse {
  id: string;
  cutNo: string;
  cutQty: number;
  submissionId: string;
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

  inAdNo: string;

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
  component: string;
  bodyColour: string;
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
  bundleOrder?: number;
  bundleQty: number;
  size: string;
  numberRange: string;
}

export interface CreateCutInput {
  cutNo: string;
  cutQty: number;
  submissionId: string;
  bundles: CreateBundleInput[];
}

export interface CreateStoreInInput {
  submissionId: string;

  inAdNo: string;

  scheduleNo: string;
  cutInDate: string;
  inQty: number;
  cuts: CreateCutInput[];
}

// ==========================================
// PRODUCTION types
// ==========================================

export interface ProductionCutInfo {
  cutRecordId: string;
  cutNo: string;
  cutQty: number;
  part: string;
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

const sortByDateAndRevision = (records: StoreInRecord[]) =>
  [...records].sort((a, b) => {
    // Safe lexicographic sort on yyyy-MM-dd strings
    const dateDiff = b.cutInDate.localeCompare(a.cutInDate);
    if (dateDiff !== 0) return dateDiff;
    return b.revisionNo - a.revisionNo;
  });

export const useInventoryStore = create<InventoryStore>((set, get) => ({
  storeInRecords:          [],
  eligibleStoreInItems:    [],
  bulkBalances:            [],
  productionRecords:       [],
  eligibleProductionItems: [],

  // ── STORE IN ──────────────────────────────────────────────────────────────

  fetchRecords: async () => {
    const res = await fetch(`${API_BASE}/store-in`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error(await res.text() || 'Failed to fetch store-in records');
    const data: StoreInRecord[] = await res.json();
    set({ storeInRecords: sortByDateAndRevision(data) });
  },

  fetchEligibleStoreInItems: async () => {
    const res = await fetch(`${API_BASE}/eligible-store-in`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error(await res.text() || 'Failed to fetch eligible store-in items');
    const data: EligibleStoreInItem[] = await res.json();
    set({ eligibleStoreInItems: data });
  },

  fetchBulkBalances: async () => {
    const res = await fetch(`${API_BASE}/bulk-balance`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error(await res.text() || 'Failed to fetch bulk balances');
    const data: BulkBalance[] = await res.json();
    set({ bulkBalances: data });
  },

  addStoreInRecord: async (input) => {
    const res = await fetch(`${API_BASE}/store-in`, {
      method:  'POST',
      headers: getAuthHeaders(),
      body:    JSON.stringify(input),
    });
    if (!res.ok) throw new Error(await res.text() || 'Failed to create store-in record');
    const saved: StoreInRecord = await res.json();
    set((state) => ({
      storeInRecords: sortByDateAndRevision([saved, ...state.storeInRecords]),
    }));
    // FIX: Re-fetch eligible list so saved item no longer appears as available
    get().fetchEligibleStoreInItems().catch(console.error);
    return saved;
  },

  updateStoreInRecord: async (id, input) => {
    const res = await fetch(`${API_BASE}/store-in/${id}`, {
      method:  'PUT',
      headers: getAuthHeaders(),
      body:    JSON.stringify(input),
    });
    if (!res.ok) throw new Error(await res.text() || 'Failed to update store-in record');
    // Re-fetch the single updated record to get fresh server-computed fields
    const detailRes = await fetch(`${API_BASE}/store-in/${id}`, { headers: getAuthHeaders() });
    if (detailRes.ok) {
      const updated: StoreInRecord = await detailRes.json();
      set((state) => ({
        storeInRecords: sortByDateAndRevision(
          state.storeInRecords.map(r => r.id === id ? updated : r)
        ),
      }));
    }
    // Eligible list may have changed due to qty updates
    get().fetchEligibleStoreInItems().catch(console.error);
  },

  deleteStoreInRecord: async (id) => {
    const res = await fetch(`${API_BASE}/store-in/${id}`, {
      method:  'DELETE',
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error(await res.text() || 'Failed to delete store-in record');
    set((state) => ({
      storeInRecords: state.storeInRecords.filter(r => r.id !== id),
    }));
    // FIX: Re-fetch eligible list so deleted item reappears as available
    get().fetchEligibleStoreInItems().catch(console.error);
  },

  // ── PRODUCTION ────────────────────────────────────────────────────────────

  fetchProductionRecords: async () => {
    const res = await fetch(`${API_BASE}/production`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error(await res.text() || 'Failed to fetch production records');
    const data: StoreProductionRecord[] = await res.json();
    set({ productionRecords: data });
  },

  fetchEligibleProductionItems: async () => {
    const res = await fetch(`${API_BASE}/eligible-production`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error(await res.text() || 'Failed to fetch eligible production items');
    const data: EligibleProductionItem[] = await res.json();
    set({ eligibleProductionItems: data });
  },

  addProductionRecord: async (record) => {
    const res = await fetch(`${API_BASE}/production`, {
      method:  'POST',
      headers: getAuthHeaders(),
      body:    JSON.stringify(record),
    });
    if (!res.ok) throw new Error(await res.text() || 'Failed to create production record');
    const saved: StoreProductionRecord = await res.json();
    set((state) => ({ productionRecords: [saved, ...state.productionRecords] }));
    // Re-fetch eligible so available qty updates
    get().fetchEligibleProductionItems().catch(console.error);
    return saved;
  },

  batchAddProductionRecords: async (records) => {
    const res = await fetch(`${API_BASE}/production/batch`, {
      method:  'POST',
      headers: getAuthHeaders(),
      body:    JSON.stringify(records),
    });
    if (!res.ok) throw new Error(await res.text() || 'Failed to create production records');
    const saved: StoreProductionRecord[] = await res.json();
    set((state) => ({ productionRecords: [...saved, ...state.productionRecords] }));
    // FIX: Re-fetch eligible so issued cuts no longer appear as available
    get().fetchEligibleProductionItems().catch(console.error);
    return saved;
  },

  updateProductionRecord: async (id, record) => {
    const res = await fetch(`${API_BASE}/production/${id}`, {
      method:  'PUT',
      headers: getAuthHeaders(),
      body:    JSON.stringify(record),
    });
    if (!res.ok) throw new Error(await res.text() || 'Failed to update production record');
    set((state) => ({
      productionRecords: state.productionRecords.map(r => r.id === id ? record : r),
    }));
    // Available qty changed — refresh eligible
    get().fetchEligibleProductionItems().catch(console.error);
  },

  deleteProductionRecord: async (id) => {
    const res = await fetch(`${API_BASE}/production/${id}`, {
      method:  'DELETE',
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error(await res.text() || 'Failed to delete production record');
    set((state) => ({
      productionRecords: state.productionRecords.filter(r => r.id !== id),
    }));
    // FIX: Re-fetch eligible so qty returns to available pool
    get().fetchEligibleProductionItems().catch(console.error);
  },
}));