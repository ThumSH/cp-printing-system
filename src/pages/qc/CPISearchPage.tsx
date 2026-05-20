// src/pages/qc/CPIPage.tsx
// Cut Panel Inspection Report — CP Chart No. 002
// Cascading: Style → Customer → Schedule → Component → Cuts auto-load
// F1-F13 defect labels shown ONCE for first cut; subsequent cuts stack below without repeating
import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  ClipboardList, Save, AlertCircle, Loader2, CheckCircle2, Printer,
} from 'lucide-react';
import { useQCStore } from '../../store/qcStore';
import { useInventoryStore } from '../../store/inventoryStore';

// ── Defect list ───────────────────────────────────────────────────────────────
const DEFECTS = [
  { code: 'F1',    label: 'Panel Shrinkage' },
  { code: 'F2',    label: 'Fabric colour variation' },
  { code: 'F3',    label: 'Crush mark' },
  { code: 'F4',    label: 'Shape out panel' },
  { code: 'F5',    label: 'Dust mark' },
  { code: 'F6',    label: 'Stain marks / Oil marks' },
  { code: 'F7',    label: 'Cut holes' },
  { code: 'F8',    label: 'Needle marks' },
  { code: 'F9',    label: 'Incorrect part' },
  { code: 'F10',   label: 'Numbering stickers missing' },
  { code: 'F11',   label: 'Numbering stickers mixed-up' },
  { code: 'F12',   label: 'Size mixed-up' },
  { code: 'F13',   label: 'Wrong Cut Mark' },
  { code: 'Other', label: 'Other' },
];

// ── Types ─────────────────────────────────────────────────────────────────────
interface BundleRow {
  bundleNo: string; qty: number; size: string; numberRange: string;
}

interface DefectEntry {
  defectCode: string;
  check: string;
  beforeL_plus: string; beforeL_minus: string;
  beforeW_plus: string; beforeW_minus: string;
  afterL_plus:  string; afterL_minus:  string;
  afterW_plus:  string; afterW_minus:  string;
  sampleSize:   string;
  defectedQty:  string;
  percentage:   string;
  remarks:      string;
}

interface CutInspection {
  cutNo: string; cutQty: number; component: string;
  bundles: BundleRow[]; defects: DefectEntry[];
}

const makeDefects = (cutQty: number): DefectEntry[] =>
  DEFECTS.map(d => ({
    defectCode: d.code, check: '',
    beforeL_plus: '', beforeL_minus: '', beforeW_plus: '', beforeW_minus: '',
    afterL_plus:  '', afterL_minus:  '', afterW_plus:  '', afterW_minus:  '',
    sampleSize: '',  // user fills manually
    defectedQty: '', percentage: '', remarks: '',
  }));

// ── Tiny cell input ───────────────────────────────────────────────────────────
function Cell({ value, onChange, w = 'w-10', type = 'text', placeholder = '' }: {
  value: string; onChange: (v: string) => void;
  w?: string; type?: string; placeholder?: string;
}) {
  return (
    <input type={type} value={value} placeholder={placeholder}
      onChange={e => onChange(e.target.value)}
      className={`${w} rounded border border-slate-200 bg-white px-1 py-0.5 text-[11px] text-center outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-300 transition-colors`}
    />
  );
}

// ── Dropdown helper ───────────────────────────────────────────────────────────
function CascadeSelect({ label, value, onChange, options, disabled = false }: {
  label: string; value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[]; disabled?: boolean;
}) {
  return (
    <div className="space-y-1">
      <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)} disabled={disabled}
        className="min-w-40 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed">
        <option value="">— Select —</option>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function CPIPage() {
  const { eligibleCpiItems, fetchEligibleCpiItems, addCPIReport, cpiReports, fetchReports } = useQCStore();
  const { storeInRecords, fetchRecords } = useInventoryStore();

  // Cascading selection
  const [selStyle,     setSelStyle]     = useState('');
  const [selCustomer,  setSelCustomer]  = useState('');
  const [selSchedule,  setSelSchedule]  = useState('');
  const [selComponent, setSelComponent] = useState('');

  // Header manual fields
  const [date,        setDate]        = useState(new Date().toISOString().slice(0, 10));
  const [receivedQty, setReceivedQty] = useState('');
  const [cpiQty,      setCpiQty]      = useState('');
  const [auditor,     setAuditor]     = useState('');

  // Cut data
  const [cuts, setCuts] = useState<CutInspection[]>([]);

  // UI
  const [saving,   setSaving]   = useState(false);
  const [errMsg,   setErrMsg]   = useState('');
  const [succMsg,  setSuccMsg]  = useState('');

  useEffect(() => { fetchEligibleCpiItems(); fetchRecords(); }, [fetchEligibleCpiItems, fetchRecords]);

  // ── Cascade options ───────────────────────────────────────────────────────
  const styleOptions = useMemo(() =>
    Array.from(new Set(eligibleCpiItems.map(i => i.styleNo))).sort()
      .map(s => ({ value: s, label: s })), [eligibleCpiItems]);

  const customerOptions = useMemo(() => {
    if (!selStyle) return [];
    return Array.from(new Set(
      eligibleCpiItems.filter(i => i.styleNo === selStyle).map(i => i.customerName)
    )).sort().map(c => ({ value: c, label: c }));
  }, [eligibleCpiItems, selStyle]);

  const scheduleOptions = useMemo(() => {
    if (!selCustomer) return [];
    return Array.from(new Set(
      eligibleCpiItems.filter(i => i.styleNo === selStyle && i.customerName === selCustomer)
        .map(i => i.scheduleNo)
    )).sort().map(s => ({ value: s, label: s }));
  }, [eligibleCpiItems, selStyle, selCustomer]);

  // StoreIn records for this style+customer+schedule
  const matchedRecords = useMemo(() =>
    storeInRecords.filter(r =>
      r.styleNo === selStyle && r.customerName === selCustomer && r.scheduleNo === selSchedule
    ), [storeInRecords, selStyle, selCustomer, selSchedule]);

  // Find the specific StoreIn record that matches the selected component
  const selectedStoreIn = useMemo(() => {
    if (!selComponent) return null;
    return matchedRecords.find(r => {
      const comps = r.components?.split(',').map((c: string) => c.trim()) ?? [];
      return comps.includes(selComponent) || r.components === selComponent;
    }) || matchedRecords[0] || null;
  }, [matchedRecords, selComponent]);

  // Component options — exclude StoreIn records that already have a CPI report
  const componentOptions = useMemo(() => {
    // Get StoreIn IDs that already have a CPI report
    const existingCpiStoreInIds = new Set(cpiReports.map(r => r.storeInRecordId));

    const comps = new Set<string>();
    matchedRecords.forEach(r => {
      // Skip if this StoreIn already has a CPI report
      if (existingCpiStoreInIds.has(r.id)) return;
      r.cuts?.forEach(c => {
        const parts = c.cutNo.split(' Cut ');
        if (parts.length > 1) comps.add(parts[0]);
      });
      if (r.components) r.components.split(',').forEach(c => comps.add(c.trim()));
    });
    return Array.from(comps).filter(Boolean).map(c => ({ value: c, label: c }));
  }, [matchedRecords, cpiReports]);

  // Matched eligible item (for colours)
  const eligibleItem = useMemo(() =>
    eligibleCpiItems.find(i =>
      i.styleNo === selStyle && i.customerName === selCustomer && i.scheduleNo === selSchedule
    ), [eligibleCpiItems, selStyle, selCustomer, selSchedule]);

  // Cuts for selected component
  const cutsForComp = useMemo(() => {
    if (!selComponent) return [];
    const result: { storeIn: typeof matchedRecords[0]; cut: typeof matchedRecords[0]['cuts'][0] }[] = [];
    matchedRecords.forEach(r => {
      r.cuts?.forEach(c => {
        const compFromCut = c.cutNo.split(' Cut ')[0];
        if (compFromCut === selComponent || r.components?.includes(selComponent))
          result.push({ storeIn: r, cut: c });
      });
    });
    return result;
  }, [matchedRecords, selComponent]);

  // Auto-load cuts when component selected
  useEffect(() => {
    if (!selComponent || cutsForComp.length === 0) { setCuts([]); return; }
    const loaded: CutInspection[] = cutsForComp.map(({ cut, storeIn }) => ({
      cutNo:     cut.cutNo,
      cutQty:    cut.cutQty,
      component: selComponent,
      bundles:   cut.bundles?.map(b => ({
        bundleNo: b.bundleNo, qty: b.bundleQty, size: b.size, numberRange: b.numberRange,
      })) || [],
      defects: makeDefects(cut.cutQty),
    }));
    setCuts(loaded);
    // Auto-fill received qty from the selected component's StoreIn record
    if (selectedStoreIn?.inQty) setReceivedQty(selectedStoreIn.inQty.toString());
  }, [selComponent, cutsForComp.length]);

  // ── Update a single defect cell ───────────────────────────────────────────
  const updateDefect = useCallback((
    cutIdx: number, defIdx: number, field: keyof DefectEntry, value: string
  ) => {
    setCuts(prev => prev.map((cut, ci) => {
      if (ci !== cutIdx) return cut;
      const defects = cut.defects.map((d, di) => {
        if (di !== defIdx) return d;
        const upd = { ...d, [field]: value };
        // Auto-calculate % = defectedQty / sampleSize * 100
        if (field === 'defectedQty' || field === 'sampleSize') {
          const defQty  = parseFloat(field === 'defectedQty' ? value : d.defectedQty) || 0;
          const sampQty = parseFloat(field === 'sampleSize'  ? value : d.sampleSize)  || 0;
          upd.percentage = sampQty > 0 && defQty >= 0
            ? ((defQty / sampQty) * 100).toFixed(1)
            : '';
        }
        return upd;
      });
      return { ...cut, defects };
    }));
  }, []);

  // ── Delete a bundle row from a cut ───────────────────────────────────────
  const deleteBundle = useCallback((cutIdx: number, bundleIdx: number) => {
    setCuts(prev => prev.map((cut, ci) => {
      if (ci !== cutIdx) return cut;
      const bundles = cut.bundles.filter((_, bi) => bi !== bundleIdx);
      const defects = cut.defects.filter((_, di) => di !== bundleIdx);
      return { ...cut, bundles, defects };
    }));
  }, []);

  // ── Reset ─────────────────────────────────────────────────────────────────
  const handleReset = () => {
    setSelStyle(''); setSelCustomer(''); setSelSchedule(''); setSelComponent('');
    setDate(new Date().toISOString().slice(0, 10));
    setReceivedQty(''); setCpiQty(''); setAuditor('');
    setCuts([]); setErrMsg(''); setSuccMsg('');
  };

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!eligibleItem && matchedRecords.length === 0) { setErrMsg('No store-in record found.'); return; }
    if (cuts.length === 0) { setErrMsg('No cuts loaded.'); return; }
    if (!auditor.trim())  { setErrMsg('Auditor name is required.'); return; }
    const storeIn = selectedStoreIn ?? matchedRecords[0];
    setSaving(true); setErrMsg('');
    try {
      const passed = cuts.every(c =>
        c.defects.every(d => !d.defectedQty || parseFloat(d.defectedQty) === 0)
      );
      const totalDefected = cuts.reduce((s, c) =>
        s + c.defects.reduce((ds, d) => ds + (parseFloat(d.defectedQty) || 0), 0), 0);
      const totalCutQty = cuts.reduce((s, c) => s + c.cutQty, 0);

      const report = {
        id: '',
        storeInRecordId: storeIn.id,
        submissionId:    storeIn.submissionId,
        revisionNo:      storeIn.revisionNo ?? 1,
        date,
        customer:    selCustomer,
        styleNo:     selStyle,
        scheduleNo:  selSchedule,
        bodyColour:  eligibleItem?.bodyColour  || storeIn.bodyColour  || '',
        printColour: eligibleItem?.printColour || storeIn.printColour || '',
        receivedQty: parseInt(receivedQty) || 0,
        cpiQty:      parseInt(cpiQty) || 0,
        cutInspections: cuts.map(cut => ({
          cutRecordId:  '',
          cutNo:        cut.cutNo,
          cutQty:       cut.cutQty,
          bundleNos:    cut.bundles.map(b => b.bundleNo).join(', '),
          sizes:        cut.bundles.map(b => b.size).join(', '),
          numberRanges: cut.bundles.map(b => b.numberRange).join(', '),
          part:         cut.component,
          sampleSize:   Math.ceil(cut.cutQty * 0.1),
          defectRows: cut.defects.map(d => ({
            defectCode:   d.defectCode,
            defectName:   DEFECTS.find(df => df.code === d.defectCode)?.label || d.defectCode,
            beforeLength: parseFloat(d.beforeL_plus) || 0,
            beforeWidth:  parseFloat(d.beforeW_plus) || 0,
            afterLength:  parseFloat(d.afterL_plus)  || 0,
            afterWidth:   parseFloat(d.afterW_plus)  || 0,
            defectedQty:  parseFloat(d.defectedQty)  || 0,
            percentage:   d.percentage,
            remarks:      d.remarks,
          })),
          totalDefectedQty: cut.defects.reduce((s, d) => s + (parseFloat(d.defectedQty) || 0), 0),
          totalPercentage:  cut.cutQty > 0
            ? (cut.defects.reduce((s, d) => s + (parseFloat(d.defectedQty) || 0), 0) / cut.cutQty * 100).toFixed(1)
            : '0',
        })),
        cuttingQty:          totalCutQty,
        checkedQty:          parseInt(cpiQty) || 0,
        rejDamageQty:        totalDefected,
        rejectionPercentage: totalCutQty > 0 ? (totalDefected / totalCutQty * 100).toFixed(1) : '0',
        balanceQty:          Math.max(0, totalCutQty - totalDefected),
        inspectionStatus:    'Passed' as const,
        appRej:              'Approved',
        checkedBy:           auditor,
        summaryDate:         date,
        cpiAuditor:          auditor,
      };

      await addCPIReport(report);
      setSuccMsg('CPI Report saved successfully.');
      setTimeout(() => setSuccMsg(''), 4000);
    } catch (e) {
      setErrMsg(e instanceof Error ? e.message : 'Failed to save.');
    } finally { setSaving(false); }
  };

  // Body/print colour from selected component's eligible item or StoreIn record
  const bodyColour  = eligibleItem?.bodyColour  || selectedStoreIn?.bodyColour  || '—';
  const printColour = eligibleItem?.printColour || selectedStoreIn?.printColour || '—';
  const isReady = selStyle && selCustomer && selSchedule && selComponent && cuts.length > 0;


  // ── Print handler ────────────────────────────────────────────────────────
  const handlePrint = () => {
    const DEFECT_LIST = [
      { code: 'F1', label: 'Panel Shrinkage' },
      { code: 'F2', label: 'Fabric colour variation' },
      { code: 'F3', label: 'Crush mark' },
      { code: 'F4', label: 'Shape out panel' },
      { code: 'F5', label: 'Dust mark' },
      { code: 'F6', label: 'Stain marks / Oil marks' },
      { code: 'F7', label: 'Cut holes' },
      { code: 'F8', label: 'Needle marks' },
      { code: 'F9', label: 'Incorrect part' },
      { code: 'F10', label: 'Numbering stickers missing' },
      { code: 'F11', label: 'Numbering stickers mixed-up' },
      { code: 'F12', label: 'Size mixed-up' },
      { code: 'F13', label: 'Wrong Cut Mark' },
      { code: 'Other', label: 'Other' },
    ];

    const td = (val: string | number, extra = '') =>
      '<td style="border:1px solid #bbb;padding:2px 4px;text-align:center;font-size:10px;' + extra + '">' + (val ?? '') + '</td>';
    const tdL = (val: string | number) =>
      '<td style="border:1px solid #bbb;padding:2px 4px;text-align:left;font-size:10px;">' + (val ?? '') + '</td>';

    let rows = '';
    let totalSampleSize = 0;
    let totalDefectedQty = 0;

    // Bundle-driven — one row per bundle, matching screen exactly
    cuts.forEach((cut) => {
      if (!cut.bundles || cut.bundles.length === 0) return;
      cut.bundles.forEach((bundle, bi) => {
        const def      = cut.defects?.[bi] ?? ({} as any);
        const defInfo  = DEFECT_LIST[bi % DEFECT_LIST.length];
        const isFirstRow = bi === 0;

        totalSampleSize  += parseFloat(def.sampleSize)  || 0;
        totalDefectedQty += parseFloat(def.defectedQty) || 0;

        rows += '<tr>'
          + td(defInfo?.code ?? '', 'color:#666;font-family:monospace;')
          + tdL(defInfo?.label ?? '')
          + td(def.check ?? '')
          + td(isFirstRow ? cut.cutNo : '')
          + td(isFirstRow ? cut.cutQty : '', 'font-weight:bold;')
          + td(bundle.bundleNo ?? '')
          + td(isFirstRow ? cut.component : '')
          + td(bundle.size ?? '')
          + td(def.beforeL_plus ?? '')
          + td(def.beforeL_minus ?? '')
          + td(def.beforeW_plus ?? '')
          + td(def.beforeW_minus ?? '')
          + td(def.afterL_plus ?? '')
          + td(def.afterL_minus ?? '')
          + td(def.afterW_plus ?? '')
          + td(def.afterW_minus ?? '')
          + td(bundle.numberRange ?? '', 'font-size:9px;')
          + td(def.sampleSize ?? '')
          + td(def.defectedQty ?? '')
          + td(def.percentage ?? '')
          + td(def.remarks ?? '', 'text-align:left;')
          + '</tr>';
      });
    });

    // Blank rows
    const blankCount = Math.max(0, 2 - cuts.length);
    for (let i = 0; i < blankCount; i++) {
      rows += '<tr>' + Array(21).fill('<td style="border:1px solid #bbb;height:18px;"></td>').join('') + '</tr>';
    }

    // Totals row
    rows += '<tr style="background:#f0f0f0;font-weight:bold;">'
      + td('TOTALS', 'text-align:left;') + td('') + td('') + td('')
      + td(cuts.reduce((s, c) => s + c.cutQty, 0), 'font-weight:bold;')
      + td('') + td('') + td('')
      + td('') + td('') + td('') + td('')
      + td('') + td('') + td('') + td('')
      + td('')
      + td(totalSampleSize || '', 'font-weight:bold;')
      + td(totalDefectedQty || '', 'font-weight:bold;')
      + td('') + td('')
      + '</tr>';

    const html = '<!DOCTYPE html><html><head>'
      + '<title>CPI Report - ' + selStyle + ' - ' + selSchedule + '</title>'
      + '<style>'
      + '* { box-sizing: border-box; margin: 0; padding: 0; }'
      + 'body { font-family: Arial, sans-serif; font-size: 11px; padding: 10mm; }'
      + 'table { border-collapse: collapse; width: 100%; }'
      + 'th { border: 1px solid #999; padding: 2px 4px; text-align: center; font-size: 10px; background: #e8e8e8; font-weight: bold; }'
      + '@page { size: A4 landscape; margin: 10mm; }'
      + '</style></head><body>'
      + '<div style="text-align:center;margin-bottom:6px;">'
      + '<div style="font-weight:bold;font-size:13px;text-transform:uppercase;letter-spacing:1px;">Colour Plus Printing Systems (PVT) Ltd</div>'
      + '<div style="font-size:11px;">Cut Panel Inspection Report (CP Chart No. 002)</div>'
      + '</div>'
      + '<table style="border:none;margin-bottom:6px;">'
      + '<tr>'
      + '<td style="border:none;width:12%;">Date:</td>'
      + '<td style="border:none;border-bottom:1px solid black;width:20%;padding-right:8px;">' + date + '</td>'
      + '<td style="border:none;width:14%;">Schedule number:</td>'
      + '<td style="border:none;border-bottom:1px solid black;width:20%;padding-right:8px;">' + selSchedule + '</td>'
      + '<td style="border:none;width:12%;">Print colour:</td>'
      + '<td style="border:none;border-bottom:1px solid black;width:22%;">' + printColour + '</td>'
      + '</tr><tr>'
      + '<td style="border:none;">Customer:</td>'
      + '<td style="border:none;border-bottom:1px solid black;padding-right:8px;">' + selCustomer + '</td>'
      + '<td style="border:none;">Cut number:</td>'
      + '<td style="border:none;border-bottom:1px solid black;padding-right:8px;">' + cuts.map(c => c.cutNo).join(', ') + '</td>'
      + '<td style="border:none;">Received Qty:</td>'
      + '<td style="border:none;border-bottom:1px solid black;">' + receivedQty + '</td>'
      + '</tr><tr>'
      + '<td style="border:none;">Style number:</td>'
      + '<td style="border:none;border-bottom:1px solid black;padding-right:8px;">' + selStyle + '</td>'
      + '<td style="border:none;">Body colour:</td>'
      + '<td style="border:none;border-bottom:1px solid black;padding-right:8px;">' + bodyColour + '</td>'
      + '<td style="border:none;">CPI Qty:</td>'
      + '<td style="border:none;border-bottom:1px solid black;">' + cpiQty + '</td>'
      + '</tr></table>'
      + '<table><thead>'
      + '<tr>'
      + '<th rowspan="2"></th>'
      + '<th rowspan="2" style="text-align:left;min-width:110px;">Defect</th>'
      + '<th rowspan="2">&#10003;</th>'
      + '<th rowspan="2">Cut No.</th>'
      + '<th rowspan="2">Qty</th>'
      + '<th rowspan="2">Bundle No.</th>'
      + '<th rowspan="2">Component</th>'
      + '<th rowspan="2">Size</th>'
      + '<th colspan="4" style="background:#ddeeff;">Before Printing Process</th>'
      + '<th colspan="4" style="background:#ddffd4;">After Printing Process</th>'
      + '<th rowspan="2">No. Range</th>'
      + '<th rowspan="2">Sample Size 10%</th>'
      + '<th rowspan="2">Defected Qty</th>'
      + '<th rowspan="2">%</th>'
      + '<th rowspan="2" style="min-width:60px;">Remarks</th>'
      + '</tr><tr>'
      + '<th style="background:#ddeeff;">L+</th><th style="background:#ddeeff;">L-</th>'
      + '<th style="background:#ddeeff;">W+</th><th style="background:#ddeeff;">W-</th>'
      + '<th style="background:#ddffd4;">L+</th><th style="background:#ddffd4;">L-</th>'
      + '<th style="background:#ddffd4;">W+</th><th style="background:#ddffd4;">W-</th>'
      + '</tr></thead><tbody>'
      + rows
      + '</tbody></table>'
      + '<div style="margin-top:12px;display:flex;justify-content:space-between;font-size:11px;">'
      + '<div>CPI Auditor: <span style="display:inline-block;min-width:150px;border-bottom:1px solid black;">' + auditor + '</span></div>'
      + '<div style="font-size:10px;color:#555;">Total Cuts: ' + cuts.length + ' | Total Qty: ' + cuts.reduce((s, c) => s + c.cutQty, 0) + '</div>'
      + '</div>'
      + '</body></html>';

    // Use iframe instead of window.open — works in Tauri (no popup blocker)
    const existing = document.getElementById('cpi-print-iframe');
    if (existing) existing.remove();

    const iframe = document.createElement('iframe');
    iframe.id = 'cpi-print-iframe';
    iframe.style.cssText = 'position:fixed;top:0;left:0;width:0;height:0;border:none;visibility:hidden;';
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) { alert('Could not open print frame.'); return; }
    doc.open();
    doc.write(html);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => iframe.remove(), 2000);
    }, 600);
  };

  const thStyle: React.CSSProperties = {
    border: '1px solid #aaa',
    padding: '2px 4px',
    textAlign: 'center',
    fontWeight: 'bold',
    backgroundColor: '#f0f0f0',
    fontSize: '10px',
  };
  const tdStyle: React.CSSProperties = {
    border: '1px solid #ccc',
    padding: '2px 3px',
    textAlign: 'center',
    minHeight: '16px',
    height: '16px',
  };

  // ==========================================
  // RENDER
  // ==========================================
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-[1500px] space-y-6 pb-16">

      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-teal-100 p-2">
            <ClipboardList className="h-6 w-6 text-teal-700" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Cut Panel Inspection Report</h2>
            <p className="text-sm text-slate-500">CP Chart No. 002</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={handleReset}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Clear
          </button>
          {isReady && (
            <button onClick={handlePrint}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              <Printer className="h-4 w-4" /> Print
            </button>
          )}
          {isReady && (
            <button onClick={handleSave} disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-5 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50 transition-colors">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? 'Saving…' : 'Save Report'}
            </button>
          )}
        </div>
      </div>

      {errMsg  && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"><AlertCircle className="mr-1 inline h-4 w-4" />{errMsg}</div>}
      {succMsg && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"><CheckCircle2 className="mr-1 inline h-4 w-4" />{succMsg}</div>}

      {/* ── Cascading Selection ──────────────────────────────────────────── */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="mb-4 text-xs font-bold uppercase tracking-wider text-slate-400">Select Report Scope</p>
        <div className="flex flex-wrap items-end gap-4">
          <CascadeSelect label="Style No" value={selStyle}
            onChange={v => { setSelStyle(v); setSelCustomer(''); setSelSchedule(''); setSelComponent(''); setCuts([]); }}
            options={styleOptions} />
          <CascadeSelect label="Customer" value={selCustomer}
            onChange={v => { setSelCustomer(v); setSelSchedule(''); setSelComponent(''); setCuts([]); }}
            options={customerOptions} disabled={!selStyle} />
          <CascadeSelect label="Schedule No" value={selSchedule}
            onChange={v => { setSelSchedule(v); setSelComponent(''); setCuts([]); }}
            options={scheduleOptions} disabled={!selCustomer} />
          <CascadeSelect label="Component" value={selComponent}
            onChange={v => setSelComponent(v)}
            options={componentOptions} disabled={!selSchedule} />
        </div>

        {/* Auto-filled info — shown only after component is selected */}
        {selComponent && (
          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 md:grid-cols-4">
            {[
              { label: 'Body Colour',  value: bodyColour },
              { label: 'Print Colour', value: printColour },
              { label: 'Cut In Date',  value: selectedStoreIn?.cutInDate || '—' },
              { label: 'Cuts Loaded',  value: cuts.length > 0 ? cuts.length + ' cuts' : 'No cuts found for this component' },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
                <p className="text-sm font-semibold text-slate-800">{value}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Header manual fields ─────────────────────────────────────────── */}
      {selComponent && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="mb-4 text-xs font-bold uppercase tracking-wider text-slate-400">Report Header</p>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {[
              { label: 'Date', type: 'date', value: date, set: setDate },
              { label: 'Received Qty *', type: 'number', value: receivedQty, set: setReceivedQty, ph: 'e.g. 880' },
              { label: 'CPI Qty *',      type: 'number', value: cpiQty,      set: setCpiQty,      ph: 'e.g. 88' },
              { label: 'CPI Auditor *',  type: 'text',   value: auditor,     set: setAuditor,     ph: 'Name' },
            ].map(f => (
              <div key={f.label} className="space-y-1">
                <label className="block text-xs font-medium text-slate-600">{f.label}</label>
                <input type={f.type} value={f.value}
                  onChange={e => f.set(e.target.value)}
                  placeholder={f.ph}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-teal-500" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Inspection Grid ──────────────────────────────────────────────── */}
      {cuts.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">

          {/* Company report header */}
          <div className="border-b border-slate-200 bg-slate-50 px-6 py-4">
            <div className="text-center mb-3">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Colour Plus Printing Systems (PVT) Ltd</p>
              <p className="font-bold text-slate-800">Cut Panel Inspection Report (CP Chart No. 002)</p>
            </div>
            <div className="grid grid-cols-3 gap-x-8 gap-y-1 text-xs">
              <p><span className="text-slate-500 w-24 inline-block">Date:</span><span className="font-semibold">{date}</span></p>
              <p><span className="text-slate-500 w-24 inline-block">Schedule No:</span><span className="font-semibold">{selSchedule}</span></p>
              <p><span className="text-slate-500 w-24 inline-block">Print Colour:</span><span className="font-semibold">{printColour}</span></p>
              <p><span className="text-slate-500 w-24 inline-block">Customer:</span><span className="font-semibold">{selCustomer}</span></p>
              <p><span className="text-slate-500 w-24 inline-block">Component:</span><span className="font-semibold text-indigo-700">{selComponent}</span></p>
              <p><span className="text-slate-500 w-24 inline-block">Received Qty:</span><span className="font-semibold">{receivedQty || '—'}</span></p>
              <p><span className="text-slate-500 w-24 inline-block">Style No:</span><span className="font-semibold">{selStyle}</span></p>
              <p><span className="text-slate-500 w-24 inline-block">Body Colour:</span><span className="font-semibold">{bodyColour}</span></p>
              <p><span className="text-slate-500 w-24 inline-block">CPI Qty:</span><span className="font-semibold">{cpiQty || '—'}</span></p>
            </div>
          </div>

          {/* Main table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse" style={{ fontSize: '11px' }}>
              <thead>
                <tr className="bg-slate-100 text-slate-700 text-[11px]">
                  <th className="border border-slate-300 px-2 py-2 text-left font-bold w-8">#</th>
                  <th className="border border-slate-300 px-2 py-2 text-left font-bold min-w-[140px]">Defect</th>
                  <th className="border border-slate-300 px-2 py-2 font-bold w-8">✓</th>
                  <th className="border border-slate-300 px-2 py-2 font-bold w-20">Cut No</th>
                  <th className="border border-slate-300 px-2 py-2 font-bold w-12">Qty</th>
                  <th className="border border-slate-300 px-2 py-2 font-bold w-16">Bundle No</th>
                  <th className="border border-slate-300 px-2 py-2 font-bold w-20">Component</th>
                  <th className="border border-slate-300 px-2 py-2 font-bold w-12">Size</th>
                  <th colSpan={4} className="border border-slate-300 px-2 py-2 font-bold text-center bg-blue-50/60">Before Printing</th>
                  <th colSpan={4} className="border border-slate-300 px-2 py-2 font-bold text-center bg-green-50/60">After Printing</th>
                  <th className="border border-slate-300 px-2 py-2 font-bold w-20">No. Range</th>
                  <th className="border border-slate-300 px-2 py-2 font-bold w-16">Sample 10%</th>
                  <th className="border border-slate-300 px-2 py-2 font-bold w-16">Defected Qty</th>
                  <th className="border border-slate-300 px-2 py-2 font-bold w-10">%</th>
                  <th className="border border-slate-300 px-2 py-2 font-bold w-28">Remarks</th>
                  <th className="border border-slate-300 px-1 py-2 font-bold w-8"></th>
                </tr>
                <tr className="bg-slate-50 text-slate-500 text-[10px]">
                  <th colSpan={8} className="border border-slate-300 py-1" />
                  {['L+','L-','W+','W-'].map(h => <th key={`b${h}`} className="border border-slate-300 px-1 py-1 font-medium bg-blue-50/40 w-9">{h}</th>)}
                  {['L+','L-','W+','W-'].map(h => <th key={`a${h}`} className="border border-slate-300 px-1 py-1 font-medium bg-green-50/40 w-9">{h}</th>)}
                  <th colSpan={6} className="border border-slate-300 py-1" />
                </tr>
              </thead>
              <tbody>
                {cuts.map((cut, cutIdx) =>
                  cut.bundles.length > 0
                    ? cut.bundles.map((bundle, bundleIdx) => {
                        const def        = cut.defects[bundleIdx] ?? cut.defects[0];
                        const defIdx     = bundleIdx;
                        const defInfo    = DEFECTS[bundleIdx % DEFECTS.length];
                        const isFirstRow = bundleIdx === 0;

                        return (
                          <tr key={`${cutIdx}-${bundleIdx}`}
                            className={`${bundleIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'} hover:bg-teal-50/20 transition-colors`}>

                            {/* Code — always show */}
                            <td className="border border-slate-200 px-1 py-1 text-center text-slate-400 font-mono text-[10px]">
                              {defInfo?.code ?? ''}
                            </td>

                            {/* Defect label — always show */}
                            <td className="border border-slate-200 px-2 py-1 text-slate-700">
                              {defInfo?.label ?? ''}
                            </td>

                        {/* Check mark */}
                        <td className="border border-slate-200 px-0.5 py-0.5 text-center">
                          <Cell value={def.check} onChange={v => updateDefect(cutIdx, defIdx, 'check', v)} w="w-6" />
                        </td>

                        {/* Cut No — first row of cut only */}
                        <td className="border border-slate-200 px-1 py-1 text-center font-semibold text-slate-700">
                          {isFirstRow ? cut.cutNo : ''}
                        </td>

                        {/* Qty — first row of cut only */}
                        <td className="border border-slate-200 px-1 py-1 text-center font-bold text-slate-800">
                          {isFirstRow ? cut.cutQty : ''}
                        </td>

                        {/* Bundle No — from StoreIn */}
                        <td className="border border-slate-200 px-1 py-1 text-center text-slate-600">
                          {bundle?.bundleNo ?? ''}
                        </td>

                        {/* Component — first row of cut only */}
                        <td className="border border-slate-200 px-1 py-1 text-center font-semibold text-indigo-700">
                          {isFirstRow ? cut.component : ''}
                        </td>

                        {/* Size — from StoreIn */}
                        <td className="border border-slate-200 px-1 py-1 text-center text-slate-600">
                          {bundle?.size ?? ''}
                        </td>

                        {/* Before printing — manual */}
                        {(['beforeL_plus','beforeL_minus','beforeW_plus','beforeW_minus'] as const).map(f => (
                          <td key={f} className="border border-slate-200 px-0.5 py-0.5 bg-blue-50/20">
                            <Cell value={def[f]} onChange={v => updateDefect(cutIdx, defIdx, f, v)} w="w-9" />
                          </td>
                        ))}

                        {/* After printing — manual */}
                        {(['afterL_plus','afterL_minus','afterW_plus','afterW_minus'] as const).map(f => (
                          <td key={f} className="border border-slate-200 px-0.5 py-0.5 bg-green-50/20">
                            <Cell value={def[f]} onChange={v => updateDefect(cutIdx, defIdx, f, v)} w="w-9" />
                          </td>
                        ))}

                        {/* No. Range — from StoreIn */}
                        <td className="border border-slate-200 px-1 py-1 text-center text-slate-500 text-[10px]">
                          {bundle?.numberRange ?? ''}
                        </td>

                        {/* Sample Size 10% — auto, editable */}
                        <td className="border border-slate-200 px-0.5 py-0.5">
                          <Cell value={def.sampleSize} onChange={v => updateDefect(cutIdx, defIdx, 'sampleSize', v)} w="w-12" type="number" />
                        </td>

                        {/* Defected Qty — manual */}
                        <td className="border border-slate-200 px-0.5 py-0.5">
                          <Cell value={def.defectedQty} onChange={v => updateDefect(cutIdx, defIdx, 'defectedQty', v)} w="w-12" type="number" />
                        </td>

                        {/* % — auto-calculated, editable */}
                        <td className={`border border-slate-200 px-0.5 py-0.5 ${parseFloat(def.percentage) > 0 ? 'bg-red-50/40' : ''}`}>
                          <Cell value={def.percentage} onChange={v => updateDefect(cutIdx, defIdx, 'percentage', v)} w="w-10" />
                        </td>

                        {/* Remarks */}
                        <td className="border border-slate-200 px-0.5 py-0.5">
                          <Cell value={def.remarks} onChange={v => updateDefect(cutIdx, defIdx, 'remarks', v)} w="w-24" placeholder="…" />
                        </td>

                        {/* Delete bundle row */}
                        <td className="border border-slate-200 px-0.5 py-0.5 text-center">
                          {cut.bundles.length > 1 && (
                            <button
                              type="button"
                              onClick={() => deleteBundle(cutIdx, bundleIdx)}
                              title="Remove this bundle row"
                              className="rounded p-0.5 text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                            </button>
                          )}
                        </td>
                      </tr>
                        );
                      })
                    : null
                )}
                {/* Screen totals row */}
                <tr className="bg-slate-100 font-bold text-[11px]">
                  <td className="border border-slate-300 px-2 py-1.5 text-left font-bold" colSpan={2}>TOTALS</td>
                  <td className="border border-slate-300 px-1 py-1" />
                  <td className="border border-slate-300 px-1 py-1" />
                  <td className="border border-slate-300 px-1 py-1 font-black text-slate-900">
                    {cuts.reduce((s, c) => s + c.cutQty, 0)}
                  </td>
                  <td className="border border-slate-300 px-1 py-1" />
                  <td className="border border-slate-300 px-1 py-1" />
                  <td className="border border-slate-300 px-1 py-1" />
                  {/* Before/After 8 cols */}
                  {Array.from({ length: 8 }).map((_, i) => <td key={i} className="border border-slate-300 px-1 py-1" />)}
                  <td className="border border-slate-300 px-1 py-1" />
                  <td className="border border-slate-300 px-1 py-1 font-black text-teal-700">
                    {cuts.reduce((s, c) => s + c.defects.reduce((ds, d) => ds + (parseFloat(d.sampleSize) || 0), 0), 0) || '—'}
                  </td>
                  <td className="border border-slate-300 px-1 py-1 font-black text-red-700">
                    {cuts.reduce((s, c) => s + c.defects.reduce((ds, d) => ds + (parseFloat(d.defectedQty) || 0), 0), 0) || '—'}
                  </td>
                  <td className="border border-slate-300 px-1 py-1" />
                  <td className="border border-slate-300 px-1 py-1" />
                </tr>
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="border-t border-slate-200 bg-slate-50 px-6 py-3 flex items-center justify-between text-xs text-slate-600">
            <p>CPI Auditor: <span className="font-bold text-slate-900">{auditor || '_______________'}</span></p>
            <div className="flex gap-6">
              <span>Total Cuts: <span className="font-bold">{cuts.length}</span></span>
              <span>Total Qty: <span className="font-bold">{cuts.reduce((s, c) => s + c.cutQty, 0)}</span></span>
              <span>Total Bundles: <span className="font-bold">{cuts.reduce((s, c) => s + c.bundles.length, 0)}</span></span>
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {selComponent && cuts.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 py-16 text-center">
          <ClipboardList className="mx-auto mb-3 h-12 w-12 text-slate-200" />
          <p className="text-sm text-slate-400">No cuts found for <strong>{selComponent}</strong> in schedule <strong>{selSchedule}</strong>.</p>
          <p className="text-xs text-slate-300 mt-1">Ensure the Store-In record exists and cuts are assigned to this component.</p>
        </div>
      )}


    </motion.div>
  );
}