// src/store/developmentStore.ts
import { create } from 'zustand';

// 1. Job Interface (Workspace)
export interface DevelopmentJob {
  id: string;
  customer: string;
  styleNo: string;
  season: string;
  printingTechnique: string;
  artworkFileName: string;
  artworkPreviewUrl: string;
  washingStandard: string;
  bodyColour: string;
  printColour: string;
  printColourQty: string;
  sampleOrderedDate: string;
  sampleDeliveryDate: string;
  placements: string[];
}

// 2. Submission Interface (Approvals)
export interface SubmissionForm {
  id: string;
  styleNo: string;
  customerName: string;
  submissionDate: string;
  level: string;
  comment: string;
}

interface DevelopmentStore {
  jobs: DevelopmentJob[];
  submissions: SubmissionForm[];
  
  // Async actions
  fetchData: () => Promise<void>;
  addJob: (job: DevelopmentJob) => Promise<void>;
  updateJob: (id: string, updatedJob: DevelopmentJob) => Promise<void>;
  deleteJob: (id: string) => Promise<void>;
  
  addSubmission: (sub: SubmissionForm) => Promise<void>;
  updateSubmission: (id: string, updatedSub: SubmissionForm) => Promise<void>;
  deleteSubmission: (id: string) => Promise<void>;
}

// Configuration for your LAN API
const API_URL = 'http://localhost:5000/api/development'; // Change to your Server's IP later

const getHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${localStorage.getItem('token')}` // Grab the JWT token
});

export const useDevelopmentStore = create<DevelopmentStore>((set, get) => ({
  jobs: [],
  submissions: [],

  // --- NEW: Fetch Initial Data ---
  fetchData: async () => {
    try {
      const [jobsRes, subsRes] = await Promise.all([
        fetch(`${API_URL}/jobs`, { headers: getHeaders() }),
        fetch(`${API_URL}/submissions`, { headers: getHeaders() })
      ]);
      
      if (jobsRes.ok && subsRes.ok) {
        set({ 
          jobs: await jobsRes.json(), 
          submissions: await subsRes.json() 
        });
      }
    } catch (error) {
      console.error("Failed to fetch development data:", error);
    }
  },

  // --- Jobs Implementation ---
  addJob: async (job) => {
    const res = await fetch(`${API_URL}/jobs`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(job)
    });
    if (res.ok) {
      const savedJob = await res.json();
      set((state) => ({ jobs: [savedJob, ...state.jobs] }));
    }
  },
  
  updateJob: async (id, updatedJob) => {
    const res = await fetch(`${API_URL}/jobs/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(updatedJob)
    });
    if (res.ok) {
      set((state) => ({
        jobs: state.jobs.map((job) => (job.id === id ? updatedJob : job)),
      }));
    }
  },

  deleteJob: async (id) => {
    const res = await fetch(`${API_URL}/jobs/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    if (res.ok) {
      set((state) => ({
        jobs: state.jobs.filter((job) => job.id !== id),
      }));
    }
  },

  // --- Submissions Implementation ---
  addSubmission: async (sub) => {
    const res = await fetch(`${API_URL}/submissions`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(sub)
    });
    if (res.ok) {
      const savedSub = await res.json();
      set((state) => ({ submissions: [savedSub, ...state.submissions] }));
    }
  },

  updateSubmission: async (id, updatedSub) => {
    // Note: Our API backend didn't explicitly implement PUT for submissions yet, 
    // but the store is ready for it when we do!
    set((state) => ({
      submissions: state.submissions.map((sub) => (sub.id === id ? updatedSub : sub)),
    }));
  },

  deleteSubmission: async (id) => {
    const res = await fetch(`${API_URL}/submissions/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    if (res.ok) {
      set((state) => ({
        submissions: state.submissions.filter((sub) => sub.id !== id),
      }));
    }
  },
}));