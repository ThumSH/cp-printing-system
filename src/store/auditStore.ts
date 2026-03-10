// src/store/auditStore.ts
import { create } from 'zustand';

export interface AuditBundle {
  id: string;
  bundleNo: string;
  size: string;
  qty: number;
}

export interface AuditRecord {
  id: string;
  date: string;
  styleNo: string;
  scheduleNo: string;
  cutNo: string;
  colour: string;
  bundles: AuditBundle[];
  sizes: string;      // Comma-separated sizes for the summary table
  totalQty: number;   // Sum of all bundle quantities
  auditQty: number;   // Calculated from totalQty
  status: 'Pending' | 'Pass' | 'Fail';
  remarks: string;
}

interface AuditStore {
  auditRecords: AuditRecord[];
  addAuditRecord: (record: AuditRecord) => void;
  updateAuditStatus: (id: string, status: 'Pending' | 'Pass' | 'Fail', remarks: string) => void;
  deleteAuditRecord: (id: string) => void;
}

export const useAuditStore = create<AuditStore>((set) => ({
  auditRecords: [],
  addAuditRecord: (record) => set((state) => ({ 
    auditRecords: [record, ...state.auditRecords] 
  })),
  updateAuditStatus: (id, status, remarks) => set((state) => ({
    auditRecords: state.auditRecords.map((rec) => 
      rec.id === id ? { ...rec, status, remarks } : rec
    ),
  })),
  deleteAuditRecord: (id) => set((state) => ({
    auditRecords: state.auditRecords.filter((rec) => rec.id !== id),
  })),
}));