// src/pages/inventory/ProductionSearchPage.tsx
import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Search, Factory, Filter, CalendarDays, RotateCcw, Clock, GitBranch } from 'lucide-react';
import { useInventoryStore } from '../../store/inventoryStore';

const RECENT_LIMIT = 10;

export default function ProductionSearchPage() {
  const { productionRecords, fetchProductionRecords } = useInventoryStore();
  const [filterStyle, setFilterStyle] = useState('');
  const [filterCustomer, setFilterCustomer] = useState('');
  const [filterCutNo, setFilterCutNo] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [, setExpandedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => { setIsLoading(true); try { await fetchProductionRecords(); } catch (e) { console.error(e); } finally { setIsLoading(false); } };
    load();
  }, [fetchProductionRecords]);

  const availableStyles = useMemo(() => {
    const map = new Map<string, { styleNo: string; customerName: string; count: number; latestDate: string }>();
    productionRecords.forEach((r) => {
      const key = `${r.styleNo}|||${r.customerName}`;
      const ex = map.get(key);
      if (ex) { ex.count++; if ((r.issueDate || '') > ex.latestDate) ex.latestDate = r.issueDate || ''; }
      else map.set(key, { styleNo: r.styleNo, customerName: r.customerName, count: 1, latestDate: r.issueDate || '' });
    });
    return Array.from(map.entries()).map(([key, val]) => ({ key, ...val })).sort((a, b) => b.latestDate.localeCompare(a.latestDate));
  }, [productionRecords]);

  const customers = useMemo(() => Array.from(new Set(productionRecords.map((r) => r.customerName).filter(Boolean))).sort(), [productionRecords]);

  const cutNos = useMemo(() => {
    let recs = productionRecords;
    if (filterStyle) { const [sn, cn] = filterStyle.split('|||'); recs = recs.filter((r) => r.styleNo === sn && r.customerName === cn); }
    return Array.from(new Set(recs.map((r) => r.cutNo).filter(Boolean))).sort();
  }, [productionRecords, filterStyle]);

  const hasFilters = !!(filterStyle || filterCustomer || filterCutNo || filterDateFrom || filterDateTo);

  const filteredRecords = useMemo(() => {
    let recs = [...productionRecords];
    if (filterStyle) { const [sn, cn] = filterStyle.split('|||'); recs = recs.filter((r) => r.styleNo === sn && r.customerName === cn); }
    if (filterCustomer) recs = recs.filter((r) => r.customerName === filterCustomer);
    if (filterCutNo) recs = recs.filter((r) => r.cutNo === filterCutNo);
    if (filterDateFrom) recs = recs.filter((r) => (r.issueDate || '') >= filterDateFrom);
    if (filterDateTo) recs = recs.filter((r) => (r.issueDate || '') <= filterDateTo);
    return recs;
  }, [productionRecords, filterStyle, filterCustomer, filterCutNo, filterDateFrom, filterDateTo]);

  const displayRecords = useMemo(() => {
    if (!hasFilters) return [...productionRecords].sort((a, b) => (b.issueDate || '').localeCompare(a.issueDate || '')).slice(0, RECENT_LIMIT);
    return filteredRecords;
  }, [hasFilters, productionRecords, filteredRecords]);

  const summary = useMemo(() => ({
    total: displayRecords.length,
    totalIssued: displayRecords.reduce((s, r) => s + r.issueQty, 0),
    totalBalance: displayRecords.reduce((s, r) => s + r.balanceQty, 0),
  }), [displayRecords]);

  const clearFilters = () => { setFilterStyle(''); setFilterCustomer(''); setFilterCutNo(''); setFilterDateFrom(''); setFilterDateTo(''); setExpandedId(null); };
  const activeCount = [filterStyle, filterCustomer, filterCutNo, filterDateFrom, filterDateTo].filter(Boolean).length;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-6xl space-y-6 pb-12">
      <div className="flex items-center space-x-3 border-b border-slate-200 pb-4">
        <div className="rounded-lg bg-violet-100 p-2"><Search className="h-6 w-6 text-violet-700" /></div>
        <div><h2 className="text-2xl font-bold text-slate-900">Production Search</h2><p className="text-sm text-slate-500">Search production issue records by style, customer, cut, and date range.</p></div>
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2"><Filter className="h-4 w-4 text-slate-500" /><h3 className="text-sm font-bold text-slate-700">Filters</h3>
            {activeCount > 0 && <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">{activeCount} active</span>}
          </div>
          <button onClick={clearFilters} className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${hasFilters ? 'bg-red-50 border border-red-200 text-red-700 hover:bg-red-100' : 'bg-slate-50 border border-slate-200 text-slate-400 cursor-default'}`}>
            <RotateCcw className="h-3.5 w-3.5" />Clear All
          </button>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1 lg:col-span-2"><label className="block text-xs font-medium text-slate-600">Style</label>
            <select value={filterStyle} onChange={(e) => { setFilterStyle(e.target.value); setFilterCutNo(''); }}
              className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-colors ${filterStyle ? 'border-blue-400 bg-blue-50/50 ring-1 ring-blue-200' : 'border-slate-300 bg-white focus:ring-2 focus:ring-blue-500'}`}>
              <option value="">All Styles</option>
              {availableStyles.map((s) => <option key={s.key} value={s.key}>{s.styleNo} | {s.customerName} ({s.count})</option>)}
            </select>
          </div>
          <div className="space-y-1"><label className="block text-xs font-medium text-slate-600">Customer</label>
            <select value={filterCustomer} onChange={(e) => setFilterCustomer(e.target.value)}
              className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-colors ${filterCustomer ? 'border-blue-400 bg-blue-50/50 ring-1 ring-blue-200' : 'border-slate-300 bg-white focus:ring-2 focus:ring-blue-500'}`}>
              <option value="">All Customers</option>{customers.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="space-y-1"><label className="block text-xs font-medium text-slate-600">Cut No</label>
            <select value={filterCutNo} onChange={(e) => setFilterCutNo(e.target.value)}
              className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-colors ${filterCutNo ? 'border-blue-400 bg-blue-50/50 ring-1 ring-blue-200' : 'border-slate-300 bg-white focus:ring-2 focus:ring-blue-500'}`}>
              <option value="">All Cuts</option>{cutNos.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="space-y-1"><label className="block text-xs font-medium text-slate-600"><CalendarDays className="mr-1 inline h-3 w-3" />Issue Date From</label>
            <input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-colors ${filterDateFrom ? 'border-blue-400 bg-blue-50/50 ring-1 ring-blue-200' : 'border-slate-300 bg-white focus:ring-2 focus:ring-blue-500'}`} />
          </div>
          <div className="space-y-1"><label className="block text-xs font-medium text-slate-600"><CalendarDays className="mr-1 inline h-3 w-3" />Issue Date To</label>
            <input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-colors ${filterDateTo ? 'border-blue-400 bg-blue-50/50 ring-1 ring-blue-200' : 'border-slate-300 bg-white focus:ring-2 focus:ring-blue-500'}`} />
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Records" value={summary.total} /><StatCard label="Total Issued" value={summary.totalIssued} color="orange" /><StatCard label="Total Balance" value={summary.totalBalance} color="blue" />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50 px-6 py-3 flex items-center justify-between">
          {hasFilters ? <p className="text-sm font-medium text-slate-700">{filteredRecords.length} of {productionRecords.length} records</p>
            : <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-slate-400" /><p className="text-sm font-medium text-slate-700">Recent {Math.min(RECENT_LIMIT, productionRecords.length)} of {productionRecords.length} records</p><span className="text-xs text-slate-400">(use filters to search all)</span></div>}
        </div>
        {isLoading ? <div className="py-16 text-center text-slate-400">Loading...</div>
          : displayRecords.length === 0 ? <div className="py-16 text-center text-slate-400"><Factory className="mx-auto mb-3 h-12 w-12 opacity-20" /><p>{hasFilters ? 'No records match.' : 'No production records yet.'}</p></div>
          : <div className="divide-y divide-slate-100">
              {displayRecords.map((rec) => (
                <div key={rec.id} className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50/50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-slate-900">{rec.styleNo}</p>
                      <span className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700"><GitBranch className="h-2.5 w-2.5" />Rev {rec.revisionNo}</span>
                      <span className="text-xs text-slate-500">{rec.customerName}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">Cut: <span className="font-medium text-slate-700">{rec.cutNo}</span> | Line: <span className="font-medium text-slate-700">{rec.lineNo}</span> | Date: <span className="font-medium text-slate-700">{rec.issueDate}</span></p>
                  </div>
                  <div className="text-right space-y-0.5 shrink-0">
                    <div className="text-xs">Issued: <span className="font-bold text-orange-600">{rec.issueQty}</span></div>
                    <div className="text-xs">Balance: <span className="font-bold text-blue-700">{rec.balanceQty}</span></div>
                  </div>
                </div>
              ))}
            </div>}
      </div>
    </motion.div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color?: 'orange' | 'blue' | 'green' }) {
  const cc = color === 'orange' ? 'text-orange-700' : color === 'blue' ? 'text-blue-700' : color === 'green' ? 'text-emerald-700' : 'text-slate-700';
  return <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm"><p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">{label}</p><p className={`text-xl font-black ${cc}`}>{value.toLocaleString()}</p></div>;
}