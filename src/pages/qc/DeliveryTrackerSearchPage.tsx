// src/pages/qc/DeliveryTrackerSearchPage.tsx
import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, LayoutDashboard, ChevronDown, ChevronRight, Filter, CalendarDays, RotateCcw, Clock, Printer } from 'lucide-react';
import { API, getAuthHeaders } from '../../api/client';

interface SizeData { size: string; qty: number; pd: number; fd: number; }
interface TrackerRow {
  inDate: string; deliveryDate: string; styleNo: string; colour: string;
  inAd: string; ad: string; scheduleNo: string; fpoQty: number;
  allowedPd: number; cutNo: string; sizeBreakdown: SizeData[];
  totalQty: number; sizePdTotal: number; fdTotal: number; exceeded: number;
}
interface TrackerSummary {
  storeInRecordId: string; styleNo: string; fpoNo: string; customerName: string; orderQty: number;
  receivedQty: number; deliveredQty: number; balanceToRec: number;
  pdTotal: number; pdPercentage: string; allSizes: string[];
  rows: TrackerRow[]; sizeTotals: SizeData[];
  grandTotalQty: number; grandPdTotal: number; grandFdTotal: number;
}

const RECENT_LIMIT = 5;

export default function DeliveryTrackerSearchPage() {
  const [summaries, setSummaries] = useState<TrackerSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStyle, setFilterStyle] = useState('');
  const [filterCustomer, setFilterCustomer] = useState('');
  const [filterSchedule, setFilterSchedule] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true); setError('');
      try {
        const res = await fetch(`${API.DELIVERY_TRACKER}/report`, { headers: getAuthHeaders() });
        if (!res.ok) throw new Error(await res.text() || 'Failed to fetch');
        setSummaries(await res.json());
      } catch (e) { setError(e instanceof Error ? e.message : 'Failed to load.'); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const availableStyles = useMemo(() => {
    const map = new Map<string, { styleNo: string; customerName: string; count: number }>();
    summaries.forEach((s) => {
      const key = `${s.styleNo}|||${s.customerName}`;
      const ex = map.get(key);
      if (ex) ex.count++; else map.set(key, { styleNo: s.styleNo, customerName: s.customerName, count: 1 });
    });
    return Array.from(map.entries()).map(([key, val]) => ({ key, ...val }));
  }, [summaries]);

  const customers = useMemo(() => Array.from(new Set(summaries.map((s) => s.customerName).filter(Boolean))).sort(), [summaries]);
  const schedules = useMemo(() => {
    let recs = summaries;
    if (filterStyle) { const [sn, cn] = filterStyle.split('|||'); recs = recs.filter((s) => s.styleNo === sn && s.customerName === cn); }
    return Array.from(new Set(recs.map((s) => s.fpoNo).filter(Boolean))).sort();
  }, [summaries, filterStyle]);

  const hasFilters = !!(filterStyle || filterCustomer || filterSchedule);

  const filteredSummaries = useMemo(() => {
    let recs = [...summaries];
    if (filterStyle) { const [sn, cn] = filterStyle.split('|||'); recs = recs.filter((s) => s.styleNo === sn && s.customerName === cn); }
    if (filterCustomer) recs = recs.filter((s) => s.customerName === filterCustomer);
    if (filterSchedule) recs = recs.filter((s) => s.fpoNo === filterSchedule);
    return recs;
  }, [summaries, filterStyle, filterCustomer, filterSchedule]);

  const displaySummaries = useMemo(() => {
    if (!hasFilters) return summaries.slice(0, RECENT_LIMIT);
    return filteredSummaries;
  }, [hasFilters, summaries, filteredSummaries]);

  const clearFilters = () => { setFilterStyle(''); setFilterCustomer(''); setFilterSchedule(''); setExpandedId(null); };
  const activeCount = [filterStyle, filterCustomer, filterSchedule].filter(Boolean).length;

  const totalStats = useMemo(() => ({
    reports: displaySummaries.length,
    delivered: displaySummaries.reduce((s, r) => s + r.deliveredQty, 0),
    pd: displaySummaries.reduce((s, r) => s + r.pdTotal, 0),
  }), [displaySummaries]);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-6xl space-y-6 pb-12">
      <div className="flex items-center space-x-3 border-b border-slate-200 pb-4">
        <div className="rounded-lg bg-cyan-100 p-2"><Search className="h-6 w-6 text-cyan-700" /></div>
        <div><h2 className="text-2xl font-bold text-slate-900">Delivery Tracker Search</h2><p className="text-sm text-slate-500">Search delivery tracker reports by style, customer, and schedule.</p></div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2"><Filter className="h-4 w-4 text-slate-500" /><h3 className="text-sm font-bold text-slate-700">Filters</h3>
            {activeCount > 0 && <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">{activeCount} active</span>}
          </div>
          <button onClick={clearFilters} className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${hasFilters ? 'bg-red-50 border border-red-200 text-red-700 hover:bg-red-100' : 'bg-slate-50 border border-slate-200 text-slate-400 cursor-default'}`}><RotateCcw className="h-3.5 w-3.5" />Clear All</button>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="space-y-1"><label className="block text-xs font-medium text-slate-600">Style</label>
            <select value={filterStyle} onChange={(e) => { setFilterStyle(e.target.value); setFilterSchedule(''); }} className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-colors ${filterStyle ? 'border-blue-400 bg-blue-50/50 ring-1 ring-blue-200' : 'border-slate-300 bg-white focus:ring-2 focus:ring-blue-500'}`}>
              <option value="">All Styles</option>{availableStyles.map((s) => <option key={s.key} value={s.key}>{s.styleNo} | {s.customerName} ({s.count})</option>)}
            </select>
          </div>
          <div className="space-y-1"><label className="block text-xs font-medium text-slate-600">Customer</label>
            <select value={filterCustomer} onChange={(e) => setFilterCustomer(e.target.value)} className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-colors ${filterCustomer ? 'border-blue-400 bg-blue-50/50 ring-1 ring-blue-200' : 'border-slate-300 bg-white focus:ring-2 focus:ring-blue-500'}`}>
              <option value="">All Customers</option>{customers.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="space-y-1"><label className="block text-xs font-medium text-slate-600">Schedule / FPO</label>
            <select value={filterSchedule} onChange={(e) => setFilterSchedule(e.target.value)} className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-colors ${filterSchedule ? 'border-blue-400 bg-blue-50/50 ring-1 ring-blue-200' : 'border-slate-300 bg-white focus:ring-2 focus:ring-blue-500'}`}>
              <option value="">All Schedules</option>{schedules.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Reports" value={totalStats.reports} /><StatCard label="Total Delivered" value={totalStats.delivered} color="green" /><StatCard label="Total PD" value={totalStats.pd} color="orange" />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50 px-6 py-3 flex items-center justify-between">
          {hasFilters ? <p className="text-sm font-medium text-slate-700">{filteredSummaries.length} of {summaries.length} reports</p>
            : <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-slate-400" /><p className="text-sm font-medium text-slate-700">Recent {Math.min(RECENT_LIMIT, summaries.length)} of {summaries.length}</p><span className="text-xs text-slate-400">(use filters to search all)</span></div>}
        </div>
        {loading ? <div className="py-16 text-center text-slate-400">Loading...</div>
          : error ? <div className="py-8 text-center text-red-500">{error}</div>
          : displaySummaries.length === 0 ? <div className="py-16 text-center text-slate-400"><LayoutDashboard className="mx-auto mb-3 h-12 w-12 opacity-20" /><p>{hasFilters ? 'No reports match.' : 'No delivery tracker data.'}</p></div>
          : <div className="divide-y divide-slate-100">
              {displaySummaries.map((summary) => {
                const isExp = expandedId === summary.storeInRecordId;
                return (
                  <div key={summary.storeInRecordId}>
                    <div className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50/50 cursor-pointer transition-colors" onClick={() => setExpandedId(isExp ? null : summary.storeInRecordId)}>
                      {isExp ? <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" /> : <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2"><p className="font-bold text-slate-900">{summary.styleNo}</p><span className="text-xs text-slate-500">{summary.customerName}</span></div>
                        <p className="text-xs text-slate-500 mt-0.5">FPO: <span className="font-medium text-slate-700">{summary.fpoNo}</span> | Order: {summary.orderQty} | Received: {summary.receivedQty}</p>
                      </div>
                      <div className="text-right space-y-0.5 shrink-0">
                        <div className="text-xs">Delivered: <span className="font-bold text-emerald-600">{summary.deliveredQty}</span></div>
                        <div className="text-xs">PD: <span className="font-bold text-red-600">{summary.pdTotal}</span> ({summary.pdPercentage}%)</div>
                        <div className="text-xs">Balance: <span className="font-bold text-blue-700">{summary.balanceToRec}</span></div>
                      </div>
                    </div>
                    <AnimatePresence>
                      {isExp && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="border-t border-slate-100 bg-slate-50/50 px-6 py-4 overflow-hidden overflow-x-auto">
                          <table className="w-full text-xs border-collapse mb-4">
                            <thead><tr className="bg-slate-100 text-slate-600">
                              <th className="px-2 py-1.5 text-left font-medium">Date</th><th className="px-2 py-1.5 text-left font-medium">AD</th><th className="px-2 py-1.5 text-left font-medium">Cut</th><th className="px-2 py-1.5 text-right font-medium">FPO Qty</th>
                              {summary.allSizes.map((sz) => <th key={sz} className="px-2 py-1.5 text-center font-medium">{sz}</th>)}
                              <th className="px-2 py-1.5 text-right font-medium">PD</th><th className="px-2 py-1.5 text-right font-medium">FD</th>
                            </tr></thead>
                            <tbody>{summary.rows.map((row, ri) => (
                              <tr key={ri} className="border-b border-slate-100 hover:bg-white">
                                <td className="px-2 py-1">{row.deliveryDate}</td><td className="px-2 py-1 font-medium">{row.ad}</td><td className="px-2 py-1">{row.cutNo}</td><td className="px-2 py-1 text-right font-bold">{row.fpoQty}</td>
                                {summary.allSizes.map((sz) => { const d = row.sizeBreakdown.find((s) => s.size === sz); return <td key={sz} className="px-2 py-1 text-center">{d?.qty || '-'}</td>; })}
                                <td className="px-2 py-1 text-right text-red-600 font-bold">{row.sizePdTotal || '-'}</td><td className="px-2 py-1 text-right text-amber-600">{row.fdTotal || '-'}</td>
                              </tr>
                            ))}</tbody>
                            <tfoot><tr className="bg-slate-100 font-bold text-slate-800">
                              <td colSpan={3} className="px-2 py-1.5">Totals</td><td className="px-2 py-1.5 text-right">{summary.grandTotalQty}</td>
                              {summary.allSizes.map((sz) => { const d = summary.sizeTotals.find((s) => s.size === sz); return <td key={sz} className="px-2 py-1.5 text-center">{d?.qty || '-'}</td>; })}
                              <td className="px-2 py-1.5 text-right text-red-600">{summary.grandPdTotal}</td><td className="px-2 py-1.5 text-right text-amber-600">{summary.grandFdTotal}</td>
                            </tr></tfoot>
                          </table>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>}
      </div>
    </motion.div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color?: 'orange' | 'blue' | 'green' }) {
  const cc = color === 'orange' ? 'text-orange-700' : color === 'blue' ? 'text-blue-700' : color === 'green' ? 'text-emerald-700' : 'text-slate-700';
  return <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm"><p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">{label}</p><p className={`text-xl font-black ${cc}`}>{value.toLocaleString()}</p></div>;
}