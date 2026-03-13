// src/store/adminStore.ts
import { create } from 'zustand';

export type ApprovalStatus = 'Pending' | 'Approved' | 'Rejected';

export interface ApprovalRecord {
  id: string;
  submissionId: string;
  styleNo: string;
  customerName: string;
  level: string;
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
  processApproval: (approval: ApprovalRecord) => Promise<void>;
  deleteApproval: (id: string) => Promise<void>;
}

const API_URL = 'http://localhost:5000/api/admin';

const getHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${localStorage.getItem('token')}`
});

export const useAdminStore = create<AdminStore>((set, get) => ({
  approvals: [],
  
  // Fetch initial data
  fetchApprovals: async () => {
    try {
      const res = await fetch(`${API_URL}/approvals`, { headers: getHeaders() });
      if (res.ok) {
        set({ approvals: await res.json() });
      }
    } catch (error) {
      console.error("Failed to fetch approvals:", error);
    }
  },

  // Push data to the API
  processApproval: async (newApproval) => {
    try {
      const res = await fetch(`${API_URL}/approvals`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(newApproval)
      });
      
      if (res.ok) {
        const savedApproval = await res.json();
        set((state) => {
          const exists = state.approvals.find(a => a.submissionId === savedApproval.submissionId);
          if (exists) {
            return { approvals: state.approvals.map(a => a.submissionId === savedApproval.submissionId ? savedApproval : a) };
          }
          return { approvals: [savedApproval, ...state.approvals] };
        });
      } else {
        // THIS IS NEW: Catch server rejections (e.g., 400 Bad Request, 403 Forbidden)
        const errorText = await res.text();
        console.error("API Rejected Approval:", res.status, errorText);
        alert(`Server Error ${res.status}: Check the console or API terminal.\nDetails: ${errorText}`);
      }
    } catch (error) {
      console.error("Network/Fetch error:", error);
      alert("Failed to reach the API. Is it running?");
    }
  },

  deleteApproval: async (id) => {
    const res = await fetch(`${API_URL}/approvals/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    if (res.ok) {
      set((state) => ({
        approvals: state.approvals.filter(a => a.id !== id), 
      }));
    }
  },
}));