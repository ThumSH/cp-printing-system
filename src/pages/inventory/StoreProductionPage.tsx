// src/pages/inventory/StoreProductionPage.tsx
import { useState, useEffect, useMemo } from 'react';
import { usePaginatedSearch } from '../../hooks/usePaginatedSearch';
import { PaginationControls } from '../../components/PaginatedTable';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Factory,
  Plus,
  Trash2,
  Edit2,
  AlertCircle,
  Save,
  GitBranch,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import {
  useInventoryStore,
  EligibleProductionItem,
  ProductionCutInfo,
  StoreProductionRecord,
} from '../../store/inventoryStore';

// ==========================================
// Staging row type (local, not yet saved)
// ==========================================
interface StagingRow {
  tempId: string;
  styleNo: string;
  customerName: string;
  scheduleNo: string;
  bodyColour: string;
  component: string;
  cutNo: string;
  cutQty: number;
  issueQty: number;
  balance: number;
  lineNo: string;
}

export default function StoreProductionPage() {
  const {
    productionRecords,
    eligibleProductionItems,
    fetchProductionRecords,
    fetchEligibleProductionItems,
    batchAddProductionRecords,
    deleteProductionRecord,
    fetchBulkBalances,
    bulkBalances,
  } = useInventoryStore();

  // --- Selection state ---
  const [selectedStoreInId, setSelectedStoreInId] = useState('');
  const [selectedCutNo, setSelectedCutNo] = useState('');
  const [selectedComponent, setSelectedComponent] = useState('');
  const [issueQty, setIssueQty] = useState('');
  const [lineNo, setLineNo] = useState('');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);

  // --- Staging table (accumulate rows before submit) ---
  const [stagingRows, setStagingRows] = useState<StagingRow[]>([]);

  // --- UI ---
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pageError, setPageError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [prodLocks, setProdLocks] = useState<Record<string, { isLocked: boolean }>>({});
  const prodPagination = usePaginatedSearch({ data: productionRecords, searchFields: ["styleNo" as any, "customerName" as any, "cutNo" as any, "lineNo" as any], pageSize: 25 });

  // --- Load data ---
  useEffect(() => {
    const load = async () => {
      try {
        await Promise.all([fetchProductionRecords(), fetchEligibleProductionItems(), fetchBulkBalances()]);
        const lockRes = await fetch('http://localhost:5000/api/inventory/production/locks', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        if (lockRes.ok) setProdLocks(await lockRes.json());
      } catch (e) {
        setPageError(e instanceof Error ? e.message : 'Failed to load production data.');
      }
    };
    load();
  }, [fetchProductionRecords, fetchEligibleProductionItems, fetchBulkBalances]);

  // --- Selected eligible item ---
  const selectedItem = useMemo(
    () => eligibleProductionItems.find((i) => i.storeInRecordId === selectedStoreInId) || null,
    [eligibleProductionItems, selectedStoreInId]
  );

  // --- Bulk balance for the selected style ---
  const styleBulkBalance = useMemo(() => {
    if (!selectedItem) return null;
    return bulkBalances.find((b) => b.submissionId === selectedItem.submissionId) || null;
  }, [selectedItem, bulkBalances]);

  // --- Available cuts (adjusted for staging rows already added) ---
  const adjustedCuts = useMemo(() => {
    if (!selectedItem) return [];
    return selectedItem.cuts.map((cut) => {
      const stagedForThisCut = stagingRows
        .filter((r) => r.cutNo === cut.cutNo)
        .reduce((s, r) => s + r.issueQty, 0);
      return {
        ...cut,
        availableQty: Math.max(0, cut.availableQty - stagedForThisCut),
      };
    });
  }, [selectedItem, stagingRows]);

  // --- Selected cut info ---
  const selectedCut = useMemo(
    () => adjustedCuts.find((c) => c.cutNo === selectedCutNo) || null,
    [adjustedCuts, selectedCutNo]
  );

  const issueQtyNum = parseInt(issueQty) || 0;
  const cutBalance = selectedCut ? Math.max(0, selectedCut.availableQty - issueQtyNum) : 0;

  // --- Components list from the style ---
  const componentsList = useMemo(() => {
    if (!selectedItem?.components) return [];
    return selectedItem.components.split(',').map((c) => c.trim()).filter(Boolean);
  }, [selectedItem]);

  // --- Add row to staging ---
  const handleAddRow = () => {
    const newErrors: Record<string, string> = {};

    if (!selectedStoreInId) newErrors.storeInRecordId = 'Select a QC-passed item';
    if (!selectedCutNo) newErrors.cutNo = 'Select a cut';
    if (!selectedComponent) newErrors.component = 'Select a component';
    if (!lineNo.trim()) newErrors.lineNo = 'Line No is required';
    if (issueQtyNum <= 0) newErrors.issueQty = 'Issue Qty must be > 0';
    if (selectedCut && issueQtyNum > selectedCut.availableQty) {
      newErrors.issueQty = `Exceeds available (${selectedCut.availableQty})`;
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    const newRow: StagingRow = {
      tempId: crypto.randomUUID(),
      styleNo: selectedItem?.styleNo ?? '',
      customerName: selectedItem?.customerName ?? '',
      scheduleNo: selectedItem?.scheduleNo ?? '',
      bodyColour: selectedItem?.bodyColour ?? '',
      component: selectedComponent,
      cutNo: selectedCutNo,
      cutQty: selectedCut?.cutQty ?? 0,
      issueQty: issueQtyNum,
      balance: cutBalance,
      lineNo: lineNo.trim(),
    };

    setStagingRows((prev) => [...prev, newRow]);
    setIssueQty('');
    setLineNo('');
    setSelectedCutNo('');
    setSelectedComponent('');
    setErrors({});
    setPageError('');
  };

  // --- Remove staging row ---
  const removeStagingRow = (tempId: string) => {
    setStagingRows((prev) => prev.filter((r) => r.tempId !== tempId));
  };

  // --- Submit all staging rows to database ---
  const handleSubmit = async () => {
    if (stagingRows.length === 0) {
      setPageError('Add at least one row before submitting.');
      return;
    }

    setIsSaving(true);
    setPageError('');

    try {
      const records = stagingRows.map((row) => ({
        storeInRecordId: selectedStoreInId,
        cutNo: row.cutNo,
        issueDate,
        issueQty: row.issueQty,
        lineNo: row.lineNo,
        balanceQty: row.balance,
      }));

      await batchAddProductionRecords(records);
      setStagingRows([]);
      setSelectedStoreInId('');
      setSelectedCutNo('');
      setIssueQty('');
      setLineNo('');
      await Promise.all([fetchProductionRecords(), fetchEligibleProductionItems(), fetchBulkBalances()]);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Failed to save production records.');
    } finally {
      setIsSaving(false);
    }
  };

  // --- Delete existing production record ---
  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this production record?')) return;
    try {
      await deleteProductionRecord(id);
      await Promise.all([fetchProductionRecords(), fetchEligibleProductionItems(), fetchBulkBalances()]);
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
      className="mx-auto max-w-6xl space-y-6 pb-12"
    >
      {/* Page Header */}
      <div className="flex items-center space-x-3 border-b border-slate-200 pb-4">
        <div className="rounded-lg bg-blue-100 p-2">
          <Factory className="h-6 w-6 text-blue-700" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Issue to Production</h2>
          <p className="text-sm text-slate-500">Only QC-passed Store-In items can move into Production.</p>
        </div>
      </div>

      {pageError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{pageError}</div>
      )}

      {/* ==========================================
          FORM
          ========================================== */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        {/* Style selector */}
        <div className="space-y-4 rounded-lg border border-blue-200 bg-blue-50/60 p-5 mb-6">
          <h4 className="border-b border-blue-200 pb-2 text-sm font-bold uppercase tracking-wider text-blue-800">
            QC-Passed Item
          </h4>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1 lg:col-span-2">
              <label className="block text-xs font-medium text-slate-600">
                Eligible Item <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedStoreInId}
                onChange={(e) => {
                  setSelectedStoreInId(e.target.value);
                  setSelectedCutNo('');
                  setStagingRows([]);
                }}
                className={`w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none ${
                  errors.storeInRecordId ? 'border-red-400 bg-red-50' : 'border-slate-300 focus:ring-2 focus:ring-blue-500'
                }`}
              >
                <option value="">Select QC-passed item...</option>
                {eligibleProductionItems.map((item) => (
                  <option key={item.storeInRecordId} value={item.storeInRecordId}>
                    {item.styleNo} | {item.customerName} | Sch: {item.scheduleNo} | Available: {item.totalAvailableQty}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-600">Issue Date</label>
              <input
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Auto-populated info + bulk balance */}
          {selectedItem && (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-5 border-t border-blue-200 pt-3">
              <InfoBox label="Style" value={selectedItem.styleNo} />
              <InfoBox label="Customer" value={selectedItem.customerName} />
              <InfoBox label="Schedule" value={selectedItem.scheduleNo} />
              <InfoBox label="Body Colour" value={selectedItem.bodyColour} />
              <InfoBox label="Bulk Balance" value={selectedItem.bulkBalance.toString()} highlight />
            </div>
          )}
        </div>

        {/* Cut selector + Component + Issue qty */}
        {selectedItem && (
          <div className="rounded-lg border border-orange-200 bg-orange-50/60 p-5 mb-6 space-y-4">
            <h4 className="border-b border-orange-200 pb-2 text-sm font-bold uppercase tracking-wider text-orange-800">
              Cut Issue
            </h4>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-6">
              <div className="space-y-1 md:col-span-2">
                <label className="block text-xs font-medium text-slate-600">
                  Cut No <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedCutNo}
                  onChange={(e) => setSelectedCutNo(e.target.value)}
                  className={`w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none ${
                    errors.cutNo ? 'border-red-400 bg-red-50' : 'border-slate-300 focus:ring-2 focus:ring-orange-500'
                  }`}
                >
                  <option value="">Select cut...</option>
                  {adjustedCuts.filter((c) => c.availableQty > 0).map((cut) => (
                    <option key={cut.cutNo} value={cut.cutNo}>
                      {cut.cutNo} — Qty: {cut.cutQty} — Available: {cut.availableQty}
                    </option>
                  ))}
                </select>
                {errors.cutNo && <p className="text-[11px] text-red-600">{errors.cutNo}</p>}
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-600">
                  Component <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedComponent}
                  onChange={(e) => setSelectedComponent(e.target.value)}
                  className={`w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none ${
                    errors.component ? 'border-red-400 bg-red-50' : 'border-slate-300 focus:ring-2 focus:ring-orange-500'
                  }`}
                >
                  <option value="">Select...</option>
                  {componentsList.map((comp) => (
                    <option key={comp} value={comp}>{comp}</option>
                  ))}
                </select>
                {errors.component && <p className="text-[11px] text-red-600">{errors.component}</p>}
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-600">
                  Issue Qty <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={issueQty}
                  onChange={(e) => setIssueQty(e.target.value)}
                  placeholder="0"
                  className={`w-full rounded-lg border px-3 py-2 text-sm font-bold outline-none ${
                    errors.issueQty ? 'border-red-400 bg-red-50' : 'border-slate-300 focus:ring-2 focus:ring-orange-500'
                  }`}
                />
                {errors.issueQty && <p className="text-[11px] text-red-600">{errors.issueQty}</p>}
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-600">
                  Line No <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={lineNo}
                  onChange={(e) => setLineNo(e.target.value)}
                  placeholder="Line 01"
                  className={`w-full rounded-lg border px-3 py-2 text-sm outline-none ${
                    errors.lineNo ? 'border-red-400 bg-red-50' : 'border-slate-300 focus:ring-2 focus:ring-orange-500'
                  }`}
                />
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={handleAddRow}
                  className="inline-flex items-center gap-1 rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-orange-700 transition-colors w-full justify-center"
                >
                  <Plus className="h-4 w-4" /> Add to Table
                </button>
              </div>
            </div>

            {/* Live qty display */}
            {selectedCut && (
              <div className="grid grid-cols-3 gap-3 mt-2">
                <div className="rounded-lg bg-white border border-slate-200 px-4 py-2 text-center">
                  <p className="text-[10px] font-bold uppercase text-slate-400">Cut Qty</p>
                  <p className="text-lg font-black text-slate-800">{selectedCut.cutQty}</p>
                </div>
                <div className="rounded-lg bg-white border border-slate-200 px-4 py-2 text-center">
                  <p className="text-[10px] font-bold uppercase text-slate-400">Issue Qty</p>
                  <p className="text-lg font-black text-orange-600">{issueQtyNum}</p>
                </div>
                <div className={`rounded-lg border px-4 py-2 text-center ${
                  cutBalance > 0 ? 'border-blue-200 bg-blue-50' : 'border-emerald-200 bg-emerald-50'
                }`}>
                  <p className="text-[10px] font-bold uppercase text-slate-400">Balance</p>
                  <p className={`text-lg font-black ${cutBalance > 0 ? 'text-blue-700' : 'text-emerald-700'}`}>
                    {cutBalance}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==========================================
            STAGING TABLE
            ========================================== */}
        {stagingRows.length > 0 && (
          <div className="rounded-lg border border-slate-200 overflow-hidden mb-6">
            <div className="bg-slate-800 px-4 py-2.5 text-sm font-bold text-white">
              Staging — {stagingRows.length} row(s) ready to submit
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                  <th className="px-3 py-2 text-left">#</th>
                  <th className="px-3 py-2 text-left">Style</th>
                  <th className="px-3 py-2 text-left">Customer</th>
                  <th className="px-3 py-2 text-left">Schedule</th>
                  <th className="px-3 py-2 text-left">Colour</th>
                  <th className="px-3 py-2 text-left">Component</th>
                  <th className="px-3 py-2 text-left">Cut No</th>
                  <th className="px-3 py-2 text-right">Cut Qty</th>
                  <th className="px-3 py-2 text-right">Issue Qty</th>
                  <th className="px-3 py-2 text-right">Balance</th>
                  <th className="px-3 py-2 text-left">Line</th>
                  <th className="px-3 py-2 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stagingRows.map((row, idx) => (
                  <tr key={row.tempId} className="hover:bg-slate-50/50">
                    <td className="px-3 py-2 text-slate-500">{idx + 1}</td>
                    <td className="px-3 py-2 font-bold text-slate-800">{row.styleNo}</td>
                    <td className="px-3 py-2 text-slate-600">{row.customerName}</td>
                    <td className="px-3 py-2 text-slate-600">{row.scheduleNo}</td>
                    <td className="px-3 py-2 text-slate-600">{row.bodyColour}</td>
                    <td className="px-3 py-2 text-slate-700 font-medium">{row.component}</td>
                    <td className="px-3 py-2 font-bold text-slate-800">{row.cutNo}</td>
                    <td className="px-3 py-2 text-right">{row.cutQty}</td>
                    <td className="px-3 py-2 text-right font-bold text-orange-600">{row.issueQty}</td>
                    <td className={`px-3 py-2 text-right font-bold ${row.balance > 0 ? 'text-blue-600' : 'text-emerald-600'}`}>
                      {row.balance}
                    </td>
                    <td className="px-3 py-2">{row.lineNo}</td>
                    <td className="px-3 py-2 text-right">
                      <button onClick={() => removeStagingRow(row.tempId)}
                        className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                <tr className="border-t-2 border-slate-300 bg-slate-100 font-bold">
                  <td colSpan={8} className="px-3 py-2 text-right text-xs uppercase text-slate-500">Total</td>
                  <td className="px-3 py-2 text-right text-orange-700">
                    {stagingRows.reduce((s, r) => s + r.issueQty, 0)}
                  </td>
                  <td colSpan={3}></td>
                </tr>
              </tbody>
            </table>

            <div className="border-t border-slate-200 bg-slate-50 px-4 py-3 flex items-center gap-3">
              <button
                onClick={handleSubmit}
                disabled={isSaving}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {isSaving ? 'Saving...' : 'Submit All to Database'}
              </button>
              <button
                onClick={() => setStagingRows([])}
                className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
              >
                Clear All
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ==========================================
          EXISTING PRODUCTION RECORDS
          ========================================== */}
      {productionRecords.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-slate-200 bg-slate-50 px-6 py-4 space-y-3">
            <h3 className="text-lg font-semibold text-slate-800">Production Records</h3>
            <PaginationControls search={prodPagination.search} onSearchChange={prodPagination.setSearch} currentPage={prodPagination.currentPage} totalPages={prodPagination.totalPages} totalFiltered={prodPagination.totalFiltered} totalAll={prodPagination.totalAll} onPageChange={prodPagination.goToPage} hasNext={prodPagination.hasNext} hasPrev={prodPagination.hasPrev} placeholder="Search by style, customer, cut, line..." />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                  <th className="px-4 py-2 text-left">Style / Customer</th>
                  <th className="px-4 py-2 text-left">Cut No</th>
                  <th className="px-4 py-2 text-right">Issue Qty</th>
                  <th className="px-4 py-2 text-right">Balance</th>
                  <th className="px-4 py-2 text-left">Line</th>
                  <th className="px-4 py-2 text-left">Date</th>
                  <th className="px-4 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {prodPagination.paginated.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-2">
                      <p className="font-bold text-slate-800">{rec.styleNo}</p>
                      <p className="text-xs text-slate-500">{rec.customerName}</p>
                    </td>
                    <td className="px-4 py-2 font-medium">{rec.cutNo}</td>
                    <td className="px-4 py-2 text-right font-bold text-orange-600">{rec.issueQty}</td>
                    <td className="px-4 py-2 text-right font-bold text-blue-600">{rec.balanceQty}</td>
                    <td className="px-4 py-2">{rec.lineNo}</td>
                    <td className="px-4 py-2 text-slate-500">{rec.issueDate}</td>
                    <td className="px-4 py-2 text-right">
                      {prodLocks[rec.id]?.isLocked ? (
                        <div className="flex items-center justify-end gap-1" title="Gatepass advice notes dispatched — cannot delete.">
                          <Lock className="h-4 w-4 text-slate-300" />
                          <span className="text-[10px] text-slate-400">Locked</span>
                        </div>
                      ) : (
                        <button onClick={() => handleDelete(rec.id)}
                          className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ==========================================
// HELPER
// ==========================================
function InfoBox({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-lg border px-3 py-2 ${highlight ? 'border-blue-300 bg-blue-50' : 'border-slate-200 bg-white'}`}>
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`text-sm font-bold ${highlight ? 'text-blue-700' : 'text-slate-700'}`}>{value || '-'}</p>
    </div>
  );
}