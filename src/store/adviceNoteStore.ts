import { create } from 'zustand';
import { API, getAuthHeaders } from '../api/client';

// ==========================================
// TYPES
// ==========================================

export interface AdviceNoteRow {
  productionRecordId: string;
  colour: string;
  bundleNo: string;
  size: string;
  cutForm: string;
  component: string;
  totalPcs: number;
  pd: number;
  fd: number;
  goodQty: number;
}

export interface GatepassBundleInfo {
  bundleNo: string;
  bundleQty: number;
  size: string;
  numberRange: string;
}

export interface GatepassCutInfo {
  cutNo: string;
  cutQty: number;
  part: string;
  bundles: GatepassBundleInfo[];
}

export interface EligibleGatepassItem {
  productionRecordId: string;
  storeInRecordId: string;
  submissionId: string;
  revisionNo: number;
  styleNo: string;
  customerName: string;
  components: string;
  cutNo: string;
  issueDate: string;
  lineNo: string;
  issueQty: number;
  remainingDispatchQty: number;
  scheduleNo: string;
  jobNo: string;
  bodyColour: string;
  printColour: string;
  season: string;
  cuts: GatepassCutInfo[];
}

export interface AdviceNoteRecord {
  id: string;
  productionRecordId: string;
  storeInRecordId: string;
  submissionId: string;
  revisionNo: number;
  adNo: string;
  deliveryDate: string;
  attn: string;
  customerName: string;
  styleNo: string;
  address: string;
  scheduleNo: string;
  jobNo: string;
  cutNo: string;
  component: string;
  dispatchQty: number;
  balanceQty: number;
  rows: Record<string, AdviceNoteRow>;
  receivedByName: string;
  prepByName: string;
  authByName: string;
  remarks: string;
}

// ==========================================
// STORE
// ==========================================

interface AdviceNoteStore {
  adviceNotes: AdviceNoteRecord[];
  eligibleDispatchItems: EligibleGatepassItem[];
  loading: boolean;
  error: string;

  fetchAdviceNotes: () => Promise<void>;
  fetchEligibleDispatchItems: () => Promise<void>;
  addAdviceNote: (note: Partial<AdviceNoteRecord>) => Promise<AdviceNoteRecord>;
  updateAdviceNote: (id: string, note: AdviceNoteRecord) => Promise<void>;
  deleteAdviceNote: (id: string) => Promise<void>;
}

const API_BASE = API.GATEPASS;

// FIX: Use string comparison instead of new Date() to avoid timezone-shifted dates
// yyyy-MM-dd strings sort correctly lexicographically
const sortAdviceNotes = (notes: AdviceNoteRecord[]) =>
  [...notes].sort((a, b) => {
    const dateDiff = b.deliveryDate.localeCompare(a.deliveryDate);
    if (dateDiff !== 0) return dateDiff;
    return b.revisionNo - a.revisionNo;
  });

export const useAdviceNoteStore = create<AdviceNoteStore>((set, get) => ({
  adviceNotes:           [],
  eligibleDispatchItems: [],
  loading:               false,
  error:                 '',

  fetchAdviceNotes: async () => {
    set({ loading: true, error: '' });
    try {
      const res = await fetch(`${API_BASE}/advicenotes`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error(await res.text() || `HTTP ${res.status}`);
      const data: AdviceNoteRecord[] = await res.json();
      set({ adviceNotes: sortAdviceNotes(data) });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to fetch advice notes';
      set({ error: msg });
      throw e;
    } finally {
      set({ loading: false });
    }
  },

  fetchEligibleDispatchItems: async () => {
    set({ loading: true, error: '' });
    try {
      const res = await fetch(`${API_BASE}/eligible-dispatch`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error(await res.text() || `HTTP ${res.status}`);
      const data: EligibleGatepassItem[] = await res.json();
      set({ eligibleDispatchItems: data });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to fetch eligible dispatch items';
      set({ error: msg });
      throw e;
    } finally {
      set({ loading: false });
    }
  },

  addAdviceNote: async (note) => {
    const res = await fetch(`${API_BASE}/advicenotes`, {
      method:  'POST',
      headers: getAuthHeaders(),
      body:    JSON.stringify(note),
    });
    if (!res.ok) throw new Error(await res.text() || 'Failed to create advice note');
    const saved: AdviceNoteRecord = await res.json();
    set((state) => ({ adviceNotes: sortAdviceNotes([saved, ...state.adviceNotes]) }));
    // FIX: Re-fetch eligible dispatch items so remaining qty updates immediately
    get().fetchEligibleDispatchItems().catch(console.error);
    return saved;
  },

  updateAdviceNote: async (id, updatedNote) => {
    const res = await fetch(`${API_BASE}/advicenotes/${id}`, {
      method:  'PUT',
      headers: getAuthHeaders(),
      body:    JSON.stringify(updatedNote),
    });
    if (!res.ok) throw new Error(await res.text() || 'Failed to update advice note');
    // Backend PUT returns 204 NoContent — re-fetch all notes to get server-computed balanceQty
    const allRes = await fetch(`${API_BASE}/advicenotes`, { headers: getAuthHeaders() });
    if (allRes.ok) {
      const data: AdviceNoteRecord[] = await allRes.json();
      set({ adviceNotes: sortAdviceNotes(data) });
    } else {
      // Fallback: optimistic update with sent data
      set((state) => ({
        adviceNotes: sortAdviceNotes(state.adviceNotes.map(n => n.id === id ? updatedNote : n)),
      }));
    }
    // Eligible dispatch may have changed
    get().fetchEligibleDispatchItems().catch(console.error);
  },

  deleteAdviceNote: async (id) => {
    const res = await fetch(`${API_BASE}/advicenotes/${id}`, {
      method:  'DELETE',
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error(await res.text() || 'Failed to delete advice note');
    set((state) => ({ adviceNotes: state.adviceNotes.filter(n => n.id !== id) }));
    // FIX: Re-fetch eligible so dispatch qty becomes available again
    get().fetchEligibleDispatchItems().catch(console.error);
  },
}));