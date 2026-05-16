// src/store/dashboardStore.ts
import { create } from 'zustand';
import { API, getAuthHeaders } from '../api/client';
import { StoreInRecord } from './inventoryStore';

// ==========================================
// TYPES
// ==========================================
export interface DashboardData {
  development: { totalJobs: number; totalSubmissions: number; pendingSubmissions: number };
  approvals: { total: number; approved: number; rejected: number; pending: number };
  stores: {
    totalStoreIn: number; totalInQty: number; todayStoreIn: number;
    totalProductionRecords: number; totalIssuedQty: number; todayProduction: number;
    bulkApproved: number; bulkReceived: number; bulkRemaining: number;
  };
  qc: { totalCpiReports: number; passed: number; failed: number; pending: number; todayCpi: number };
  gatepass: { totalAdviceNotes: number; totalDispatchedQty: number; todayDispatched: number };
  audit: { total: number; passed: number; failed: number; pending: number };
  worker: {
    totalDailyOutput: number; todayOutput: number; todaySeating: number;
    todayPrinting: number; todayCuring: number; todayChecking: number;
    todayPacking: number; todayDispatch: number; totalDowntime: number; pendingDowntime: number;
  };
  recent: { storeIn: any[]; dispatches: any[]; audits: any[] };
}

export interface StyleOverview {
  styleNo: string; customerName: string; scheduleNo: string; bulkQty: number; stage: string;
  storeInCount: number; totalReceived: number; remainingBulk: number; receivedPct: number; totalCuts: number;
  qcTotal: number; qcPassed: number; qcFailed: number; qcPending: number;
  productionCount: number; totalIssued: number;
  dispatchCount: number; totalDispatched: number; dispatchedPct: number;
  auditTotal: number; auditPassed: number; auditFailed: number;
  workerEntries: number; totalWorkerOutput: number;
}

interface DashboardState {
  data: DashboardData | null;
  styles: StyleOverview[];
  storeInRecords: StoreInRecord[];
  loading: boolean;
  error: string;
  lastFetched: number | null;   // timestamp in ms

  fetch: (force?: boolean) => Promise<void>;
  invalidate: () => void;
}

// How long cached data is considered fresh (2 minutes)
const CACHE_TTL_MS = 2 * 60 * 1000;

export const useDashboardStore = create<DashboardState>((set, get) => ({
  data: null,
  styles: [],
  storeInRecords: [],
  loading: false,
  error: '',
  lastFetched: null,

  invalidate: () => set({ lastFetched: null }),

  fetch: async (force = false) => {
    const state = get();

    // Skip fetch if data is still fresh and not forced
    const isFresh = state.lastFetched && (Date.now() - state.lastFetched < CACHE_TTL_MS);
    if (!force && isFresh && state.data) return;

    // Don't double-fetch if already loading
    if (state.loading) return;

    set({ loading: true, error: '' });

    const headers = getAuthHeaders();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    try {
      // Main KPIs — required
      const dRes = await fetch(`${API.BASE}/api/dashboard`, { headers, signal: controller.signal });
      if (!dRes.ok) {
        const txt = await dRes.text().catch(() => `HTTP ${dRes.status}`);
        throw new Error(txt);
      }
      const data: DashboardData = await dRes.json();
      set({ data });

      // Styles overview — optional
      try {
        const sRes = await fetch(`${API.BASE}/api/dashboard/styles`, { headers, signal: controller.signal });
        if (sRes.ok) set({ styles: await sRes.json() });
      } catch { /* degrade gracefully */ }

      // Store-in records — optional
      try {
        const siRes = await fetch(`${API.INVENTORY}/store-in`, { headers, signal: controller.signal });
        if (siRes.ok) set({ storeInRecords: await siRes.json() });
      } catch { /* degrade gracefully */ }

      clearTimeout(timeout);
      set({ lastFetched: Date.now(), error: '' });

    } catch (e) {
      clearTimeout(timeout);
      const msg = e instanceof Error
        ? (e.name === 'AbortError' ? 'Dashboard timed out. Check that the backend is running.' : e.message)
        : 'Failed to load dashboard.';
      set({ error: msg });
    } finally {
      set({ loading: false });
    }
  },
}));