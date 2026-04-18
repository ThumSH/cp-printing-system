// src/pages/qc/CPIPage.tsx
import { useState, useEffect, useMemo } from 'react';
import { useAutoDraft } from '../../hooks/useAutoDraft';
import DraftRestoredToast from '../../components/DraftRestoredToast';
import { usePaginatedSearch } from '../../hooks/usePaginatedSearch';
import { PaginationControls } from '../../components/PaginatedTable';
import { motion, AnimatePresence } from 'framer-motion';
import { API } from '../../api/client';
import {
  ClipboardList,
  Save,
  Edit2,
  Trash2,
  Lock,
  AlertCircle,
  Plus,
  ChevronDown,
  ChevronRight,
  Printer,
} from 'lucide-react';
import {
  useQCStore,
  CPIReport,
  CpiCutInspection,
  CpiDefectRow,
  EligibleCpiItem,
  CpiCutInfo,
  InspectionStatus,
  DEFECT_TYPES,
  createEmptyDefectRows,
} from '../../store/qcStore';

export default function CPIPage() {
  const {
    cpiReports,
    eligibleCpiItems,
    fetchReports,
    fetchEligibleCpiItems,
    addCPIReport,
    updateCPIReport,
    deleteCPIReport,
  } = useQCStore();

  // --- Header state ---
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedStoreInId, setSelectedStoreInId] = useState('');
  const [selectedCutNo, setSelectedCutNo] = useState('');

  // --- Accumulated cut inspections ---
  const [cutInspections, setCutInspections] = useState<CpiCutInspection[]>([]);

  // --- Footer state ---
  const [inspectionStatus, setInspectionStatus] = useState<InspectionStatus>('Pending');
  const [appRej, setAppRej] = useState('');
  const [checkedBy, setCheckedBy] = useState('');
  const [summaryDate, setSummaryDate] = useState(new Date().toISOString().split('T')[0]);
  const [cpiAuditor, setCpiAuditor] = useState('');

  // --- UI ---
  const [editingId, setEditingId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pageError, setPageError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [expandedReportId, setExpandedReportId] = useState<string | null>(null);
  // --- Auto-draft: save form to localStorage, restore on reload ---
  const cpiDraftState = useMemo(() => ({
    date, selectedStoreInId, selectedCutNo, cutInspections,
    inspectionStatus, appRej, checkedBy, summaryDate, cpiAuditor,
  }), [date, selectedStoreInId, selectedCutNo, cutInspections,
       inspectionStatus, appRej, checkedBy, summaryDate, cpiAuditor]);

  const { draftRestored, clearDraft, dismissDraftNotice } = useAutoDraft(
    'cpi-form',
    cpiDraftState,
    (saved) => {
      if (saved.date) setDate(saved.date);
      if (saved.selectedStoreInId) setSelectedStoreInId(saved.selectedStoreInId);
      if (saved.selectedCutNo) setSelectedCutNo(saved.selectedCutNo);
      if (saved.cutInspections) setCutInspections(saved.cutInspections);
      if (saved.inspectionStatus) setInspectionStatus(saved.inspectionStatus);
      if (saved.appRej) setAppRej(saved.appRej);
      if (saved.checkedBy) setCheckedBy(saved.checkedBy);
      if (saved.summaryDate) setSummaryDate(saved.summaryDate);
      if (saved.cpiAuditor) setCpiAuditor(saved.cpiAuditor);
    }
  );

  const cpiPagination = usePaginatedSearch({ data: cpiReports, searchFields: ["styleNo" as keyof CPIReport, "customer" as keyof CPIReport, "scheduleNo" as keyof CPIReport], pageSize: 25 });
  const [cpiLocks, setCpiLocks] = useState<Record<string, { isLocked: boolean }>>({});

  useEffect(() => {
    const load = async () => {
      try {
        await Promise.all([fetchReports(), fetchEligibleCpiItems()]);
        const lockRes = await fetch(`${API.QC}/reports/locks`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        if (lockRes.ok) setCpiLocks(await lockRes.json());
      } catch (e) {
        setPageError(e instanceof Error ? e.message : 'Failed to load QC data.');
      }
    };
    load();
  }, [fetchReports, fetchEligibleCpiItems]);

  // --- Selected eligible item ---
  const selectedItem = useMemo(
    () => eligibleCpiItems.find((i) => i.storeInRecordId === selectedStoreInId) || null,
    [eligibleCpiItems, selectedStoreInId]
  );

  // --- Available cuts for dropdown ---
  const availableCuts: CpiCutInfo[] = selectedItem?.cuts ?? [];

  // --- Currently selected cut info ---
  const selectedCut = useMemo(
    () => availableCuts.find((c) => c.cutNo === selectedCutNo) || null,
    [availableCuts, selectedCutNo]
  );

  // --- Components for part dropdown ---
  const componentsList = useMemo(() => {
    if (!selectedItem?.components) return [];
    return selectedItem.components
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean);
  }, [selectedItem]);

  // --- Computed totals ---
  const receivedQty = selectedItem?.receivedQty ?? 0;
  const cpiQty = cutInspections.reduce((s, ci) => s + ci.cutQty, 0);
  const totalDefected = cutInspections.reduce((s, ci) => s + ci.totalDefectedQty, 0);
  const checkedQty = cpiQty;
  const rejDamageQty = totalDefected;
  const rejectionPct = cpiQty > 0 ? ((totalDefected / cpiQty) * 100).toFixed(2) : '0.00';
  const balanceQty = Math.max(0, receivedQty - cpiQty);

  // --- Add selected cut to inspection ---
  const handleAddCut = () => {
    if (!selectedCut) return;

    // Check if already added
    if (cutInspections.some((ci) => ci.cutNo === selectedCut.cutNo)) {
      setPageError(`Cut ${selectedCut.cutNo} is already added to this report.`);
      return;
    }

    const bundleNos = selectedCut.bundles.map((b) => b.bundleNo).join(', ');
    const sizes = selectedCut.bundles.map((b) => b.size).join(', ');
    const numberRanges = selectedCut.bundles.map((b) => b.numberRange).join(', ');
    const sampleSize = Math.ceil(selectedCut.cutQty * 0.1);

    const newInspection: CpiCutInspection = {
      cutRecordId: '',
      cutNo: selectedCut.cutNo,
      cutQty: selectedCut.cutQty,
      bundleNos,
      sizes,
      numberRanges,
      part: '',
      sampleSize,
      defectRows: createEmptyDefectRows(),
      totalDefectedQty: 0,
      totalPercentage: '0.00',
    };

    setCutInspections((prev) => [...prev, newInspection]);
    setSelectedCutNo('');
    setPageError('');
  };

  // --- Remove a cut from inspection ---
  const handleRemoveCut = (cutNo: string) => {
    setCutInspections((prev) => prev.filter((ci) => ci.cutNo !== cutNo));
  };

  // --- Update defect row value ---
  const updateDefectValue = (
    cutNo: string,
    defectCode: string,
    field: keyof CpiDefectRow,
    value: string
  ) => {
    setCutInspections((prev) =>
      prev.map((ci) => {
        if (ci.cutNo !== cutNo) return ci;

        const updatedRows = ci.defectRows.map((row) => {
          if (row.defectCode !== defectCode) return row;

          const updated = { ...row, [field]: field === 'remarks' ? value : parseFloat(value) || 0 };

          // Recalculate defectedQty
          updated.defectedQty =
            updated.beforeLength + updated.beforeWidth + updated.afterLength + updated.afterWidth;

          // Recalculate percentage against sample size
          updated.percentage =
            ci.sampleSize > 0 ? ((updated.defectedQty / ci.sampleSize) * 100).toFixed(2) : '0.00';

          return updated;
        });

        const totalDef = updatedRows.reduce((s, r) => s + r.defectedQty, 0);

        return {
          ...ci,
          defectRows: updatedRows,
          totalDefectedQty: totalDef,
          totalPercentage: ci.sampleSize > 0 ? ((totalDef / ci.sampleSize) * 100).toFixed(2) : '0.00',
        };
      })
    );
  };

  // --- Update part for a cut ---
  const updateCutPart = (cutNo: string, part: string) => {
    setCutInspections((prev) =>
      prev.map((ci) => (ci.cutNo === cutNo ? { ...ci, part } : ci))
    );
  };

  // --- Reset ---
  const resetForm = () => {
    setDate(new Date().toISOString().split('T')[0]);
    setSelectedStoreInId('');
    setSelectedCutNo('');
    setCutInspections([]);
    setInspectionStatus('Pending');
    setAppRej('');
    setCheckedBy('');
    setSummaryDate(new Date().toISOString().split('T')[0]);
    setCpiAuditor('');
    setEditingId(null);
    setErrors({});
    setPageError('');
    clearDraft();
  };

  // --- Submit ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!selectedStoreInId) newErrors.storeInRecordId = 'Select a Store-In record';
    if (!date) newErrors.date = 'Date is required';
    if (cutInspections.length === 0) newErrors.cuts = 'Add at least one cut inspection';
    if (!cpiAuditor.trim()) newErrors.cpiAuditor = 'CPI Auditor is required';

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setIsSaving(true);
    setPageError('');

    try {
      const report: CPIReport = {
        id: editingId || '',
        storeInRecordId: selectedStoreInId,
        submissionId: '',
        revisionNo: selectedItem?.revisionNo ?? 1,
        date,
        customer: selectedItem?.customerName ?? '',
        styleNo: selectedItem?.styleNo ?? '',
        scheduleNo: selectedItem?.scheduleNo ?? '',
        bodyColour: selectedItem?.bodyColour ?? '',
        printColour: selectedItem?.printColour ?? '',
        receivedQty,
        cpiQty,
        cutInspections,
        cuttingQty: receivedQty,
        checkedQty,
        rejDamageQty,
        rejectionPercentage: rejectionPct,
        balanceQty,
        inspectionStatus,
        appRej,
        checkedBy,
        summaryDate,
        cpiAuditor,
      };

      if (editingId) {
        await updateCPIReport(editingId, report);
      } else {
        await addCPIReport(report);
      }

      resetForm();
      await Promise.all([fetchReports(), fetchEligibleCpiItems()]);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Failed to save CPI report.');
    } finally {
      setIsSaving(false);
    }
  };

  // --- Edit ---
  const handleEdit = (report: CPIReport) => {
    setSelectedStoreInId(report.storeInRecordId);
    setDate(report.date);
    setCutInspections(report.cutInspections || []);
    setInspectionStatus(report.inspectionStatus);
    setAppRej(report.appRej);
    setCheckedBy(report.checkedBy);
    setSummaryDate(report.summaryDate);
    setCpiAuditor(report.cpiAuditor || '');
    setEditingId(report.id);
    setErrors({});
    setPageError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // --- Delete ---
  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this CPI report?')) return;
    try {
      await deleteCPIReport(id);
      await Promise.all([fetchReports(), fetchEligibleCpiItems()]);
    } catch (e) {
      setPageError(e instanceof Error ? e.message : 'Failed to delete.');
    }
  };

  // ==========================================
  // RENDER
  // ==========================================
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-[1600px] space-y-6 pb-12"
    >
      <DraftRestoredToast
        visible={draftRestored}
        onDismiss={dismissDraftNotice}
        onDiscard={() => { clearDraft(); resetForm(); }}
      />

      {/* Page Header */}
      <div className="flex items-center space-x-3 border-b border-slate-200 pb-4">
        <div className="rounded-lg bg-indigo-100 p-2">
          <ClipboardList className="h-6 w-6 text-indigo-700" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">QC Inspection (C.P.I)</h2>
          <p className="text-sm text-slate-500">Cut Panel Inspection Report</p>
        </div>
      </div>

      {pageError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {pageError}
        </div>
      )}

      {/* ==========================================
          CPI REPORT FORM
          ========================================== */}
      <div className="overflow-hidden border border-slate-300 bg-white shadow-xl">
        <form onSubmit={handleSubmit} noValidate>
          {/* Company Header */}
          <div className="bg-slate-800 py-3 text-center text-white">
            <h3 className="text-lg font-black uppercase tracking-widest">
              Colour Plus Printing Systems (Pvt) Ltd
            </h3>
            <p className="text-xs tracking-wider text-slate-300">
              Cut Panel Inspection Report (CP Chart)
            </p>
          </div>

          {/* Info Grid */}
          <div className="border-b-2 border-slate-800">
            {/* Row 1: Date + Style selector + Schedule/Cut dropdowns */}
            <div className="grid grid-cols-2 divide-x divide-slate-300 md:grid-cols-4">
              <div className="p-3">
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500">
                  Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full border-b border-slate-300 bg-transparent pb-1 text-sm font-semibold outline-none focus:border-indigo-600"
                />
              </div>

              <div className="p-3 md:col-span-3">
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500">
                  Store-In Record <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedStoreInId}
                  onChange={(e) => {
                    setSelectedStoreInId(e.target.value);
                    setSelectedCutNo('');
                    if (!editingId) setCutInspections([]);
                  }}
                  disabled={!!editingId}
                  className={`w-full border-b bg-transparent pb-1 text-sm font-semibold outline-none ${
                    errors.storeInRecordId ? 'border-red-400 text-red-600' : 'border-slate-300 focus:border-indigo-600'
                  } ${editingId ? 'cursor-not-allowed text-slate-400' : 'text-slate-900'}`}
                >
                  <option value="">Select store-in record...</option>
                  {eligibleCpiItems.map((item) => (
                    <option key={item.storeInRecordId} value={item.storeInRecordId}>
                      {item.styleNo} | {item.customerName} | Sch: {item.scheduleNo} | IN: {item.receivedQty} | Cuts: {item.cutCount}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Row 2: Auto-populated fields */}
            {selectedItem && (
              <>
                <div className="grid grid-cols-2 divide-x divide-slate-300 border-t border-slate-300 md:grid-cols-4">
                  <InfoCell label="Customer" value={selectedItem.customerName} />
                  <InfoCell label="Style No" value={selectedItem.styleNo} />
                  <InfoCell label="Schedule No" value={selectedItem.scheduleNo} />
                  <InfoCell label="Body Colour" value={selectedItem.bodyColour} />
                </div>
                <div className="grid grid-cols-2 divide-x divide-slate-300 border-t border-slate-300 md:grid-cols-4">
                  <InfoCell label="Print Colour" value={selectedItem.printColour} />
                  <InfoCell label="Received Qty" value={selectedItem.receivedQty.toString()} highlight />
                  <InfoCell label="CPI Qty" value={cpiQty.toString()} highlight />
                  <InfoCell label="Components" value={selectedItem.components} />
                </div>
              </>
            )}
          </div>

          {/* Cut Selector + Add Button */}
          {selectedItem && (
            <div className="flex items-end gap-3 border-b border-slate-300 bg-blue-50/50 px-4 py-3">
              <div className="flex-1">
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-blue-800">
                  Select Cut to Inspect
                </label>
                <select
                  value={selectedCutNo}
                  onChange={(e) => setSelectedCutNo(e.target.value)}
                  className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Choose a cut...</option>
                  {availableCuts
                    .filter((c) => !cutInspections.some((ci) => ci.cutNo === c.cutNo))
                    .map((c) => (
                      <option key={c.cutNo} value={c.cutNo}>
                        {c.cutNo} — Qty: {c.cutQty} — {c.bundles.length} bundle(s)
                      </option>
                    ))}
                </select>
              </div>
              <button
                type="button"
                onClick={handleAddCut}
                disabled={!selectedCutNo}
                className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-40 transition-colors"
              >
                <Plus className="h-4 w-4" /> Add Cut to Report
              </button>
            </div>
          )}

          {errors.cuts && (
            <div className="border-b border-red-200 bg-red-50 px-4 py-2 text-xs text-red-600">
              <AlertCircle className="mr-1 inline h-3 w-3" /> {errors.cuts}
            </div>
          )}

          {/* ==========================================
              INSPECTION GRID — one table per cut
              ========================================== */}
          {cutInspections.map((ci) => (
            <div key={ci.cutNo} className="border-b-2 border-slate-800">
              {/* Cut header bar */}
              <div className="flex items-center justify-between bg-slate-100 px-4 py-2 border-b border-slate-300">
                <div className="flex items-center gap-4 text-sm">
                  <span className="font-black text-slate-800">Cut: {ci.cutNo}</span>
                  <span className="text-slate-500">Qty: <b className="text-slate-800">{ci.cutQty}</b></span>
                  <span className="text-slate-500">Bundles: <b className="text-slate-800">{ci.bundleNos}</b></span>
                  <span className="text-slate-500">Sizes: <b className="text-slate-800">{ci.sizes}</b></span>
                  <span className="text-slate-500">Range: <b className="text-slate-800">{ci.numberRanges}</b></span>
                  <span className="text-slate-500">Sample (10%): <b className="text-indigo-700">{ci.sampleSize}</b></span>
                </div>
                <div className="flex items-center gap-3">
                  {/* Part dropdown */}
                  <select
                    value={ci.part}
                    onChange={(e) => updateCutPart(ci.cutNo, e.target.value)}
                    className="rounded border border-slate-300 bg-white px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-indigo-400"
                  >
                    <option value="">Part...</option>
                    {componentsList.map((comp) => (
                      <option key={comp} value={comp}>{comp}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => handleRemoveCut(ci.cutNo)}
                    className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                    title="Remove cut"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Defect table */}
              <div className="w-full overflow-x-auto">
                <table className="w-full border-collapse text-[11px]">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-200 text-slate-800">
                      <th className="w-10 border-r border-slate-400 px-2 py-1.5 text-center font-bold" rowSpan={2}>Code</th>
                      <th className="min-w-[160px] border-r border-slate-400 px-2 py-1.5 text-left font-bold" rowSpan={2}>Defect</th>
                      <th className="border-r border-slate-400 px-1 py-1 text-center font-bold" colSpan={2}>Before printing</th>
                      <th className="border-r border-slate-400 px-1 py-1 text-center font-bold" colSpan={2}>After printing</th>
                      <th className="w-16 border-r border-slate-400 px-1 py-1.5 text-center font-bold text-red-700" rowSpan={2}>Defected Qty</th>
                      <th className="w-14 border-r border-slate-400 px-1 py-1.5 text-center font-bold" rowSpan={2}>%</th>
                      <th className="min-w-[100px] px-2 py-1.5 text-left font-bold" rowSpan={2}>Remarks</th>
                    </tr>
                    <tr className="border-b border-slate-800 bg-slate-100 text-[10px] text-slate-600">
                      <th className="w-16 border-r border-slate-400 px-1 py-1 text-center">Length</th>
                      <th className="w-16 border-r border-slate-400 px-1 py-1 text-center">Width</th>
                      <th className="w-16 border-r border-slate-400 px-1 py-1 text-center">Length</th>
                      <th className="w-16 border-r border-slate-400 px-1 py-1 text-center">Width</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ci.defectRows.map((row) => (
                      <tr key={row.defectCode} className="border-b border-slate-200 hover:bg-slate-50/50">
                        <td className="border-r border-slate-300 px-2 py-1 text-center font-bold text-slate-500">
                          {row.defectCode}
                        </td>
                        <td className="border-r border-slate-300 px-2 py-1 font-medium text-slate-700">
                          {row.defectName}
                        </td>
                        <td className="border-r border-slate-300 p-0">
                          <input
                            type="number"
                            value={row.beforeLength || ''}
                            onChange={(e) => updateDefectValue(ci.cutNo, row.defectCode, 'beforeLength', e.target.value)}
                            className="w-full bg-transparent py-1 text-center outline-none focus:bg-indigo-50"
                            placeholder="0"
                          />
                        </td>
                        <td className="border-r border-slate-300 p-0">
                          <input
                            type="number"
                            value={row.beforeWidth || ''}
                            onChange={(e) => updateDefectValue(ci.cutNo, row.defectCode, 'beforeWidth', e.target.value)}
                            className="w-full bg-transparent py-1 text-center outline-none focus:bg-indigo-50"
                            placeholder="0"
                          />
                        </td>
                        <td className="border-r border-slate-300 p-0">
                          <input
                            type="number"
                            value={row.afterLength || ''}
                            onChange={(e) => updateDefectValue(ci.cutNo, row.defectCode, 'afterLength', e.target.value)}
                            className="w-full bg-transparent py-1 text-center outline-none focus:bg-indigo-50"
                            placeholder="0"
                          />
                        </td>
                        <td className="border-r border-slate-300 p-0">
                          <input
                            type="number"
                            value={row.afterWidth || ''}
                            onChange={(e) => updateDefectValue(ci.cutNo, row.defectCode, 'afterWidth', e.target.value)}
                            className="w-full bg-transparent py-1 text-center outline-none focus:bg-indigo-50"
                            placeholder="0"
                          />
                        </td>
                        <td className="border-r border-slate-300 bg-red-50/30 px-1 py-1 text-center font-bold text-red-600">
                          {row.defectedQty > 0 ? row.defectedQty : ''}
                        </td>
                        <td className="border-r border-slate-300 bg-red-50/30 px-1 py-1 text-center font-bold text-red-600">
                          {row.defectedQty > 0 ? `${row.percentage}%` : ''}
                        </td>
                        <td className="p-0">
                          <input
                            type="text"
                            value={row.remarks}
                            onChange={(e) => updateDefectValue(ci.cutNo, row.defectCode, 'remarks', e.target.value)}
                            className="w-full bg-transparent px-2 py-1 outline-none focus:bg-indigo-50"
                          />
                        </td>
                      </tr>
                    ))}
                    {/* Cut total row */}
                    <tr className="border-t-2 border-slate-800 bg-slate-100 font-bold">
                      <td colSpan={6} className="border-r border-slate-400 px-2 py-1.5 text-right text-slate-700">
                        Cut {ci.cutNo} Total:
                      </td>
                      <td className="border-r border-slate-400 px-1 py-1.5 text-center text-red-700">
                        {ci.totalDefectedQty > 0 ? ci.totalDefectedQty : '-'}
                      </td>
                      <td className="border-r border-slate-400 px-1 py-1.5 text-center text-red-700">
                        {ci.totalDefectedQty > 0 ? `${ci.totalPercentage}%` : '-'}
                      </td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          {/* Empty state */}
          {cutInspections.length === 0 && selectedItem && (
            <div className="py-12 text-center text-slate-400">
              <ClipboardList className="mx-auto mb-3 h-12 w-12 opacity-20" />
              Select a cut above and click "Add Cut to Report" to begin inspection.
            </div>
          )}

          {/* ==========================================
              FOOTER SUMMARY
              ========================================== */}
          {cutInspections.length > 0 && (
            <div className="border-t-2 border-slate-800">
              <div className="flex items-end gap-4 bg-slate-50 px-5 py-4 flex-wrap">
                <div className="w-48">
                  <label className="mb-1 block text-xs font-bold text-slate-600">QC Status *</label>
                  <select
                    value={inspectionStatus}
                    onChange={(e) => setInspectionStatus(e.target.value as InspectionStatus)}
                    className="w-full rounded border border-slate-300 px-3 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Pending">Pending</option>
                    <option value="Passed">Passed</option>
                    <option value="Failed">Failed</option>
                  </select>
                </div>
                <div className="flex-1 max-w-sm">
                  <label className="mb-1 block text-xs font-bold text-slate-600">CPI Auditor *</label>
                  <input
                    type="text"
                    value={cpiAuditor}
                    onChange={(e) => setCpiAuditor(e.target.value)}
                    placeholder="Auditor name"
                    className={`w-full rounded border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 ${
                      errors.cpiAuditor ? 'border-red-400 bg-red-50' : 'border-slate-300'
                    }`}
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  {isSaving ? 'Saving...' : editingId ? 'Update Report' : 'Save CPI Report'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const liveReport: CPIReport = {
                      id: editingId || 'draft',
                      storeInRecordId: selectedStoreInId,
                      submissionId: '',
                      revisionNo: selectedItem?.revisionNo ?? 1,
                      date,
                      customer: selectedItem?.customerName ?? '',
                      styleNo: selectedItem?.styleNo ?? '',
                      scheduleNo: selectedItem?.scheduleNo ?? '',
                      bodyColour: selectedItem?.bodyColour ?? '',
                      printColour: selectedItem?.printColour ?? '',
                      receivedQty,
                      cpiQty,
                      cutInspections,
                      cuttingQty: receivedQty,
                      checkedQty,
                      rejDamageQty,
                      rejectionPercentage: rejectionPct,
                      balanceQty,
                      inspectionStatus,
                      appRej,
                      checkedBy,
                      summaryDate,
                      cpiAuditor,
                    };
                    printReport(liveReport);
                  }}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
                >
                  <Printer className="h-4 w-4" /> Print
                </button>
                {editingId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          )}
        </form>
      </div>

      {/* ==========================================
          SAVED REPORTS TABLE
          ========================================== */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50 px-6 py-4 space-y-3">
          <h3 className="text-lg font-semibold text-slate-800">CPI Reports</h3>
          <PaginationControls search={cpiPagination.search} onSearchChange={cpiPagination.setSearch} currentPage={cpiPagination.currentPage} totalPages={cpiPagination.totalPages} totalFiltered={cpiPagination.totalFiltered} totalAll={cpiPagination.totalAll} onPageChange={cpiPagination.goToPage} hasNext={cpiPagination.hasNext} hasPrev={cpiPagination.hasPrev} placeholder="Search by style, customer, schedule..." />
        </div>

        {cpiReports.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <ClipboardList className="mx-auto mb-3 h-12 w-12 opacity-20" />
            <p>No CPI reports yet.</p>
          </div>
        ) : cpiPagination.paginated.length === 0 ? (
          <div className="py-12 text-center text-slate-400">No reports match your search.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {cpiPagination.paginated.map((report) => {
              const isExpanded = expandedReportId === report.id;
              return (
                <div key={report.id}>
                  <div
                    className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50/50 cursor-pointer transition-colors"
                    onClick={() => setExpandedReportId(isExpanded ? null : report.id)}
                  >
                    {isExpanded ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{report.styleNo}</span>
                        <span className="text-xs text-slate-500">{report.customer}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          report.inspectionStatus === 'Passed' ? 'bg-emerald-100 text-emerald-700' :
                          report.inspectionStatus === 'Failed' ? 'bg-red-100 text-red-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                          {report.inspectionStatus}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Sch: {report.scheduleNo} | Date: {report.date} | Cuts: {report.cutInspections?.length ?? 0}
                      </p>
                    </div>
                    <div className="text-right text-xs text-slate-500">
                      <div>Received: <b>{report.receivedQty}</b></div>
                      <div>Rejected: <b className="text-red-600">{report.rejDamageQty}</b></div>
                    </div>
                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => printReport(report)} className="rounded p-1.5 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 transition-colors" title="Print">
                        <Printer className="h-4 w-4" />
                      </button>
                      {cpiLocks[report.id]?.isLocked ? (
                        <div className="flex items-center gap-1 px-1" title="Production records exist — cannot edit or delete this report.">
                          <Lock className="h-4 w-4 text-slate-300" />
                          <span className="text-[10px] text-slate-400">Locked</span>
                        </div>
                      ) : (
                        <>
                          <button onClick={() => handleEdit(report)} className="rounded p-1.5 text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-colors" title="Edit">
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button onClick={() => handleDelete(report.id)} className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors" title="Delete">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="border-t border-slate-100 bg-slate-50/50 px-6 py-4 overflow-hidden"
                      >
                        <div className="grid grid-cols-3 gap-3 md:grid-cols-6 mb-3">
                          <MiniStat label="CPI Qty" value={report.cpiQty} />
                          <MiniStat label="Checked" value={report.checkedQty} />
                          <MiniStat label="Rejected" value={report.rejDamageQty} color="red" />
                          <MiniStat label="Rej %" value={report.rejectionPercentage} />
                          <MiniStat label="Balance" value={report.balanceQty} color="green" />
                          <MiniStat label="Auditor" value={report.cpiAuditor || '-'} />
                        </div>
                        {(report.cutInspections || []).map((ci) => (
                          <div key={ci.cutNo} className="mb-2 rounded border border-slate-200 bg-white p-3">
                            <div className="flex gap-4 text-xs text-slate-600 mb-1">
                              <span className="font-bold text-slate-800">Cut {ci.cutNo}</span>
                              <span>Qty: {ci.cutQty}</span>
                              <span>Part: {ci.part || '-'}</span>
                              <span>Defected: <b className="text-red-600">{ci.totalDefectedQty}</b></span>
                            </div>
                          </div>
                        ))}
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
// PRINT FUNCTION — exact replica of the manual CPI report
// ==========================================
function printReport(report: CPIReport) {
  const cuts = report.cutInspections || [];

  console.log('Printing report:', report.id, 'cutInspections:', cuts.length, JSON.stringify(cuts, null, 2));

  // Helper: show number if non-zero, empty string if zero/undefined
  const v = (n: number | undefined | null): string => {
    if (n === undefined || n === null || n === 0) return '';
    return String(n);
  };

  // Fixed defect list — always show these 14 rows
  const defectList = [
    { code: 'F1', name: 'Panel Shrinkage' },
    { code: 'F2', name: 'Fabric colour variation' },
    { code: 'F3', name: 'Crush mark' },
    { code: 'F4', name: 'Shape out panel' },
    { code: 'F5', name: 'Dust mark' },
    { code: 'F6', name: 'Stain marks / Oil marks' },
    { code: 'F7', name: 'Cut holes' },
    { code: 'F8', name: 'Needle marks' },
    { code: 'F9', name: 'Incorrect part' },
    { code: 'F10', name: 'Numbering stickers missing' },
    { code: 'F11', name: 'Numbering stickers mixed-up' },
    { code: 'F12', name: 'Size mixed-up' },
    { code: 'F13', name: 'Wrong Cut Mark' },
    { code: '', name: 'Other' },
  ];

  let tableRows = '';

  if (cuts.length === 0) {
    // No cuts — print blank form with 14 empty defect rows
    defectList.forEach((d, idx) => {
      tableRows += `<tr>`;
      tableRows += `<td class="code">${d.code}</td>`;
      tableRows += `<td class="defect-name">${d.name}</td>`;
      if (idx === 0) {
        tableRows += `<td class="center" rowspan="14"></td>`;
        tableRows += `<td class="center" rowspan="14"></td>`;
        tableRows += `<td class="center" rowspan="14"></td>`;
        tableRows += `<td class="center" rowspan="14"></td>`;
      }
      tableRows += `<td class="num"></td><td class="num"></td>`;
      tableRows += `<td class="num"></td><td class="num"></td>`;
      if (idx === 0) {
        tableRows += `<td class="center" rowspan="14"></td>`;
        tableRows += `<td class="center" rowspan="14"></td>`;
        tableRows += `<td class="center" rowspan="14"></td>`;
      }
      tableRows += `<td class="num"></td><td class="num"></td>`;
      tableRows += `<td class="remarks"></td>`;
      tableRows += `</tr>`;
    });
  } else {
    // For each cut, show 14 defect rows with cut info merged on first row
    cuts.forEach((ci) => {
      const defects = ci.defectRows && ci.defectRows.length > 0
        ? ci.defectRows
        : defectList.map((d) => ({
            defectCode: d.code,
            defectName: d.name,
            beforeLength: 0,
            beforeWidth: 0,
            afterLength: 0,
            afterWidth: 0,
            defectedQty: 0,
            percentage: '',
            remarks: '',
          }));

      const rowCount = defects.length;

      defects.forEach((row, idx) => {
        const isFirst = idx === 0;
        tableRows += `<tr>`;

        tableRows += `<td class="code">${row.defectCode}</td>`;
        tableRows += `<td class="defect-name">${row.defectName}</td>`;

        if (isFirst) {
          tableRows += `<td class="center" rowspan="${rowCount}">${ci.cutNo}</td>`;
          tableRows += `<td class="center" rowspan="${rowCount}">${ci.cutQty}</td>`;
          tableRows += `<td class="center" rowspan="${rowCount}">${ci.bundleNos}</td>`;
          tableRows += `<td class="center" rowspan="${rowCount}">${ci.sizes}</td>`;
        }

        tableRows += `<td class="num">${v(row.beforeLength)}</td>`;
        tableRows += `<td class="num">${v(row.beforeWidth)}</td>`;
        tableRows += `<td class="num">${v(row.afterLength)}</td>`;
        tableRows += `<td class="num">${v(row.afterWidth)}</td>`;

        if (isFirst) {
          tableRows += `<td class="center" rowspan="${rowCount}">${ci.numberRanges}</td>`;
          tableRows += `<td class="center" rowspan="${rowCount}">${ci.part || ''}</td>`;
          tableRows += `<td class="center" rowspan="${rowCount}">${ci.sampleSize}</td>`;
        }

        tableRows += `<td class="num red">${v(row.defectedQty)}</td>`;
        tableRows += `<td class="num red">${row.defectedQty > 0 ? row.percentage + '%' : ''}</td>`;
        tableRows += `<td class="remarks">${row.remarks || ''}</td>`;

        tableRows += `</tr>`;
      });

      // Separator between cuts
      if (cuts.indexOf(ci) < cuts.length - 1) {
        tableRows += `<tr><td colspan="16" style="height:3px;background:#333;padding:0"></td></tr>`;
      }
    });
  }

  const html = `<!DOCTYPE html>
<html>
<head>
<title>CPI Report - ${report.styleNo}</title>
<style>
  @page { size: A4 landscape; margin: 8mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; font-size: 9px; color: #000; }

  .header { text-align: center; margin-bottom: 6px; }
  .header h1 { font-size: 14px; font-weight: 900; letter-spacing: 1px; margin-bottom: 2px; }
  .header h2 { font-size: 11px; font-weight: 700; text-decoration: underline; }

  .info-grid { display: flex; border: 1.5px solid #000; margin-bottom: 6px; }
  .info-left, .info-mid, .info-right { flex: 1; padding: 4px 8px; }
  .info-mid { border-left: 1.5px solid #000; border-right: 1.5px solid #000; }
  .info-row { display: flex; align-items: center; margin: 2px 0; }
  .info-row .lbl { font-weight: 700; min-width: 90px; font-size: 9px; }
  .info-row .val { border-bottom: 1px solid #000; flex: 1; min-height: 14px; padding: 0 4px; font-size: 9px; }

  table { width: 100%; border-collapse: collapse; border: 1.5px solid #000; }
  th, td { border: 0.5px solid #000; padding: 2px 3px; font-size: 8px; vertical-align: middle; }
  th { background: #e8e8e8; font-weight: 700; text-align: center; font-size: 8px; }
  .code { text-align: center; font-weight: 700; width: 28px; }
  .defect-name { min-width: 120px; font-weight: 500; }
  .center { text-align: center; }
  .num { text-align: center; width: 32px; }
  .red { color: #c00; font-weight: 700; }
  .remarks { min-width: 60px; font-size: 7px; }

  .before-hdr { background: #d0d0d0; }
  .after-hdr { background: #d0d0d0; }

  .footer { margin-top: 12px; display: flex; align-items: center; }
  .footer .lbl { font-weight: 900; font-size: 11px; margin-right: 8px; }
  .footer .line { border-bottom: 1px solid #000; flex: 1; max-width: 300px; min-height: 16px; padding: 0 6px; font-size: 10px; }

  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head>
<body>
  <div class="header">
    <h1>COLOUR PLUS PRINTING SYSTEMS (PVT) LTD</h1>
    <h2>CUT PANEL INSPECTION REPORT (CP CHART)</h2>
  </div>

  <div class="info-grid">
    <div class="info-left">
      <div class="info-row"><span class="lbl">Date :</span><span class="val">${report.date}</span></div>
      <div class="info-row"><span class="lbl">Customer :</span><span class="val">${report.customer}</span></div>
      <div class="info-row"><span class="lbl">Style number :</span><span class="val">${report.styleNo}</span></div>
    </div>
    <div class="info-mid">
      <div class="info-row"><span class="lbl">Schedule number :</span><span class="val">${report.scheduleNo}</span></div>
      <div class="info-row"><span class="lbl">Cut number :</span><span class="val">${cuts.map(c => c.cutNo).join(', ')}</span></div>
      <div class="info-row"><span class="lbl">Body colour :</span><span class="val">${report.bodyColour}</span></div>
    </div>
    <div class="info-right">
      <div class="info-row"><span class="lbl">Print colour :</span><span class="val">${report.printColour}</span></div>
      <div class="info-row"><span class="lbl">Received Qty :</span><span class="val">${report.receivedQty}</span></div>
      <div class="info-row"><span class="lbl">CPI Qty :</span><span class="val">${report.cpiQty}</span></div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th rowspan="3" style="width:28px"></th>
        <th rowspan="3" style="min-width:120px">Defect</th>
        <th rowspan="3" style="width:40px">Cut<br/>No.</th>
        <th rowspan="3" style="width:32px">Qty</th>
        <th rowspan="3" style="width:55px">Bundle No.</th>
        <th rowspan="3" style="width:36px">Size</th>
        <th colspan="2" class="before-hdr">Before printing<br/>process</th>
        <th colspan="2" class="after-hdr">After printing<br/>process</th>
        <th rowspan="3" style="width:55px">No. Range</th>
        <th rowspan="3" style="width:45px">Part</th>
        <th rowspan="3" style="width:45px">Sample<br/>Size 10%</th>
        <th rowspan="3" style="width:42px">Defected<br/>Qty</th>
        <th rowspan="3" style="width:30px">%</th>
        <th rowspan="3" style="min-width:50px">Remarks</th>
      </tr>
      <tr>
        <th class="before-hdr" style="width:32px">Length</th>
        <th class="before-hdr" style="width:32px">Width</th>
        <th class="after-hdr" style="width:32px">Length</th>
        <th class="after-hdr" style="width:32px">Width</th>
      </tr>
      <tr>
        <th class="before-hdr" style="font-size:7px">+ / -</th>
        <th class="before-hdr" style="font-size:7px">+ / -</th>
        <th class="after-hdr" style="font-size:7px">+ / -</th>
        <th class="after-hdr" style="font-size:7px">+ / -</th>
      </tr>
    </thead>
    <tbody>
      ${tableRows}
    </tbody>
  </table>

  <div class="footer">
    <span class="lbl">CPI Auditor</span>
    <span class="line">${report.cpiAuditor || ''}</span>
  </div>
</body>
</html>`;

  // Use a hidden iframe to print — works in Tauri where window.open is blocked
  const existingFrame = document.getElementById('cpi-print-frame') as HTMLIFrameElement | null;
  if (existingFrame) existingFrame.remove();

  const iframe = document.createElement('iframe');
  iframe.id = 'cpi-print-frame';
  iframe.style.position = 'fixed';
  iframe.style.top = '-10000px';
  iframe.style.left = '-10000px';
  iframe.style.width = '1200px';
  iframe.style.height = '800px';
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  if (doc) {
    doc.open();
    doc.write(html);
    doc.close();

    // Wait for content to render then print
    setTimeout(() => {
      iframe.contentWindow?.print();
      // Clean up after printing
      setTimeout(() => iframe.remove(), 1000);
    }, 300);
  }
}

function InfoCell({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`p-3 ${highlight ? 'bg-indigo-50' : ''}`}>
      <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-400">
        {label}
      </label>
      <div className={`text-sm font-semibold ${highlight ? 'text-indigo-700' : 'text-slate-700'}`}>
        {value || '-'}
      </div>
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string; value: number | string; color?: 'red' | 'green' }) {
  const colorClass = color === 'red' ? 'text-red-700' : color === 'green' ? 'text-emerald-700' : 'text-slate-700';
  return (
    <div className="rounded-lg bg-white border border-slate-200 px-3 py-2">
      <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`text-sm font-black ${colorClass}`}>{value}</p>
    </div>
  );
}