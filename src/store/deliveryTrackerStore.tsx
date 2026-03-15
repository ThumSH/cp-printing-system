import { create } from 'zustand';

export const TRACKING_SIZES = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'];

export type DeliveryStatus =
  | 'Pending'
  | 'In Transit'
  | 'Delivered'
  | 'Returned'
  | 'Delayed';

export type SizeData = {
  qty: number;
  pd: number;
  fd: number;
};

export interface EligibleDeliveryTrackerItem {
  adviceNoteId: string;
  productionRecordId: string;
  storeInRecordId: string;
  submissionId: string;
  revisionNo: number;
  adNo: string;
  styleNo: string;
  customerName: string;
  scheduleNo: string;
  cutNo: string;
  component: string;
  dispatchQty: number;
  remainingTrackableQty: number;
  deliveryDate: string;
}

export interface DeliveryTrackerRow {
  id: string;
  adviceNoteId: string;
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
  sizeData: Record<string, SizeData>;
}

export interface DeliveryTrackerReport {
  id: string;
  adviceNoteId: string;
  productionRecordId: string;
  storeInRecordId: string;
  submissionId: string;
  revisionNo: number;
  styleNo: string;
  customerName: string;
  adNo: string;
  fpoNo: string;
  orderQty: number;
  deliveryQty: number;
  balanceQty: number;
  deliveryStatus: DeliveryStatus;
  rows: DeliveryTrackerRow[];
  createdAt: string;
}

interface DeliveryTrackerStore {
  reports: DeliveryTrackerReport[];
  eligibleTrackingItems: EligibleDeliveryTrackerItem[];
  fetchReports: () => Promise<void>;
  fetchEligibleTrackingItems: () => Promise<void>;
  addReport: (
    report: Omit<
      DeliveryTrackerReport,
      | 'id'
      | 'productionRecordId'
      | 'storeInRecordId'
      | 'submissionId'
      | 'revisionNo'
      | 'styleNo'
      | 'customerName'
      | 'adNo'
      | 'orderQty'
      | 'balanceQty'
    >
  ) => Promise<DeliveryTrackerReport>;
  updateReport: (id: string, report: DeliveryTrackerReport) => Promise<void>;
  deleteReport: (id: string) => Promise<void>;
}

const API_BASE = 'http://localhost:5000/api/deliverytracker';

const getHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token')}`,
});

const sortReports = (reports: DeliveryTrackerReport[]) => {
  return [...reports].sort((a, b) => {
    const bTime = new Date(b.createdAt).getTime();
    const aTime = new Date(a.createdAt).getTime();

    if (bTime !== aTime) return bTime - aTime;
    return b.revisionNo - a.revisionNo;
  });
};

export const useDeliveryTrackerStore = create<DeliveryTrackerStore>((set) => ({
  reports: [],
  eligibleTrackingItems: [],

  fetchReports: async () => {
    try {
      const res = await fetch(`${API_BASE}/reports`, {
        headers: getHeaders(),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || 'Failed to fetch tracker reports');
      }

      const data: DeliveryTrackerReport[] = await res.json();

      set({
        reports: sortReports(data),
      });
    } catch (error) {
      console.error('Failed to fetch tracker reports:', error);
      throw error;
    }
  },

  fetchEligibleTrackingItems: async () => {
    try {
      const res = await fetch(`${API_BASE}/eligible-tracking`, {
        headers: getHeaders(),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || 'Failed to fetch eligible tracking items');
      }

      const data: EligibleDeliveryTrackerItem[] = await res.json();

      set({
        eligibleTrackingItems: data,
      });
    } catch (error) {
      console.error('Failed to fetch eligible tracking items:', error);
      throw error;
    }
  },

  addReport: async (report) => {
    try {
      const res = await fetch(`${API_BASE}/reports`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(report),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || 'Failed to create delivery tracker report');
      }

      const saved: DeliveryTrackerReport = await res.json();

      set((state) => ({
        reports: sortReports([saved, ...state.reports]),
      }));

      return saved;
    } catch (error) {
      console.error('Failed to create delivery tracker report:', error);
      throw error;
    }
  },

  updateReport: async (id, updatedReport) => {
    try {
      const res = await fetch(`${API_BASE}/reports/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(updatedReport),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || 'Failed to update delivery tracker report');
      }

      set((state) => ({
        reports: sortReports(
          state.reports.map((r) => (r.id === id ? updatedReport : r))
        ),
      }));
    } catch (error) {
      console.error('Failed to update delivery tracker report:', error);
      throw error;
    }
  },

  deleteReport: async (id) => {
    try {
      const res = await fetch(`${API_BASE}/reports/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || 'Failed to delete delivery tracker report');
      }

      set((state) => ({
        reports: state.reports.filter((r) => r.id !== id),
      }));
    } catch (error) {
      console.error('Failed to delete delivery tracker report:', error);
      throw error;
    }
  },
}));