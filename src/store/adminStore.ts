// src/store/adminStore.ts
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
  fetchApprovals: () => Promise<void>;
  processApproval: (approval: ApprovalRecord) => Promise<ApprovalRecord>;
  deleteApproval: (id: string) => Promise<void>;
}

const API_URL = API.ADMIN;

const getHeaders = getAuthHeaders;

const sortApprovals = (approvals: ApprovalRecord[]) => {
  return [...approvals].sort((a, b) => {
    const bTime = new Date(b.reviewedAt).getTime();
    const aTime = new Date(a.reviewedAt).getTime();

    if (bTime !== aTime) return bTime - aTime;
    return b.revisionNo - a.revisionNo;
  });
};

export const useAdminStore = create<AdminStore>((set) => ({
  approvals: [],

  fetchApprovals: async () => {
    try {
      const res = await fetch(`${API_URL}/approvals`, {
        headers: getHeaders(),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || 'Failed to fetch approvals');
      }

      const data: ApprovalRecord[] = await res.json();

      set({
        approvals: sortApprovals(data),
      });
    } catch (error) {
      console.error('Failed to fetch approvals:', error);
      throw error;
    }
  },

  processApproval: async (newApproval) => {
    try {
      const res = await fetch(`${API_URL}/approvals`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(newApproval),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || `Server Error ${res.status}`);
      }

      const savedApproval: ApprovalRecord = await res.json();

      set((state) => {
        const exists = state.approvals.find(
          (a) => a.submissionId === savedApproval.submissionId
        );

        const updatedApprovals = exists
          ? state.approvals.map((a) =>
              a.submissionId === savedApproval.submissionId ? savedApproval : a
            )
          : [savedApproval, ...state.approvals];

        return {
          approvals: sortApprovals(updatedApprovals),
        };
      });

      return savedApproval;
    } catch (error) {
      console.error('Failed to process approval:', error);
      throw error;
    }
  },

  deleteApproval: async (id) => {
    try {
      const res = await fetch(`${API_URL}/approvals/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || `Failed to delete approval (${res.status})`);
      }

      set((state) => ({
        approvals: state.approvals.filter((a) => a.id !== id),
      }));
    } catch (error) {
      console.error('Failed to delete approval:', error);
      throw error;
    }
  },
}));