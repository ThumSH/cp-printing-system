// src/store/dashboardStore.ts
// FIXES:
//   - Optional fetches (styles, storeInRecords) now log errors instead of silently swallowing them
//   - Added partialError field so UI can show a warning when secondary data fails to load
//   - fetch() now correctly handles the abort signal in all branches

import { create } from 'zustand';
import { API, getAuthHeaders } from '../api/client';
import { StoreInRecord } from './inventoryStore';

// ==========================================
// TYPES
// ==========================================
export interface DashboardData {
  development: { totalJobs: number; totalSubmissions: number; pendingSubmissions: number };
  approvals:   { total: number; approved: number; rejected: number; pending: number };
  stores: {
    totalStoreIn: number; totalInQty: number; todayStoreIn: number;
    totalProductionRecords: number; totalIssuedQty: number; todayProduction: number;
    bulkApproved: number; bulkReceived: number; bulkRemaining: number;
  };
  qc:      { totalCpiReports: number; passed: number; failed: number; pending: number; todayCpi: number };
  gatepass: { totalAdviceNotes: number; totalDispatchedQty: number; todayDispatched: number };
  audit:   { total: number; passed: number; failed: number; pending: number };
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
  data:            DashboardData | null;
  styles:          StyleOverview[];
  storeInRecords:  StoreInRecord[];
  loading:         boolean;
  error:           string;
  /** Non-null when optional secondary data (styles / storeIn) failed but main KPIs loaded */
  partialError:    string;
  lastFetched:     number | null;

  fetch:      (force?: boolean) => Promise<void>;
  invalidate: () => void;
}

const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes

export const useDashboardStore = create<DashboardState>((set, get) => ({
  data:           null,
  styles:         [],
  storeInRecords: [],
  loading:        false,
  error:          '',
  partialError:   '',
  lastFetched:    null,

  invalidate: () => set({ lastFetched: null }),

  fetch: async (force = false) => {
    const state = get();
    const isFresh = state.lastFetched && (Date.now() - state.lastFetched < CACHE_TTL_MS);
    if (!force && isFresh && state.data) return;
    if (state.loading) return;

    set({ loading: true, error: '', partialError: '' });

    const headers    = getAuthHeaders();
    const controller = new AbortController();
    const timeout    = setTimeout(() => controller.abort(), 20_000);

    try {
      // ── Main KPIs — required ──────────────────────────────────────────────
      const dRes = await fetch(`${API.BASE}/api/dashboard`, {
        headers,
        signal: controller.signal,
      });
      if (!dRes.ok) throw new Error(await dRes.text().catch(() => `HTTP ${dRes.status}`));
      const data: DashboardData = await dRes.json();
      set({ data });

      // ── Styles overview — optional, degrades gracefully ───────────────────
      const partialErrors: string[] = [];
      try {
        const sRes = await fetch(`${API.BASE}/api/dashboard/styles`, {
          headers,
          signal: controller.signal,
        });
        if (sRes.ok) {
          set({ styles: await sRes.json() });
        } else {
          partialErrors.push('style overview');
        }
      } catch (e) {
        // Don't surface abort errors as partial failures
        if ((e as Error).name !== 'AbortError') {
          console.warn('dashboardStore: failed to fetch styles overview:', e);
          partialErrors.push('style overview');
        }
      }

      // ── Store-in records — optional ───────────────────────────────────────
      try {
        const siRes = await fetch(`${API.INVENTORY}/store-in`, {
          headers,
          signal: controller.signal,
        });
        if (siRes.ok) {
          set({ storeInRecords: await siRes.json() });
        } else {
          partialErrors.push('store-in records');
        }
      } catch (e) {
        if ((e as Error).name !== 'AbortError') {
          console.warn('dashboardStore: failed to fetch store-in records:', e);
          partialErrors.push('store-in records');
        }
      }

      clearTimeout(timeout);
      set({
        lastFetched:  Date.now(),
        error:        '',
        partialError: partialErrors.length > 0
          ? `Could not load: ${partialErrors.join(', ')}. Core metrics are still accurate.`
          : '',
      });
    } catch (e) {
      clearTimeout(timeout);
      const msg = e instanceof Error
        ? e.name === 'AbortError'
          ? 'Dashboard timed out. Check that the backend is running.'
          : e.message
        : 'Failed to load dashboard.';
      set({ error: msg });
    } finally {
      set({ loading: false });
    }
  },
}));