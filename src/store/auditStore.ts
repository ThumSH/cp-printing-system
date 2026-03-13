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
  sizes: string;      
  totalQty: number;   
  auditQty: number;   
  status: 'Pending' | 'Pass' | 'Fail';
  remarks: string;
}

interface AuditStore {
  auditRecords: AuditRecord[];
  fetchAuditRecords: () => Promise<void>;
  addAuditRecord: (record: AuditRecord) => Promise<void>;
  updateAuditStatus: (id: string, status: 'Pending' | 'Pass' | 'Fail', remarks: string) => Promise<void>;
  deleteAuditRecord: (id: string) => Promise<void>;
}

const API_URL = 'http://localhost:5000/api/audit/records';

const getHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${localStorage.getItem('token')}`
});

export const useAuditStore = create<AuditStore>((set) => ({
  auditRecords: [],

  fetchAuditRecords: async () => {
    try {
      const res = await fetch(API_URL, { headers: getHeaders() });
      if (res.ok) set({ auditRecords: await res.json() });
    } catch (error) {
      console.error("Failed to fetch audit records:", error);
    }
  },

  addAuditRecord: async (record) => {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(record)
    });
    if (res.ok) {
      const saved = await res.json();
      set((state) => ({ auditRecords: [saved, ...state.auditRecords] }));
    }
  },

  updateAuditStatus: async (id, status, remarks) => {
    // We use the specific PATCH endpoint we created
    const res = await fetch(`${API_URL}/${id}/status`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({ status, remarks })
    });
    if (res.ok) {
      set((state) => ({
        auditRecords: state.auditRecords.map((rec) => 
          rec.id === id ? { ...rec, status, remarks } : rec
        ),
      }));
    }
  },

  deleteAuditRecord: async (id) => {
    const res = await fetch(`${API_URL}/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    if (res.ok) {
      set((state) => ({
        auditRecords: state.auditRecords.filter((rec) => rec.id !== id),
      }));
    }
  },
}));