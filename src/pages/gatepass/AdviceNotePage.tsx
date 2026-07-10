// src/pages/gatepass/AdviceNotePage.tsx
import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, Save, Edit2, Trash2, AlertCircle, Printer, Plus, ChevronDown, ChevronRight, X,
} from 'lucide-react';
import {
  useAdviceNoteStore, AdviceNoteRecord, AdviceNoteRow,
} from '../../store/adviceNoteStore';
import { usePaginatedSearch } from '../../hooks/usePaginatedSearch';
import { PaginationControls } from '../../components/PaginatedTable';

function generateAdNo(existingNotes: AdviceNoteRecord[]): string {
  if (existingNotes.length === 0) return 'AD-0001';
  const maxNum = existingNotes.reduce((max, n) => {
    const m = n.adNo.match(/(\d+)$/);
    return m ? Math.max(max, parseInt(m[1])) : max;
  }, 0);
  return 'AD-' + String(maxNum + 1).padStart(4, '0');
}


// ── Preserve Advice Note row order exactly as saved ────────────────────────────
function getAdviceNoteRowsInSavedOrder(rows?: Record<string, AdviceNoteRow>): AdviceNoteRow[] {
  if (!rows) return [];

  return Object.entries(rows)
    .map(([key, row], fallbackIndex) => {
      const match = key.match(/^row_(\d+)$/);
      return {
        row,
        order: match ? parseInt(match[1], 10) : Number.MAX_SAFE_INTEGER + fallbackIndex,
      };
    })
    .sort((a, b) => a.order - b.order)
    .map(item => item.row);
}

// ── Per-cut subtotal helper ───────────────────────────────────────────────────
function getCutSubtotals(rows: AdviceNoteRow[]) {
  const map = new Map<string, { pcs: number; pd: number; fd: number; good: number }>();
  rows.forEach(r => {
    const key = r.cutForm;
    const existing = map.get(key) ?? { pcs: 0, pd: 0, fd: 0, good: 0 };
    map.set(key, {
      pcs:  existing.pcs  + (r.totalPcs  || 0),
      pd:   existing.pd   + (r.pd        || 0),
      fd:   existing.fd   + (r.fd        || 0),
      good: existing.good + (r.goodQty   || 0),
    });
  });
  return map;
}

export default function AdviceNotePage() {
  const {
    adviceNotes, eligibleDispatchItems,
    fetchAdviceNotes, fetchEligibleDispatchItems,
    addAdviceNote, updateAdviceNote, deleteAdviceNote,
  } = useAdviceNoteStore();

  // Cascading Selection States
  const [selStyle, setSelStyle]                   = useState('');
  const [selCustomer, setSelCustomer]             = useState('');
  const [selComponentFilter, setSelComponentFilter] = useState('');
  const [selectedStoreInId, setSelectedStoreInId] = useState('');

  const [selectedCutNo, setSelectedCutNo]         = useState('');
  const [selectedComponent, setSelectedComponent] = useState('');
  const [deliveryDate, setDeliveryDate]           = useState(new Date().toISOString().split('T')[0]);
  const [attn, setAttn]             = useState('');
  const [address, setAddress]       = useState('');
  const [remarks, setRemarks]       = useState('');
  const [receivedByName, setReceivedByName] = useState('');
  const [prepByName, setPrepByName]         = useState('');
  const [authByName, setAuthByName]         = useState('');
  const [bundleRows, setBundleRows]         = useState<AdviceNoteRow[]>([]);
  const [addedCutNos, setAddedCutNos]       = useState<string[]>([]);
  const [editingId, setEditingId]           = useState<string | null>(null);
  const [errors, setErrors]                 = useState<Record<string, string>>({});
  const [pageError, setPageError]           = useState('');
  const [isSaving, setIsSaving]             = useState(false);
  const [expandedNoteId, setExpandedNoteId] = useState<string | null>(null);

  const notesPagination = usePaginatedSearch({
    data: adviceNotes,
    searchFields: ['styleNo' as any, 'customerName' as any, 'scheduleNo' as any, 'jobNo' as any, 'adNo' as any],
    pageSize: 25,
  });

  useEffect(() => {
    const load = async () => {
      try { await Promise.all([fetchAdviceNotes(), fetchEligibleDispatchItems()]); }
      catch (e) { setPageError(e instanceof Error ? e.message : 'Failed to load.'); }
    };
    load();
  }, [fetchAdviceNotes, fetchEligibleDispatchItems]);

  const selectedItem = useMemo(
    () => eligibleDispatchItems.find(i => i.storeInRecordId === selectedStoreInId) ?? null,
    [eligibleDispatchItems, selectedStoreInId]
  );

  const currentAdNo = editingId
    ? adviceNotes.find(n => n.id === editingId)?.adNo || ''
    : generateAdNo(adviceNotes);

  const totalPcs  = bundleRows.reduce((s, r) => s + r.totalPcs, 0);
  const totalPd   = bundleRows.reduce((s, r) => s + r.pd, 0);
  const totalFd   = bundleRows.reduce((s, r) => s + r.fd, 0);
  const totalGood = bundleRows.reduce((s, r) => s + r.goodQty, 0);

  const cutSubtotals = useMemo(() => getCutSubtotals(bundleRows), [bundleRows]);

  // ── Smart Tracking of Already Dispatched Bundles ────────────────────────────
  const usedBundles = useMemo(() => {
    const set = new Set<string>();
    adviceNotes.forEach(n => {
      if (n.id === editingId) return; 
      const rows = Object.values(n.rows || {});
      rows.forEach(r => {
        set.add(`${n.storeInRecordId}|||${r.cutForm}|||${r.bundleNo}`);
      });
    });
    return set;
  }, [adviceNotes, editingId]);

  // Only shows styles that have at least one un-dispatched bundle
  const unusedStyles = useMemo(() => {
    return eligibleDispatchItems.filter(item => {
      if (editingId && item.storeInRecordId === selectedStoreInId) return true;
      return item.cuts.some(c => 
        c.bundles.some(b => !usedBundles.has(`${item.storeInRecordId}|||${c.cutNo}|||${b.bundleNo}`))
      );
    });
  }, [eligibleDispatchItems, usedBundles, editingId, selectedStoreInId]);

  // ── Cascading Dropdown Logic ────────────────────────────────────────────────
  const styleOptions = useMemo(() => {
    const styles = new Set(unusedStyles.map(u => u.styleNo));
    return Array.from(styles).sort();
  }, [unusedStyles]);

  const customerOptions = useMemo(() => {
    if (!selStyle) return [];
    const customers = new Set(unusedStyles.filter(u => u.styleNo === selStyle).map(u => u.customerName));
    return Array.from(customers).sort();
  }, [unusedStyles, selStyle]);

  const componentOptions = useMemo(() => {
    if (!selStyle || !selCustomer) return [];
    const components = new Set(unusedStyles.filter(u => u.styleNo === selStyle && u.customerName === selCustomer).map(u => u.components));
    return Array.from(components).sort();
  }, [unusedStyles, selStyle, selCustomer]);

  const storeInOptions = useMemo(() => {
    if (!selStyle || !selCustomer || !selComponentFilter) return [];
    return unusedStyles.filter(u => u.styleNo === selStyle && u.customerName === selCustomer && u.components === selComponentFilter);
  }, [unusedStyles, selStyle, selCustomer, selComponentFilter]);

  // Auto-select customer if only one exists
  useEffect(() => {
    if (selStyle && !selCustomer && customerOptions.length === 1 && !editingId) {
      setSelCustomer(customerOptions[0]);
    }
  }, [selStyle, selCustomer, customerOptions, editingId]);

  // Auto-select component if only one exists
  useEffect(() => {
    if (selStyle && selCustomer && !selComponentFilter && componentOptions.length === 1 && !editingId) {
      setSelComponentFilter(componentOptions[0]);
    }
  }, [selStyle, selCustomer, selComponentFilter, componentOptions, editingId]);

  // Auto-select batch/schedule if only one exists
  useEffect(() => {
    if (selStyle && selCustomer && selComponentFilter && !selectedStoreInId && storeInOptions.length === 1 && !editingId) {
      setSelectedStoreInId(storeInOptions[0].storeInRecordId);
    }
  }, [selStyle, selCustomer, selComponentFilter, selectedStoreInId, storeInOptions, editingId]);

  const handleStyleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelStyle(e.target.value);
    setSelCustomer('');
    setSelComponentFilter('');
    setSelectedStoreInId('');
    setSelectedCutNo('');
    setSelectedComponent('');
    if (!editingId) { setBundleRows([]); setAddedCutNos([]); }
    if (errors.storeInRecordId) setErrors(p => ({ ...p, storeInRecordId: '' }));
  };

  const handleCustomerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelCustomer(e.target.value);
    setSelComponentFilter('');
    setSelectedStoreInId('');
    setSelectedCutNo('');
    setSelectedComponent('');
    if (!editingId) { setBundleRows([]); setAddedCutNos([]); }
    if (errors.storeInRecordId) setErrors(p => ({ ...p, storeInRecordId: '' }));
  };

  const handleComponentFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelComponentFilter(e.target.value);
    setSelectedStoreInId('');
    setSelectedCutNo('');
    setSelectedComponent('');
    if (!editingId) { setBundleRows([]); setAddedCutNos([]); }
    if (errors.storeInRecordId) setErrors(p => ({ ...p, storeInRecordId: '' }));
  };

  const handleStoreInChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedStoreInId(e.target.value);
    setSelectedCutNo('');
    setSelectedComponent('');
    if (!editingId) { setBundleRows([]); setAddedCutNos([]); }
    if (errors.storeInRecordId) setErrors(p => ({ ...p, storeInRecordId: '' }));
  };

  // Only shows cuts that have unused bundles
  const availableCuts = useMemo(() => {
    if (!selectedItem) return [];
    return selectedItem.cuts.filter(c => {
      if (addedCutNos.includes(c.cutNo)) return false;
      return c.bundles.some(b => !usedBundles.has(`${selectedItem.storeInRecordId}|||${c.cutNo}|||${b.bundleNo}`));
    });
  }, [selectedItem, addedCutNos, usedBundles]);

  // ── Actions ────────────────────────────────────────────────────────────────
  const handleAddCut = () => {
    if (!selectedCutNo) { setErrors(p => ({ ...p, cutNo: 'Select a cut' })); return; }
    if (!selectedComponent) { setErrors(p => ({ ...p, component: 'Select a component' })); return; }
    const cut = selectedItem?.cuts.find(c => c.cutNo === selectedCutNo);
    if (!cut) return;

    // Isolate ONLY the bundles that have not been dispatched yet
    const unusedBundles = cut.bundles.filter(b => !usedBundles.has(`${selectedItem!.storeInRecordId}|||${cut.cutNo}|||${b.bundleNo}`));

    const newRows: AdviceNoteRow[] = unusedBundles.map(b => ({
      productionRecordId: selectedItem?.productionRecordId || '',
      colour:             selectedItem?.bodyColour || '',
      bundleNo:           b.bundleNo,
      size:               b.size,
      cutForm:            selectedCutNo,
      component:          selectedComponent,
      totalPcs:           b.bundleQty,
      pd:                 0,
      fd:                 0,
      goodQty:            b.bundleQty,
    }));

    setBundleRows(prev => [...prev, ...newRows]);
    setAddedCutNos(prev => [...prev, selectedCutNo]);
    setSelectedCutNo(''); setSelectedComponent('');
    setErrors({}); setPageError('');
  };

  const handleRemoveCut = (cutNo: string) => {
    setBundleRows(prev => prev.filter(r => r.cutForm !== cutNo));
    setAddedCutNos(prev => prev.filter(c => c !== cutNo));
  };

  const handleRemoveBundleRow = (indexToRemove: number) => {
    setBundleRows(prev => {
      const newRows = prev.filter((_, idx) => idx !== indexToRemove);
      const remainingCuts = new Set(newRows.map(r => r.cutForm));
      setAddedCutNos(prevCuts => prevCuts.filter(c => remainingCuts.has(c)));
      return newRows;
    });
  };

  const updateBundleRow = (index: number, field: 'pd' | 'fd', value: string) => {
    const num = parseInt(value) || 0;
    setBundleRows(prev => prev.map((row, i) => {
      if (i !== index) return row;
      const updated = { ...row, [field]: num };
      updated.goodQty = Math.max(0, updated.totalPcs - updated.pd - updated.fd);
      return updated;
    }));
  };

  const resetForm = () => {
    setSelStyle(''); setSelCustomer(''); setSelComponentFilter(''); setSelectedStoreInId(''); 
    setSelectedCutNo(''); setSelectedComponent('');
    setDeliveryDate(new Date().toISOString().split('T')[0]);
    setAttn(''); setAddress(''); setRemarks('');
    setReceivedByName(''); setPrepByName(''); setAuthByName('');
    setBundleRows([]); setAddedCutNos([]);
    setEditingId(null); setErrors({}); setPageError('');
  };

  const validateForm = () => {
    const e: Record<string, string> = {};
    if (!selectedStoreInId) e.storeInRecordId = 'Select a batch/schedule';
    if (!deliveryDate)      e.deliveryDate    = 'Date is required';
    if (!attn.trim())       e.attn            = 'Attn is required';
    if (!address.trim())    e.address         = 'Address is required';
    if (bundleRows.length === 0) e.cuts        = 'Add at least one cut/bundle';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validateForm()) return;
    setIsSaving(true); setPageError('');
    try {
      const rowsRecord: Record<string, AdviceNoteRow> = {};
      bundleRows.forEach((row, idx) => { rowsRecord['row_' + idx] = row; });
      const payload: Partial<AdviceNoteRecord> = {
        productionRecordId: selectedItem?.productionRecordId || '',
        storeInRecordId:    selectedStoreInId,
        adNo:               currentAdNo,
        deliveryDate,
        attn,
        address,
        scheduleNo:         selectedItem?.scheduleNo || '',
        jobNo:              selectedItem?.jobNo || '',
        dispatchQty:        totalPcs,
        rows:               rowsRecord,
        receivedByName,
        prepByName,
        authByName,
        remarks,
      };
      if (editingId) {
        const ex = adviceNotes.find(n => n.id === editingId);
        if (ex) await updateAdviceNote(editingId, { ...ex, ...payload } as AdviceNoteRecord);
      } else {
        await addAdviceNote(payload);
      }
      resetForm();
      await Promise.all([fetchAdviceNotes(), fetchEligibleDispatchItems()]);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Failed to save.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (note: AdviceNoteRecord) => {
    const storeInItem = eligibleDispatchItems.find(i => i.storeInRecordId === note.storeInRecordId);
    if (storeInItem) {
      setSelStyle(storeInItem.styleNo);
      setSelCustomer(storeInItem.customerName);
      setSelComponentFilter(storeInItem.components);
    }

    setSelectedStoreInId(note.storeInRecordId);
    setDeliveryDate(note.deliveryDate);
    setAttn(note.attn); setAddress(note.address);
    setRemarks(note.remarks || '');
    setReceivedByName(note.receivedByName);
    setPrepByName(note.prepByName);
    setAuthByName(note.authByName);
    const rows = getAdviceNoteRowsInSavedOrder(note.rows);
    setBundleRows(rows);
    setAddedCutNos([...new Set(rows.map(r => r.cutForm))]);
    setEditingId(note.id);
    setErrors({}); setPageError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this advice note?')) return;
    try {
      await deleteAdviceNote(id);
      await Promise.all([fetchAdviceNotes(), fetchEligibleDispatchItems()]);
    } catch (e) { setPageError(e instanceof Error ? e.message : 'Failed to delete.'); }
  };

  function buildPrintData(): AdviceNoteRecord {
    const rr: Record<string, AdviceNoteRow> = {};
    bundleRows.forEach((r, i) => { rr['row_' + i] = r; });
    return {
      id:                 editingId || 'draft',
      productionRecordId: selectedItem?.productionRecordId || '',
      storeInRecordId:    selectedStoreInId,
      submissionId:       selectedItem?.submissionId || '',
      revisionNo:         selectedItem?.revisionNo || 1,
      adNo:               currentAdNo,
      deliveryDate,
      attn,
      customerName:       selectedItem?.customerName || '',
      styleNo:            selectedItem?.styleNo || '',
      address,
      scheduleNo:         selectedItem?.scheduleNo || '',
      jobNo:              selectedItem?.jobNo || '',
      cutNo:              addedCutNos.join(', '),
      component:          selectedItem?.components || '',
      dispatchQty:        totalPcs,
      balanceQty:         0,
      rows:               rr,
      receivedByName,
      prepByName,
      authByName,
      remarks,
    };
  }

  const rowsByCut = useMemo(() => {
    const groups: { cutNo: string; rows: { row: AdviceNoteRow; globalIdx: number }[] }[] = [];
    const seenCuts = new Set<string>();
    
    // Do not sort here. Gatepass must follow the exact bundle row order
    // received from Store-In / saved in the advice note.
    const withIndices = bundleRows.map((row, globalIdx) => ({ row, globalIdx }));

    withIndices.forEach(({ row, globalIdx }) => {
      if (!seenCuts.has(row.cutForm)) {
        seenCuts.add(row.cutForm);
        groups.push({ cutNo: row.cutForm, rows: [] });
      }
      groups.find(g => g.cutNo === row.cutForm)!.rows.push({ row, globalIdx });
    });
    return groups;
  }, [bundleRows]);

  // ==========================================
  // RENDER
  // ==========================================
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-5xl space-y-6 pb-12">

      {/* Header */}
      <div className="flex items-center space-x-3 border-b border-slate-200 pb-4">
        <div className="rounded-lg bg-blue-100 p-2"><FileText className="h-6 w-6 text-blue-700" /></div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Advice Note / Gatepass</h2>
          <p className="text-sm text-slate-500">Select style, add cuts one by one, then save.</p>
        </div>
      </div>

      {pageError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          <AlertCircle className="mr-1 inline h-4 w-4" />{pageError}
        </div>
      )}

      {/* Advice Note Form */}
      <div className="overflow-hidden border border-slate-300 bg-white shadow-xl">
        <form onSubmit={handleSubmit}>

          {/* Document header */}
          <div className="flex items-start justify-between border-b-2 border-slate-800 p-6">
            <div className="w-1/3">
              <h1 className="text-xl font-black tracking-tight text-blue-900">COLOURPLUS</h1>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Screen Printers for Textiles</p>
              <p className="mt-1 text-[9px] text-slate-400">E-mail: colourplus@sitnet.lk</p>
            </div>
            <div className="w-1/3 text-center">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Advice Note</p>
              <div className="mt-1 inline-block border-2 border-slate-800 bg-slate-50 px-5 py-1 text-lg font-black tracking-wider text-slate-800">
                {currentAdNo}
              </div>
            </div>
            <div className="w-1/3 text-right text-[10px] text-slate-500">
              <p>564, Athurugiriya Road, Kottawa.</p>
              <p>Tel: 011 278 1525</p>
              <div className="mt-3 flex items-center justify-end gap-2">
                <span className="text-xs font-bold">Date:</span>
                <input type="date" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)}
                  className="border-b border-slate-400 bg-transparent text-sm font-semibold outline-none focus:border-blue-600" />
              </div>
            </div>
          </div>

          {/* Cascading Selection + Address fields */}
          <div className="border-b border-slate-300 bg-blue-50/30 p-5 space-y-4">
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Style Dropdown */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-600">
                  Style <span className="text-red-500">*</span>
                </label>
                <select
                  value={selStyle}
                  onChange={handleStyleChange}
                  disabled={!!editingId}
                  className={'w-full rounded border bg-white px-3 py-2 text-sm outline-none ' + (errors.storeInRecordId && !selStyle ? 'border-red-400 bg-red-50' : 'border-slate-300 focus:ring-2 focus:ring-blue-500') + (editingId ? ' cursor-not-allowed bg-slate-100' : '')}
                >
                  <option value="">Select style…</option>
                  {styleOptions.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              {/* Customer Dropdown */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-600">
                  Customer <span className="text-red-500">*</span>
                </label>
                <select
                  value={selCustomer}
                  onChange={handleCustomerChange}
                  disabled={!!editingId || !selStyle}
                  className={'w-full rounded border bg-white px-3 py-2 text-sm outline-none ' + (errors.storeInRecordId && !selCustomer ? 'border-red-400 bg-red-50' : 'border-slate-300 focus:ring-2 focus:ring-blue-500') + (editingId || !selStyle ? ' cursor-not-allowed bg-slate-100' : '')}
                >
                  <option value="">Select customer…</option>
                  {customerOptions.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {/* Component Dropdown */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-600">
                  Component <span className="text-red-500">*</span>
                </label>
                <select
                  value={selComponentFilter}
                  onChange={handleComponentFilterChange}
                  disabled={!!editingId || !selCustomer}
                  className={'w-full rounded border bg-white px-3 py-2 text-sm outline-none ' + (errors.storeInRecordId && !selComponentFilter ? 'border-red-400 bg-red-50' : 'border-slate-300 focus:ring-2 focus:ring-blue-500') + (editingId || !selCustomer ? ' cursor-not-allowed bg-slate-100' : '')}
                >
                  <option value="">Select component…</option>
                  {componentOptions.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {/* Schedule / Batch Dropdown */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-600">
                  Schedule / Batch <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedStoreInId}
                  onChange={handleStoreInChange}
                  disabled={!!editingId || !selComponentFilter}
                  className={'w-full rounded border bg-white px-3 py-2 text-sm outline-none ' + (errors.storeInRecordId ? 'border-red-400 bg-red-50' : 'border-slate-300 focus:ring-2 focus:ring-blue-500') + (editingId || !selComponentFilter ? ' cursor-not-allowed bg-slate-100' : '')}
                >
                  <option value="">Select schedule/batch…</option>
                  {storeInOptions.map(item => (
                    <option key={item.storeInRecordId} value={item.storeInRecordId}>
                      {item.scheduleNo ? `Sch: ${item.scheduleNo}` : 'No Schedule'}{item.jobNo ? ` | Job: ${item.jobNo}` : ''} | Rem: {item.remainingDispatchQty}
                    </option>
                  ))}
                </select>
                {errors.storeInRecordId && <p className="text-[11px] text-red-600"><AlertCircle className="mr-1 inline h-3 w-3" />Select a batch</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-600">Attn <span className="text-red-500">*</span></label>
                <input type="text" value={attn} onChange={e => setAttn(e.target.value)} placeholder="Attention to…"
                  className={'w-full rounded border px-3 py-2 text-sm outline-none ' + (errors.attn ? 'border-red-400 bg-red-50' : 'border-slate-300 focus:ring-2 focus:ring-blue-500')} />
              </div>
              <div className="space-y-1">
                <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-600">Address <span className="text-red-500">*</span></label>
                <input type="text" value={address} onChange={e => setAddress(e.target.value)} placeholder="Delivery address…"
                  className={'w-full rounded border px-3 py-2 text-sm outline-none ' + (errors.address ? 'border-red-400 bg-red-50' : 'border-slate-300 focus:ring-2 focus:ring-blue-500')} />
              </div>
            </div>

            {selectedItem && (
              <div className="grid grid-cols-2 gap-x-6 gap-y-1 md:grid-cols-4 text-sm border-t border-blue-200 pt-3">
                <InfoLine label="Customer"      value={selectedItem.customerName} />
                <InfoLine label="Style #"       value={selectedItem.styleNo} />
                <InfoLine label="Schedule No"   value={selectedItem.scheduleNo || '—'} />
                <InfoLine label="Job No"        value={selectedItem.jobNo || '—'} />
                <InfoLine label="Body Colour"   value={selectedItem.bodyColour} />
                <InfoLine label="Print Colour"  value={selectedItem.printColour} />
                <InfoLine label="Components"    value={selectedItem.components} />
                <InfoLine label="Total Issue Qty"   value={selectedItem.issueQty.toString()} />
                <InfoLine label="Remaining"         value={selectedItem.remainingDispatchQty.toString()} />
              </div>
            )}
          </div>

          {/* Cut selector */}
          {selectedItem && (
            <div className="border-b border-slate-300 bg-orange-50/30 px-5 py-4">
              <div className="flex items-end gap-3 flex-wrap">
                <div className="space-y-1 flex-1 min-w-45">
                  <label className="block text-[10px] font-bold uppercase tracking-wide text-orange-800">
                    Cut No <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedCutNo}
                    onChange={e => {
                      const cn = e.target.value;
                      setSelectedCutNo(cn);
                      const matchedCut = selectedItem.cuts.find(c => c.cutNo === cn);
                      setSelectedComponent(matchedCut?.part || '');
                      setErrors(p => ({ ...p, cutNo: '', component: '' }));
                    }}
                    className={'w-full rounded border bg-white px-3 py-2 text-sm outline-none ' + (errors.cutNo ? 'border-red-400 bg-red-50' : 'border-slate-300 focus:ring-2 focus:ring-orange-500')}>
                    <option value="">Select cut…</option>
                    {availableCuts.map(c => {
                      const unusedB = c.bundles.filter(b => !usedBundles.has(`${selectedItem.storeInRecordId}|||${c.cutNo}|||${b.bundleNo}`));
                      const qty = unusedB.reduce((s, b) => s + b.bundleQty, 0);
                      return (
                        <option key={c.cutNo} value={c.cutNo}>
                          {c.cutNo}{c.part ? ' — ' + c.part : ''} — Qty: {qty} — {unusedB.length} bundle(s)
                        </option>
                      );
                    })}
                  </select>
                  {errors.cutNo && <p className="text-[11px] text-red-600">{errors.cutNo}</p>}
                </div>

                <div className="space-y-1 flex-1 min-w-45">
                  <label className="block text-[10px] font-bold uppercase tracking-wide text-orange-800">
                    Component <span className="text-[9px] font-normal text-slate-400">(from QC)</span>
                  </label>
                  <div className={'w-full rounded border px-3 py-2 text-sm font-bold outline-none ' + (selectedComponent ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : errors.component ? 'border-red-400 bg-red-50 text-red-500' : 'border-slate-300 bg-slate-50 text-slate-400')}>
                    {selectedComponent || (selectedCutNo ? 'No component set by QC for this cut' : '—')}
                  </div>
                </div>

                <button type="button" onClick={handleAddCut}
                  disabled={!selectedCutNo || !selectedComponent}
                  className="inline-flex items-center gap-1 rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-orange-700 disabled:opacity-40 transition-colors">
                  <Plus className="h-4 w-4" /> Add Cut
                </button>
              </div>

              {addedCutNos.length > 0 && (
                <div className="flex gap-2 mt-3 flex-wrap">
                  {addedCutNos.map(cn => (
                    <span key={cn} className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-3 py-1 text-xs font-bold text-orange-800">
                      {cn}
                      <button type="button" onClick={() => handleRemoveCut(cn)} className="hover:text-red-600 transition-colors">
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              {errors.cuts && <p className="mt-2 text-[11px] text-red-600"><AlertCircle className="mr-1 inline h-3 w-3" />{errors.cuts}</p>}
            </div>
          )}

          {/* Bundle rows table — grouped by cut with subtotals */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-slate-800 text-white">
                  <th className="w-10 border-r border-slate-600 px-2 py-2.5 text-center font-bold">#</th>
                  <th className="w-24 border-r border-slate-600 px-2 py-2.5 text-center font-bold">COLOUR</th>
                  <th className="w-24 border-r border-slate-600 px-2 py-2.5 text-center font-bold">BUN NO.</th>
                  <th className="w-20 border-r border-slate-600 px-2 py-2.5 text-center font-bold">SIZE</th>
                  <th className="w-24 border-r border-slate-600 px-2 py-2.5 text-center font-bold">CUT FORM</th>
                  <th className="w-24 border-r border-slate-600 px-2 py-2.5 text-center font-bold">COMPONENT</th>
                  <th className="w-24 border-r border-slate-600 px-2 py-2.5 text-center font-bold">TOTAL PCS</th>
                  <th className="w-16 border-r border-slate-600 bg-red-900 px-2 py-2.5 text-center font-bold">P/D</th>
                  <th className="w-16 border-r border-slate-600 bg-red-900 px-2 py-2.5 text-center font-bold">F/D</th>
                  <th className="w-24 border-r border-slate-600 bg-emerald-900 px-2 py-2.5 text-center font-bold">GOOD QTY</th>
                  <th className="w-10 bg-slate-800 px-2 py-2.5 text-center font-bold"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {rowsByCut.length > 0 ? (
                  <>
                    {rowsByCut.map(group => {
                      const sub = cutSubtotals.get(group.cutNo) ?? { pcs: 0, pd: 0, fd: 0, good: 0 };
                      return (
                        <>
                          {/* Bundle rows for this cut */}
                          {group.rows.map(({ row, globalIdx }) => (
                            <tr key={globalIdx} className="hover:bg-blue-50/30">
                              <td className="border-r border-slate-200 px-2 py-1.5 text-center text-xs font-medium text-slate-500">
                                {String(globalIdx + 1).padStart(2, '0')}
                              </td>
                              <td className="border-r border-slate-200 px-2 py-1.5 text-center text-xs">{row.colour}</td>
                              <td className="border-r border-slate-200 px-2 py-1.5 text-center text-xs font-bold">{row.bundleNo}</td>
                              <td className="border-r border-slate-200 px-2 py-1.5 text-center text-xs">{row.size}</td>
                              <td className="border-r border-slate-200 px-2 py-1.5 text-center text-xs">{row.cutForm}</td>
                              <td className="border-r border-slate-200 px-2 py-1.5 text-center text-xs font-semibold text-emerald-700">{row.component || '—'}</td>
                              <td className="border-r border-slate-200 px-2 py-1.5 text-center font-bold">{row.totalPcs}</td>
                              <td className="border-r border-slate-200 p-0">
                                <input type="text" inputMode="numeric" pattern="[0-9]*"
                                  value={row.pd || ''}
                                  onChange={e => updateBundleRow(globalIdx, 'pd', e.target.value.replace(/[^0-9]/g, ''))}
                                  className="w-full bg-transparent py-1.5 text-center text-sm font-semibold text-red-700 outline-none focus:bg-red-50"
                                  placeholder="-" />
                              </td>
                              <td className="border-r border-slate-200 p-0">
                                <input type="text" inputMode="numeric" pattern="[0-9]*"
                                  value={row.fd || ''}
                                  onChange={e => updateBundleRow(globalIdx, 'fd', e.target.value.replace(/[^0-9]/g, ''))}
                                  className="w-full bg-transparent py-1.5 text-center text-sm font-semibold text-red-700 outline-none focus:bg-red-50"
                                  placeholder="-" />
                              </td>
                              <td className="border-r border-emerald-200 bg-emerald-50/30 px-2 py-1.5 text-center font-black text-emerald-700">{row.goodQty}</td>
                              <td className="px-2 py-1.5 text-center">
                                <button type="button" onClick={() => handleRemoveBundleRow(globalIdx)}
                                  className="text-slate-300 hover:text-red-600 transition-colors" title="Remove bundle row">
                                  <Trash2 className="mx-auto h-4 w-4" />
                                </button>
                              </td>
                            </tr>
                          ))}

                          {/* ── Cut subtotal row ── */}
                          <tr className="bg-orange-50 border-t border-b-2 border-orange-300 text-xs font-bold">
                            <td colSpan={5} className="border-r border-orange-200 px-4 py-1.5 text-right text-orange-700 italic">
                              Sub-total: {group.cutNo}
                            </td>
                            <td className="border-r border-orange-200 px-2 py-1.5 text-center text-orange-600">—</td>
                            <td className="border-r border-orange-200 px-2 py-1.5 text-center text-orange-800">{sub.pcs}</td>
                            <td className="border-r border-orange-200 px-2 py-1.5 text-center text-red-700">{sub.pd || '—'}</td>
                            <td className="border-r border-orange-200 px-2 py-1.5 text-center text-red-700">{sub.fd || '—'}</td>
                            <td className="border-r border-orange-200 px-2 py-1.5 text-center text-emerald-700">{sub.good}</td>
                            <td className="px-2 py-1.5" />
                          </tr>
                        </>
                      );
                    })}

                    {/* Grand totals row */}
                    <tr className="border-t-2 border-slate-800 bg-slate-100 font-bold">
                      <td colSpan={6} className="border-r border-slate-300 px-4 py-2 text-right text-xs uppercase tracking-wide text-slate-600">Grand Total</td>
                      <td className="border-r border-slate-300 px-2 py-2 text-center font-black">{totalPcs}</td>
                      <td className="border-r border-slate-300 px-2 py-2 text-center font-black text-red-700">{totalPd || '—'}</td>
                      <td className="border-r border-slate-300 px-2 py-2 text-center font-black text-red-700">{totalFd || '—'}</td>
                      <td className="border-r border-slate-300 bg-emerald-50 px-2 py-2 text-center font-black text-emerald-700">{totalGood}</td>
                      <td className="bg-slate-100" />
                    </tr>
                  </>
                ) : (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-slate-400">
                      Select a style and add cuts to build the dispatch table.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Remarks */}
          <div className="border-t border-slate-300 px-5 py-3">
            <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1">Remarks</label>
            <input type="text" value={remarks} onChange={e => setRemarks(e.target.value)}
              placeholder="Any remarks…"
              className="w-full border-b border-slate-300 bg-transparent pb-1 text-sm outline-none focus:border-blue-600" />
          </div>

          {/* Footer */}
          <div className="border-t-2 border-slate-800 bg-slate-50 p-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3 mb-4">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-600">Received by</label>
                <input type="text" value={receivedByName} onChange={e => setReceivedByName(e.target.value)}
                  className="w-full border-b border-slate-400 bg-transparent pb-1 text-sm outline-none focus:border-blue-600" />
              </div>
              <div className="space-y-1">
                <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-600">Prep. & Checked by</label>
                <input type="text" value={prepByName} onChange={e => setPrepByName(e.target.value)}
                  className="w-full border-b border-slate-400 bg-transparent pb-1 text-sm outline-none focus:border-blue-600" />
              </div>
              <div className="space-y-1">
                <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-600">Authorized by</label>
                <input type="text" value={authByName} onChange={e => setAuthByName(e.target.value)}
                  className="w-full border-b border-slate-400 bg-transparent pb-1 text-sm outline-none focus:border-blue-600" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button type="submit" disabled={isSaving}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors disabled:opacity-50">
                <Save className="h-4 w-4" />{isSaving ? 'Saving…' : editingId ? 'Update' : 'Save Advice Note'}
              </button>
              {bundleRows.length > 0 && (
                <button type="button" onClick={() => printAdviceNote(buildPrintData())}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors">
                  <Printer className="h-4 w-4" /> Print
                </button>
              )}
              {editingId && (
                <button type="button" onClick={resetForm}
                  className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors">
                  Cancel
                </button>
              )}
            </div>
          </div>
        </form>
      </div>

      {/* Saved Advice Notes */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50 px-6 py-4 space-y-3">
          <h3 className="text-lg font-semibold text-slate-800">Advice Notes</h3>
          <PaginationControls
            search={notesPagination.search}
            onSearchChange={notesPagination.setSearch}
            currentPage={notesPagination.currentPage}
            totalPages={notesPagination.totalPages}
            totalFiltered={notesPagination.totalFiltered}
            totalAll={notesPagination.totalAll}
            onPageChange={notesPagination.goToPage}
            hasNext={notesPagination.hasNext}
            hasPrev={notesPagination.hasPrev}
            placeholder="Search by style, customer, schedule, AD…"
          />
        </div>

        {adviceNotes.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <FileText className="mx-auto mb-3 h-12 w-12 opacity-20" />
            <p>No advice notes yet.</p>
          </div>
        ) : notesPagination.paginated.length === 0 ? (
          <div className="py-12 text-center text-slate-400">No notes match your search.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {notesPagination.paginated.map(note => {
              const isExp = expandedNoteId === note.id;
              
              // Preserve the saved row order. Do not auto-sort by bundle number.
              const nRows = getAdviceNoteRowsInSavedOrder(note.rows);

              return (
                <div key={note.id}>
                  <div className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50/50 cursor-pointer transition-colors"
                    onClick={() => setExpandedNoteId(isExp ? null : note.id)}>
                    {isExp
                      ? <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
                      : <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="rounded bg-slate-800 px-2 py-0.5 text-xs font-bold text-white">{note.adNo}</span>
                        <span className="font-bold text-slate-900">{note.styleNo}</span>
                        <span className="text-xs text-slate-500">{note.customerName}</span>
                        {note.component && (
                          <span className="rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-[10px] font-bold px-2 py-0.5">
                            {note.component}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Date: {note.deliveryDate}{note.scheduleNo ? ' | Sch: ' + note.scheduleNo : ''}{note.jobNo ? ' | Job: ' + note.jobNo : ''} | Cuts: {note.cutNo} | Dispatch: {note.dispatchQty}
                      </p>
                    </div>
                    <div className="flex gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                      <button onClick={() => printAdviceNote(note)}
                        className="rounded p-1.5 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 transition-colors" title="Print">
                        <Printer className="h-4 w-4" />
                      </button>
                      <button onClick={() => handleEdit(note)}
                        className="rounded p-1.5 text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-colors" title="Edit">
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button onClick={() => handleDelete(note.id)}
                        className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors" title="Delete">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <AnimatePresence>
                    {isExp && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                        className="border-t border-slate-100 bg-slate-50/50 px-6 py-4 overflow-hidden">
                        <table className="w-full text-xs border-collapse">
                          <thead>
                            <tr className="text-slate-500 border-b border-slate-200">
                              <th className="py-1 text-left">#</th>
                              <th className="py-1 text-left">Colour</th>
                              <th className="py-1 text-left">Bundle</th>
                              <th className="py-1 text-left">Size</th>
                              <th className="py-1 text-left">Cut</th>
                              <th className="py-1 text-left">Component</th>
                              <th className="py-1 text-right">Pcs</th>
                              <th className="py-1 text-right">P/D</th>
                              <th className="py-1 text-right">F/D</th>
                              <th className="py-1 text-right">Good</th>
                            </tr>
                          </thead>
                          <tbody>
                            {nRows.map((r, i) => (
                              <tr key={i} className="border-b border-slate-100">
                                <td className="py-0.5">{i + 1}</td>
                                <td className="py-0.5">{r.colour}</td>
                                <td className="py-0.5 font-bold">{r.bundleNo}</td>
                                <td className="py-0.5">{r.size}</td>
                                <td className="py-0.5">{r.cutForm}</td>
                                <td className="py-0.5 font-semibold text-indigo-700">{r.component || '—'}</td>
                                <td className="py-0.5 text-right font-bold">{r.totalPcs}</td>
                                <td className="py-0.5 text-right text-red-600">{r.pd || '—'}</td>
                                <td className="py-0.5 text-right text-red-600">{r.fd || '—'}</td>
                                <td className="py-0.5 text-right font-bold text-emerald-700">{r.goodQty}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
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
// PRINT FUNCTION — with per-cut subtotals
// ==========================================
function printAdviceNote(note: AdviceNoteRecord) {
  // Preserve the exact saved row order in the print report.
  // Do not sort by Bundle No, because manual orders like b-10, b-3, b-5 must stay unchanged.
  const rows = getAdviceNoteRowsInSavedOrder(note.rows);

  // Group rows by cut, preserving insertion order
  const cutGroups = new Map<string, typeof rows>();
  rows.forEach(r => {
    const key = r.cutForm;
    if (!cutGroups.has(key)) cutGroups.set(key, []);
    cutGroups.get(key)!.push(r);
  });

  const grandPcs  = rows.reduce((s, r) => s + (r.totalPcs  || 0), 0);
  const grandPd   = rows.reduce((s, r) => s + (r.pd        || 0), 0);
  const grandFd   = rows.reduce((s, r) => s + (r.fd        || 0), 0);
  const grandGood = rows.reduce((s, r) => s + (r.goodQty   || 0), 0);

  // Minimum 28 data rows for print layout (not counting subtotal/total rows)
  const dataRowCount = rows.length + cutGroups.size; // bundles + subtotal rows
  const minDataRows = Math.max(dataRowCount, 28);
  const blankPad = Math.max(0, minDataRows - dataRowCount);

  let tableRows = '';
  let rowNo = 1;

  cutGroups.forEach((cutRows, cutNo) => {
    const subPcs  = cutRows.reduce((s, r) => s + (r.totalPcs || 0), 0);
    const subPd   = cutRows.reduce((s, r) => s + (r.pd       || 0), 0);
    const subFd   = cutRows.reduce((s, r) => s + (r.fd       || 0), 0);
    const subGood = cutRows.reduce((s, r) => s + (r.goodQty  || 0), 0);

    // Bundle rows for this cut
    cutRows.forEach(r => {
      tableRows += `<tr>
        <td>${String(rowNo++).padStart(2, '0')}</td>
        <td>${r.colour || ''}</td>
        <td><b>${r.bundleNo || ''}</b></td>
        <td>${r.size || ''}</td>
        <td>${r.cutForm || ''}</td>
        <td class="comp">${r.component || ''}</td>
        <td class="bold">${r.totalPcs || ''}</td>
        <td class="red">${r.pd || '—'}</td>
        <td class="red">${r.fd || '—'}</td>
        <td class="bold">${r.goodQty || ''}</td>
      </tr>`;
    });

    // Subtotal row for this cut
    tableRows += `<tr class="sub-row">
      <td colspan="5" style="text-align:right;font-style:italic;padding-right:6px;color:#7c5d1e;">Sub-total: ${cutNo}</td>
      <td>—</td>
      <td class="bold">${subPcs}</td>
      <td class="red bold">${subPd || '—'}</td>
      <td class="red bold">${subFd || '—'}</td>
      <td class="bold" style="color:#166534;">${subGood}</td>
    </tr>`;
  });

  // Blank padding rows
  for (let i = 0; i < blankPad; i++) {
    tableRows += `<tr><td>${String(rowNo++).padStart(2, '0')}</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>`;
  }

  // Grand total row
  tableRows += `<tr class="total-row">
    <td colspan="6" style="text-align:right;padding-right:6px;">GRAND TOTAL</td>
    <td class="bold">${grandPcs}</td>
    <td class="red bold">${grandPd || '—'}</td>
    <td class="red bold">${grandFd || '—'}</td>
    <td class="bold" style="color:#166534;">${grandGood}</td>
  </tr>`;

  const html = `<!DOCTYPE html><html><head>
    <title>${note.adNo}</title>
    <style>
      @page { size: A4 portrait; margin: 0; }
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: Arial, sans-serif; font-size: 12px; color: #000; padding: 10mm; }
      .hdr { display: flex; justify-content: space-between; margin-bottom: 6px; }
      .hdr-left h1 { font-size: 16px; font-weight: 900; }
      .hdr-left p, .hdr-right p { margin: 2px 0; font-size: 11px; }
      .hdr-right { text-align: right; }
      .ad-block { text-align: center; margin: 8px 0; }
      .ad-no { font-size: 22px; font-weight: 900; border: 2px solid #000; padding: 4px 16px; display: inline-block; }
      .info .row { display: flex; margin: 4px 0; font-size: 12px;}
      .info .lbl { font-weight: 700; min-width: 100px; }
      .info .val { border-bottom: 1px solid #000; flex: 1; min-height: 16px; padding: 0 4px; }
      table { width: 100%; border-collapse: collapse; border: 1.5px solid #000; margin-top: 8px; }
      th, td { border: 0.5px solid #000; padding: 4px; font-size: 11px; text-align: center; height: 22px; }
      th { background: #e0e0e0; font-weight: 700; font-size: 12px;}
      .bold { font-weight: 700; }
      .red { color: #c00; }
      .comp { color: #1a6b3c; font-weight: 600; }
      .sub-row td { background: #fff8e7; font-weight: 700; border-top: 1.5px solid #d97706; border-bottom: 1.5px solid #d97706; }
      .total-row td { border-top: 2px solid #000; font-weight: 700; background: #f0f0f0; }
      .remarks { margin-top: 8px; font-size: 12px; border-top: 1px solid #000; padding-top: 5px; }
      .footer { display: flex; justify-content: space-between; margin-top: 24px; }
      .footer .sig { flex: 1; text-align: center; font-size: 12px; }
      .footer .sig .lbl { font-weight: 700; font-style: italic; margin-bottom: 24px; }
      .footer .sig .line { border-top: 1px solid #000; padding-top: 4px; margin: 0 15px; }
      @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
    </style>
    </head><body>
    <div class="hdr">
      <div class="hdr-left" style="display: flex; align-items: center; gap: 10px;">
        <img src="/logo.svg" alt="Logo" style="height: 40px; width: auto;" />
        <div><h1>COLOUR PLUS PRINTING SYSTEMS (PVT) LTD.</h1>
        <p>SCREEN PRINTERS FOR TEXTILES</p>
        <p>E-mail: colourplus@sitnet.lk</p></div>
      </div>
      <div class="hdr-right"><p>564, Athurugiriya Road, Kottawa.</p><p>Tel: 011 278 1525</p></div>
    </div>
    <div class="ad-block">
      <span style="font-size:12px;font-weight:700">AD No:</span>
      <span class="ad-no">${note.adNo}</span>
      <span style="margin-left:40px;font-size:12px"><b>Date:</b> ${note.deliveryDate}</span>
    </div>
    <div class="info">
      <div class="row"><span class="lbl">Customer:</span><span class="val">${note.customerName}</span>
      <span class="lbl" style="margin-left:20px">Attn:</span><span class="val">${note.attn}</span></div>
      <div class="row"><span class="lbl">Style #:</span><span class="val">${note.styleNo}</span></div>
      <div class="row"><span class="lbl">Address:</span><span class="val">${note.address}</span></div>
      <div class="row"><span class="lbl">Schedule No:</span><span class="val">${note.scheduleNo || ''}</span>
      <span class="lbl" style="margin-left:20px">Job No:</span><span class="val">${note.jobNo || ''}</span></div>
    </div>
    <table><thead><tr>
      <th style="width:24px"></th>
      <th>COLOUR</th><th>BUN NO.</th><th>SIZE</th><th>CUT FORM</th>
      <th>COMPONENT</th>
      <th>TOTAL PCS</th><th>P/D</th><th>F/D</th><th>GOOD QTY</th>
    </tr></thead><tbody>${tableRows}</tbody></table>
    <div class="remarks"><b>Remarks.</b> ${note.remarks || ''}</div>
    <div class="footer">
      <div class="sig"><div class="lbl">Received by</div><div class="line">${note.receivedByName || ''}</div></div>
      <div class="sig"><div class="lbl">Prep. & Checked by</div><div class="line">${note.prepByName || ''}</div></div>
      <div class="sig"><div class="lbl">Authorized by</div><div class="line">${note.authByName || ''}</div></div>
    </div>
    </body></html>`;

  const old = document.getElementById('gatepass-print-frame') as HTMLIFrameElement | null;
  if (old) old.remove();
  const frame = document.createElement('iframe');
  frame.id = 'gatepass-print-frame';
  frame.style.cssText = 'position:fixed;top:-10000px;left:-10000px;width:900px;height:1200px';
  document.body.appendChild(frame);
  const doc = frame.contentDocument || frame.contentWindow?.document;
  if (doc) {
    doc.open(); doc.write(html); doc.close();
    setTimeout(() => { frame.contentWindow?.print(); setTimeout(() => frame.remove(), 1000); }, 300);
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-[10px] font-bold uppercase text-slate-400 shrink-0">{label}:</span>
      <span className="text-sm font-medium text-slate-700">{value || '—'}</span>
    </div>
  );
}