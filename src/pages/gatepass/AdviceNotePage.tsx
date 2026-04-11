// src/pages/gatepass/AdviceNotePage.tsx
import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, Save, Edit2, Trash2, AlertCircle, Printer, Plus, ChevronDown, ChevronRight, X,
} from 'lucide-react';
import {
  useAdviceNoteStore, AdviceNoteRecord, AdviceNoteRow, EligibleGatepassItem,
} from '../../store/adviceNoteStore';
import { usePaginatedSearch } from '../../hooks/usePaginatedSearch';
import { PaginationControls } from '../../components/PaginatedTable';

function generateAdNo(existingNotes: AdviceNoteRecord[]): string {
  if (existingNotes.length === 0) return 'AD-0001';
  const maxNum = existingNotes.reduce((max, n) => { const m = n.adNo.match(/(\d+)$/); return m ? Math.max(max, parseInt(m[1])) : max; }, 0);
  return `AD-${String(maxNum + 1).padStart(4, '0')}`;
}

export default function AdviceNotePage() {
  const { adviceNotes, eligibleDispatchItems, fetchAdviceNotes, fetchEligibleDispatchItems, addAdviceNote, updateAdviceNote, deleteAdviceNote } = useAdviceNoteStore();
  const [selectedStoreInId, setSelectedStoreInId] = useState('');
  const [selectedCutNo, setSelectedCutNo] = useState('');
  const [selectedComponent, setSelectedComponent] = useState('');
  const [deliveryDate, setDeliveryDate] = useState(new Date().toISOString().split('T')[0]);
  const [attn, setAttn] = useState('');
  const [address, setAddress] = useState('');
  const [remarks, setRemarks] = useState('');
  const [receivedByName, setReceivedByName] = useState('');
  const [prepByName, setPrepByName] = useState('');
  const [authByName, setAuthByName] = useState('');
  const [bundleRows, setBundleRows] = useState<AdviceNoteRow[]>([]);
  const [addedCutNos, setAddedCutNos] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pageError, setPageError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [expandedNoteId, setExpandedNoteId] = useState<string | null>(null);
  const notesPagination = usePaginatedSearch({ data: adviceNotes, searchFields: ['styleNo' as any, 'customerName' as any, 'scheduleNo' as any, 'adNo' as any], pageSize: 25 });

  useEffect(() => {
    const load = async () => { try { await Promise.all([fetchAdviceNotes(), fetchEligibleDispatchItems()]); } catch (e) { setPageError(e instanceof Error ? e.message : 'Failed to load.'); } };
    load();
  }, [fetchAdviceNotes, fetchEligibleDispatchItems]);

  const selectedItem = useMemo(() => eligibleDispatchItems.find((i) => i.storeInRecordId === selectedStoreInId) || null, [eligibleDispatchItems, selectedStoreInId]);
  const availableCuts = useMemo(() => selectedItem ? selectedItem.cuts.filter((c) => !addedCutNos.includes(c.cutNo)) : [], [selectedItem, addedCutNos]);
  const currentAdNo = editingId ? adviceNotes.find((n) => n.id === editingId)?.adNo || '' : generateAdNo(adviceNotes);
  const totalPcs = bundleRows.reduce((s, r) => s + r.totalPcs, 0);
  const totalPd = bundleRows.reduce((s, r) => s + r.pd, 0);
  const totalFd = bundleRows.reduce((s, r) => s + r.fd, 0);
  const totalGood = bundleRows.reduce((s, r) => s + r.goodQty, 0);

  const handleAddCut = () => {
    if (!selectedCutNo) { setErrors((p) => ({ ...p, cutNo: 'Select a cut' })); return; }
    if (!selectedComponent) { setErrors((p) => ({ ...p, component: 'Select a component' })); return; }
    const cut = selectedItem?.cuts.find((c) => c.cutNo === selectedCutNo);
    if (!cut) return;
    const newRows: AdviceNoteRow[] = cut.bundles.map((b) => ({ productionRecordId: selectedItem?.productionRecordId || '', colour: selectedItem?.bodyColour || '', bundleNo: b.bundleNo, size: b.size, cutForm: selectedCutNo, component: selectedComponent, totalPcs: b.bundleQty, pd: 0, fd: 0, goodQty: b.bundleQty }));
    setBundleRows((prev) => [...prev, ...newRows]);
    setAddedCutNos((prev) => [...prev, selectedCutNo]);
    setSelectedCutNo(''); setSelectedComponent(''); setErrors({}); setPageError('');
  };

  const handleRemoveCut = (cutNo: string) => {
    setBundleRows((prev) => prev.filter((r) => r.cutForm !== cutNo));
    setAddedCutNos((prev) => prev.filter((c) => c !== cutNo));
  };

  const updateBundleRow = (index: number, field: 'pd' | 'fd', value: string) => {
    const num = parseInt(value) || 0;
    setBundleRows((prev) => prev.map((row, i) => {
      if (i !== index) return row;
      const updated = { ...row, [field]: num };
      updated.goodQty = Math.max(0, updated.totalPcs - updated.pd - updated.fd);
      return updated;
    }));
  };

  const resetForm = () => {
    setSelectedStoreInId(''); setSelectedCutNo(''); setSelectedComponent('');
    setDeliveryDate(new Date().toISOString().split('T')[0]);
    setAttn(''); setAddress(''); setRemarks(''); setReceivedByName(''); setPrepByName(''); setAuthByName('');
    setBundleRows([]); setAddedCutNos([]); setEditingId(null); setErrors({}); setPageError('');
  };

  const validateForm = () => {
    const e: Record<string, string> = {};
    if (!selectedStoreInId) e.storeInRecordId = 'Select a style';
    if (!deliveryDate) e.deliveryDate = 'Date is required';
    if (!attn.trim()) e.attn = 'Attn is required';
    if (!address.trim()) e.address = 'Address is required';
    if (bundleRows.length === 0) e.cuts = 'Add at least one cut';
    setErrors(e); return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault(); if (!validateForm()) return;
    setIsSaving(true); setPageError('');
    try {
      const rowsRecord: Record<string, AdviceNoteRow> = {};
      bundleRows.forEach((row, idx) => { rowsRecord[`row_${idx}`] = row; });
      const payload: Partial<AdviceNoteRecord> = { productionRecordId: selectedItem?.productionRecordId || '', storeInRecordId: selectedStoreInId, adNo: currentAdNo, deliveryDate, attn, address, scheduleNo: selectedItem?.scheduleNo || '', dispatchQty: totalPcs, rows: rowsRecord, receivedByName, prepByName, authByName, remarks };
      if (editingId) { const ex = adviceNotes.find((n) => n.id === editingId); if (ex) await updateAdviceNote(editingId, { ...ex, ...payload } as AdviceNoteRecord); }
      else { await addAdviceNote(payload); }
      resetForm(); await Promise.all([fetchAdviceNotes(), fetchEligibleDispatchItems()]);
    } catch (error) { setPageError(error instanceof Error ? error.message : 'Failed to save.'); }
    finally { setIsSaving(false); }
  };

  const handleEdit = (note: AdviceNoteRecord) => {
    setSelectedStoreInId(note.storeInRecordId); setDeliveryDate(note.deliveryDate); setAttn(note.attn); setAddress(note.address);
    setRemarks(note.remarks || ''); setReceivedByName(note.receivedByName); setPrepByName(note.prepByName); setAuthByName(note.authByName);
    const rows = Object.values(note.rows || {}); setBundleRows(rows);
    setAddedCutNos([...new Set(rows.map((r) => r.cutForm))]); setEditingId(note.id); setErrors({}); setPageError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this advice note?')) return;
    try { await deleteAdviceNote(id); await Promise.all([fetchAdviceNotes(), fetchEligibleDispatchItems()]); }
    catch (e) { setPageError(e instanceof Error ? e.message : 'Failed to delete.'); }
  };

  function buildPrintData(): AdviceNoteRecord {
    const rr: Record<string, AdviceNoteRow> = {}; bundleRows.forEach((r, i) => { rr[`row_${i}`] = r; });
    return { id: editingId || 'draft', productionRecordId: selectedItem?.productionRecordId || '', storeInRecordId: selectedStoreInId, submissionId: selectedItem?.submissionId || '', revisionNo: selectedItem?.revisionNo || 1, adNo: currentAdNo, deliveryDate, attn, customerName: selectedItem?.customerName || '', styleNo: selectedItem?.styleNo || '', address, scheduleNo: selectedItem?.scheduleNo || '', cutNo: addedCutNos.join(', '), component: selectedItem?.components || '', dispatchQty: totalPcs, balanceQty: 0, rows: rr, receivedByName, prepByName, authByName, remarks };
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-5xl space-y-6 pb-12">
      <div className="flex items-center space-x-3 border-b border-slate-200 pb-4">
        <div className="rounded-lg bg-blue-100 p-2"><FileText className="h-6 w-6 text-blue-700" /></div>
        <div><h2 className="text-2xl font-bold text-slate-900">Advice Note / Gatepass</h2><p className="text-sm text-slate-500">Select style, add cuts one by one, then save.</p></div>
      </div>
      {pageError && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{pageError}</div>}

      <div className="overflow-hidden border border-slate-300 bg-white shadow-xl">
        <form onSubmit={handleSubmit}>
          <div className="flex items-start justify-between border-b-2 border-slate-800 p-6">
            <div className="w-1/3"><h1 className="text-xl font-black tracking-tight text-blue-900">COLOURPLUS</h1><p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Screen Printers for Textiles</p><p className="mt-1 text-[9px] text-slate-400">E-mail: colourplus@sitnet.lk</p></div>
            <div className="w-1/3 text-center"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Advice Note</p><div className="mt-1 inline-block border-2 border-slate-800 bg-slate-50 px-5 py-1 text-lg font-black tracking-wider text-slate-800">{currentAdNo}</div></div>
            <div className="w-1/3 text-right text-[10px] text-slate-500"><p>564, Athurugiriya Road, Kottawa.</p><p>Tel: 011 278 1525</p><div className="mt-3 flex items-center justify-end gap-2"><span className="text-xs font-bold">Date:</span><input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} className="border-b border-slate-400 bg-transparent text-sm font-semibold outline-none focus:border-blue-600" /></div></div>
          </div>

          <div className="border-b border-slate-300 bg-blue-50/30 p-5 space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-1"><label className="block text-[10px] font-bold uppercase tracking-wide text-slate-600">Style <span className="text-red-500">*</span></label>
                <select value={selectedStoreInId} onChange={(e) => { setSelectedStoreInId(e.target.value); setSelectedCutNo(''); setSelectedComponent(''); if (!editingId) { setBundleRows([]); setAddedCutNos([]); } }} disabled={!!editingId} className={`w-full rounded border bg-white px-3 py-2 text-sm outline-none ${errors.storeInRecordId ? 'border-red-400 bg-red-50' : 'border-slate-300 focus:ring-2 focus:ring-blue-500'} ${editingId ? 'cursor-not-allowed bg-slate-100' : ''}`}>
                  <option value="">Select style...</option>
                  {eligibleDispatchItems.map((item) => (<option key={item.storeInRecordId} value={item.storeInRecordId}>{item.styleNo} | {item.customerName} | Sch: {item.scheduleNo} | Remaining: {item.remainingDispatchQty}</option>))}
                </select>{errors.storeInRecordId && <p className="text-[11px] text-red-600"><AlertCircle className="mr-1 inline h-3 w-3" />{errors.storeInRecordId}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1"><label className="block text-[10px] font-bold uppercase tracking-wide text-slate-600">Attn <span className="text-red-500">*</span></label><input type="text" value={attn} onChange={(e) => setAttn(e.target.value)} placeholder="Attention to..." className={`w-full rounded border px-3 py-2 text-sm outline-none ${errors.attn ? 'border-red-400 bg-red-50' : 'border-slate-300 focus:ring-2 focus:ring-blue-500'}`} /></div>
                <div className="space-y-1"><label className="block text-[10px] font-bold uppercase tracking-wide text-slate-600">Address <span className="text-red-500">*</span></label><input type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Delivery address..." className={`w-full rounded border px-3 py-2 text-sm outline-none ${errors.address ? 'border-red-400 bg-red-50' : 'border-slate-300 focus:ring-2 focus:ring-blue-500'}`} /></div>
              </div>
            </div>
            {selectedItem && (
              <div className="grid grid-cols-2 gap-x-6 gap-y-1 md:grid-cols-4 text-sm border-t border-blue-200 pt-3">
                <InfoLine label="Customer" value={selectedItem.customerName} /><InfoLine label="Style #" value={selectedItem.styleNo} />
                <InfoLine label="Schedule No" value={selectedItem.scheduleNo} /><InfoLine label="Body Colour" value={selectedItem.bodyColour} />
                <InfoLine label="Print Colour" value={selectedItem.printColour} /><InfoLine label="Components" value={selectedItem.components} />
                <InfoLine label="Total Issue Qty" value={selectedItem.issueQty.toString()} /><InfoLine label="Remaining" value={selectedItem.remainingDispatchQty.toString()} />
              </div>
            )}
          </div>

          {selectedItem && (
            <div className="border-b border-slate-300 bg-orange-50/30 px-5 py-4">
              <div className="flex items-end gap-3 flex-wrap">
                <div className="space-y-1 flex-1 min-w-[180px]"><label className="block text-[10px] font-bold uppercase tracking-wide text-orange-800">Cut No <span className="text-red-500">*</span></label>
                  <select value={selectedCutNo} onChange={(e) => {
                    const cutNo = e.target.value;
                    setSelectedCutNo(cutNo);
                    // Auto-fill the component from the cut's Part (locked by QC in CPI)
                    const matchedCut = selectedItem?.cuts.find((c) => c.cutNo === cutNo);
                    setSelectedComponent(matchedCut?.part || '');
                  }} className={`w-full rounded border bg-white px-3 py-2 text-sm outline-none ${errors.cutNo ? 'border-red-400 bg-red-50' : 'border-slate-300 focus:ring-2 focus:ring-orange-500'}`}>
                    <option value="">Select cut...</option>{availableCuts.map((c) => (<option key={c.cutNo} value={c.cutNo}>{c.cutNo} — Qty: {c.cutQty} — {c.bundles.length} bundle(s)</option>))}
                  </select></div>
                <div className="space-y-1 flex-1 min-w-[180px]"><label className="block text-[10px] font-bold uppercase tracking-wide text-orange-800">Component <span className="text-[9px] font-normal text-slate-400">(from QC)</span></label>
                  <div
                    className={`w-full rounded border px-3 py-2 text-sm font-bold outline-none ${
                      selectedComponent
                        ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                        : errors.component
                        ? 'border-red-400 bg-red-50 text-red-500'
                        : 'border-slate-300 bg-slate-50 text-slate-400'
                    }`}
                    title="Locked by QC inspection — auto-filled from the selected cut"
                  >
                    {selectedComponent || (selectedCutNo ? 'No component set by QC for this cut' : '—')}
                  </div>
                </div>
                <button type="button" onClick={handleAddCut} disabled={!selectedCutNo || !selectedComponent} className="inline-flex items-center gap-1 rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-orange-700 disabled:opacity-40 transition-colors"><Plus className="h-4 w-4" /> Add Cut</button>
              </div>
              {addedCutNos.length > 0 && (<div className="flex gap-2 mt-3 flex-wrap">{addedCutNos.map((cn) => (<span key={cn} className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-3 py-1 text-xs font-bold text-orange-800">{cn}<button type="button" onClick={() => handleRemoveCut(cn)} className="hover:text-red-600 transition-colors"><X className="h-3 w-3" /></button></span>))}</div>)}
              {errors.cuts && <p className="mt-2 text-[11px] text-red-600"><AlertCircle className="mr-1 inline h-3 w-3" />{errors.cuts}</p>}
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead><tr className="bg-slate-800 text-white"><th className="w-10 border-r border-slate-600 px-2 py-2.5 text-center font-bold">#</th><th className="w-24 border-r border-slate-600 px-2 py-2.5 text-center font-bold">COLOUR</th><th className="w-24 border-r border-slate-600 px-2 py-2.5 text-center font-bold">BUN NO.</th><th className="w-20 border-r border-slate-600 px-2 py-2.5 text-center font-bold">SIZE</th><th className="w-24 border-r border-slate-600 px-2 py-2.5 text-center font-bold">CUT FORM</th><th className="w-24 border-r border-slate-600 px-2 py-2.5 text-center font-bold">COMPONENT</th><th className="w-24 border-r border-slate-600 px-2 py-2.5 text-center font-bold">TOTAL PCS</th><th className="w-16 border-r border-slate-600 bg-red-900 px-2 py-2.5 text-center font-bold">P/D</th><th className="w-16 border-r border-slate-600 bg-red-900 px-2 py-2.5 text-center font-bold">F/D</th><th className="w-24 bg-emerald-900 px-2 py-2.5 text-center font-bold">GOOD QTY</th></tr></thead>
              <tbody className="divide-y divide-slate-200">
                {bundleRows.length > 0 ? (<>
                  {bundleRows.map((row, idx) => (<tr key={idx} className="hover:bg-blue-50/30"><td className="border-r border-slate-200 px-2 py-1.5 text-center text-xs font-medium text-slate-500">{String(idx + 1).padStart(2, '0')}</td><td className="border-r border-slate-200 px-2 py-1.5 text-center text-xs">{row.colour}</td><td className="border-r border-slate-200 px-2 py-1.5 text-center text-xs font-bold">{row.bundleNo}</td><td className="border-r border-slate-200 px-2 py-1.5 text-center text-xs">{row.size}</td><td className="border-r border-slate-200 px-2 py-1.5 text-center text-xs">{row.cutForm}</td><td className="border-r border-slate-200 px-2 py-1.5 text-center text-xs font-semibold text-emerald-700">{row.component || '-'}</td><td className="border-r border-slate-200 px-2 py-1.5 text-center font-bold">{row.totalPcs}</td><td className="border-r border-slate-200 p-0"><input type="number" value={row.pd || ''} onChange={(e) => updateBundleRow(idx, 'pd', e.target.value)} className="w-full bg-transparent py-1.5 text-center text-sm font-semibold text-red-700 outline-none focus:bg-red-50" placeholder="-" /></td><td className="border-r border-slate-200 p-0"><input type="number" value={row.fd || ''} onChange={(e) => updateBundleRow(idx, 'fd', e.target.value)} className="w-full bg-transparent py-1.5 text-center text-sm font-semibold text-red-700 outline-none focus:bg-red-50" placeholder="-" /></td><td className="bg-emerald-50/30 px-2 py-1.5 text-center font-black text-emerald-700">{row.goodQty}</td></tr>))}
                  <tr className="border-t-2 border-slate-800 bg-slate-100 font-bold"><td colSpan={6} className="border-r border-slate-300 px-4 py-2 text-right text-xs uppercase tracking-wide text-slate-600">Totals</td><td className="border-r border-slate-300 px-2 py-2 text-center font-black">{totalPcs}</td><td className="border-r border-slate-300 px-2 py-2 text-center font-black text-red-700">{totalPd || '-'}</td><td className="border-r border-slate-300 px-2 py-2 text-center font-black text-red-700">{totalFd || '-'}</td><td className="bg-emerald-50 px-2 py-2 text-center font-black text-emerald-700">{totalGood}</td></tr>
                </>) : (<tr><td colSpan={10} className="py-12 text-center text-slate-400">Select a style and add cuts to build the dispatch table.</td></tr>)}
              </tbody>
            </table>
          </div>

          <div className="border-t border-slate-300 px-5 py-3"><label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1">Remarks</label><input type="text" value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Any remarks..." className="w-full border-b border-slate-300 bg-transparent pb-1 text-sm outline-none focus:border-blue-600" /></div>

          <div className="border-t-2 border-slate-800 bg-slate-50 p-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3 mb-4">
              <div className="space-y-1"><label className="block text-[10px] font-bold uppercase tracking-wide text-slate-600">Received by</label><input type="text" value={receivedByName} onChange={(e) => setReceivedByName(e.target.value)} className="w-full border-b border-slate-400 bg-transparent pb-1 text-sm outline-none focus:border-blue-600" /></div>
              <div className="space-y-1"><label className="block text-[10px] font-bold uppercase tracking-wide text-slate-600">Prep. & Checked by</label><input type="text" value={prepByName} onChange={(e) => setPrepByName(e.target.value)} className="w-full border-b border-slate-400 bg-transparent pb-1 text-sm outline-none focus:border-blue-600" /></div>
              <div className="space-y-1"><label className="block text-[10px] font-bold uppercase tracking-wide text-slate-600">Authorized by</label><input type="text" value={authByName} onChange={(e) => setAuthByName(e.target.value)} className="w-full border-b border-slate-400 bg-transparent pb-1 text-sm outline-none focus:border-blue-600" /></div>
            </div>
            <div className="flex items-center gap-3">
              <button type="submit" disabled={isSaving} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors disabled:opacity-50"><Save className="h-4 w-4" />{isSaving ? 'Saving...' : editingId ? 'Update' : 'Save Advice Note'}</button>
              {bundleRows.length > 0 && (<button type="button" onClick={() => printAdviceNote(buildPrintData())} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"><Printer className="h-4 w-4" /> Print</button>)}
              {editingId && (<button type="button" onClick={resetForm} className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors">Cancel</button>)}
            </div>
          </div>
        </form>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50 px-6 py-4 space-y-3"><h3 className="text-lg font-semibold text-slate-800">Advice Notes</h3><PaginationControls search={notesPagination.search} onSearchChange={notesPagination.setSearch} currentPage={notesPagination.currentPage} totalPages={notesPagination.totalPages} totalFiltered={notesPagination.totalFiltered} totalAll={notesPagination.totalAll} onPageChange={notesPagination.goToPage} hasNext={notesPagination.hasNext} hasPrev={notesPagination.hasPrev} placeholder="Search by style, customer, schedule, AD..." /></div>
        {adviceNotes.length === 0 ? (<div className="py-16 text-center text-slate-400"><FileText className="mx-auto mb-3 h-12 w-12 opacity-20" /><p>No advice notes yet.</p></div>) : notesPagination.paginated.length === 0 ? (<div className="py-12 text-center text-slate-400">No notes match your search.</div>) : (
          <div className="divide-y divide-slate-100">{notesPagination.paginated.map((note) => {
            const isExp = expandedNoteId === note.id; const nRows = Object.values(note.rows || {});
            return (<div key={note.id}>
              <div className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50/50 cursor-pointer transition-colors" onClick={() => setExpandedNoteId(isExp ? null : note.id)}>
                {isExp ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
                <div className="flex-1"><div className="flex items-center gap-2"><span className="rounded bg-slate-800 px-2 py-0.5 text-xs font-bold text-white">{note.adNo}</span><span className="font-bold text-slate-900">{note.styleNo}</span><span className="text-xs text-slate-500">{note.customerName}</span></div><p className="text-xs text-slate-500 mt-0.5">Date: {note.deliveryDate} | Sch: {note.scheduleNo} | Cuts: {note.cutNo} | Dispatch: {note.dispatchQty}</p></div>
                <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => printAdviceNote(note)} className="rounded p-1.5 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 transition-colors" title="Print"><Printer className="h-4 w-4" /></button>
                  <button onClick={() => handleEdit(note)} className="rounded p-1.5 text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-colors" title="Edit"><Edit2 className="h-4 w-4" /></button>
                  <button onClick={() => handleDelete(note.id)} className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors" title="Delete"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
              <AnimatePresence>{isExp && (<motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="border-t border-slate-100 bg-slate-50/50 px-6 py-4 overflow-hidden">
                <table className="w-full text-xs border-collapse"><thead><tr className="text-slate-500 border-b border-slate-200"><th className="py-1 text-left">#</th><th className="py-1 text-left">Colour</th><th className="py-1 text-left">Bundle</th><th className="py-1 text-left">Size</th><th className="py-1 text-left">Cut</th><th className="py-1 text-right">Pcs</th><th className="py-1 text-right">P/D</th><th className="py-1 text-right">F/D</th><th className="py-1 text-right">Good</th></tr></thead>
                <tbody>{nRows.map((r, i) => (<tr key={i} className="border-b border-slate-100"><td className="py-0.5">{i + 1}</td><td className="py-0.5">{r.colour}</td><td className="py-0.5 font-bold">{r.bundleNo}</td><td className="py-0.5">{r.size}</td><td className="py-0.5">{r.cutForm}</td><td className="py-0.5 text-right font-bold">{r.totalPcs}</td><td className="py-0.5 text-right text-red-600">{r.pd || '-'}</td><td className="py-0.5 text-right text-red-600">{r.fd || '-'}</td><td className="py-0.5 text-right font-bold text-emerald-700">{r.goodQty}</td></tr>))}</tbody></table>
              </motion.div>)}</AnimatePresence>
            </div>);
          })}</div>
        )}
      </div>
    </motion.div>
  );
}

function printAdviceNote(note: AdviceNoteRecord) {
  const rows = Object.values(note.rows || {});
  const tP = rows.reduce((s, r) => s + (r.totalPcs || 0), 0), tD = rows.reduce((s, r) => s + (r.pd || 0), 0), tF = rows.reduce((s, r) => s + (r.fd || 0), 0), tG = rows.reduce((s, r) => s + (r.goodQty || 0), 0);
  const mx = Math.max(rows.length + 1, 28);
  let tr = '';
  for (let i = 0; i < mx; i++) { const r = rows[i]; const isT = i === mx - 1;
    if (isT) tr += `<tr class="total-row"><td>${i+1}</td><td colspan="4"></td><td class="bold">${tP}</td><td class="red bold">${tD||''}</td><td class="red bold">${tF||''}</td><td class="bold">${tG}</td></tr>`;
    else if (r) tr += `<tr><td>${String(i+1).padStart(2,'0')}</td><td>${r.colour||''}</td><td>${r.bundleNo||''}</td><td>${r.size||''}</td><td>${r.cutForm||''}</td><td class="bold">${r.totalPcs||''}</td><td class="red">${r.pd||'-'}</td><td class="red">${r.fd||'-'}</td><td class="bold">${r.goodQty||''}</td></tr>`;
    else tr += `<tr><td>${String(i+1).padStart(2,'0')}</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>`;
  }
  const h=`<!DOCTYPE html><html><head><title>AN-${note.adNo}</title><style>@page{size:A4 portrait;margin:10mm}*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;font-size:10px;color:#000}.hdr{display:flex;justify-content:space-between;margin-bottom:4px}.hdr-left h1{font-size:13px;font-weight:900}.hdr-left p{margin:1px 0;font-size:9px}.hdr-right{text-align:right;font-size:9px}.ad-block{text-align:center;margin:6px 0}.ad-no{font-size:20px;font-weight:900;border:2px solid #000;padding:2px 16px;display:inline-block}.info .row{display:flex;margin:2px 0}.info .lbl{font-weight:700;min-width:80px}.info .val{border-bottom:1px solid #000;flex:1;min-height:14px;padding:0 4px}table{width:100%;border-collapse:collapse;border:1.5px solid #000;margin-top:4px}th,td{border:0.5px solid #000;padding:2px 4px;font-size:9px;text-align:center;height:18px}th{background:#e0e0e0;font-weight:700}.bold{font-weight:700}.red{color:#c00}.total-row td{border-top:2px solid #000;font-weight:700}.remarks{margin-top:4px;font-size:10px;border-top:1px solid #000;padding-top:4px}.footer{display:flex;justify-content:space-between;margin-top:20px}.footer .sig{flex:1;text-align:center;font-size:10px}.footer .sig .lbl{font-weight:700;font-style:italic;margin-bottom:20px}.footer .sig .line{border-top:1px solid #000;padding-top:2px;margin:0 10px}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style></head><body><div class="hdr"><div class="hdr-left"><h1>COLOUR PLUS PRINTING SYSTEMS (PVT) LTD.</h1><p>SCREEN PRINTERS FOR TEXTILES</p><p>E-mail: colourplus@sitnet.lk</p></div><div class="hdr-right"><p>564, Athurugiriya Road, Kottawa.</p><p>Tel: 011 278 1525</p></div></div><div class="ad-block"><span style="font-size:10px;font-weight:700">AD No:</span> <span class="ad-no">${note.adNo}</span><span style="margin-left:40px;font-size:10px"><b>Date:</b> ${note.deliveryDate}</span></div><div class="info"><div class="row"><span class="lbl">Customer:</span><span class="val">${note.customerName}</span><span class="lbl" style="margin-left:20px">Attn:</span><span class="val">${note.attn}</span></div><div class="row"><span class="lbl">Style #:</span><span class="val">${note.styleNo}</span></div><div class="row"><span class="lbl">Address:</span><span class="val">${note.address}</span></div><div class="row"><span class="lbl">Schedule No:</span><span class="val">${note.scheduleNo}</span></div></div><table><thead><tr><th style="width:24px"></th><th>COLOUR</th><th>BUN NO.</th><th>SIZE</th><th>CUT FORM</th><th>TOTAL PCS</th><th>P/D</th><th>F/D</th><th>GOOD QTY</th></tr></thead><tbody>${tr}</tbody></table><div class="remarks"><b>Remarks.</b> ${note.remarks||''}</div><div class="footer"><div class="sig"><div class="lbl">Received by</div><div class="line">${note.receivedByName||''}</div></div><div class="sig"><div class="lbl">Prep. & Checked by</div><div class="line">${note.prepByName||''}</div></div><div class="sig"><div class="lbl">Authorized by</div><div class="line">${note.authByName||''}</div></div></div></body></html>`;
  const ef=document.getElementById('gatepass-print-frame') as HTMLIFrameElement|null; if(ef) ef.remove();
  const f=document.createElement('iframe'); f.id='gatepass-print-frame'; f.style.cssText='position:fixed;top:-10000px;left:-10000px;width:900px;height:1200px'; document.body.appendChild(f);
  const d=f.contentDocument||f.contentWindow?.document; if(d){d.open();d.write(h);d.close();setTimeout(()=>{f.contentWindow?.print();setTimeout(()=>f.remove(),1000)},300);}
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (<div className="flex items-baseline gap-2"><span className="text-[10px] font-bold uppercase text-slate-400 shrink-0">{label}:</span><span className="text-sm font-medium text-slate-700">{value || '-'}</span></div>);
}