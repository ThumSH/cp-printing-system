// src/store/qcStore.ts
// FIXES:
//   - Endpoint mismatch fixed: fetchEligibleCpiItems now calls `/eligible-cpi` instead of `/eligible`

import { create } from 'zustand';
import { API, getAuthHeaders } from '../api/client';

// ==========================================
// DEFECT TYPES (fixed, F1-F13 + Other)
// ==========================================
export const DEFECT_TYPES = [
  { code: 'F1',    name: 'Panel Shrinkage' },
  { code: 'F2',    name: 'Fabric colour variation' },
  { code: 'F3',    name: 'Crush mark' },
  { code: 'F4',    name: 'Shape out panel' },
  { code: 'F5',    name: 'Dust mark' },
  { code: 'F6',    name: 'Stain marks / Oil marks' },
  { code: 'F7',    name: 'Cut holes' },
  { code: 'F8',    name: 'Needle marks' },
  { code: 'F9',    name: 'Incorrect part' },
  { code: 'F10',   name: 'Numbering stickers missing' },
  { code: 'F11',   name: 'Numbering stickers mixed-up' },
  { code: 'F12',   name: 'Size mixed-up' },
  { code: 'F13',   name: 'Wrong Cut Mark' },
  { code: 'Other', name: 'Other' },
];

export interface DefectRow {
  defectCode: string;
  defectName: string;
  check: string;
  beforeLength: number;
  beforeWidth: number;
  afterLength: number;
  afterWidth: number;
  defectedQty: number;
  percentage: string;
  remarks: string;
  sampleSize?: number; 
}

export interface CutInspection {
  cutRecordId?: string;
  cutNo: string;
  cutQty: number;
  bundleNos: string;
  sizes: string;
  numberRanges: string;
  part: string;
  sampleSize: number;
  defectRows: DefectRow[];
  totalDefectedQty: number;
  totalPercentage: string;
}

export interface CPIReport {
  id: string;
  storeInRecordId: string;
  submissionId?: string;
  revisionNo?: number;
  date: string;
  customer: string;
  styleNo: string;
  scheduleNo?: string;
  bodyColour: string;
  printColour: string;
  receivedQty: number;
  cpiQty: number;
  cutInspections: CutInspection[];
  cuttingQty: number;
  checkedQty: number;
  rejDamageQty: number;
  rejectionPercentage: string;
  balanceQty: number;
  inspectionStatus: string;
  appRej: string;
  checkedBy: string;
  cpiAuditor?: string;
  summaryDate?: string;
}

export interface QCState {
  cpiReports: CPIReport[];
  eligibleCpiItems: any[]; 
  loading: boolean;
  error: string | null;
  fetchReports: () => Promise<void>;
  fetchEligibleCpiItems: () => Promise<void>;
  addCPIReport: (report: Omit<CPIReport, 'id'>) => Promise<void>;
  updateCPIReport: (id: string, updatedReport: CPIReport) => Promise<void>;
  deleteCPIReport: (id: string) => Promise<void>;
}

const API_BASE = API.QC;

// Helper to keep reports sorted
const sortReports = (reports: CPIReport[]) => {
  return [...reports].sort((a, b) => {
    // 1. Sort by date descending
    const dateCmp = (b.date || '').localeCompare(a.date || '');
    if (dateCmp !== 0) return dateCmp;
    // 2. Sort by revision descending
    return (b.revisionNo || 0) - (a.revisionNo || 0);
  });
};

export const useQCStore = create<QCState>((set, get) => ({
  cpiReports: [],
  eligibleCpiItems: [],
  loading: false,
  error: null,

  fetchReports: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`${API_BASE}/reports`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Failed to fetch CPI reports');
      const data: CPIReport[] = await res.json();
      set({ cpiReports: sortReports(data), loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  fetchEligibleCpiItems: async () => {
    try {
      // FIX: Changed from `/eligible` to `/eligible-cpi` to match the backend C# controller
      const res = await fetch(`${API_BASE}/eligible-cpi`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Failed to fetch eligible CPI items');
      const data = await res.json();
      set({ eligibleCpiItems: data });
    } catch (error) {
      console.error('fetchEligibleCpiItems error:', error);
    }
  },

  addCPIReport: async (report) => {
    const res = await fetch(`${API_BASE}/reports`, {
      method:  'POST',
      headers: getAuthHeaders(),
      body:    JSON.stringify(report),
    });
    if (!res.ok) throw new Error(await res.text() || 'Failed to add CPI report');
    const saved = await res.json();
    set((state) => ({ cpiReports: sortReports([saved, ...state.cpiReports]) }));
    // Re-fetch eligible items so the successfully inspected ones leave the "Available" list
    get().fetchEligibleCpiItems().catch(console.error);
    return saved;
  },

  updateCPIReport: async (id, updatedReport) => {
    const res = await fetch(`${API_BASE}/reports/${id}`, {
      method:  'PUT',
      headers: getAuthHeaders(),
      body:    JSON.stringify(updatedReport),
    });
    if (!res.ok) throw new Error(await res.text() || 'Failed to update CPI report');
    // Backend returns 204 NoContent on update, so re-fetch the record
    // to ensure backend-recomputed fields (styleNo, customer, etc.) are current
    const detailRes = await fetch(`${API_BASE}/reports`, { headers: getAuthHeaders() });
    if (detailRes.ok) {
      const all: CPIReport[] = await detailRes.json();
      set({ cpiReports: sortReports(all) });
    } else {
      // Fallback: update with what we sent (may miss backend-recomputed fields)
      set((state) => ({
        cpiReports: sortReports(state.cpiReports.map(r => r.id === id ? updatedReport : r)),
      }));
    }
  },

  deleteCPIReport: async (id) => {
    const res = await fetch(`${API_BASE}/reports/${id}`, {
      method:  'DELETE',
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error(await res.text() || 'Failed to delete CPI report');
    set((state) => ({
      cpiReports: state.cpiReports.filter((r) => r.id !== id),
    }));
    // Re-fetch eligible so deleted items drop back into the "available" list
    get().fetchEligibleCpiItems().catch(console.error);
  },
}));
