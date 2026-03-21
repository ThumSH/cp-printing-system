// src/pages/worker/DowntimeReportPage.tsx
import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Save, Trash2, CheckCircle2, AlertCircle, ChevronDown, ChevronRight, ShieldCheck } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

const API_BASE = 'http://localhost:5000/api/worker';
const getHeaders = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` });

const DOWNTIME_TYPES = [
  'Input Delay',
  'Ink Delay',
  'Screen Pending',
  'Glass Cleaning',
  'Correction',
  'Style Change',
  'Trainee',
  'Absent',
];

interface DowntimeEntry { type: string; hours: number; reason: string; acknowledgedBy: string; isAcknowledged: boolean; }
interface EligibleStyle { id: string; styleNo: string; customerName: string; scheduleNo: string; orderQty: number; }
interface DowntimeRecord { id: string; date: string; styleNo: string; customerName: string; storeInRecordId: string; workerName: string; entries: DowntimeEntry[]; totalHours: number; fullyAcknowledged: boolean; }

export default function DowntimeReportPage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'Admin';

  const [eligibleStyles, setEligibleStyles] = useState<EligibleStyle[]>([]);
  const [records, setRecords] = useState<DowntimeRecord[]>([]);
  const [selectedStoreInId, setSelectedStoreInId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [workerName, setWorkerName] = useState('');
  const [entries, setEntries] = useState<{ type: string; hours: string; reason: string }[]>(
    DOWNTIME_TYPES.map((t) => ({ type: t, hours: '', reason: '' }))
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pageError, setPageError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const [styRes, recRes] = await Promise.all([
        fetch(`${API_BASE}/eligible-styles`, { headers: getHeaders() }),
        fetch(`${API_BASE}/downtime`, { headers: getHeaders() }),
      ]);
      if (styRes.ok) setEligibleStyles(await styRes.json());
      if (recRes.ok) setRecords(await recRes.json());
    } catch (e) { setPageError('Failed to load data.'); }
  };

  useEffect(() => { fetchData(); }, []);

  const selectedItem = useMemo(() => eligibleStyles.find((i) => i.id === selectedStoreInId) || null, [eligibleStyles, selectedStoreInId]);

  // Only entries with hours > 0
  const filledEntries = entries.filter((e) => parseFloat(e.hours) > 0);
  const totalHours = filledEntries.reduce((s, e) => s + (parseFloat(e.hours) || 0), 0);

  const updateEntry = (index: number, field: 'hours' | 'reason', value: string) => {
    setEntries((prev) => prev.map((e, i) => i === index ? { ...e, [field]: value } : e));
  };

  const handleSubmit = async () => {
    const newErrors: Record<string, string> = {};
    if (!selectedStoreInId) newErrors.style = 'Select a style';
    if (!workerName.trim()) newErrors.worker = 'Worker name is required';
    if (filledEntries.length === 0) newErrors.entries = 'Enter hours for at least one downtime type';

    // Validate each filled entry has a reason
    filledEntries.forEach((e) => {
      if (!e.reason.trim()) newErrors[`reason_${e.type}`] = 'Reason required';
    });

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setIsSaving(true); setPageError('');
    try {
      const payload = {
        storeInRecordId: selectedStoreInId,
        date,
        workerName,
        entries: filledEntries.map((e) => ({
          type: e.type,
          hours: parseFloat(e.hours) || 0,
          reason: e.reason.trim(),
          acknowledgedBy: '',
          isAcknowledged: false,
        })),
      };

      const res = await fetch(`${API_BASE}/downtime`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(payload) });
      if (!res.ok) throw new Error(await res.text());

      setEntries(DOWNTIME_TYPES.map((t) => ({ type: t, hours: '', reason: '' })));
      setWorkerName(''); setSelectedStoreInId('');
      await fetchData();
    } catch (e) { setPageError(e instanceof Error ? e.message : 'Failed to save.'); }
    finally { setIsSaving(false); }
  };

  const handleAcknowledge = async (id: string) => {
    const adminName = prompt('Enter your name for acknowledgement:');
    if (!adminName?.trim()) return;
    try {
      const res = await fetch(`${API_BASE}/downtime/${id}/acknowledge`, {
        method: 'PUT', headers: getHeaders(), body: JSON.stringify({ acknowledgedBy: adminName.trim() }),
      });
      if (!res.ok) throw new Error(await res.text());
      await fetchData();
    } catch (e) { setPageError(e instanceof Error ? e.message : 'Failed to acknowledge.'); }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this downtime record?')) return;
    try { await fetch(`${API_BASE}/downtime/${id}`, { method: 'DELETE', headers: getHeaders() }); await fetchData(); }
    catch (e) { setPageError('Failed to delete.'); }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-5xl space-y-6 pb-12">
      <div className="flex items-center space-x-3 border-b border-slate-200 pb-4">
        <div className="rounded-lg bg-amber-100 p-2"><Clock className="h-6 w-6 text-amber-700" /></div>
        <div><h2 className="text-2xl font-bold text-slate-900">Downtime Report</h2><p className="text-sm text-slate-500">Record downtime hours. Admin acknowledges before saving to final records.</p></div>
      </div>

      {pageError && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{pageError}</div>}

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
        {/* Selection */}
        <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-5 space-y-4">
          <h4 className="border-b border-amber-200 pb-2 text-sm font-bold uppercase tracking-wider text-amber-800">Style & Worker</h4>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-600">Style No *</label>
              <select value={selectedStoreInId} onChange={(e) => setSelectedStoreInId(e.target.value)}
                className={`w-full rounded border bg-white px-3 py-2 text-sm outline-none ${errors.style ? 'border-red-400 bg-red-50' : 'border-slate-300 focus:ring-2 focus:ring-amber-500'}`}>
                <option value="">Select style...</option>
                {eligibleStyles.map((s) => (<option key={s.id} value={s.id}>{s.styleNo} | {s.customerName}</option>))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-600">Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-600">Worker Name *</label>
              <input type="text" value={workerName} onChange={(e) => setWorkerName(e.target.value)} placeholder="Worker name"
                className={`w-full rounded border px-3 py-2 text-sm outline-none ${errors.worker ? 'border-red-400 bg-red-50' : 'border-slate-300 focus:ring-2 focus:ring-amber-500'}`} />
            </div>
          </div>
        </div>

        {/* Downtime table */}
        <div className="overflow-hidden rounded-lg border border-slate-200">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-slate-800 text-white">
                <th className="border-r border-slate-600 px-4 py-2.5 text-left font-bold w-48">DOWN TIME</th>
                <th className="border-r border-slate-600 px-3 py-2.5 text-center font-bold w-24">HOURS</th>
                <th className="border-r border-slate-600 px-4 py-2.5 text-left font-bold">REASON</th>
                <th className="px-4 py-2.5 text-center font-bold w-40">ACKNOWLEDGE BY</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {entries.map((entry, idx) => (
                <tr key={entry.type} className="hover:bg-slate-50/50">
                  <td className="border-r border-slate-200 px-4 py-2 font-medium text-slate-800">{entry.type}</td>
                  <td className="border-r border-slate-200 p-0">
                    <input type="number" step="0.5" value={entry.hours} onChange={(e) => updateEntry(idx, 'hours', e.target.value)}
                      className="w-full bg-transparent py-2 text-center text-sm font-bold outline-none focus:bg-amber-50" placeholder="-" />
                  </td>
                  <td className="border-r border-slate-200 p-0">
                    <input type="text" value={entry.reason} onChange={(e) => updateEntry(idx, 'reason', e.target.value)}
                      className={`w-full bg-transparent px-3 py-2 text-sm outline-none focus:bg-amber-50 ${errors[`reason_${entry.type}`] ? 'bg-red-50' : ''}`}
                      placeholder="Enter reason..." />
                  </td>
                  <td className="px-4 py-2 text-center">
                    <span className="rounded bg-slate-100 px-3 py-1 text-xs text-slate-400">Pending admin</span>
                  </td>
                </tr>
              ))}
              {/* Totals */}
              <tr className="bg-slate-100 font-bold border-t-2 border-slate-400">
                <td className="border-r border-slate-300 px-4 py-2 text-right text-xs uppercase text-slate-500">TOTAL</td>
                <td className="border-r border-slate-300 px-3 py-2 text-center text-amber-700">{totalHours > 0 ? totalHours.toFixed(1) : '-'}</td>
                <td className="border-r border-slate-300" colSpan={2}></td>
              </tr>
            </tbody>
          </table>
        </div>

        {errors.entries && <p className="text-[11px] text-red-600"><AlertCircle className="mr-1 inline h-3 w-3" />{errors.entries}</p>}

        <button onClick={handleSubmit} disabled={isSaving}
          className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-amber-700 transition-colors disabled:opacity-50">
          <Save className="h-4 w-4" />{isSaving ? 'Saving...' : 'Submit Downtime Report'}
        </button>
      </div>

      {/* Existing records */}
      {records.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-slate-200 bg-slate-50 px-6 py-4"><h3 className="text-lg font-semibold text-slate-800">Downtime Records</h3><p className="text-xs text-slate-500 mt-0.5">{records.length} record(s)</p></div>
          <div className="divide-y divide-slate-100">
            {records.map((rec) => {
              const isExp = expandedId === rec.id;
              return (
                <div key={rec.id}>
                  <div className="flex items-center gap-4 px-6 py-3 hover:bg-slate-50/50 cursor-pointer transition-colors" onClick={() => setExpandedId(isExp ? null : rec.id)}>
                    {isExp ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{rec.styleNo}</span>
                        <span className="text-xs text-slate-500">{rec.customerName}</span>
                        <span className="text-xs text-slate-500">Worker: {rec.workerName}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${rec.fullyAcknowledged ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                          {rec.fullyAcknowledged ? 'Acknowledged' : 'Pending'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">Date: {rec.date} | Total Hours: {rec.totalHours}</p>
                    </div>
                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                      {isAdmin && !rec.fullyAcknowledged && (
                        <button onClick={() => handleAcknowledge(rec.id)} className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors" title="Acknowledge">
                          <ShieldCheck className="h-3.5 w-3.5" /> Acknowledge
                        </button>
                      )}
                      <button onClick={() => handleDelete(rec.id)} className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                  <AnimatePresence>{isExp && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="border-t border-slate-100 bg-slate-50/50 px-6 py-3 overflow-hidden">
                      <table className="w-full text-xs border-collapse">
                        <thead><tr className="text-slate-500 border-b border-slate-200">
                          <th className="py-1 text-left">Down Time</th><th className="py-1 text-right">Hours</th><th className="py-1 text-left">Reason</th><th className="py-1 text-center">Acknowledged</th>
                        </tr></thead>
                        <tbody>
                          {(rec.entries || []).map((e, i) => (
                            <tr key={i} className="border-b border-slate-100">
                              <td className="py-1 font-medium">{e.type}</td>
                              <td className="py-1 text-right font-bold text-amber-700">{e.hours}</td>
                              <td className="py-1 text-slate-600">{e.reason}</td>
                              <td className="py-1 text-center">
                                {e.isAcknowledged ? (
                                  <span className="inline-flex items-center gap-1 text-emerald-700"><CheckCircle2 className="h-3 w-3" />{e.acknowledgedBy}</span>
                                ) : (
                                  <span className="text-slate-400">Pending</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </motion.div>
                  )}</AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </motion.div>
  );
}