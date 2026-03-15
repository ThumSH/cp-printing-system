import { create } from 'zustand';

export type AuditStatus = 'Pending' | 'Pass' | 'Fail';

export interface AuditBundle {
  id: string;
  bundleNo: string;
  size: string;
  qty: number;
}

export interface EligibleAuditItem {
  deliveryTrackerReportId: string;
  adviceNoteId: string;
  productionRecordId: string;
  storeInRecordId: string;
  submissionId: string;
  revisionNo: number;
  styleNo: string;
  customerName: string;
  scheduleNo: string;
  cutNo: string;
  adNo: string;
  deliveryStatus: string;
  deliveryQty: number;
  remainingAuditQty: number;
  createdAt: string;
}

export interface AuditRecord {
  id: string;
  deliveryTrackerReportId: string;
  adviceNoteId: string;
  productionRecordId: string;
  storeInRecordId: string;
  submissionId: string;
  revisionNo: number;
  date: string;
  styleNo: string;
  customerName: string;
  scheduleNo: string;
  cutNo: string;
  colour: string;
  adNo: string;
  deliveryStatus: string;
  bundles: AuditBundle[];
  sizes: string;
  totalQty: number;
  auditQty: number;
  status: AuditStatus;
  auditorName: string;
  remarks: string;
}

interface AuditStore {
  auditRecords: AuditRecord[];
  eligibleAuditItems: EligibleAuditItem[];
  fetchAuditRecords: () => Promise<void>;
  fetchEligibleAuditItems: () => Promise<void>;
  addAuditRecord: (
    record: Omit<
      AuditRecord,
      | 'id'
      | 'adviceNoteId'
      | 'productionRecordId'
      | 'storeInRecordId'
      | 'submissionId'
      | 'revisionNo'
      | 'styleNo'
      | 'customerName'
      | 'scheduleNo'
      | 'cutNo'
      | 'colour'
      | 'adNo'
      | 'deliveryStatus'
      | 'totalQty'
    >
  ) => Promise<AuditRecord>;
  updateAuditRecord: (id: string, record: AuditRecord) => Promise<void>;
  updateAuditStatus: (
    id: string,
    status: AuditStatus,
    remarks: string,
    auditorName: string
  ) => Promise<void>;
  deleteAuditRecord: (id: string) => Promise<void>;
}

const API_BASE = 'http://localhost:5000/api/audit';

const getHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token')}`,
});

const sortAuditRecords = (records: AuditRecord[]) => {
  return [...records].sort((a, b) => {
    const bTime = new Date(b.date).getTime();
    const aTime = new Date(a.date).getTime();
    if (bTime !== aTime) return bTime - aTime;
    return b.revisionNo - a.revisionNo;
  });
};

export const useAuditStore = create<AuditStore>((set) => ({
  auditRecords: [],
  eligibleAuditItems: [],

  fetchAuditRecords: async () => {
    try {
      const res = await fetch(`${API_BASE}/records`, {
        headers: getHeaders(),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || 'Failed to fetch audit records');
      }

      const data: AuditRecord[] = await res.json();

      set({
        auditRecords: sortAuditRecords(data),
      });
    } catch (error) {
      console.error('Failed to fetch audit records:', error);
      throw error;
    }
  },

  fetchEligibleAuditItems: async () => {
    try {
      const res = await fetch(`${API_BASE}/eligible-audits`, {
        headers: getHeaders(),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || 'Failed to fetch eligible audit items');
      }

      const data: EligibleAuditItem[] = await res.json();

      set({
        eligibleAuditItems: data,
      });
    } catch (error) {
      console.error('Failed to fetch eligible audit items:', error);
      throw error;
    }
  },

  addAuditRecord: async (record) => {
    try {
      const res = await fetch(`${API_BASE}/records`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(record),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || 'Failed to create audit record');
      }

      const saved: AuditRecord = await res.json();

      set((state) => ({
        auditRecords: sortAuditRecords([saved, ...state.auditRecords]),
      }));

      return saved;
    } catch (error) {
      console.error('Failed to create audit record:', error);
      throw error;
    }
  },

  updateAuditRecord: async (id, updatedRecord) => {
    try {
      const res = await fetch(`${API_BASE}/records/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(updatedRecord),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || 'Failed to update audit record');
      }

      set((state) => ({
        auditRecords: sortAuditRecords(
          state.auditRecords.map((rec) => (rec.id === id ? updatedRecord : rec))
        ),
      }));
    } catch (error) {
      console.error('Failed to update audit record:', error);
      throw error;
    }
  },

  updateAuditStatus: async (id, status, remarks, auditorName) => {
    try {
      const res = await fetch(`${API_BASE}/records/${id}/status`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ status, remarks, auditorName }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || 'Failed to update audit status');
      }

      set((state) => ({
        auditRecords: state.auditRecords.map((rec) =>
          rec.id === id ? { ...rec, status, remarks, auditorName } : rec
        ),
      }));
    } catch (error) {
      console.error('Failed to update audit status:', error);
      throw error;
    }
  },

  deleteAuditRecord: async (id) => {
    try {
      const res = await fetch(`${API_BASE}/records/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || 'Failed to delete audit record');
      }

      set((state) => ({
        auditRecords: state.auditRecords.filter((rec) => rec.id !== id),
      }));
    } catch (error) {
      console.error('Failed to delete audit record:', error);
      throw error;
    }
  },
}));