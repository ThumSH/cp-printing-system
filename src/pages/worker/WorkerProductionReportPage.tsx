import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Filter,
  Printer,
  RefreshCw,
  X,
} from 'lucide-react';
import { API, getAuthHeaders } from '../../api/client';

const REPORT_API = `${API.WORKER}/reports/production`;

type PeriodType = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';

type StageKey = 'seating' | 'printing' | 'curing' | 'checking' | 'packing' | 'dispatch';

interface AllocationRow {
  productionRecordId: string;
  styleNo: string;
  customerName: string;
  cutNo: string;
  component: string;
  issueQty: number;
  seating: number;
  printing: number;
  curing: number;
  checking: number;
  packing: number;
  dispatch: number;
  firstEntryDate: string;
  lastEntryDate: string;
  entryCount: number;
}

interface StyleSummary {
  styleNo: string;
  customerName: string;
  productionAllocations: number;
  linkedIssueQty: number;
  seating: number;
  printing: number;
  curing: number;
  checking: number;
  packing: number;
  dispatch: number;
}

interface ReportTotals {
  styles: number;
  productionAllocations: number;
  linkedIssueQty: number;
  seating: number;
  printing: number;
  curing: number;
  checking: number;
  packing: number;
  dispatch: number;
}

interface ProductionReportResponse {
  dateFrom: string;
  dateTo: string;
  generatedAtUtc: string;
  totals: ReportTotals;
  styleSummaries: StyleSummary[];
  allocationRows: AllocationRow[];
}

const STAGES: { key: StageKey; label: string }[] = [
  { key: 'seating', label: 'Seating' },
  { key: 'printing', label: 'Printing' },
  { key: 'curing', label: 'Curing' },
  { key: 'checking', label: 'Checking' },
  { key: 'packing', label: 'Packing' },
  { key: 'dispatch', label: 'Dispatch' },
];

function getColomboToday(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Colombo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());

  const year = parts.find(p => p.type === 'year')?.value ?? '';
  const month = parts.find(p => p.type === 'month')?.value ?? '';
  const day = parts.find(p => p.type === 'day')?.value ?? '';
  return `${year}-${month}-${day}`;
}

function toDateOnly(value: string) {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function formatDateInput(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getWeekRange(anchor: string) {
  const date = toDateOnly(anchor);
  const day = date.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const from = new Date(date);
  from.setDate(date.getDate() + diffToMonday);
  const to = new Date(from);
  to.setDate(from.getDate() + 6);
  return { from: formatDateInput(from), to: formatDateInput(to) };
}

function monthEnd(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function resolveRange(
  periodType: PeriodType,
  anchorDate: string,
  selectedMonth: string,
  selectedYear: string,
  customFrom: string,
  customTo: string,
) {
  if (periodType === 'daily') return { from: anchorDate, to: anchorDate };
  if (periodType === 'weekly') return getWeekRange(anchorDate);
  if (periodType === 'monthly') {
    const [year, month] = selectedMonth.split('-').map(Number);
    const last = monthEnd(year, month);
    return {
      from: `${year}-${String(month).padStart(2, '0')}-01`,
      to: `${year}-${String(month).padStart(2, '0')}-${String(last).padStart(2, '0')}`,
    };
  }
  if (periodType === 'yearly') {
    return { from: `${selectedYear}-01-01`, to: `${selectedYear}-12-31` };
  }
  return { from: customFrom, to: customTo };
}

function formatHumanDate(value: string) {
  if (!value) return '-';
  return toDateOnly(value).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatQty(value: number) {
  return Number(value || 0).toLocaleString();
}

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function periodLabel(
  periodType: PeriodType,
  range: { from: string; to: string },
  selectedMonth: string,
  selectedYear: string,
) {
  if (periodType === 'daily') return formatHumanDate(range.from);
  if (periodType === 'weekly') return `${formatHumanDate(range.from)} – ${formatHumanDate(range.to)}`;
  if (periodType === 'monthly') {
    const [y, m] = selectedMonth.split('-').map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  }
  if (periodType === 'yearly') return selectedYear;
  return `${formatHumanDate(range.from)} – ${formatHumanDate(range.to)}`;
}

export default function WorkerProductionReportPage() {
  const today = useMemo(() => getColomboToday(), []);
  const [periodType, setPeriodType] = useState<PeriodType>('monthly');
  const [anchorDate, setAnchorDate] = useState(today);
  const [selectedMonth, setSelectedMonth] = useState(today.slice(0, 7));
  const [selectedYear, setSelectedYear] = useState(today.slice(0, 4));
  const [customFrom, setCustomFrom] = useState(`${today.slice(0, 8)}01`);
  const [customTo, setCustomTo] = useState(today);

  const [report, setReport] = useState<ProductionReportResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const [filterStyle, setFilterStyle] = useState('');
  const [filterCustomer, setFilterCustomer] = useState('');
  const [filterComponent, setFilterComponent] = useState('');
  const [expandedStyles, setExpandedStyles] = useState<Set<string>>(new Set());

  const range = useMemo(
    () => resolveRange(periodType, anchorDate, selectedMonth, selectedYear, customFrom, customTo),
    [periodType, anchorDate, selectedMonth, selectedYear, customFrom, customTo],
  );

  const fetchReport = async () => {
    if (!range.from || !range.to) {
      setError('Select a valid reporting period.');
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ dateFrom: range.from, dateTo: range.to });
      const response = await fetch(`${REPORT_API}?${params.toString()}`, { headers: getAuthHeaders() });
      if (!response.ok) throw new Error(await response.text() || 'Failed to load production report.');
      const data: ProductionReportResponse = await response.json();
      setReport(data);
      setExpandedStyles(new Set());
    } catch (e) {
      setReport(null);
      setError(e instanceof Error ? e.message : 'Failed to load production report.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchReport();
    // Initial report load only. Period changes are applied with the Generate button.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const styleOptions = useMemo(
    () => [...new Set((report?.styleSummaries || []).map(r => r.styleNo).filter(Boolean))].sort(),
    [report],
  );

  const customerOptions = useMemo(
    () => [...new Set((report?.styleSummaries || []).map(r => r.customerName).filter(Boolean))].sort(),
    [report],
  );

  const componentOptions = useMemo(
    () => [...new Set((report?.allocationRows || []).map(r => r.component).filter(Boolean))].sort(),
    [report],
  );

  const filteredAllocations = useMemo(() => {
    return (report?.allocationRows || []).filter(r =>
      (!filterStyle || r.styleNo === filterStyle) &&
      (!filterCustomer || r.customerName === filterCustomer) &&
      (!filterComponent || r.component === filterComponent)
    );
  }, [report, filterStyle, filterCustomer, filterComponent]);

  const filteredStyleSummaries = useMemo<StyleSummary[]>(() => {
    const grouped = new Map<string, StyleSummary>();

    filteredAllocations.forEach(row => {
      const key = `${row.styleNo}|||${row.customerName}`;
      const current = grouped.get(key);
      if (current) {
        current.productionAllocations += 1;
        current.linkedIssueQty += row.issueQty;
        current.seating += row.seating;
        current.printing += row.printing;
        current.curing += row.curing;
        current.checking += row.checking;
        current.packing += row.packing;
        current.dispatch += row.dispatch;
      } else {
        grouped.set(key, {
          styleNo: row.styleNo,
          customerName: row.customerName,
          productionAllocations: 1,
          linkedIssueQty: row.issueQty,
          seating: row.seating,
          printing: row.printing,
          curing: row.curing,
          checking: row.checking,
          packing: row.packing,
          dispatch: row.dispatch,
        });
      }
    });

    return Array.from(grouped.values()).sort((a, b) =>
      a.styleNo.localeCompare(b.styleNo) || a.customerName.localeCompare(b.customerName)
    );
  }, [filteredAllocations]);

  const filteredTotals = useMemo<ReportTotals>(() => ({
    styles: filteredStyleSummaries.length,
    productionAllocations: filteredAllocations.length,
    linkedIssueQty: filteredAllocations.reduce((s, r) => s + (r.issueQty || 0), 0),
    seating: filteredAllocations.reduce((s, r) => s + (r.seating || 0), 0),
    printing: filteredAllocations.reduce((s, r) => s + (r.printing || 0), 0),
    curing: filteredAllocations.reduce((s, r) => s + (r.curing || 0), 0),
    checking: filteredAllocations.reduce((s, r) => s + (r.checking || 0), 0),
    packing: filteredAllocations.reduce((s, r) => s + (r.packing || 0), 0),
    dispatch: filteredAllocations.reduce((s, r) => s + (r.dispatch || 0), 0),
  }), [filteredAllocations, filteredStyleSummaries]);

  const resetFilters = () => {
    setFilterStyle('');
    setFilterCustomer('');
    setFilterComponent('');
  };

  const toggleStyle = (key: string) => {
    setExpandedStyles(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const printReport = () => {
    if (!report) return;

    const currentPeriodLabel = periodLabel(periodType, range, selectedMonth, selectedYear);
    const filterLines = [
      filterStyle ? `Style: ${filterStyle}` : 'Style: All',
      filterCustomer ? `Customer: ${filterCustomer}` : 'Customer: All',
      filterComponent ? `Component: ${filterComponent}` : 'Component: All',
    ];

    const summaryRows = filteredStyleSummaries.map(row => `
      <tr>
        <td>${escapeHtml(row.styleNo)}</td>
        <td>${escapeHtml(row.customerName)}</td>
        <td class="num">${formatQty(row.productionAllocations)}</td>
        <td class="num">${formatQty(row.linkedIssueQty)}</td>
        <td class="num">${formatQty(row.seating)}</td>
        <td class="num">${formatQty(row.printing)}</td>
        <td class="num">${formatQty(row.curing)}</td>
        <td class="num">${formatQty(row.checking)}</td>
        <td class="num">${formatQty(row.packing)}</td>
        <td class="num">${formatQty(row.dispatch)}</td>
      </tr>
    `).join('');

    const detailRows = filteredAllocations.map(row => `
      <tr>
        <td>${escapeHtml(row.styleNo)}</td>
        <td>${escapeHtml(row.customerName)}</td>
        <td>${escapeHtml(row.cutNo || '-')}</td>
        <td>${escapeHtml(row.component || '-')}</td>
        <td class="num">${formatQty(row.issueQty)}</td>
        <td class="num">${formatQty(row.seating)}</td>
        <td class="num">${formatQty(row.printing)}</td>
        <td class="num">${formatQty(row.curing)}</td>
        <td class="num">${formatQty(row.checking)}</td>
        <td class="num">${formatQty(row.packing)}</td>
        <td class="num">${formatQty(row.dispatch)}</td>
      </tr>
    `).join('');

    const html = `<!DOCTYPE html>
<html>
<head>
  <title>Worker Production Report - ${escapeHtml(currentPeriodLabel)}</title>
  <style>
    @page { size: A4 landscape; margin: 9mm; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: Arial, Helvetica, sans-serif; color: #0f172a; font-size: 9px; }
    .header { display: flex; align-items: center; gap: 12px; border-bottom: 2px solid #0f172a; padding-bottom: 7px; margin-bottom: 8px; }
    .logo { width: 62px; height: 46px; display: flex; align-items: center; justify-content: center; }
    .logo img { max-width: 100%; max-height: 100%; object-fit: contain; }
    .title { flex: 1; }
    .company { font-size: 15px; font-weight: 900; letter-spacing: .03em; }
    .report-title { font-size: 12px; margin-top: 2px; font-weight: 900; letter-spacing: .08em; color: #334155; }
    .meta-right { text-align: right; color: #64748b; line-height: 1.35; }
    .meta { display: grid; grid-template-columns: 90px 1fr 90px 1fr; gap: 5px 8px; border: 1px solid #cbd5e1; padding: 7px; margin-bottom: 8px; }
    .meta .label { font-weight: 800; text-transform: uppercase; color: #475569; }
    .summary-grid { display: grid; grid-template-columns: repeat(9, 1fr); gap: 4px; margin-bottom: 8px; }
    .card { border: 1px solid #cbd5e1; padding: 5px; }
    .card .small { color: #64748b; text-transform: uppercase; font-size: 7px; font-weight: 800; }
    .card .big { font-size: 12px; font-weight: 900; margin-top: 1px; }
    h3 { margin: 8px 0 4px; font-size: 10px; text-transform: uppercase; letter-spacing: .06em; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; margin-bottom: 8px; }
    th, td { border: 1px solid #64748b; padding: 3px 4px; vertical-align: middle; }
    th { background: #e2e8f0; color: #1e293b; font-size: 7px; text-transform: uppercase; font-weight: 900; }
    .num { text-align: right; font-weight: 700; }
    .note { margin: 5px 0 8px; color: #475569; font-size: 8px; }
    .signatures { display: grid; grid-template-columns: repeat(3, 1fr); gap: 35px; margin-top: 18px; }
    .signature { border-top: 1px solid #334155; padding-top: 4px; text-align: center; font-weight: 700; color: #475569; }
    .page-break { break-before: page; }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo"><img src="/cp-logo.png" /></div>
    <div class="title">
      <div class="company">COLOUR PLUS PRINTING SYSTEMS (PVT) LTD</div>
      <div class="report-title">WORKER PRODUCTION REPORT</div>
    </div>
    <div class="meta-right">
      Generated: ${escapeHtml(new Date().toLocaleString())}<br/>
      Stage allocations recorded within selected period
    </div>
  </div>

  <div class="meta">
    <div class="label">Report Type</div><div>${escapeHtml(periodType.toUpperCase())}</div>
    <div class="label">Period</div><div>${escapeHtml(currentPeriodLabel)}</div>
    <div class="label">Date Range</div><div>${escapeHtml(formatHumanDate(range.from))} – ${escapeHtml(formatHumanDate(range.to))}</div>
    <div class="label">Filters</div><div>${escapeHtml(filterLines.join(' | '))}</div>
  </div>

  <div class="summary-grid">
    <div class="card"><div class="small">Styles</div><div class="big">${formatQty(filteredTotals.styles)}</div></div>
    <div class="card"><div class="small">Allocations</div><div class="big">${formatQty(filteredTotals.productionAllocations)}</div></div>
    <div class="card"><div class="small">Linked Issue Qty</div><div class="big">${formatQty(filteredTotals.linkedIssueQty)}</div></div>
    <div class="card"><div class="small">Seating</div><div class="big">${formatQty(filteredTotals.seating)}</div></div>
    <div class="card"><div class="small">Printing</div><div class="big">${formatQty(filteredTotals.printing)}</div></div>
    <div class="card"><div class="small">Curing</div><div class="big">${formatQty(filteredTotals.curing)}</div></div>
    <div class="card"><div class="small">Checking</div><div class="big">${formatQty(filteredTotals.checking)}</div></div>
    <div class="card"><div class="small">Packing</div><div class="big">${formatQty(filteredTotals.packing)}</div></div>
    <div class="card"><div class="small">Dispatch</div><div class="big">${formatQty(filteredTotals.dispatch)}</div></div>
  </div>

  <h3>Style Summary</h3>
  <div class="note">Each production stage is reported independently. Stage quantities are not added together into one combined allocation total.</div>
  <table>
    <thead>
      <tr>
        <th>Style</th><th>Customer</th><th>Jobs</th><th>Linked Issue</th>
        <th>Seating</th><th>Printing</th><th>Curing</th><th>Checking</th><th>Packing</th><th>Dispatch</th>
      </tr>
    </thead>
    <tbody>${summaryRows || '<tr><td colspan="10" style="text-align:center">No report data for the selected period.</td></tr>'}</tbody>
  </table>

  <div class="page-break"></div>
  <h3>Production Allocation Detail</h3>
  <table>
    <thead>
      <tr>
        <th>Style</th><th>Customer</th><th>Cut</th><th>Component</th><th>Issue Qty</th>
        <th>Seating</th><th>Printing</th><th>Curing</th><th>Checking</th><th>Packing</th><th>Dispatch</th>
      </tr>
    </thead>
    <tbody>${detailRows || '<tr><td colspan="11" style="text-align:center">No report data for the selected period.</td></tr>'}</tbody>
  </table>

  <div class="signatures">
    <div class="signature">Prepared / Generated By</div>
    <div class="signature">Reviewed By</div>
    <div class="signature">Approved By</div>
  </div>
</body>
</html>`;

    const oldFrame = document.getElementById('worker-production-report-print-frame') as HTMLIFrameElement | null;
    if (oldFrame) oldFrame.remove();

    const frame = document.createElement('iframe');
    frame.id = 'worker-production-report-print-frame';
    frame.style.cssText = 'position:fixed;top:-10000px;left:-10000px;width:1400px;height:1000px;';
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
  };

  const currentPeriodLabel = periodLabel(periodType, range, selectedMonth, selectedYear);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-7xl space-y-6 pb-12"
    >
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-teal-100 p-2">
            <BarChart3 className="h-6 w-6 text-teal-700" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Worker Production Report</h2>
            <p className="text-sm text-slate-500">
              Review stage allocations by style for a day, week, month, year, or custom period.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={printReport}
          disabled={!report || isLoading}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-800 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Printer className="h-4 w-4" />
          Print Report
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          <X className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-slate-500" />
          <h3 className="text-sm font-bold text-slate-800">Reporting Period</h3>
        </div>

        <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
          {(['daily', 'weekly', 'monthly', 'yearly', 'custom'] as PeriodType[]).map(type => (
            <button
              key={type}
              type="button"
              onClick={() => setPeriodType(type)}
              className={`rounded-lg border px-3 py-2 text-sm font-semibold capitalize transition ${
                periodType === type
                  ? 'border-teal-500 bg-teal-50 text-teal-700 ring-1 ring-teal-200'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          {(periodType === 'daily' || periodType === 'weekly') && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">{periodType === 'weekly' ? 'Week containing' : 'Date'}</label>
              <input
                type="date"
                value={anchorDate}
                onChange={e => setAnchorDate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          )}

          {periodType === 'monthly' && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Month</label>
              <input
                type="month"
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          )}

          {periodType === 'yearly' && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Year</label>
              <input
                type="number"
                min="2000"
                max="2100"
                value={selectedYear}
                onChange={e => setSelectedYear(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          )}

          {periodType === 'custom' && (
            <>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">Date From</label>
                <input
                  type="date"
                  value={customFrom}
                  onChange={e => setCustomFrom(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">Date To</label>
                <input
                  type="date"
                  value={customTo}
                  onChange={e => setCustomTo(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </>
          )}

          <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 md:col-span-2">
            <p className="text-[10px] font-bold uppercase tracking-wide text-blue-500">Selected period</p>
            <p className="mt-0.5 text-sm font-bold text-blue-800">{currentPeriodLabel}</p>
            <p className="text-xs text-blue-600">{range.from} → {range.to}</p>
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={() => void fetchReport()}
              disabled={isLoading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-teal-700 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              {isLoading ? 'Generating...' : 'Generate Report'}
            </button>
          </div>
        </div>
      </div>

      {report && (
        <>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-slate-500" />
                <h3 className="text-sm font-bold text-slate-800">Report Filters</h3>
              </div>
              <button
                type="button"
                onClick={resetFilters}
                className="text-xs font-semibold text-slate-500 underline hover:text-slate-700"
              >
                Clear filters
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <FilterSelect label="Style" value={filterStyle} options={styleOptions} onChange={setFilterStyle} />
              <FilterSelect label="Customer" value={filterCustomer} options={customerOptions} onChange={setFilterCustomer} />
              <FilterSelect label="Component" value={filterComponent} options={componentOptions} onChange={setFilterComponent} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-9">
            <SummaryCard label="Styles" value={filteredTotals.styles} />
            <SummaryCard label="Allocations" value={filteredTotals.productionAllocations} />
            <SummaryCard label="Linked Issue Qty" value={filteredTotals.linkedIssueQty} />
            {STAGES.map(stage => (
              <SummaryCard key={stage.key} label={stage.label} value={filteredTotals[stage.key]} />
            ))}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-slate-200 bg-slate-50 px-5 py-3">
              <h3 className="text-sm font-bold text-slate-800">Style Summary</h3>
              <p className="mt-0.5 text-xs text-slate-500">
                Quantities below are the allocations recorded within the selected reporting period. Each stage is independent.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-275 w-full text-xs">
                <thead>
                  <tr className="bg-slate-800 text-white">
                    <th className="w-8 px-2 py-2"></th>
                    <th className="px-3 py-2 text-left">Style</th>
                    <th className="px-3 py-2 text-left">Customer</th>
                    <th className="px-3 py-2 text-right">Jobs</th>
                    <th className="px-3 py-2 text-right">Linked Issue</th>
                    {STAGES.map(stage => (
                      <th key={stage.key} className="px-3 py-2 text-right">{stage.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStyleSummaries.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="px-4 py-10 text-center text-slate-400">
                        No production allocations found for the selected period and filters.
                      </td>
                    </tr>
                  ) : filteredStyleSummaries.map(summary => {
                    const key = `${summary.styleNo}|||${summary.customerName}`;
                    const expanded = expandedStyles.has(key);
                    const details = filteredAllocations.filter(r => r.styleNo === summary.styleNo && r.customerName === summary.customerName);
                    return (
                      <FragmentRow
                        key={key}
                        summary={summary}
                        details={details}
                        expanded={expanded}
                        onToggle={() => toggleStyle(key)}
                      />
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </motion.div>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-slate-600">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500"
      >
        <option value="">All</option>
        {options.map(option => <option key={option} value={option}>{option}</option>)}
      </select>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-xl font-black text-slate-800">{formatQty(value)}</p>
    </div>
  );
}

function FragmentRow({
  summary,
  details,
  expanded,
  onToggle,
}: {
  summary: StyleSummary;
  details: AllocationRow[];
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <tr className="cursor-pointer bg-white hover:bg-slate-50" onClick={onToggle}>
        <td className="px-2 py-3 text-center text-slate-400">
          {expanded ? <ChevronDown className="mx-auto h-4 w-4" /> : <ChevronRight className="mx-auto h-4 w-4" />}
        </td>
        <td className="px-3 py-3 font-black text-slate-900">{summary.styleNo}</td>
        <td className="px-3 py-3 text-slate-600">{summary.customerName}</td>
        <td className="px-3 py-3 text-right font-bold text-slate-700">{formatQty(summary.productionAllocations)}</td>
        <td className="px-3 py-3 text-right font-bold text-orange-600">{formatQty(summary.linkedIssueQty)}</td>
        {STAGES.map(stage => (
          <td key={stage.key} className="px-3 py-3 text-right font-semibold text-slate-700">
            {formatQty(summary[stage.key])}
          </td>
        ))}
      </tr>

      {expanded && details.map(row => (
        <tr key={row.productionRecordId} className="bg-slate-50/70 text-[11px] text-slate-600">
          <td></td>
          <td className="px-3 py-2 pl-6" colSpan={2}>
            <span className="font-bold text-slate-700">Cut {row.cutNo || '—'}</span>
            <span className="mx-2 text-slate-300">|</span>
            <span>{row.component || 'No component'}</span>
            <span className="mx-2 text-slate-300">|</span>
            <span>{row.firstEntryDate === row.lastEntryDate ? row.firstEntryDate : `${row.firstEntryDate} → ${row.lastEntryDate}`}</span>
          </td>
          <td className="px-3 py-2 text-right text-slate-400">{row.entryCount} entr{row.entryCount === 1 ? 'y' : 'ies'}</td>
          <td className="px-3 py-2 text-right font-bold text-orange-500">{formatQty(row.issueQty)}</td>
          {STAGES.map(stage => (
            <td key={stage.key} className="px-3 py-2 text-right">{formatQty(row[stage.key])}</td>
          ))}
        </tr>
      ))}
    </>
  );
}
