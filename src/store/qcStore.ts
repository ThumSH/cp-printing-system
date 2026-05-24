// src/store/qcStore.ts
// FIXES:
//   - addCPIReport:    now re-fetches eligibleCpiItems so inspected item leaves the list
//   - deleteCPIReport: now re-fetches eligibleCpiItems so deleted item returns to list
//   - updateCPIReport: now uses server-returned data (not just the passed-in object)
//                      so backend-recomputed fields (styleNo, customer, etc.) are correct

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
    defectCode:    d.code,
    defectName:    d.name,
    beforeLength:  0,
    beforeWidth:   0,
    afterLength:   0,
    afterWidth:    0,
    defectedQty:   0,
    percentage:    '',
    remarks:       '',
  }));
}

// ==========================================
// STORE
// ==========================================

interface QCStore {
  cpiReports:       CPIReport[];
  eligibleCpiItems: EligibleCpiItem[];
  loading:          boolean;
  error:            string;

  fetchReports: () => Promise<void>;
  fetchEligibleCpiItems: () => Promise<void>;
  addCPIReport: (report: CPIReport) => Promise<CPIReport>;
  updateCPIReport: (id: string, report: CPIReport) => Promise<void>;
  deleteCPIReport: (id: string) => Promise<void>;
}

const API_BASE = API.QC;

const sortReports = (reports: CPIReport[]) =>
  [...reports].sort((a, b) => {
    // Safe string sort on yyyy-MM-dd
    const dateDiff = b.date.localeCompare(a.date);
    if (dateDiff !== 0) return dateDiff;
    return b.revisionNo - a.revisionNo;
  });

export const useQCStore = create<QCStore>((set, get) => ({
  cpiReports:       [],
  eligibleCpiItems: [],
  loading:          false,
  error:            '',

  fetchReports: async () => {
    set({ loading: true, error: '' });
    try {
      const res = await fetch(`${API_BASE}/reports`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error(await res.text() || `HTTP ${res.status}`);
      const data: CPIReport[] = await res.json();
      set({ cpiReports: sortReports(data) });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to fetch QC reports';
      set({ error: msg });
      throw e;
    } finally {
      set({ loading: false });
    }
  },

  fetchEligibleCpiItems: async () => {
    set({ loading: true, error: '' });
    try {
      const res = await fetch(`${API_BASE}/eligible-cpi`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error(await res.text() || `HTTP ${res.status}`);
      const data: EligibleCpiItem[] = await res.json();
      set({ eligibleCpiItems: data });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to fetch eligible CPI items';
      set({ error: msg });
      throw e;
    } finally {
      set({ loading: false });
    }
  },

  addCPIReport: async (report) => {
    const res = await fetch(`${API_BASE}/reports`, {
      method:  'POST',
      headers: getAuthHeaders(),
      body:    JSON.stringify(report),
    });
    if (!res.ok) throw new Error(await res.text() || 'Failed to create CPI report');
    const saved: CPIReport = await res.json();
    set((state) => ({ cpiReports: sortReports([saved, ...state.cpiReports]) }));
    // FIX: Re-fetch eligible so the newly-inspected item leaves the "eligible" list
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
    // FIX: Backend returns 204 NoContent on update, so re-fetch the record
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
    set((state) => ({ cpiReports: state.cpiReports.filter(r => r.id !== id) }));
    // FIX: Re-fetch eligible so deleted item returns to the inspectable list
    get().fetchEligibleCpiItems().catch(console.error);
  },
}));