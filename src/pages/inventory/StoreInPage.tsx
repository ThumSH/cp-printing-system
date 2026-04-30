// src/pages/inventory/StoreInPage.tsx
import { useState, useEffect, useMemo } from 'react';
import { useAutoDraft } from '../../hooks/useAutoDraft';
import DraftRestoredToast from '../../components/DraftRestoredToast';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PackageOpen, Plus, Trash2, Edit2, AlertCircle, Save, GitBranch,
  CheckCircle2, ChevronDown, ChevronRight, Layers, X, Lock, Database,
  TableProperties, Search, Filter, Calendar,
} from 'lucide-react';
import {
  useInventoryStore,
  StoreInRecord,
} from '../../store/inventoryStore';
import { API, getAuthHeaders } from '../../api/client';

const SIZES = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL'];

// ==========================================
// TYPES for local form state
// ==========================================
interface BundleFormRow {
  tempId: string;
  bundleNo: string;
  bundleQty: string;
  size: string;
  numberRange: string;
}

interface CutFormRow {
  tempId: string;
  cutNo: string;
  cutQty: string;
  bundles: BundleFormRow[];
  expanded: boolean;
}

// A staged entry waiting to be saved to database
interface StagedEntry {
  tempId: string;
  submissionId: string;
  styleNo: string;
  customerName: string;
  bodyColour: string;
  printColour: string;
  season: string;
  components: string;
  scheduleNo: string;
  cutInDate: string;
  approvedBulkQty: number;
  inQty: number;
  cuts: {
    cutNo: string;
    cutQty: number;
    bundles: {
      bundleNo: string;
      bundleQty: number;
      size: string;
      numberRange: string;
    }[];
  }[];
}

interface StyleScheduleOption {
  styleNo: string;
  customerName: string;
  scheduleNo: string;
}

const makeBundleRow = (bundleIndex: number): BundleFormRow => ({
  tempId: crypto.randomUUID(),
  bundleNo: `B${String(bundleIndex).padStart(3, '0')}`,
  bundleQty: '',
  size: '',
  numberRange: '',
});

const makeCutRow = (cutIndex: number): CutFormRow => ({
  tempId: crypto.randomUUID(),
  cutNo: `Cut ${cutIndex}`,
  cutQty: '',
  bundles: [makeBundleRow(1)],
  expanded: true,
});

// ==========================================
// COMPONENT
// ==========================================
export default function StoreInPage() {
  const {
    storeInRecords, eligibleStoreInItems, addStoreInRecord, updateStoreInRecord,
    deleteStoreInRecord, fetchRecords, fetchEligibleStoreInItems, fetchBulkBalances, bulkBalances,
  } = useInventoryStore();

  // --- Top-level form fields ---
  const [submissionId, setSubmissionId] = useState('');
  const [scheduleNo, setScheduleNo] = useState('');
  const [cutInDate, setCutInDate] = useState('');
  const [inQty, setInQty] = useState('');
  const [cuts, setCuts] = useState<CutFormRow[]>([makeCutRow(1)]);

  // --- Staging table ---
  const [stagedEntries, setStagedEntries] = useState<StagedEntry[]>([]);
  const [expandedStagedId, setExpandedStagedId] = useState<string | null>(null);

  // --- UI state ---
  const [editingId, setEditingId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pageError, setPageError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingToDb, setIsSavingToDb] = useState(false);
  const [expandedRecordId, setExpandedRecordId] = useState<string | null>(null);
  const [locks, setLocks] = useState<Record<string, { isLocked: boolean }>>({});
  const [systemStyleSchedules, setSystemStyleSchedules] = useState<StyleScheduleOption[]>([]);

  // --- Search & filter ---
  const [searchText, setSearchText] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 25;

  // --- Filtered & paginated records ---
  const filteredRecords = useMemo(() => {
    let records = [...storeInRecords];
    if (searchText.trim()) {
      const q = searchText.toLowerCase().trim();
      records = records.filter(
        (r) =>
          r.styleNo.toLowerCase().includes(q) ||
          r.customerName.toLowerCase().includes(q) ||
          r.scheduleNo.toLowerCase().includes(q) ||
          r.bodyColour.toLowerCase().includes(q) ||
          r.season.toLowerCase().includes(q)
      );
    }
    if (filterDateFrom) records = records.filter((r) => r.cutInDate >= filterDateFrom);
    if (filterDateTo) records = records.filter((r) => r.cutInDate <= filterDateTo);
    return records;
  }, [storeInRecords, searchText, filterDateFrom, filterDateTo]);

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedRecords = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredRecords.slice(start, start + pageSize);
  }, [filteredRecords, safePage]);

  // --- Load data ---
  useEffect(() => {
    const load = async () => {
      try {
        const styleResPromise = fetch(`${API.BASE}/api/dashboard/styles`, { headers: getAuthHeaders() });
        await Promise.all([fetchRecords(), fetchEligibleStoreInItems(), fetchBulkBalances()]);
        const styleRes = await styleResPromise;
        const lockRes = await fetch(`${API.INVENTORY}/store-in/locks`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        if (lockRes.ok) setLocks(await lockRes.json());
        if (styleRes.ok) {
          const styleRows: StyleScheduleOption[] = await styleRes.json();
          setSystemStyleSchedules(styleRows);
        } else {
          setSystemStyleSchedules([]);
        }
      } catch (error) {
        setPageError(error instanceof Error ? error.message : 'Failed to load inventory data.');
      }
    };
    load();
  }, [fetchRecords, fetchEligibleStoreInItems, fetchBulkBalances]);

  // --- Selected eligible item ---
  const selectedItem = useMemo(() => {
    return eligibleStoreInItems.find((item) => item.submissionId === submissionId) || null;
  }, [eligibleStoreInItems, submissionId]);

  // Existing schedule numbers for this style — used as datalist suggestions only.
  // The user is always free to type a brand-new one.
  const existingScheduleOptions = useMemo(() => {
    if (!selectedItem) return [];

    const inSystem = systemStyleSchedules
      .filter((row) =>
        row.styleNo === selectedItem.styleNo &&
        row.customerName === selectedItem.customerName &&
        !!row.scheduleNo
      )
      .map((row) => row.scheduleNo.trim());

    const inRecords = storeInRecords
      .filter((row) =>
        row.styleNo === selectedItem.styleNo &&
        row.customerName === selectedItem.customerName &&
        !!row.scheduleNo
      )
      .map((row) => row.scheduleNo.trim());

    // Also include any schedules already staged for this style so the user
    // can see them but won't accidentally duplicate
    const inStaged = stagedEntries
      .filter((e) => e.submissionId === submissionId && !!e.scheduleNo)
      .map((e) => e.scheduleNo.trim());

    return Array.from(new Set([...inSystem, ...inRecords, ...inStaged])).filter(Boolean).sort();
  }, [selectedItem, systemStyleSchedules, storeInRecords, stagedEntries, submissionId]);

  // --- Computed quantities ---
  const inQtyNum = parseInt(inQty) || 0;
  // --- Auto-draft: save form to localStorage, restore on reload ---
  const storeInDraftState = useMemo(() => ({
    submissionId, scheduleNo, cutInDate, inQty, cuts, stagedEntries,
  }), [submissionId, scheduleNo, cutInDate, inQty, cuts, stagedEntries]);

  const { draftRestored, clearDraft, dismissDraftNotice } = useAutoDraft(
    'store-in-form',
    storeInDraftState,
    (saved) => {
      if (saved.submissionId) setSubmissionId(saved.submissionId);
      if (saved.scheduleNo) setScheduleNo(saved.scheduleNo);
      if (saved.cutInDate) setCutInDate(saved.cutInDate);
      if (saved.inQty) setInQty(saved.inQty);
      if (saved.cuts) setCuts(saved.cuts);
      if (saved.stagedEntries) setStagedEntries(saved.stagedEntries);
    }
  );

  // --- Next cut number for this style+schedule (continuing from existing DB + staged cuts) ---
  const existingCutCount = useMemo(() => {
    if (!submissionId || !scheduleNo.trim()) return 0;
    const sched = scheduleNo.trim().toLowerCase();

    // Count cuts already saved in DB for THIS submission+schedule
    const dbCuts = storeInRecords
      .filter((r) => r.submissionId === submissionId
                  && r.scheduleNo.toLowerCase() === sched
                  && r.id !== editingId)
      .reduce((sum, r) => sum + (r.cuts?.length || 0), 0);

    // Count cuts from staged entries (not yet saved to DB)
    const stagedCuts = stagedEntries
      .filter((e) => e.submissionId === submissionId
                  && e.scheduleNo.toLowerCase() === sched)
      .reduce((sum, e) => sum + (e.cuts?.length || 0), 0);

    return dbCuts + stagedCuts;
  }, [submissionId, scheduleNo, storeInRecords, stagedEntries, editingId]);

  // --- Auto-renumber the cuts in the form whenever the starting offset changes ---
  useEffect(() => {
    setCuts((prev) => prev.map((cut, idx) => ({
      ...cut,
      cutNo: `Cut ${existingCutCount + idx + 1}`,
    })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingCutCount]);

  const totalCutQty = cuts.reduce((sum, c) => sum + (parseInt(c.cutQty) || 0), 0);
  const uncutBalance = Math.max(0, inQtyNum - totalCutQty);

  // Remaining bulk accounts for staged entries
  const stagedInQtyForSubmission = stagedEntries
    .filter((e) => e.submissionId === submissionId)
    .reduce((sum, e) => sum + e.inQty, 0);
  const remainingBulk = (selectedItem?.remainingBulkQty ?? 0) - stagedInQtyForSubmission;

  // --- Handle style selection ---
  const handleStyleChange = (newSubmissionId: string) => {
    setSubmissionId(newSubmissionId);
    setScheduleNo('');
    if (errors.submissionId) setErrors((prev) => ({ ...prev, submissionId: '' }));
    if (errors.scheduleNo) setErrors((prev) => ({ ...prev, scheduleNo: '' }));
    if (pageError) setPageError('');
  };

  // --- Cut management (auto-numbered) ---
  const addCut = () => {
    const nextCutNum = existingCutCount + cuts.length + 1;
    setCuts((prev) => [...prev, makeCutRow(nextCutNum)]);
  };

  const removeCut = (tempId: string) => {
    setCuts((prev) => {
      const filtered = prev.filter((c) => c.tempId !== tempId);
      return filtered.map((c, idx) => ({ ...c, cutNo: `Cut ${existingCutCount + idx + 1}` }));
    });
  };

  const updateCutField = (tempId: string, field: string, value: string) => {
    setCuts((prev) => prev.map((c) => (c.tempId === tempId ? { ...c, [field]: value } : c)));
  };

  const toggleCutExpanded = (tempId: string) => {
    setCuts((prev) => prev.map((c) => (c.tempId === tempId ? { ...c, expanded: !c.expanded } : c)));
  };

  // --- Bundle management ---
  const addBundle = (cutTempId: string) => {
    setCuts((prev) =>
      prev.map((c) => {
        if (c.tempId !== cutTempId) return c;
        const nextBundleNum = c.bundles.length + 1;
        return { ...c, bundles: [...c.bundles, makeBundleRow(nextBundleNum)] };
      })
    );
  };

  const removeBundle = (cutTempId: string, bundleTempId: string) => {
    setCuts((prev) =>
      prev.map((c) =>
        c.tempId === cutTempId
          ? { ...c, bundles: c.bundles.filter((b) => b.tempId !== bundleTempId) }
          : c
      )
    );
  };

  const updateBundleField = (cutTempId: string, bundleTempId: string, field: string, value: string) => {
    setCuts((prev) =>
      prev.map((c) =>
        c.tempId === cutTempId
          ? { ...c, bundles: c.bundles.map((b) => (b.tempId === bundleTempId ? { ...b, [field]: value } : b)) }
          : c
      )
    );
  };

  // --- Schedule duplicate check ---

  // --- Validation ---
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!submissionId) newErrors.submissionId = 'Please select an approved style';
    if (!scheduleNo.trim()) newErrors.scheduleNo = 'Schedule No is required';
    if (!cutInDate) newErrors.cutInDate = 'Cut In Date is required';

    // Note: duplicate schedule is now ALLOWED — cuts auto-number continuing from existing ones

    if (inQtyNum <= 0) {
      newErrors.inQty = 'IN Qty must be greater than 0';
    } else if (inQtyNum > remainingBulk && !editingId) {
      newErrors.inQty = `Exceeds remaining bulk balance (${remainingBulk})`;
    }

    if (cuts.length === 0) newErrors.cuts = 'At least one cut is required';

    if (totalCutQty > inQtyNum && inQtyNum > 0)
      newErrors.cuts = `Total cut qty (${totalCutQty}) exceeds IN qty (${inQtyNum})`;

    cuts.forEach((cut, ci) => {
      if (!cut.cutNo.trim()) newErrors[`cut_${ci}_cutNo`] = 'Required';
      const cq = parseInt(cut.cutQty) || 0;
      if (cq <= 0) newErrors[`cut_${ci}_cutQty`] = 'Must be > 0';

      if (cut.bundles.length === 0) newErrors[`cut_${ci}_bundles`] = 'At least one bundle required';

      const totalBundleQty = cut.bundles.reduce((s, b) => s + (parseInt(b.bundleQty) || 0), 0);
      if (cq > 0 && totalBundleQty !== cq) {
        if (totalBundleQty > cq) {
          newErrors[`cut_${ci}_bundles`] = `Bundle total (${totalBundleQty}) exceeds cut qty (${cq})`;
        } else {
          newErrors[`cut_${ci}_bundles`] = `Bundle total (${totalBundleQty}) must equal cut qty (${cq}). Unbundled: ${cq - totalBundleQty}`;
        }
      }

      const bundleNos = cut.bundles.map((b) => b.bundleNo.trim().toLowerCase());
      if (bundleNos.length !== new Set(bundleNos).size)
        newErrors[`cut_${ci}_bundles`] = 'Duplicate bundle numbers found within this cut.';

      cut.bundles.forEach((bundle, bi) => {
        if (!bundle.bundleNo.trim()) newErrors[`cut_${ci}_b_${bi}_no`] = 'Required';
        if ((parseInt(bundle.bundleQty) || 0) <= 0) newErrors[`cut_${ci}_b_${bi}_qty`] = '> 0';
        if (!bundle.size) newErrors[`cut_${ci}_b_${bi}_size`] = 'Required';
        if (!bundle.numberRange.trim()) newErrors[`cut_${ci}_b_${bi}_range`] = 'Required';
      });
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const resetForm = () => {
    setSubmissionId('');
    setScheduleNo('');
    setCutInDate('');
    setInQty('');
    setCuts([makeCutRow(1)]);
    setEditingId(null);
    setErrors({});
    setPageError('');
    clearDraft();
  };

  // --- SAVE TO TABLE (staging) ---
  const handleSaveToTable = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm() || !selectedItem) return;

    const entry: StagedEntry = {
      tempId: crypto.randomUUID(),
      submissionId,
      styleNo: selectedItem.styleNo,
      customerName: selectedItem.customerName,
      bodyColour: selectedItem.bodyColour,
      printColour: selectedItem.printColour,
      season: selectedItem.season,
      components: selectedItem.components,
      scheduleNo: scheduleNo.trim(),
      cutInDate,
      approvedBulkQty: selectedItem.approvedBulkQty,
      inQty: inQtyNum,
      cuts: cuts.map((c) => ({
        cutNo: c.cutNo.trim(),
        cutQty: parseInt(c.cutQty) || 0,
        bundles: c.bundles.map((b) => ({
          bundleNo: b.bundleNo.trim(),
          bundleQty: parseInt(b.bundleQty) || 0,
          size: b.size,
          numberRange: b.numberRange.trim(),
        })),
      })),
    };

    setStagedEntries((prev) => [...prev, entry]);
    setSuccessMsg('Added to staging table. Add more or save all to database.');
    setTimeout(() => setSuccessMsg(''), 4000);

    // Reset form but keep submissionId
    setScheduleNo('');
    setCutInDate('');
    setInQty('');
    setCuts([makeCutRow(1)]);
    setErrors({});
    setPageError('');
  };

  const removeStagedEntry = (tempId: string) => {
    setStagedEntries((prev) => prev.filter((e) => e.tempId !== tempId));
  };

  // --- SAVE TO DATABASE ---
  const handleSaveToDatabase = async () => {
    if (stagedEntries.length === 0) return;
    setIsSavingToDb(true);
    setPageError('');

    try {
      for (const entry of stagedEntries) {
        await addStoreInRecord({
          submissionId: entry.submissionId,
          scheduleNo: entry.scheduleNo,
          cutInDate: entry.cutInDate,
          inQty: entry.inQty,
          cuts: entry.cuts,
        });
      }
      const count = stagedEntries.length;
      setStagedEntries([]);
      clearDraft();
      resetForm();
      await Promise.all([fetchRecords(), fetchEligibleStoreInItems(), fetchBulkBalances()]);
      setSuccessMsg(`Successfully saved ${count} entry(ies) to database.`);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Failed to save to database.');
    } finally {
      setIsSavingToDb(false);
    }
  };

  // --- Direct submit for EDIT mode ---
  const handleDirectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsSaving(true);
    setPageError('');

    try {
      await updateStoreInRecord(editingId!, {
        submissionId,
        scheduleNo: scheduleNo.trim(),
        cutInDate,
        inQty: inQtyNum,
        cuts: cuts.map((c) => ({
          cutNo: c.cutNo.trim(),
          cutQty: parseInt(c.cutQty) || 0,
          bundles: c.bundles.map((b) => ({
            bundleNo: b.bundleNo.trim(),
            bundleQty: parseInt(b.bundleQty) || 0,
            size: b.size,
            numberRange: b.numberRange.trim(),
          })),
        })),
      });
      resetForm();
      await Promise.all([fetchRecords(), fetchEligibleStoreInItems(), fetchBulkBalances()]);
      setSuccessMsg('Record updated successfully.');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Failed to save.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (record: StoreInRecord) => {
    setSubmissionId(record.submissionId);
    setScheduleNo(record.scheduleNo);
    setCutInDate(record.cutInDate);
    setInQty(record.inQty.toString());
    setCuts(
      record.cuts.map((c) => ({
        tempId: crypto.randomUUID(),
        cutNo: c.cutNo,
        cutQty: c.cutQty.toString(),
        expanded: true,
        bundles: c.bundles.map((b) => ({
          tempId: crypto.randomUUID(),
          bundleNo: b.bundleNo,
          bundleQty: b.bundleQty.toString(),
          size: b.size,
          numberRange: b.numberRange,
        })),
      }))
    );
    setEditingId(record.id);
    setErrors({});
    setPageError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this store-in record and all its cuts/bundles?')) return;
    try {
      await deleteStoreInRecord(id);
      await Promise.all([fetchRecords(), fetchEligibleStoreInItems(), fetchBulkBalances()]);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Failed to delete.');
    }
  };

  // Unique datalist id per render to avoid cross-instance conflicts
  const scheduleDatalistId = `schedule-suggestions-${submissionId || 'none'}`;

  // ==========================================
  // RENDER
  // ==========================================
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-6xl space-y-8 pb-12">
<DraftRestoredToast
        visible={draftRestored}
        onDismiss={dismissDraftNotice}
        onDiscard={() => { clearDraft(); resetForm(); }}
      />

            {/* Page Header */}
      <div className="flex items-center space-x-3 border-b border-slate-200 pb-4">
        <div className="rounded-lg bg-orange-100 p-2">
          <PackageOpen className="h-6 w-6 text-orange-700" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Store In (Receiving)</h2>
          <p className="text-sm text-slate-500">
            Receive goods against approved styles. Build entries in the staging table, then save all at once.
          </p>
        </div>
      </div>

      {/* Global Bulk Balance Cards */}
      {bulkBalances.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {bulkBalances.map((bal) => (
            <div key={bal.submissionId} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500">{bal.customerName}</p>
                  <p className="text-sm font-bold text-slate-900">{bal.styleNo}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-wide text-slate-400">Remaining bulk</p>
                  <p className={`text-lg font-black ${bal.remainingBulkQty > 0 ? 'text-blue-700' : 'text-emerald-600'}`}>{bal.remainingBulkQty}</p>
                </div>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${Math.min(100, bal.approvedBulkQty > 0 ? (bal.totalInQty / bal.approvedBulkQty) * 100 : 0)}%` }} />
              </div>
              <div className="mt-1 flex justify-between text-[10px] text-slate-400">
                <span>Received: {bal.totalInQty}</span>
                <span>Approved: {bal.approvedBulkQty}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Messages */}
      {pageError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          <AlertCircle className="mr-1 inline h-4 w-4" />{pageError}
        </div>
      )}
      {successMsg && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <CheckCircle2 className="mr-1 inline h-4 w-4" />{successMsg}
        </div>
      )}

      {/* ==========================================
          FORM
          ========================================== */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-800">{editingId ? 'Edit Store-In Entry' : 'New Store-In Entry'}</h3>
          {editingId && <span className="animate-pulse rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">EDIT MODE</span>}
        </div>

        <form onSubmit={editingId ? handleDirectSubmit : handleSaveToTable} className="space-y-6">
          {/* Style & Schedule */}
          <div className="rounded-lg border border-blue-200 bg-blue-50/60 p-5 space-y-4">
            <h4 className="border-b border-blue-200 pb-2 text-sm font-bold uppercase tracking-wider text-blue-800">Style & Schedule</h4>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1 lg:col-span-2">
                <label className="block text-xs font-medium text-slate-600">Approved Style <span className="text-red-500">*</span></label>
                <select value={submissionId} onChange={(e) => handleStyleChange(e.target.value)} disabled={!!editingId}
                  className={`w-full rounded-lg border px-3 py-2 text-sm outline-none bg-white ${errors.submissionId ? 'border-red-400 bg-red-50' : 'border-slate-300 focus:ring-2 focus:ring-blue-500'} ${editingId ? 'cursor-not-allowed bg-slate-100' : ''}`}>
                  <option value="" disabled>Select an approved style...</option>
                  {eligibleStoreInItems.map((item) => (
                    <option key={item.submissionId} value={item.submissionId}>
                      {item.styleNo} | {item.customerName} | Bulk: {item.approvedBulkQty} | Remaining: {item.remainingBulkQty}
                    </option>
                  ))}
                </select>
                {errors.submissionId && <p className="text-[11px] text-red-600"><AlertCircle className="mr-1 inline h-3 w-3" />{errors.submissionId}</p>}
              </div>

              {/* ── SCHEDULE NO — free-text input with datalist suggestions ── */}
              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-600">
                  Schedule No <span className="text-red-500">*</span>
                </label>
                {/*
                  A plain <input> lets the user type any new schedule number freely.
                  The <datalist> provides autocomplete suggestions from schedules that
                  already exist for this style — but does NOT restrict input to them.
                  This was the bug: the old <select> had no way to enter a brand-new
                  schedule number when none existed yet.
                */}
                <input
                  type="text"
                  list={scheduleDatalistId}
                  value={scheduleNo}
                  onChange={(e) => {
                    setScheduleNo(e.target.value);
                    if (errors.scheduleNo) setErrors((p) => ({ ...p, scheduleNo: '' }));
                  }}
                  disabled={!selectedItem}
                  placeholder={selectedItem ? 'Type or pick a schedule…' : 'Select style first…'}
                  autoComplete="off"
                  className={`w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none ${
                    errors.scheduleNo
                      ? 'border-red-400 bg-red-50'
                      : 'border-slate-300 focus:ring-2 focus:ring-blue-500'
                  } ${!selectedItem ? 'cursor-not-allowed bg-slate-100 text-slate-400' : ''}`}
                />
                {/* Datalist: suggestions only — user is not limited to these */}
                <datalist id={scheduleDatalistId}>
                  {existingScheduleOptions.map((sched) => (
                    <option key={sched} value={sched} />
                  ))}
                </datalist>

                {/* Contextual hints */}
                {selectedItem && existingScheduleOptions.length > 0 && !scheduleNo && (
                  <p className="text-[10px] text-slate-400">
                    {existingScheduleOptions.length} existing schedule{existingScheduleOptions.length > 1 ? 's' : ''} — type to search or enter a new one.
                  </p>
                )}
                {selectedItem && existingScheduleOptions.length === 0 && !scheduleNo && (
                  <p className="text-[10px] text-blue-600">
                    No schedules yet for this style — type a new schedule number to create one.
                  </p>
                )}
                {errors.scheduleNo && (
                  <p className="text-[11px] text-red-600">
                    <AlertCircle className="mr-1 inline h-3 w-3" />{errors.scheduleNo}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-600">Cut In Date <span className="text-red-500">*</span></label>
                <input type="date" value={cutInDate} onChange={(e) => { setCutInDate(e.target.value); if (errors.cutInDate) setErrors((p) => ({ ...p, cutInDate: '' })); }}
                  className={`w-full rounded-lg border px-3 py-2 text-sm outline-none ${errors.cutInDate ? 'border-red-400 bg-red-50' : 'border-slate-300 focus:ring-2 focus:ring-blue-500'}`} />
                {errors.cutInDate && <p className="text-[11px] text-red-600"><AlertCircle className="mr-1 inline h-3 w-3" />{errors.cutInDate}</p>}
              </div>
            </div>

            {selectedItem && (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4 mt-2">
                <ReadOnlyField label="Customer" value={selectedItem.customerName} />
                <ReadOnlyField label="Body Colour" value={selectedItem.bodyColour} />
                <ReadOnlyField label="Print Colour" value={selectedItem.printColour} />
                <ReadOnlyField label="Season" value={selectedItem.season} />
              </div>
            )}
          </div>

          {/* Quantities */}
          <div className="rounded-lg border border-orange-200 bg-orange-50/60 p-5 space-y-4">
            <h4 className="border-b border-orange-200 pb-2 text-sm font-bold uppercase tracking-wider text-orange-800">Quantities</h4>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-600">IN Qty <span className="text-red-500">*</span></label>
                <input type="number" value={inQty} onChange={(e) => { setInQty(e.target.value); if (errors.inQty) setErrors((p) => ({ ...p, inQty: '' })); }} placeholder="e.g. 500" min="1"
                  className={`w-full rounded-lg border px-3 py-2 text-sm font-bold outline-none ${errors.inQty ? 'border-red-400 bg-red-50' : 'border-slate-300 focus:ring-2 focus:ring-orange-500'}`} />
                {errors.inQty && <p className="text-[11px] text-red-600"><AlertCircle className="mr-1 inline h-3 w-3" />{errors.inQty}</p>}
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-500">Approved Bulk</label>
                <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700">{selectedItem?.approvedBulkQty ?? '-'}</div>
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-500">Remaining Bulk</label>
                <div className={`rounded-lg border px-3 py-2 text-sm font-black ${remainingBulk > 0 ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>{selectedItem ? remainingBulk : '-'}</div>
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-500">Uncut Balance</label>
                <div className={`rounded-lg border px-3 py-2 text-sm font-bold ${uncutBalance > 0 ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-slate-200 bg-white text-slate-500'}`}>{inQtyNum > 0 ? uncutBalance : '-'}</div>
              </div>
            </div>
          </div>

          {/* Cuts & Bundles */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold uppercase tracking-wider text-slate-700">Cuts & Bundles</h4>
              <button type="button" onClick={addCut} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors">
                <Plus className="h-3.5 w-3.5" /> Add Cut
              </button>
            </div>
            {errors.cuts && <p className="text-[11px] text-red-600"><AlertCircle className="mr-1 inline h-3 w-3" />{errors.cuts}</p>}

            <AnimatePresence>
              {cuts.map((cut, ci) => {
                const cutQtyNum = parseInt(cut.cutQty) || 0;
                const totalBundleQty = cut.bundles.reduce((s, b) => s + (parseInt(b.bundleQty) || 0), 0);
                const bundleBalance = Math.max(0, cutQtyNum - totalBundleQty);
                return (
                  <motion.div key={cut.tempId} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="rounded-lg border border-slate-200 bg-white overflow-hidden">
                    <div className="flex items-center gap-3 bg-slate-50 px-4 py-3">
                      <button type="button" onClick={() => toggleCutExpanded(cut.tempId)} className="text-slate-400 hover:text-slate-600">
                        {cut.expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </button>
                      <Layers className="h-4 w-4 text-slate-400" />
                      <div className="flex items-center gap-3 flex-1">
                        <div className="space-y-0.5">
                          <label className="block text-[10px] font-medium text-slate-500">Cut No</label>
                          <div className="w-24 rounded border border-slate-200 bg-slate-100 px-2 py-1 text-sm font-bold text-slate-700 cursor-not-allowed">{cut.cutNo}</div>
                        </div>
                        <div className="space-y-0.5">
                          <label className="block text-[10px] font-medium text-slate-500">Cut Qty <span className="text-red-500">*</span></label>
                          <input type="number" value={cut.cutQty} onChange={(e) => updateCutField(cut.tempId, 'cutQty', e.target.value)} placeholder="250" min="1"
                            className={`w-24 rounded border px-2 py-1 text-sm font-bold outline-none ${errors[`cut_${ci}_cutQty`] ? 'border-red-400 bg-red-50' : 'border-slate-300 focus:ring-1 focus:ring-blue-400'}`} />
                          {errors[`cut_${ci}_cutQty`] && <p className="text-[10px] text-red-500">{errors[`cut_${ci}_cutQty`]}</p>}
                        </div>
                        <div className="text-xs text-slate-500">
                          Bundles: <span className="font-bold text-slate-700">{cut.bundles.length}</span>
                          {cutQtyNum > 0 && (
                            <span className="ml-2">Unbundled: <span className={`font-bold ${bundleBalance > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>{bundleBalance}</span></span>
                          )}
                        </div>
                      </div>
                      {cuts.length > 1 && (
                        <button type="button" onClick={() => removeCut(cut.tempId)} className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"><X className="h-4 w-4" /></button>
                      )}
                    </div>

                    {cut.expanded && (
                      <div className="px-4 py-3 space-y-2">
                        {errors[`cut_${ci}_bundles`] && <p className="text-[11px] text-red-600"><AlertCircle className="mr-1 inline h-3 w-3" />{errors[`cut_${ci}_bundles`]}</p>}
                        <div className="grid grid-cols-12 gap-2 text-[10px] font-bold uppercase tracking-wide text-slate-400 px-1">
                          <div className="col-span-2">Bundle No <span className="text-red-400">*</span></div>
                          <div className="col-span-2">Bundle Qty <span className="text-red-400">*</span></div>
                          <div className="col-span-2">Size <span className="text-red-400">*</span></div>
                          <div className="col-span-3">Number Range <span className="text-red-400">*</span></div>
                          <div className="col-span-3"></div>
                        </div>
                        {cut.bundles.map((bundle, bi) => (
                          <div key={bundle.tempId} className="grid grid-cols-12 gap-2 items-start">
                            <div className="col-span-2">
                              <input type="text" value={bundle.bundleNo} onChange={(e) => updateBundleField(cut.tempId, bundle.tempId, 'bundleNo', e.target.value)} placeholder="B001"
                                className={`w-full rounded border px-2 py-1.5 text-xs outline-none ${errors[`cut_${ci}_b_${bi}_no`] ? 'border-red-400 bg-red-50' : 'border-slate-200 focus:ring-1 focus:ring-blue-400'}`} />
                              {errors[`cut_${ci}_b_${bi}_no`] && <p className="text-[9px] text-red-500 mt-0.5">{errors[`cut_${ci}_b_${bi}_no`]}</p>}
                            </div>
                            <div className="col-span-2">
                              <input type="number" value={bundle.bundleQty} onChange={(e) => updateBundleField(cut.tempId, bundle.tempId, 'bundleQty', e.target.value)} placeholder="125" min="1"
                                className={`w-full rounded border px-2 py-1.5 text-xs font-bold outline-none ${errors[`cut_${ci}_b_${bi}_qty`] ? 'border-red-400 bg-red-50' : 'border-slate-200 focus:ring-1 focus:ring-blue-400'}`} />
                              {errors[`cut_${ci}_b_${bi}_qty`] && <p className="text-[9px] text-red-500 mt-0.5">{errors[`cut_${ci}_b_${bi}_qty`]}</p>}
                            </div>
                            <div className="col-span-2">
                              <select value={bundle.size} onChange={(e) => updateBundleField(cut.tempId, bundle.tempId, 'size', e.target.value)}
                                className={`w-full rounded border px-2 py-1.5 text-xs outline-none ${errors[`cut_${ci}_b_${bi}_size`] ? 'border-red-400 bg-red-50' : 'border-slate-200 focus:ring-1 focus:ring-blue-400'}`}>
                                <option value="">Size...</option>
                                {SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
                              </select>
                              {errors[`cut_${ci}_b_${bi}_size`] && <p className="text-[9px] text-red-500 mt-0.5">{errors[`cut_${ci}_b_${bi}_size`]}</p>}
                            </div>
                            <div className="col-span-3">
                              <input type="text" value={bundle.numberRange} onChange={(e) => updateBundleField(cut.tempId, bundle.tempId, 'numberRange', e.target.value)} placeholder="001-125"
                                className={`w-full rounded border px-2 py-1.5 text-xs outline-none ${errors[`cut_${ci}_b_${bi}_range`] ? 'border-red-400 bg-red-50' : 'border-slate-200 focus:ring-1 focus:ring-blue-400'}`} />
                              {errors[`cut_${ci}_b_${bi}_range`] && <p className="text-[9px] text-red-500 mt-0.5">{errors[`cut_${ci}_b_${bi}_range`]}</p>}
                            </div>
                            <div className="col-span-3 flex items-center gap-1">
                              {cut.bundles.length > 1 && (
                                <button type="button" onClick={() => removeBundle(cut.tempId, bundle.tempId)} className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
                              )}
                            </div>
                          </div>
                        ))}
                        <button type="button" onClick={() => addBundle(cut.tempId)} className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors">
                          <Plus className="h-3 w-3" /> Add Bundle
                        </button>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-3 border-t border-slate-200 pt-6">
            {editingId ? (
              <>
                <button type="submit" disabled={isSaving} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors disabled:opacity-50">
                  <Save className="h-4 w-4" />{isSaving ? 'Updating...' : 'Update Entry'}
                </button>
                <button type="button" onClick={resetForm} className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">Cancel Edit</button>
              </>
            ) : (
              <button type="submit" className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-amber-700 transition-colors">
                <TableProperties className="h-4 w-4" />Save to Table
              </button>
            )}
          </div>
        </form>
      </div>

      {/* ==========================================
          STAGING TABLE
          ========================================== */}
      {stagedEntries.length > 0 && (
        <div className="rounded-xl border-2 border-amber-300 bg-amber-50/50 shadow-sm overflow-hidden">
          <div className="border-b border-amber-200 bg-amber-100/60 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TableProperties className="h-5 w-5 text-amber-700" />
              <h3 className="text-lg font-semibold text-amber-900">Staging Table</h3>
              <span className="rounded-full bg-amber-200 px-2 py-0.5 text-xs font-bold text-amber-800">{stagedEntries.length} pending</span>
            </div>
            <button onClick={handleSaveToDatabase} disabled={isSavingToDb}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 transition-colors disabled:opacity-50">
              <Database className="h-4 w-4" />{isSavingToDb ? 'Saving...' : 'Save All to Database'}
            </button>
          </div>
          <div className="divide-y divide-amber-200">
            {stagedEntries.map((entry) => {
              const isExp = expandedStagedId === entry.tempId;
              const totalCut = entry.cuts.reduce((s, c) => s + c.cutQty, 0);
              return (
                <div key={entry.tempId}>
                  <div className="flex items-center gap-4 px-6 py-4 hover:bg-amber-50 cursor-pointer transition-colors" onClick={() => setExpandedStagedId(isExp ? null : entry.tempId)}>
                    {isExp ? <ChevronDown className="h-4 w-4 text-amber-500 shrink-0" /> : <ChevronRight className="h-4 w-4 text-amber-500 shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-slate-900">{entry.styleNo}</p>
                        <span className="text-xs text-slate-500">{entry.customerName}</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">Sch: {entry.scheduleNo} | Date: {entry.cutInDate} | {entry.bodyColour}</p>
                    </div>
                    <div className="text-right space-y-0.5 shrink-0">
                      <div className="text-xs">IN: <span className="font-bold text-orange-600">{entry.inQty}</span></div>
                      <div className="text-xs">Cuts: <span className="font-bold">{entry.cuts.length}</span> | Cut Qty: <span className="font-bold">{totalCut}</span></div>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); removeStagedEntry(entry.tempId); }} className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors shrink-0" title="Remove"><Trash2 className="h-4 w-4" /></button>
                  </div>
                  <AnimatePresence>
                    {isExp && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="border-t border-amber-200 bg-white px-6 py-4 overflow-hidden">
                        {entry.cuts.map((cut) => (
                          <div key={cut.cutNo} className="mb-3 last:mb-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Layers className="h-3.5 w-3.5 text-slate-400" />
                              <span className="text-sm font-bold text-slate-700">{cut.cutNo}</span>
                              <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-600">Qty: {cut.cutQty}</span>
                            </div>
                            <div className="ml-6 border-l-2 border-slate-200 pl-4">
                              <table className="w-full text-xs"><thead><tr className="text-slate-400"><th className="py-1 text-left font-medium">Bundle</th><th className="py-1 text-left font-medium">Qty</th><th className="py-1 text-left font-medium">Size</th><th className="py-1 text-left font-medium">Range</th></tr></thead>
                                <tbody>{cut.bundles.map((b, bi) => (<tr key={bi} className="text-slate-700"><td className="py-0.5 font-medium">{b.bundleNo}</td><td className="py-0.5 font-bold">{b.bundleQty}</td><td className="py-0.5">{b.size}</td><td className="py-0.5 text-slate-500">{b.numberRange}</td></tr>))}</tbody>
                              </table>
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
        </div>
      )}

      {/* ==========================================
          RECORDS TABLE WITH SEARCH & DATE FILTER
          ========================================== */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50 px-6 py-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-800">Store-In Records</h3>
            <button type="button" onClick={() => setShowFilters(!showFilters)}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${showFilters ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}>
              <Filter className="h-3.5 w-3.5" />{showFilters ? 'Hide Filters' : 'Filters'}
            </button>
          </div>

          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input type="text" value={searchText} onChange={(e) => { setSearchText(e.target.value); setCurrentPage(1); }} placeholder="Search by style, customer, schedule..."
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm outline-none transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10" />
          </div>

          <AnimatePresence>
            {showFilters && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <div className="flex flex-wrap items-end gap-3 pt-2">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-medium uppercase tracking-wide text-slate-400"><Calendar className="mr-1 inline h-3 w-3" />Cut In Date From</label>
                    <input type="date" value={filterDateFrom} onChange={(e) => { setFilterDateFrom(e.target.value); setCurrentPage(1); }} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-blue-400" />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-medium uppercase tracking-wide text-slate-400"><Calendar className="mr-1 inline h-3 w-3" />Cut In Date To</label>
                    <input type="date" value={filterDateTo} onChange={(e) => { setFilterDateTo(e.target.value); setCurrentPage(1); }} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-blue-400" />
                  </div>
                  <button type="button" onClick={() => { setFilterDateFrom(''); setFilterDateTo(''); setSearchText(''); setCurrentPage(1); }}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors">Clear All</button>
                  <div className="ml-auto text-xs text-slate-500">Showing {filteredRecords.length} of {storeInRecords.length} records</div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {totalPages > 1 && (
            <div className="flex items-center justify-end gap-2 text-xs text-slate-500 pt-1">
              <span>Page {safePage} of {totalPages}</span>
              <div className="flex gap-0.5">
                <button onClick={() => setCurrentPage(Math.max(1, safePage - 1))} disabled={safePage <= 1} className="rounded px-2 py-1 border border-slate-200 hover:bg-slate-100 disabled:opacity-30">Prev</button>
                <button onClick={() => setCurrentPage(Math.min(totalPages, safePage + 1))} disabled={safePage >= totalPages} className="rounded px-2 py-1 border border-slate-200 hover:bg-slate-100 disabled:opacity-30">Next</button>
              </div>
            </div>
          )}
        </div>

        {storeInRecords.length === 0 ? (
          <div className="py-16 text-center text-slate-400"><PackageOpen className="mx-auto mb-3 h-12 w-12 opacity-20" /><p>No store-in records yet.</p></div>
        ) : filteredRecords.length === 0 ? (
          <div className="py-12 text-center text-slate-400">No records match your search.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {paginatedRecords.map((record) => {
              const isExpanded = expandedRecordId === record.id;
              return (
                <div key={record.id}>
                  <div className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50/50 cursor-pointer transition-colors" onClick={() => setExpandedRecordId(isExpanded ? null : record.id)}>
                    {isExpanded ? <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" /> : <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-slate-900">{record.styleNo}</p>
                        <span className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700"><GitBranch className="h-2.5 w-2.5" />Rev {record.revisionNo}</span>
                        <span className="text-xs text-slate-500">{record.customerName}</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">Sch: {record.scheduleNo} | Date: {record.cutInDate} | {record.bodyColour} / {record.season}</p>
                    </div>
                    <div className="text-right space-y-0.5 shrink-0">
                      <div className="text-xs text-slate-500">IN: <span className="font-bold text-orange-600">{record.inQty}</span></div>
                      <div className="text-xs text-slate-500">Cuts: <span className="font-bold text-slate-700">{record.cuts.length}</span> | Cut Qty: <span className="font-bold">{record.totalCutQty}</span></div>
                      <div className="text-xs">Balance: <span className="font-bold text-blue-700">{record.balanceBulkQty}</span></div>
                      {record.uncutBalance > 0 && (
                        <div className="mt-0.5">
                          <span className="rounded-full bg-amber-100 border border-amber-300 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                            Uncut: {record.uncutBalance} — Edit to add cuts
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      {locks[record.id]?.isLocked ? (
                        <div className="flex items-center gap-1" title="This record has downstream data and cannot be modified."><Lock className="h-4 w-4 text-slate-300" /><span className="text-[10px] text-slate-400">Locked</span></div>
                      ) : (
                        <>
                          <button onClick={() => handleEdit(record)} className="rounded p-1.5 text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-colors" title="Edit"><Edit2 className="h-4 w-4" /></button>
                          <button onClick={() => handleDelete(record.id)} className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors" title="Delete"><Trash2 className="h-4 w-4" /></button>
                        </>
                      )}
                    </div>
                  </div>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="border-t border-slate-100 bg-slate-50/50 px-6 py-4 overflow-hidden">
                        <div className="grid grid-cols-2 gap-3 md:grid-cols-5 mb-4">
                          <MiniStat label="Approved Bulk" value={record.bulkQty} />
                          <MiniStat label="IN Qty" value={record.inQty} color="orange" />
                          <MiniStat label="Bulk Balance" value={record.balanceBulkQty} color="blue" />
                          <MiniStat label="Total Cut Qty" value={record.totalCutQty} />
                          <MiniStat label="Available (Shelf)" value={record.availableQty} color="green" />
                        </div>
                        {record.cuts.map((cut) => (
                          <div key={cut.id} className="mb-3 last:mb-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Layers className="h-3.5 w-3.5 text-slate-400" />
                              <span className="text-sm font-bold text-slate-700">{cut.cutNo}</span>
                              <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-600">Qty: {cut.cutQty}</span>
                              <span className="text-[10px] text-slate-400">{cut.bundles.length} bundle{cut.bundles.length !== 1 ? 's' : ''}</span>
                            </div>
                            <div className="ml-6 border-l-2 border-slate-200 pl-4">
                              <table className="w-full text-xs"><thead><tr className="text-slate-400"><th className="py-1 text-left font-medium">Bundle</th><th className="py-1 text-left font-medium">Qty</th><th className="py-1 text-left font-medium">Size</th><th className="py-1 text-left font-medium">Range</th></tr></thead>
                                <tbody>{cut.bundles.map((b) => (<tr key={b.id} className="text-slate-700"><td className="py-0.5 font-medium">{b.bundleNo}</td><td className="py-0.5 font-bold">{b.bundleQty}</td><td className="py-0.5">{b.size}</td><td className="py-0.5 text-slate-500">{b.numberRange}</td></tr>))}</tbody>
                              </table>
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
// HELPER COMPONENTS
// ==========================================
function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <label className="block text-[10px] font-medium uppercase tracking-wide text-slate-400">{label}</label>
      <p className="text-sm font-medium text-slate-700">{value || '-'}</p>
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string; value: number; color?: 'orange' | 'blue' | 'green' }) {
  const colorClass = color === 'orange' ? 'text-orange-700' : color === 'blue' ? 'text-blue-700' : color === 'green' ? 'text-emerald-700' : 'text-slate-700';
  return (
    <div className="rounded-lg bg-white border border-slate-200 px-3 py-2">
      <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`text-lg font-black ${colorClass}`}>{value}</p>
    </div>
  );
}