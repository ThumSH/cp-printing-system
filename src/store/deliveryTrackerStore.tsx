// src/store/deliveryTrackerStore.tsx
import { create } from 'zustand';

export const TRACKING_SIZES = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'];

export type SizeData = { qty: number; pd: number; fd: number; };

export interface DeliveryTrackerRow {
  id: string; inDate: string; deliveryDate: string; style: string;
  colour: string; inAd: string; ad: string; schedule: string;
  fpoQty: number; allowedPd: number; cutNo: string;
  sizeData: Record<string, SizeData>;
}

export interface DeliveryTrackerReport {
  id: string; styleNo: string; fpoNo: string; orderQty: number;
  rows: DeliveryTrackerRow[]; createdAt: string;
}

interface DeliveryTrackerStore {
  reports: DeliveryTrackerReport[];
  fetchReports: () => Promise<void>;
  addReport: (report: DeliveryTrackerReport) => Promise<void>;
  updateReport: (id: string, report: DeliveryTrackerReport) => Promise<void>;
  deleteReport: (id: string) => Promise<void>;
}

const API_URL = 'http://localhost:5000/api/deliverytracker/reports';
const getHeaders = () => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` });

export const useDeliveryTrackerStore = create<DeliveryTrackerStore>((set) => ({
  reports: [],

  fetchReports: async () => {
    try {
      const res = await fetch(API_URL, { headers: getHeaders() });
      if (res.ok) set({ reports: await res.json() });
    } catch (error) {
      console.error("Failed to fetch tracker reports:", error);
    }
  },

  addReport: async (report) => {
    const res = await fetch(API_URL, { method: 'POST', headers: getHeaders(), body: JSON.stringify(report) });
    if (res.ok) {
      const saved = await res.json();
      set((state) => ({ reports: [saved, ...state.reports] }));
    }
  },

  updateReport: async (id, updatedReport) => {
    const res = await fetch(`${API_URL}/${id}`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify(updatedReport) });
    if (res.ok) set((state) => ({ reports: state.reports.map((r) => (r.id === id ? updatedReport : r)) }));
  },

  deleteReport: async (id) => {
    const res = await fetch(`${API_URL}/${id}`, { method: 'DELETE', headers: getHeaders() });
    if (res.ok) set((state) => ({ reports: state.reports.filter((r) => r.id !== id) }));
  },
}));