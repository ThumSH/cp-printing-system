// src/store/sampleStyleStore.ts
import { create } from 'zustand';
import { API, getAuthHeaders } from '../api/client';

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
  component: string;  // single component: Front, Back, Sleeve, etc.
  imagePath?: string;
  clientApproved: boolean;
  clientApprovedAt?: string;
  clientApprovedBy?: string;
  adminStatus: 'Pending' | 'Approved';
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

interface SampleStyleStore {
  styles: SampleStyle[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  lastFetchedAt: number | null;

  fetchStyles: (force?: boolean) => Promise<void>;
  addStyle: (style: SampleStyle) => void;
  uploadImage: (id: string, file: File) => Promise<SampleStyle>;
  toggleClientApprove: (id: string) => Promise<SampleStyle>;
  submitToAdmin: (id: string, data: {
    rcMeetingDate: string;
    acNumber?: string;
    boardSet?: string;
    bulkQty: string;
    developerComments?: string;
  }) => Promise<SampleStyle>;
  adminAction: (id: string, status: 'Approved' | 'Pending', remarks?: string) => Promise<SampleStyle>;
  reviseStyle: (id: string, data: {
    extraBulkQty: string;
    rcMeetingDate?: string;
    acNumber?: string;
    boardSet?: string;
    comments?: string;
  }) => Promise<SampleStyle>;
}

const BASE = `${API.BASE}/api/samplestyle`;
const CACHE_TTL = 30 * 1000; // 30 seconds — keeps UI snappy without hammering the server

export const useSampleStyleStore = create<SampleStyleStore>((set, get) => ({
  styles: [],
  loading: false,
  refreshing: false,
  error: null,
  lastFetchedAt: null,

  fetchStyles: async (force = false) => {
    const { loading, refreshing, lastFetchedAt, styles } = get();
    if (loading || refreshing) return;

    const fresh = lastFetchedAt && Date.now() - lastFetchedAt < CACHE_TTL;
    if (!force && fresh) return;

    const hasData = styles.length > 0;
    set(hasData ? { refreshing: true, error: null } : { loading: true, error: null });

    try {
      const res = await fetch(BASE, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error(await res.text().catch(() => `HTTP ${res.status}`));
      const data: SampleStyle[] = await res.json();
      set({ styles: data, lastFetchedAt: Date.now(), loading: false, refreshing: false, error: null });
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to load styles';
      console.error('sampleStyleStore.fetchStyles:', message);
      set({ loading: false, refreshing: false, error: message });
    }
  },

  addStyle: (style: SampleStyle) => {
    set((state) => ({ styles: [style, ...state.styles] }));
  },

  uploadImage: async (id, file) => {
    const formData = new FormData();
    formData.append('file', file);
    const headers = getAuthHeaders();
    delete (headers as any)['Content-Type'];
    const res = await fetch(`${BASE}/${id}/image`, { method: 'POST', headers, body: formData });
    if (!res.ok) throw new Error(await res.text());
    const updated: SampleStyle = await res.json();
    set((state) => ({ styles: state.styles.map((s) => (s.id === id ? updated : s)) }));
    return updated;
  },

  toggleClientApprove: async (id) => {
    const res = await fetch(`${BASE}/${id}/clientapprove`, { method: 'PATCH', headers: getAuthHeaders() });
    if (!res.ok) throw new Error(await res.text());
    const updated: SampleStyle = await res.json();
    set((state) => ({ styles: state.styles.map((s) => (s.id === id ? updated : s)) }));
    return updated;
  },

  submitToAdmin: async (id, data) => {
    const res = await fetch(`${BASE}/${id}/submit`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text());
    const updated: SampleStyle = await res.json();
    set((state) => ({ styles: state.styles.map((s) => (s.id === id ? updated : s)) }));
    return updated;
  },

  reviseStyle: async (id, data) => {
    const res = await fetch(`${BASE}/${id}/revise`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        extraBulkQty: data.extraBulkQty,
        rcMeetingDate: data.rcMeetingDate,
        acNumber: data.acNumber,
        boardSet: data.boardSet,
        comments: data.comments,
      }),
    });
    if (!res.ok) throw new Error(await res.text());
    const newStyle: SampleStyle = await res.json();
    // Add the new revision to the store
    set((state) => ({ styles: [newStyle, ...state.styles] }));
    return newStyle;
  },

  adminAction: async (id, status, remarks) => {
    const res = await fetch(`${BASE}/${id}/adminaction`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status, remarks }),
    });
    if (!res.ok) throw new Error(await res.text());
    const updated: SampleStyle = await res.json();
    set((state) => ({ styles: state.styles.map((s) => (s.id === id ? updated : s)) }));
    return updated;
  },
}));