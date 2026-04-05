// src/pages/audit/AuditSearchPage.tsx
import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, FileText, ChevronDown, ChevronRight, Filter, CalendarDays, RotateCcw, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { API, getAuthHeaders } from '../../api/client';

interface AuditBundle { bundleNo: string; size: string; qty: number; }
interface AuditRecord {
  id: string; storeInRecordId: string; submissionId: string; revisionNo: number;
  date: string; styleNo: string; customerName: string; scheduleNo: string;
  colour: string; cutNo: string; sizes: string; bundles: AuditBundle[];
  releaseQty: number; auditQty: number; status: string; auditorName: string; remarks: string;
}

const RECENT_LIMIT = 10;

export default function AuditSearchPage() {
  const [records, setRecords] = useState<AuditRecord[]>([]);
  const [filterStyle, setFilterStyle] = useState('');
  const [filterCustomer, setFilterCustomer] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`${API.AUDIT}/records`, { headers: getAuthHeaders() });
        if (res.ok) setRecords(await res.json());
      } catch (e) { console.error(e); }
      finally { setIsLoading(false); }
    };
    load();
  }, []);

  const availableStyles = useMemo(() => {
    const map = new Map<string, { styleNo: string; customerName: string; count: number; latestDate: string }>();
    records.forEach((r) => {
      const key = `${r.styleNo}|||${r.customerName}`;
      const ex = map.get(key);
      if (ex) { ex.count++; if ((r.date || '') > ex.latestDate) ex.latestDate = r.date || ''; }
      else map.set(key, { styleNo: r.styleNo, customerName: r.customerName, count: 1, latestDate: r.date || '' });
    });
    return Array.from(map.entries()).map(([key, val]) => ({ key, ...val })).sort((a, b) => b.latestDate.localeCompare(a.latestDate));
  }, [records]);

  const customers = useMemo(() => Array.from(new Set(records.map((r) => r.customerName).filter(Boolean))).sort(), [records]);
  const hasFilters = !!(filterStyle || filterCustomer || filterStatus || filterDateFrom || filterDateTo);

  const filteredRecords = useMemo(() => {
    let recs = [...records];
    if (filterStyle) { const [sn, cn] = filterStyle.split('|||'); recs = recs.filter((r) => r.styleNo === sn && r.customerName === cn); }
    if (filterCustomer) recs = recs.filter((r) => r.customerName === filterCustomer);
    if (filterStatus) recs = recs.filter((r) => r.status === filterStatus);
    if (filterDateFrom) recs = recs.filter((r) => (r.date || '') >= filterDateFrom);
    if (filterDateTo) recs = recs.filter((r) => (r.date || '') <= filterDateTo);
    return recs;
  }, [records, filterStyle, filterCustomer, filterStatus, filterDateFrom, filterDateTo]);

  const displayRecords = useMemo(() => {
    if (!hasFilters) return [...records].sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, RECENT_LIMIT);
    return filteredRecords;
  }, [hasFilters, records, filteredRecords]);

  const summary = useMemo(() => ({
    total: displayRecords.length,
    passed: displayRecords.filter((r) => r.status === 'Pass').length,
    failed: displayRecords.filter((r) => r.status === 'Fail').length,
    totalAuditQty: displayRecords.reduce((s, r) => s + r.auditQty, 0),
  }), [displayRecords]);

  const clearFilters = () => { setFilterStyle(''); setFilterCustomer(''); setFilterStatus(''); setFilterDateFrom(''); setFilterDateTo(''); setExpandedId(null); };
  const activeCount = [filterStyle, filterCustomer, filterStatus, filterDateFrom, filterDateTo].filter(Boolean).length;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-6xl space-y-6 pb-12">
      <div className="flex items-center space-x-3 border-b border-slate-200 pb-4">
        <div className="rounded-lg bg-purple-100 p-2"><Search className="h-6 w-6 text-purple-700" /></div>
        <div><h2 className="text-2xl font-bold text-slate-900">Audit Search</h2><p className="text-sm text-slate-500">Search audit records by style, customer, status, and date range.</p></div>
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
              <option value="">All Styles</option>{availableStyles.map((s) => <option key={s.key} value={s.key}>{s.styleNo} | {s.customerName} ({s.count})</option>)}
            </select>
          </div>
          <div className="space-y-1"><label className="block text-xs font-medium text-slate-600">Customer</label>
            <select value={filterCustomer} onChange={(e) => setFilterCustomer(e.target.value)} className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-colors ${filterCustomer ? 'border-blue-400 bg-blue-50/50 ring-1 ring-blue-200' : 'border-slate-300 bg-white focus:ring-2 focus:ring-blue-500'}`}>
              <option value="">All Customers</option>{customers.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="space-y-1"><label className="block text-xs font-medium text-slate-600">Status</label>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-colors ${filterStatus ? 'border-blue-400 bg-blue-50/50 ring-1 ring-blue-200' : 'border-slate-300 bg-white focus:ring-2 focus:ring-blue-500'}`}>
              <option value="">All Statuses</option><option value="Pass">Pass</option><option value="Fail">Fail</option>
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
        <StatCard label="Records" value={summary.total} /><StatCard label="Pass" value={summary.passed} color="green" /><StatCard label="Fail" value={summary.failed} color="orange" /><StatCard label="Total Audit Qty" value={summary.totalAuditQty} color="blue" />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50 px-6 py-3 flex items-center justify-between">
          {hasFilters ? <p className="text-sm font-medium text-slate-700">{filteredRecords.length} of {records.length} records</p>
            : <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-slate-400" /><p className="text-sm font-medium text-slate-700">Recent {Math.min(RECENT_LIMIT, records.length)} of {records.length}</p><span className="text-xs text-slate-400">(use filters to search all)</span></div>}
        </div>
        {isLoading ? <div className="py-16 text-center text-slate-400">Loading...</div>
          : displayRecords.length === 0 ? <div className="py-16 text-center text-slate-400"><FileText className="mx-auto mb-3 h-12 w-12 opacity-20" /><p>{hasFilters ? 'No records match.' : 'No audit records yet.'}</p></div>
          : <div className="divide-y divide-slate-100">
              {displayRecords.map((rec) => {
                const isExp = expandedId === rec.id;
                return (
                  <div key={rec.id}>
                    <div className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50/50 cursor-pointer transition-colors" onClick={() => setExpandedId(isExp ? null : rec.id)}>
                      {isExp ? <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" /> : <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-slate-900">{rec.styleNo}</p>
                          {rec.status === 'Pass' ? <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700"><CheckCircle2 className="h-3 w-3" />Pass</span>
                            : <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-700"><XCircle className="h-3 w-3" />Fail</span>}
                          <span className="text-xs text-slate-500">{rec.customerName}</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">Sch: <span className="font-medium text-slate-700">{rec.scheduleNo}</span> | Cut: <span className="font-medium text-slate-700">{rec.cutNo}</span> | Date: <span className="font-medium text-slate-700">{rec.date}</span></p>
                      </div>
                      <div className="text-right space-y-0.5 shrink-0">
                        <div className="text-xs">Release: <span className="font-bold text-orange-600">{rec.releaseQty}</span></div>
                        <div className="text-xs">Audit: <span className="font-bold text-blue-700">{rec.auditQty}</span></div>
                        <div className="text-xs text-slate-500">{(rec.bundles || []).length} bundle{(rec.bundles || []).length !== 1 ? 's' : ''}</div>
                      </div>
                    </div>
                    <AnimatePresence>
                      {isExp && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="border-t border-slate-100 bg-slate-50/50 px-6 py-4 overflow-hidden">
                          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 mb-4 p-3 rounded-lg bg-white border border-slate-200">
                            <InfoField label="Colour" value={rec.colour} /><InfoField label="Sizes" value={rec.sizes} /><InfoField label="Auditor" value={rec.auditorName} /><InfoField label="Remarks" value={rec.remarks} />
                          </div>
                          {(rec.bundles || []).length > 0 && (
                            <div className="flex gap-2 flex-wrap">
                              {rec.bundles.map((b, i) => (
                                <span key={i} className="rounded bg-purple-100 px-2 py-1 text-xs font-medium text-purple-800">{b.bundleNo} ({b.size}) — {b.qty}</span>
                              ))}
                            </div>
                          )}
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
function InfoField({ label, value }: { label: string; value: string }) {
  return <div className="space-y-0.5"><label className="block text-[10px] font-medium uppercase tracking-wide text-slate-400">{label}</label><p className="text-sm font-medium text-slate-700">{value || '-'}</p></div>;
}