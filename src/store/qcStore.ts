// src/store/qcStore.ts
import { create } from 'zustand';

export interface CPIRowData {
  storeInRecordId: string;
  part: string;
  sampleSize: string;
  defectedBefore: string;
  defectedAfter: string;
  remarks: string;
}

export interface EligibleCpiItem {
  storeInRecordId: string;
  submissionId: string;
  revisionNo: number;
  styleNo: string;
  customerName: string;
  scheduleNo: string;
  cutNo: string;
  bodyColour: string;
  printColour: string;
  components: string;
  season: string;
  receivedQty: number;
  cutInDate: string;
  size: string;
  bundleQty: number;
  numberRange: string;
}

export type InspectionStatus = 'Pending' | 'Passed' | 'Failed';

export interface CPIReport {
  id: string;
  storeInRecordId: string;
  submissionId: string;
  revisionNo: number;
  date: string;
  customer: string;
  styleNo: string;
  scheduleNo: string;
  bodyColour: string;
  printColour: string;
  receivedQty: number;
  cpiQty: number;
  inspectionRows: Record<string, CPIRowData>;
  cuttingQty: number;
  checkedQty: number;
  rejDamageQty: number;
  rejectionPercentage: string;
  balanceQty: number;
  inspectionStatus: InspectionStatus;
  appRej: string;
  checkedBy: string;
  summaryDate: string;
}

interface QCStore {
  cpiReports: CPIReport[];
  eligibleCpiItems: EligibleCpiItem[];
  fetchReports: () => Promise<void>;
  fetchEligibleCpiItems: () => Promise<void>;
  addCPIReport: (report: CPIReport) => Promise<CPIReport>;
  updateCPIReport: (id: string, report: CPIReport) => Promise<void>;
  deleteCPIReport: (id: string) => Promise<void>;
}

const API_BASE = 'http://localhost:5000/api/qc';

const getHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token')}`,
});

const sortReports = (reports: CPIReport[]) => {
  return [...reports].sort((a, b) => {
    const bTime = new Date(b.date).getTime();
    const aTime = new Date(a.date).getTime();

    if (bTime !== aTime) return bTime - aTime;
    return b.revisionNo - a.revisionNo;
  });
};

export const useQCStore = create<QCStore>((set) => ({
  cpiReports: [],
  eligibleCpiItems: [],

  fetchReports: async () => {
    try {
      const res = await fetch(`${API_BASE}/reports`, {
        headers: getHeaders(),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || 'Failed to fetch QC reports');
      }

      const data: CPIReport[] = await res.json();

      set({
        cpiReports: sortReports(data),
      });
    } catch (error) {
      console.error('Failed to fetch QC reports:', error);
      throw error;
    }
  },

  fetchEligibleCpiItems: async () => {
    try {
      const res = await fetch(`${API_BASE}/eligible-cpi`, {
        headers: getHeaders(),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || 'Failed to fetch eligible CPI items');
      }

      const data: EligibleCpiItem[] = await res.json();

      set({
        eligibleCpiItems: data,
      });
    } catch (error) {
      console.error('Failed to fetch eligible CPI items:', error);
      throw error;
    }
  },

  addCPIReport: async (report) => {
    try {
      const res = await fetch(`${API_BASE}/reports`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(report),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || 'Failed to create CPI report');
      }

      const saved: CPIReport = await res.json();

      set((state) => ({
        cpiReports: sortReports([saved, ...state.cpiReports]),
      }));

      return saved;
    } catch (error) {
      console.error('Failed to create CPI report:', error);
      throw error;
    }
  },

  updateCPIReport: async (id, updatedReport) => {
    try {
      const res = await fetch(`${API_BASE}/reports/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(updatedReport),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || 'Failed to update CPI report');
      }

      set((state) => ({
        cpiReports: sortReports(
          state.cpiReports.map((r) => (r.id === id ? updatedReport : r))
        ),
      }));
    } catch (error) {
      console.error('Failed to update CPI report:', error);
      throw error;
    }
  },

  deleteCPIReport: async (id) => {
    try {
      const res = await fetch(`${API_BASE}/reports/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || 'Failed to delete CPI report');
      }

      set((state) => ({
        cpiReports: state.cpiReports.filter((r) => r.id !== id),
      }));
    } catch (error) {
      console.error('Failed to delete CPI report:', error);
      throw error;
    }
  },
}));