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
  placements: string; // comma-separated string from backend
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
  submittedToAdmin: boolean;
  submittedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface SampleStyleStore {
  styles: SampleStyle[];
  loading: boolean;
  refreshing: boolean;
  lastFetchedAt: number | null;

  fetchStyles: (force?: boolean) => Promise<void>;
  uploadImage: (id: string, file: File) => Promise<SampleStyle>;
  toggleClientApprove: (id: string) => Promise<SampleStyle>;
  submitToAdmin: (id: string, data: {
    rcMeetingDate: string;
    acNumber?: string;
    boardSet?: string;
    bulkQty: string;
  }) => Promise<SampleStyle>;
  adminAction: (id: string, status: 'Approved' | 'Pending', remarks?: string) => Promise<SampleStyle>;
}

const BASE = `${API.BASE}/api/samplestyle`;
const CACHE_TTL = 3 * 60 * 1000; // 3 minutes

export const useSampleStyleStore = create<SampleStyleStore>((set, get) => ({
  styles: [],
  loading: false,
  refreshing: false,
  lastFetchedAt: null,

  fetchStyles: async (force = false) => {
    const { loading, refreshing, lastFetchedAt, styles } = get();
    if (loading || refreshing) return;

    const fresh = lastFetchedAt && Date.now() - lastFetchedAt < CACHE_TTL;
    if (!force && fresh) return;

    const hasData = styles.length > 0;
    set(hasData ? { refreshing: true } : { loading: true });

    try {
      const res = await fetch(BASE, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error(await res.text());
      const data: SampleStyle[] = await res.json();
      set({ styles: data, lastFetchedAt: Date.now() });
    } catch (e) {
      console.error('Failed to fetch sample styles:', e);
    } finally {
      set({ loading: false, refreshing: false });
    }
  },

  uploadImage: async (id, file) => {
    const formData = new FormData();
    formData.append('file', file);
    // Don't set Content-Type — browser sets multipart boundary automatically
    const headers = getAuthHeaders();
    delete (headers as any)['Content-Type'];

    const res = await fetch(`${BASE}/${id}/image`, {
      method: 'POST',
      headers,
      body: formData,
    });
    if (!res.ok) throw new Error(await res.text());
    const updated: SampleStyle = await res.json();
    set((state) => ({
      styles: state.styles.map((s) => (s.id === id ? updated : s)),
    }));
    return updated;
  },

  toggleClientApprove: async (id) => {
    const res = await fetch(`${BASE}/${id}/clientapprove`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error(await res.text());
    const updated: SampleStyle = await res.json();
    set((state) => ({
      styles: state.styles.map((s) => (s.id === id ? updated : s)),
    }));
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
    set((state) => ({
      styles: state.styles.map((s) => (s.id === id ? updated : s)),
    }));
    return updated;
  },

  adminAction: async (id, status, remarks) => {
    const res = await fetch(`${BASE}/${id}/adminaction`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status, remarks }),
    });
    if (!res.ok) throw new Error(await res.text());
    const updated: SampleStyle = await res.json();
    set((state) => ({
      styles: state.styles.map((s) => (s.id === id ? updated : s)),
    }));
    return updated;
  },
}));