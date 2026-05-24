// src/store/auditStore.ts
//
// WHAT CHANGED (internal only — no exported names changed):
//   fetchEligibleAuditItems()  → hits /audit/eligible   (was /audit/eligible-audits — 404)
//   updateAuditStatus()        → removed the non-existent PATCH endpoint call;
//                                now updates optimistically in local state only
//                                (backend has no PATCH /records/:id/status endpoint)
//   updateAuditRecord()        → removed the non-existent PUT endpoint call;
//                                now updates optimistically in local state only
//                                (backend has no PUT /records/:id endpoint)
//   addAuditRecord()           → kept; internally wraps the batch endpoint (/records/batch)
//                                since backend only has POST /records/batch, not POST /records
//   EligibleAuditItem          → interface corrected to match what backend actually returns
//   AuditRecord                → interface cleaned to match backend (removed non-existent fields)
//
// WHAT DID NOT CHANGE:
//   All exported method names: fetchAuditRecords, fetchEligibleAuditItems,
//     addAuditRecord, updateAuditRecord, updateAuditStatus, deleteAuditRecord
//   All exported state names: auditRecords, eligibleAuditItems

import { create } from 'zustand';
import { API, getAuthHeaders } from '../api/client';

export type AuditStatus = 'Pending' | 'Pass' | 'Fail';

// ── Corrected to match AuditBundleSelection in backend ────────────────────────
export interface AuditBundle {
  bundleNo: string;
  size:     string;
  qty:      number;
}

// ── Corrected to match what AuditController.GetEligibleAuditItems actually returns ──
// Backend returns storeIn records with cuts/bundles; it does NOT return delivery tracker fields
export interface EligibleAuditItem {
  id:            string;   // storeInRecord.Id
  submissionId:  string;
  revisionNo:    number;
  styleNo:       string;
  customerName:  string;
  scheduleNo:    string;
  bodyColour:    string;
  cuts: {
    id:       string;
    cutNo:    string;
    cutQty:   number;
    bundles:  {
      id:          string;
      bundleNo:    string;
      bundleQty:   number;
      size:        string;
      numberRange: string;
    }[];
  }[];
}

// ── Corrected to match AuditRecord model in backend ───────────────────────────
export interface AuditRecord {
  id:              string;
  storeInRecordId: string;
  submissionId:    string;
  revisionNo:      number;
  date:            string;
  styleNo:         string;
  customerName:    string;
  scheduleNo:      string;
  colour:          string;
  cutNo:           string;
  sizes:           string;
  bundles:         AuditBundle[];
  releaseQty:      number;
  auditQty:        number;
  status:          AuditStatus;
  auditorName:     string;
  remarks:         string;
}

interface AuditStore {
  auditRecords:        AuditRecord[];
  eligibleAuditItems:  EligibleAuditItem[];

  fetchAuditRecords:        () => Promise<void>;
  fetchEligibleAuditItems:  () => Promise<void>;
  addAuditRecord: (
    record: Omit<AuditRecord, 'id' | 'submissionId' | 'revisionNo' | 'styleNo' | 'customerName' | 'scheduleNo' | 'colour'>
  ) => Promise<AuditRecord>;
  updateAuditRecord:  (id: string, record: AuditRecord) => Promise<void>;
  updateAuditStatus:  (id: string, status: AuditStatus, remarks: string, auditorName: string) => Promise<void>;
  deleteAuditRecord:  (id: string) => Promise<void>;
}

const API_BASE = API.AUDIT;

const sortAuditRecords = (records: AuditRecord[]) =>
  // yyyy-MM-dd strings sort correctly as strings — avoids timezone issues with new Date()
  [...records].sort((a, b) => {
    const dateDiff = b.date.localeCompare(a.date);
    if (dateDiff !== 0) return dateDiff;
    return b.revisionNo - a.revisionNo;
  });

export const useAuditStore = create<AuditStore>((set, get) => ({
  auditRecords:        [],
  eligibleAuditItems:  [],

  fetchAuditRecords: async () => {
    try {
      const res = await fetch(`${API_BASE}/records`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error(await res.text() || `HTTP ${res.status}`);
      const data: AuditRecord[] = await res.json();
      set({ auditRecords: sortAuditRecords(data) });
    } catch (e) {
      console.error('auditStore.fetchAuditRecords:', e);
      throw e;
    }
  },

  // FIX: was /audit/eligible-audits (404) — correct endpoint is /audit/eligible
  fetchEligibleAuditItems: async () => {
    try {
      const res = await fetch(`${API_BASE}/eligible`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error(await res.text() || `HTTP ${res.status}`);
      const data: EligibleAuditItem[] = await res.json();
      set({ eligibleAuditItems: data });
    } catch (e) {
      console.error('auditStore.fetchEligibleAuditItems:', e);
      throw e;
    }
  },

  // FIX: backend only has POST /records/batch (no single-record POST).
  // Wraps it transparently so consumers don't know the difference.
  addAuditRecord: async (record) => {
    try {
      const res = await fetch(`${API_BASE}/records/batch`, {
        method:  'POST',
        headers: getAuthHeaders(),
        body:    JSON.stringify([record]),   // batch endpoint expects an array
      });
      if (!res.ok) throw new Error(await res.text() || 'Failed to create audit record');
      const saved: AuditRecord[] = await res.json();
      const first = saved[0];
      set((state) => ({ auditRecords: sortAuditRecords([first, ...state.auditRecords]) }));
      // Re-fetch eligible so audited bundles leave the list
      get().fetchEligibleAuditItems().catch(console.error);
      return first;
    } catch (e) {
      console.error('auditStore.addAuditRecord:', e);
      throw e;
    }
  },

  // NOTE: Backend has no PUT /records/:id endpoint.
  // This updates local state optimistically so the UI reflects the change immediately.
  // The change will be lost on next full fetch — to persist, a backend PUT endpoint is needed.
  updateAuditRecord: async (id, updatedRecord) => {
    console.warn('auditStore.updateAuditRecord: no backend PUT endpoint — updating local state only');
    set((state) => ({
      auditRecords: sortAuditRecords(
        state.auditRecords.map(r => r.id === id ? updatedRecord : r)
      ),
    }));
  },

  // NOTE: Backend has no PATCH /records/:id/status endpoint.
  // Updates local state only so UI reflects the status change immediately.
  updateAuditStatus: async (id, status, remarks, auditorName) => {
    console.warn('auditStore.updateAuditStatus: no backend PATCH endpoint — updating local state only');
    set((state) => ({
      auditRecords: state.auditRecords.map(r =>
        r.id === id ? { ...r, status, remarks, auditorName } : r
      ),
    }));
  },

  deleteAuditRecord: async (id) => {
    try {
      const res = await fetch(`${API_BASE}/records/${id}`, {
        method:  'DELETE',
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error(await res.text() || 'Failed to delete audit record');
      set((state) => ({ auditRecords: state.auditRecords.filter(r => r.id !== id) }));
      // Re-fetch eligible so deleted audit re-appears as auditable
      get().fetchEligibleAuditItems().catch(console.error);
    } catch (e) {
      console.error('auditStore.deleteAuditRecord:', e);
      throw e;
    }
  },
}));