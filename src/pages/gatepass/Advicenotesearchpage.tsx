// src/pages/gatepass/AdviceNoteSearchPage.tsx
import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Truck, ChevronDown, ChevronRight, Filter, CalendarDays, RotateCcw, Clock } from 'lucide-react';
import { useAdviceNoteStore, AdviceNoteRecord, AdviceNoteRow } from '../../store/adviceNoteStore';

const RECENT_LIMIT = 10;

export default function AdviceNoteSearchPage() {
  const { adviceNotes, fetchAdviceNotes } = useAdviceNoteStore();
  const [filterStyle, setFilterStyle] = useState('');
  const [filterCustomer, setFilterCustomer] = useState('');
  const [filterSchedule, setFilterSchedule] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => { setIsLoading(true); try { await fetchAdviceNotes(); } catch (e) { console.error(e); } finally { setIsLoading(false); } };
    load();
  }, [fetchAdviceNotes]);

  const availableStyles = useMemo(() => {
    const map = new Map<string, { styleNo: string; customerName: string; count: number; latestDate: string }>();
    adviceNotes.forEach((n) => {
      const key = `${n.styleNo}|||${n.customerName}`;
      const ex = map.get(key);
      if (ex) { ex.count++; if ((n.deliveryDate || '') > ex.latestDate) ex.latestDate = n.deliveryDate || ''; }
      else map.set(key, { styleNo: n.styleNo, customerName: n.customerName, count: 1, latestDate: n.deliveryDate || '' });
    });
    return Array.from(map.entries()).map(([key, val]) => ({ key, ...val })).sort((a, b) => b.latestDate.localeCompare(a.latestDate));
  }, [adviceNotes]);

  const customers = useMemo(() => Array.from(new Set(adviceNotes.map((n) => n.customerName).filter(Boolean))).sort(), [adviceNotes]);
  const schedules = useMemo(() => {
    let recs = adviceNotes;
    if (filterStyle) { const [sn, cn] = filterStyle.split('|||'); recs = recs.filter((n) => n.styleNo === sn && n.customerName === cn); }
    return Array.from(new Set(recs.map((n) => n.scheduleNo).filter(Boolean))).sort();
  }, [adviceNotes, filterStyle]);

  const hasFilters = !!(filterStyle || filterCustomer || filterSchedule || filterDateFrom || filterDateTo);

  const filteredRecords = useMemo(() => {
    let recs = [...adviceNotes];
    if (filterStyle) { const [sn, cn] = filterStyle.split('|||'); recs = recs.filter((n) => n.styleNo === sn && n.customerName === cn); }
    if (filterCustomer) recs = recs.filter((n) => n.customerName === filterCustomer);
    if (filterSchedule) recs = recs.filter((n) => n.scheduleNo === filterSchedule);
    if (filterDateFrom) recs = recs.filter((n) => (n.deliveryDate || '') >= filterDateFrom);
    if (filterDateTo) recs = recs.filter((n) => (n.deliveryDate || '') <= filterDateTo);
    return recs;
  }, [adviceNotes, filterStyle, filterCustomer, filterSchedule, filterDateFrom, filterDateTo]);

  const displayRecords = useMemo(() => {
    if (!hasFilters) return [...adviceNotes].sort((a, b) => (b.deliveryDate || '').localeCompare(a.deliveryDate || '')).slice(0, RECENT_LIMIT);
    return filteredRecords;
  }, [hasFilters, adviceNotes, filteredRecords]);

  const summary = useMemo(() => ({
    total: displayRecords.length,
    totalDispatched: displayRecords.reduce((s, n) => s + n.dispatchQty, 0),
    totalBalance: displayRecords.reduce((s, n) => s + n.balanceQty, 0),
  }), [displayRecords]);

  const clearFilters = () => { setFilterStyle(''); setFilterCustomer(''); setFilterSchedule(''); setFilterDateFrom(''); setFilterDateTo(''); setExpandedId(null); };
  const activeCount = [filterStyle, filterCustomer, filterSchedule, filterDateFrom, filterDateTo].filter(Boolean).length;

  const getRows = (note: AdviceNoteRecord): AdviceNoteRow[] => {
    if (!note.rows) return [];
    return Object.values(note.rows);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-6xl space-y-6 pb-12">
      <div className="flex items-center space-x-3 border-b border-slate-200 pb-4">
        <div className="rounded-lg bg-amber-100 p-2"><Search className="h-6 w-6 text-amber-700" /></div>
        <div><h2 className="text-2xl font-bold text-slate-900">Advice Note Search</h2><p className="text-sm text-slate-500">Search gatepass advice notes by style, customer, schedule, and delivery date.</p></div>
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
            <select value={filterStyle} onChange={(e) => { setFilterStyle(e.target.value); setFilterSchedule(''); }} className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-colors ${filterStyle ? 'border-blue-400 bg-blue-50/50 ring-1 ring-blue-200' : 'border-slate-300 bg-white focus:ring-2 focus:ring-blue-500'}`}>
              <option value="">All Styles</option>{availableStyles.map((s) => <option key={s.key} value={s.key}>{s.styleNo} | {s.customerName} ({s.count})</option>)}
            </select>
          </div>
          <div className="space-y-1"><label className="block text-xs font-medium text-slate-600">Customer</label>
            <select value={filterCustomer} onChange={(e) => setFilterCustomer(e.target.value)} className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-colors ${filterCustomer ? 'border-blue-400 bg-blue-50/50 ring-1 ring-blue-200' : 'border-slate-300 bg-white focus:ring-2 focus:ring-blue-500'}`}>
              <option value="">All Customers</option>{customers.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="space-y-1"><label className="block text-xs font-medium text-slate-600">Schedule No</label>
            <select value={filterSchedule} onChange={(e) => setFilterSchedule(e.target.value)} className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-colors ${filterSchedule ? 'border-blue-400 bg-blue-50/50 ring-1 ring-blue-200' : 'border-slate-300 bg-white focus:ring-2 focus:ring-blue-500'}`}>
              <option value="">All Schedules</option>{schedules.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="space-y-1"><label className="block text-xs font-medium text-slate-600"><CalendarDays className="mr-1 inline h-3 w-3" />Delivery Date From</label>
            <input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-colors ${filterDateFrom ? 'border-blue-400 bg-blue-50/50 ring-1 ring-blue-200' : 'border-slate-300 bg-white focus:ring-2 focus:ring-blue-500'}`} />
          </div>
          <div className="space-y-1"><label className="block text-xs font-medium text-slate-600"><CalendarDays className="mr-1 inline h-3 w-3" />Delivery Date To</label>
            <input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-colors ${filterDateTo ? 'border-blue-400 bg-blue-50/50 ring-1 ring-blue-200' : 'border-slate-300 bg-white focus:ring-2 focus:ring-blue-500'}`} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Advice Notes" value={summary.total} /><StatCard label="Total Dispatched" value={summary.totalDispatched} color="green" /><StatCard label="Total Balance" value={summary.totalBalance} color="blue" />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50 px-6 py-3 flex items-center justify-between">
          {hasFilters ? <p className="text-sm font-medium text-slate-700">{filteredRecords.length} of {adviceNotes.length} notes</p>
            : <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-slate-400" /><p className="text-sm font-medium text-slate-700">Recent {Math.min(RECENT_LIMIT, adviceNotes.length)} of {adviceNotes.length}</p><span className="text-xs text-slate-400">(use filters to search all)</span></div>}
        </div>
        {isLoading ? <div className="py-16 text-center text-slate-400">Loading...</div>
          : displayRecords.length === 0 ? <div className="py-16 text-center text-slate-400"><Truck className="mx-auto mb-3 h-12 w-12 opacity-20" /><p>{hasFilters ? 'No notes match.' : 'No advice notes yet.'}</p></div>
          : <div className="divide-y divide-slate-100">
              {displayRecords.map((note) => {
                const isExp = expandedId === note.id;
                const rows = getRows(note);
                const totalGood = rows.reduce((s, r) => s + r.goodQty, 0);
                const totalPd = rows.reduce((s, r) => s + r.pd, 0);
                return (
                  <div key={note.id}>
                    <div className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50/50 cursor-pointer transition-colors" onClick={() => setExpandedId(isExp ? null : note.id)}>
                      {isExp ? <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" /> : <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap"><p className="font-bold text-slate-900">{note.styleNo}</p><span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-800">AD: {note.adNo}</span><span className="text-xs text-slate-500">{note.customerName}</span></div>
                        <p className="text-xs text-slate-500 mt-0.5">Sch: <span className="font-medium text-slate-700">{note.scheduleNo}</span> | Cut: <span className="font-medium text-slate-700">{note.cutNo}</span> | Delivery: <span className="font-medium text-slate-700">{note.deliveryDate}</span></p>
                      </div>
                      <div className="text-right space-y-0.5 shrink-0">
                        <div className="text-xs">Dispatch: <span className="font-bold text-emerald-600">{note.dispatchQty}</span></div>
                        <div className="text-xs">Balance: <span className="font-bold text-blue-700">{note.balanceQty}</span></div>
                        <div className="text-xs text-slate-500">{rows.length} bundle{rows.length !== 1 ? 's' : ''}</div>
                      </div>
                    </div>
                    <AnimatePresence>
                      {isExp && rows.length > 0 && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="border-t border-slate-100 bg-slate-50/50 px-6 py-4 overflow-hidden">
                          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 mb-4 p-3 rounded-lg bg-white border border-slate-200">
                            <InfoField label="Attn" value={note.attn} /><InfoField label="Component" value={note.component} /><InfoField label="Prep By" value={note.prepByName} /><InfoField label="Remarks" value={note.remarks} />
                          </div>
                          <table className="w-full text-xs"><thead><tr className="bg-slate-100 text-slate-600"><th className="px-2 py-1.5 text-left">#</th><th className="px-2 py-1.5 text-left">Bundle</th><th className="px-2 py-1.5 text-left">Size</th><th className="px-2 py-1.5 text-left">Cut</th><th className="px-2 py-1.5 text-right">Pcs</th><th className="px-2 py-1.5 text-right">PD</th><th className="px-2 py-1.5 text-right">FD</th><th className="px-2 py-1.5 text-right">Good</th></tr></thead>
                            <tbody>{rows.map((r, i) => (<tr key={i} className="border-b border-slate-100"><td className="px-2 py-1">{i + 1}</td><td className="px-2 py-1 font-bold">{r.bundleNo}</td><td className="px-2 py-1">{r.size}</td><td className="px-2 py-1">{r.cutForm}</td><td className="px-2 py-1 text-right font-bold">{r.totalPcs}</td><td className="px-2 py-1 text-right text-red-600">{r.pd || '-'}</td><td className="px-2 py-1 text-right text-red-600">{r.fd || '-'}</td><td className="px-2 py-1 text-right font-bold text-emerald-700">{r.goodQty}</td></tr>))}</tbody>
                            <tfoot><tr className="bg-slate-100 font-bold"><td colSpan={4} className="px-2 py-1.5">Totals</td><td className="px-2 py-1.5 text-right">{rows.reduce((s, r) => s + r.totalPcs, 0)}</td><td className="px-2 py-1.5 text-right text-red-600">{totalPd}</td><td className="px-2 py-1.5 text-right text-red-600">{rows.reduce((s, r) => s + r.fd, 0)}</td><td className="px-2 py-1.5 text-right text-emerald-700">{totalGood}</td></tr></tfoot>
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
function InfoField({ label, value }: { label: string; value: string }) {
  return <div className="space-y-0.5"><label className="block text-[10px] font-medium uppercase tracking-wide text-slate-400">{label}</label><p className="text-sm font-medium text-slate-700">{value || '-'}</p></div>;
}