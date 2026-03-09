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
  
  // --- NEW SUMMARY FIELDS ---
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
  addCPIReport: (report: CPIReport) => void;
  updateCPIReport: (id: string, report: CPIReport) => void;
  deleteCPIReport: (id: string) => void;
}

export const useQCStore = create<QCStore>((set) => ({
  cpiReports: [],
  addCPIReport: (report) => set((state) => ({ cpiReports: [report, ...state.cpiReports] })),
  updateCPIReport: (id, updatedReport) => set((state) => ({
    cpiReports: state.cpiReports.map((r) => (r.id === id ? updatedReport : r)),
  })),
  deleteCPIReport: (id) => set((state) => ({
    cpiReports: state.cpiReports.filter((r) => r.id !== id),
  })),
}));