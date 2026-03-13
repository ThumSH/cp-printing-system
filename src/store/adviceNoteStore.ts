// src/store/adviceNoteStore.ts
import { create } from 'zustand';

export interface AdviceNoteRow {
  storeInRecordId: string;
  pd: number;
  fd: number;
  goodQty: number;
}

export interface AdviceNoteRecord {
  id: string; adNo: string; deliveryDate: string; attn: string;
  styleNo: string; address: string; scheduleNo: string; cutNo: string;
  component: string; rows: Record<string, AdviceNoteRow>;
  receivedByName: string; prepByName: string; authByName: string;
}

interface AdviceNoteStore {
  adviceNotes: AdviceNoteRecord[];
  fetchAdviceNotes: () => Promise<void>;
  addAdviceNote: (note: AdviceNoteRecord) => Promise<void>;
  updateAdviceNote: (id: string, note: AdviceNoteRecord) => Promise<void>;
  deleteAdviceNote: (id: string) => Promise<void>;
}

const API_URL = 'http://localhost:5000/api/gatepass/advicenotes';
const getHeaders = () => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` });

export const useAdviceNoteStore = create<AdviceNoteStore>((set) => ({
  adviceNotes: [],

  fetchAdviceNotes: async () => {
    try {
      const res = await fetch(API_URL, { headers: getHeaders() });
      if (res.ok) set({ adviceNotes: await res.json() });
    } catch (error) {
      console.error("Failed to fetch advice notes:", error);
    }
  },

  addAdviceNote: async (note) => {
    const res = await fetch(API_URL, { method: 'POST', headers: getHeaders(), body: JSON.stringify(note) });
    if (res.ok) {
      const saved = await res.json();
      set((state) => ({ adviceNotes: [saved, ...state.adviceNotes] }));
    }
  },

  updateAdviceNote: async (id, updatedNote) => {
    const res = await fetch(`${API_URL}/${id}`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify(updatedNote) });
    if (res.ok) set((state) => ({ adviceNotes: state.adviceNotes.map((n) => (n.id === id ? updatedNote : n)) }));
  },

  deleteAdviceNote: async (id) => {
    const res = await fetch(`${API_URL}/${id}`, { method: 'DELETE', headers: getHeaders() });
    if (res.ok) set((state) => ({ adviceNotes: state.adviceNotes.filter((n) => n.id !== id) }));
  },
}));