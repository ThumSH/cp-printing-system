// src/pages/worker/WorkerHistoryPage.tsx
// Read-only search history of Worker Daily Output submissions.
// All data is already captured on save — this page just surfaces it with filters.

import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  History, Search, Filter, RotateCcw, ChevronDown, ChevronRight,
  CalendarDays, ChevronLeft, ChevronsLeft, ChevronsRight, Clock,
  User as UserIcon, Package, X,
} from 'lucide-react';
import { API, getAuthHeaders } from '../../api/client';

const API_BASE = `${API.WORKER}`;
const PAGE_SIZE = 50;

interface TimeSlotEntry {
  timeFrom: string;
  timeTo: string;
  seating: number;
  printing: number;
  curing: number;
  checking: number;
  packing: number;
  dispatch: number;
}

interface DailyOutputRecord {
  id: string;
  storeInRecordId: string;
  productionRecordId: string;
  date: string;
  styleNo: string;
  customerName: string;
  cutNo: string;
  component: string;
  orderQty: number;
  tableNo: string;
  workerName: string;
  timeSlots: TimeSlotEntry[];
  totalSeating: number;
  totalPrinting: number;
  totalCuring: number;
  totalChecking: number;
  totalPacking: number;
  totalDispatch: number;
}

interface PaginatedResponse {
  items: DailyOutputRecord[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export default function WorkerHistoryPage() {
  // Filters
  const [searchText, setSearchText] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterStyle, setFilterStyle] = useState('');
  const [filterCustomer, setFilterCustomer] = useState('');
  const [filterCut, setFilterCut] = useState('');
  const [filterComponent, setFilterComponent] = useState('');
  const [filterWorker, setFilterWorker] = useState('');
  const [filterTable, setFilterTable] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  // Paginated data
  const [records, setRecords] = useState<DailyOutputRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState('');

  // UI state
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Loaded once: all records (for populating the filter dropdowns)
  const [allRecords, setAllRecords] = useState<DailyOutputRecord[]>([]);

  // Debounce search input — 300ms
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchText), 300);
    return () => clearTimeout(t);
  }, [searchText]);

  // Reset to page 1 when any filter changes
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filterStyle, filterCustomer, filterCut, filterComponent,
      filterWorker, filterTable, filterDateFrom, filterDateTo]);

  // Server-paginated fetch
  const fetchPage = useCallback(async () => {
    setIsLoading(true);
    setPageError('');
    try {
      const p = new URLSearchParams();
      p.set('paginated', 'true');
      p.set('page', String(page));
      p.set('pageSize', String(PAGE_SIZE));
      if (debouncedSearch.trim()) p.set('search', debouncedSearch.trim());
      if (filterStyle)     p.set('styleNo', filterStyle);
      if (filterCustomer)  p.set('customerName', filterCustomer);
      if (filterCut)       p.set('cutNo', filterCut);
      if (filterComponent) p.set('component', filterComponent);
      if (filterWorker)    p.set('workerName', filterWorker);
      if (filterTable)     p.set('tableNo', filterTable);
      if (filterDateFrom)  p.set('dateFrom', filterDateFrom);
      if (filterDateTo)    p.set('dateTo', filterDateTo);

      const res = await fetch(`${API_BASE}/daily-output?${p.toString()}`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error(await res.text() || 'Failed to load');
      const data: PaginatedResponse = await res.json();
      setRecords(data.items || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 0);
    } catch (e) {
      setPageError(e instanceof Error ? e.message : 'Failed to load history.');
      setRecords([]); setTotal(0); setTotalPages(0);
    } finally {
      setIsLoading(false);
    }
  }, [page, debouncedSearch, filterStyle, filterCustomer, filterCut, filterComponent,
      filterWorker, filterTable, filterDateFrom, filterDateTo]);

  useEffect(() => { fetchPage(); }, [fetchPage]);

  // Load ALL records ONCE (no filter) to populate dropdown facets
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/daily-output`, { headers: getAuthHeaders() });
        if (res.ok) setAllRecords(await res.json());
      } catch { /* silent */ }
    })();
  }, []);

  // Dropdown options derived from allRecords (so every unique value shows, not just page's)
  const styles = useMemo(() =>
    [...new Set(allRecords.map(r => r.styleNo).filter(Boolean))].sort(),
  [allRecords]);

  const customers = useMemo(() =>
    [...new Set(allRecords.map(r => r.customerName).filter(Boolean))].sort(),
  [allRecords]);

  const cuts = useMemo(() =>
    [...new Set(allRecords.map(r => r.cutNo).filter(Boolean))].sort(),
  [allRecords]);

  const components = useMemo(() =>
    [...new Set(allRecords.map(r => r.component).filter(Boolean))].sort(),
  [allRecords]);

  const workers = useMemo(() =>
    [...new Set(allRecords.map(r => r.workerName).filter(Boolean))].sort(),
  [allRecords]);

  const tables = useMemo(() =>
    [...new Set(allRecords.map(r => r.tableNo).filter(Boolean))].sort(),
  [allRecords]);

  const hasFilters = !!(debouncedSearch || filterStyle || filterCustomer || filterCut ||
                        filterComponent || filterWorker || filterTable ||
                        filterDateFrom || filterDateTo);
  const activeFilterCount = [debouncedSearch, filterStyle, filterCustomer, filterCut,
                              filterComponent, filterWorker, filterTable,
                              filterDateFrom, filterDateTo].filter(Boolean).length;

  const clearFilters = () => {
    setSearchText(''); setFilterStyle(''); setFilterCustomer('');
    setFilterCut(''); setFilterComponent(''); setFilterWorker('');
    setFilterTable(''); setFilterDateFrom(''); setFilterDateTo('');
    setExpandedId(null);
  };

  // Sum across all 6 stages for a record — our "pieces handled" metric
  const sumAll = (r: DailyOutputRecord) =>
    (r.totalSeating || 0) + (r.totalPrinting || 0) + (r.totalCuring || 0) +
    (r.totalChecking || 0) + (r.totalPacking || 0) + (r.totalDispatch || 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-7xl space-y-6 pb-12"
    >
      {/* Header */}
      <div className="flex items-center space-x-3 border-b border-slate-200 pb-4">
        <div className="rounded-lg bg-teal-100 p-2">
          <History className="h-6 w-6 text-teal-700" />
        </div>
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-slate-900">Worker History</h2>
          <p className="text-sm text-slate-500">
            Search allocated quantities per day and time slot. Showing top {PAGE_SIZE} most recent.
          </p>
        </div>
      </div>

      {pageError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 flex items-center gap-2">
          <X className="h-4 w-4" />
          <span>{pageError}</span>
        </div>
      )}

      {/* Filters */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-500" />
            <h3 className="text-sm font-bold text-slate-700">Filters</h3>
            {activeFilterCount > 0 && (
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                {activeFilterCount} active
              </span>
            )}
          </div>
          <button
            onClick={clearFilters}
            className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              hasFilters
                ? 'bg-red-50 border border-red-200 text-red-700 hover:bg-red-100'
                : 'bg-slate-50 border border-slate-200 text-slate-400 cursor-default'
            }`}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Clear All
          </button>
        </div>

        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Search by style, customer, cut, worker, table, component..."
            className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-10 text-sm outline-none focus:ring-2 focus:ring-teal-500"
          />
          {searchText && (
            <button
              onClick={() => setSearchText('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Filter grid */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
          <FilterSelect label="Style" value={filterStyle} options={styles} onChange={setFilterStyle} />
          <FilterSelect label="Customer" value={filterCustomer} options={customers} onChange={setFilterCustomer} />
          <FilterSelect label="Cut No" value={filterCut} options={cuts} onChange={setFilterCut} />
          <FilterSelect label="Component" value={filterComponent} options={components} onChange={setFilterComponent} />
          <FilterSelect label="Worker" value={filterWorker} options={workers} onChange={setFilterWorker} />
          <FilterSelect label="Table" value={filterTable} options={tables} onChange={setFilterTable} />

          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-600">
              <CalendarDays className="mr-1 inline h-3 w-3" /> Date From
            </label>
            <input
              type="date"
              value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-600">
              <CalendarDays className="mr-1 inline h-3 w-3" /> Date To
            </label>
            <input
              type="date"
              value={filterDateTo}
              onChange={(e) => setFilterDateTo(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-slate-400" />
            <p className="text-sm font-medium text-slate-700">
              {hasFilters
                ? <>Found <span className="font-bold">{total}</span> matching record{total !== 1 ? 's' : ''}</>
                : <>Showing recent <span className="font-bold">{records.length}</span> of <span className="font-bold">{total}</span></>
              }
            </p>
            {!hasFilters && total > PAGE_SIZE && (
              <span className="text-xs text-slate-400">(use filters to narrow)</span>
            )}
          </div>
          {totalPages > 1 && (
            <span className="text-xs text-slate-600">Page {page} of {totalPages}</span>
          )}
        </div>

        {isLoading ? (
          <div className="py-16 text-center text-slate-400">Loading history...</div>
        ) : records.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <History className="mx-auto mb-3 h-12 w-12 opacity-20" />
            <p>{hasFilters ? 'No records match your filters.' : 'No daily output history yet.'}</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {records.map((r) => {
              const isExpanded = expandedId === r.id;
              const totalHandled = sumAll(r);
              return (
                <div key={r.id}>
                  {/* Summary row */}
                  <div
                    className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50/50 cursor-pointer transition-colors"
                    onClick={() => setExpandedId(isExpanded ? null : r.id)}
                  >
                    {isExpanded ? <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" /> : <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-slate-900">{r.styleNo}</p>
                        <span className="text-xs text-slate-500">{r.customerName}</span>
                        {r.component && (
                          <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-700">
                            {r.component}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        <CalendarDays className="inline h-3 w-3 mr-1" />
                        {r.date}
                        {' | '}Cut: <span className="font-medium text-slate-700">{r.cutNo}</span>
                        {' | '}Table: <span className="font-medium text-slate-700">{r.tableNo}</span>
                        {' | '}<UserIcon className="inline h-3 w-3" /> <span className="font-medium text-slate-700">{r.workerName || '—'}</span>
                      </p>
                    </div>

                    <div className="text-right space-y-0.5 shrink-0">
                      <div className="text-xs">
                        <Package className="inline h-3 w-3 mr-1 text-orange-500" />
                        Issue: <span className="font-bold text-orange-600">{r.orderQty}</span>
                      </div>
                      <div className="text-xs">
                        Handled: <span className="font-bold text-emerald-700">{totalHandled}</span>
                      </div>
                      <div className="text-xs text-slate-500">
                        {r.timeSlots?.length || 0} slot{(r.timeSlots?.length || 0) !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>

                  {/* Expanded detail */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="border-t border-slate-100 bg-slate-50/50 px-6 py-4 overflow-hidden"
                      >
                        {/* Totals strip */}
                        <div className="grid grid-cols-3 gap-2 md:grid-cols-6 mb-4">
                          <StageTotal label="Seating"  value={r.totalSeating} />
                          <StageTotal label="Printing" value={r.totalPrinting} />
                          <StageTotal label="Curing"   value={r.totalCuring} />
                          <StageTotal label="Checking" value={r.totalChecking} />
                          <StageTotal label="Packing"  value={r.totalPacking} />
                          <StageTotal label="Dispatch" value={r.totalDispatch} />
                        </div>

                        {/* Time slot breakdown */}
                        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="bg-slate-100 text-slate-600">
                                <th className="px-3 py-2 text-left font-bold">Time Slot</th>
                                <th className="px-3 py-2 text-center font-bold">Seating</th>
                                <th className="px-3 py-2 text-center font-bold">Printing</th>
                                <th className="px-3 py-2 text-center font-bold">Curing</th>
                                <th className="px-3 py-2 text-center font-bold">Checking</th>
                                <th className="px-3 py-2 text-center font-bold">Packing</th>
                                <th className="px-3 py-2 text-center font-bold">Dispatch</th>
                                <th className="px-3 py-2 text-center font-bold bg-slate-200">Row Total</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {(r.timeSlots || []).map((t, i) => {
                                const rowTotal = (t.seating || 0) + (t.printing || 0) + (t.curing || 0) +
                                                 (t.checking || 0) + (t.packing || 0) + (t.dispatch || 0);
                                if (rowTotal === 0) return null;
                                return (
                                  <tr key={i} className="hover:bg-slate-50">
                                    <td className="px-3 py-1.5 font-medium text-slate-700">
                                      {t.timeFrom} – {t.timeTo}
                                    </td>
                                    <td className="px-3 py-1.5 text-center">{t.seating || '—'}</td>
                                    <td className="px-3 py-1.5 text-center">{t.printing || '—'}</td>
                                    <td className="px-3 py-1.5 text-center">{t.curing || '—'}</td>
                                    <td className="px-3 py-1.5 text-center">{t.checking || '—'}</td>
                                    <td className="px-3 py-1.5 text-center">{t.packing || '—'}</td>
                                    <td className="px-3 py-1.5 text-center">{t.dispatch || '—'}</td>
                                    <td className="px-3 py-1.5 text-center font-bold text-teal-700 bg-slate-50">{rowTotal}</td>
                                  </tr>
                                );
                              })}
                              {(r.timeSlots || []).every(t => ((t.seating||0)+(t.printing||0)+(t.curing||0)+(t.checking||0)+(t.packing||0)+(t.dispatch||0)) === 0) && (
                                <tr>
                                  <td colSpan={8} className="px-3 py-3 text-center text-slate-400">No time-slot entries recorded.</td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination footer */}
        {totalPages > 1 && (
          <div className="border-t border-slate-200 bg-slate-50 px-6 py-3 flex items-center justify-between">
            <div className="text-xs text-slate-500">
              Showing {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
            </div>
            <div className="flex items-center gap-1">
              <PagerBtn disabled={page === 1 || isLoading} onClick={() => setPage(1)} title="First"><ChevronsLeft className="h-4 w-4" /></PagerBtn>
              <PagerBtn disabled={page === 1 || isLoading} onClick={() => setPage(p => Math.max(1, p - 1))} title="Previous"><ChevronLeft className="h-4 w-4" /></PagerBtn>
              <span className="px-3 text-xs font-medium text-slate-700">Page {page} of {totalPages}</span>
              <PagerBtn disabled={page === totalPages || isLoading} onClick={() => setPage(p => Math.min(totalPages, p + 1))} title="Next"><ChevronRight className="h-4 w-4" /></PagerBtn>
              <PagerBtn disabled={page === totalPages || isLoading} onClick={() => setPage(totalPages)} title="Last"><ChevronsRight className="h-4 w-4" /></PagerBtn>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ==========================================
// HELPERS
// ==========================================
function FilterSelect({
  label, value, options, onChange,
}: {
  label: string; value: string; options: string[]; onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1">
      <label className="block text-xs font-medium text-slate-600">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors ${
          value
            ? 'border-blue-400 bg-blue-50/50 ring-1 ring-blue-200'
            : 'border-slate-300 bg-white focus:ring-2 focus:ring-teal-500'
        }`}
      >
        <option value="">All</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function StageTotal({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded bg-white border border-slate-200 px-2 py-1.5 text-center">
      <p className="text-[9px] uppercase tracking-wide text-slate-400 font-bold">{label}</p>
      <p className="text-sm font-black text-slate-700">{value || 0}</p>
    </div>
  );
}

function PagerBtn({
  children, disabled, onClick, title,
}: {
  children: React.ReactNode; disabled: boolean; onClick: () => void; title: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="rounded p-1.5 text-slate-500 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed"
    >
      {children}
    </button>
  );
}