// src/pages/inventory/StoreInPage.tsx
import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PackageOpen, Plus, Trash2, Edit2, AlertCircle, Save, GitBranch,
  CheckCircle2, ChevronDown, ChevronRight, Layers, Lock, Database,
  TableProperties, Search, Filter, Calendar, Pencil,
} from 'lucide-react';
import { useInventoryStore, StoreInRecord, EligibleStoreInItem } from '../../store/inventoryStore';
import { API, getAuthHeaders } from '../../api/client';

// ── Types ─────────────────────────────────────────────────────────────────────
interface BundleFormRow {
  tempId: string;
  bundleNo: string;
  bundleQty: string;
  size: string;
  numberRange: string;
}

interface BundlePayload {
  id?: string;
  bundleNo: string;
  bundleQty: number;
  size: string;
  numberRange: string;
  bundleOrder?: number;
}

interface SavedCut {
  tempId: string;
  cutNo: string;
  component: string;
  submissionId: string;
  bodyColour: string;
  cutQty: number;
  bundles: BundlePayload[];
}

interface StagedEntry {
  tempId: string;
  styleNo: string;
  customerName: string;
  components: string;
  inAdNo: string;
  scheduleNo: string;
  cutInDate: string;
  inQty: number;
  cuts: {
    tempId: string;
    cutNo: string;
    cutQty: number;
    submissionId: string;
    bundles: BundlePayload[];
  }[];
}

interface StyleScheduleOption {
  styleNo: string;
  customerName: string;
  scheduleNo: string;
}

interface StoreInDraftSnapshot {
  version: number;
  savedAt: string;
  selectedStyleNo: string;
  selectedCustomer: string;
  inAdNo: string;
  scheduleNo: string;
  cutInDate: string;
  componentInQty: Record<string, string>;
  confirmedInQty: Record<string, boolean>;
  activeSubmissionId: string;
  activeCutNo: string;
  activeCutBundles: BundleFormRow[];
  activeCutQty: string;
  cutQtyConfirmed: boolean;
  editingCutTempId: string | null;
  savedCuts: SavedCut[];
  stagedEntries: StagedEntry[];
  expandedStagedId: string | null;
}

const STORE_IN_DRAFT_KEY = 'cp-store-in-page-draft-v3';

const RECENT_STORE_IN_LIMIT = 10;

type BundleFieldName = 'no' | 'qty' | 'size' | 'range';
type BundleFieldRefs = Partial<Record<BundleFieldName, HTMLInputElement | null>>;

const makeBundleRow = (idx: number): BundleFormRow => ({
  tempId: crypto.randomUUID(),
  bundleNo: 'b-' + idx,
  bundleQty: '', size: '', numberRange: '',
});

const normalizeBundleNo = (value: string) => {
  const raw = value.trim();
  const match = raw.match(/^b\s*-?\s*(\d+)$/i);
  return match ? 'b-' + String(parseInt(match[1], 10)) : raw;
};

type BundleWithOrder<T extends { bundleNo: string }> = T & { bundleOrder?: number };

const orderBundlesForDisplay = <T extends { bundleNo: string }>(bundles: T[]): BundleWithOrder<T>[] => {
  const bundlesWithOrder = bundles as BundleWithOrder<T>[];
  const hasSavedOrder = bundlesWithOrder.some(bundle => typeof bundle.bundleOrder === 'number');
  if (!hasSavedOrder) return bundlesWithOrder;

  return bundlesWithOrder
    .map((bundle, originalIndex) => ({ bundle, originalIndex }))
    .sort((a, b) => {
      const aOrder = a.bundle.bundleOrder ?? a.originalIndex + 1;
      const bOrder = b.bundle.bundleOrder ?? b.originalIndex + 1;
      return aOrder === bOrder ? a.originalIndex - b.originalIndex : aOrder - bOrder;
    })
    .map(({ bundle }) => bundle);
};

// ── MiniStat ──────────────────────────────────────────────────────────────────
function MiniStat({ label, value, color }: {
  label: string; value: number; color?: 'orange' | 'blue' | 'green';
}) {
  const cls = color === 'orange' ? 'text-orange-700'
    : color === 'blue' ? 'text-blue-700'
    : color === 'green' ? 'text-emerald-700'
    : 'text-slate-700';
  return (
    <div className="rounded-lg bg-white border border-slate-200 px-3 py-2">
      <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className={'text-lg font-black ' + cls}>{value}</p>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function StoreInPage() {
  const {
    storeInRecords, eligibleStoreInItems,
    addStoreInRecord, updateStoreInRecord, deleteStoreInRecord,
    fetchRecords, fetchEligibleStoreInItems, fetchBulkBalances, bulkBalances,
  } = useInventoryStore();

  // Selection
  const [selectedStyleNo, setSelectedStyleNo] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [inAdNo, setInAdNo] = useState('');
  const [scheduleNo, setScheduleNo] = useState('');
  const [cutInDate, setCutInDate] = useState('');

  // Per-component IN Qty
  const [componentInQty, setComponentInQty] = useState<Record<string, string>>({});
  const [confirmedInQty, setConfirmedInQty] = useState<Record<string, boolean>>({});

  // Cut builder
  const [activeSubmissionId, setActiveSubmissionId] = useState('');
  const [activeCutNo, setActiveCutNo] = useState(''); 
  const [activeCutBundles, setActiveCutBundles] = useState<BundleFormRow[]>([makeBundleRow(1)]);
  const [activeCutQty, setActiveCutQty] = useState('');
  const [cutQtyConfirmed, setCutQtyConfirmed] = useState(false);
  const [editingCutTempId, setEditingCutTempId] = useState<string | null>(null);
  const [savedCuts, setSavedCuts] = useState<SavedCut[]>([]);

  // Staging
  const [stagedEntries, setStagedEntries] = useState<StagedEntry[]>([]);
  const [expandedStagedId, setExpandedStagedId] = useState<string | null>(null);

  // UI
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [cutErrors, setCutErrors] = useState<Record<string, string>>({});
  const [pageError, setPageError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingToDb, setIsSavingToDb] = useState(false);
  const [expandedRecordId, setExpandedRecordId] = useState<string | null>(null);
  const [locks, setLocks] = useState<Record<string, { isLocked: boolean }>>({});
  const [, setSystemStyleSchedules] = useState<StyleScheduleOption[]>([]);
  const [searchText, setSearchText] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = RECENT_STORE_IN_LIMIT;

  // Fast keyboard/focus workflow
  const cutQtyInputRef = useRef<HTMLInputElement | null>(null);
  const saveCutButtonRef = useRef<HTMLButtonElement | null>(null);
  const bundleInputRefs = useRef<Record<string, BundleFieldRefs>>({});
  const hasRestoredDraftRef = useRef(false);
  const skipNextDraftSaveRef = useRef(false);

  const focusInput = (input?: HTMLInputElement | HTMLButtonElement | null) => {
    window.setTimeout(() => {
      if (!input) return;
      input.focus();
      if (input instanceof HTMLInputElement) input.select();
    }, 40);
  };

  const setBundleInputRef = (tempId: string, field: BundleFieldName, el: HTMLInputElement | null) => {
    bundleInputRefs.current[tempId] = { ...(bundleInputRefs.current[tempId] || {}), [field]: el };
  };

  const focusBundleField = (tempId: string, field: BundleFieldName) => {
    window.setTimeout(() => {
      focusInput(bundleInputRefs.current[tempId]?.[field]);
    }, 60);
  };

  // ── Load ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const styleResPromise = fetch(API.BASE + '/api/dashboard/styles', { headers: getAuthHeaders() });
        await Promise.all([fetchRecords(), fetchEligibleStoreInItems(), fetchBulkBalances()]);
        const lockRes = await fetch(API.INVENTORY + '/store-in/locks', {
          headers: { Authorization: 'Bearer ' + localStorage.getItem('token') },
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


  // ── Draft persistence ─────────────────────────────────────────────────────
  // Keeps unsaved cuts/staging safe when the user accidentally navigates away.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORE_IN_DRAFT_KEY);
      if (!raw) {
        hasRestoredDraftRef.current = true;
        return;
      }

      const draft = JSON.parse(raw) as Partial<StoreInDraftSnapshot>;
      skipNextDraftSaveRef.current = true;
      if (draft.version !== 3) {
        localStorage.removeItem(STORE_IN_DRAFT_KEY);
        hasRestoredDraftRef.current = true;
        return;
      }

      setSelectedStyleNo(draft.selectedStyleNo || '');
      setSelectedCustomer(draft.selectedCustomer || '');
      setInAdNo(draft.inAdNo || '');
      setScheduleNo(draft.scheduleNo || '');
      setCutInDate(draft.cutInDate || '');
      setComponentInQty(draft.componentInQty || {});
      setConfirmedInQty(draft.confirmedInQty || {});
      setActiveSubmissionId(draft.activeSubmissionId || '');
      setActiveCutNo(draft.activeCutNo || '');
      setActiveCutBundles(draft.activeCutBundles?.length ? draft.activeCutBundles : [makeBundleRow(1)]);
      setActiveCutQty(draft.activeCutQty || '');
      setCutQtyConfirmed(!!draft.cutQtyConfirmed);
      setEditingCutTempId(draft.editingCutTempId || null);
      setSavedCuts(draft.savedCuts || []);
      setStagedEntries(draft.stagedEntries || []);
      setExpandedStagedId(draft.expandedStagedId || null);

      if ((draft.stagedEntries?.length || 0) > 0 || (draft.savedCuts?.length || 0) > 0 || draft.activeSubmissionId) {
        setSuccessMsg('Unsaved Store-In draft restored.');
        window.setTimeout(() => setSuccessMsg(''), 3500);
      }
    } catch (error) {
      console.error('Failed to restore Store-In draft:', error);
      localStorage.removeItem(STORE_IN_DRAFT_KEY);
    } finally {
      hasRestoredDraftRef.current = true;
    }
  }, []);

  useEffect(() => {
    if (!hasRestoredDraftRef.current) return;
    if (skipNextDraftSaveRef.current) {
      skipNextDraftSaveRef.current = false;
      return;
    }

    const hasMeaningfulDraft = Boolean(
      selectedStyleNo || selectedCustomer || inAdNo || scheduleNo || cutInDate ||
      Object.values(componentInQty).some(Boolean) || Object.values(confirmedInQty).some(Boolean) ||
      activeSubmissionId || activeCutNo || activeCutQty || savedCuts.length || stagedEntries.length ||
      activeCutBundles.some(b => b.bundleNo !== 'b-1' || b.bundleQty || b.size || b.numberRange)
    );

    try {
      if (!hasMeaningfulDraft) {
        localStorage.removeItem(STORE_IN_DRAFT_KEY);
        return;
      }

      const draft: StoreInDraftSnapshot = {
        version: 3,
        savedAt: new Date().toISOString(),
        selectedStyleNo,
        selectedCustomer,
        inAdNo,
        scheduleNo,
        cutInDate,
        componentInQty,
        confirmedInQty,
        activeSubmissionId,
        activeCutNo,
        activeCutBundles,
        activeCutQty,
        cutQtyConfirmed,
        editingCutTempId,
        savedCuts,
        stagedEntries,
        expandedStagedId,
      };

      localStorage.setItem(STORE_IN_DRAFT_KEY, JSON.stringify(draft));
    } catch (error) {
      console.error('Failed to save Store-In draft:', error);
    }
  }, [
    selectedStyleNo, selectedCustomer, inAdNo, scheduleNo, cutInDate,
    componentInQty, confirmedInQty, activeSubmissionId, activeCutNo,
    activeCutBundles, activeCutQty, cutQtyConfirmed, editingCutTempId,
    savedCuts, stagedEntries, expandedStagedId,
  ]);

  // ── Cascade options ───────────────────────────────────────────────────────
  const uniqueStyleNos = useMemo(() =>
    Array.from(new Set(eligibleStoreInItems.map(i => i.styleNo))).sort(),
    [eligibleStoreInItems]);

  const customersForStyle = useMemo(() => {
    if (!selectedStyleNo) return [];
    return Array.from(new Set(
      eligibleStoreInItems.filter(i => i.styleNo === selectedStyleNo).map(i => i.customerName)
    )).sort();
  }, [eligibleStoreInItems, selectedStyleNo]);

  const styleComponents = useMemo(() => {
    if (!selectedStyleNo || !selectedCustomer) return [];
    return eligibleStoreInItems.filter(
      i => i.styleNo === selectedStyleNo &&
           i.customerName === selectedCustomer &&
           i.remainingBulkQty > 0   
    );
  }, [eligibleStoreInItems, selectedStyleNo, selectedCustomer]);

  const visibleBulkBalances = useMemo(() =>
    bulkBalances.filter(bal => bal.remainingBulkQty > 0),
    [bulkBalances]);

  const bulkBalanceSummary = useMemo(() => {
    const uniqueActiveStyles = new Set(
      visibleBulkBalances.map(bal => bal.styleNo + '|||' + bal.customerName)
    ).size;

    return {
      uniqueActiveStyles,
      totalRemaining: visibleBulkBalances.reduce((sum, bal) => sum + bal.remainingBulkQty, 0),
      totalReceived: visibleBulkBalances.reduce((sum, bal) => sum + bal.totalInQty, 0),
      totalApproved: visibleBulkBalances.reduce((sum, bal) => sum + bal.approvedBulkQty, 0),
    };
  }, [visibleBulkBalances]);

  const getBulkBalanceComponentInfo = (bal: (typeof bulkBalances)[number]) => {
    const raw = bal as any;
    const matchedEligible = eligibleStoreInItems.find(item => item.submissionId === bal.submissionId);

    const componentName = String(
      raw.component ||
      raw.components ||
      raw.Component ||
      raw.Components ||
      matchedEligible?.components ||
      ''
    ).trim();

    const bodyColour = String(
      raw.bodyColour ||
      raw.BodyColour ||
      matchedEligible?.bodyColour ||
      ''
    ).trim();

    return {
      componentName: componentName || 'Component not set',
      bodyColour,
    };
  };

  const existingScheduleOptions = useMemo(() => {
    if (!selectedStyleNo || !selectedCustomer) return [];
    const fromRecords = storeInRecords
      .filter(r => r.styleNo === selectedStyleNo && r.customerName === selectedCustomer && !!r.scheduleNo)
      .map(r => r.scheduleNo.trim());
    const fromStaged = stagedEntries
      .filter(e => e.styleNo === selectedStyleNo && e.customerName === selectedCustomer && !!e.scheduleNo)
      .map(e => e.scheduleNo.trim());
    return Array.from(new Set([...fromRecords, ...fromStaged])).filter(Boolean).sort();
  }, [selectedStyleNo, selectedCustomer, storeInRecords, stagedEntries]);

  // ── Per-component helpers ─────────────────────────────────────────────────
  const getComponentInQty = (subId: string) => parseInt(componentInQty[subId] || '0') || 0;

  const setCompInQty = (subId: string, value: string) => {
    setComponentInQty(prev => ({ ...prev, [subId]: value }));
    if (errors.inQty) setErrors(p => ({ ...p, inQty: '' }));
  };

  const isComponentConfirmed = (subId: string) => !!confirmedInQty[subId];

  const anyComponentConfirmed = styleComponents.some(c => isComponentConfirmed(c.submissionId));

  const confirmComponentInQty = (subId: string) => {
    const qty = getComponentInQty(subId);
    if (qty <= 0) return;
    setConfirmedInQty(prev => ({ ...prev, [subId]: true }));

    // 1. Auto-fill IN QTY for other unconfirmed empty components
    setComponentInQty(prev => {
       const next = { ...prev };
       let changed = false;
       styleComponents.forEach(c => {
          if (c.submissionId !== subId && !isComponentConfirmed(c.submissionId) && !next[c.submissionId]) {
             next[c.submissionId] = String(qty);
             changed = true;
          }
       });
       return changed ? next : prev;
    });

    // 2. Auto-copy cuts from an already populated component
    setSavedCuts(prev => {
       const thisCompHasCuts = prev.some(c => c.submissionId === subId);
       if (thisCompHasCuts) return prev; 

       const sourceSubId = styleComponents.find(c =>
          c.submissionId !== subId && prev.some(cut => cut.submissionId === c.submissionId)
       )?.submissionId;

       if (sourceSubId) {
          const cutsToCopy = prev.filter(c => c.submissionId === sourceSubId);
          const compInfo = styleComponents.find(c => c.submissionId === subId);
          const sourceCompInfo = styleComponents.find(c => c.submissionId === sourceSubId);
          
          const targetCompName = compInfo?.components ?? '';
          const sourceCompName = sourceCompInfo?.components ?? '';

          const clonedCuts = cutsToCopy.map(c => ({
             ...c,
             tempId: crypto.randomUUID(),
             submissionId: subId,
             component: targetCompName,
             bodyColour: compInfo?.bodyColour ?? '',
             cutNo: c.cutNo.replace(sourceCompName, targetCompName),
             bundles: c.bundles.map(b => ({ ...b }))
          }));
          return [...prev, ...clonedCuts];
       }
       return prev;
    });
  };

  const unlockComponentInQty = (subId: string) => {
    if (savedCuts.some(c => c.submissionId === subId)) return;
    setConfirmedInQty(prev => ({ ...prev, [subId]: false }));
  };

  // ── Quantity totals ───────────────────────────────────────────────────────
  const inQtyNum = styleComponents.reduce((s, c) => s + getComponentInQty(c.submissionId), 0);

  const stagedCutQtyBySubmission = useMemo(() => {
    const map: Record<string, number> = {};
    savedCuts.forEach(c => { map[c.submissionId] = (map[c.submissionId] || 0) + c.cutQty; });
    return map;
  }, [savedCuts]);

  const totalCutQty = savedCuts.reduce((s, c) => s + c.cutQty, 0);
  const uncutBalance = Math.max(0, inQtyNum - totalCutQty);

  const openCutBuilderForComponent = (comp: EligibleStoreInItem) => {
    const compCuts = savedCuts.filter(c => c.submissionId === comp.submissionId);
    const compInQty = getComponentInQty(comp.submissionId);
    const alreadyCutQty = compCuts.reduce((sum, cut) => sum + cut.cutQty, 0);
    const suggestedCutQty = Math.max(0, compInQty - alreadyCutQty);

    setActiveSubmissionId(comp.submissionId);
    setEditingCutTempId(null);
    setActiveCutBundles([makeBundleRow(1)]);
    setActiveCutQty(suggestedCutQty > 0 ? String(suggestedCutQty) : '');
    setCutQtyConfirmed(false);
    setCutErrors({});
    setActiveCutNo(`${comp.components} Cut ${compCuts.length + 1}`);
    window.setTimeout(() => focusInput(cutQtyInputRef.current), 60);
  };

  const handleConfirmComponentInQty = (comp: EligibleStoreInItem) => {
    const qty = getComponentInQty(comp.submissionId);
    if (qty <= 0 || qty > comp.remainingBulkQty) return;

    const sourceCutsExist = savedCuts.some(c => c.submissionId !== comp.submissionId);
    const alreadyHasCuts = savedCuts.some(c => c.submissionId === comp.submissionId);

    confirmComponentInQty(comp.submissionId);

    // For the first component, immediately open the cut builder and prefill Cut Qty.
    // For later components, do not open over auto-copied cuts from the first component.
    if (!sourceCutsExist && !alreadyHasCuts) {
      openCutBuilderForComponent(comp);
    }
  };

  const confirmCutQtyAndPrefillBundle = () => {
    const cutQtyNum = parseInt(activeCutQty) || 0;
    if (cutQtyNum <= 0) {
      setCutErrors(p => ({ ...p, cutQty: 'Cut Qty must be > 0' }));
      return;
    }

    setCutQtyConfirmed(true);
    setCutErrors(p => ({ ...p, cutQty: '' }));

    setActiveCutBundles(prev => {
      if (prev.length === 0) return [{ ...makeBundleRow(1), bundleQty: String(cutQtyNum) }];
      const totalEntered = prev.reduce((sum, b) => sum + (parseInt(b.bundleQty) || 0), 0);
      if (totalEntered > 0) return prev;
      return prev.map((b, index) => index === 0 ? { ...b, bundleQty: String(cutQtyNum) } : b);
    });

    const firstBundle = activeCutBundles[0];
    if (firstBundle) focusBundleField(firstBundle.tempId, 'no');
  };

  const handleStageComponentClick = (comp: EligibleStoreInItem) => {
    const otherComponents = styleComponents
      .filter(c => c.submissionId !== comp.submissionId)
      .map(c => c.components)
      .filter(Boolean);

    if (otherComponents.length > 0) {
      const proceed = window.confirm(
        `You are about to stage only ${comp.components} to the database queue.\n\n` +
        `If the next component(s) (${otherComponents.join(', ')}) have not already been confirmed/copied/staged, the copied cut and bundle details will not be available after ${comp.components} is cleared.\n\n` +
        `Confirm or copy the other components first if you want the same cut/bundle data.\n\n` +
        `Continue staging only ${comp.components}?`
      );
      if (!proceed) return;
    }

    stageComponent(comp);
  };

  // ── Cut builder ───────────────────────────────────────────────────────────
  const addBundle = () => {
    let nextTempId = '';
    setActiveCutBundles(prev => {
      const row = makeBundleRow(prev.length + 1);
      nextTempId = row.tempId;
      return [...prev, row];
    });
    window.setTimeout(() => {
      if (nextTempId) focusBundleField(nextTempId, 'no');
    }, 60);
  };
  const removeBundle = (id: string) =>
    setActiveCutBundles(prev => prev.filter(b => b.tempId !== id));
  const updateBundle = (id: string, field: keyof BundleFormRow, value: string) =>
    setActiveCutBundles(prev => prev.map(b => b.tempId === id ? { ...b, [field]: value } : b));

  // ── Validate cut ──────────────────────────────────────────────────────────
  const validateActiveCut = (): boolean => {
    const errs: Record<string, string> = {};
    if (!activeSubmissionId) errs.component = 'Select a component for this cut';
    if (!activeCutNo.trim()) errs.cutNo = 'Cut name/number is required';

    const cutQtyNum = parseInt(activeCutQty) || 0;
    if (cutQtyNum <= 0) errs.cutQty = 'Cut Qty must be > 0';

    if (activeSubmissionId && cutQtyNum > 0) {
      const comp = styleComponents.find(c => c.submissionId === activeSubmissionId);
      if (comp) {
        const alreadyUsed = stagedCutQtyBySubmission[activeSubmissionId] || 0;
        const alreadyEditing = editingCutTempId
          ? savedCuts.find(c => c.tempId === editingCutTempId)?.cutQty || 0 : 0;
        const remainingBulk = comp.remainingBulkQty - (alreadyUsed - alreadyEditing);
        if (cutQtyNum > remainingBulk)
          errs.cutQty = 'Exceeds remaining bulk for ' + comp.components + ' (' + remainingBulk + ' remaining)';

        const compEnteredInQty = getComponentInQty(activeSubmissionId);
        if (compEnteredInQty > 0) {
          const balance = Math.max(0, compEnteredInQty - (alreadyUsed - alreadyEditing));
          if (cutQtyNum > balance)
            errs.cutQty = 'Exceeds ' + comp.components + ' IN Qty balance (' + balance + ' left of ' + compEnteredInQty + ')';
        } else {
          errs.cutQty = 'Enter IN Qty for ' + comp.components + ' before adding cuts';
        }
      }
    }

    if (activeCutBundles.length === 0) errs.bundles = 'At least one bundle is required';
    const totalBundleQty = activeCutBundles.reduce((s, b) => s + (parseInt(b.bundleQty) || 0), 0);
    const cq = parseInt(activeCutQty) || 0;
    if (cq > 0 && totalBundleQty !== cq) {
      errs.bundles = totalBundleQty > cq
        ? 'Bundle total (' + totalBundleQty + ') exceeds cut qty (' + cq + ')'
        : 'Bundle total (' + totalBundleQty + ') must equal cut qty (' + cq + ') — unbundled: ' + (cq - totalBundleQty);
    }
    const bundleNos = activeCutBundles.map(b => normalizeBundleNo(b.bundleNo).toLowerCase());
    if (bundleNos.length !== new Set(bundleNos).size) errs.bundles = 'Duplicate bundle numbers';
    activeCutBundles.forEach((b, i) => {
      if (!b.bundleNo.trim())               errs['b_' + i + '_no']    = 'Required';
      if ((parseInt(b.bundleQty) || 0) <= 0) errs['b_' + i + '_qty'] = '> 0';
      if (!b.size.trim())                   errs['b_' + i + '_size']  = 'Required';
      if (!b.numberRange.trim())            errs['b_' + i + '_range'] = 'Required';
    });
    setCutErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSaveCut = () => {
    if (!validateActiveCut()) return;
    const comp = styleComponents.find(c => c.submissionId === activeSubmissionId);
    const sourceCompName = comp?.components ?? ''; 
    
    const newCut: SavedCut = {
      tempId:       editingCutTempId ?? crypto.randomUUID(),
      cutNo:        activeCutNo.trim(),
      component:    sourceCompName,
      submissionId: activeSubmissionId,
      bodyColour:   comp?.bodyColour ?? '',
      cutQty:       parseInt(activeCutQty) || 0,
      bundles: activeCutBundles.map((b, index) => ({
        bundleNo:    normalizeBundleNo(b.bundleNo),
        bundleQty:   parseInt(b.bundleQty) || 0,
        size:        b.size.trim(),
        numberRange: b.numberRange.trim(),
        bundleOrder: index + 1,
      })),
    };
    
    if (editingCutTempId) {
      setSavedCuts(prev => prev.map(c => c.tempId === editingCutTempId ? newCut : c));
      setEditingCutTempId(null);
    } else {
      setSavedCuts(prev => {
         const toAdd = [newCut];
         const otherComps = styleComponents.filter(c => c.submissionId !== activeSubmissionId && isComponentConfirmed(c.submissionId));

         otherComps.forEach(otherComp => {
            toAdd.push({
               ...newCut,
               tempId: crypto.randomUUID(),
               submissionId: otherComp.submissionId,
               component: otherComp.components,
               bodyColour: otherComp.bodyColour,
               cutNo: newCut.cutNo.replace(sourceCompName, otherComp.components),
               bundles: newCut.bundles.map(b => ({ ...b }))
            });
         });
         return [...prev, ...toAdd];
      });
    }
    setActiveCutBundles([makeBundleRow(1)]);
    setActiveCutQty('');
    setActiveCutNo('');
    setActiveSubmissionId('');
    setCutErrors({});
  };

  const handleEditSavedCut = (cut: SavedCut) => {
    setEditingCutTempId(cut.tempId);
    setActiveSubmissionId(cut.submissionId);
    setActiveCutNo(cut.cutNo);
    setActiveCutQty(cut.cutQty.toString());
    
    setActiveCutBundles(orderBundlesForDisplay(cut.bundles).map(b => ({
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
    setActiveCutNo('');
    setActiveSubmissionId('');
    setCutErrors({});
  };

  const handleRemoveSavedCut = (tempId: string) =>
    setSavedCuts(prev => prev.filter(c => c.tempId !== tempId));

  // ── Form validation ───────────────────────────────────────────────────────
  const validateForm = (): boolean => {
    const errs: Record<string, string> = {};
    if (!selectedStyleNo)   errs.styleNo    = 'Select a style number';
    if (!selectedCustomer)  errs.customer   = 'Select a customer';
    if (!inAdNo.trim())     errs.inAdNo     = 'IN-AD No is required';
    if (!cutInDate)         errs.cutInDate  = 'Cut In Date is required';
    if (inQtyNum <= 0)      errs.inQty      = 'Enter IN Qty for at least one component';

    const confirmedComps = styleComponents.filter(c => isComponentConfirmed(c.submissionId));
    if (confirmedComps.length === 0)
      errs.inQty = 'Confirm IN Qty for at least one component';

    confirmedComps.forEach(comp => {
      const compCuts = savedCuts.filter(c => c.submissionId === comp.submissionId);
      if (compCuts.length === 0)
        errs.cuts = 'Add at least one cut for ' + comp.components + ' before saving';
    });

    if (savedCuts.length === 0) errs.cuts = 'Add at least one cut before saving';
    if (totalCutQty > inQtyNum && inQtyNum > 0)
      errs.cuts = 'Total cut qty (' + totalCutQty + ') exceeds total IN qty (' + inQtyNum + ')';

    styleComponents.forEach(comp => {
      const compCutQty = savedCuts
        .filter(c => c.submissionId === comp.submissionId)
        .reduce((s, c) => s + c.cutQty, 0);
      const compInQty = getComponentInQty(comp.submissionId);
      if (compInQty > 0 && compCutQty > compInQty)
        errs.cuts = comp.components + ' cuts (' + compCutQty + ') exceed its IN Qty (' + compInQty + ')';
      if (compInQty > comp.remainingBulkQty)
        errs['inQty_' + comp.submissionId] = comp.components + ' IN Qty exceeds remaining bulk';
    });

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const resetForm = () => {
    setSelectedStyleNo(''); setSelectedCustomer('');
    setInAdNo(''); setScheduleNo(''); setCutInDate('');
    setComponentInQty({}); setConfirmedInQty({});
    setSavedCuts([]); setActiveCutBundles([makeBundleRow(1)]);
    setActiveCutQty(''); setActiveCutNo(''); setActiveSubmissionId('');
    setCutQtyConfirmed(false);
    setEditingCutTempId(null); setEditingRecordId(null);
    setErrors({}); setCutErrors({}); setPageError('');
    localStorage.removeItem(STORE_IN_DRAFT_KEY);
  };

  // ── Stage a single component ─────────────────────────────────────────────
  const stageComponent = (comp: EligibleStoreInItem) => {
    if (!inAdNo.trim()) { setErrors(p => ({ ...p, inAdNo: 'IN-AD No is required' })); return; }
    if (!cutInDate)     { setErrors(p => ({ ...p, cutInDate: 'Cut In Date is required' })); return; }

    const compCuts  = savedCuts.filter(c => c.submissionId === comp.submissionId);
    const compInQty = getComponentInQty(comp.submissionId);

    if (compCuts.length === 0) {
      setErrors(p => ({ ...p, cuts: 'Add at least one cut for ' + comp.components + ' before staging' }));
      return;
    }
    if (compInQty <= 0) {
      setErrors(p => ({ ...p, inQty: 'Confirm IN Qty for ' + comp.components + ' first' }));
      return;
    }

    const entry: StagedEntry = {
      tempId:       crypto.randomUUID(),
      styleNo:      selectedStyleNo,
      customerName: selectedCustomer,
      components:   comp.components,
      inAdNo:       inAdNo.trim(),
      scheduleNo:   scheduleNo.trim(),
      cutInDate,
      inQty:        compInQty,
      cuts: compCuts.map(c => ({
        tempId:       c.tempId,
        cutNo:        c.cutNo,
        cutQty:       c.cutQty,
        submissionId: c.submissionId,
        bundles:      orderBundlesForDisplay(c.bundles),
      })),
    };

    setStagedEntries(prev => [...prev, entry]);
    setSuccessMsg(comp.components + ' staged successfully.');
    setTimeout(() => setSuccessMsg(''), 3000);

    // Clear this component's data only
    setSavedCuts(prev => prev.filter(c => c.submissionId !== comp.submissionId));
    setConfirmedInQty(prev => { const next = { ...prev }; delete next[comp.submissionId]; return next; });
    setComponentInQty(prev => { const next = { ...prev }; delete next[comp.submissionId]; return next; });
    if (activeSubmissionId === comp.submissionId) {
      setActiveSubmissionId('');
      setActiveCutBundles([makeBundleRow(1)]);
      setActiveCutQty('');
      setActiveCutNo('');
    }
    setErrors({});
  };

  const removeStagedEntry = (tempId: string) =>
    setStagedEntries(prev => prev.filter(e => e.tempId !== tempId));

  const handleEditStagedEntry = (entry: StagedEntry) => {
    const primarySubId = entry.cuts[0]?.submissionId ?? '';
    if (!primarySubId) return;

    const proceed = window.confirm(
      `Move ${entry.components} back to the Store-In form for editing?\n\n` +
      `This will remove it from the staging queue only. It will not affect other staged components and nothing will be saved to the database until you click Save All.`
    );
    if (!proceed) return;

    const compInfo = eligibleStoreInItems.find(i => i.submissionId === primarySubId);

    setSelectedStyleNo(entry.styleNo);
    setSelectedCustomer(entry.customerName);
    setInAdNo(entry.inAdNo);
    setScheduleNo(entry.scheduleNo);
    setCutInDate(entry.cutInDate);
    setComponentInQty(prev => ({ ...prev, [primarySubId]: String(entry.inQty) }));
    setConfirmedInQty(prev => ({ ...prev, [primarySubId]: true }));
    setSavedCuts(prev => {
      const withoutThisComponent = prev.filter(c => c.submissionId !== primarySubId);
      const restoredCuts: SavedCut[] = entry.cuts.map(cut => ({
        tempId: cut.tempId || crypto.randomUUID(),
        cutNo: cut.cutNo,
        component: entry.components,
        submissionId: cut.submissionId,
        bodyColour: compInfo?.bodyColour ?? '',
        cutQty: cut.cutQty,
        bundles: orderBundlesForDisplay(cut.bundles).map((b, index) => ({
          ...b,
          bundleOrder: b.bundleOrder ?? index + 1,
        })),
      }));
      return [...withoutThisComponent, ...restoredCuts];
    });
    setStagedEntries(prev => prev.filter(e => e.tempId !== entry.tempId));
    setExpandedStagedId(null);
    setActiveSubmissionId('');
    setActiveCutNo('');
    setActiveCutQty('');
    setCutQtyConfirmed(false);
    setActiveCutBundles([makeBundleRow(1)]);
    setEditingCutTempId(null);
    setErrors({});
    setCutErrors({});
    setSuccessMsg(entry.components + ' moved back to the form for editing.');
    window.setTimeout(() => setSuccessMsg(''), 3500);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ── Save to DB ────────────────────────────────────────────────────────────
  const handleSaveToDatabase = async () => {
    if (stagedEntries.length === 0) return;
    setIsSavingToDb(true); setPageError('');
    try {
      for (const entry of stagedEntries) {
        const primarySubId = entry.cuts[0]?.submissionId ?? '';
        await addStoreInRecord({
          submissionId: primarySubId,
          inAdNo:       entry.inAdNo,
          scheduleNo:   entry.scheduleNo,
          cutInDate:    entry.cutInDate,
          inQty:        entry.inQty,
          cuts:         entry.cuts,
        });
        await new Promise(r => setTimeout(r, 100));
      }
      const count = stagedEntries.length;
      setStagedEntries([]);
      resetForm();
      await Promise.all([fetchRecords(), fetchEligibleStoreInItems(), fetchBulkBalances()]);
      setSuccessMsg('Successfully saved ' + count + ' entry(ies) to database.');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Failed to save to database.');
    } finally {
      setIsSavingToDb(false);
    }
  };

  // ── Edit existing record ──────────────────────────────────────────────────
  const handleDirectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsSaving(true); setPageError('');
    try {
      const primarySubId = savedCuts[0]?.submissionId ?? '';
      await updateStoreInRecord(editingRecordId!, {
        submissionId: primarySubId,
        inAdNo:       inAdNo.trim(),
        scheduleNo:   scheduleNo.trim(),
        cutInDate,
        inQty:        inQtyNum,
        cuts: savedCuts.map(c => ({
          cutNo: c.cutNo, cutQty: c.cutQty,
          submissionId: c.submissionId, bundles: orderBundlesForDisplay(c.bundles),
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
    setSelectedStyleNo(record.styleNo);
    setSelectedCustomer(record.customerName);
    setInAdNo(record.inAdNo || '');
    setScheduleNo(record.scheduleNo);
    setCutInDate(record.cutInDate);
    const compQtyMap: Record<string, string> = {};
    record.cuts.forEach(c => {
      const subId = (c as any).submissionId;
      if (subId) compQtyMap[subId] = String((parseInt(compQtyMap[subId] || '0') || 0) + c.cutQty);
    });
    if (Object.keys(compQtyMap).length === 0) compQtyMap[''] = record.inQty.toString();
    setComponentInQty(compQtyMap);
    setSavedCuts(record.cuts.map(c => ({
      tempId:       crypto.randomUUID(),
      cutNo:        c.cutNo,
      component:    c.cutNo.split(' ')[0] ?? '',
      submissionId: (c as any).submissionId ?? '',
      bodyColour:   '',
      cutQty:       c.cutQty,
      bundles:      orderBundlesForDisplay(c.bundles).map((b, index) => ({
        bundleNo: normalizeBundleNo(b.bundleNo), bundleQty: b.bundleQty,
        size: b.size, numberRange: b.numberRange,
        bundleOrder: b.bundleOrder ?? index + 1,
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

  // ── Filter / paginate ─────────────────────────────────────────────────────
  const filteredRecords = useMemo(() => {
    let records = [...storeInRecords];
    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      records = records.filter(r =>
        r.styleNo.toLowerCase().includes(q) ||
        r.customerName.toLowerCase().includes(q) ||
        r.inAdNo?.toLowerCase().includes(q) ||
        r.scheduleNo.toLowerCase().includes(q) ||
        r.bodyColour?.toLowerCase().includes(q) ||
        r.season?.toLowerCase().includes(q)
      );
    }
    if (filterDateFrom) records = records.filter(r => r.cutInDate >= filterDateFrom);
    if (filterDateTo)   records = records.filter(r => r.cutInDate <= filterDateTo);
    return records;
  }, [storeInRecords, searchText, filterDateFrom, filterDateTo]);

  const hasRecordFilters = !!(searchText.trim() || filterDateFrom || filterDateTo);
  const recentRecords = useMemo(() =>
    hasRecordFilters ? filteredRecords : filteredRecords.slice(0, RECENT_STORE_IN_LIMIT),
    [filteredRecords, hasRecordFilters]);

  const totalPages = Math.max(1, Math.ceil(recentRecords.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedRecords = useMemo(() =>
    recentRecords.slice((safePage - 1) * pageSize, safePage * pageSize),
    [recentRecords, safePage]);

  const scheduleDatalistId = 'sched-' + selectedStyleNo + '-' + selectedCustomer;

  // ==========================================
  // RENDER
  // ==========================================
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-6xl space-y-8 pb-12">

      {/* Header */}
      <div className="flex items-center space-x-3 border-b border-slate-200 pb-4">
        <div className="rounded-lg bg-orange-100 p-2"><PackageOpen className="h-6 w-6 text-orange-700" /></div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Store In (Receiving)</h2>
          <p className="text-sm text-slate-500">Confirm IN Qty per component, then add cuts. Each component saves independently.</p>
        </div>
      </div>

      {/* Bulk Balance Strip — compact one-row overview so many styles do not push the form down */}
      {visibleBulkBalances.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-slate-800">Bulk Balance Overview</p>
              <p className="text-xs text-slate-500">
                {visibleBulkBalances.length} active component balance{visibleBulkBalances.length !== 1 ? 's' : ''}
                {' '}across {bulkBalanceSummary.uniqueActiveStyles} style{bulkBalanceSummary.uniqueActiveStyles !== 1 ? 's' : ''}. Scroll sideways to view all.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-[11px]">
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-600">
                Received <span className="font-black text-slate-900">{bulkBalanceSummary.totalReceived}</span>
              </span>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-600">
                Approved <span className="font-black text-slate-900">{bulkBalanceSummary.totalApproved}</span>
              </span>
              <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-blue-700">
                Remaining <span className="font-black">{bulkBalanceSummary.totalRemaining}</span>
              </span>
            </div>
          </div>

          <div className="overflow-x-auto pb-1">
            <div className="flex min-w-max gap-3 pr-2">
              {visibleBulkBalances.map(bal => {
                const receivedPercent = Math.min(
                  100,
                  bal.approvedBulkQty > 0 ? (bal.totalInQty / bal.approvedBulkQty) * 100 : 0
                );
                const { componentName, bodyColour } = getBulkBalanceComponentInfo(bal);

                return (
                  <div
                    key={bal.submissionId}
                    className="w-60 shrink-0 rounded-lg border border-slate-200 bg-slate-50/70 p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[11px] font-medium text-slate-500">{bal.customerName}</p>
                        <p className="truncate text-sm font-black text-slate-900">{bal.styleNo}</p>
                        <div className="mt-1 inline-flex max-w-full items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5">
                          <span className="shrink-0 text-[8px] font-black uppercase tracking-wide text-indigo-400">Component</span>
                          <span className="truncate text-[10px] font-black text-indigo-700">{componentName}</span>
                        </div>
                        {bodyColour && (
                          <p className="mt-1 truncate text-[10px] font-medium text-slate-500">{bodyColour}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] uppercase tracking-wide text-slate-400">Remaining</p>
                        <p className="text-lg font-black text-blue-700">{bal.remainingBulkQty}</p>
                      </div>
                    </div>

                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white ring-1 ring-slate-100">
                      <div
                        className="h-full rounded-full bg-blue-500 transition-all"
                        style={{ width: receivedPercent + '%' }}
                      />
                    </div>

                    <div className="mt-2 flex justify-between text-[10px] text-slate-400">
                      <span>Received: <span className="font-bold text-slate-600">{bal.totalInQty}</span></span>
                      <span>Approved: <span className="font-bold text-slate-600">{bal.approvedBulkQty}</span></span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {pageError  && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600"><AlertCircle className="mr-1 inline h-4 w-4" />{pageError}</div>}
      {successMsg && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"><CheckCircle2 className="mr-1 inline h-4 w-4" />{successMsg}</div>}

      {/* Main Form */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-800">{editingRecordId ? 'Edit Store-In Entry' : 'New Store-In Entry'}</h3>
          {editingRecordId && <span className="animate-pulse rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">EDIT MODE</span>}
        </div>

        <form onSubmit={handleDirectSubmit} className="space-y-6">

          {/* Style & Schedule */}
          <div className="rounded-lg border border-blue-200 bg-blue-50/60 p-5 space-y-4">
            <h4 className="border-b border-blue-200 pb-2 text-sm font-bold uppercase tracking-wider text-blue-800">Style & Schedule</h4>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">

              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-600">Style No <span className="text-red-500">*</span></label>
                <select value={selectedStyleNo}
                  onChange={e => { setSelectedStyleNo(e.target.value); setSelectedCustomer(''); setSavedCuts([]); setErrors(p => ({ ...p, styleNo: '', customer: '' })); }}
                  disabled={!!editingRecordId}
                  className={'w-full rounded-lg border px-3 py-2 text-sm outline-none bg-white ' + (errors.styleNo ? 'border-red-400 bg-red-50' : 'border-slate-300 focus:ring-2 focus:ring-blue-500') + (editingRecordId ? ' cursor-not-allowed bg-slate-100' : '')}>
                  <option value="">Select style no...</option>
                  {uniqueStyleNos.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                {errors.styleNo && <p className="text-[11px] text-red-600"><AlertCircle className="mr-1 inline h-3 w-3" />{errors.styleNo}</p>}
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-600">Customer <span className="text-red-500">*</span></label>
                <select value={selectedCustomer}
                  onChange={e => { setSelectedCustomer(e.target.value); setSavedCuts([]); setErrors(p => ({ ...p, customer: '' })); }}
                  disabled={!!editingRecordId || !selectedStyleNo}
                  className={'w-full rounded-lg border px-3 py-2 text-sm outline-none bg-white ' + (errors.customer ? 'border-red-400 bg-red-50' : 'border-slate-300 focus:ring-2 focus:ring-blue-500') + ((!selectedStyleNo || editingRecordId) ? ' cursor-not-allowed bg-slate-100 text-slate-400' : '')}>
                  <option value="">{!selectedStyleNo ? 'Select style first...' : 'Select customer...'}</option>
                  {customersForStyle.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                {errors.customer && <p className="text-[11px] text-red-600"><AlertCircle className="mr-1 inline h-3 w-3" />{errors.customer}</p>}
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-600">IN-AD No <span className="text-red-500">*</span></label>
                <input type="text" value={inAdNo}
                  onChange={e => { setInAdNo(e.target.value); if (errors.inAdNo) setErrors(p => ({ ...p, inAdNo: '' })); }}
                  placeholder="e.g. AD-2026"
                  className={'w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none ' + (errors.inAdNo ? 'border-red-400 bg-red-50' : 'border-slate-300 focus:ring-2 focus:ring-blue-500')} />
                {errors.inAdNo && <p className="text-[11px] text-red-600"><AlertCircle className="mr-1 inline h-3 w-3" />{errors.inAdNo}</p>}
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-600">Schedule No</label>
                <input type="text" list={scheduleDatalistId} value={scheduleNo}
                  onChange={e => { setScheduleNo(e.target.value); if (errors.scheduleNo) setErrors(p => ({ ...p, scheduleNo: '' })); }}
                  disabled={!selectedCustomer}
                  placeholder={selectedCustomer ? 'Type or pick...' : 'Select customer first...'}
                  autoComplete="off"
                  className={'w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none ' + (errors.scheduleNo ? 'border-red-400 bg-red-50' : 'border-slate-300 focus:ring-2 focus:ring-blue-500') + (!selectedCustomer ? ' cursor-not-allowed bg-slate-100 text-slate-400' : '')} />
                <datalist id={scheduleDatalistId}>
                  {existingScheduleOptions.map(s => <option key={s} value={s} />)}
                </datalist>
                {errors.scheduleNo && <p className="text-[11px] text-red-600"><AlertCircle className="mr-1 inline h-3 w-3" />{errors.scheduleNo}</p>}
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-600">Cut In Date <span className="text-red-500">*</span></label>
                <input type="date" value={cutInDate}
                  onChange={e => { setCutInDate(e.target.value); if (errors.cutInDate) setErrors(p => ({ ...p, cutInDate: '' })); }}
                  className={'w-full rounded-lg border px-3 py-2 text-sm outline-none ' + (errors.cutInDate ? 'border-red-400 bg-red-50' : 'border-slate-300 focus:ring-2 focus:ring-blue-500')} />
                {errors.cutInDate && <p className="text-[11px] text-red-600"><AlertCircle className="mr-1 inline h-3 w-3" />{errors.cutInDate}</p>}
              </div>
            </div>

            {styleComponents.length > 0 && (
              <div className="mt-2">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-2">Approved Components</p>
                <div className="flex flex-wrap gap-2">
                  {styleComponents.map(comp => {
                    const used = stagedCutQtyBySubmission[comp.submissionId] || 0;
                    const rem = comp.remainingBulkQty - used;
                    return (
                      <div key={comp.submissionId} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
                        <span className="text-xs font-bold text-indigo-700">{comp.components}</span>
                        <span className="text-[10px] text-slate-400">·</span>
                        <span className="text-xs text-slate-600">{comp.bodyColour}</span>
                        <span className="text-[10px] text-slate-400">·</span>
                        <span className={'text-xs font-bold ' + (rem > 0 ? 'text-blue-700' : 'text-emerald-600')}>{rem} remaining</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Quantities per Component */}
          {styleComponents.length > 0 && (
            <div className="rounded-lg border border-orange-200 bg-orange-50/60 p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-orange-200 pb-2 flex-wrap gap-2">
                <h4 className="text-sm font-bold uppercase tracking-wider text-orange-800">Quantities per Component</h4>
                <div className="text-xs text-slate-500 flex items-center gap-3">
                  <span>Total IN: <span className="font-bold text-orange-700">{inQtyNum || '—'}</span></span>
                  {inQtyNum > 0 && <span>Total Cut: <span className={'font-bold ' + (totalCutQty > inQtyNum ? 'text-red-600' : 'text-slate-700')}>{totalCutQty}</span></span>}
                  {inQtyNum > 0 && <span>Uncut: <span className={'font-bold ' + (uncutBalance > 0 ? 'text-amber-700' : 'text-slate-500')}>{uncutBalance}</span></span>}
                </div>
              </div>

              {errors.inQty && <p className="text-[11px] text-red-600"><AlertCircle className="mr-1 inline h-3 w-3" />{errors.inQty}</p>}

              {!anyComponentConfirmed && (
                <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  Enter IN Qty for a component and click <strong className="mx-1">Confirm</strong> to start adding cuts. Each component saves independently.
                </div>
              )}

              <div className="space-y-3">
                {styleComponents.map(comp => {
                  const compInQty  = getComponentInQty(comp.submissionId);
                  const compCutQty = stagedCutQtyBySubmission[comp.submissionId] || 0;
                  const compUncut  = Math.max(0, compInQty - compCutQty);
                  const remaining  = comp.remainingBulkQty;
                  const overLimit  = compInQty > remaining;
                  const confirmed  = isComponentConfirmed(comp.submissionId);
                  const hasCuts    = savedCuts.some(c => c.submissionId === comp.submissionId);

                  return (
                    <div key={comp.submissionId}
                      className={'rounded-lg border bg-white p-4 shadow-sm transition-all ' + (confirmed ? 'border-emerald-300' : 'border-slate-200')}>

                      <div className="flex items-center gap-2 mb-3 flex-wrap">
                        <span className="text-sm font-bold text-indigo-700">{comp.components}</span>
                        <span className="text-xs text-slate-400">·</span>
                        <span className="text-xs text-slate-600">{comp.bodyColour}</span>
                        {confirmed && (
                          <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                            <CheckCircle2 className="h-3 w-3" /> Confirmed
                          </span>
                        )}
                        <span className="ml-auto text-[10px] text-slate-400">
                          Approved: <span className="font-bold text-slate-600">{comp.approvedBulkQty}</span>
                          {' · '}Remaining: <span className={'font-bold ' + (remaining > 0 ? 'text-blue-700' : 'text-emerald-600')}>{remaining}</span>
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-3 items-end">
                        <div className="space-y-1">
                          <label className="block text-[10px] font-medium text-slate-500">IN Qty <span className="text-red-500">*</span></label>
                          <input
                            type="text" inputMode="numeric" pattern="[0-9]*"
                            value={componentInQty[comp.submissionId] || ''}
                            readOnly={confirmed}
                            onChange={e => { if (confirmed) return; setCompInQty(comp.submissionId, e.target.value.replace(/[^0-9]/g, '')); }}
                            onKeyDown={e => {
                              if (e.key === 'Enter' && !confirmed && compInQty > 0 && !overLimit) {
                                e.preventDefault();
                                handleConfirmComponentInQty(comp);
                              }
                            }}
                            placeholder="e.g. 500"
                            className={'w-full rounded-lg border px-3 py-2 text-sm font-bold outline-none transition-all ' + (confirmed ? 'border-emerald-200 bg-emerald-50 text-emerald-800 cursor-not-allowed' : overLimit ? 'border-red-400 bg-red-50 text-red-700 focus:ring-2 focus:ring-red-300' : 'border-slate-300 focus:ring-2 focus:ring-orange-500')} />
                          {overLimit && !confirmed && <p className="text-[10px] text-red-600">Exceeds remaining bulk ({remaining})</p>}
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[10px] font-medium text-slate-500">Cut Qty</label>
                          <div className={'rounded-lg border px-3 py-2 text-sm font-bold ' + (compCutQty > compInQty && compInQty > 0 ? 'border-red-200 bg-red-50 text-red-700' : 'border-slate-200 bg-slate-50 text-slate-700')}>
                            {compCutQty || '—'}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[10px] font-medium text-slate-500">Uncut Balance</label>
                          <div className={'rounded-lg border px-3 py-2 text-sm font-bold ' + (compUncut > 0 ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-slate-200 bg-slate-50 text-slate-500')}>
                            {compInQty > 0 ? compUncut : '—'}
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center gap-2">
                        {!confirmed ? (
                          <button type="button"
                            onClick={() => handleConfirmComponentInQty(comp)}
                            disabled={compInQty <= 0 || overLimit}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-orange-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-orange-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Confirm IN Qty
                          </button>
                        ) : (
                          <button type="button"
                            onClick={() => unlockComponentInQty(comp.submissionId)}
                            disabled={hasCuts}
                            title={hasCuts ? 'Remove cuts for this component first' : 'Edit IN Qty'}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                            <Pencil className="h-3 w-3" />
                            {hasCuts ? 'Locked (cuts exist)' : 'Edit IN Qty'}
                          </button>
                        )}
                        {confirmed && compInQty > 0 && (
                          <span className="text-[10px] text-slate-400">{compCutQty} cut · {compUncut} remaining to cut</span>
                        )}
                      </div>

                      {/* Inline cut builder for this component */}
                      {confirmed && (
                        <div className="mt-4 border-t border-slate-100 pt-4 space-y-2">
                          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Cuts for {comp.components}</p>

                          {savedCuts.filter(c => c.submissionId === comp.submissionId).map(cut => (
                            <div key={cut.tempId}
                              className={'rounded-lg border px-3 py-2.5 ' + (editingCutTempId === cut.tempId ? 'border-amber-300 bg-amber-50' : 'border-slate-200 bg-slate-50')}>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Layers className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                  <span className="text-sm font-bold text-slate-800">{cut.cutNo}</span>
                                  <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold">Qty: {cut.cutQty}</span>
                                  <span className="text-[10px] text-slate-400">{cut.bundles.length} bundle{cut.bundles.length !== 1 ? 's' : ''}</span>
                                </div>
                                {editingCutTempId === cut.tempId ? (
                                  <span className="text-[10px] font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">Editing…</span>
                                ) : (
                                  <div className="flex gap-1">
                                    <button type="button"
                                      onClick={() => { setActiveSubmissionId(comp.submissionId); handleEditSavedCut(cut); }}
                                      className="rounded p-1 text-slate-400 hover:bg-blue-50 hover:text-blue-600">
                                      <Pencil className="h-3.5 w-3.5" />
                                    </button>
                                    <button type="button" onClick={() => handleRemoveSavedCut(cut.tempId)}
                                      className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-500">
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}

                          {activeSubmissionId === comp.submissionId ? (
                            <motion.div
                              initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                              className={'rounded-lg border-2 p-4 space-y-3 ' + (editingCutTempId ? 'border-amber-300 bg-amber-50/40' : 'border-indigo-200 bg-indigo-50/30')}>
                              
                              <div className="mb-2">
                                <span className="text-xs font-bold text-indigo-800">
                                  {editingCutTempId ? 'Editing Cut' : `New cut for ${comp.components}`}
                                </span>
                              </div>

                              <div className="flex items-start flex-wrap gap-4">
                                
                                {/* Manual Cut No Input */}
                                <div className="space-y-0.5">
                                  <label className="block text-[10px] font-medium text-slate-500">Cut Name / No <span className="text-red-500">*</span></label>
                                  <input
                                    type="text"
                                    value={activeCutNo}
                                    onChange={e => {
                                      setActiveCutNo(e.target.value);
                                      if (cutErrors.cutNo) setCutErrors(p => ({ ...p, cutNo: '' }));
                                    }}
                                    placeholder={`e.g. ${comp.components} Cut 1`}
                                    className={'w-48 rounded-lg border px-3 py-1.5 text-sm font-bold outline-none ' + (cutErrors.cutNo ? 'border-red-400 bg-red-50' : 'border-slate-300 focus:ring-2 focus:ring-indigo-500')}
                                  />
                                  {cutErrors.cutNo && <p className="text-[10px] text-red-600">{cutErrors.cutNo}</p>}
                                </div>

                                <div className="space-y-0.5">
                                  <label className="block text-[10px] font-medium text-slate-500">Cut Qty <span className="text-red-500">*</span></label>
                                  <div className="flex items-center gap-2">
                                    <input
                                      ref={cutQtyInputRef}
                                      type="text" inputMode="numeric" pattern="[0-9]*"
                                      value={activeCutQty}
                                      onChange={e => {
                                        setActiveCutQty(e.target.value.replace(/[^0-9]/g, ''));
                                        setCutQtyConfirmed(false); 
                                        if (cutErrors.cutQty) setCutErrors(p => ({ ...p, cutQty: '' }));
                                      }}
                                      placeholder="e.g. 100"
                                      onKeyDown={e => {
                                        if (e.key === 'Enter' && !cutQtyConfirmed) {
                                          e.preventDefault();
                                          confirmCutQtyAndPrefillBundle();
                                        }
                                      }}
                                      disabled={cutQtyConfirmed}
                                      className={'w-28 rounded-lg border px-3 py-1.5 text-sm font-bold outline-none ' + (cutQtyConfirmed ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : cutErrors.cutQty ? 'border-red-400 bg-red-50' : 'border-slate-300 focus:ring-2 focus:ring-indigo-500')} />
                                    {!cutQtyConfirmed ? (
                                      <button type="button"
                                        onClick={confirmCutQtyAndPrefillBundle}
                                        className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-700">
                                        Confirm Qty →
                                      </button>
                                    ) : (
                                      <button type="button"
                                        onClick={() => setCutQtyConfirmed(false)}
                                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-50">
                                        Edit
                                      </button>
                                    )}
                                  </div>
                                  {cutErrors.cutQty && <p className="text-[10px] text-red-600">{cutErrors.cutQty}</p>}
                                </div>
                              </div>

                              {cutQtyConfirmed && cutErrors.bundles && <p className="text-[11px] text-red-600"><AlertCircle className="mr-1 inline h-3 w-3" />{cutErrors.bundles}</p>}

                              {cutQtyConfirmed && <div className="space-y-2">
                                <div className="grid grid-cols-12 gap-2 text-[10px] font-bold uppercase tracking-wide text-slate-400 px-1">
                                  <div className="col-span-3">Bundle No <span className="text-red-400">*</span></div>
                                  <div className="col-span-2">Qty <span className="text-red-400">*</span></div>
                                  <div className="col-span-2">Size <span className="text-red-400">*</span></div>
                                  <div className="col-span-4">Number Range <span className="text-red-400">*</span></div>
                                  <div className="col-span-1" />
                                </div>
                                {activeCutBundles.map((bundle, bi) => (
                                  <div key={bundle.tempId} className="grid grid-cols-12 gap-2 items-start">
                                    <div className="col-span-3">
                                      <input type="text" value={bundle.bundleNo}
                                        ref={el => setBundleInputRef(bundle.tempId, 'no', el)}
                                        onChange={e => updateBundle(bundle.tempId, 'bundleNo', e.target.value)}
                                        onBlur={e => updateBundle(bundle.tempId, 'bundleNo', normalizeBundleNo(e.target.value))}
                                        onKeyDown={e => {
                                          if (e.key === 'Enter') {
                                            e.preventDefault();
                                            updateBundle(bundle.tempId, 'bundleNo', normalizeBundleNo(bundle.bundleNo));
                                            focusBundleField(bundle.tempId, 'qty');
                                          }
                                        }}
                                        placeholder="b-3"
                                        className={'w-full rounded border px-2 py-1.5 text-xs outline-none ' + (cutErrors['b_' + bi + '_no'] ? 'border-red-400 bg-red-50' : 'border-slate-200 focus:ring-1 focus:ring-blue-400')} />
                                    </div>
                                    <div className="col-span-2">
                                      <input type="text" inputMode="numeric" pattern="[0-9]*"
                                        ref={el => setBundleInputRef(bundle.tempId, 'qty', el)}
                                        value={bundle.bundleQty}
                                        onChange={e => updateBundle(bundle.tempId, 'bundleQty', e.target.value.replace(/[^0-9]/g, ''))}
                                        onKeyDown={e => {
                                          if (e.key === 'Enter') {
                                            e.preventDefault();
                                            focusBundleField(bundle.tempId, 'size');
                                          }
                                        }}
                                        placeholder="100"
                                        className={'w-full rounded border px-2 py-1.5 text-xs font-bold outline-none ' + (cutErrors['b_' + bi + '_qty'] ? 'border-red-400 bg-red-50' : 'border-slate-200 focus:ring-1 focus:ring-blue-400')} />
                                    </div>
                                    <div className="col-span-2">
                                      <input type="text" value={bundle.size}
                                        ref={el => setBundleInputRef(bundle.tempId, 'size', el)}
                                        onChange={e => updateBundle(bundle.tempId, 'size', e.target.value)}
                                        onKeyDown={e => {
                                          if (e.key === 'Enter') {
                                            e.preventDefault();
                                            focusBundleField(bundle.tempId, 'range');
                                          }
                                        }}
                                        placeholder="M"
                                        className={'w-full rounded border px-2 py-1.5 text-xs outline-none ' + (cutErrors['b_' + bi + '_size'] ? 'border-red-400 bg-red-50' : 'border-slate-200 focus:ring-1 focus:ring-blue-400')} />
                                    </div>
                                    <div className="col-span-4">
                                      <input type="text" value={bundle.numberRange}
                                        ref={el => setBundleInputRef(bundle.tempId, 'range', el)}
                                        onChange={e => updateBundle(bundle.tempId, 'numberRange', e.target.value)}
                                        onKeyDown={e => {
                                          if (e.key === 'Enter') {
                                            e.preventDefault();
                                            const totalBundled = activeCutBundles.reduce((sum, b) => sum + (parseInt(b.bundleQty) || 0), 0);
                                            const cutQtyNum = parseInt(activeCutQty) || 0;
                                            if (cutQtyNum > 0 && totalBundled < cutQtyNum) {
                                              addBundle();
                                            } else {
                                              focusInput(saveCutButtonRef.current);
                                            }
                                          }
                                        }}
                                        placeholder="001-100"
                                        className={'w-full rounded border px-2 py-1.5 text-xs outline-none ' + (cutErrors['b_' + bi + '_range'] ? 'border-red-400 bg-red-50' : 'border-slate-200 focus:ring-1 focus:ring-blue-400')} />
                                    </div>
                                    <div className="col-span-1 flex justify-center pt-1">
                                      {activeCutBundles.length > 1 && (
                                        <button type="button" onClick={() => removeBundle(bundle.tempId)}
                                          className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-500">
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                ))}
                                {(() => {
                                  const totalBundled = activeCutBundles.reduce((s, b) => s + (parseInt(b.bundleQty) || 0), 0);
                                  const cutQtyNum = parseInt(activeCutQty) || 0;
                                  const bundleFull = cutQtyNum > 0 && totalBundled >= cutQtyNum;
                                  return (
                                    <button type="button" onClick={addBundle}
                                      disabled={bundleFull}
                                      title={bundleFull ? 'Bundle total already equals cut qty' : 'Add another bundle'}
                                      className="inline-flex items-center gap-1 text-xs font-medium mt-1 disabled:opacity-40 disabled:cursor-not-allowed text-blue-600 hover:text-blue-800 disabled:hover:text-blue-600">
                                      <Plus className="h-3 w-3" /> Add Bundle
                                    </button>
                                  );
                                })()}
                              </div>}

                              <div className="flex gap-2 pt-2 border-t border-slate-200">
                                <button type="button" ref={saveCutButtonRef} onClick={handleSaveCut}
                                  disabled={!cutQtyConfirmed}
                                  className={'inline-flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-xs font-bold text-white disabled:opacity-40 disabled:cursor-not-allowed ' + (editingCutTempId ? 'bg-amber-600 hover:bg-amber-700' : 'bg-indigo-600 hover:bg-indigo-700')}>
                                  <Save className="h-3.5 w-3.5" />
                                  {editingCutTempId ? 'Update Cut' : 'Save Cut'}
                                </button>
                                <button type="button"
                                  onClick={() => { setActiveSubmissionId(''); handleCancelCutEdit(); }}
                                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
                                  Cancel
                                </button>
                              </div>
                            </motion.div>
                          ) : (
                            <button type="button"
                              onClick={() => openCutBuilderForComponent(comp)}
                              disabled={compUncut <= 0}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-indigo-300 px-4 py-2 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                              <Plus className="h-3.5 w-3.5" />
                              {compUncut <= 0 ? 'All qty cut' : 'Add cut for ' + comp.components}
                            </button>
                          )}

                          {/* Stage this component button */}
                          {savedCuts.some(c => c.submissionId === comp.submissionId) && !editingRecordId && (
                            <div className="pt-3 border-t border-slate-200 mt-2">
                              <button
                                type="button"
                                onClick={() => handleStageComponentClick(comp)}
                                className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-xs font-bold text-white hover:bg-amber-700 transition-colors shadow-sm">
                                <TableProperties className="h-3.5 w-3.5" />
                                Stage {comp.components} to Database Queue
                              </button>
                              <p className="mt-1 text-[10px] text-slate-400">
                                This will queue only the {comp.components} component. Other components are unaffected.
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Edit mode global buttons only */}
          {editingRecordId && (
            <div className="flex items-center gap-3 border-t border-slate-200 pt-6">
              <button type="submit" disabled={isSaving}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors disabled:opacity-50">
                <Save className="h-4 w-4" />{isSaving ? 'Updating...' : 'Update Entry'}
              </button>
              <button type="button" onClick={resetForm}
                className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
                Cancel Edit
              </button>
            </div>
          )}
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
                      <p className="text-xs text-slate-500 mt-0.5">
                        IN-AD: <span className="font-semibold text-slate-700">{entry.inAdNo}</span> | Sch: {entry.scheduleNo} | {entry.cutInDate}
                        <span className="ml-2 inline-flex items-center rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-[10px] font-bold px-2 py-0.5">
                          {entry.components}
                        </span>
                        <span className="ml-1 text-[10px] text-slate-400">IN: {entry.inQty}</span>
                      </p>
                    </div>
                    <div className="text-right space-y-0.5 shrink-0">
                      <div className="text-xs">IN: <span className="font-bold text-orange-600">{entry.inQty}</span></div>
                      <div className="text-xs">Cuts: <span className="font-bold">{entry.cuts.length}</span></div>
                    </div>
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); handleEditStagedEntry(entry); }}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-colors shrink-0"
                      title="Move this staged component back to the form for editing"
                    >
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </button>
                    <button onClick={e => { e.stopPropagation(); removeStagedEntry(entry.tempId); }}
                      className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 shrink-0">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <AnimatePresence>
                    {isExp && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                        className="border-t border-amber-200 bg-white px-6 py-4 overflow-hidden">
                        {entry.cuts.map((cut, cutIdx) => (
                          <div key={cut.tempId + '_' + cutIdx} className="mb-3 last:mb-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Layers className="h-3.5 w-3.5 text-slate-400" />
                              <span className="text-sm font-bold text-slate-700">{cut.cutNo}</span>
                              <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-600">Qty: {cut.cutQty}</span>
                              <span className="ml-auto text-[10px] text-slate-400">Use the component Edit button above to modify this staged entry</span>
                            </div>
                            <div className="ml-6 border-l-2 border-slate-200 pl-4">
                              <table className="w-full text-xs">
                                <thead><tr className="text-slate-400"><th className="py-1 text-left">Bundle</th><th className="py-1 text-left">Qty</th><th className="py-1 text-left">Size</th><th className="py-1 text-left">Range</th></tr></thead>
                                <tbody>
                                  {orderBundlesForDisplay(cut.bundles).map((b, bi) => (
                                    <tr key={bi} className="text-slate-700">
                                      <td className="py-0.5 font-medium">{b.bundleNo}</td>
                                      <td className="py-0.5 font-bold">{b.bundleQty}</td>
                                      <td className="py-0.5">{b.size}</td>
                                      <td className="py-0.5 text-slate-500">{b.numberRange}</td>
                                    </tr>
                                  ))}
                                </tbody>
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
              className={'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ' + (showFilters ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50')}>
              <Filter className="h-3.5 w-3.5" />{showFilters ? 'Hide' : 'Filters'}
            </button>
          </div>
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input type="text" value={searchText}
              onChange={e => { setSearchText(e.target.value); setCurrentPage(1); }}
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
                  <div className="ml-auto text-xs text-slate-500">Showing {recentRecords.length} of {storeInRecords.length}</div>
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
        ) : recentRecords.length === 0 ? (
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
                      <p className="text-xs text-slate-500 mt-0.5">{record.components} · IN-AD: {record.inAdNo} · Sch: {record.scheduleNo} | {record.cutInDate}</p>
                    </div>
                    <div className="text-right space-y-0.5 shrink-0">
                      <div className="text-xs text-slate-500">IN: <span className="font-bold text-orange-600">{record.inQty}</span></div>
                      <div className="text-xs">Cuts: <span className="font-bold">{record.cuts.length}</span> | Qty: <span className="font-bold">{record.totalCutQty}</span></div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                      {locks[record.id]?.isLocked ? (
                        <div className="flex items-center gap-1">
                          <Lock className="h-4 w-4 text-slate-300" />
                          <span className="text-[10px] text-slate-400">Locked</span>
                        </div>
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
                          <MiniStat label="IN Qty"         value={record.inQty}       color="orange" />
                          <MiniStat label="Total Cut Qty"  value={record.totalCutQty} />
                          <MiniStat label="Uncut Balance"  value={record.uncutBalance} />
                          <MiniStat label="Available (Shelf)" value={record.availableQty} color="green" />
                        </div>
                        {record.cuts.map((cut, cutIdx) => (
                          <div key={cut.id + '_' + cutIdx} className="mb-3 last:mb-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Layers className="h-3.5 w-3.5 text-slate-400" />
                              <span className="text-sm font-bold text-slate-700">{cut.cutNo}</span>
                              <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold">Qty: {cut.cutQty}</span>
                            </div>
                            <div className="ml-6 border-l-2 border-slate-200 pl-4">
                              <table className="w-full text-xs">
                                <thead><tr className="text-slate-400"><th className="py-1 text-left">Bundle</th><th className="py-1 text-left">Qty</th><th className="py-1 text-left">Size</th><th className="py-1 text-left">Range</th></tr></thead>
                                <tbody>
                                  {orderBundlesForDisplay(cut.bundles).map(b => (
                                    <tr key={b.id} className="text-slate-700">
                                      <td className="py-0.5 font-medium">{b.bundleNo}</td>
                                      <td className="py-0.5 font-bold">{b.bundleQty}</td>
                                      <td className="py-0.5">{b.size}</td>
                                      <td className="py-0.5 text-slate-500">{b.numberRange}</td>
                                    </tr>
                                  ))}
                                </tbody>
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