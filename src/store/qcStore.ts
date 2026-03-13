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

export interface CPIReport {
  id: string;
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
  appRej: string;
  checkedBy: string;
  summaryDate: string;
}

interface QCStore {
  cpiReports: CPIReport[];
  fetchReports: () => Promise<void>;
  addCPIReport: (report: CPIReport) => Promise<void>;
  updateCPIReport: (id: string, report: CPIReport) => Promise<void>;
  deleteCPIReport: (id: string) => Promise<void>;
}

const API_URL = 'http://localhost:5000/api/qc/reports';

const getHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${localStorage.getItem('token')}`
});

export const useQCStore = create<QCStore>((set) => ({
  cpiReports: [],

  fetchReports: async () => {
    try {
      const res = await fetch(API_URL, { headers: getHeaders() });
      if (res.ok) set({ cpiReports: await res.json() });
    } catch (error) {
      console.error("Failed to fetch QC reports:", error);
    }
  },

  addCPIReport: async (report) => {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(report)
    });
    if (res.ok) {
      const saved = await res.json();
      set((state) => ({ cpiReports: [saved, ...state.cpiReports] }));
    } else {
      console.error("API Rejected CPI Report:", res.status, await res.text());
    }
  },

  updateCPIReport: async (id, updatedReport) => {
    const res = await fetch(`${API_URL}/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(updatedReport)
    });
    if (res.ok) {
      set((state) => ({
        cpiReports: state.cpiReports.map((r) => (r.id === id ? updatedReport : r)),
      }));
    }
  },

  deleteCPIReport: async (id) => {
    const res = await fetch(`${API_URL}/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    if (res.ok) {
      set((state) => ({
        cpiReports: state.cpiReports.filter((r) => r.id !== id),
      }));
    }
  },
}));