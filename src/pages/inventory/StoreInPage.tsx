// src/pages/inventory/StoreInPage.tsx
import { useState, useEffect, useMemo } from 'react';
import { useAutoDraft } from '../../hooks/useAutoDraft';
import DraftRestoredToast from '../../components/DraftRestoredToast';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PackageOpen, Plus, Trash2, Edit2, AlertCircle, Save, GitBranch,
  CheckCircle2, ChevronDown, ChevronRight, Layers, X, Lock, Database,
  TableProperties, Search, Filter, Calendar, Pencil,
} from 'lucide-react';
import { useInventoryStore, StoreInRecord, EligibleStoreInItem } from '../../store/inventoryStore';
import { API, getAuthHeaders } from '../../api/client';

// ==========================================
// TYPES
// ==========================================
interface BundleFormRow {
  tempId: string;
  bundleNo: string;
  bundleQty: string;
  size: string;
  numberRange: string;
}

interface SavedCut {
  tempId: string;
  cutNo: string;
  component: string;
  submissionId: string;   // ← which component-submission this cut belongs to
  bodyColour: string;     // for display
  cutQty: number;
  bundles: { bundleNo: string; bundleQty: number; size: string; numberRange: string }[];
}

interface StagedEntry {
  tempId: string;
  styleNo: string;
  customerName: string;
  components: string;
  scheduleNo: string;
  cutInDate: string;
  inQty: number;
  cuts: { cutNo: string; cutQty: number; submissionId: string; bundles: { bundleNo: string; bundleQty: number; size: string; numberRange: string }[] }[];
}

interface StyleScheduleOption {
  styleNo: string;
  customerName: string;
  scheduleNo: string;
}

const makeBundleRow = (idx: number): BundleFormRow => ({
  tempId: crypto.randomUUID(),
  bundleNo: `B${String(idx).padStart(3, '0')}`,
  bundleQty: '', size: '', numberRange: '',
});

// ==========================================
// COMPONENT
// ==========================================
export default function StoreInPage() {
  const {
    storeInRecords, eligibleStoreInItems,
    addStoreInRecord, updateStoreInRecord, deleteStoreInRecord,
    fetchRecords, fetchEligibleStoreInItems, fetchBulkBalances, bulkBalances,
  } = useInventoryStore();

  // ── Style + Customer selection ────────────────────────────────────────────
  const [selectedStyleNo, setSelectedStyleNo]   = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState('');

  // ── Schedule / date ───────────────────────────────────────────────────────
  const [scheduleNo, setScheduleNo] = useState('');
  const [cutInDate, setCutInDate]   = useState('');

  // ── Active cut builder ────────────────────────────────────────────────────
  const [activeSubmissionId, setActiveSubmissionId] = useState(''); // which component
  const [activeCutBundles, setActiveCutBundles]     = useState<BundleFormRow[]>([makeBundleRow(1)]);
  const [activeCutQty, setActiveCutQty]             = useState('');
  const [editingCutTempId, setEditingCutTempId]     = useState<string | null>(null);

  // ── Cut summary ───────────────────────────────────────────────────────────
  const [savedCuts, setSavedCuts] = useState<SavedCut[]>([]);

  // ── Staging + records ─────────────────────────────────────────────────────
  const [stagedEntries, setStagedEntries]       = useState<StagedEntry[]>([]);
  const [expandedStagedId, setExpandedStagedId] = useState<string | null>(null);

  // ── UI state ──────────────────────────────────────────────────────────────
  const [editingRecordId, setEditingRecordId]   = useState<string | null>(null);
  const [errors, setErrors]                     = useState<Record<string, string>>({});
  const [cutErrors, setCutErrors]               = useState<Record<string, string>>({});
  const [pageError, setPageError]               = useState('');
  const [successMsg, setSuccessMsg]             = useState('');
  const [isSaving, setIsSaving]                 = useState(false);
  const [isSavingToDb, setIsSavingToDb]         = useState(false);
  const [expandedRecordId, setExpandedRecordId] = useState<string | null>(null);
  const [locks, setLocks]                       = useState<Record<string, { isLocked: boolean }>>({});
  const [systemStyleSchedules, setSystemStyleSchedules] = useState<StyleScheduleOption[]>([]);

  // Search / filter
  const [searchText, setSearchText]         = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo]     = useState('');
  const [showFilters, setShowFilters]       = useState(false);
  const [currentPage, setCurrentPage]       = useState(1);
  const pageSize = 25;

  // ── Load data ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const styleResPromise = fetch(`${API.BASE}/api/dashboard/styles`, { headers: getAuthHeaders() });
        await Promise.all([fetchRecords(), fetchEligibleStoreInItems(), fetchBulkBalances()]);
        const lockRes = await fetch(`${API.INVENTORY}/store-in/locks`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        if (lockRes.ok) setLocks(await lockRes.json());
        const styleRes = await styleResPromise;
        if (styleRes.ok) setSystemStyleSchedules(await styleRes.json());
        else setSystemStyleSchedules([]);
      } catch (error) {
        setPageError(error instanceof Error ? error.message : 'Failed to load data.');
      }
    };
    load();
  }, [fetchRecords, fetchEligibleStoreInItems, fetchBulkBalances]);

  // ── Unique style numbers ──────────────────────────────────────────────────
  const uniqueStyleNos = useMemo(() =>
    Array.from(new Set(eligibleStoreInItems.map(i => i.styleNo))).sort(),
    [eligibleStoreInItems]);

  // ── Customers for selected style ──────────────────────────────────────────
  const customersForStyle = useMemo(() => {
    if (!selectedStyleNo) return [];
    return Array.from(new Set(
      eligibleStoreInItems.filter(i => i.styleNo === selectedStyleNo).map(i => i.customerName)
    )).sort();
  }, [eligibleStoreInItems, selectedStyleNo]);

  // ── All approved components for selected style + customer ─────────────────
  // Each item = one component-submission (Front/Red/1000, Back/Navy/800)
  const styleComponents = useMemo(() => {
    if (!selectedStyleNo || !selectedCustomer) return [];
    return eligibleStoreInItems.filter(i =>
      i.styleNo === selectedStyleNo && i.customerName === selectedCustomer
    );
  }, [eligibleStoreInItems, selectedStyleNo, selectedCustomer]);

  // ── Schedule suggestions ──────────────────────────────────────────────────
  const existingScheduleOptions = useMemo(() => {
    if (!selectedStyleNo || !selectedCustomer) return [];
    const inRecords = storeInRecords
      .filter(r => r.styleNo === selectedStyleNo && r.customerName === selectedCustomer && !!r.scheduleNo)
      .map(r => r.scheduleNo.trim());
    const inStaged = stagedEntries
      .filter(e => e.styleNo === selectedStyleNo && e.customerName === selectedCustomer && !!e.scheduleNo)
      .map(e => e.scheduleNo.trim());
    return Array.from(new Set([...inRecords, ...inStaged])).filter(Boolean).sort();
  }, [selectedStyleNo, selectedCustomer, storeInRecords, stagedEntries]);

  // ── Per-component IN Qty ─────────────────────────────────────────────────
  // Map of submissionId → IN Qty entered by the user
  const [componentInQty, setComponentInQty] = useState<Record<string, string>>({});

  const getComponentInQty = (submissionId: string) =>
    parseInt(componentInQty[submissionId] || '0') || 0;

  const setCompInQty = (submissionId: string, value: string) => {
    setComponentInQty(prev => ({ ...prev, [submissionId]: value }));
    if (errors.inQty) setErrors(p => ({ ...p, inQty: '' }));
  };

  // Total IN Qty = sum across all components
  const inQtyNum = styleComponents.reduce((s, c) => s + getComponentInQty(c.submissionId), 0);

  // Per-component cut qty already saved
  const stagedCutQtyBySubmission = useMemo(() => {
    const map: Record<string, number> = {};
    savedCuts.forEach(c => { map[c.submissionId] = (map[c.submissionId] || 0) + c.cutQty; });
    return map;
  }, [savedCuts]);

  // Total cut qty and uncut balance across all components
  const totalCutQty  = savedCuts.reduce((s, c) => s + c.cutQty, 0);
  const uncutBalance = Math.max(0, inQtyNum - totalCutQty);

  // ── Auto-draft ────────────────────────────────────────────────────────────
  const draftState = useMemo(() => ({
    selectedStyleNo, selectedCustomer, scheduleNo, cutInDate, componentInQty, savedCuts, stagedEntries,
  }), [selectedStyleNo, selectedCustomer, scheduleNo, cutInDate, componentInQty, savedCuts, stagedEntries]);

  const { draftRestored, clearDraft, dismissDraftNotice } = useAutoDraft(
    'store-in-form', draftState,
    (saved) => {
      if (saved.selectedStyleNo)  setSelectedStyleNo(saved.selectedStyleNo);
      if (saved.selectedCustomer) setSelectedCustomer(saved.selectedCustomer);
      if (saved.scheduleNo)       setScheduleNo(saved.scheduleNo);
      if (saved.cutInDate)        setCutInDate(saved.cutInDate);
      if (saved.componentInQty)      setComponentInQty(saved.componentInQty);
      if (saved.savedCuts)        setSavedCuts(saved.savedCuts);
      if (saved.stagedEntries)    setStagedEntries(saved.stagedEntries);
    }
  );

  // ── Selection handlers ────────────────────────────────────────────────────
  const handleStyleNoChange = (styleNo: string) => {
    setSelectedStyleNo(styleNo);
    setSelectedCustomer('');
    setSavedCuts([]);
    setErrors(p => ({ ...p, styleNo: '', customer: '' }));
    setPageError('');
  };

  const handleCustomerChange = (customer: string) => {
    setSelectedCustomer(customer);
    setSavedCuts([]);
    setErrors(p => ({ ...p, customer: '' }));
    setPageError('');
  };

  // ── Active cut builder ────────────────────────────────────────────────────
  const selectedComponent = useMemo(() =>
    styleComponents.find(c => c.submissionId === activeSubmissionId) || null,
    [styleComponents, activeSubmissionId]);

  // Next eligible component not yet assigned to a saved cut
  const nextComponent = useMemo((): EligibleStoreInItem | null => {
    const usedSubmissions = new Set(savedCuts.map(c => c.submissionId));
    return styleComponents.find(c => !usedSubmissions.has(c.submissionId)) ?? null;
  }, [savedCuts, styleComponents]);

  const activeCutTitle = useMemo(() => {
    const globalIdx = savedCuts.length + 1;
    if (editingCutTempId) {
      const ex = savedCuts.find(c => c.tempId === editingCutTempId);
      return ex ? ex.cutNo : 'Edit Cut';
    }
    const compName = selectedComponent?.components ?? nextComponent?.components ?? 'Cut';
    return `${compName} Cut ${globalIdx}`;
  }, [editingCutTempId, savedCuts, selectedComponent, nextComponent]);

  // ── Bundle helpers ────────────────────────────────────────────────────────
  const addBundle = () => setActiveCutBundles(prev => [...prev, makeBundleRow(prev.length + 1)]);
  const removeBundle = (id: string) => setActiveCutBundles(prev => prev.filter(b => b.tempId !== id));
  const updateBundle = (id: string, field: keyof BundleFormRow, value: string) =>
    setActiveCutBundles(prev => prev.map(b => b.tempId === id ? { ...b, [field]: value } : b));

  // ── Validate active cut ───────────────────────────────────────────────────
  const validateActiveCut = (): boolean => {
    const errs: Record<string, string> = {};
    if (!activeSubmissionId) errs.component = 'Select a component for this cut';
    const cutQtyNum = parseInt(activeCutQty) || 0;
    if (cutQtyNum <= 0) errs.cutQty = 'Cut Qty must be > 0';

    // Per-component validation
    if (activeSubmissionId && cutQtyNum > 0) {
      const comp = styleComponents.find(c => c.submissionId === activeSubmissionId);
      if (comp) {
        const alreadyUsed = stagedCutQtyBySubmission[activeSubmissionId] || 0;
        const alreadyEditing = editingCutTempId
          ? savedCuts.find(c => c.tempId === editingCutTempId)?.cutQty || 0 : 0;

        // Check 1: cannot exceed remaining approved bulk for this component
        const remainingBulk = comp.remainingBulkQty - (alreadyUsed - alreadyEditing);
        if (cutQtyNum > remainingBulk)
          errs.cutQty = `Exceeds remaining bulk for ${comp.components} (${remainingBulk} remaining)`;

        // Check 2: cannot exceed the IN Qty the user entered for this component
        const compEnteredInQty = getComponentInQty(activeSubmissionId);
        if (compEnteredInQty > 0) {
          const cutsSoFarForComp = (alreadyUsed - alreadyEditing);
          const compInQtyBalance = Math.max(0, compEnteredInQty - cutsSoFarForComp);
          if (cutQtyNum > compInQtyBalance)
            errs.cutQty = `Exceeds ${comp.components} IN Qty balance (${compInQtyBalance} left of ${compEnteredInQty} entered)`;
        } else if (compEnteredInQty === 0) {
          errs.cutQty = `Enter IN Qty for ${comp.components} before adding cuts`;
        }
      }
    }

    if (activeCutBundles.length === 0) errs.bundles = 'At least one bundle is required';
    const totalBundleQty = activeCutBundles.reduce((s, b) => s + (parseInt(b.bundleQty) || 0), 0);
    const cutQtyNum2 = parseInt(activeCutQty) || 0;
    if (cutQtyNum2 > 0 && totalBundleQty !== cutQtyNum2)
      errs.bundles = totalBundleQty > cutQtyNum2
        ? `Bundle total (${totalBundleQty}) exceeds cut qty (${cutQtyNum2})`
        : `Bundle total (${totalBundleQty}) must equal cut qty (${cutQtyNum2}) — unbundled: ${cutQtyNum2 - totalBundleQty}`;

    const bundleNos = activeCutBundles.map(b => b.bundleNo.trim().toLowerCase());
    if (bundleNos.length !== new Set(bundleNos).size) errs.bundles = 'Duplicate bundle numbers';

    activeCutBundles.forEach((b, i) => {
      if (!b.bundleNo.trim())               errs[`b_${i}_no`]    = 'Required';
      if ((parseInt(b.bundleQty) || 0) <= 0) errs[`b_${i}_qty`] = '> 0';
      if (!b.size.trim())                   errs[`b_${i}_size`]  = 'Required';
      if (!b.numberRange.trim())            errs[`b_${i}_range`] = 'Required';
    });

    setCutErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ── Save cut to summary ───────────────────────────────────────────────────
  const handleSaveCut = () => {
    if (!validateActiveCut()) return;
    const comp = styleComponents.find(c => c.submissionId === activeSubmissionId);
    const newCut: SavedCut = {
      tempId:       editingCutTempId ?? crypto.randomUUID(),
      cutNo:        activeCutTitle,
      component:    comp?.components ?? '',
      submissionId: activeSubmissionId,
      bodyColour:   comp?.bodyColour ?? '',
      cutQty:       parseInt(activeCutQty) || 0,
      bundles: activeCutBundles.map(b => ({
        bundleNo: b.bundleNo.trim(), bundleQty: parseInt(b.bundleQty) || 0,
        size: b.size.trim(), numberRange: b.numberRange.trim(),
      })),
    };

    if (editingCutTempId) {
      setSavedCuts(prev => prev.map(c => c.tempId === editingCutTempId ? newCut : c));
      setEditingCutTempId(null);
    } else {
      setSavedCuts(prev => [...prev, newCut]);
    }

    setActiveCutBundles([makeBundleRow(1)]);
    setActiveCutQty('');
    setActiveSubmissionId('');
    setCutErrors({});
  };

  const handleEditSavedCut = (cut: SavedCut) => {
    setEditingCutTempId(cut.tempId);
    setActiveSubmissionId(cut.submissionId);
    setActiveCutQty(cut.cutQty.toString());
    setActiveCutBundles(cut.bundles.map(b => ({
      tempId: crypto.randomUUID(),
      bundleNo: b.bundleNo, bundleQty: b.bundleQty.toString(),
      size: b.size, numberRange: b.numberRange,
    })));
    setCutErrors({});
  };

  const handleCancelCutEdit = () => {
    setEditingCutTempId(null);
    setActiveCutBundles([makeBundleRow(1)]);
    setActiveCutQty('');
    setActiveSubmissionId('');
    setCutErrors({});
  };

  const handleRemoveSavedCut = (tempId: string) =>
    setSavedCuts(prev => prev.filter(c => c.tempId !== tempId));

  // ── Main form validation ──────────────────────────────────────────────────
  const validateForm = (): boolean => {
    const errs: Record<string, string> = {};
    if (!selectedStyleNo)    errs.styleNo  = 'Select a style number';
    if (!selectedCustomer)   errs.customer = 'Select a customer';
    if (!scheduleNo.trim())  errs.scheduleNo = 'Schedule No is required';
    if (!cutInDate)          errs.cutInDate  = 'Cut In Date is required';
    if (inQtyNum <= 0)       errs.inQty      = 'Enter IN Qty for at least one component';
    if (savedCuts.length === 0) errs.cuts = 'Add at least one cut before saving';
    if (totalCutQty > inQtyNum && inQtyNum > 0)
      errs.cuts = `Total cut qty (${totalCutQty}) exceeds total IN qty (${inQtyNum})`;

    // Per-component: cuts cannot exceed the IN Qty entered for each component
    styleComponents.forEach(comp => {
      const compCutQty  = savedCuts.filter(c => c.submissionId === comp.submissionId).reduce((s, c) => s + c.cutQty, 0);
      const compInQty   = getComponentInQty(comp.submissionId);
      if (compInQty > 0 && compCutQty > compInQty)
        errs.cuts = `${comp.components} cuts (${compCutQty}) exceed its IN Qty (${compInQty})`;
      if (compInQty > comp.remainingBulkQty)
        errs[`inQty_${comp.submissionId}`] = `${comp.components} IN Qty exceeds remaining bulk`;
    });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const resetForm = () => {
    setSelectedStyleNo(''); setSelectedCustomer('');
    setScheduleNo(''); setCutInDate(''); setComponentInQty({});
    setSavedCuts([]); setActiveCutBundles([makeBundleRow(1)]);
    setActiveCutQty(''); setActiveSubmissionId('');
    setEditingCutTempId(null); setEditingRecordId(null);
    setErrors({}); setCutErrors({}); setPageError('');
    clearDraft();
  };

  // ── Save to staging ───────────────────────────────────────────────────────
  const handleSaveToTable = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const entry: StagedEntry = {
      tempId:       crypto.randomUUID(),
      styleNo:      selectedStyleNo,
      customerName: selectedCustomer,
      components:   styleComponents.map(c => c.components).join(', '),
      scheduleNo:   scheduleNo.trim(),
      cutInDate,
      inQty:        inQtyNum,
      cuts: savedCuts.map(c => ({
        cutNo:        c.cutNo,
        cutQty:       c.cutQty,
        submissionId: c.submissionId,
        bundles:      c.bundles,
      })),
    };

    setStagedEntries(prev => [...prev, entry]);
    setSuccessMsg('Added to staging table.');
    setTimeout(() => setSuccessMsg(''), 4000);

    // Keep style+customer, reset rest
    setScheduleNo(''); setCutInDate(''); setComponentInQty({});
    setSavedCuts([]); setActiveCutBundles([makeBundleRow(1)]);
    setActiveCutQty(''); setActiveSubmissionId('');
    setErrors({}); setPageError('');
  };

  const removeStagedEntry = (tempId: string) =>
    setStagedEntries(prev => prev.filter(e => e.tempId !== tempId));

  // ── Save to DB ────────────────────────────────────────────────────────────
  const handleSaveToDatabase = async () => {
    if (stagedEntries.length === 0) return;
    setIsSavingToDb(true); setPageError('');
    try {
      for (const entry of stagedEntries) {
        // Use the first cut's submissionId as the primary submissionId for the record
        const primarySubId = entry.cuts[0]?.submissionId ?? '';
        await addStoreInRecord({
          submissionId: primarySubId,
          scheduleNo:   entry.scheduleNo,
          cutInDate:    entry.cutInDate,
          inQty:        entry.inQty,
          cuts:         entry.cuts,
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

  // ── Edit existing DB record ───────────────────────────────────────────────
  const handleDirectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsSaving(true); setPageError('');
    try {
      const primarySubId = savedCuts[0]?.submissionId ?? '';
      await updateStoreInRecord(editingRecordId!, {
        submissionId: primarySubId,
        scheduleNo:   scheduleNo.trim(),
        cutInDate,
        inQty:        inQtyNum,  // total across all components
        cuts:         savedCuts.map(c => ({ cutNo: c.cutNo, cutQty: c.cutQty, submissionId: c.submissionId, bundles: c.bundles })),
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
    setSelectedStyleNo(record.styleNo);
    setSelectedCustomer(record.customerName);
    setScheduleNo(record.scheduleNo);
    setCutInDate(record.cutInDate);
    // Restore per-component IN Qty from cuts (best approximation)
    const compQtyMap: Record<string, string> = {};
    record.cuts.forEach(c => {
      const subId = (c as any).submissionId;
      if (subId) compQtyMap[subId] = ((parseInt(compQtyMap[subId] || '0') || 0) + c.cutQty).toString();
    });
    if (Object.keys(compQtyMap).length === 0) {
      // Fallback: put total into first component if no submissionId info
      compQtyMap[''] = record.inQty.toString();
    }
    setComponentInQty(compQtyMap);
    setSavedCuts(record.cuts.map(c => ({
      tempId:       crypto.randomUUID(),
      cutNo:        c.cutNo,
      component:    c.cutNo.split(' ')[0] ?? '',
      submissionId: (c as any).submissionId ?? '',
      bodyColour:   '',
      cutQty:       c.cutQty,
      bundles:      c.bundles.map(b => ({
        bundleNo: b.bundleNo, bundleQty: b.bundleQty, size: b.size, numberRange: b.numberRange,
      })),
    })));
    setEditingRecordId(record.id);
    setErrors({}); setCutErrors({}); setPageError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this store-in record?')) return;
    try {
      await deleteStoreInRecord(id);
      await Promise.all([fetchRecords(), fetchEligibleStoreInItems(), fetchBulkBalances()]);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Failed to delete.');
    }
  };

  // ── Filter / paginate records ─────────────────────────────────────────────
  const filteredRecords = useMemo(() => {
    let records = [...storeInRecords];
    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      records = records.filter(r =>
        r.styleNo.toLowerCase().includes(q) || r.customerName.toLowerCase().includes(q) ||
        r.scheduleNo.toLowerCase().includes(q) || r.bodyColour?.toLowerCase().includes(q) ||
        r.season?.toLowerCase().includes(q)
      );
    }
    if (filterDateFrom) records = records.filter(r => r.cutInDate >= filterDateFrom);
    if (filterDateTo)   records = records.filter(r => r.cutInDate <= filterDateTo);
    return records;
  }, [storeInRecords, searchText, filterDateFrom, filterDateTo]);

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / pageSize));
  const safePage   = Math.min(currentPage, totalPages);
  const paginatedRecords = useMemo(() => filteredRecords.slice((safePage - 1) * pageSize, safePage * pageSize), [filteredRecords, safePage]);

  const scheduleDatalistId = `sched-${selectedStyleNo}-${selectedCustomer}`;

  // ==========================================
  // RENDER
  // ==========================================
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-6xl space-y-8 pb-12">
      <DraftRestoredToast visible={draftRestored} onDismiss={dismissDraftNotice} onDiscard={() => { clearDraft(); resetForm(); }} />

      {/* Header */}
      <div className="flex items-center space-x-3 border-b border-slate-200 pb-4">
        <div className="rounded-lg bg-orange-100 p-2"><PackageOpen className="h-6 w-6 text-orange-700" /></div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Store In (Receiving)</h2>
          <p className="text-sm text-slate-500">Select a style, then add cuts per component. Each cut tracks which component it belongs to.</p>
        </div>
      </div>

      {/* Bulk Balance Cards */}
      {bulkBalances.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {bulkBalances.map(bal => (
            <div key={bal.submissionId} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500">{bal.customerName}</p>
                  <p className="text-sm font-bold text-slate-900">{bal.styleNo}</p>
                  {(bal as any).component && (
                    <span className="inline-block mt-0.5 text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded-full">
                      {(bal as any).component}
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-wide text-slate-400">Remaining bulk</p>
                  <p className={`text-lg font-black ${bal.remainingBulkQty > 0 ? 'text-blue-700' : 'text-emerald-600'}`}>{bal.remainingBulkQty}</p>
                </div>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-blue-500 transition-all"
                  style={{ width: `${Math.min(100, bal.approvedBulkQty > 0 ? (bal.totalInQty / bal.approvedBulkQty) * 100 : 0)}%` }} />
              </div>
              <div className="mt-1 flex justify-between text-[10px] text-slate-400">
                <span>Received: {bal.totalInQty}</span><span>Approved: {bal.approvedBulkQty}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {pageError && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600"><AlertCircle className="mr-1 inline h-4 w-4" />{pageError}</div>}
      {successMsg && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"><CheckCircle2 className="mr-1 inline h-4 w-4" />{successMsg}</div>}

      {/* ==========================================
          MAIN FORM
          ========================================== */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-800">{editingRecordId ? 'Edit Store-In Entry' : 'New Store-In Entry'}</h3>
          {editingRecordId && <span className="animate-pulse rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">EDIT MODE</span>}
        </div>

        <form onSubmit={editingRecordId ? handleDirectSubmit : handleSaveToTable} className="space-y-6">

          {/* ── Style + Customer + Schedule + Date ────────────────────────── */}
          <div className="rounded-lg border border-blue-200 bg-blue-50/60 p-5 space-y-4">
            <h4 className="border-b border-blue-200 pb-2 text-sm font-bold uppercase tracking-wider text-blue-800">Style & Schedule</h4>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">

              {/* Style No */}
              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-600">Style No <span className="text-red-500">*</span></label>
                <select value={selectedStyleNo} onChange={e => handleStyleNoChange(e.target.value)} disabled={!!editingRecordId}
                  className={`w-full rounded-lg border px-3 py-2 text-sm outline-none bg-white ${errors.styleNo ? 'border-red-400 bg-red-50' : 'border-slate-300 focus:ring-2 focus:ring-blue-500'} ${editingRecordId ? 'cursor-not-allowed bg-slate-100' : ''}`}>
                  <option value="">Select style no...</option>
                  {uniqueStyleNos.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                {errors.styleNo && <p className="text-[11px] text-red-600"><AlertCircle className="mr-1 inline h-3 w-3" />{errors.styleNo}</p>}
              </div>

              {/* Customer */}
              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-600">Customer <span className="text-red-500">*</span></label>
                <select value={selectedCustomer} onChange={e => handleCustomerChange(e.target.value)} disabled={!!editingRecordId || !selectedStyleNo}
                  className={`w-full rounded-lg border px-3 py-2 text-sm outline-none bg-white ${errors.customer ? 'border-red-400 bg-red-50' : 'border-slate-300 focus:ring-2 focus:ring-blue-500'} ${(!selectedStyleNo || editingRecordId) ? 'cursor-not-allowed bg-slate-100 text-slate-400' : ''}`}>
                  <option value="">{!selectedStyleNo ? 'Select style first...' : 'Select customer...'}</option>
                  {customersForStyle.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                {errors.customer && <p className="text-[11px] text-red-600"><AlertCircle className="mr-1 inline h-3 w-3" />{errors.customer}</p>}
              </div>

              {/* Schedule No */}
              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-600">Schedule No <span className="text-red-500">*</span></label>
                <input type="text" list={scheduleDatalistId} value={scheduleNo}
                  onChange={e => { setScheduleNo(e.target.value); if (errors.scheduleNo) setErrors(p => ({ ...p, scheduleNo: '' })); }}
                  disabled={!selectedCustomer} placeholder={selectedCustomer ? 'Type or pick...' : 'Select customer first...'}
                  autoComplete="off"
                  className={`w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none ${errors.scheduleNo ? 'border-red-400 bg-red-50' : 'border-slate-300 focus:ring-2 focus:ring-blue-500'} ${!selectedCustomer ? 'cursor-not-allowed bg-slate-100 text-slate-400' : ''}`}
                />
                <datalist id={scheduleDatalistId}>
                  {existingScheduleOptions.map(s => <option key={s} value={s} />)}
                </datalist>
                {errors.scheduleNo && <p className="text-[11px] text-red-600"><AlertCircle className="mr-1 inline h-3 w-3" />{errors.scheduleNo}</p>}
              </div>

              {/* Cut In Date */}
              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-600">Cut In Date <span className="text-red-500">*</span></label>
                <input type="date" value={cutInDate}
                  onChange={e => { setCutInDate(e.target.value); if (errors.cutInDate) setErrors(p => ({ ...p, cutInDate: '' })); }}
                  className={`w-full rounded-lg border px-3 py-2 text-sm outline-none ${errors.cutInDate ? 'border-red-400 bg-red-50' : 'border-slate-300 focus:ring-2 focus:ring-blue-500'}`}
                />
                {errors.cutInDate && <p className="text-[11px] text-red-600"><AlertCircle className="mr-1 inline h-3 w-3" />{errors.cutInDate}</p>}
              </div>
            </div>

            {/* Components panel — shows all approved components for this style */}
            {styleComponents.length > 0 && (
              <div className="mt-2">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-2">Approved Components</p>
                <div className="flex flex-wrap gap-2">
                  {styleComponents.map(comp => {
                    const usedQty = stagedCutQtyBySubmission[comp.submissionId] || 0;
                    const remaining = comp.remainingBulkQty - usedQty;
                    return (
                      <div key={comp.submissionId}
                        className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
                        <span className="text-xs font-bold text-indigo-700">{comp.components}</span>
                        <span className="text-[10px] text-slate-400">·</span>
                        <span className="text-xs text-slate-600">{comp.bodyColour}</span>
                        <span className="text-[10px] text-slate-400">·</span>
                        <span className={`text-xs font-bold ${remaining > 0 ? 'text-blue-700' : 'text-emerald-600'}`}>
                          {remaining} remaining
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ── Quantities — per component ─────────────────────────────────── */}
          {styleComponents.length > 0 && (
            <div className="rounded-lg border border-orange-200 bg-orange-50/60 p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-orange-200 pb-2">
                <h4 className="text-sm font-bold uppercase tracking-wider text-orange-800">Quantities per Component</h4>
                <div className="text-xs text-slate-500">
                  Total IN: <span className="font-bold text-orange-700">{inQtyNum || '—'}</span>
                  {inQtyNum > 0 && <span className="ml-3">Total Cut: <span className={`font-bold ${totalCutQty > inQtyNum ? 'text-red-600' : 'text-slate-700'}`}>{totalCutQty}</span></span>}
                  {inQtyNum > 0 && <span className="ml-3">Uncut: <span className={`font-bold ${uncutBalance > 0 ? 'text-amber-700' : 'text-slate-500'}`}>{uncutBalance}</span></span>}
                </div>
              </div>

              {errors.inQty && <p className="text-[11px] text-red-600"><AlertCircle className="mr-1 inline h-3 w-3" />{errors.inQty}</p>}

              <div className="space-y-3">
                {styleComponents.map(comp => {
                  const compInQty  = getComponentInQty(comp.submissionId);
                  const compCutQty = stagedCutQtyBySubmission[comp.submissionId] || 0;
                  const compUncut  = Math.max(0, compInQty - compCutQty);
                  const remaining  = comp.remainingBulkQty;
                  const overLimit  = compInQty > remaining;

                  return (
                    <div key={comp.submissionId} className="rounded-lg border border-white bg-white p-4 shadow-sm">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-sm font-bold text-indigo-700">{comp.components}</span>
                        <span className="text-xs text-slate-400">·</span>
                        <span className="text-xs text-slate-600">{comp.bodyColour}</span>
                        <span className="ml-auto text-[10px] text-slate-400">
                          Approved: <span className="font-bold text-slate-600">{comp.approvedBulkQty}</span>
                          {' · '}Remaining: <span className={`font-bold ${remaining > 0 ? 'text-blue-700' : 'text-emerald-600'}`}>{remaining}</span>
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <label className="block text-[10px] font-medium text-slate-500">IN Qty <span className="text-red-500">*</span></label>
                          <input
                            type="number" min="1"
                            value={componentInQty[comp.submissionId] || ''}
                            onChange={e => setCompInQty(comp.submissionId, e.target.value)}
                            placeholder="e.g. 500"
                            className={`w-full rounded-lg border px-3 py-2 text-sm font-bold outline-none ${
                              overLimit ? 'border-red-400 bg-red-50 text-red-700' : 'border-slate-300 focus:ring-2 focus:ring-orange-500'
                            }`}
                          />
                          {overLimit && <p className="text-[10px] text-red-600">Exceeds remaining bulk ({remaining})</p>}
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[10px] font-medium text-slate-500">Cut Qty</label>
                          <div className={`rounded-lg border px-3 py-2 text-sm font-bold ${compCutQty > compInQty && compInQty > 0 ? 'border-red-200 bg-red-50 text-red-700' : 'border-slate-200 bg-slate-50 text-slate-700'}`}>
                            {compCutQty || '—'}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[10px] font-medium text-slate-500">Uncut Balance</label>
                          <div className={`rounded-lg border px-3 py-2 text-sm font-bold ${compUncut > 0 ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-slate-200 bg-slate-50 text-slate-500'}`}>
                            {compInQty > 0 ? compUncut : '—'}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Cut Summary Table ─────────────────────────────────────────────── */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold uppercase tracking-wider text-slate-700">Cuts & Bundles</h4>
              {errors.cuts && <p className="text-[11px] text-red-600"><AlertCircle className="mr-1 inline h-3 w-3" />{errors.cuts}</p>}
            </div>

            {savedCuts.length > 0 && (
              <div className="rounded-lg border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wide text-slate-600">Cut Summary</span>
                  <span className="text-xs text-slate-500">Total: <span className="font-bold text-slate-800">{totalCutQty}</span></span>
                </div>
                <div className="divide-y divide-slate-100">
                  {savedCuts.map(cut => (
                    <div key={cut.tempId} className={`px-4 py-3 ${editingCutTempId === cut.tempId ? 'bg-amber-50 border-l-4 border-amber-400' : 'hover:bg-slate-50'}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Layers className="h-4 w-4 text-slate-400 shrink-0" />
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-bold text-slate-900">{cut.cutNo}</p>
                              <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded-full">{cut.component}</span>
                              {cut.bodyColour && <span className="text-[10px] text-slate-500">{cut.bodyColour}</span>}
                            </div>
                            <p className="text-xs text-slate-500">
                              Qty: <span className="font-semibold text-slate-700">{cut.cutQty}</span>
                              {' · '}{cut.bundles.length} bundle{cut.bundles.length !== 1 ? 's' : ''}
                              {' · '}Sizes: <span className="font-medium">{Array.from(new Set(cut.bundles.map(b => b.size))).join(', ')}</span>
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {editingCutTempId === cut.tempId ? (
                            <span className="text-[10px] font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">Editing…</span>
                          ) : (
                            <>
                              <button type="button" onClick={() => handleEditSavedCut(cut)}
                                className="rounded p-1.5 text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-colors">
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button type="button" onClick={() => handleRemoveSavedCut(cut.tempId)}
                                className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="mt-2 ml-7">
                        <table className="w-full text-xs">
                          <thead><tr className="text-slate-400"><th className="py-0.5 text-left font-medium w-24">Bundle</th><th className="py-0.5 text-left font-medium w-16">Qty</th><th className="py-0.5 text-left font-medium w-16">Size</th><th className="py-0.5 text-left font-medium">Range</th></tr></thead>
                          <tbody>{cut.bundles.map((b, i) => <tr key={i} className="text-slate-700"><td className="py-0.5 font-medium">{b.bundleNo}</td><td className="py-0.5 font-bold">{b.bundleQty}</td><td className="py-0.5">{b.size}</td><td className="py-0.5 text-slate-500">{b.numberRange}</td></tr>)}</tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Active Cut Builder ──────────────────────────────────────── */}
            {selectedCustomer && (
              <AnimatePresence mode="wait">
                <motion.div key={editingCutTempId ?? 'new'}
                  initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className={`rounded-lg border-2 p-5 space-y-4 ${editingCutTempId ? 'border-amber-300 bg-amber-50/40' : 'border-indigo-200 bg-indigo-50/30'}`}>

                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-2">
                      <Layers className={`h-5 w-5 ${editingCutTempId ? 'text-amber-600' : 'text-indigo-600'}`} />
                      <h5 className={`text-sm font-bold ${editingCutTempId ? 'text-amber-800' : 'text-indigo-800'}`}>
                        {editingCutTempId ? `Editing: ${savedCuts.find(c => c.tempId === editingCutTempId)?.cutNo}` : `New Cut`}
                      </h5>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                      {/* Component selector */}
                      <div className="space-y-0.5">
                        <label className="block text-[10px] font-medium text-slate-500">Component <span className="text-red-500">*</span></label>
                        <select value={activeSubmissionId}
                          onChange={e => { setActiveSubmissionId(e.target.value); if (cutErrors.component) setCutErrors(p => ({ ...p, component: '' })); }}
                          className={`rounded-lg border px-3 py-1.5 text-sm outline-none bg-white ${cutErrors.component ? 'border-red-400 bg-red-50' : 'border-slate-300 focus:ring-2 focus:ring-indigo-500'}`}
                        >
                          <option value="">Select component...</option>
                          {styleComponents.map(comp => {
                            const usedQty = stagedCutQtyBySubmission[comp.submissionId] || 0;
                            const remaining = comp.remainingBulkQty - usedQty;
                            return (
                              <option key={comp.submissionId} value={comp.submissionId}>
                                {comp.components} — {comp.bodyColour} ({remaining} remaining)
                              </option>
                            );
                          })}
                        </select>
                        {cutErrors.component && <p className="text-[10px] text-red-600">{cutErrors.component}</p>}
                      </div>
                      {/* Cut Qty */}
                      <div className="space-y-0.5">
                        <label className="block text-[10px] font-medium text-slate-500">Cut Qty <span className="text-red-500">*</span></label>
                        <input type="number" value={activeCutQty}
                          onChange={e => { setActiveCutQty(e.target.value); if (cutErrors.cutQty) setCutErrors(p => ({ ...p, cutQty: '' })); }}
                          placeholder="e.g. 250" min="1"
                          className={`w-28 rounded-lg border px-3 py-1.5 text-sm font-bold outline-none ${cutErrors.cutQty ? 'border-red-400 bg-red-50' : 'border-slate-300 focus:ring-2 focus:ring-indigo-500'}`}
                        />
                        {cutErrors.cutQty && <p className="text-[10px] text-red-600">{cutErrors.cutQty}</p>}
                      </div>
                    </div>
                  </div>

                  {cutErrors.bundles && <p className="text-[11px] text-red-600"><AlertCircle className="mr-1 inline h-3 w-3" />{cutErrors.bundles}</p>}

                  {/* Bundle rows */}
                  <div className="space-y-2">
                    <div className="grid grid-cols-12 gap-2 text-[10px] font-bold uppercase tracking-wide text-slate-400 px-1">
                      <div className="col-span-3">Bundle No <span className="text-red-400">*</span></div>
                      <div className="col-span-2">Qty <span className="text-red-400">*</span></div>
                      <div className="col-span-2">Size <span className="text-red-400">*</span></div>
                      <div className="col-span-4">Number Range <span className="text-red-400">*</span></div>
                      <div className="col-span-1"></div>
                    </div>
                    {activeCutBundles.map((bundle, bi) => (
                      <div key={bundle.tempId} className="grid grid-cols-12 gap-2 items-start">
                        <div className="col-span-3">
                          <input type="text" value={bundle.bundleNo} onChange={e => updateBundle(bundle.tempId, 'bundleNo', e.target.value)} placeholder="B001"
                            className={`w-full rounded border px-2 py-1.5 text-xs outline-none ${cutErrors[`b_${bi}_no`] ? 'border-red-400 bg-red-50' : 'border-slate-200 focus:ring-1 focus:ring-blue-400'}`} />
                          {cutErrors[`b_${bi}_no`] && <p className="text-[9px] text-red-500 mt-0.5">{cutErrors[`b_${bi}_no`]}</p>}
                        </div>
                        <div className="col-span-2">
                          <input type="number" value={bundle.bundleQty} onChange={e => updateBundle(bundle.tempId, 'bundleQty', e.target.value)} placeholder="125" min="1"
                            className={`w-full rounded border px-2 py-1.5 text-xs font-bold outline-none ${cutErrors[`b_${bi}_qty`] ? 'border-red-400 bg-red-50' : 'border-slate-200 focus:ring-1 focus:ring-blue-400'}`} />
                          {cutErrors[`b_${bi}_qty`] && <p className="text-[9px] text-red-500 mt-0.5">{cutErrors[`b_${bi}_qty`]}</p>}
                        </div>
                        <div className="col-span-2">
                          <input type="text" value={bundle.size} onChange={e => updateBundle(bundle.tempId, 'size', e.target.value)} placeholder="e.g. M"
                            className={`w-full rounded border px-2 py-1.5 text-xs outline-none ${cutErrors[`b_${bi}_size`] ? 'border-red-400 bg-red-50' : 'border-slate-200 focus:ring-1 focus:ring-blue-400'}`} />
                          {cutErrors[`b_${bi}_size`] && <p className="text-[9px] text-red-500 mt-0.5">{cutErrors[`b_${bi}_size`]}</p>}
                        </div>
                        <div className="col-span-4">
                          <input type="text" value={bundle.numberRange} onChange={e => updateBundle(bundle.tempId, 'numberRange', e.target.value)} placeholder="001-125"
                            className={`w-full rounded border px-2 py-1.5 text-xs outline-none ${cutErrors[`b_${bi}_range`] ? 'border-red-400 bg-red-50' : 'border-slate-200 focus:ring-1 focus:ring-blue-400'}`} />
                          {cutErrors[`b_${bi}_range`] && <p className="text-[9px] text-red-500 mt-0.5">{cutErrors[`b_${bi}_range`]}</p>}
                        </div>
                        <div className="col-span-1 flex justify-center pt-1">
                          {activeCutBundles.length > 1 && (
                            <button type="button" onClick={() => removeBundle(bundle.tempId)}
                              className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                    <button type="button" onClick={addBundle}
                      className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors mt-1">
                      <Plus className="h-3 w-3" /> Add Bundle
                    </button>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
                    <button type="button" onClick={handleSaveCut}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold text-white shadow-sm transition-colors ${editingCutTempId ? 'bg-amber-600 hover:bg-amber-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
                      <Save className="h-3.5 w-3.5" />
                      {editingCutTempId ? 'Update Cut' : 'Save Cut to Summary'}
                    </button>
                    {editingCutTempId && (
                      <button type="button" onClick={handleCancelCutEdit}
                        className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                        Cancel
                      </button>
                    )}
                  </div>
                </motion.div>
              </AnimatePresence>
            )}
          </div>

          {/* Submit buttons */}
          <div className="flex items-center gap-3 border-t border-slate-200 pt-6">
            {editingRecordId ? (
              <>
                <button type="submit" disabled={isSaving}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors disabled:opacity-50">
                  <Save className="h-4 w-4" />{isSaving ? 'Updating...' : 'Update Entry'}
                </button>
                <button type="button" onClick={resetForm}
                  className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel Edit</button>
              </>
            ) : (
              <button type="submit"
                className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-amber-700 transition-colors">
                <TableProperties className="h-4 w-4" />Save to Staging Table
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Staging Table */}
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
            {stagedEntries.map(entry => {
              const isExp = expandedStagedId === entry.tempId;
              return (
                <div key={entry.tempId}>
                  <div className="flex items-center gap-4 px-6 py-4 hover:bg-amber-50 cursor-pointer"
                    onClick={() => setExpandedStagedId(isExp ? null : entry.tempId)}>
                    {isExp ? <ChevronDown className="h-4 w-4 text-amber-500 shrink-0" /> : <ChevronRight className="h-4 w-4 text-amber-500 shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-slate-900">{entry.styleNo}</p>
                        <span className="text-xs text-slate-500">{entry.customerName}</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">Sch: {entry.scheduleNo} | Date: {entry.cutInDate} | Components: {entry.components}</p>
                    </div>
                    <div className="text-right space-y-0.5 shrink-0">
                      <div className="text-xs">IN: <span className="font-bold text-orange-600">{entry.inQty}</span></div>
                      <div className="text-xs">Cuts: <span className="font-bold">{entry.cuts.length}</span></div>
                    </div>
                    <button onClick={e => { e.stopPropagation(); removeStagedEntry(entry.tempId); }}
                      className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 shrink-0">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <AnimatePresence>
                    {isExp && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                        className="border-t border-amber-200 bg-white px-6 py-4 overflow-hidden">
                        {entry.cuts.map(cut => (
                          <div key={cut.cutNo} className="mb-3 last:mb-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Layers className="h-3.5 w-3.5 text-slate-400" />
                              <span className="text-sm font-bold text-slate-700">{cut.cutNo}</span>
                              <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-600">Qty: {cut.cutQty}</span>
                            </div>
                            <div className="ml-6 border-l-2 border-slate-200 pl-4">
                              <table className="w-full text-xs">
                                <thead><tr className="text-slate-400"><th className="py-1 text-left">Bundle</th><th className="py-1 text-left">Qty</th><th className="py-1 text-left">Size</th><th className="py-1 text-left">Range</th></tr></thead>
                                <tbody>{cut.bundles.map((b, bi) => <tr key={bi} className="text-slate-700"><td className="py-0.5 font-medium">{b.bundleNo}</td><td className="py-0.5 font-bold">{b.bundleQty}</td><td className="py-0.5">{b.size}</td><td className="py-0.5 text-slate-500">{b.numberRange}</td></tr>)}</tbody>
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

      {/* Records Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50 px-6 py-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-800">Store-In Records</h3>
            <button type="button" onClick={() => setShowFilters(!showFilters)}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${showFilters ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}>
              <Filter className="h-3.5 w-3.5" />{showFilters ? 'Hide' : 'Filters'}
            </button>
          </div>
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input type="text" value={searchText} onChange={e => { setSearchText(e.target.value); setCurrentPage(1); }}
              placeholder="Search by style, customer, schedule..."
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10" />
          </div>
          <AnimatePresence>
            {showFilters && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <div className="flex flex-wrap items-end gap-3 pt-2">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-medium uppercase tracking-wide text-slate-400"><Calendar className="mr-1 inline h-3 w-3" />From</label>
                    <input type="date" value={filterDateFrom} onChange={e => { setFilterDateFrom(e.target.value); setCurrentPage(1); }} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-medium uppercase tracking-wide text-slate-400"><Calendar className="mr-1 inline h-3 w-3" />To</label>
                    <input type="date" value={filterDateTo} onChange={e => { setFilterDateTo(e.target.value); setCurrentPage(1); }} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none" />
                  </div>
                  <button type="button" onClick={() => { setFilterDateFrom(''); setFilterDateTo(''); setSearchText(''); setCurrentPage(1); }}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">Clear</button>
                  <div className="ml-auto text-xs text-slate-500">Showing {filteredRecords.length} of {storeInRecords.length}</div>
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
            {paginatedRecords.map(record => {
              const isExpanded = expandedRecordId === record.id;
              return (
                <div key={record.id}>
                  <div className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50/50 cursor-pointer transition-colors"
                    onClick={() => setExpandedRecordId(isExpanded ? null : record.id)}>
                    {isExpanded ? <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" /> : <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-slate-900">{record.styleNo}</p>
                        <span className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
                          <GitBranch className="h-2.5 w-2.5" />Rev {record.revisionNo}
                        </span>
                        <span className="text-xs text-slate-500">{record.customerName}</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {record.components} · Sch: {record.scheduleNo} | Date: {record.cutInDate}
                      </p>
                    </div>
                    <div className="text-right space-y-0.5 shrink-0">
                      <div className="text-xs text-slate-500">IN: <span className="font-bold text-orange-600">{record.inQty}</span></div>
                      <div className="text-xs">Cuts: <span className="font-bold">{record.cuts.length}</span> | Cut Qty: <span className="font-bold">{record.totalCutQty}</span></div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                      {locks[record.id]?.isLocked ? (
                        <div className="flex items-center gap-1"><Lock className="h-4 w-4 text-slate-300" /><span className="text-[10px] text-slate-400">Locked</span></div>
                      ) : (
                        <>
                          <button onClick={() => handleEdit(record)} className="rounded p-1.5 text-slate-400 hover:bg-blue-50 hover:text-blue-600"><Edit2 className="h-4 w-4" /></button>
                          <button onClick={() => handleDelete(record.id)} className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
                        </>
                      )}
                    </div>
                  </div>
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                        className="border-t border-slate-100 bg-slate-50/50 px-6 py-4 overflow-hidden">
                        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 mb-4">
                          <MiniStat label="IN Qty" value={record.inQty} color="orange" />
                          <MiniStat label="Total Cut Qty" value={record.totalCutQty} />
                          <MiniStat label="Uncut Balance" value={record.uncutBalance} />
                          <MiniStat label="Available (Shelf)" value={record.availableQty} color="green" />
                        </div>
                        {record.cuts.map(cut => (
                          <div key={cut.id} className="mb-3 last:mb-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Layers className="h-3.5 w-3.5 text-slate-400" />
                              <span className="text-sm font-bold text-slate-700">{cut.cutNo}</span>
                              <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold">Qty: {cut.cutQty}</span>
                            </div>
                            <div className="ml-6 border-l-2 border-slate-200 pl-4">
                              <table className="w-full text-xs">
                                <thead><tr className="text-slate-400"><th className="py-1 text-left">Bundle</th><th className="py-1 text-left">Qty</th><th className="py-1 text-left">Size</th><th className="py-1 text-left">Range</th></tr></thead>
                                <tbody>{cut.bundles.map(b => <tr key={b.id} className="text-slate-700"><td className="py-0.5 font-medium">{b.bundleNo}</td><td className="py-0.5 font-bold">{b.bundleQty}</td><td className="py-0.5">{b.size}</td><td className="py-0.5 text-slate-500">{b.numberRange}</td></tr>)}</tbody>
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

function MiniStat({ label, value, color }: { label: string; value: number; color?: 'orange' | 'blue' | 'green' }) {
  const colorClass = color === 'orange' ? 'text-orange-700' : color === 'blue' ? 'text-blue-700' : color === 'green' ? 'text-emerald-700' : 'text-slate-700';
  return (
    <div className="rounded-lg bg-white border border-slate-200 px-3 py-2">
      <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`text-lg font-black ${colorClass}`}>{value}</p>
    </div>
  );
}