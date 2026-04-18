// src/pages/worker/DowntimePage.tsx
import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Save, Trash2, AlertCircle, Plus, ChevronDown, ChevronRight, CheckCircle2, XCircle, ShieldCheck } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { API } from '../../api/client';

const API_BASE = API.WORKER;
const getHeaders = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` });

const DOWNTIME_TYPES = [
  'Machine Breakdown',
  'Power Cut',
  'Material Shortage',
  'Maintenance',
  'Worker Absence',
  'Quality Issue',
  'Setup / Changeover',
  'Other',
];

interface DowntimeEntry { type: string; hours: number; reason: string; timeFrom: string; timeTo: string; isAcknowledged: boolean; acknowledgedBy: string; }
interface DowntimeRecord { id: string; storeInRecordId: string; date: string; styleNo: string; customerName: string; tableNo: string; workerName: string; entries: DowntimeEntry[]; totalHours: number; fullyAcknowledged: boolean; }
interface EligibleStyle { id: string; styleNo: string; customerName: string; scheduleNo: string; components: string; bodyColour: string; orderQty: number; }

// Local staging entry
interface StagingEntry { tempId: string; type: string; hours: string; reason: string; timeFrom: string; timeTo: string; }

export default function DowntimePage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'Admin';

  const [eligibleStyles, setEligibleStyles] = useState<EligibleStyle[]>([]);
  const [records, setRecords] = useState<DowntimeRecord[]>([]);
  const [selectedStoreInId, setSelectedStoreInId] = useState('');
  const [tableNo, setTableNo] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [workerName, setWorkerName] = useState('');

  // Staging entries (accumulate before submit)
  const [stagingEntries, setStagingEntries] = useState<StagingEntry[]>([]);

  // New entry form
  const [entryType, setEntryType] = useState('');
  const [entryHours, setEntryHours] = useState('');
  const [entryReason, setEntryReason] = useState('');
  const [entryTimeFrom, setEntryTimeFrom] = useState('');
  const [entryTimeTo, setEntryTimeTo] = useState('');

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

  // Separate pending vs acknowledged records
  const pendingRecords = records.filter((r) => !r.fullyAcknowledged);
  const acknowledgedRecords = records.filter((r) => r.fullyAcknowledged);

  const handleAddEntry = () => {
    const newErrors: Record<string, string> = {};
    if (!entryType) newErrors.entryType = 'Select a type';
    if (!(parseFloat(entryHours) > 0)) newErrors.entryHours = 'Hours must be > 0';
    if (!entryReason.trim()) newErrors.entryReason = 'Reason is required';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setStagingEntries((prev) => [...prev, {
      tempId: crypto.randomUUID(),
      type: entryType,
      hours: entryHours,
      reason: entryReason.trim(),
      timeFrom: entryTimeFrom,
      timeTo: entryTimeTo,
    }]);

    setEntryType(''); setEntryHours(''); setEntryReason(''); setEntryTimeFrom(''); setEntryTimeTo('');
    setErrors({});
  };

  const handleSubmit = async () => {
    const newErrors: Record<string, string> = {};
    if (!date) newErrors.date = 'Date is required';
    if (!workerName.trim()) newErrors.workerName = 'Worker name is required';
    if (stagingEntries.length === 0) newErrors.entries = 'Add at least one downtime entry';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setIsSaving(true); setPageError('');
    try {
      const payload = {
        storeInRecordId: selectedStoreInId || '',
        date,
        tableNo,
        workerName,
        entries: stagingEntries.map((e) => ({
          type: e.type,
          hours: parseFloat(e.hours) || 0,
          reason: e.reason,
          timeFrom: e.timeFrom,
          timeTo: e.timeTo,
        })),
      };

      const res = await fetch(`${API_BASE}/downtime`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(payload) });
      if (!res.ok) throw new Error(await res.text());

      setStagingEntries([]); setWorkerName(''); setTableNo(''); setSelectedStoreInId('');
      await fetchData();
    } catch (e) { setPageError(e instanceof Error ? e.message : 'Failed to save.'); }
    finally { setIsSaving(false); }
  };

  const handleAcknowledge = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/downtime/${id}/acknowledge`, {
        method: 'PUT', headers: getHeaders(),
        body: JSON.stringify({ acknowledgedBy: user?.name || 'Admin' }),
      });
      if (!res.ok) throw new Error(await res.text());
      await fetchData();
    } catch (e) { setPageError(e instanceof Error ? e.message : 'Failed to acknowledge.'); }
  };

  const handleReject = async (id: string) => {
    if (!window.confirm('Reject and delete this downtime report?')) return;
    try {
      const res = await fetch(`${API_BASE}/downtime/${id}/reject`, { method: 'PUT', headers: getHeaders() });
      if (!res.ok) throw new Error(await res.text());
      await fetchData();
    } catch (e) { setPageError(e instanceof Error ? e.message : 'Failed to reject.'); }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this record?')) return;
    try { await fetch(`${API_BASE}/downtime/${id}`, { method: 'DELETE', headers: getHeaders() }); await fetchData(); }
    catch (e) { setPageError('Failed to delete.'); }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-5xl space-y-6 pb-12">
      <div className="flex items-center space-x-3 border-b border-slate-200 pb-4">
        <div className="rounded-lg bg-amber-100 p-2"><Clock className="h-6 w-6 text-amber-700" /></div>
        <div><h2 className="text-2xl font-bold text-slate-900">Downtime Reports</h2>
          <p className="text-sm text-slate-500">{isAdmin ? 'Review and approve/reject worker downtime requests.' : 'Submit downtime reasons for approval.'}</p>
        </div>
      </div>

      {pageError && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{pageError}</div>}

      {/* ==========================================
          WORKER: Submit downtime form
          ========================================== */}
      {!isAdmin && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
          <h3 className="text-lg font-semibold text-slate-800">Submit Downtime</h3>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-600">Date *</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-600">Style (optional)</label>
              <select value={selectedStoreInId} onChange={(e) => setSelectedStoreInId(e.target.value)}
                className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-500">
                <option value="">No style</option>
                {eligibleStyles.map((s) => (<option key={s.id} value={s.id}>{s.styleNo} | {s.customerName}</option>))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-600">Table No</label>
              <input type="text" value={tableNo} onChange={(e) => setTableNo(e.target.value)} placeholder="T01"
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-600">Worker Name *</label>
              <input type="text" value={workerName} onChange={(e) => setWorkerName(e.target.value)} placeholder="Your name"
                className={`w-full rounded border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-500 ${errors.workerName ? 'border-red-400 bg-red-50' : 'border-slate-300'}`} />
            </div>
          </div>

          {/* Add entry form */}
          <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4 space-y-3">
            <h4 className="text-sm font-bold text-amber-800">Add Downtime Entry</h4>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
              <div className="space-y-1 md:col-span-2">
                <label className="block text-[10px] font-medium text-slate-600">Type *</label>
                <select value={entryType} onChange={(e) => setEntryType(e.target.value)}
                  className={`w-full rounded border bg-white px-3 py-2 text-sm outline-none ${errors.entryType ? 'border-red-400' : 'border-slate-300 focus:ring-2 focus:ring-amber-500'}`}>
                  <option value="">Select type...</option>
                  {DOWNTIME_TYPES.map((t) => (<option key={t} value={t}>{t}</option>))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="block text-[10px] font-medium text-slate-600">Hours *</label>
                <input type="number" step="0.5" value={entryHours} onChange={(e) => setEntryHours(e.target.value)} placeholder="1.5"
                  className={`w-full rounded border px-3 py-2 text-sm font-bold outline-none ${errors.entryHours ? 'border-red-400' : 'border-slate-300 focus:ring-2 focus:ring-amber-500'}`} />
              </div>
              <div className="space-y-1">
                <label className="block text-[10px] font-medium text-slate-600">From</label>
                <input type="time" value={entryTimeFrom} onChange={(e) => setEntryTimeFrom(e.target.value)}
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-500" />
              </div>
              <div className="space-y-1">
                <label className="block text-[10px] font-medium text-slate-600">To</label>
                <input type="time" value={entryTimeTo} onChange={(e) => setEntryTimeTo(e.target.value)}
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-500" />
              </div>
              <div className="flex items-end">
                <button type="button" onClick={handleAddEntry}
                  className="inline-flex items-center gap-1 rounded-lg bg-amber-600 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-700 transition-colors w-full justify-center">
                  <Plus className="h-4 w-4" /> Add
                </button>
              </div>
            </div>
            <div className="space-y-1">
              <label className="block text-[10px] font-medium text-slate-600">Reason / Description *</label>
              <input type="text" value={entryReason} onChange={(e) => setEntryReason(e.target.value)} placeholder="Describe the downtime reason..."
                className={`w-full rounded border px-3 py-2 text-sm outline-none ${errors.entryReason ? 'border-red-400' : 'border-slate-300 focus:ring-2 focus:ring-amber-500'}`} />
            </div>
          </div>

          {/* Staging entries */}
          {stagingEntries.length > 0 && (
            <div className="rounded-lg border border-slate-200 overflow-hidden">
              <div className="bg-slate-800 px-4 py-2 text-sm font-bold text-white">Entries — {stagingEntries.length} | Total: {stagingEntries.reduce((s, e) => s + (parseFloat(e.hours) || 0), 0).toFixed(1)} hrs</div>
              <table className="w-full text-sm">
                <thead><tr className="bg-slate-50 text-xs font-semibold text-slate-600 border-b border-slate-200">
                  <th className="px-3 py-2 text-left">Type</th><th className="px-3 py-2 text-right">Hours</th>
                  <th className="px-3 py-2 text-left">Time</th><th className="px-3 py-2 text-left">Reason</th><th className="px-3 py-2"></th>
                </tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {stagingEntries.map((e) => (
                    <tr key={e.tempId}>
                      <td className="px-3 py-2 font-medium">{e.type}</td>
                      <td className="px-3 py-2 text-right font-bold text-amber-700">{e.hours}</td>
                      <td className="px-3 py-2 text-xs text-slate-500">{e.timeFrom && e.timeTo ? `${e.timeFrom} - ${e.timeTo}` : '-'}</td>
                      <td className="px-3 py-2 text-xs">{e.reason}</td>
                      <td className="px-3 py-2 text-right"><button onClick={() => setStagingEntries((p) => p.filter((x) => x.tempId !== e.tempId))} className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="border-t border-slate-200 bg-slate-50 px-4 py-3">
                <button onClick={handleSubmit} disabled={isSaving}
                  className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-amber-700 transition-colors disabled:opacity-50">
                  <Save className="h-4 w-4" />{isSaving ? 'Submitting...' : 'Submit for Approval'}
                </button>
              </div>
            </div>
          )}

          {errors.entries && <p className="text-[11px] text-red-600"><AlertCircle className="mr-1 inline h-3 w-3" />{errors.entries}</p>}
        </div>
      )}

      {/* ==========================================
          DOWNTIME RECORDS — Admin sees Approve/Reject on pending, everyone sees the list
          ========================================== */}
      {records.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-slate-200 bg-slate-50 px-6 py-4">
            <h3 className="text-lg font-semibold text-slate-800">Downtime Records</h3>
            <p className="text-xs text-slate-500 mt-0.5">{records.length} record(s){pendingRecords.length > 0 ? ` — ${pendingRecords.length} pending` : ''}</p>
          </div>
          <div className="divide-y divide-slate-100">
            {records.map((rec) => {
              const isExp = expandedId === rec.id;
              const isPending = !rec.fullyAcknowledged;
              return (
                <div key={rec.id}>
                  <div className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50/50 cursor-pointer transition-colors" onClick={() => setExpandedId(isExp ? null : rec.id)}>
                    {isExp ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${isPending ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-700'}`}>
                          {isPending ? 'PENDING' : 'APPROVED'}
                        </span>
                        <span className="font-bold text-slate-900">{rec.workerName}</span>
                        {rec.styleNo && <span className="text-xs text-slate-500">{rec.styleNo}</span>}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">Date: {rec.date} | Table: {rec.tableNo || '-'} | Total: {rec.totalHours} hrs | {rec.entries.length} entry(s)</p>
                    </div>
                    <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                      {isAdmin && isPending && (
                        <>
                          <button onClick={() => handleAcknowledge(rec.id)} className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                          </button>
                          <button onClick={() => handleReject(rec.id)} className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 transition-colors">
                            <XCircle className="h-3.5 w-3.5" /> Reject
                          </button>
                        </>
                      )}
                      {isAdmin && (
                        <button onClick={() => handleDelete(rec.id)} className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"><Trash2 className="h-4 w-4" /></button>
                      )}
                    </div>
                  </div>
                  <AnimatePresence>{isExp && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="border-t border-slate-100 bg-slate-50/50 px-6 py-4 overflow-hidden">
                      <table className="w-full text-xs border-collapse">
                        <thead><tr className="text-slate-500 border-b border-slate-200">
                          <th className="py-2 text-left font-semibold">Down Time</th>
                          <th className="py-2 text-right font-semibold">Hours</th>
                          <th className="py-2 text-left font-semibold pl-4">Time</th>
                          <th className="py-2 text-left font-semibold pl-4">Reason</th>
                          <th className="py-2 text-center font-semibold">Status</th>
                        </tr></thead>
                        <tbody>{rec.entries.map((e, i) => (
                          <tr key={i} className="border-b border-slate-100">
                            <td className="py-2 font-medium">{e.type}</td>
                            <td className="py-2 text-right font-bold text-amber-700">{e.hours}</td>
                            <td className="py-2 pl-4 text-slate-500">{e.timeFrom && e.timeTo ? `${e.timeFrom} - ${e.timeTo}` : '-'}</td>
                            <td className="py-2 pl-4">{e.reason}</td>
                            <td className="py-2 text-center">
                              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${e.isAcknowledged ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                {e.isAcknowledged ? 'Approved' : 'Pending'}
                              </span>
                            </td>
                          </tr>
                        ))}</tbody>
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