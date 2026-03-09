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
  // Job State & Actions
  jobs: DevelopmentJob[];
  addJob: (job: DevelopmentJob) => void;
  updateJob: (id: string, updatedJob: DevelopmentJob) => void;
  deleteJob: (id: string) => void;

  // Submission State & Actions
  submissions: SubmissionForm[];
  addSubmission: (sub: SubmissionForm) => void;
  updateSubmission: (id: string, updatedSub: SubmissionForm) => void;
  deleteSubmission: (id: string) => void;
}

export const useDevelopmentStore = create<DevelopmentStore>((set) => ({
  // Jobs Implementation
  jobs: [],
  addJob: (job) => set((state) => ({ jobs: [job, ...state.jobs] })),
  updateJob: (id, updatedJob) => set((state) => ({
    jobs: state.jobs.map((job) => (job.id === id ? updatedJob : job)),
  })),
  deleteJob: (id) => set((state) => ({
    jobs: state.jobs.filter((job) => job.id !== id),
  })),

  // Submissions Implementation
  submissions: [],
  addSubmission: (sub) => set((state) => ({ submissions: [sub, ...state.submissions] })),
  updateSubmission: (id, updatedSub) => set((state) => ({
    submissions: state.submissions.map((sub) => (sub.id === id ? updatedSub : sub)),
  })),
  deleteSubmission: (id) => set((state) => ({
    submissions: state.submissions.filter((sub) => sub.id !== id),
  })),
}));