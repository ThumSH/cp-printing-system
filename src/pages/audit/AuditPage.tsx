// src/pages/audit/AuditPage.tsx
import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePaginatedSearch } from '../../hooks/usePaginatedSearch';
import { PaginationControls } from '../../components/PaginatedTable';
import { FileText, Save, Trash2, AlertCircle, Plus, ChevronDown, ChevronRight, CheckCircle2, XCircle } from 'lucide-react';
import { API } from '../../api/client';

const API_BASE = API.AUDIT;
const getHeaders = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` });

// AQL 0.65 Table
function getAqlSampleSize(qty: number): number {
  if (qty <= 1) return qty;
  if (qty >= 2 && qty <= 8) return 3;
  if (qty >= 9 && qty <= 15) return 5;
  if (qty >= 16 && qty <= 25) return 8;
  if (qty >= 26 && qty <= 50) return 13;
  if (qty >= 51 && qty <= 90) return 20;
  if (qty >= 91 && qty <= 150) return 32;
  if (qty >= 151 && qty <= 280) return 50;
  if (qty >= 281 && qty <= 500) return 80;
  if (qty >= 501 && qty <= 1200) return 125;
  if (qty >= 1201 && qty <= 3200) return 200;
  if (qty >= 3201 && qty <= 10000) return 315;
  if (qty >= 10001 && qty <= 35000) return 500;
  if (qty >= 35001 && qty <= 150000) return 800;
  if (qty >= 150001 && qty <= 500000) return 1250;
  if (qty >= 500001) return 2000;
  return 0;
}

interface BundleInfo { id: string; bundleNo: string; bundleQty: number; size: string; numberRange: string; }
interface CutInfo { id: string; cutNo: string; cutQty: number; bundles: BundleInfo[]; }
interface EligibleItem { id: string; submissionId: string; revisionNo: number; styleNo: string; customerName: string; scheduleNo: string; bodyColour: string; cuts: CutInfo[]; }
interface StagingRow { tempId: string; storeInRecordId: string; date: string; styleNo: string; scheduleNo: string; colour: string; cutNo: string; sizes: string; selectedBundles: { bundleNo: string; size: string; qty: number }[]; releaseQty: number; auditQty: number; status: string; }
interface AuditRecord { id: string; storeInRecordId: string; date: string; styleNo: string; customerName: string; scheduleNo: string; colour: string; cutNo: string; sizes: string; bundles: { bundleNo: string; size: string; qty: number }[]; releaseQty: number; auditQty: number; status: string; auditorName: string; remarks: string; }

export default function AuditPage() {
  const [eligibleItems, setEligibleItems] = useState<EligibleItem[]>([]);
  const [auditRecords, setAuditRecords] = useState<AuditRecord[]>([]);
  const [selectedStoreInId, setSelectedStoreInId] = useState('');
  const [selectedCutNo, setSelectedCutNo] = useState('');
  const [selectedBundleIds, setSelectedBundleIds] = useState<Set<string>>(new Set());
  const [stagingRows, setStagingRows] = useState<StagingRow[]>([]);
  const [auditorName, setAuditorName] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pageError, setPageError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const auditPagination = usePaginatedSearch({ data: auditRecords, searchFields: ['styleNo' as any, 'customerName' as any, 'cutNo' as any, 'scheduleNo' as any], pageSize: 25 });

  const fetchData = async () => {
    try {
      const [eligRes, recRes] = await Promise.all([
        fetch(`${API_BASE}/eligible`, { headers: getHeaders() }),
        fetch(`${API_BASE}/records`, { headers: getHeaders() }),
      ]);
      if (eligRes.ok) setEligibleItems(await eligRes.json());
      if (recRes.ok) setAuditRecords(await recRes.json());
    } catch (e) { setPageError('Failed to load audit data.'); }
  };

  useEffect(() => { fetchData(); }, []);

  const selectedItem = useMemo(() => eligibleItems.find((i) => i.id === selectedStoreInId) || null, [eligibleItems, selectedStoreInId]);

  // Get bundle IDs that are already audited (from saved records)
  const auditedBundleNos = useMemo(() => {
    const audited = new Map<string, Set<string>>(); // storeInId+cutNo -> set of bundleNos
    auditRecords.forEach((r) => {
      const key = `${r.storeInRecordId}|${r.cutNo}`;
      if (!audited.has(key)) audited.set(key, new Set());
      r.bundles?.forEach((b) => audited.get(key)!.add(b.bundleNo));
    });
    // Also include staged bundles
    stagingRows.forEach((r) => {
      const key = `${r.storeInRecordId}|${r.cutNo}`;
      if (!audited.has(key)) audited.set(key, new Set());
      r.selectedBundles?.forEach((b) => audited.get(key)!.add(b.bundleNo));
    });
    return audited;
  }, [auditRecords, stagingRows]);

  // Show cuts that still have unaudited bundles (don't hide the whole cut)
  const availableCuts = useMemo(() => {
    if (!selectedItem) return [];
    return selectedItem.cuts.filter((c) => {
      const key = `${selectedStoreInId}|${c.cutNo}`;
      const auditedSet = auditedBundleNos.get(key) || new Set();
      // Show this cut if it has any unaudited bundles
      return c.bundles.some((b) => !auditedSet.has(b.bundleNo));
    });
  }, [selectedItem, auditedBundleNos, selectedStoreInId]);

  const selectedCut = useMemo(() => availableCuts.find((c) => c.cutNo === selectedCutNo) || null, [availableCuts, selectedCutNo]);

  // Only show unaudited bundles for the selected cut
  const bundles = useMemo(() => {
    if (!selectedCut) return [];
    const key = `${selectedStoreInId}|${selectedCut.cutNo}`;
    const auditedSet = auditedBundleNos.get(key) || new Set();
    return selectedCut.bundles.filter((b) => !auditedSet.has(b.bundleNo));
  }, [selectedCut, auditedBundleNos, selectedStoreInId]);

  // Unique styles for the dropdown
  const styleOptions = useMemo(() => {
    const map = new Map<string, EligibleItem>();
    eligibleItems.forEach((i) => { if (!map.has(i.styleNo)) map.set(i.styleNo, i); });
    return [...map.values()];
  }, [eligibleItems]);

  // Schedules for selected style
  const scheduleOptions = useMemo(() => {
    if (!selectedItem) return [];
    return eligibleItems.filter((i) => i.styleNo === selectedItem.styleNo);
  }, [eligibleItems, selectedItem]);

  // Selected bundles total — AQL always 32 (fixed at 91-150 range)
  const selectedBundles = bundles.filter((b) => selectedBundleIds.has(b.id));
  const releaseQty = selectedBundles.reduce((s, b) => s + b.bundleQty, 0);
  const auditQty = 32; // Always 32 — AQL 0.65, range 91-150
  const isInRange = releaseQty >= 91 && releaseQty <= 150;
  const isTooLow = releaseQty > 0 && releaseQty < 91;
  const isTooHigh = releaseQty > 150;

  // Calculate remaining qty after current selection (to check if leftovers can form valid groups)
  const remainingBundles = bundles.filter((b) => !selectedBundleIds.has(b.id));
  const remainingQty = remainingBundles.reduce((s, b) => s + b.bundleQty, 0);
  const allSelected = remainingBundles.length === 0;

  const toggleBundle = (id: string) => {
    setSelectedBundleIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleAddToTable = () => {
    if (selectedBundles.length === 0) { setErrors({ bundles: 'Select at least one bundle' }); return; }

    if (releaseQty < 91) {
      // Allow if these are the LAST remaining bundles (total of all unaudited < 91)
      const totalUnaudited = bundles.reduce((s, b) => s + b.bundleQty, 0);
      if (totalUnaudited > 150 || !allSelected) {
        setErrors({ bundles: `Release Qty must be between 91-150. Currently: ${releaseQty}. Select more bundles.` });
        return;
      }
      // If all remaining bundles total < 91, allow it (last group)
    }

    if (releaseQty > 150) {
      setErrors({ bundles: `Release Qty must be between 91-150. Currently: ${releaseQty}. Deselect some bundles.` });
      return;
    }

    const sizes = [...new Set(selectedBundles.map((b) => b.size))].join(', ');
    const newRow: StagingRow = {
      tempId: crypto.randomUUID(),
      storeInRecordId: selectedStoreInId,
      date,
      styleNo: selectedItem?.styleNo ?? '',
      scheduleNo: selectedItem?.scheduleNo ?? '',
      colour: selectedItem?.bodyColour ?? '',
      cutNo: selectedCutNo,
      sizes,
      selectedBundles: selectedBundles.map((b) => ({ bundleNo: b.bundleNo, size: b.size, qty: b.bundleQty })),
      releaseQty,
      auditQty,
      status: 'Pass',
    };

    setStagingRows((prev) => [...prev, newRow]);
    setSelectedBundleIds(new Set());
    setSelectedCutNo('');
    setErrors({});
  };

  const removeStagingRow = (tempId: string) => { setStagingRows((prev) => prev.filter((r) => r.tempId !== tempId)); };

  const updateStagingStatus = (tempId: string, status: string) => {
    setStagingRows((prev) => prev.map((r) => r.tempId === tempId ? { ...r, status } : r));
  };

  const handleSubmit = async () => {
    if (stagingRows.length === 0) { setPageError('Add at least one audit row.'); return; }
    if (!auditorName.trim()) { setErrors({ auditor: 'Auditor name is required' }); return; }

    setIsSaving(true); setPageError('');
    try {
      const records = stagingRows.map((r) => ({
        storeInRecordId: r.storeInRecordId,
        date: r.date,
        styleNo: r.styleNo,
        scheduleNo: r.scheduleNo,
        colour: r.colour,
        cutNo: r.cutNo,
        sizes: r.sizes,
        bundles: r.selectedBundles,
        releaseQty: r.releaseQty,
        auditQty: r.auditQty,
        status: r.status,
        auditorName,
        remarks: '',
      }));

      const res = await fetch(`${API_BASE}/records/batch`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(records) });
      if (!res.ok) throw new Error(await res.text());

      setStagingRows([]); setAuditorName(''); setSelectedStoreInId(''); setSelectedCutNo('');
      await fetchData();
    } catch (e) { setPageError(e instanceof Error ? e.message : 'Failed to save.'); }
    finally { setIsSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this audit record?')) return;
    try {
      await fetch(`${API_BASE}/records/${id}`, { method: 'DELETE', headers: getHeaders() });
      await fetchData();
    } catch (e) { setPageError('Failed to delete.'); }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-6xl space-y-6 pb-12">
      <div className="flex items-center space-x-3 border-b border-slate-200 pb-4">
        <div className="rounded-lg bg-purple-100 p-2"><FileText className="h-6 w-6 text-purple-700" /></div>
        <div><h2 className="text-2xl font-bold text-slate-900">Audit Reports</h2><p className="text-sm text-slate-500">Select bundles, AQL 0.65 sample size auto-calculates.</p></div>
      </div>

      {pageError && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{pageError}</div>}

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
        {/* Selection */}
        <div className="rounded-lg border border-purple-200 bg-purple-50/50 p-5 space-y-4">
          <h4 className="border-b border-purple-200 pb-2 text-sm font-bold uppercase tracking-wider text-purple-800">Select Style & Cut</h4>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-600">Style No *</label>
              <select value={selectedStoreInId} onChange={(e) => { setSelectedStoreInId(e.target.value); setSelectedCutNo(''); setSelectedBundleIds(new Set()); }}
                className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500">
                <option value="">Select style...</option>
                {eligibleItems.map((item) => (<option key={item.id} value={item.id}>{item.styleNo} | {item.customerName} | {item.scheduleNo}</option>))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-600">Colour</label>
              <div className="rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">{selectedItem?.bodyColour || '-'}</div>
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-600">Schedule No</label>
              <div className="rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">{selectedItem?.scheduleNo || '-'}</div>
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-600">Cut No *</label>
              <select value={selectedCutNo} onChange={(e) => { setSelectedCutNo(e.target.value); setSelectedBundleIds(new Set()); }}
                className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500">
                <option value="">Select cut...</option>
                {availableCuts.map((c) => {
                  const key = `${selectedStoreInId}|${c.cutNo}`;
                  const auditedSet = auditedBundleNos.get(key) || new Set();
                  const remaining = c.bundles.filter((b) => !auditedSet.has(b.bundleNo)).length;
                  const totalBundles = c.bundles.length;
                  return (<option key={c.cutNo} value={c.cutNo}>{c.cutNo} — {remaining} of {totalBundles} bundles remaining</option>);
                })}
              </select>
            </div>
          </div>
        </div>

        {/* Bundle selection table */}
        {selectedCut && bundles.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-slate-700">Select bundles for audit (check the rows):</h4>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-100 text-xs font-semibold text-slate-600">
                  <th className="px-3 py-2 text-center w-10"><input type="checkbox" onChange={(e) => { if (e.target.checked) setSelectedBundleIds(new Set(bundles.map(b=>b.id))); else setSelectedBundleIds(new Set()); }} checked={selectedBundleIds.size === bundles.length && bundles.length > 0} className="rounded" /></th>
                  <th className="px-3 py-2 text-left">Bundle No</th>
                  <th className="px-3 py-2 text-left">Size</th>
                  <th className="px-3 py-2 text-right">Qty</th>
                  <th className="px-3 py-2 text-left">Range</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bundles.map((b) => (
                  <tr key={b.id} className={`cursor-pointer transition-colors ${selectedBundleIds.has(b.id) ? 'bg-purple-50' : 'hover:bg-slate-50'}`} onClick={() => toggleBundle(b.id)}>
                    <td className="px-3 py-2 text-center"><input type="checkbox" checked={selectedBundleIds.has(b.id)} onChange={() => toggleBundle(b.id)} className="rounded" /></td>
                    <td className="px-3 py-2 font-bold">{b.bundleNo}</td>
                    <td className="px-3 py-2">{b.size}</td>
                    <td className="px-3 py-2 text-right font-bold">{b.bundleQty}</td>
                    <td className="px-3 py-2 text-slate-500">{b.numberRange}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* AQL display + range validation */}
            <div className={`flex flex-col gap-2 rounded-lg border px-5 py-3 ${isInRange || allSelected ? 'border-emerald-200 bg-emerald-50' : isTooHigh ? 'border-red-200 bg-red-50' : 'border-purple-200 bg-purple-50'}`}>
              <div className="flex items-center gap-6">
                <div><span className="text-xs text-slate-500">Selected:</span> <span className="font-bold text-purple-800">{selectedBundles.length}</span></div>
                <div><span className="text-xs text-slate-500">Release Qty:</span> <span className={`text-lg font-black ${isInRange || allSelected ? 'text-emerald-700' : isTooHigh ? 'text-red-700' : 'text-amber-700'}`}>{releaseQty}</span></div>
                <div><span className="text-xs text-slate-500">Required range:</span> <span className="text-sm font-bold text-slate-700">91 — 150</span></div>
                <div><span className="text-xs text-slate-500">AQL 0.65 Sample:</span> <span className="text-lg font-black text-indigo-700">{auditQty}</span></div>
                <button type="button" onClick={handleAddToTable} disabled={selectedBundles.length === 0 || isTooHigh}
                  className="ml-auto inline-flex items-center gap-1 rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-purple-700 disabled:opacity-40 transition-colors">
                  <Plus className="h-4 w-4" /> Add to Audit Table
                </button>
              </div>
              {/* Status messages */}
              {isTooLow && !allSelected && (
                <p className="text-xs text-amber-700 font-medium">⚠ Release Qty is below 91. Select more bundles to reach 91-150 range.</p>
              )}
              {isTooLow && allSelected && (
                <p className="text-xs text-emerald-700 font-medium">✓ Last group — all remaining bundles selected ({releaseQty} pcs). Allowed.</p>
              )}
              {isTooHigh && (
                <p className="text-xs text-red-700 font-medium">✗ Release Qty exceeds 150. Deselect some bundles.</p>
              )}
              {isInRange && (
                <p className="text-xs text-emerald-700 font-medium">✓ Within 91-150 range. Ready to add.</p>
              )}
              {remainingBundles.length > 0 && (
                <p className="text-xs text-slate-500">Remaining after this selection: {remainingBundles.length} bundle(s), {remainingQty} pcs</p>
              )}
            </div>
            {errors.bundles && <p className="text-[11px] text-red-600"><AlertCircle className="mr-1 inline h-3 w-3" />{errors.bundles}</p>}
          </div>
        )}

        {/* Staging table */}
        {stagingRows.length > 0 && (
          <div className="rounded-lg border border-slate-200 overflow-hidden">
            <div className="bg-slate-800 px-4 py-2.5 text-sm font-bold text-white">Audit Staging — {stagingRows.length} row(s)</div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-xs font-semibold text-slate-600 border-b border-slate-200">
                    <th className="px-3 py-2 text-left">Date</th>
                    <th className="px-3 py-2 text-left">Style No</th>
                    <th className="px-3 py-2 text-left">Schedule</th>
                    <th className="px-3 py-2 text-left">Colour</th>
                    <th className="px-3 py-2 text-left">Cut No</th>
                    <th className="px-3 py-2 text-left">Sizes</th>
                    <th className="px-3 py-2 text-right">Release Qty</th>
                    <th className="px-3 py-2 text-right">Audit Qty</th>
                    <th className="px-3 py-2 text-center">Pass/Fail</th>
                    <th className="px-3 py-2 text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {stagingRows.map((row) => (
                    <tr key={row.tempId}>
                      <td className="px-3 py-2">{row.date}</td>
                      <td className="px-3 py-2 font-bold">{row.styleNo}</td>
                      <td className="px-3 py-2">{row.scheduleNo}</td>
                      <td className="px-3 py-2">{row.colour}</td>
                      <td className="px-3 py-2 font-bold">{row.cutNo}</td>
                      <td className="px-3 py-2">{row.sizes}</td>
                      <td className="px-3 py-2 text-right font-bold">{row.releaseQty}</td>
                      <td className="px-3 py-2 text-right font-bold text-indigo-700">{row.auditQty}</td>
                      <td className="px-3 py-2 text-center">
                        <select value={row.status} onChange={(e) => updateStagingStatus(row.tempId, e.target.value)}
                          className={`rounded border px-2 py-1 text-xs font-bold outline-none ${row.status === 'Pass' ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : row.status === 'Fail' ? 'border-red-300 bg-red-50 text-red-700' : 'border-slate-300 text-slate-600'}`}>
                          <option value="Pass">Pass</option>
                          <option value="Fail">Fail</option>
                        </select>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button onClick={() => removeStagingRow(row.tempId)} className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"><Trash2 className="h-4 w-4" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="border-t border-slate-200 bg-slate-50 px-4 py-3 flex items-end gap-4">
              <div className="flex-1 max-w-xs space-y-1">
                <label className="block text-xs font-bold text-slate-600">Auditor Name *</label>
                <input type="text" value={auditorName} onChange={(e) => setAuditorName(e.target.value)} placeholder="Auditor name"
                  className={`w-full rounded border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500 ${errors.auditor ? 'border-red-400 bg-red-50' : 'border-slate-300'}`} />
              </div>
              <button onClick={handleSubmit} disabled={isSaving}
                className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-purple-700 transition-colors disabled:opacity-50">
                <Save className="h-4 w-4" />{isSaving ? 'Saving...' : 'Submit All'}
              </button>
              <button onClick={() => setStagingRows([])} className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors">Clear</button>
            </div>
          </div>
        )}
      </div>

      {/* Existing records */}
      {auditRecords.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-slate-200 bg-slate-50 px-6 py-4 space-y-3">
            <h3 className="text-lg font-semibold text-slate-800">Audit Records</h3>
            <PaginationControls search={auditPagination.search} onSearchChange={auditPagination.setSearch} currentPage={auditPagination.currentPage} totalPages={auditPagination.totalPages} totalFiltered={auditPagination.totalFiltered} totalAll={auditPagination.totalAll} onPageChange={auditPagination.goToPage} hasNext={auditPagination.hasNext} hasPrev={auditPagination.hasPrev} placeholder="Search by style, customer, cut, schedule..." />
          </div>
          <div className="divide-y divide-slate-100">
            {auditPagination.paginated.map((rec) => {
              const isExp = expandedId === rec.id;
              return (
                <div key={rec.id}>
                  <div className="flex items-center gap-4 px-6 py-3 hover:bg-slate-50/50 cursor-pointer transition-colors" onClick={() => setExpandedId(isExp ? null : rec.id)}>
                    {isExp ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{rec.styleNo}</span>
                        <span className="text-xs text-slate-500">{rec.customerName}</span>
                        <span className="text-xs text-slate-500">Cut: {rec.cutNo}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${rec.status === 'Pass' ? 'bg-emerald-100 text-emerald-700' : rec.status === 'Fail' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                          {rec.status === 'Pass' ? <CheckCircle2 className="inline h-3 w-3 mr-0.5" /> : rec.status === 'Fail' ? <XCircle className="inline h-3 w-3 mr-0.5" /> : null}{rec.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">Date: {rec.date} | Sch: {rec.scheduleNo} | Release: {rec.releaseQty} | Audit: {rec.auditQty} | Auditor: {rec.auditorName}</p>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(rec.id); }} className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"><Trash2 className="h-4 w-4" /></button>
                  </div>
                  <AnimatePresence>{isExp && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="border-t border-slate-100 bg-slate-50/50 px-6 py-3 overflow-hidden">
                      <p className="text-xs text-slate-500 mb-2">Selected bundles:</p>
                      <div className="flex gap-2 flex-wrap">{(rec.bundles || []).map((b, i) => (<span key={i} className="rounded bg-purple-100 px-2 py-1 text-xs font-medium text-purple-800">{b.bundleNo} ({b.size}) — {b.qty}</span>))}</div>
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