import { create } from 'zustand';

export interface AdviceNoteRow {
  productionRecordId: string;
  pd: number;
  fd: number;
  goodQty: number;
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
}

interface AdviceNoteStore {
  adviceNotes: AdviceNoteRecord[];
  eligibleDispatchItems: EligibleGatepassItem[];
  fetchAdviceNotes: () => Promise<void>;
  fetchEligibleDispatchItems: () => Promise<void>;
  addAdviceNote: (
    note: Omit<
      AdviceNoteRecord,
      | 'id'
      | 'storeInRecordId'
      | 'submissionId'
      | 'revisionNo'
      | 'styleNo'
      | 'customerName'
      | 'cutNo'
      | 'component'
      | 'balanceQty'
    >
  ) => Promise<AdviceNoteRecord>;
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
    try {
      const res = await fetch(`${API_BASE}/advicenotes`, {
        headers: getHeaders(),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || 'Failed to fetch advice notes');
      }

      const data: AdviceNoteRecord[] = await res.json();

      set({
        adviceNotes: sortAdviceNotes(data),
      });
    } catch (error) {
      console.error('Failed to fetch advice notes:', error);
      throw error;
    }
  },

  fetchEligibleDispatchItems: async () => {
    try {
      const res = await fetch(`${API_BASE}/eligible-dispatch`, {
        headers: getHeaders(),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || 'Failed to fetch eligible dispatch items');
      }

      const data: EligibleGatepassItem[] = await res.json();

      set({
        eligibleDispatchItems: data,
      });
    } catch (error) {
      console.error('Failed to fetch eligible dispatch items:', error);
      throw error;
    }
  },

  addAdviceNote: async (note) => {
    try {
      const res = await fetch(`${API_BASE}/advicenotes`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(note),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || 'Failed to create advice note');
      }

      const saved: AdviceNoteRecord = await res.json();

      set((state) => ({
        adviceNotes: sortAdviceNotes([saved, ...state.adviceNotes]),
      }));

      return saved;
    } catch (error) {
      console.error('Failed to create advice note:', error);
      throw error;
    }
  },

  updateAdviceNote: async (id, updatedNote) => {
    try {
      const res = await fetch(`${API_BASE}/advicenotes/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(updatedNote),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || 'Failed to update advice note');
      }

      set((state) => ({
        adviceNotes: sortAdviceNotes(
          state.adviceNotes.map((n) => (n.id === id ? updatedNote : n))
        ),
      }));
    } catch (error) {
      console.error('Failed to update advice note:', error);
      throw error;
    }
  },

  deleteAdviceNote: async (id) => {
    try {
      const res = await fetch(`${API_BASE}/advicenotes/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || 'Failed to delete advice note');
      }

      set((state) => ({
        adviceNotes: state.adviceNotes.filter((n) => n.id !== id),
      }));
    } catch (error) {
      console.error('Failed to delete advice note:', error);
      throw error;
    }
  },
}));