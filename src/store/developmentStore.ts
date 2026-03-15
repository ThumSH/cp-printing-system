// src/store/developmentStore.ts
import { create } from 'zustand';

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

export interface SubmissionForm {
  id: string;
  styleNo: string;
  customerName: string;
  submissionDate: string;
  level: string;
  comment: string;
  revisionNo: number;
  isLatestRevision: boolean;
}

interface DevelopmentStore {
  jobs: DevelopmentJob[];
  submissions: SubmissionForm[];
  fetchData: () => Promise<void>;
  addJob: (job: DevelopmentJob) => Promise<void>;
  updateJob: (id: string, updatedJob: DevelopmentJob) => Promise<void>;
  deleteJob: (id: string) => Promise<void>;
  addSubmission: (
    sub: Omit<SubmissionForm, 'id' | 'revisionNo' | 'isLatestRevision'>
  ) => Promise<void>;
  updateSubmission: (id: string, updatedSub: SubmissionForm) => Promise<void>;
  deleteSubmission: (id: string) => Promise<void>;
}

const API_URL = 'http://localhost:5000/api/development';

const getHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token')}`,
});

const getSubmissionKey = (sub: Pick<SubmissionForm, 'styleNo' | 'customerName'>) =>
  `${sub.styleNo.trim().toLowerCase()}__${sub.customerName.trim().toLowerCase()}`;

const normalizeSubmissions = (submissions: SubmissionForm[]): SubmissionForm[] => {
  const grouped = new Map<string, SubmissionForm[]>();

  submissions.forEach((sub) => {
    const key = getSubmissionKey(sub);
    const arr = grouped.get(key) || [];
    arr.push(sub);
    grouped.set(key, arr);
  });

  const normalized: SubmissionForm[] = [];

  grouped.forEach((group) => {
    const sorted = [...group].sort((a, b) => {
      const dateDiff =
        new Date(a.submissionDate).getTime() - new Date(b.submissionDate).getTime();

      if (dateDiff !== 0) return dateDiff;

      return a.id.localeCompare(b.id);
    });

    sorted.forEach((sub, index) => {
      normalized.push({
        ...sub,
        revisionNo: index + 1,
        isLatestRevision: index === sorted.length - 1,
      });
    });
  });

  return normalized.sort((a, b) => {
    const bTime = new Date(b.submissionDate).getTime();
    const aTime = new Date(a.submissionDate).getTime();

    if (bTime !== aTime) return bTime - aTime;
    return b.revisionNo - a.revisionNo;
  });
};

export const useDevelopmentStore = create<DevelopmentStore>((set, get) => ({
  jobs: [],
  submissions: [],

  fetchData: async () => {
    try {
      const [jobsRes, subsRes] = await Promise.all([
        fetch(`${API_URL}/jobs`, { headers: getHeaders() }),
        fetch(`${API_URL}/submissions`, { headers: getHeaders() }),
      ]);

      if (jobsRes.ok && subsRes.ok) {
        const jobs = await jobsRes.json();
        const submissions = await subsRes.json();

        set({
          jobs,
          submissions: normalizeSubmissions(submissions),
        });
      }
    } catch (error) {
      console.error('Failed to fetch development data:', error);
    }
  },

  addJob: async (job) => {
    const res = await fetch(`${API_URL}/jobs`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(job),
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
      body: JSON.stringify(updatedJob),
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
      headers: getHeaders(),
    });

    if (res.ok) {
      set((state) => ({
        jobs: state.jobs.filter((job) => job.id !== id),
      }));
    }
  },

  addSubmission: async (sub) => {
    const currentSubs = get().submissions;
    const relatedSubs = currentSubs.filter(
      (item) =>
        item.styleNo.trim().toLowerCase() === sub.styleNo.trim().toLowerCase() &&
        item.customerName.trim().toLowerCase() === sub.customerName.trim().toLowerCase()
    );

    const nextRevisionNo =
      relatedSubs.length > 0
        ? Math.max(...relatedSubs.map((item) => item.revisionNo || 1)) + 1
        : 1;

    const payload: SubmissionForm = {
      ...sub,
      id: crypto.randomUUID(),
      revisionNo: nextRevisionNo,
      isLatestRevision: true,
    };

    const res = await fetch(`${API_URL}/submissions`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const savedSub = await res.json();

      set((state) => ({
        submissions: normalizeSubmissions([...state.submissions, savedSub]),
      }));
    }
  },

  updateSubmission: async (id, updatedSub) => {
    set((state) => ({
      submissions: normalizeSubmissions(
        state.submissions.map((sub) => (sub.id === id ? updatedSub : sub))
      ),
    }));
  },

  deleteSubmission: async (id) => {
    const res = await fetch(`${API_URL}/submissions/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });

    if (res.ok) {
      set((state) => ({
        submissions: normalizeSubmissions(
          state.submissions.filter((sub) => sub.id !== id)
        ),
      }));
    }
  },
}));