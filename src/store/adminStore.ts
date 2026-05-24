// src/store/adminStore.ts
// FIXES:
//   - Added loading and error state (consumers can show spinners / error messages)
//   - fetchApprovals: now guards against concurrent fetches
//   - sortApprovals:  uses safe string comparison instead of new Date() (avoids NaN sort)

import { create } from 'zustand';
import { API, getAuthHeaders } from '../api/client';

export type ApprovalStatus = 'Pending' | 'Approved' | 'Rejected';

export interface ApprovalRecord {
  id: string;
  submissionId: string;
  styleNo: string;
  customerName: string;
  level: string;
  revisionNo: number;
  status: ApprovalStatus;
  boardSet?: string;
  approvalCard?: string;
  raMeetingDate?: string;
  bulkOrderQty?: string;
  reviewedAt: string;
}

interface AdminStore {
  approvals: ApprovalRecord[];
  loading:   boolean;
  error:     string;

  fetchApprovals:  () => Promise<void>;
  processApproval: (approval: ApprovalRecord) => Promise<ApprovalRecord>;
  deleteApproval:  (id: string) => Promise<void>;
}

const API_URL = API.ADMIN;

// FIX: Safe string sort — reviewedAt is "yyyy-MM-dd HH:mm" which sorts correctly
// as a string without converting to Date (avoids NaN from malformed timestamps)
const sortApprovals = (approvals: ApprovalRecord[]) =>
  [...approvals].sort((a, b) => {
    const dateDiff = b.reviewedAt.localeCompare(a.reviewedAt);
    if (dateDiff !== 0) return dateDiff;
    return b.revisionNo - a.revisionNo;
  });

export const useAdminStore = create<AdminStore>((set, get) => ({
  approvals: [],
  loading:   false,
  error:     '',

  fetchApprovals: async () => {
    // FIX: Guard against concurrent fetches (was missing)
    if (get().loading) return;

    set({ loading: true, error: '' });
    try {
      const res = await fetch(`${API_URL}/approvals`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error(await res.text() || `HTTP ${res.status}`);
      const data: ApprovalRecord[] = await res.json();
      set({ approvals: sortApprovals(data) });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to fetch approvals';
      set({ error: msg });
      console.error('adminStore.fetchApprovals:', msg);
      throw e;
    } finally {
      set({ loading: false });
    }
  },

  processApproval: async (newApproval) => {
    const res = await fetch(`${API_URL}/approvals`, {
      method:  'POST',
      headers: getAuthHeaders(),
      body:    JSON.stringify(newApproval),
    });
    if (!res.ok) throw new Error(await res.text() || `Server Error ${res.status}`);
    const savedApproval: ApprovalRecord = await res.json();

    set((state) => {
      const exists = state.approvals.some(a => a.submissionId === savedApproval.submissionId);
      const updated = exists
        ? state.approvals.map(a => a.submissionId === savedApproval.submissionId ? savedApproval : a)
        : [savedApproval, ...state.approvals];
      return { approvals: sortApprovals(updated) };
    });

    return savedApproval;
  },

  deleteApproval: async (id) => {
    const res = await fetch(`${API_URL}/approvals/${id}`, {
      method:  'DELETE',
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error(await res.text() || `Failed to delete approval (${res.status})`);
    set((state) => ({ approvals: state.approvals.filter(a => a.id !== id) }));
  },
}));