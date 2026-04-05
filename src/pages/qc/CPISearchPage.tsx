// src/pages/qc/CPISearchPage.tsx
import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ClipboardList, ChevronDown, ChevronRight, Filter, CalendarDays, RotateCcw, Clock, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { useQCStore } from '../../store/qcStore';

const RECENT_LIMIT = 10;

export default function CPISearchPage() {
  const { cpiReports, fetchReports } = useQCStore();
  const [filterStyle, setFilterStyle] = useState('');
  const [filterCustomer, setFilterCustomer] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => { setIsLoading(true); try { await fetchReports(); } catch (e) { console.error(e); } finally { setIsLoading(false); } };
    load();
  }, [fetchReports]);

  const availableStyles = useMemo(() => {
    const map = new Map<string, { styleNo: string; customer: string; count: number; latestDate: string }>();
    cpiReports.forEach((r) => {
      const key = `${r.styleNo}|||${r.customer}`;
      const ex = map.get(key);
      if (ex) { ex.count++; if ((r.date || '') > ex.latestDate) ex.latestDate = r.date || ''; }
      else map.set(key, { styleNo: r.styleNo, customer: r.customer, count: 1, latestDate: r.date || '' });
    });
    return Array.from(map.entries()).map(([key, val]) => ({ key, ...val })).sort((a, b) => b.latestDate.localeCompare(a.latestDate));
  }, [cpiReports]);

  const customers = useMemo(() => Array.from(new Set(cpiReports.map((r) => r.customer).filter(Boolean))).sort(), [cpiReports]);
  const hasFilters = !!(filterStyle || filterCustomer || filterStatus || filterDateFrom || filterDateTo);

  const filteredRecords = useMemo(() => {
    let recs = [...cpiReports];
    if (filterStyle) { const [sn, cn] = filterStyle.split('|||'); recs = recs.filter((r) => r.styleNo === sn && r.customer === cn); }
    if (filterCustomer) recs = recs.filter((r) => r.customer === filterCustomer);
    if (filterStatus) recs = recs.filter((r) => r.inspectionStatus === filterStatus);
    if (filterDateFrom) recs = recs.filter((r) => (r.date || '') >= filterDateFrom);
    if (filterDateTo) recs = recs.filter((r) => (r.date || '') <= filterDateTo);
    return recs;
  }, [cpiReports, filterStyle, filterCustomer, filterStatus, filterDateFrom, filterDateTo]);

  const displayRecords = useMemo(() => {
    if (!hasFilters) return [...cpiReports].sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, RECENT_LIMIT);
    return filteredRecords;
  }, [hasFilters, cpiReports, filteredRecords]);

  const summary = useMemo(() => ({
    total: displayRecords.length,
    passed: displayRecords.filter((r) => r.inspectionStatus === 'Passed').length,
    failed: displayRecords.filter((r) => r.inspectionStatus === 'Failed').length,
    pending: displayRecords.filter((r) => r.inspectionStatus === 'Pending').length,
  }), [displayRecords]);

  const clearFilters = () => { setFilterStyle(''); setFilterCustomer(''); setFilterStatus(''); setFilterDateFrom(''); setFilterDateTo(''); setExpandedId(null); };
  const activeCount = [filterStyle, filterCustomer, filterStatus, filterDateFrom, filterDateTo].filter(Boolean).length;

  const statusBadge = (status: string) => {
    if (status === 'Passed') return <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700"><CheckCircle2 className="h-3 w-3" />Passed</span>;
    if (status === 'Failed') return <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-700"><XCircle className="h-3 w-3" />Failed</span>;
    return <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700"><AlertCircle className="h-3 w-3" />Pending</span>;
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-6xl space-y-6 pb-12">
      <div className="flex items-center space-x-3 border-b border-slate-200 pb-4">
        <div className="rounded-lg bg-teal-100 p-2"><Search className="h-6 w-6 text-teal-700" /></div>
        <div><h2 className="text-2xl font-bold text-slate-900">CPI Inspection Search</h2><p className="text-sm text-slate-500">Search CPI inspection reports by style, status, and date range.</p></div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2"><Filter className="h-4 w-4 text-slate-500" /><h3 className="text-sm font-bold text-slate-700">Filters</h3>
            {activeCount > 0 && <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">{activeCount} active</span>}
          </div>
          <button onClick={clearFilters} className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${hasFilters ? 'bg-red-50 border border-red-200 text-red-700 hover:bg-red-100' : 'bg-slate-50 border border-slate-200 text-slate-400 cursor-default'}`}><RotateCcw className="h-3.5 w-3.5" />Clear All</button>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1 lg:col-span-2"><label className="block text-xs font-medium text-slate-600">Style</label>
            <select value={filterStyle} onChange={(e) => setFilterStyle(e.target.value)} className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-colors ${filterStyle ? 'border-blue-400 bg-blue-50/50 ring-1 ring-blue-200' : 'border-slate-300 bg-white focus:ring-2 focus:ring-blue-500'}`}>
              <option value="">All Styles</option>{availableStyles.map((s) => <option key={s.key} value={s.key}>{s.styleNo} | {s.customer} ({s.count})</option>)}
            </select>
          </div>
          <div className="space-y-1"><label className="block text-xs font-medium text-slate-600">Customer</label>
            <select value={filterCustomer} onChange={(e) => setFilterCustomer(e.target.value)} className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-colors ${filterCustomer ? 'border-blue-400 bg-blue-50/50 ring-1 ring-blue-200' : 'border-slate-300 bg-white focus:ring-2 focus:ring-blue-500'}`}>
              <option value="">All Customers</option>{customers.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="space-y-1"><label className="block text-xs font-medium text-slate-600">Inspection Status</label>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-colors ${filterStatus ? 'border-blue-400 bg-blue-50/50 ring-1 ring-blue-200' : 'border-slate-300 bg-white focus:ring-2 focus:ring-blue-500'}`}>
              <option value="">All Statuses</option><option value="Passed">Passed</option><option value="Failed">Failed</option><option value="Pending">Pending</option>
            </select>
          </div>
          <div className="space-y-1"><label className="block text-xs font-medium text-slate-600"><CalendarDays className="mr-1 inline h-3 w-3" />Date From</label>
            <input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-colors ${filterDateFrom ? 'border-blue-400 bg-blue-50/50 ring-1 ring-blue-200' : 'border-slate-300 bg-white focus:ring-2 focus:ring-blue-500'}`} />
          </div>
          <div className="space-y-1"><label className="block text-xs font-medium text-slate-600"><CalendarDays className="mr-1 inline h-3 w-3" />Date To</label>
            <input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-colors ${filterDateTo ? 'border-blue-400 bg-blue-50/50 ring-1 ring-blue-200' : 'border-slate-300 bg-white focus:ring-2 focus:ring-blue-500'}`} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Reports" value={summary.total} /><StatCard label="Passed" value={summary.passed} color="green" /><StatCard label="Failed" value={summary.failed} color="orange" /><StatCard label="Pending" value={summary.pending} color="blue" />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50 px-6 py-3 flex items-center justify-between">
          {hasFilters ? <p className="text-sm font-medium text-slate-700">{filteredRecords.length} of {cpiReports.length} reports</p>
            : <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-slate-400" /><p className="text-sm font-medium text-slate-700">Recent {Math.min(RECENT_LIMIT, cpiReports.length)} of {cpiReports.length}</p><span className="text-xs text-slate-400">(use filters to search all)</span></div>}
        </div>
        {isLoading ? <div className="py-16 text-center text-slate-400">Loading...</div>
          : displayRecords.length === 0 ? <div className="py-16 text-center text-slate-400"><ClipboardList className="mx-auto mb-3 h-12 w-12 opacity-20" /><p>{hasFilters ? 'No reports match.' : 'No CPI reports yet.'}</p></div>
          : <div className="divide-y divide-slate-100">
              {displayRecords.map((rep) => {
                const isExp = expandedId === rep.id;
                return (
                  <div key={rep.id}>
                    <div className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50/50 cursor-pointer transition-colors" onClick={() => setExpandedId(isExp ? null : rep.id)}>
                      {isExp ? <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" /> : <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap"><p className="font-bold text-slate-900">{rep.styleNo}</p>{statusBadge(rep.inspectionStatus)}<span className="text-xs text-slate-500">{rep.customer}</span></div>
                        <p className="text-xs text-slate-500 mt-0.5">Sch: <span className="font-medium text-slate-700">{rep.scheduleNo}</span> | Date: <span className="font-medium text-slate-700">{rep.date}</span> | Checked by: <span className="font-medium text-slate-700">{rep.checkedBy || '-'}</span></p>
                      </div>
                      <div className="text-right space-y-0.5 shrink-0">
                        <div className="text-xs">Received: <span className="font-bold text-orange-600">{rep.receivedQty}</span></div>
                        <div className="text-xs">Checked: <span className="font-bold text-slate-700">{rep.checkedQty}</span></div>
                        <div className="text-xs">Rej: <span className="font-bold text-red-600">{rep.rejDamageQty}</span> ({rep.rejectionPercentage || '0'}%)</div>
                      </div>
                    </div>
                    <AnimatePresence>
                      {isExp && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="border-t border-slate-100 bg-slate-50/50 px-6 py-4 overflow-hidden">
                          <div className="grid grid-cols-2 gap-3 md:grid-cols-5 mb-4">
                            <MiniStat label="Received Qty" value={rep.receivedQty} color="orange" /><MiniStat label="CPI Qty" value={rep.cpiQty} /><MiniStat label="Cutting Qty" value={rep.cuttingQty} /><MiniStat label="Rejected" value={rep.rejDamageQty} color="orange" /><MiniStat label="Balance" value={rep.balanceQty} color="blue" />
                          </div>
                          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 mb-4 p-3 rounded-lg bg-white border border-slate-200">
                            <InfoField label="Body Colour" value={rep.bodyColour} /><InfoField label="Print Colour" value={rep.printColour} /><InfoField label="Auditor" value={rep.cpiAuditor} /><InfoField label="App/Rej" value={rep.appRej} />
                          </div>
                          {(rep.cutInspections ?? []).map((ci) => (
                            <div key={ci.cutNo} className="mb-3 p-3 rounded-lg border border-slate-200 bg-white">
                              <div className="flex items-center gap-2 mb-2"><span className="text-sm font-bold text-slate-700">{ci.cutNo}</span><span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-600">Qty: {ci.cutQty} | Sample: {ci.sampleSize}</span><span className="text-[10px] text-slate-400">Part: {ci.part || '-'}</span></div>
                              <div className="text-xs text-slate-500 mb-1">Bundles: {ci.bundleNos || '-'} | Sizes: {ci.sizes || '-'}</div>
                              <div className="text-xs"><span className="text-red-600 font-bold">Defects: {ci.totalDefectedQty}</span> ({ci.totalPercentage || '0'}%)</div>
                            </div>
                          ))}
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
function MiniStat({ label, value, color }: { label: string; value: number; color?: 'orange' | 'blue' }) {
  const cc = color === 'orange' ? 'text-orange-700' : color === 'blue' ? 'text-blue-700' : 'text-slate-700';
  return <div className="rounded-lg bg-white border border-slate-200 px-3 py-2"><p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">{label}</p><p className={`text-lg font-black ${cc}`}>{value}</p></div>;
}
function InfoField({ label, value }: { label: string; value: string }) {
  return <div className="space-y-0.5"><label className="block text-[10px] font-medium uppercase tracking-wide text-slate-400">{label}</label><p className="text-sm font-medium text-slate-700">{value || '-'}</p></div>;
}
