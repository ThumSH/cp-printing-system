// src/pages/inventory/StoreInSearchPage.tsx
import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, PackageOpen, ChevronDown, ChevronRight, Layers,
  GitBranch, Filter, CalendarDays, RotateCcw, Clock,
} from 'lucide-react';
import { useInventoryStore } from '../../store/inventoryStore';

const RECENT_LIMIT = 10;

export default function StoreInSearchPage() {
  const {
    storeInRecords, fetchRecords, fetchBulkBalances,
    fetchEligibleStoreInItems,
  } = useInventoryStore();

  // Filters
  const [filterStyle, setFilterStyle] = useState('');       // "styleNo|||customerName"
  const [filterCustomer, setFilterCustomer] = useState('');
  const [filterSchedule, setFilterSchedule] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        await Promise.all([fetchRecords(), fetchBulkBalances(), fetchEligibleStoreInItems()]);
      } catch (e) {
        console.error('Failed to load:', e);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [fetchRecords, fetchBulkBalances, fetchEligibleStoreInItems]);

  // ==========================================
  // DERIVED DATA
  // ==========================================

  // Unique styles with store-in records
  const availableStyles = useMemo(() => {
    const map = new Map<string, { styleNo: string; customerName: string; count: number; latestDate: string }>();
    storeInRecords.forEach((r) => {
      const key = `${r.styleNo}|||${r.customerName}`;
      const existing = map.get(key);
      if (existing) {
        existing.count += 1;
        if (r.cutInDate > existing.latestDate) existing.latestDate = r.cutInDate;
      } else {
        map.set(key, { styleNo: r.styleNo, customerName: r.customerName, count: 1, latestDate: r.cutInDate || '' });
      }
    });
    return Array.from(map.entries())
      .map(([key, val]) => ({ key, ...val }))
      .sort((a, b) => b.latestDate.localeCompare(a.latestDate)); // Most recent first
  }, [storeInRecords]);

  // Unique customers
  const customers = useMemo(() => {
    const set = new Set(storeInRecords.map((r) => r.customerName).filter(Boolean));
    return Array.from(set).sort();
  }, [storeInRecords]);

  // Schedule numbers (scoped to selected style/customer)
  const scheduleNos = useMemo(() => {
    let records = storeInRecords;
    if (filterStyle) {
      const [sn, cn] = filterStyle.split('|||');
      records = records.filter((r) => r.styleNo === sn && r.customerName === cn);
    }
    if (filterCustomer) {
      records = records.filter((r) => r.customerName === filterCustomer);
    }
    const set = new Set(records.map((r) => r.scheduleNo).filter(Boolean));
    return Array.from(set).sort();
  }, [storeInRecords, filterStyle, filterCustomer]);

  // Selected style info card
  const selectedStyleInfo = useMemo(() => {
    if (!filterStyle) return null;
    const [styleNo, customerName] = filterStyle.split('|||');
    const records = storeInRecords.filter((r) => r.styleNo === styleNo && r.customerName === customerName);
    if (records.length === 0) return null;
    const first = records[0];
    return {
      styleNo, customerName,
      bodyColour: first.bodyColour, printColour: first.printColour,
      season: first.season, components: first.components,
      bulkQty: first.bulkQty, totalRecords: records.length,
    };
  }, [filterStyle, storeInRecords]);

  // Is any filter active?
  const hasFilters = !!(filterStyle || filterCustomer || filterSchedule || filterDateFrom || filterDateTo);

  // Filtered records
  const filteredRecords = useMemo(() => {
    let records = [...storeInRecords];

    if (filterStyle) {
      const [sn, cn] = filterStyle.split('|||');
      records = records.filter((r) => r.styleNo === sn && r.customerName === cn);
    }
    if (filterCustomer) {
      records = records.filter((r) => r.customerName === filterCustomer);
    }
    if (filterSchedule) {
      records = records.filter((r) => r.scheduleNo === filterSchedule);
    }
    if (filterDateFrom) {
      records = records.filter((r) => r.cutInDate >= filterDateFrom);
    }
    if (filterDateTo) {
      records = records.filter((r) => r.cutInDate <= filterDateTo);
    }

    return records;
  }, [storeInRecords, filterStyle, filterCustomer, filterSchedule, filterDateFrom, filterDateTo]);

  // Display records: if no filters → most recent 10, else → all matching
  const displayRecords = useMemo(() => {
    if (!hasFilters) {
      // Sort by cutInDate descending and take the last 10
      return [...storeInRecords]
        .sort((a, b) => (b.cutInDate || '').localeCompare(a.cutInDate || ''))
        .slice(0, RECENT_LIMIT);
    }
    return filteredRecords;
  }, [hasFilters, storeInRecords, filteredRecords]);

  // Summary stats (based on what's displayed)
  const summary = useMemo(() => ({
    totalRecords: displayRecords.length,
    totalInQty: displayRecords.reduce((s, r) => s + r.inQty, 0),
    totalCuts: displayRecords.reduce((s, r) => s + r.cuts.length, 0),
    totalBundles: displayRecords.reduce((s, r) => s + r.cuts.reduce((cs, c) => cs + c.bundles.length, 0), 0),
  }), [displayRecords]);

  // Reset everything
  const clearFilters = () => {
    setFilterStyle('');
    setFilterCustomer('');
    setFilterSchedule('');
    setFilterDateFrom('');
    setFilterDateTo('');
    setExpandedId(null);
  };

  // Active filter count (for badge)
  const activeFilterCount = [filterStyle, filterCustomer, filterSchedule, filterDateFrom, filterDateTo].filter(Boolean).length;

  // ==========================================
  // RENDER
  // ==========================================
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-6xl space-y-6 pb-12"
    >
      {/* Header */}
      <div className="flex items-center space-x-3 border-b border-slate-200 pb-4">
        <div className="rounded-lg bg-orange-100 p-2">
          <Search className="h-6 w-6 text-orange-700" />
        </div>
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-slate-900">Store-In Search</h2>
          <p className="text-sm text-slate-500">
            Select a style to view its store-in records, cuts, and bundles.
          </p>
        </div>
      </div>

      {/* ==========================================
          FILTERS CARD
          ========================================== */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        {/* Filter header with always-visible Clear button */}
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

          {/* Clear button — always visible, styled prominently */}
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

        {/* Filter grid */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Style Dropdown */}
          <div className="space-y-1 lg:col-span-2">
            <label className="block text-xs font-medium text-slate-600">
              Style <span className="text-slate-400">(select from available styles)</span>
            </label>
            <select
              value={filterStyle}
              onChange={(e) => {
                setFilterStyle(e.target.value);
                setFilterSchedule('');
              }}
              className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-colors ${
                filterStyle
                  ? 'border-blue-400 bg-blue-50/50 ring-1 ring-blue-200'
                  : 'border-slate-300 bg-white focus:ring-2 focus:ring-blue-500'
              }`}
            >
              <option value="">All Styles</option>
              {availableStyles.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.styleNo} | {s.customerName} ({s.count} record{s.count !== 1 ? 's' : ''})
                </option>
              ))}
            </select>
          </div>

          {/* Customer */}
          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-600">Customer</label>
            <select
              value={filterCustomer}
              onChange={(e) => setFilterCustomer(e.target.value)}
              className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-colors ${
                filterCustomer
                  ? 'border-blue-400 bg-blue-50/50 ring-1 ring-blue-200'
                  : 'border-slate-300 bg-white focus:ring-2 focus:ring-blue-500'
              }`}
            >
              <option value="">All Customers</option>
              {customers.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Schedule No */}
          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-600">Schedule No</label>
            <select
              value={filterSchedule}
              onChange={(e) => setFilterSchedule(e.target.value)}
              className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-colors ${
                filterSchedule
                  ? 'border-blue-400 bg-blue-50/50 ring-1 ring-blue-200'
                  : 'border-slate-300 bg-white focus:ring-2 focus:ring-blue-500'
              }`}
            >
              <option value="">All Schedules</option>
              {scheduleNos.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Date From */}
          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-600">
              <CalendarDays className="mr-1 inline h-3 w-3" />
              Cut In Date From
            </label>
            <input
              type="date"
              value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
              className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-colors ${
                filterDateFrom
                  ? 'border-blue-400 bg-blue-50/50 ring-1 ring-blue-200'
                  : 'border-slate-300 bg-white focus:ring-2 focus:ring-blue-500'
              }`}
            />
          </div>

          {/* Date To */}
          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-600">
              <CalendarDays className="mr-1 inline h-3 w-3" />
              Cut In Date To
            </label>
            <input
              type="date"
              value={filterDateTo}
              onChange={(e) => setFilterDateTo(e.target.value)}
              className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-colors ${
                filterDateTo
                  ? 'border-blue-400 bg-blue-50/50 ring-1 ring-blue-200'
                  : 'border-slate-300 bg-white focus:ring-2 focus:ring-blue-500'
              }`}
            />
          </div>
        </div>

        {/* Selected style info card */}
        {selectedStyleInfo && (
          <div className="rounded-lg border border-blue-200 bg-blue-50/60 p-4">
            <div className="flex items-center gap-2 mb-2">
              <PackageOpen className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-bold text-blue-900">{selectedStyleInfo.styleNo}</span>
              <span className="text-xs text-blue-700">{selectedStyleInfo.customerName}</span>
              <span className="ml-auto rounded-full bg-blue-200 px-2 py-0.5 text-[10px] font-bold text-blue-800">
                {selectedStyleInfo.totalRecords} record{selectedStyleInfo.totalRecords !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-5 text-xs">
              <div><span className="text-blue-500">Body Colour:</span> <span className="font-medium text-slate-700">{selectedStyleInfo.bodyColour || '-'}</span></div>
              <div><span className="text-blue-500">Print Colour:</span> <span className="font-medium text-slate-700">{selectedStyleInfo.printColour || '-'}</span></div>
              <div><span className="text-blue-500">Season:</span> <span className="font-medium text-slate-700">{selectedStyleInfo.season || '-'}</span></div>
              <div><span className="text-blue-500">Components:</span> <span className="font-medium text-slate-700">{selectedStyleInfo.components || '-'}</span></div>
              <div><span className="text-blue-500">Approved Bulk:</span> <span className="font-bold text-slate-900">{selectedStyleInfo.bulkQty}</span></div>
            </div>
          </div>
        )}
      </div>

      {/* ==========================================
          SUMMARY CARDS
          ========================================== */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <SummaryCard label="Records" value={summary.totalRecords} />
        <SummaryCard label="Total IN Qty" value={summary.totalInQty} color="orange" />
        <SummaryCard label="Total Cuts" value={summary.totalCuts} color="blue" />
        <SummaryCard label="Total Bundles" value={summary.totalBundles} color="green" />
      </div>

      {/* ==========================================
          RESULTS TABLE
          ========================================== */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {/* Table header — shows whether viewing recent or filtered */}
        <div className="border-b border-slate-200 bg-slate-50 px-6 py-3 flex items-center justify-between">
          {hasFilters ? (
            <p className="text-sm font-medium text-slate-700">
              {filteredRecords.length} of {storeInRecords.length} records
            </p>
          ) : (
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-slate-400" />
              <p className="text-sm font-medium text-slate-700">
                Recent {Math.min(RECENT_LIMIT, storeInRecords.length)} of {storeInRecords.length} records
              </p>
              <span className="text-xs text-slate-400">(use filters above to search all)</span>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="py-16 text-center text-slate-400">Loading records...</div>
        ) : displayRecords.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <PackageOpen className="mx-auto mb-3 h-12 w-12 opacity-20" />
            <p>{hasFilters ? 'No records match your filters.' : 'No store-in records yet.'}</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {displayRecords.map((record) => {
              const isExpanded = expandedId === record.id;
              const totalBundles = record.cuts.reduce((s, c) => s + c.bundles.length, 0);

              return (
                <div key={record.id}>
                  <div
                    className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50/50 cursor-pointer transition-colors"
                    onClick={() => setExpandedId(isExpanded ? null : record.id)}
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-slate-900">{record.styleNo}</p>
                        <span className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
                          <GitBranch className="h-2.5 w-2.5" />Rev {record.revisionNo}
                        </span>
                        <span className="text-xs text-slate-500">{record.customerName}</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Sch: <span className="font-medium text-slate-700">{record.scheduleNo}</span>
                        {' | '}Date: <span className="font-medium text-slate-700">{record.cutInDate}</span>
                        {' | '}{record.bodyColour} / {record.printColour}
                        {' | '}{record.season}
                      </p>
                    </div>

                    <div className="text-right space-y-0.5 shrink-0">
                      <div className="text-xs">
                        IN: <span className="font-bold text-orange-600">{record.inQty}</span>
                      </div>
                      <div className="text-xs text-slate-500">
                        {record.cuts.length} cut{record.cuts.length !== 1 ? 's' : ''} · {totalBundles} bundle{totalBundles !== 1 ? 's' : ''}
                      </div>
                      <div className="text-xs">
                        Bulk Bal: <span className="font-bold text-blue-700">{record.balanceBulkQty}</span>
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
                        <div className="grid grid-cols-2 gap-3 md:grid-cols-6 mb-4">
                          <MiniStat label="Approved Bulk" value={record.bulkQty} />
                          <MiniStat label="IN Qty" value={record.inQty} color="orange" />
                          <MiniStat label="Bulk Balance" value={record.balanceBulkQty} color="blue" />
                          <MiniStat label="Total Cut Qty" value={record.totalCutQty} />
                          <MiniStat label="Uncut Balance" value={record.uncutBalance} />
                          <MiniStat label="Available (Shelf)" value={record.availableQty} color="green" />
                        </div>

                        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 mb-4 p-3 rounded-lg bg-white border border-slate-200">
                          <InfoField label="Components" value={record.components} />
                          <InfoField label="Body Colour" value={record.bodyColour} />
                          <InfoField label="Print Colour" value={record.printColour} />
                          <InfoField label="Season" value={record.season} />
                        </div>

                        {record.cuts.map((cut) => (
                          <div key={cut.id} className="mb-3 last:mb-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Layers className="h-3.5 w-3.5 text-slate-400" />
                              <span className="text-sm font-bold text-slate-700">{cut.cutNo}</span>
                              <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                                Qty: {cut.cutQty}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {cut.bundles.length} bundle{cut.bundles.length !== 1 ? 's' : ''}
                              </span>
                            </div>
                            <div className="ml-6 border-l-2 border-slate-200 pl-4">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="text-slate-400">
                                    <th className="py-1 text-left font-medium">Bundle</th>
                                    <th className="py-1 text-left font-medium">Qty</th>
                                    <th className="py-1 text-left font-medium">Size</th>
                                    <th className="py-1 text-left font-medium">Range</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {cut.bundles.map((b) => (
                                    <tr key={b.id} className="text-slate-700">
                                      <td className="py-0.5 font-medium">{b.bundleNo}</td>
                                      <td className="py-0.5 font-bold">{b.bundleQty}</td>
                                      <td className="py-0.5">{b.size}</td>
                                      <td className="py-0.5 text-slate-500">{b.numberRange || '-'}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ==========================================
// HELPERS
// ==========================================
function SummaryCard({ label, value, color }: { label: string; value: number; color?: 'orange' | 'blue' | 'green' }) {
  const cc = color === 'orange' ? 'text-orange-700' : color === 'blue' ? 'text-blue-700' : color === 'green' ? 'text-emerald-700' : 'text-slate-700';
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`text-xl font-black ${cc}`}>{value.toLocaleString()}</p>
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string; value: number; color?: 'orange' | 'blue' | 'green' }) {
  const cc = color === 'orange' ? 'text-orange-700' : color === 'blue' ? 'text-blue-700' : color === 'green' ? 'text-emerald-700' : 'text-slate-700';
  return (
    <div className="rounded-lg bg-white border border-slate-200 px-3 py-2">
      <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`text-lg font-black ${cc}`}>{value}</p>
    </div>
  );
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <label className="block text-[10px] font-medium uppercase tracking-wide text-slate-400">{label}</label>
      <p className="text-sm font-medium text-slate-700">{value || '-'}</p>
    </div>
  );
}