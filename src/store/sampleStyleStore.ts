// src/store/sampleStyleStore.ts
import { create } from 'zustand';
import { API, getAuthHeaders } from '../api/client';

export interface SampleStyleRevision {
  id: string;
  revisionNo: number;
  comment: string;
  previousArtworkUrl?: string;
  artworkUrl?: string;
  createdAt: string;
  createdBy: string;
}

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
  component: string;
  originalImagePath?: string;
  imagePath?: string;
  revisions: SampleStyleRevision[];
  clientApproved: boolean;
  clientApprovedAt?: string;
  clientApprovedBy?: string;
  adminStatus: 'Pending' | 'Approved' | 'Rejected';
  adminRemarks?: string;
  adminActionAt?: string;
  adminActionBy?: string;
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


export interface UpdateRejectedStyleInput {
  customer: string;
  styleNo: string;
  season: string;
  printingTechnique: string;
  bodyColour: string;
  printColour: string;
  printColourQty: string;
  washingStandard: string;
  component: string;
}

interface SampleStyleStore {
  styles: SampleStyle[];
  loading: boolean;
  refreshing: boolean;
  lastFetchedAt: number | null;

  fetchStyles:         (force?: boolean) => Promise<void>;
  uploadImage:         (id: string, file: File) => Promise<SampleStyle>;
  addRevision:         (id: string, comment: string, artworkUrl?: string) => Promise<SampleStyle>;
  toggleClientApprove: (id: string) => Promise<SampleStyle>;
  submitToAdmin:       (id: string, data: {
    rcMeetingDate: string;
    boardSet?: string;
    bulkQty: string;
    developerComments?: string;
  }) => Promise<SampleStyle>;
  adminAction: (id: string, status: 'Approved' | 'Pending' | 'Rejected', remarks?: string) => Promise<SampleStyle>;
  updateRejectedStyle: (id: string, data: UpdateRejectedStyleInput) => Promise<SampleStyle>;
  deleteStyle: (id: string) => Promise<void>;

  /**
   * Add extra bulk qty and optionally replace body colour on an EXISTING approved style.
   * Calls PATCH /api/samplestyle/{id}/revise.
   * Updates the existing ApprovalRecord directly — no new records created.
   * The same style card in Store-In will show the combined total.
   */
  revise: (id: string, data: {
    extraBulkQty: string;
    newBodyColour?: string;
    comments?: string;
  }) => Promise<SampleStyle>;
}

const BASE = `${API.BASE}/api/samplestyle`;
const CACHE_TTL = 30 * 1000;

const normalize = (s: SampleStyle): SampleStyle => ({ ...s, revisions: s.revisions ?? [] });

export const useSampleStyleStore = create<SampleStyleStore>((set, get) => ({
  styles:        [],
  loading:       false,
  refreshing:    false,
  lastFetchedAt: null,

  fetchStyles: async (force = false) => {
    const { loading, refreshing, lastFetchedAt, styles } = get();
    if (loading || refreshing) return;
    const fresh = lastFetchedAt && Date.now() - lastFetchedAt < CACHE_TTL;
    if (!force && fresh) return;
    set(styles.length > 0 ? { refreshing: true } : { loading: true });
    try {
      const res = await fetch(BASE, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error(await res.text());
      const data: SampleStyle[] = await res.json();
      set({ styles: data.map(normalize), lastFetchedAt: Date.now() });
    } catch (e) {
      console.error('Failed to fetch sample styles:', e);
    } finally {
      set({ loading: false, refreshing: false });
    }
  },

  uploadImage: async (id, file) => {
    const fd = new FormData();
    fd.append('file', file);
    const headers = getAuthHeaders();
    delete (headers as any)['Content-Type'];
    const res = await fetch(`${BASE}/${id}/image`, { method: 'POST', headers, body: fd });
    if (!res.ok) throw new Error(await res.text());
    const updated = normalize(await res.json());
    set(s => ({ styles: s.styles.map(x => x.id === id ? updated : x) }));
    return updated;
  },

  addRevision: async (id, comment, artworkUrl) => {
    const res = await fetch(`${BASE}/${id}/revisions`, {
      method: 'POST', headers: getAuthHeaders(),
      body: JSON.stringify({ comment, artworkUrl: artworkUrl ?? null }),
    });
    if (!res.ok) throw new Error(await res.text());
    const updated = normalize(await res.json());
    set(s => ({ styles: s.styles.map(x => x.id === id ? updated : x) }));
    return updated;
  },

  toggleClientApprove: async (id) => {
    const res = await fetch(`${BASE}/${id}/clientapprove`, { method: 'PATCH', headers: getAuthHeaders() });
    if (!res.ok) throw new Error(await res.text());
    const updated = normalize(await res.json());
    set(s => ({ styles: s.styles.map(x => x.id === id ? updated : x) }));
    return updated;
  },

  submitToAdmin: async (id, data) => {
    const res = await fetch(`${BASE}/${id}/submit`, {
      method: 'PATCH', headers: getAuthHeaders(), body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text());
    const updated = normalize(await res.json());
    set(s => ({ styles: s.styles.map(x => x.id === id ? updated : x) }));
    return updated;
  },

  adminAction: async (id, status, remarks) => {
    const res = await fetch(`${BASE}/${id}/adminaction`, {
      method: 'PATCH', headers: getAuthHeaders(),
      body: JSON.stringify({ status, remarks }),
    });
    if (!res.ok) throw new Error(await res.text());
    const updated = normalize(await res.json());
    set(s => ({ styles: s.styles.map(x => x.id === id ? updated : x) }));
    return updated;
  },

  updateRejectedStyle: async (id, data) => {
    const res = await fetch(`${BASE}/${id}/rejectededit`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text());
    const updated = normalize(await res.json());
    set(s => ({ styles: s.styles.map(x => x.id === id ? updated : x) }));
    return updated;
  },

  deleteStyle: async (id) => {
    const res = await fetch(`${BASE}/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
    if (!res.ok) throw new Error(await res.text());
    set(s => ({ styles: s.styles.filter(x => x.id !== id) }));
  },

  // FIX: Uses PATCH (not POST) → updates existing ApprovalRecord in place.
  // Updates the SAME style in the store list (not prepend a new entry).
  // Result: one style, one approval, one combined bulk qty card in Store-In.
  revise: async (id, data) => {
    const res = await fetch(`${BASE}/${id}/revise`, {
      method: 'PATCH',   // ← PATCH, not POST
      headers: getAuthHeaders(),
      body: JSON.stringify({
        extraBulkQty:  data.extraBulkQty,
        newBodyColour: data.newBodyColour  ?? null,
        comments:      data.comments       ?? null,
      }),
    });
    if (!res.ok) throw new Error(await res.text());
    const updated = normalize(await res.json());
    // FIX: update the EXISTING style in the list, don't add a new entry
    set(s => ({ styles: s.styles.map(x => x.id === id ? updated : x) }));
    return updated;
  },
}));