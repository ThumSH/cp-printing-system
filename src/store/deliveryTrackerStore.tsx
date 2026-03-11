// src/store/deliveryTrackerStore.ts
import { create } from 'zustand';

export const TRACKING_SIZES = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'];

export type SizeData = {
  qty: number;
  pd: number; // Print Defect / Pending Defect
  fd: number; // Fabric Defect / Final Defect
};

export interface DeliveryTrackerRow {
  id: string;
  inDate: string;
  deliveryDate: string;
  style: string;
  colour: string;
  inAd: string;
  ad: string;
  schedule: string;
  fpoQty: number;
  allowedPd: number;
  cutNo: string;
  sizeData: Record<string, SizeData>; // Keyed by size (e.g., 'XS', 'S')
}

export interface DeliveryTrackerReport {
  id: string;
  styleNo: string;
  fpoNo: string;
  orderQty: number;
  rows: DeliveryTrackerRow[];
  createdAt: string;
}

interface DeliveryTrackerStore {
  reports: DeliveryTrackerReport[];
  addReport: (report: DeliveryTrackerReport) => void;
  updateReport: (id: string, report: DeliveryTrackerReport) => void;
  deleteReport: (id: string) => void;
}

export const useDeliveryTrackerStore = create<DeliveryTrackerStore>((set) => ({
  reports: [],
  addReport: (report) => set((state) => ({ reports: [report, ...state.reports] })),
  updateReport: (id, updatedReport) => set((state) => ({
    reports: state.reports.map((r) => (r.id === id ? updatedReport : r)),
  })),
  deleteReport: (id) => set((state) => ({
    reports: state.reports.filter((r) => r.id !== id),
  })),
}));