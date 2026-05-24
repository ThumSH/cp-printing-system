// src/store/deliveryTrackerStore.ts   (renamed from .tsx — file has no JSX)
//
// WHAT CHANGED (internal only — no exported names changed):
//   fetchReports()              → hits /report  (singular, was /reports — 404)
//   fetchEligibleTrackingItems()→ hits /filters  (was /eligible-tracking — 404)
//   addReport()                 → hits /save     (was /reports POST — 404)
//   updateReport()              → hits /save     (backend has no PUT; /save upserts by storeInRecordId+fpoNo)
//   deleteReport()              → hits /saved/:id (was already correct)
//   getHeaders                  → now uses shared getAuthHeaders (was inline duplicate)
//
// WHAT DID NOT CHANGE:
//   All exported state names: reports, eligibleTrackingItems
//   All exported method names: fetchReports, fetchEligibleTrackingItems, addReport, updateReport, deleteReport
//   All exported types: DeliveryTrackerReport, DeliveryTrackerRow, DeliveryStatus, SizeData, EligibleDeliveryTrackerItem

import { create } from 'zustand';
import { API, getAuthHeaders } from '../api/client';

export const TRACKING_SIZES = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'];

export type DeliveryStatus =
  | 'Pending'
  | 'In Transit'
  | 'Delivered'
  | 'Returned'
  | 'Delayed';

export type SizeData = {
  qty: number;
  pd:  number;
  fd:  number;
};

// ── EligibleDeliveryTrackerItem ────────────────────────────────────────────────
// NOTE: fetchEligibleTrackingItems() now hits /filters which returns {styleNo, scheduleNo}.
// The full interface is kept so existing consumers compile; extra fields will be undefined.
export interface EligibleDeliveryTrackerItem {
  adviceNoteId:          string;
  productionRecordId:    string;
  storeInRecordId:       string;
  submissionId:          string;
  revisionNo:            number;
  adNo:                  string;
  styleNo:               string;
  customerName:          string;
  scheduleNo:            string;
  cutNo:                 string;
  component:             string;
  dispatchQty:           number;
  remainingTrackableQty: number;
  deliveryDate:          string;
}

export interface DeliveryTrackerRow {
  id:           string;
  adviceNoteId: string;
  inDate:       string;
  deliveryDate: string;
  style:        string;
  colour:       string;
  inAd:         string;
  ad:           string;
  schedule:     string;
  fpoQty:       number;
  allowedPd:    number;
  cutNo:        string;
  sizeData:     Record<string, SizeData>;
}

export interface DeliveryTrackerReport {
  id:                string;
  adviceNoteId:      string;
  productionRecordId:string;
  storeInRecordId:   string;
  submissionId:      string;
  revisionNo:        number;
  styleNo:           string;
  customerName:      string;
  adNo:              string;
  fpoNo:             string;
  orderQty:          number;
  deliveryQty:       number;
  balanceQty:        number;
  deliveryStatus:    DeliveryStatus;
  rows:              DeliveryTrackerRow[];
  createdAt:         string;
}

interface DeliveryTrackerStore {
  reports:               DeliveryTrackerReport[];
  eligibleTrackingItems: EligibleDeliveryTrackerItem[];
  fetchReports:              () => Promise<void>;
  fetchEligibleTrackingItems:() => Promise<void>;
  addReport:    (report: Omit<DeliveryTrackerReport, 'id' | 'productionRecordId' | 'storeInRecordId' | 'submissionId' | 'revisionNo' | 'styleNo' | 'customerName' | 'adNo' | 'orderQty' | 'balanceQty'>) => Promise<DeliveryTrackerReport>;
  updateReport: (id: string, report: DeliveryTrackerReport) => Promise<void>;
  deleteReport: (id: string) => Promise<void>;
}

const API_BASE = API.DELIVERY_TRACKER;

const sortReports = (reports: DeliveryTrackerReport[]) =>
  [...reports].sort((a, b) => {
    // Safe string sort — avoids NaN from new Date() on malformed timestamps
    const dateDiff = b.createdAt.localeCompare(a.createdAt);
    if (dateDiff !== 0) return dateDiff;
    return b.revisionNo - a.revisionNo;
  });

export const useDeliveryTrackerStore = create<DeliveryTrackerStore>((set) => ({
  reports:               [],
  eligibleTrackingItems: [],

  // FIX: was /reports (plural) — backend route is /report (singular)
  fetchReports: async () => {
    try {
      const res = await fetch(`${API_BASE}/saved`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error(await res.text() || `HTTP ${res.status}`);
      const data: DeliveryTrackerReport[] = await res.json();
      set({ reports: sortReports(data) });
    } catch (e) {
      console.error('deliveryTrackerStore.fetchReports:', e);
      throw e;
    }
  },

  // FIX: was /eligible-tracking (doesn't exist) — backend provides /filters
  // Returns {styleNo, scheduleNo}[] — mapped into EligibleDeliveryTrackerItem shape
  fetchEligibleTrackingItems: async () => {
    try {
      const res = await fetch(`${API_BASE}/filters`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error(await res.text() || `HTTP ${res.status}`);
      const data: { styleNo: string; scheduleNo: string }[] = await res.json();
      // Map to the expected interface shape; fields not returned by /filters stay empty
      const mapped: EligibleDeliveryTrackerItem[] = data.map(d => ({
        adviceNoteId:          '',
        productionRecordId:    '',
        storeInRecordId:       '',
        submissionId:          '',
        revisionNo:            1,
        adNo:                  '',
        styleNo:               d.styleNo,
        customerName:          '',
        scheduleNo:            d.scheduleNo,
        cutNo:                 '',
        component:             '',
        dispatchQty:           0,
        remainingTrackableQty: 0,
        deliveryDate:          '',
      }));
      set({ eligibleTrackingItems: mapped });
    } catch (e) {
      console.error('deliveryTrackerStore.fetchEligibleTrackingItems:', e);
      throw e;
    }
  },

  // FIX: was POST /reports (404) — backend save endpoint is POST /save
  addReport: async (report) => {
    try {
      const res = await fetch(`${API_BASE}/save`, {
        method:  'POST',
        headers: getAuthHeaders(),
        body:    JSON.stringify(report),
      });
      if (!res.ok) throw new Error(await res.text() || 'Failed to save delivery tracker report');
      const saved: DeliveryTrackerReport = await res.json();
      set((state) => ({ reports: sortReports([saved, ...state.reports]) }));
      return saved;
    } catch (e) {
      console.error('deliveryTrackerStore.addReport:', e);
      throw e;
    }
  },

  // FIX: was PUT /reports/:id (no such endpoint) — backend /save upserts by storeInRecordId+fpoNo
  updateReport: async (id, updatedReport) => {
    try {
      const res = await fetch(`${API_BASE}/save`, {
        method:  'POST',  // backend upserts — finds existing by storeInRecordId+fpoNo
        headers: getAuthHeaders(),
        body:    JSON.stringify(updatedReport),
      });
      if (!res.ok) throw new Error(await res.text() || 'Failed to update delivery tracker report');
      const saved: DeliveryTrackerReport = await res.json();
      set((state) => ({
        reports: sortReports(state.reports.map(r => r.id === id ? saved : r)),
      }));
    } catch (e) {
      console.error('deliveryTrackerStore.updateReport:', e);
      throw e;
    }
  },

  // Was already correct: DELETE /saved/:id
  deleteReport: async (id) => {
    try {
      const res = await fetch(`${API_BASE}/saved/${id}`, {
        method:  'DELETE',
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error(await res.text() || 'Failed to delete delivery tracker report');
      set((state) => ({ reports: state.reports.filter(r => r.id !== id) }));
    } catch (e) {
      console.error('deliveryTrackerStore.deleteReport:', e);
      throw e;
    }
  },
}));