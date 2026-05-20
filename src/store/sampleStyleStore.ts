// src/store/sampleStyleStore.ts
import { create } from 'zustand';
import { API, getAuthHeaders } from '../api/client';

// ── Revision entry ────────────────────────────────────────────────────────────
export interface SampleStyleRevision {
  id: string;
  revisionNo: number;
  comment: string;
  artworkUrl?: string;   // artwork at time of this revision
  createdAt: string;
  createdBy: string;
}

// ── Sample style ──────────────────────────────────────────────────────────────
export interface SampleStyle {
  id: string;
  developmentJobId: string;
  customer: string;
  styleNo: string;
  season: string;
  printingTechnique: string;
  bodyColour: string;
  printColour: string;
  printColourQty: string;
  washingStandard: string;
  component: string;          // "Front" | "Back" | "Sleeve" etc.
  imagePath?: string;

  // Revision thread
  revisions: SampleStyleRevision[];

  // Developer workflow
  clientApproved: boolean;
  clientApprovedAt?: string;
  clientApprovedBy?: string;

  // Admin approval
  adminStatus: 'Pending' | 'Approved';
  adminRemarks?: string;
  adminActionAt?: string;
  adminActionBy?: string;

  // Submission details
  rcMeetingDate?: string;
  acNumber?: string;
  boardSet?: string;
  bulkQty?: string;
  developerComments?: string;
  submittedToAdmin: boolean;
  submittedAt?: string;

  createdAt: string;
  updatedAt: string;
}

// ── Store interface ───────────────────────────────────────────────────────────
interface SampleStyleStore {
  styles: SampleStyle[];
  loading: boolean;
  refreshing: boolean;
  lastFetchedAt: number | null;

  fetchStyles: (force?: boolean) => Promise<void>;
  uploadImage: (id: string, file: File) => Promise<SampleStyle>;
  addRevision: (id: string, comment: string, artworkUrl?: string) => Promise<SampleStyle>;
  toggleClientApprove: (id: string) => Promise<SampleStyle>;
  submitToAdmin: (id: string, data: {
    rcMeetingDate: string;
    boardSet?: string;
    bulkQty: string;
    developerComments?: string;
  }) => Promise<SampleStyle>;
  adminAction: (id: string, status: 'Approved' | 'Pending', remarks?: string) => Promise<SampleStyle>;
}

const BASE      = `${API.BASE}/api/samplestyle`;
const CACHE_TTL = 3 * 60 * 1000; // 3 minutes

export const useSampleStyleStore = create<SampleStyleStore>((set, get) => ({
  styles:        [],
  loading:       false,
  refreshing:    false,
  lastFetchedAt: null,

  // ── Fetch all ───────────────────────────────────────────────────────────────
  fetchStyles: async (force = false) => {
    const { loading, refreshing, lastFetchedAt, styles } = get();
    if (loading || refreshing) return;

    // Only skip if not forced AND cache is fresh (30 seconds max — short enough
    // that navigating away and back always gets the latest revisions from the server)
    const CACHE_TTL_SHORT = 30 * 1000;
    const fresh = lastFetchedAt && Date.now() - lastFetchedAt < CACHE_TTL_SHORT;
    if (!force && fresh) return;

    const hasData = styles.length > 0;
    set(hasData ? { refreshing: true } : { loading: true });

    try {
      const res = await fetch(BASE, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error(await res.text());
      const data: SampleStyle[] = await res.json();
      // Ensure revisions is always an array
      const normalized = data.map(s => ({ ...s, revisions: s.revisions ?? [] }));
      set({ styles: normalized, lastFetchedAt: Date.now() });
    } catch (e) {
      console.error('Failed to fetch sample styles:', e);
    } finally {
      set({ loading: false, refreshing: false });
    }
  },

  // ── Upload image ────────────────────────────────────────────────────────────
  uploadImage: async (id, file) => {
    const formData = new FormData();
    formData.append('file', file);
    const headers = getAuthHeaders();
    delete (headers as any)['Content-Type'];

    const res = await fetch(`${BASE}/${id}/image`, {
      method: 'POST',
      headers,
      body:   formData,
    });
    if (!res.ok) throw new Error(await res.text());
    const updated: SampleStyle = await res.json();
    updated.revisions = updated.revisions ?? [];
    set(state => ({ styles: state.styles.map(s => s.id === id ? updated : s) }));
    return updated;
  },

  // ── Add revision comment ────────────────────────────────────────────────────
  addRevision: async (id, comment, artworkUrl) => {
    const res = await fetch(`${BASE}/${id}/revisions`, {
      method:  'POST',
      headers: getAuthHeaders(),
      body:    JSON.stringify({ comment, artworkUrl: artworkUrl ?? null }),
    });
    if (!res.ok) throw new Error(await res.text());
    const updated: SampleStyle = await res.json();
    updated.revisions = updated.revisions ?? [];
    set(state => ({ styles: state.styles.map(s => s.id === id ? updated : s) }));
    return updated;
  },

  // ── Toggle client approve ───────────────────────────────────────────────────
  toggleClientApprove: async (id) => {
    const res = await fetch(`${BASE}/${id}/clientapprove`, {
      method:  'PATCH',
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error(await res.text());
    const updated: SampleStyle = await res.json();
    updated.revisions = updated.revisions ?? [];
    set(state => ({ styles: state.styles.map(s => s.id === id ? updated : s) }));
    return updated;
  },

  // ── Submit to admin ─────────────────────────────────────────────────────────
  submitToAdmin: async (id, data) => {
    const res = await fetch(`${BASE}/${id}/submit`, {
      method:  'PATCH',
      headers: getAuthHeaders(),
      body:    JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text());
    const updated: SampleStyle = await res.json();
    updated.revisions = updated.revisions ?? [];
    set(state => ({ styles: state.styles.map(s => s.id === id ? updated : s) }));
    return updated;
  },

  // ── Admin action ────────────────────────────────────────────────────────────
  adminAction: async (id, status, remarks) => {
    const res = await fetch(`${BASE}/${id}/adminaction`, {
      method:  'PATCH',
      headers: getAuthHeaders(),
      body:    JSON.stringify({ status, remarks }),
    });
    if (!res.ok) throw new Error(await res.text());
    const updated: SampleStyle = await res.json();
    updated.revisions = updated.revisions ?? [];
    set(state => ({ styles: state.styles.map(s => s.id === id ? updated : s) }));
    return updated;
  },
}));