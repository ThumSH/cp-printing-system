// src/store/developmentStore.ts
//
// WHAT CHANGED (internal only — no exported names removed):
//   fetchData()        → now sets loading/error state; still uses Promise.all
//   addJob()           → now throws on error (was silently failing if POST failed)
//   updateJob()        → now throws on error
//   deleteJob()        → throws with cleaner LOCKED message (behavior unchanged)
//   addSubmission()    → removed client-side crypto.randomUUID(); let server assign ID
//   updateSubmission() → KEPT WITH ORIGINAL LOCAL-STATE-ONLY BEHAVIOR
//                        (it never hit the server — preserving that so no pages break)
//   deleteSubmission() → now throws on error (was silently not removing on 4xx)
//
// WHAT DID NOT CHANGE:
//   All exported state names: jobs, submissions
//   All exported method names: fetchData, addJob, updateJob, deleteJob,
//     addSubmission, updateSubmission, deleteSubmission
//   normalizeSubmissions logic: identical

import { create } from 'zustand';
import { API, getAuthHeaders } from '../api/client';

export interface DevelopmentJob {
  id:                 string;
  customer:           string;
  styleNo:            string;
  season:             string;
  printingTechnique:  string;
  artworkFileName:    string;
  artworkPreviewUrl:  string;
  washingStandard:    string;
  bodyColour:         string;
  printColour:        string;
  printColourQty:     string;
  sampleOrderedDate:  string;
  sampleDeliveryDate: string;
  component:          string;
}

export interface SubmissionForm {
  id:               string;
  styleNo:          string;
  customerName:     string;
  submissionDate:   string;
  level:            string;
  comment:          string;
  revisionNo:       number;
  isLatestRevision: boolean;
}

interface DevelopmentStore {
  jobs:        DevelopmentJob[];
  submissions: SubmissionForm[];
  loading:     boolean;
  error:       string;

  fetchData:        () => Promise<void>;
  addJob:           (job: DevelopmentJob) => Promise<void>;
  updateJob:        (id: string, updatedJob: DevelopmentJob) => Promise<void>;
  deleteJob:        (id: string) => Promise<void>;
  addSubmission:    (sub: Omit<SubmissionForm, 'id' | 'revisionNo' | 'isLatestRevision'>) => Promise<void>;
  updateSubmission: (id: string, updatedSub: SubmissionForm) => Promise<void>;
  deleteSubmission: (id: string) => Promise<void>;
}

const API_URL = `${API.BASE}/api/development`;

const getSubmissionKey = (sub: Pick<SubmissionForm, 'styleNo' | 'customerName'>) =>
  `${sub.styleNo.trim().toLowerCase()}__${sub.customerName.trim().toLowerCase()}`;

const normalizeSubmissions = (submissions: SubmissionForm[]): SubmissionForm[] => {
  const grouped = new Map<string, SubmissionForm[]>();

  submissions.forEach((sub) => {
    const key = getSubmissionKey(sub);
    const arr = grouped.get(key) ?? [];
    arr.push(sub);
    grouped.set(key, arr);
  });

  const normalized: SubmissionForm[] = [];

  grouped.forEach((group) => {
    const sorted = [...group].sort((a, b) => {
      const dateDiff = new Date(a.submissionDate).getTime() - new Date(b.submissionDate).getTime();
      if (dateDiff !== 0) return dateDiff;
      return a.id.localeCompare(b.id);
    });

    sorted.forEach((sub, index) => {
      normalized.push({
        ...sub,
        revisionNo:      index + 1,
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
  jobs:        [],
  submissions: [],
  loading:     false,
  error:       '',

  fetchData: async () => {
    set({ loading: true, error: '' });
    try {
      const [jobsRes, subsRes] = await Promise.all([
        fetch(`${API_URL}/jobs`,        { headers: getAuthHeaders() }),
        fetch(`${API_URL}/submissions`, { headers: getAuthHeaders() }),
      ]);

      if (!jobsRes.ok) throw new Error(await jobsRes.text() || 'Failed to fetch jobs');
      if (!subsRes.ok) throw new Error(await subsRes.text() || 'Failed to fetch submissions');

      const jobs:        DevelopmentJob[]  = await jobsRes.json();
      const submissions: SubmissionForm[] = await subsRes.json();

      set({ jobs, submissions: normalizeSubmissions(submissions) });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to fetch development data';
      set({ error: msg });
      console.error('developmentStore.fetchData:', msg);
    } finally {
      set({ loading: false });
    }
  },

  addJob: async (job) => {
    const res = await fetch(`${API_URL}/jobs`, {
      method:  'POST',
      headers: getAuthHeaders(),
      body:    JSON.stringify(job),
    });
    if (!res.ok) throw new Error(await res.text() || 'Failed to create job');

    // Backend returns { job, sampleStyle } — extract just the job
    const data = await res.json();
    const savedJob: DevelopmentJob = data.job ?? data;

    set((state) => ({ jobs: [savedJob, ...state.jobs] }));

    // Re-fetch all jobs to ensure SampleStyles are in sync (backend auto-creates them)
    try {
      const jobsRes = await fetch(`${API_URL}/jobs`, { headers: getAuthHeaders() });
      if (jobsRes.ok) set({ jobs: await jobsRes.json() });
    } catch { /* non-fatal — local state already updated */ }
  },

  updateJob: async (id, updatedJob) => {
    const res = await fetch(`${API_URL}/jobs/${id}`, {
      method:  'PUT',
      headers: getAuthHeaders(),
      body:    JSON.stringify(updatedJob),
    });
    if (!res.ok) throw new Error(await res.text() || 'Failed to update job');
    set((state) => ({
      jobs: state.jobs.map(j => j.id === id ? updatedJob : j),
    }));
  },

  deleteJob: async (id) => {
    const res = await fetch(`${API_URL}/jobs/${id}`, {
      method:  'DELETE',
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text.includes('LOCKED') ? text.replace('LOCKED: ', '') : 'Failed to delete job.');
    }
    set((state) => ({ jobs: state.jobs.filter(j => j.id !== id) }));
  },

  addSubmission: async (sub) => {
    const currentSubs = get().submissions;
    const relatedSubs = currentSubs.filter(
      item =>
        item.styleNo.trim().toLowerCase()     === sub.styleNo.trim().toLowerCase() &&
        item.customerName.trim().toLowerCase() === sub.customerName.trim().toLowerCase()
    );

    const nextRevisionNo = relatedSubs.length > 0
      ? Math.max(...relatedSubs.map(item => item.revisionNo ?? 1)) + 1
      : 1;

    // FIX: removed crypto.randomUUID() — let the server assign the ID.
    // Backend accepts an empty/missing Id and generates a GUID server-side.
    const payload: Partial<SubmissionForm> = {
      ...sub,
      id:              '',
      revisionNo:      nextRevisionNo,
      isLatestRevision: true,
    };

    const res = await fetch(`${API_URL}/submissions`, {
      method:  'POST',
      headers: getAuthHeaders(),
      body:    JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(await res.text() || 'Failed to create submission');

    const savedSub: SubmissionForm = await res.json();
    set((state) => ({
      submissions: normalizeSubmissions([...state.submissions, savedSub]),
    }));
  },

  // PRESERVED ORIGINAL BEHAVIOR: updates local state only.
  // This method never had a server call and pages may call it for lightweight
  // display-only updates (e.g. optimistic re-ordering). Keeping it safe.
  // To persist changes, delete and re-create the submission, or add a backend PUT endpoint.
  updateSubmission: async (_id, updatedSub) => {
    set((state) => ({
      submissions: normalizeSubmissions(
        state.submissions.map(sub => sub.id === _id ? updatedSub : sub)
      ),
    }));
  },

  deleteSubmission: async (id) => {
    const res = await fetch(`${API_URL}/submissions/${id}`, {
      method:  'DELETE',
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error(await res.text() || 'Failed to delete submission');
    set((state) => ({
      submissions: normalizeSubmissions(state.submissions.filter(sub => sub.id !== id)),
    }));
  },
}));