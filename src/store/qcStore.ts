// src/store/qcStore.ts
import { create } from 'zustand';

// ==========================================
// DEFECT TYPES (fixed, F1-F13 + Other)
// ==========================================
export const DEFECT_TYPES = [
  { code: 'F1', name: 'Panel Shrinkage' },
  { code: 'F2', name: 'Fabric colour variation' },
  { code: 'F3', name: 'Crush mark' },
  { code: 'F4', name: 'Shape out panel' },
  { code: 'F5', name: 'Dust mark' },
  { code: 'F6', name: 'Stain marks / Oil marks' },
  { code: 'F7', name: 'Cut holes' },
  { code: 'F8', name: 'Needle marks' },
  { code: 'F9', name: 'Incorrect part' },
  { code: 'F10', name: 'Numbering stickers missing' },
  { code: 'F11', name: 'Numbering stickers mixed-up' },
  { code: 'F12', name: 'Size mixed-up' },
  { code: 'F13', name: 'Wrong Cut Mark' },
  { code: 'Other', name: 'Other' },
] as const;

// ==========================================
// TYPES
// ==========================================

export interface CpiDefectRow {
  defectCode: string;
  defectName: string;
  beforeLength: number;
  beforeWidth: number;
  afterLength: number;
  afterWidth: number;
  defectedQty: number;
  percentage: string;
  remarks: string;
}

export interface CpiCutInspection {
  cutRecordId: string;
  cutNo: string;
  cutQty: number;
  bundleNos: string;
  sizes: string;
  numberRanges: string;
  part: string;
  sampleSize: number;
  defectRows: CpiDefectRow[];
  totalDefectedQty: number;
  totalPercentage: string;
}

export interface CpiBundleInfo {
  bundleNo: string;
  bundleQty: number;
  size: string;
  numberRange: string;
}

export interface CpiCutInfo {
  cutNo: string;
  cutQty: number;
  bundles: CpiBundleInfo[];
}

export interface EligibleCpiItem {
  storeInRecordId: string;
  submissionId: string;
  revisionNo: number;
  styleNo: string;
  customerName: string;
  scheduleNo: string;
  bodyColour: string;
  printColour: string;
  components: string;
  season: string;
  receivedQty: number;
  cutInDate: string;
  cutCount: number;
  totalCutQty: number;
  totalBundleCount: number;
  cutNo: string;
  size: string;
  bundleQty: number;
  numberRange: string;
  cuts: CpiCutInfo[];
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
  cutInspections: CpiCutInspection[];
  cuttingQty: number;
  checkedQty: number;
  rejDamageQty: number;
  rejectionPercentage: string;
  balanceQty: number;
  inspectionStatus: InspectionStatus;
  appRej: string;
  checkedBy: string;
  summaryDate: string;
  cpiAuditor: string;
}

// ==========================================
// HELPER: create empty defect rows for a cut
// ==========================================
export function createEmptyDefectRows(): CpiDefectRow[] {
  return DEFECT_TYPES.map((d) => ({
    defectCode: d.code,
    defectName: d.name,
    beforeLength: 0,
    beforeWidth: 0,
    afterLength: 0,
    afterWidth: 0,
    defectedQty: 0,
    percentage: '',
    remarks: '',
  }));
}

// ==========================================
// STORE
// ==========================================

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
    const res = await fetch(`${API_BASE}/reports`, { headers: getHeaders() });
    if (!res.ok) throw new Error(await res.text() || 'Failed to fetch QC reports');
    const data: CPIReport[] = await res.json();
    set({ cpiReports: sortReports(data) });
  },

  fetchEligibleCpiItems: async () => {
    const res = await fetch(`${API_BASE}/eligible-cpi`, { headers: getHeaders() });
    if (!res.ok) throw new Error(await res.text() || 'Failed to fetch eligible CPI items');
    const data: EligibleCpiItem[] = await res.json();
    set({ eligibleCpiItems: data });
  },

  addCPIReport: async (report) => {
    const res = await fetch(`${API_BASE}/reports`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(report),
    });
    if (!res.ok) throw new Error(await res.text() || 'Failed to create CPI report');
    const saved: CPIReport = await res.json();
    set((state) => ({ cpiReports: sortReports([saved, ...state.cpiReports]) }));
    return saved;
  },

  updateCPIReport: async (id, updatedReport) => {
    const res = await fetch(`${API_BASE}/reports/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(updatedReport),
    });
    if (!res.ok) throw new Error(await res.text() || 'Failed to update CPI report');
    set((state) => ({
      cpiReports: sortReports(state.cpiReports.map((r) => (r.id === id ? updatedReport : r))),
    }));
  },

  deleteCPIReport: async (id) => {
    const res = await fetch(`${API_BASE}/reports/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error(await res.text() || 'Failed to delete CPI report');
    set((state) => ({ cpiReports: state.cpiReports.filter((r) => r.id !== id) }));
  },
}));