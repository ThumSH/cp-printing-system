// src/store/adviceNoteStore.ts
import { create } from 'zustand';

export interface AdviceNoteRow {
  storeInRecordId: string;
  pd: number; // Print Defect / Panel Defect
  fd: number; // Fabric Defect
  goodQty: number;
}

export interface AdviceNoteRecord {
  id: string;
  adNo: string;
  deliveryDate: string;
  attn: string;
  styleNo: string;
  address: string;
  scheduleNo: string;
  cutNo: string;
  component: string;
  rows: Record<string, AdviceNoteRow>;
  // Footer fields
  receivedByName: string;
  prepByName: string;
  authByName: string;
}

interface AdviceNoteStore {
  adviceNotes: AdviceNoteRecord[];
  addAdviceNote: (note: AdviceNoteRecord) => void;
  updateAdviceNote: (id: string, note: AdviceNoteRecord) => void;
  deleteAdviceNote: (id: string) => void;
}

export const useAdviceNoteStore = create<AdviceNoteStore>((set) => ({
  adviceNotes: [],
  addAdviceNote: (note) => set((state) => ({ adviceNotes: [note, ...state.adviceNotes] })),
  updateAdviceNote: (id, updatedNote) => set((state) => ({
    adviceNotes: state.adviceNotes.map((n) => (n.id === id ? updatedNote : n)),
  })),
  deleteAdviceNote: (id) => set((state) => ({
    adviceNotes: state.adviceNotes.filter((n) => n.id !== id),
  })),
}));