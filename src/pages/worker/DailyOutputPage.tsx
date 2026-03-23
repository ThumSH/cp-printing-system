// src/pages/worker/DailyOutputPage.tsx
import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePaginatedSearch } from '../../hooks/usePaginatedSearch';
import { PaginationControls } from '../../components/PaginatedTable';
import { Factory, Save, Trash2, AlertCircle, Plus, ChevronDown, ChevronRight } from 'lucide-react';

const API_BASE = 'http://localhost:5000/api/worker';
const getHeaders = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` });

const DEFAULT_TIME_SLOTS = [
  { timeFrom: '08:30', timeTo: '09:30' },
  { timeFrom: '09:30', timeTo: '10:30' },
  { timeFrom: '10:30', timeTo: '11:00' },
  { timeFrom: '11:00', timeTo: '12:00' },
  { timeFrom: '12:00', timeTo: '13:00' },
  { timeFrom: '13:00', timeTo: '13:30' },
  { timeFrom: '13:30', timeTo: '14:30' },
  { timeFrom: '14:30', timeTo: '15:30' },
  { timeFrom: '15:30', timeTo: '16:30' },
  { timeFrom: '16:30', timeTo: '17:30' },
  { timeFrom: '17:30', timeTo: '18:30' },
];

interface TimeSlot { timeFrom: string; timeTo: string; seating: number; printing: number; curing: number; checking: number; packing: number; dispatch: number; }
interface EligibleStyle { id: string; submissionId: string; styleNo: string; customerName: string; scheduleNo: string; components: string; bodyColour: string; orderQty: number; }
interface StagingRow { tempId: string; storeInRecordId: string; date: string; styleNo: string; component: string; tableNo: string; orderQty: number; target: number; dailyTarget: number; timeSlots: TimeSlot[]; totalSeating: number; totalPrinting: number; totalCuring: number; totalChecking: number; totalPacking: number; totalDispatch: number; }
interface DailyOutputRecord { id: string; storeInRecordId: string; date: string; styleNo: string; customerName: string; component: string; orderQty: number; tableNo: string; target: number; dailyTarget: number; timeSlots: TimeSlot[]; totalSeating: number; totalPrinting: number; totalCuring: number; totalChecking: number; totalPacking: number; totalDispatch: number; workerName: string; }

function createEmptyTimeSlots(): TimeSlot[] {
  return DEFAULT_TIME_SLOTS.map((t) => ({ ...t, seating: 0, printing: 0, curing: 0, checking: 0, packing: 0, dispatch: 0 }));
}

export default function DailyOutputPage() {
  const [eligibleStyles, setEligibleStyles] = useState<EligibleStyle[]>([]);
  const [records, setRecords] = useState<DailyOutputRecord[]>([]);
  const [selectedStoreInId, setSelectedStoreInId] = useState('');
  const [selectedComponent, setSelectedComponent] = useState('');
  const [tableNo, setTableNo] = useState('');
  const [target, setTarget] = useState('');
  const [dailyTarget, setDailyTarget] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>(createEmptyTimeSlots());
  const [stagingRows, setStagingRows] = useState<StagingRow[]>([]);
  const [workerName, setWorkerName] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pageError, setPageError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const workerPagination = usePaginatedSearch({ data: records, searchFields: ['styleNo' as any, 'customerName' as any, 'tableNo' as any, 'component' as any], pageSize: 25 });

  const fetchData = async () => {
    try {
      const [styRes, recRes] = await Promise.all([
        fetch(`${API_BASE}/eligible-styles`, { headers: getHeaders() }),
        fetch(`${API_BASE}/daily-output`, { headers: getHeaders() }),
      ]);
      if (styRes.ok) setEligibleStyles(await styRes.json());
      if (recRes.ok) setRecords(await recRes.json());
    } catch (e) { setPageError('Failed to load data.'); }
  };

  useEffect(() => { fetchData(); }, []);

  const selectedItem = useMemo(() => eligibleStyles.find((i) => i.id === selectedStoreInId) || null, [eligibleStyles, selectedStoreInId]);
  const componentsList = useMemo(() => selectedItem?.components ? selectedItem.components.split(',').map((c) => c.trim()).filter(Boolean) : [], [selectedItem]);

  // Time slot totals
  const totals = useMemo(() => ({
    seating: timeSlots.reduce((s, t) => s + t.seating, 0),
    printing: timeSlots.reduce((s, t) => s + t.printing, 0),
    curing: timeSlots.reduce((s, t) => s + t.curing, 0),
    checking: timeSlots.reduce((s, t) => s + t.checking, 0),
    packing: timeSlots.reduce((s, t) => s + t.packing, 0),
    dispatch: timeSlots.reduce((s, t) => s + t.dispatch, 0),
  }), [timeSlots]);

  const updateSlot = (index: number, field: keyof TimeSlot, value: string) => {
    setTimeSlots((prev) => prev.map((slot, i) => {
      if (i !== index) return slot;
      if (field === 'timeFrom' || field === 'timeTo') return { ...slot, [field]: value };
      return { ...slot, [field]: parseInt(value) || 0 };
    }));
  };

  const handleAddToSummary = () => {
    const newErrors: Record<string, string> = {};
    if (!selectedStoreInId) newErrors.style = 'Select a style';
    if (!selectedComponent) newErrors.component = 'Select a component';
    if (!tableNo.trim()) newErrors.tableNo = 'Table No is required';
    if (!(parseInt(target) > 0)) newErrors.target = 'Target must be > 0';
    if (!(parseInt(dailyTarget) > 0)) newErrors.dailyTarget = 'Daily Target must be > 0';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    const newRow: StagingRow = {
      tempId: crypto.randomUUID(),
      storeInRecordId: selectedStoreInId,
      date,
      styleNo: selectedItem?.styleNo ?? '',
      component: selectedComponent,
      tableNo: tableNo.trim(),
      orderQty: selectedItem?.orderQty ?? 0,
      target: parseInt(target) || 0,
      dailyTarget: parseInt(dailyTarget) || 0,
      timeSlots: [...timeSlots],
      totalSeating: totals.seating,
      totalPrinting: totals.printing,
      totalCuring: totals.curing,
      totalChecking: totals.checking,
      totalPacking: totals.packing,
      totalDispatch: totals.dispatch,
    };

    setStagingRows((prev) => [...prev, newRow]);
    setTableNo(''); setTarget(''); setDailyTarget(''); setSelectedComponent('');
    setTimeSlots(createEmptyTimeSlots());
    setErrors({});
  };

  const handleSubmit = async () => {
    if (stagingRows.length === 0) { setPageError('Add at least one entry.'); return; }
    if (!workerName.trim()) { setErrors({ worker: 'Worker name is required' }); return; }
    setIsSaving(true); setPageError('');
    try {
      const payload = stagingRows.map((r) => ({
        storeInRecordId: r.storeInRecordId,
        date: r.date,
        component: r.component,
        orderQty: r.orderQty,
        tableNo: r.tableNo,
        target: r.target,
        dailyTarget: r.dailyTarget,
        timeSlots: r.timeSlots,
        workerName,
      }));
      const res = await fetch(`${API_BASE}/daily-output/batch`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(payload) });
      if (!res.ok) throw new Error(await res.text());
      setStagingRows([]); setWorkerName(''); setSelectedStoreInId('');
      await fetchData();
    } catch (e) { setPageError(e instanceof Error ? e.message : 'Failed to save.'); }
    finally { setIsSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this record?')) return;
    try { await fetch(`${API_BASE}/daily-output/${id}`, { method: 'DELETE', headers: getHeaders() }); await fetchData(); }
    catch (e) { setPageError('Failed to delete.'); }
  };

  const SECTIONS: { key: keyof TimeSlot; label: string; color: string }[] = [
    { key: 'seating', label: 'Seating', color: 'text-blue-700' },
    { key: 'printing', label: 'Printing', color: 'text-purple-700' },
    { key: 'curing', label: 'Curing', color: 'text-orange-700' },
    { key: 'checking', label: 'Checking', color: 'text-teal-700' },
    { key: 'packing', label: 'Packing', color: 'text-indigo-700' },
    { key: 'dispatch', label: 'Dispatch', color: 'text-emerald-700' },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-6xl space-y-6 pb-12">
      <div className="flex items-center space-x-3 border-b border-slate-200 pb-4">
        <div className="rounded-lg bg-teal-100 p-2"><Factory className="h-6 w-6 text-teal-700" /></div>
        <div><h2 className="text-2xl font-bold text-slate-900">Worker — Daily Output</h2><p className="text-sm text-slate-500">Track daily production output per time slot.</p></div>
      </div>

      {pageError && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{pageError}</div>}

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
        {/* Selection */}
        <div className="rounded-lg border border-teal-200 bg-teal-50/50 p-5 space-y-4">
          <h4 className="border-b border-teal-200 pb-2 text-sm font-bold uppercase tracking-wider text-teal-800">Style & Setup</h4>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-600">Style No *</label>
              <select value={selectedStoreInId} onChange={(e) => { setSelectedStoreInId(e.target.value); setSelectedComponent(''); }}
                className={`w-full rounded border bg-white px-3 py-2 text-sm outline-none ${errors.style ? 'border-red-400 bg-red-50' : 'border-slate-300 focus:ring-2 focus:ring-teal-500'}`}>
                <option value="">Select style...</option>
                {eligibleStyles.map((s) => (<option key={s.id} value={s.id}>{s.styleNo} | {s.customerName} | {s.scheduleNo}</option>))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-600">Order Qty</label>
              <div className="rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700">{selectedItem?.orderQty ?? '-'}</div>
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-600">Component *</label>
              <select value={selectedComponent} onChange={(e) => setSelectedComponent(e.target.value)}
                className={`w-full rounded border bg-white px-3 py-2 text-sm outline-none ${errors.component ? 'border-red-400 bg-red-50' : 'border-slate-300 focus:ring-2 focus:ring-teal-500'}`}>
                <option value="">Select...</option>
                {componentsList.map((c) => (<option key={c} value={c}>{c}</option>))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-600">Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500" />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-600">Table No *</label>
              <input type="text" value={tableNo} onChange={(e) => setTableNo(e.target.value)} placeholder="T01"
                className={`w-full rounded border px-3 py-2 text-sm outline-none ${errors.tableNo ? 'border-red-400 bg-red-50' : 'border-slate-300 focus:ring-2 focus:ring-teal-500'}`} />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-600">Target *</label>
              <input type="number" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="0"
                className={`w-full rounded border px-3 py-2 text-sm font-bold outline-none ${errors.target ? 'border-red-400 bg-red-50' : 'border-slate-300 focus:ring-2 focus:ring-teal-500'}`} />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-600">Daily Target *</label>
              <input type="number" value={dailyTarget} onChange={(e) => setDailyTarget(e.target.value)} placeholder="0"
                className={`w-full rounded border px-3 py-2 text-sm font-bold outline-none ${errors.dailyTarget ? 'border-red-400 bg-red-50' : 'border-slate-300 focus:ring-2 focus:ring-teal-500'}`} />
            </div>
          </div>
        </div>

        {/* Time slot table */}
        {selectedItem && (
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-800 text-white text-xs">
                  <th className="border-r border-slate-600 px-2 py-2.5 text-center font-bold" colSpan={2}>TIME SLOT</th>
                  {SECTIONS.map((sec) => (<th key={sec.key} className="border-r border-slate-600 px-3 py-2.5 text-center font-bold">{sec.label.toUpperCase()}</th>))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {timeSlots.map((slot, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="border-r border-slate-200 p-0 w-24">
                      <input type="time" value={slot.timeFrom} onChange={(e) => updateSlot(idx, 'timeFrom', e.target.value)} className="w-full bg-transparent px-2 py-1.5 text-center text-xs outline-none focus:bg-blue-50" />
                    </td>
                    <td className="border-r border-slate-200 p-0 w-24">
                      <input type="time" value={slot.timeTo} onChange={(e) => updateSlot(idx, 'timeTo', e.target.value)} className="w-full bg-transparent px-2 py-1.5 text-center text-xs outline-none focus:bg-blue-50" />
                    </td>
                    {SECTIONS.map((sec) => (
                      <td key={sec.key} className="border-r border-slate-200 p-0">
                        <input type="number" value={(slot[sec.key] as number) || ''} onChange={(e) => updateSlot(idx, sec.key, e.target.value)}
                          className="w-full bg-transparent py-1.5 text-center text-sm font-medium outline-none focus:bg-teal-50" placeholder="0" />
                      </td>
                    ))}
                  </tr>
                ))}
                {/* Totals row */}
                <tr className="bg-slate-100 font-bold border-t-2 border-slate-400">
                  <td colSpan={2} className="border-r border-slate-300 px-3 py-2 text-right text-xs uppercase text-slate-500">TOTALS</td>
                  {SECTIONS.map((sec) => (
                    <td key={sec.key} className={`border-r border-slate-300 px-3 py-2 text-center ${sec.color}`}>{totals[sec.key as keyof typeof totals]}</td>
                  ))}
                </tr>
              </tbody>
            </table>
            <div className="border-t border-slate-200 bg-slate-50 px-4 py-3">
              <button type="button" onClick={handleAddToSummary}
                className="inline-flex items-center gap-1 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-700 transition-colors">
                <Plus className="h-4 w-4" /> Add to Summary
              </button>
            </div>
          </div>
        )}

        {/* Staging summary table */}
        {stagingRows.length > 0 && (
          <div className="rounded-lg border border-slate-200 overflow-hidden">
            <div className="bg-slate-800 px-4 py-2.5 text-sm font-bold text-white">Summary — {stagingRows.length} entry(s)</div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="bg-slate-50 font-semibold text-slate-600 border-b border-slate-200">
                  <th className="px-3 py-2 text-left">Style No</th><th className="px-3 py-2 text-left">Table</th><th className="px-3 py-2 text-right">Order Qty</th>
                  <th className="px-3 py-2 text-right">Target</th><th className="px-3 py-2 text-right">Day Target</th>
                  <th className="px-3 py-2 text-right text-blue-700">Seating</th><th className="px-3 py-2 text-right text-purple-700">Printing</th>
                  <th className="px-3 py-2 text-right text-orange-700">Curing</th><th className="px-3 py-2 text-right text-teal-700">Checking</th>
                  <th className="px-3 py-2 text-right text-indigo-700">Packing</th><th className="px-3 py-2 text-right text-emerald-700">Dispatch</th>
                  <th className="px-3 py-2"></th>
                </tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {stagingRows.map((row) => (
                    <tr key={row.tempId}>
                      <td className="px-3 py-2 font-bold">{row.styleNo}</td><td className="px-3 py-2">{row.tableNo}</td>
                      <td className="px-3 py-2 text-right">{row.orderQty}</td><td className="px-3 py-2 text-right">{row.target}</td>
                      <td className="px-3 py-2 text-right">{row.dailyTarget}</td>
                      <td className="px-3 py-2 text-right font-bold text-blue-700">{row.totalSeating}</td>
                      <td className="px-3 py-2 text-right font-bold text-purple-700">{row.totalPrinting}</td>
                      <td className="px-3 py-2 text-right font-bold text-orange-700">{row.totalCuring}</td>
                      <td className="px-3 py-2 text-right font-bold text-teal-700">{row.totalChecking}</td>
                      <td className="px-3 py-2 text-right font-bold text-indigo-700">{row.totalPacking}</td>
                      <td className="px-3 py-2 text-right font-bold text-emerald-700">{row.totalDispatch}</td>
                      <td className="px-3 py-2 text-right"><button onClick={() => setStagingRows((p) => p.filter((r) => r.tempId !== row.tempId))} className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="border-t border-slate-200 bg-slate-50 px-4 py-3 flex items-end gap-4">
              <div className="flex-1 max-w-xs space-y-1">
                <label className="block text-xs font-bold text-slate-600">Worker Name *</label>
                <input type="text" value={workerName} onChange={(e) => setWorkerName(e.target.value)} placeholder="Worker name"
                  className={`w-full rounded border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500 ${errors.worker ? 'border-red-400 bg-red-50' : 'border-slate-300'}`} />
              </div>
              <button onClick={handleSubmit} disabled={isSaving}
                className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-700 transition-colors disabled:opacity-50">
                <Save className="h-4 w-4" />{isSaving ? 'Saving...' : 'Submit All'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Existing records */}
      {records.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-slate-200 bg-slate-50 px-6 py-4 space-y-3">
            <h3 className="text-lg font-semibold text-slate-800">Daily Output Records</h3>
            <PaginationControls search={workerPagination.search} onSearchChange={workerPagination.setSearch} currentPage={workerPagination.currentPage} totalPages={workerPagination.totalPages} totalFiltered={workerPagination.totalFiltered} totalAll={workerPagination.totalAll} onPageChange={workerPagination.goToPage} hasNext={workerPagination.hasNext} hasPrev={workerPagination.hasPrev} placeholder="Search by style, customer, table, component..." />
          </div>
          <div className="divide-y divide-slate-100">
            {workerPagination.paginated.map((rec) => {
              const isExp = expandedId === rec.id;
              return (
                <div key={rec.id}>
                  <div className="flex items-center gap-4 px-6 py-3 hover:bg-slate-50/50 cursor-pointer transition-colors" onClick={() => setExpandedId(isExp ? null : rec.id)}>
                    {isExp ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
                    <div className="flex-1">
                      <div className="flex items-center gap-2"><span className="font-bold text-slate-900">{rec.styleNo}</span><span className="text-xs text-slate-500">{rec.customerName}</span><span className="rounded bg-teal-100 px-2 py-0.5 text-[10px] font-bold text-teal-700">Table {rec.tableNo}</span></div>
                      <p className="text-xs text-slate-500 mt-0.5">Date: {rec.date} | Component: {rec.component} | Worker: {rec.workerName}</p>
                    </div>
                    <div className="text-right text-xs text-slate-500">
                      <div>Seating: <b className="text-blue-700">{rec.totalSeating}</b> | Printing: <b className="text-purple-700">{rec.totalPrinting}</b> | Dispatch: <b className="text-emerald-700">{rec.totalDispatch}</b></div>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(rec.id); }} className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
                  </div>
                  <AnimatePresence>{isExp && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="border-t border-slate-100 bg-slate-50/50 px-6 py-3 overflow-hidden">
                      <div className="grid grid-cols-3 gap-3 md:grid-cols-6 mb-3">
                        <div className="rounded bg-white border border-slate-200 px-3 py-2"><p className="text-[10px] text-slate-400 uppercase">Seating</p><p className="font-bold text-blue-700">{rec.totalSeating}</p></div>
                        <div className="rounded bg-white border border-slate-200 px-3 py-2"><p className="text-[10px] text-slate-400 uppercase">Printing</p><p className="font-bold text-purple-700">{rec.totalPrinting}</p></div>
                        <div className="rounded bg-white border border-slate-200 px-3 py-2"><p className="text-[10px] text-slate-400 uppercase">Curing</p><p className="font-bold text-orange-700">{rec.totalCuring}</p></div>
                        <div className="rounded bg-white border border-slate-200 px-3 py-2"><p className="text-[10px] text-slate-400 uppercase">Checking</p><p className="font-bold text-teal-700">{rec.totalChecking}</p></div>
                        <div className="rounded bg-white border border-slate-200 px-3 py-2"><p className="text-[10px] text-slate-400 uppercase">Packing</p><p className="font-bold text-indigo-700">{rec.totalPacking}</p></div>
                        <div className="rounded bg-white border border-slate-200 px-3 py-2"><p className="text-[10px] text-slate-400 uppercase">Dispatch</p><p className="font-bold text-emerald-700">{rec.totalDispatch}</p></div>
                      </div>
                      <p className="text-xs text-slate-500">Target: {rec.target} | Daily Target: {rec.dailyTarget} | Order Qty: {rec.orderQty}</p>
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