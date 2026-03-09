// src/store/adminStore.ts
import { create } from 'zustand';

export type ApprovalStatus = 'Pending' | 'Approved' | 'Rejected';

export interface ApprovalRecord {
  id: string;
  submissionId: string; // Links back to the original development submission
  styleNo: string;
  customerName: string;
  level: string;
  status: ApprovalStatus;
  // Conditional fields (only required if Approved)
  boardSet?: string;
  approvalCard?: string;
  raMeetingDate?: string;
  bulkOrderQty?: string;
  reviewedAt: string;
}

interface AdminStore {
  approvals: ApprovalRecord[];
  processApproval: (approval: ApprovalRecord) => void;
  deleteApproval: (id: string) => void;
}

export const useAdminStore = create<AdminStore>((set) => ({
  approvals: [],
  processApproval: (newApproval) => set((state) => {
    // If an approval record already exists for this submission, update it. Otherwise, add it.
    const exists = state.approvals.find(a => a.submissionId === newApproval.submissionId);
    if (exists) {
      return { approvals: state.approvals.map(a => a.submissionId === newApproval.submissionId ? newApproval : a) };
    }
    return { approvals: [newApproval, ...state.approvals] };
  }),
  deleteApproval: (id) => set((state) => ({
    approvals: state.approvals.filter(a => a.id !== id), 
  })),
}));