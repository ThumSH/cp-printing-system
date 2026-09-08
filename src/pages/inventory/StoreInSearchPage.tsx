import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, PackageOpen, ChevronDown, ChevronRight, Layers,
  GitBranch, Filter, CalendarDays, RotateCcw, Printer,
} from 'lucide-react';
import { useInventoryStore, StoreInRecord } from '../../store/inventoryStore';


const PRINT_COMPANY_NAME = 'COLOUR PLUS PRINTING SYSTEMS (PVT) LTD';
const PRINT_REPORT_TITLE = 'STORE-IN CUT REPORT';
const PRINT_LOGO_SRC = '/cp-logo.png';

type PrintableBundle = {
  bundleNo: string;
  bundleQty: number;
  size: string;
  numberRange: string;
  bundleOrder?: number;
};

function escapePrintHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatPrintQty(value: unknown) {
  const parsed = typeof value === 'number' ? value : Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed.toLocaleString() : '';
}

function orderBundlesForPrint(bundles: PrintableBundle[]) {
  const hasSavedOrder = bundles.some(bundle => typeof bundle.bundleOrder === 'number');
  if (!hasSavedOrder) return bundles;

  return bundles
    .map((bundle, originalIndex) => ({ bundle, originalIndex }))
    .sort((a, b) => {
      const aOrder = a.bundle.bundleOrder ?? a.originalIndex + 1;
      const bOrder = b.bundle.bundleOrder ?? b.originalIndex + 1;
      return aOrder === bOrder ? a.originalIndex - b.originalIndex : aOrder - bOrder;
    })
    .map(({ bundle }) => bundle);
}

function printStoreInCutReport(record: StoreInRecord) {
  const cuts = record.cuts || [];
  const totalBundles = cuts.reduce((sum, cut) => sum + ((cut.bundles || []).length), 0);
  const colourText = [record.bodyColour, record.printColour].map(v => String(v || '').trim()).filter(Boolean).join(' / ');

  const cutSectionsHtml = cuts.map((cut, cutIndex) => {
    const bundles = orderBundlesForPrint((cut.bundles || []) as PrintableBundle[]);
    const bundleRowsHtml = bundles.map(bundle => `
      <tr>
        <td>${escapePrintHtml(bundle.bundleNo)}</td>
        <td class="num">${formatPrintQty(bundle.bundleQty)}</td>
        <td>${escapePrintHtml(bundle.size)}</td>
        <td>${escapePrintHtml(bundle.numberRange || '-')}</td>
        <td class="tick"></td>
        <td class="tick"></td>
      </tr>
    `).join('') || `
      <tr>
        <td colspan="6" class="center muted">No bundle details found.</td>
      </tr>
    `;

    return `
      <section class="cut-section">
        <div class="cut-title">
          <div>
            <span class="cut-index">Cut ${cutIndex + 1}</span>
            <h3>${escapePrintHtml(cut.cutNo || '-')}</h3>
          </div>
          <div class="cut-qty">Qty: <strong>${formatPrintQty(cut.cutQty)}</strong></div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Bundle</th>
              <th>Qty</th>
              <th>Size</th>
              <th>Range</th>
              <th></th>
              <th></th>
            </tr>
          </thead>
          <tbody>${bundleRowsHtml}</tbody>
        </table>
      </section>
    `;
  }).join('') || '<p class="center muted">No cuts found for this Store-In record.</p>';

  const html = `<!DOCTYPE html>
<html>
<head>
  <title>${escapePrintHtml(PRINT_REPORT_TITLE)} - ${escapePrintHtml(record.styleNo)}</title>
  <style>
    @page { size: A4 portrait; margin: 10mm; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: Arial, Helvetica, sans-serif; color: #111827; font-size: 11px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .header { display: flex; align-items: center; gap: 14px; border-bottom: 2px solid #111827; padding-bottom: 8px; margin-bottom: 10px; }
    .logo { width: 64px; height: 50px; border: 1px solid #d1d5db; display: flex; align-items: center; justify-content: center; font-size: 9px; font-weight: 800; text-align: center; color: #64748b; }
    .logo img { max-width: 100%; max-height: 100%; object-fit: contain; }
    .title { flex: 1; }
    .company { font-size: 15px; font-weight: 900; letter-spacing: .03em; text-transform: uppercase; }
    .report-title { font-size: 13px; font-weight: 900; letter-spacing: .08em; text-transform: uppercase; margin-top: 2px; color: #334155; }
    .generated { font-size: 10px; color: #64748b; text-align: right; }
    .meta { display: grid; grid-template-columns: 80px 1fr 75px 1fr; gap: 6px 10px; border: 1px solid #cbd5e1; padding: 8px; margin-bottom: 10px; }
    .label { font-weight: 800; text-transform: uppercase; color: #475569; }
    .value { border-bottom: 1px solid #94a3b8; min-height: 14px; font-weight: 700; padding: 0 2px 2px; }
    .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin-bottom: 10px; }
    .summary-card { border: 1px solid #cbd5e1; padding: 6px; }
    .summary-card .small { color: #64748b; text-transform: uppercase; font-size: 9px; font-weight: 800; }
    .summary-card .big { font-size: 15px; font-weight: 900; margin-top: 2px; }
    .cut-section { page-break-inside: avoid; margin-top: 10px; }
    .cut-title { display: flex; justify-content: space-between; align-items: end; margin-bottom: 4px; }
    .cut-title h3 { margin: 0; font-size: 13px; font-weight: 900; color: #1e293b; }
    .cut-index { display: block; font-size: 9px; text-transform: uppercase; color: #64748b; font-weight: 800; letter-spacing: .08em; }
    .cut-qty { font-size: 11px; color: #334155; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    th, td { border: 1px solid #334155; padding: 5px 6px; text-align: left; vertical-align: middle; height: 24px; }
    th { background: #f1f5f9; color: #334155; font-size: 10px; text-transform: uppercase; font-weight: 900; }
    .num { text-align: right; font-weight: 800; }
    .tick { width: 42px; }
    .center { text-align: center; }
    .muted { color: #64748b; }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo"><img src="${escapePrintHtml(PRINT_LOGO_SRC)}" onerror="this.style.display='none'; this.parentElement.innerHTML='CP<br/>LOGO';" /></div>
    <div class="title">
      <div class="company">${escapePrintHtml(PRINT_COMPANY_NAME)}</div>
      <div class="report-title">${escapePrintHtml(PRINT_REPORT_TITLE)}</div>
    </div>
    <div class="generated">Generated<br/>${escapePrintHtml(new Date().toLocaleString())}</div>
  </div>

  <div class="meta">
    <div class="label">Style No</div><div class="value">${escapePrintHtml(record.styleNo)}</div>
    <div class="label">Customer</div><div class="value">${escapePrintHtml(record.customerName)}</div>
    <div class="label">Revision</div><div class="value">${escapePrintHtml(record.revisionNo)}</div>
    <div class="label">Component</div><div class="value">${escapePrintHtml(record.components)}</div>
    <div class="label">IN-AD No</div><div class="value">${escapePrintHtml(record.inAdNo || '-')}</div>
    <div class="label">Schedule</div><div class="value">${escapePrintHtml(record.scheduleNo || '-')}</div>
    <div class="label">Job No</div><div class="value">${escapePrintHtml(record.jobNo || '-')}</div>
    <div class="label">Date</div><div class="value">${escapePrintHtml(record.cutInDate || '-')}</div>
    <div class="label">Colour</div><div class="value">${escapePrintHtml(colourText || '-')}</div>
    <div class="label">Season</div><div class="value">${escapePrintHtml(record.season || '-')}</div>
  </div>

  <div class="summary">
    <div class="summary-card"><div class="small">IN Qty</div><div class="big">${formatPrintQty(record.inQty)}</div></div>
    <div class="summary-card"><div class="small">Total Cut Qty</div><div class="big">${formatPrintQty(record.totalCutQty)}</div></div>
    <div class="summary-card"><div class="small">Cuts</div><div class="big">${formatPrintQty(cuts.length)}</div></div>
    <div class="summary-card"><div class="small">Bundles</div><div class="big">${formatPrintQty(totalBundles)}</div></div>
  </div>

  ${cutSectionsHtml}
</body>
</html>`;

  const oldFrame = document.getElementById('store-in-search-cut-print-frame') as HTMLIFrameElement | null;
  if (oldFrame) oldFrame.remove();

  const frame = document.createElement('iframe');
  frame.id = 'store-in-search-cut-print-frame';
  frame.style.cssText = 'position:fixed;top:-10000px;left:-10000px;width:900px;height:1200px;';
  document.body.appendChild(frame);

  const doc = frame.contentDocument || frame.contentWindow?.document;
  if (!doc) return;

  doc.open();
  doc.write(html);
  doc.close();

  setTimeout(() => {
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
    setTimeout(() => frame.remove(), 1000);
  }, 300);
}


export default function StoreInSearchPage() {
  const {
    storeInRecords, fetchRecords, fetchBulkBalances,
    fetchEligibleStoreInItems,
  } = useInventoryStore();

  // Filters
  const [filterStyle, setFilterStyle] = useState('');       // "styleNo|||customerName"
  const [filterCustomer, setFilterCustomer] = useState('');
  const [filterComponent, setFilterComponent] = useState('');
  const [filterSchedule, setFilterSchedule] = useState('');
  const [filterJobNo, setFilterJobNo] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        await Promise.all([fetchRecords(), fetchBulkBalances(), fetchEligibleStoreInItems()]);
      } catch (e) {
        console.error('Failed to load:', e);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [fetchRecords, fetchBulkBalances, fetchEligibleStoreInItems]);

  // ==========================================
  // DERIVED DATA
  // ==========================================

  // Unique styles with store-in records
  const availableStyles = useMemo(() => {
    const map = new Map<string, { styleNo: string; customerName: string; count: number; latestDate: string }>();
    storeInRecords.forEach((r) => {
      const key = `${r.styleNo}|||${r.customerName}`;
      const existing = map.get(key);
      if (existing) {
        existing.count += 1;
        if (r.cutInDate > existing.latestDate) existing.latestDate = r.cutInDate;
      } else {
        map.set(key, { styleNo: r.styleNo, customerName: r.customerName, count: 1, latestDate: r.cutInDate || '' });
      }
    });
    return Array.from(map.entries())
      .map(([key, val]) => ({ key, ...val }))
      .sort((a, b) => b.latestDate.localeCompare(a.latestDate)); // Most recent first
  }, [storeInRecords]);

  // Unique customers
  const customers = useMemo(() => {
    const set = new Set(storeInRecords.map((r) => r.customerName).filter(Boolean));
    return Array.from(set).sort();
  }, [storeInRecords]);

  // Unique components (scoped to selected style/customer/schedule)
  const components = useMemo(() => {
    let records = storeInRecords;
    if (filterStyle) {
      const [sn, cn] = filterStyle.split('|||');
      records = records.filter((r) => r.styleNo === sn && r.customerName === cn);
    }
    if (filterCustomer) {
      records = records.filter((r) => r.customerName === filterCustomer);
    }
    if (filterComponent) {
      records = records.filter((r) => r.components === filterComponent);
    }
    if (filterSchedule) {
      records = records.filter((r) => r.scheduleNo === filterSchedule);
    }
    const set = new Set(records.map((r) => r.components).filter(Boolean));
    return Array.from(set).sort();
  }, [storeInRecords, filterStyle, filterCustomer, filterSchedule]);

  // Schedule numbers (scoped to selected style/customer)
  const scheduleNos = useMemo(() => {
    let records = storeInRecords;
    if (filterStyle) {
      const [sn, cn] = filterStyle.split('|||');
      records = records.filter((r) => r.styleNo === sn && r.customerName === cn);
    }
    if (filterCustomer) {
      records = records.filter((r) => r.customerName === filterCustomer);
    }
    const set = new Set(records.map((r) => r.scheduleNo).filter(Boolean));
    return Array.from(set).sort();
  }, [storeInRecords, filterStyle, filterCustomer]);

  // Job numbers (scoped to selected style/customer/component/schedule)
  const jobNos = useMemo(() => {
    let records = storeInRecords;
    if (filterStyle) {
      const [sn, cn] = filterStyle.split('|||');
      records = records.filter((r) => r.styleNo === sn && r.customerName === cn);
    }
    if (filterCustomer) {
      records = records.filter((r) => r.customerName === filterCustomer);
    }
    if (filterComponent) {
      records = records.filter((r) => r.components === filterComponent);
    }
    if (filterSchedule) {
      records = records.filter((r) => r.scheduleNo === filterSchedule);
    }
    const set = new Set(records.map((r) => (r.jobNo || '').trim()).filter(Boolean));
    return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [storeInRecords, filterStyle, filterCustomer, filterComponent, filterSchedule]);

  // Selected style info card
  const selectedStyleInfo = useMemo(() => {
    if (!filterStyle) return null;
    const [styleNo, customerName] = filterStyle.split('|||');
    const records = storeInRecords.filter((r) => r.styleNo === styleNo && r.customerName === customerName);
    if (records.length === 0) return null;
    const first = records[0];
    return {
      styleNo, customerName,
      bodyColour: first.bodyColour, printColour: first.printColour,
      season: first.season, components: first.components,
      bulkQty: first.bulkQty, totalRecords: records.length,
    };
  }, [filterStyle, storeInRecords]);

  // Is any filter active?
  const hasFilters = !!(filterStyle || filterCustomer || filterComponent || filterSchedule || filterJobNo || filterDateFrom || filterDateTo);

  // Filtered records
  const filteredRecords = useMemo(() => {
    let records = [...storeInRecords];

    if (filterStyle) {
      const [sn, cn] = filterStyle.split('|||');
      records = records.filter((r) => r.styleNo === sn && r.customerName === cn);
    }
    if (filterCustomer) {
      records = records.filter((r) => r.customerName === filterCustomer);
    }
    if (filterComponent) {
      records = records.filter((r) => r.components === filterComponent);
    }
    if (filterSchedule) {
      records = records.filter((r) => r.scheduleNo === filterSchedule);
    }
    if (filterJobNo) {
      records = records.filter((r) => (r.jobNo || '').trim() === filterJobNo);
    }
    if (filterDateFrom) {
      records = records.filter((r) => r.cutInDate >= filterDateFrom);
    }
    if (filterDateTo) {
      records = records.filter((r) => r.cutInDate <= filterDateTo);
    }

    return records;
  }, [storeInRecords, filterStyle, filterCustomer, filterComponent, filterSchedule, filterJobNo, filterDateFrom, filterDateTo]);

  // Display records only after the user applies at least one filter.
  const displayRecords = useMemo(() => {
    if (!hasFilters) return [];
    return filteredRecords;
  }, [hasFilters, filteredRecords]);

  // Summary stats (based on what's displayed)
  const summary = useMemo(() => ({
    totalRecords: displayRecords.length,
    totalInQty: displayRecords.reduce((s, r) => s + r.inQty, 0),
    totalCuts: displayRecords.reduce((s, r) => s + r.cuts.length, 0),
    totalBundles: displayRecords.reduce((s, r) => s + r.cuts.reduce((cs, c) => cs + c.bundles.length, 0), 0),
  }), [displayRecords]);

  // Reset everything
  const clearFilters = () => {
    setFilterStyle('');
    setFilterCustomer('');
    setFilterComponent('');
    setFilterSchedule('');
    setFilterJobNo('');
    setFilterDateFrom('');
    setFilterDateTo('');
    setExpandedId(null);
  };

  // Active filter count (for badge)
  const activeFilterCount = [filterStyle, filterCustomer, filterComponent, filterSchedule, filterJobNo, filterDateFrom, filterDateTo].filter(Boolean).length;

  // ==========================================
  // RENDER
  // ==========================================
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-6xl space-y-6 pb-12"
    >
      {/* Header */}
      <div className="flex items-center space-x-3 border-b border-slate-200 pb-4">
        <div className="rounded-lg bg-orange-100 p-2">
          <Search className="h-6 w-6 text-orange-700" />
        </div>
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-slate-900">Store-In Search</h2>
          <p className="text-sm text-slate-500">
            Select a style to view its store-in records, cuts, and bundles.
          </p>
        </div>
      </div>

      {/* ==========================================
          FILTERS CARD
          ========================================== */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        {/* Filter header with always-visible Clear button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-500" />
            <h3 className="text-sm font-bold text-slate-700">Filters</h3>
            {activeFilterCount > 0 && (
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                {activeFilterCount} active
              </span>
            )}
          </div>

          {/* Clear button — always visible, styled prominently */}
          <button
            onClick={clearFilters}
            className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              hasFilters
                ? 'bg-red-50 border border-red-200 text-red-700 hover:bg-red-100'
                : 'bg-slate-50 border border-slate-200 text-slate-400 cursor-default'
            }`}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Clear All
          </button>
        </div>

        {/* Filter grid */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Style Dropdown */}
          <div className="space-y-1 lg:col-span-2">
            <label className="block text-xs font-medium text-slate-600">
              Style <span className="text-slate-400">(select from available styles)</span>
            </label>
            <select
              value={filterStyle}
              onChange={(e) => {
                setFilterStyle(e.target.value);
                setFilterComponent('');
                setFilterSchedule('');
                setFilterJobNo('');
              }}
              className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-colors ${
                filterStyle
                  ? 'border-blue-400 bg-blue-50/50 ring-1 ring-blue-200'
                  : 'border-slate-300 bg-white focus:ring-2 focus:ring-blue-500'
              }`}
            >
              <option value="">All Styles</option>
              {availableStyles.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.styleNo} | {s.customerName} ({s.count} record{s.count !== 1 ? 's' : ''})
                </option>
              ))}
            </select>
          </div>

          {/* Customer */}
          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-600">Customer</label>
            <select
              value={filterCustomer}
              onChange={(e) => setFilterCustomer(e.target.value)}
              className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-colors ${
                filterCustomer
                  ? 'border-blue-400 bg-blue-50/50 ring-1 ring-blue-200'
                  : 'border-slate-300 bg-white focus:ring-2 focus:ring-blue-500'
              }`}
            >
              <option value="">All Customers</option>
              {customers.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Component */}
          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-600">Component</label>
            <select
              value={filterComponent}
              onChange={(e) => {
                setFilterComponent(e.target.value);
                setFilterJobNo('');
              }}
              className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-colors ${
                filterComponent
                  ? 'border-blue-400 bg-blue-50/50 ring-1 ring-blue-200'
                  : 'border-slate-300 bg-white focus:ring-2 focus:ring-blue-500'
              }`}
            >
              <option value="">All Components</option>
              {components.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Schedule No */}
          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-600">Schedule No</label>
            <select
              value={filterSchedule}
              onChange={(e) => {
                setFilterSchedule(e.target.value);
                setFilterJobNo('');
              }}
              className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-colors ${
                filterSchedule
                  ? 'border-blue-400 bg-blue-50/50 ring-1 ring-blue-200'
                  : 'border-slate-300 bg-white focus:ring-2 focus:ring-blue-500'
              }`}
            >
              <option value="">All Schedules</option>
              {scheduleNos.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Job No */}
          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-600">Job No</label>
            <select
              value={filterJobNo}
              onChange={(e) => setFilterJobNo(e.target.value)}
              disabled={jobNos.length === 0}
              className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-colors ${
                filterJobNo
                  ? 'border-blue-400 bg-blue-50/50 ring-1 ring-blue-200'
                  : jobNos.length === 0
                    ? 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed'
                    : 'border-slate-300 bg-white focus:ring-2 focus:ring-blue-500'
              }`}
            >
              <option value="">{jobNos.length === 0 ? 'No Job Nos' : 'All Job Nos'}</option>
              {jobNos.map((j) => (
                <option key={j} value={j}>{j}</option>
              ))}
            </select>
          </div>

          {/* Date From */}
          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-600">
              <CalendarDays className="mr-1 inline h-3 w-3" />
              Cut In Date From
            </label>
            <input
              type="date"
              value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
              className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-colors ${
                filterDateFrom
                  ? 'border-blue-400 bg-blue-50/50 ring-1 ring-blue-200'
                  : 'border-slate-300 bg-white focus:ring-2 focus:ring-blue-500'
              }`}
            />
          </div>

          {/* Date To */}
          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-600">
              <CalendarDays className="mr-1 inline h-3 w-3" />
              Cut In Date To
            </label>
            <input
              type="date"
              value={filterDateTo}
              onChange={(e) => setFilterDateTo(e.target.value)}
              className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-colors ${
                filterDateTo
                  ? 'border-blue-400 bg-blue-50/50 ring-1 ring-blue-200'
                  : 'border-slate-300 bg-white focus:ring-2 focus:ring-blue-500'
              }`}
            />
          </div>
        </div>

        {/* Selected style info card */}
        {selectedStyleInfo && (
          <div className="rounded-lg border border-blue-200 bg-blue-50/60 p-4">
            <div className="flex items-center gap-2 mb-2">
              <PackageOpen className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-bold text-blue-900">{selectedStyleInfo.styleNo}</span>
              <span className="text-xs text-blue-700">{selectedStyleInfo.customerName}</span>
              <span className="ml-auto rounded-full bg-blue-200 px-2 py-0.5 text-[10px] font-bold text-blue-800">
                {selectedStyleInfo.totalRecords} record{selectedStyleInfo.totalRecords !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-5 text-xs">
              <div><span className="text-blue-500">Body Colour:</span> <span className="font-medium text-slate-700">{selectedStyleInfo.bodyColour || '-'}</span></div>
              <div><span className="text-blue-500">Print Colour:</span> <span className="font-medium text-slate-700">{selectedStyleInfo.printColour || '-'}</span></div>
              <div><span className="text-blue-500">Season:</span> <span className="font-medium text-slate-700">{selectedStyleInfo.season || '-'}</span></div>
              <div><span className="text-blue-500">Components:</span> <span className="font-medium text-slate-700">{selectedStyleInfo.components || '-'}</span></div>
              <div><span className="text-blue-500">Approved Bulk:</span> <span className="font-bold text-slate-900">{selectedStyleInfo.bulkQty}</span></div>
            </div>
          </div>
        )}
      </div>

      {/* ==========================================
          SUMMARY CARDS
          ========================================== */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <SummaryCard label="Records" value={summary.totalRecords} />
        <SummaryCard label="Total IN Qty" value={summary.totalInQty} color="orange" />
        <SummaryCard label="Total Cuts" value={summary.totalCuts} color="blue" />
        <SummaryCard label="Total Bundles" value={summary.totalBundles} color="green" />
      </div>

      {/* ==========================================
          RESULTS TABLE
          ========================================== */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {/* Table header */}
        <div className="border-b border-slate-200 bg-slate-50 px-6 py-3 flex items-center justify-between">
          {hasFilters ? (
            <p className="text-sm font-medium text-slate-700">
              {filteredRecords.length} of {storeInRecords.length} records
            </p>
          ) : (
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-slate-400" />
              <p className="text-sm font-medium text-slate-700">
                Apply a filter to view Store-In records
              </p>
              <span className="text-xs text-slate-400">No records are shown before filtering.</span>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="py-16 text-center text-slate-400">Loading records...</div>
        ) : displayRecords.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <PackageOpen className="mx-auto mb-3 h-12 w-12 opacity-20" />
            <p>{hasFilters ? 'No records match your filters.' : 'Select a style, customer, schedule, job no, or date filter to view records.'}</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {displayRecords.map((record) => {
              const isExpanded = expandedId === record.id;
              const totalBundles = record.cuts.reduce((s, c) => s + c.bundles.length, 0);

              return (
                <div key={record.id}>
                  <div
                    className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50/50 cursor-pointer transition-colors"
                    onClick={() => setExpandedId(isExpanded ? null : record.id)}
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-slate-900">{record.styleNo}</p>
                        <span className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
                          <GitBranch className="h-2.5 w-2.5" />Rev {record.revisionNo}
                        </span>
                        <span className="text-xs text-slate-500">{record.customerName}</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Sch: <span className="font-medium text-slate-700">{record.scheduleNo || '-'}</span>
                        {' | '}Job: <span className="font-medium text-slate-700">{record.jobNo || '-'}</span>
                        {' | '}Date: <span className="font-medium text-slate-700">{record.cutInDate}</span>
                        {' | '}{record.bodyColour} / {record.printColour}
                        {' | '}{record.season}
                      </p>
                    </div>

                    <div className="text-right space-y-0.5 shrink-0">
                      <div className="text-xs">
                        IN: <span className="font-bold text-orange-600">{record.inQty}</span>
                      </div>
                      <div className="text-xs text-slate-500">
                        {record.cuts.length} cut{record.cuts.length !== 1 ? 's' : ''} · {totalBundles} bundle{totalBundles !== 1 ? 's' : ''}
                      </div>
                      <div className="text-xs">
                        Bulk Bal: <span className="font-bold text-blue-700">{record.balanceBulkQty}</span>
                      </div>
                    </div>
                  </div>

                  {/* Expanded detail */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="border-t border-slate-100 bg-slate-50/50 px-6 py-4 overflow-hidden"
                      >
                        <div className="mb-3 flex justify-end">
                          <button
                            type="button"
                            onClick={() => printStoreInCutReport(record)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
                          >
                            <Printer className="h-3.5 w-3.5" />
                            Print Cut Report
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-3 md:grid-cols-6 mb-4">
                          <MiniStat label="Approved Bulk" value={record.bulkQty} />
                          <MiniStat label="IN Qty" value={record.inQty} color="orange" />
                          <MiniStat label="Bulk Balance" value={record.balanceBulkQty} color="blue" />
                          <MiniStat label="Total Cut Qty" value={record.totalCutQty} />
                          <MiniStat label="Uncut Balance" value={record.uncutBalance} />
                          <MiniStat label="Available (Shelf)" value={record.availableQty} color="green" />
                        </div>

                        <div className="grid grid-cols-2 gap-3 md:grid-cols-5 mb-4 p-3 rounded-lg bg-white border border-slate-200">
                          <InfoField label="Job No" value={record.jobNo || ''} />
                          <InfoField label="Components" value={record.components} />
                          <InfoField label="Body Colour" value={record.bodyColour} />
                          <InfoField label="Print Colour" value={record.printColour} />
                          <InfoField label="Season" value={record.season} />
                        </div>

                        {record.cuts.map((cut) => (
                          <div key={cut.id} className="mb-3 last:mb-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Layers className="h-3.5 w-3.5 text-slate-400" />
                              <span className="text-sm font-bold text-slate-700">{cut.cutNo}</span>
                              <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                                Qty: {cut.cutQty}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {cut.bundles.length} bundle{cut.bundles.length !== 1 ? 's' : ''}
                              </span>
                            </div>
                            <div className="ml-6 border-l-2 border-slate-200 pl-4">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="text-slate-400">
                                    <th className="py-1 text-left font-medium">Bundle</th>
                                    <th className="py-1 text-left font-medium">Qty</th>
                                    <th className="py-1 text-left font-medium">Size</th>
                                    <th className="py-1 text-left font-medium">Range</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {cut.bundles.map((b) => (
                                    <tr key={b.id} className="text-slate-700">
                                      <td className="py-0.5 font-medium">{b.bundleNo}</td>
                                      <td className="py-0.5 font-bold">{b.bundleQty}</td>
                                      <td className="py-0.5">{b.size}</td>
                                      <td className="py-0.5 text-slate-500">{b.numberRange || '-'}</td>
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

// ==========================================
// HELPERS
// ==========================================
function SummaryCard({ label, value, color }: { label: string; value: number; color?: 'orange' | 'blue' | 'green' }) {
  const cc = color === 'orange' ? 'text-orange-700' : color === 'blue' ? 'text-blue-700' : color === 'green' ? 'text-emerald-700' : 'text-slate-700';
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`text-xl font-black ${cc}`}>{value.toLocaleString()}</p>
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string; value: number; color?: 'orange' | 'blue' | 'green' }) {
  const cc = color === 'orange' ? 'text-orange-700' : color === 'blue' ? 'text-blue-700' : color === 'green' ? 'text-emerald-700' : 'text-slate-700';
  return (
    <div className="rounded-lg bg-white border border-slate-200 px-3 py-2">
      <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`text-lg font-black ${cc}`}>{value}</p>
    </div>
  );
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <label className="block text-[10px] font-medium uppercase tracking-wide text-slate-400">{label}</label>
      <p className="text-sm font-medium text-slate-700">{value || '-'}</p>
    </div>
  );
}