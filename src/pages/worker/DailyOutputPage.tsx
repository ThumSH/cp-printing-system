// src/pages/worker/DailyOutputPage.tsx
import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePaginatedSearch } from '../../hooks/usePaginatedSearch';
import { PaginationControls } from '../../components/PaginatedTable';
import {
  Factory, Save, Trash2, AlertCircle, CheckCircle2, X, Clock,
  TrendingDown, Package,
} from 'lucide-react';
import { API, getAuthHeaders } from '../../api/client';

const API_BASE = API.WORKER;
const getHeaders = getAuthHeaders;

// ==========================================
// TIME SLOTS
// ==========================================
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

// ==========================================
// TYPES
// ==========================================
interface LockedFields {
  seating: boolean;
  printing: boolean;
  curing: boolean;
  checking: boolean;
  packing: boolean;
  dispatch: boolean;
}

interface TimeSlot {
  timeFrom: string;
  timeTo: string;
  seating: number;
  printing: number;
  curing: number;
  checking: number;
  packing: number;
  dispatch: number;
  lockedFields: LockedFields;
}

interface EligibleStyle {
  id: string;
  productionRecordId: string;
  storeInRecordId: string;
  submissionId: string;
  styleNo: string;
  customerName: string;
  cutNo: string;
  lineNo: string;
  /** The single component (Part) chosen by QC in the CPI inspection for this specific cut. */
  component: string;
  orderQty: number;
  dispatchedQty: number;
}

interface DailyOutputRecord {
  id: string;
  productionRecordId: string;
  storeInRecordId: string;
  date: string;
  styleNo: string;
  customerName: string;
  cutNo: string;
  component: string;
  orderQty: number;
  tableNo: string;
  timeSlots: TimeSlot[];
  totalSeating: number;
  totalPrinting: number;
  totalCuring: number;
  totalChecking: number;
  totalPacking: number;
  totalDispatch: number;
  workerName: string;
}

// ==========================================
// HELPERS
// ==========================================
function createEmptyTimeSlots(): TimeSlot[] {
  return DEFAULT_TIME_SLOTS.map((t) => ({
    ...t,
    seating: 0, printing: 0, curing: 0, checking: 0, packing: 0, dispatch: 0,
    lockedFields: { seating: false, printing: false, curing: false, checking: false, packing: false, dispatch: false },
  }));
}

const SECTIONS: { key: keyof LockedFields; label: string; color: string; bgColor: string }[] = [
  { key: 'seating', label: 'Seating', color: 'text-blue-700', bgColor: 'bg-blue-50' },
  { key: 'printing', label: 'Printing', color: 'text-purple-700', bgColor: 'bg-purple-50' },
  { key: 'curing', label: 'Curing', color: 'text-orange-700', bgColor: 'bg-orange-50' },
  { key: 'checking', label: 'Checking', color: 'text-teal-700', bgColor: 'bg-teal-50' },
  { key: 'packing', label: 'Packing', color: 'text-indigo-700', bgColor: 'bg-indigo-50' },
  { key: 'dispatch', label: 'Dispatch', color: 'text-emerald-700', bgColor: 'bg-emerald-50' },
];

// ==========================================
// COMPONENT
// ==========================================
export default function DailyOutputPage() {
  const [eligibleStyles, setEligibleStyles] = useState<EligibleStyle[]>([]);
  const [records, setRecords] = useState<DailyOutputRecord[]>([]);
  const [selectedStoreInId, setSelectedStoreInId] = useState('');
  const [selectedComponent, setSelectedComponent] = useState('');
  const [tableNo, setTableNo] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>(createEmptyTimeSlots());
  const [workerName, setWorkerName] = useState(localStorage.getItem('operatorName') || '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pageError, setPageError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [activeRecordId, setActiveRecordId] = useState<string | null>(null);

  const [confirmModal, setConfirmModal] = useState<{ rowIndex: number; slot: TimeSlot } | null>(null);

  const workerPagination = usePaginatedSearch({
    data: records,
    searchFields: ['styleNo' as any, 'customerName' as any, 'tableNo' as any, 'component' as any],
    pageSize: 25,
  });

  const fetchData = async () => {
    try {
      const [styRes, recRes] = await Promise.all([
        fetch(`${API_BASE}/eligible-styles`, { headers: getHeaders() }),
        fetch(`${API_BASE}/daily-output`, { headers: getHeaders() }),
      ]);
      if (styRes.ok) setEligibleStyles(await styRes.json());
      if (recRes.ok) setRecords(await recRes.json());
    } catch (e) {
      setPageError('Failed to load data.');
    }
  };

  useEffect(() => { fetchData(); }, []);

  const selectedItem = useMemo(
    () => eligibleStyles.find((i) => i.id === selectedStoreInId) || null,
    [eligibleStyles, selectedStoreInId]
  );

  const effectiveStoreInId = selectedItem?.storeInRecordId || '';

  const activeRecord = useMemo(() => {
    if (!selectedItem || !tableNo) return null;
    return records.find(r =>
      r.productionRecordId === selectedItem.productionRecordId &&
      r.tableNo === tableNo &&
      r.date === date
    ) || null;
  }, [records, selectedItem, tableNo, date]);

  useEffect(() => {
    if (activeRecord) {
      const loadedSlots = DEFAULT_TIME_SLOTS.map((t) => {
        const existing = activeRecord.timeSlots.find((s) => s.timeFrom === t.timeFrom && s.timeTo === t.timeTo);
        if (existing) {
          return {
            ...existing,
            lockedFields: {
              seating: existing.seating > 0,
              printing: existing.printing > 0,
              curing: existing.curing > 0,
              checking: existing.checking > 0,
              packing: existing.packing > 0,
              dispatch: existing.dispatch > 0,
            }
          } as TimeSlot;
        }
        return { ...t, seating: 0, printing: 0, curing: 0, checking: 0, packing: 0, dispatch: 0, lockedFields: { seating: false, printing: false, curing: false, checking: false, packing: false, dispatch: false } };
      });
      setTimeSlots(loadedSlots);
      setActiveRecordId(activeRecord.id);
    } else {
      setTimeSlots(createEmptyTimeSlots());
      setActiveRecordId(null);
    }
  }, [activeRecord]);

  const issueQty = selectedItem?.orderQty ?? 0;

  const totals = useMemo(() => ({
    seating: timeSlots.reduce((s, t) => s + (Number(t.seating) || 0), 0),
    printing: timeSlots.reduce((s, t) => s + (Number(t.printing) || 0), 0),
    curing: timeSlots.reduce((s, t) => s + (Number(t.curing) || 0), 0),
    checking: timeSlots.reduce((s, t) => s + (Number(t.checking) || 0), 0),
    packing: timeSlots.reduce((s, t) => s + (Number(t.packing) || 0), 0),
    dispatch: timeSlots.reduce((s, t) => s + (Number(t.dispatch) || 0), 0),
  }), [timeSlots]);

  const totalCompleted = totals.dispatch;
  const remaining = issueQty - totalCompleted;

  const updateSlot = (index: number, field: keyof TimeSlot, value: string) => {
    setTimeSlots((prev) => prev.map((slot, i) => {
      if (i !== index) return slot;
      if (field === 'timeFrom' || field === 'timeTo') return { ...slot, [field]: value };
      return { ...slot, [field]: parseInt(value) || 0 };
    }));
  };

  const validateSetup = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!selectedStoreInId) newErrors.style = 'Select a style';
    if (!selectedComponent) newErrors.component = 'Component is missing from production record';
    if (!tableNo.trim()) newErrors.tableNo = 'Table No is required';
    if (!workerName.trim()) newErrors.worker = 'Worker name is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const requestSubmitRow = (rowIndex: number) => {
    if (!validateSetup()) {
      setPageError('Please fill in all required fields above first.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setPageError('');
    setConfirmModal({ rowIndex, slot: timeSlots[rowIndex] });
  };

  const confirmSubmitRow = async () => {
    if (!confirmModal) return;
    const { rowIndex } = confirmModal;

    setIsSaving(true);
    setPageError('');

    const updatedSlots = timeSlots.map((s, i) => {
      if (i === rowIndex) {
        return {
          ...s,
          lockedFields: {
            seating: s.seating > 0 || s.lockedFields.seating,
            printing: s.printing > 0 || s.lockedFields.printing,
            curing: s.curing > 0 || s.lockedFields.curing,
            checking: s.checking > 0 || s.lockedFields.checking,
            packing: s.packing > 0 || s.lockedFields.packing,
            dispatch: s.dispatch > 0 || s.lockedFields.dispatch,
          }
        };
      }
      return s;
    });

    const slotsToSave = updatedSlots.map(s => ({
      timeFrom: s.timeFrom,
      timeTo: s.timeTo,
      seating: s.lockedFields.seating ? s.seating : 0,
      printing: s.lockedFields.printing ? s.printing : 0,
      curing: s.lockedFields.curing ? s.curing : 0,
      checking: s.lockedFields.checking ? s.checking : 0,
      packing: s.lockedFields.packing ? s.packing : 0,
      dispatch: s.lockedFields.dispatch ? s.dispatch : 0,
    }));

    const newTotals = {
      seating: slotsToSave.reduce((sum, s) => sum + s.seating, 0),
      printing: slotsToSave.reduce((sum, s) => sum + s.printing, 0),
      curing: slotsToSave.reduce((sum, s) => sum + s.curing, 0),
      checking: slotsToSave.reduce((sum, s) => sum + s.checking, 0),
      packing: slotsToSave.reduce((sum, s) => sum + s.packing, 0),
      dispatch: slotsToSave.reduce((sum, s) => sum + s.dispatch, 0),
    };

    const payload = {
      productionRecordId: selectedItem?.productionRecordId ?? '',
      storeInRecordId: effectiveStoreInId,
      date,
      styleNo: selectedItem?.styleNo ?? '',
      customerName: selectedItem?.customerName ?? '',
      cutNo: selectedItem?.cutNo ?? '',
      component: selectedComponent,
      orderQty: issueQty,
      tableNo: tableNo.trim(),
      timeSlots: slotsToSave,
      totalSeating: newTotals.seating,
      totalPrinting: newTotals.printing,
      totalCuring: newTotals.curing,
      totalChecking: newTotals.checking,
      totalPacking: newTotals.packing,
      totalDispatch: newTotals.dispatch,
      workerName,
    };

    try {
      let res;
      if (activeRecordId) {
        res = await fetch(`${API_BASE}/daily-output/${activeRecordId}`, {
          method: 'PUT',
          headers: getHeaders(),
          body: JSON.stringify({ ...payload, id: activeRecordId }),
        });
      } else {
        res = await fetch(`${API_BASE}/daily-output`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) throw new Error(await res.text());

      const saved = await res.json();
      if (!activeRecordId && saved?.id) setActiveRecordId(saved.id);

      setTimeSlots(updatedSlots);
      setConfirmModal(null);
      await fetchData();
    } catch (e) {
      setPageError(e instanceof Error ? e.message : 'Failed to save.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setSelectedStoreInId('');
    setSelectedComponent('');
    setTableNo('');
    setTimeSlots(createEmptyTimeSlots());
    setActiveRecordId(null);
    setErrors({});
    setPageError('');
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this record? This cannot be undone.')) return;
    try {
      await fetch(`${API_BASE}/daily-output/${id}`, { method: 'DELETE', headers: getHeaders() });
      await fetchData();
    } catch (e) {
      setPageError('Failed to delete.');
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-7xl space-y-6 pb-12">
      <div className="flex items-center space-x-3 border-b border-slate-200 pb-4">
        <div className="rounded-lg bg-teal-100 p-2">
          <Factory className="h-6 w-6 text-teal-700" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Worker — Daily Output</h2>
          <p className="text-sm text-slate-500">Submit outputs per time slot. "Completed" reflects final dispatch totals.</p>
        </div>
      </div>

      {pageError && (
        <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{pageError}</span>
          <button onClick={() => setPageError('')} className="ml-auto text-red-400 hover:text-red-600"><X className="h-4 w-4" /></button>
        </motion.div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
        <div className="rounded-lg border border-teal-200 bg-teal-50/50 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-teal-200 pb-2">
            <h4 className="text-sm font-bold uppercase tracking-wider text-teal-800">Style & Setup</h4>
            {activeRecordId && <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">EDITING EXISTING RECORD</span>}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-600">Style No *</label>
              <select
                value={selectedStoreInId}
                onChange={(e) => { 
                  const selectedId = e.target.value;
                  setSelectedStoreInId(selectedId); 
                  
                  // Auto-fill component instantly on dropdown change
                  const matchedItem = eligibleStyles.find((s) => s.id === selectedId);
                  setSelectedComponent(matchedItem?.component || '');
                }}
                className={`w-full rounded border bg-white px-3 py-2 text-sm outline-none ${errors.style ? 'border-red-400 bg-red-50' : 'border-slate-300 focus:ring-2 focus:ring-teal-500'}`}
              >
                <option value="">Select style...</option>
                {eligibleStyles.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.styleNo} | {s.customerName} | Cut {s.cutNo} | Line: {s.lineNo} | Issued: {s.orderQty}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-600">Issue Qty (from Production)</label>
              <div className="rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-orange-700">{issueQty || '-'}</div>
            </div>

            {/* LOCKED COMPONENT FIELD */}
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-600">Component</label>
              <input
                type="text"
                value={selectedComponent}
                readOnly
                disabled
                placeholder="Auto-filled from Production"
                title="This field is locked and auto-filled from the production record"
                className={`w-full rounded border px-3 py-2 text-sm font-bold outline-none cursor-not-allowed ${
                  selectedComponent ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-slate-300 bg-slate-50 text-slate-400'
                }`}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-600">Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500" />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-600">Table No *</label>
              <input type="text" value={tableNo} onChange={(e) => setTableNo(e.target.value)} placeholder="T01" className={`w-full rounded border px-3 py-2 text-sm outline-none ${errors.tableNo ? 'border-red-400 bg-red-50' : 'border-slate-300 focus:ring-2 focus:ring-teal-500'}`} />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-600">Worker Name *</label>
              <input type="text" value={workerName} onChange={(e) => setWorkerName(e.target.value)} placeholder="Your name" className={`w-full rounded border px-3 py-2 text-sm font-medium outline-none ${errors.worker ? 'border-red-400 bg-red-50' : 'border-slate-300 focus:ring-2 focus:ring-teal-500'}`} />
            </div>
          </div>
        </div>

        {selectedItem && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-orange-600 uppercase tracking-wide">
                <Package className="h-3.5 w-3.5" /> Issue Qty
              </div>
              <p className="mt-1 text-2xl font-black text-orange-700">{issueQty}</p>
              <p className="text-[11px] text-slate-500">Total given from production</p>
            </div>
            
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 uppercase tracking-wide">
                <CheckCircle2 className="h-3.5 w-3.5" /> Total Completed
              </div>
              <p className="mt-1 text-2xl font-black text-emerald-700">{totalCompleted}</p>
              <p className="text-[11px] text-slate-500">Based on final dispatch quantities</p>
            </div>

            <div className={`rounded-lg border p-4 ${remaining <= 0 ? 'border-slate-200 bg-slate-50' : 'border-blue-200 bg-blue-50'}`}>
              <div className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-wide ${remaining <= 0 ? 'text-slate-600' : 'text-blue-600'}`}>
                <TrendingDown className="h-3.5 w-3.5" /> Remaining
              </div>
              <p className={`mt-1 text-2xl font-black ${remaining <= 0 ? 'text-slate-700' : 'text-blue-700'}`}>{remaining}</p>
              <p className="text-[11px] text-slate-500">{remaining <= 0 ? (remaining < 0 ? 'Overage / Excess' : 'All completed ✓') : `${issueQty} - ${totalCompleted}`}</p>
            </div>
          </div>
        )}

        {selectedItem && (
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-800 text-white text-xs">
                  <th className="border-r border-slate-600 px-2 py-2.5 text-center font-bold" colSpan={2}>TIME SLOT</th>
                  {SECTIONS.map((sec) => (
                    <th key={sec.key} className="border-r border-slate-600 px-3 py-2.5 text-center font-bold">
                      {sec.label.toUpperCase()}
                    </th>
                  ))}
                  <th className="px-3 py-2.5 text-center font-bold w-28">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {timeSlots.map((slot, idx) => {
                  const hasNewData = SECTIONS.some(sec => (slot[sec.key] as number) > 0 && !slot.lockedFields[sec.key]);

                  return (
                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                      <td className="border-r border-slate-200 p-0 w-24">
                        <input type="time" value={slot.timeFrom} onChange={(e) => updateSlot(idx, 'timeFrom', e.target.value)} className="w-full bg-transparent px-2 py-1.5 text-center text-xs outline-none focus:bg-blue-50" />
                      </td>
                      <td className="border-r border-slate-200 p-0 w-24">
                        <input type="time" value={slot.timeTo} onChange={(e) => updateSlot(idx, 'timeTo', e.target.value)} className="w-full bg-transparent px-2 py-1.5 text-center text-xs outline-none focus:bg-blue-50" />
                      </td>
                      {SECTIONS.map((sec) => {
                        const isFieldLocked = slot.lockedFields[sec.key];
                        return (
                          <td key={sec.key} className="border-r border-slate-200 p-0">
                            <input
                              type="number"
                              value={(slot[sec.key] as number) || ''}
                              onChange={(e) => updateSlot(idx, sec.key, e.target.value)}
                              disabled={isFieldLocked}
                              className={`w-full bg-transparent py-1.5 text-center text-sm font-medium outline-none ${isFieldLocked ? 'cursor-not-allowed text-slate-400 font-bold bg-slate-50' : 'focus:bg-teal-50 hover:bg-slate-50'}`}
                              placeholder="0"
                            />
                          </td>
                        );
                      })}
                      <td className="p-0 text-center w-28">
                        <button
                          type="button"
                          onClick={() => requestSubmitRow(idx)}
                          disabled={!hasNewData || isSaving}
                          className={`inline-flex items-center justify-center w-20 gap-1 rounded-md px-2 py-1.5 text-[10px] font-bold text-white transition-colors ${hasNewData ? 'bg-teal-600 hover:bg-teal-700' : 'bg-slate-300 cursor-not-allowed'}`}
                        >
                          {hasNewData ? <><Save className="h-3 w-3" /> Save</> : <><CheckCircle2 className="h-3 w-3" /> Saved</>}
                        </button>
                      </td>
                    </tr>
                  );
                })}
                <tr className="bg-slate-100 font-bold border-t-2 border-slate-400">
                  <td colSpan={2} className="border-r border-slate-300 px-3 py-2 text-right text-xs uppercase text-slate-500">TOTALS</td>
                  {SECTIONS.map((sec) => (
                    <td key={sec.key} className={`border-r border-slate-300 px-3 py-2 text-center ${sec.color}`}>
                      {totals[sec.key as keyof typeof totals]}
                    </td>
                  ))}
                  <td className="px-3 py-2 text-center">
                    <button onClick={handleReset} className="text-[10px] font-medium text-slate-500 hover:text-slate-700 underline">Reset Form</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-slate-400" />
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">All Output Records</h3>
          </div>
        </div>

        {records.length === 0 ? (
          <div className="py-12 text-center"><Factory className="mx-auto mb-2 h-10 w-10 text-slate-200" /><p className="text-sm text-slate-400">No output records yet.</p></div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-[11px] font-semibold text-slate-500 border-b border-slate-100">
                    <th className="px-4 py-2.5 text-left">Date</th>
                    <th className="px-4 py-2.5 text-left">Style</th>
                    <th className="px-4 py-2.5 text-left">Customer</th>
                    <th className="px-4 py-2.5 text-left">Component</th>
                    <th className="px-4 py-2.5 text-left">Table</th>
                    <th className="px-4 py-2.5 text-right">Issue</th>
                    <th className="px-4 py-2.5 text-right">Completed</th>
                    <th className="px-4 py-2.5 text-right">Remaining</th>
                    <th className="px-4 py-2.5 text-left">Worker</th>
                    <th className="px-4 py-2.5 text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {workerPagination.paginated.map((r) => {
                    const rec = r as DailyOutputRecord;
                    const recCompleted = rec.totalDispatch || 0;
                    const rem = rec.orderQty - recCompleted;
                    
                    return (
                      <tr key={rec.id} className="hover:bg-slate-50/50">
                        <td className="px-4 py-2.5 text-slate-600 text-xs">{rec.date}</td>
                        <td className="px-4 py-2.5 font-bold text-slate-800">{rec.styleNo}</td>
                        <td className="px-4 py-2.5 text-slate-500">{rec.customerName}</td>
                        <td className="px-4 py-2.5 text-slate-600">{rec.component}</td>
                        <td className="px-4 py-2.5 font-mono text-xs">{rec.tableNo}</td>
                        <td className="px-4 py-2.5 text-right font-semibold text-orange-600">{rec.orderQty}</td>
                        <td className="px-4 py-2.5 text-right font-semibold text-emerald-600">{recCompleted}</td>
                        <td className={`px-4 py-2.5 text-right font-bold ${rem <= 0 ? 'text-slate-400' : 'text-blue-600'}`}>{rem}</td>
                        <td className="px-4 py-2.5 text-slate-600 text-xs">{rec.workerName}</td>
                        <td className="px-4 py-2.5 text-right">
                          <button onClick={() => handleDelete(rec.id)} className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"><Trash2 className="h-4 w-4" /></button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <PaginationControls onSearchChange={function (value: string): void {
                throw new Error('Function not implemented.');
              } } onPageChange={function (page: number): void {
                throw new Error('Function not implemented.');
              } } {...workerPagination} placeholder="Search records..." />
          </>
        )}
      </div>

      <AnimatePresence>
        {confirmModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4" onClick={() => setConfirmModal(null)}>
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-3 mb-4">
                <div className="rounded-xl bg-amber-100 p-2.5"><AlertCircle className="h-5 w-5 text-amber-600" /></div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Confirm Submission</h3>
                  <p className="text-xs text-slate-500">Please double-check your inputs.</p>
                </div>
              </div>

              <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center gap-2 text-xs text-slate-500 mb-2"><Clock className="h-3 w-3" /><span className="font-bold">Time Slot:</span><span className="font-mono">{confirmModal.slot.timeFrom} — {confirmModal.slot.timeTo}</span></div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  {SECTIONS.map((sec) => (
                    <div key={sec.key} className={`rounded-md ${sec.bgColor} px-2 py-1.5 opacity-${confirmModal.slot[sec.key] > 0 && !confirmModal.slot.lockedFields[sec.key] ? '100' : '50'}`}>
                      <p className="text-[9px] uppercase font-bold text-slate-500">{sec.label}</p>
                      <p className={`text-base font-black ${sec.color}`}>{confirmModal.slot[sec.key] || 0}</p>
                    </div>
                  ))}
                </div>
              </div>

              <p className="mb-5 text-sm text-slate-600">Once submitted, <b>only the fields with values</b> will be locked. Empty fields will remain open for edits.</p>

              <div className="flex gap-2">
                <button onClick={() => setConfirmModal(null)} disabled={isSaving} className="flex-1 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">Cancel</button>
                <button onClick={confirmSubmitRow} disabled={isSaving} className="flex-1 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-teal-700 disabled:opacity-50 flex items-center justify-center gap-2">
                  {isSaving ? 'Saving...' : (<><Save className="h-4 w-4" /> Save to DB</>)}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}