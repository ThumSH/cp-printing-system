// src/store/adviceNoteStore.ts
import { create } from 'zustand';

// ==========================================
// TYPES
// ==========================================

export interface AdviceNoteRow {
  productionRecordId: string;
  colour: string;
  bundleNo: string;
  size: string;
  cutForm: string;
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
  // Enriched from Store-In
  scheduleNo: string;
  bodyColour: string;
  printColour: string;
  season: string;
  // Cuts and bundles
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
  fetchAdviceNotes: () => Promise<void>;
  fetchEligibleDispatchItems: () => Promise<void>;
  addAdviceNote: (note: Partial<AdviceNoteRecord>) => Promise<AdviceNoteRecord>;
  updateAdviceNote: (id: string, note: AdviceNoteRecord) => Promise<void>;
  deleteAdviceNote: (id: string) => Promise<void>;
}

const API_BASE = 'http://localhost:5000/api/gatepass';

const getHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token')}`,
});

const sortAdviceNotes = (notes: AdviceNoteRecord[]) => {
  return [...notes].sort((a, b) => {
    const bTime = new Date(b.deliveryDate).getTime();
    const aTime = new Date(a.deliveryDate).getTime();
    if (bTime !== aTime) return bTime - aTime;
    return b.revisionNo - a.revisionNo;
  });
};

export const useAdviceNoteStore = create<AdviceNoteStore>((set) => ({
  adviceNotes: [],
  eligibleDispatchItems: [],

  fetchAdviceNotes: async () => {
    const res = await fetch(`${API_BASE}/advicenotes`, { headers: getHeaders() });
    if (!res.ok) throw new Error(await res.text() || 'Failed to fetch advice notes');
    const data: AdviceNoteRecord[] = await res.json();
    set({ adviceNotes: sortAdviceNotes(data) });
  },

  fetchEligibleDispatchItems: async () => {
    const res = await fetch(`${API_BASE}/eligible-dispatch`, { headers: getHeaders() });
    if (!res.ok) throw new Error(await res.text() || 'Failed to fetch eligible dispatch items');
    const data: EligibleGatepassItem[] = await res.json();
    set({ eligibleDispatchItems: data });
  },

  addAdviceNote: async (note) => {
    const res = await fetch(`${API_BASE}/advicenotes`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(note),
    });
    if (!res.ok) throw new Error(await res.text() || 'Failed to create advice note');
    const saved: AdviceNoteRecord = await res.json();
    set((state) => ({ adviceNotes: sortAdviceNotes([saved, ...state.adviceNotes]) }));
    return saved;
  },

  updateAdviceNote: async (id, updatedNote) => {
    const res = await fetch(`${API_BASE}/advicenotes/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(updatedNote),
    });
    if (!res.ok) throw new Error(await res.text() || 'Failed to update advice note');
    set((state) => ({
      adviceNotes: sortAdviceNotes(state.adviceNotes.map((n) => (n.id === id ? updatedNote : n))),
    }));
  },

  deleteAdviceNote: async (id) => {
    const res = await fetch(`${API_BASE}/advicenotes/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error(await res.text() || 'Failed to delete advice note');
    set((state) => ({ adviceNotes: state.adviceNotes.filter((n) => n.id !== id) }));
  },
}));