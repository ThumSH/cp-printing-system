import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, CheckCircle2, Printer, RefreshCw, RotateCcw, Save, Search } from 'lucide-react';
import { API, getAuthHeaders } from '../../api/client';

const WORKER_CUT_REPORT_API = `${API.BASE}/api/worker-cut-reports`;
const WORKER_CUT_REPORT_TITLE = 'STORE-IN CUT REPORT';
const WORKER_CUT_REPORT_LOGO_SRC = '/cp-logo.png';
const WORKER_CUT_REPORT_COMPANY = 'COLOUR PLUS PRINTING SYSTEMS (PVT) LTD';

type CutReportCheckField =
  | 'productionIn'
  | 'productionOut'
  | 'handedOverToQc'
  | 'checkingStatus'
  | 'curingStatus';

interface WorkerCutReportRow {
  bundleId: string;
  bundleNo: string;
  bundleQty: number;
  size: string;
  numberRange: string;
  bundleOrder?: number;
  productionIn: boolean;
  productionOut: boolean;
  handedOverToQc: boolean;
  checkingStatus: boolean;
  curingStatus: boolean;
}

interface WorkerCutReportSaved {
  id: string;
  storeInRecordId: string;
  productionRecordId: string;
  submissionId: string;
  revisionNo: number;
  styleNo: string;
  customerName: string;
  bodyColour: string;
  printColour: string;
  component: string;
  season: string;
  inAdNo: string;
  scheduleNo: string;
  jobNo: string;
  cutInDate: string;
  inQty: number;
  totalCutQty: number;
  cutNo: string;
  cutQty: number;
  bundleCount: number;
  reportDate: string;
  workerName: string;
  createdAt: string;
  updatedAt: string;
  rows: WorkerCutReportRow[];
}

type CutReportTickState = Record<string, Partial<Record<CutReportCheckField, boolean>>>;

const CUT_REPORT_CHECK_COLUMNS: { key: CutReportCheckField; label: string; printLabel: string }[] = [
  { key: 'productionIn', label: 'Production IN', printLabel: 'Production<br/>IN' },
  { key: 'productionOut', label: 'Production Out', printLabel: 'Production<br/>OUT' },
  { key: 'handedOverToQc', label: 'Handed over to QC department', printLabel: 'Handed Over<br/>to QC Dept.' },
  { key: 'checkingStatus', label: 'Checking status', printLabel: 'Checking<br/>Status' },
  { key: 'curingStatus', label: 'Curing status', printLabel: 'Curing<br/>Status' },
];

function getColomboDateString(): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Colombo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());

  const year = parts.find((p) => p.type === 'year')?.value ?? '';
  const month = parts.find((p) => p.type === 'month')?.value ?? '';
  const day = parts.find((p) => p.type === 'day')?.value ?? '';

  return `${year}-${month}-${day}`;
}

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatQty(value: unknown) {
  const parsed = typeof value === 'number' ? value : Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed.toLocaleString() : '';
}

function makeBundleKey(row: Pick<WorkerCutReportRow, 'bundleId' | 'bundleNo'>, index: number) {
  return `${row.bundleId || row.bundleNo || 'bundle'}_${index}`;
}

function tickStateFromReport(report: WorkerCutReportSaved): CutReportTickState {
  const next: CutReportTickState = {};

  (report.rows || []).forEach((row, index) => {
    const key = makeBundleKey(row, index);
    next[key] = {
      productionIn: !!row.productionIn,
      productionOut: !!row.productionOut,
      handedOverToQc: !!row.handedOverToQc,
      checkingStatus: !!row.checkingStatus,
      curingStatus: !!row.curingStatus,
    };
  });

  return next;
}

function rowsWithTicks(report: WorkerCutReportSaved, tickState: CutReportTickState): WorkerCutReportRow[] {
  return (report.rows || []).map((row, index) => {
    const key = makeBundleKey(row, index);
    const ticks = tickState[key] || {};

    return {
      ...row,
      bundleOrder: row.bundleOrder || index + 1,
      productionIn: !!ticks.productionIn,
      productionOut: !!ticks.productionOut,
      handedOverToQc: !!ticks.handedOverToQc,
      checkingStatus: !!ticks.checkingStatus,
      curingStatus: !!ticks.curingStatus,
    };
  });
}

function buildSavePayload(report: WorkerCutReportSaved, tickState: CutReportTickState) {
  return {
    storeInRecordId: report.storeInRecordId || '',
    productionRecordId: report.productionRecordId || '',
    submissionId: report.submissionId || '',
    revisionNo: report.revisionNo || 1,
    styleNo: report.styleNo || '',
    customerName: report.customerName || '',
    bodyColour: report.bodyColour || '',
    printColour: report.printColour || '',
    component: report.component || '',
    season: report.season || '',
    inAdNo: report.inAdNo || '',
    scheduleNo: report.scheduleNo || '',
    jobNo: report.jobNo || '',
    cutInDate: report.cutInDate || '',
    inQty: report.inQty || 0,
    totalCutQty: report.totalCutQty || 0,
    cutNo: report.cutNo || '',
    cutQty: report.cutQty || 0,
    bundleCount: report.bundleCount || (report.rows || []).length,
    reportDate: report.reportDate || getColomboDateString(),
    workerName: report.workerName || localStorage.getItem('operatorName') || '',
    rows: rowsWithTicks(report, tickState),
  };
}

function printSavedWorkerCutReport(report: WorkerCutReportSaved, tickState: CutReportTickState) {
  const rows = rowsWithTicks(report, tickState);
  const colourText = [report.bodyColour, report.printColour]
    .map(value => String(value || '').trim())
    .filter(Boolean)
    .join(' / ');

  const checkHeaders = CUT_REPORT_CHECK_COLUMNS
    .map(column => `<th class="check-head">${column.printLabel}</th>`)
    .join('');

  const bundleRowsHtml = rows.map((row) => {
    const checkCells = CUT_REPORT_CHECK_COLUMNS.map((column) => {
      const checked = row[column.key] === true;
      return `<td class="check-cell"><span class="box">${checked ? '✓' : ''}</span></td>`;
    }).join('');

    return `
      <tr>
        <td>${escapeHtml(row.bundleNo)}</td>
        <td class="num">${formatQty(row.bundleQty)}</td>
        <td>${escapeHtml(row.size)}</td>
        <td>${escapeHtml(row.numberRange || '-')}</td>
        ${checkCells}
      </tr>
    `;
  }).join('') || `
      <tr>
        <td colspan="9" class="center muted">No bundle details found for this saved report.</td>
      </tr>
    `;

  const html = `<!DOCTYPE html>
<html>
<head>
  <title>${escapeHtml(WORKER_CUT_REPORT_TITLE)} - ${escapeHtml(report.styleNo)}</title>
  <style>
    @page { size: A4 portrait; margin: 10mm; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: Arial, Helvetica, sans-serif; color: #111827; font-size: 10px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
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
    .cut-title { display: flex; justify-content: space-between; align-items: end; margin: 10px 0 4px; }
    .cut-title h3 { margin: 0; font-size: 13px; font-weight: 900; color: #1e293b; }
    .cut-index { display: block; font-size: 9px; text-transform: uppercase; color: #64748b; font-weight: 800; letter-spacing: .08em; }
    .cut-qty { font-size: 11px; color: #334155; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    th, td { border: 1px solid #334155; padding: 4px 5px; text-align: left; vertical-align: middle; height: 24px; }
    th { background: #f1f5f9; color: #334155; font-size: 8px; text-transform: uppercase; font-weight: 900; }
    .num { text-align: right; font-weight: 800; }
    .check-head { text-align: center; line-height: 1.15; }
    .check-cell { text-align: center; width: 72px; }
    .box { display: inline-flex; width: 13px; height: 13px; border: 1.5px solid #111827; align-items: center; justify-content: center; font-size: 11px; line-height: 1; font-weight: 900; }
    .center { text-align: center; }
    .muted { color: #64748b; }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo"><img src="${escapeHtml(WORKER_CUT_REPORT_LOGO_SRC)}" onerror="this.style.display='none'; this.parentElement.innerHTML='CP<br/>LOGO';" /></div>
    <div class="title">
      <div class="company">${escapeHtml(WORKER_CUT_REPORT_COMPANY)}</div>
      <div class="report-title">${escapeHtml(WORKER_CUT_REPORT_TITLE)}</div>
    </div>
    <div class="generated">Generated<br/>${escapeHtml(new Date().toLocaleString())}</div>
  </div>

  <div class="meta">
    <div class="label">Style No</div><div class="value">${escapeHtml(report.styleNo)}</div>
    <div class="label">Customer</div><div class="value">${escapeHtml(report.customerName)}</div>
    <div class="label">Revision</div><div class="value">${escapeHtml(report.revisionNo)}</div>
    <div class="label">Component</div><div class="value">${escapeHtml(report.component)}</div>
    <div class="label">IN-AD No</div><div class="value">${escapeHtml(report.inAdNo || '-')}</div>
    <div class="label">Schedule</div><div class="value">${escapeHtml(report.scheduleNo || '-')}</div>
    <div class="label">Job No</div><div class="value">${escapeHtml(report.jobNo || '-')}</div>
    <div class="label">Date</div><div class="value">${escapeHtml(report.cutInDate || '-')}</div>
    <div class="label">Colour</div><div class="value">${escapeHtml(colourText || '-')}</div>
    <div class="label">Season</div><div class="value">${escapeHtml(report.season || '-')}</div>
  </div>

  <div class="summary">
    <div class="summary-card"><div class="small">IN Qty</div><div class="big">${formatQty(report.inQty)}</div></div>
    <div class="summary-card"><div class="small">Total Cut Qty</div><div class="big">${formatQty(report.totalCutQty)}</div></div>
    <div class="summary-card"><div class="small">Cut Qty</div><div class="big">${formatQty(report.cutQty)}</div></div>
    <div class="summary-card"><div class="small">Bundles</div><div class="big">${formatQty(rows.length)}</div></div>
  </div>

  <div class="cut-title">
    <div>
      <span class="cut-index">Saved Cut</span>
      <h3>${escapeHtml(report.cutNo || '-')}</h3>
    </div>
    <div class="cut-qty">Qty: <strong>${formatQty(report.cutQty)}</strong></div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Bundle</th>
        <th>Qty</th>
        <th>Size</th>
        <th>Range</th>
        ${checkHeaders}
      </tr>
    </thead>
    <tbody>${bundleRowsHtml}</tbody>
  </table>
</body>
</html>`;

  const oldFrame = document.getElementById('worker-cut-report-search-print-frame') as HTMLIFrameElement | null;
  if (oldFrame) oldFrame.remove();

  const frame = document.createElement('iframe');
  frame.id = 'worker-cut-report-search-print-frame';
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

export default function WorkerCutReportSearchPage() {
  const [reports, setReports] = useState<WorkerCutReportSaved[]>([]);
  const [selectedReport, setSelectedReport] = useState<WorkerCutReportSaved | null>(null);
  const [tickState, setTickState] = useState<CutReportTickState>({});
  const [dateFrom, setDateFrom] = useState(getColomboDateString());
  const [dateTo, setDateTo] = useState(getColomboDateString());
  const [styleNo, setStyleNo] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [cutNo, setCutNo] = useState('');
  const [inAdNo, setInAdNo] = useState('');
  const [scheduleNo, setScheduleNo] = useState('');
  const [jobNo, setJobNo] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [pageError, setPageError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const loadReports = async () => {
    setIsLoading(true);
    setPageError('');

    try {
      // Load saved reports independently from active production. Filtering is done
      // on this page so dropdown values do not disappear while the user is selecting filters.
      const response = await fetch(WORKER_CUT_REPORT_API, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(await response.text() || 'Failed to load worker cut reports.');
      }

      const data: WorkerCutReportSaved[] = await response.json();
      setReports(Array.isArray(data) ? data : []);
    } catch (error) {
      setReports([]);
      setPageError(error instanceof Error ? error.message : 'Failed to load worker cut reports.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getFilterOptions = (field: keyof WorkerCutReportSaved) => {
    return Array.from(new Set(
      reports
        .map(report => String(report[field] ?? '').trim())
        .filter(Boolean)
    )).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  };

  const styleOptions = useMemo(() => getFilterOptions('styleNo'), [reports]);
  const customerOptions = useMemo(() => getFilterOptions('customerName'), [reports]);
  const cutOptions = useMemo(() => getFilterOptions('cutNo'), [reports]);
  const inAdOptions = useMemo(() => getFilterOptions('inAdNo'), [reports]);
  const scheduleOptions = useMemo(() => getFilterOptions('scheduleNo'), [reports]);
  const jobOptions = useMemo(() => getFilterOptions('jobNo'), [reports]);

  const filteredReports = useMemo(() => {
    let list = reports.slice();

    if (dateFrom) list = list.filter(report => (report.reportDate || '') >= dateFrom);
    if (dateTo) list = list.filter(report => (report.reportDate || '') <= dateTo);
    if (styleNo) list = list.filter(report => report.styleNo === styleNo);
    if (customerName) list = list.filter(report => report.customerName === customerName);
    if (cutNo) list = list.filter(report => report.cutNo === cutNo);
    if (inAdNo) list = list.filter(report => report.inAdNo === inAdNo);
    if (scheduleNo) list = list.filter(report => report.scheduleNo === scheduleNo);
    if (jobNo) list = list.filter(report => report.jobNo === jobNo);

    return list;
  }, [reports, dateFrom, dateTo, styleNo, customerName, cutNo, inAdNo, scheduleNo, jobNo]);

  const openReport = (report: WorkerCutReportSaved) => {
    setSelectedReport(report);
    setTickState(tickStateFromReport(report));
    setSuccessMsg('');
    setPageError('');
    // Do not force scroll-to-top here. Keeping the current scroll position avoids
    // the page jumping back to the default stage when the same action is clicked.
  };

  const closeSelectedReport = () => {
    setSelectedReport(null);
    setTickState({});
  };

  const toggleTick = (bundleKey: string, field: CutReportCheckField) => {
    setTickState(prev => ({
      ...prev,
      [bundleKey]: {
        ...(prev[bundleKey] || {}),
        [field]: !prev[bundleKey]?.[field],
      },
    }));
  };

  const saveSelectedReport = async () => {
    if (!selectedReport) return;

    setIsSaving(true);
    setPageError('');
    setSuccessMsg('');

    try {
      const response = await fetch(`${WORKER_CUT_REPORT_API}/${selectedReport.id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(buildSavePayload(selectedReport, tickState)),
      });

      if (!response.ok) {
        throw new Error(await response.text() || 'Failed to update saved cut report.');
      }

      const saved: WorkerCutReportSaved = await response.json();
      setSelectedReport(saved);
      setTickState(tickStateFromReport(saved));
      setSuccessMsg('Saved cut report updated successfully.');
      window.setTimeout(() => setSuccessMsg(''), 5000);
      await loadReports();
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Failed to update saved cut report.');
    } finally {
      setIsSaving(false);
    }
  };

  const clearFilters = () => {
    setDateFrom('');
    setDateTo('');
    setStyleNo('');
    setCustomerName('');
    setCutNo('');
    setInAdNo('');
    setScheduleNo('');
    setJobNo('');
  };

  const selectedRows = useMemo(() => {
    if (!selectedReport) return [];
    return rowsWithTicks(selectedReport, tickState);
  }, [selectedReport, tickState]);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-7xl space-y-6 pb-12">
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-teal-100 p-2"><Search className="h-6 w-6 text-teal-700" /></div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Worker Cut Reports</h2>
            <p className="text-sm text-slate-500">Search saved worker cut reports, continue ticking process statuses, and print.</p>
          </div>
        </div>
        <button type="button" onClick={loadReports} disabled={isLoading} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} /> Refresh Data
        </button>
      </div>

      {pageError && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600"><AlertCircle className="mr-1 inline h-4 w-4" />{pageError}</div>}
      {successMsg && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700"><CheckCircle2 className="mr-1 inline h-4 w-4" />{successMsg}</div>}

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Filters</p>
            <p className="text-sm text-slate-500">Saved reports are independent from active production, so completed cuts can still be fetched here.</p>
          </div>
          <button type="button" onClick={clearFilters} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100">
            <RotateCcw className="h-3.5 w-3.5" /> Clear
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <FilterInput label="Date From" type="date" value={dateFrom} onChange={setDateFrom} />
          <FilterInput label="Date To" type="date" value={dateTo} onChange={setDateTo} />
          <FilterSelect label="Style No" value={styleNo} onChange={setStyleNo} options={styleOptions} allLabel="All Styles" />
          <FilterSelect label="Customer" value={customerName} onChange={setCustomerName} options={customerOptions} allLabel="All Customers" />
          <FilterSelect label="Cut No" value={cutNo} onChange={setCutNo} options={cutOptions} allLabel="All Cuts" />
          <FilterSelect label="IN-AD No" value={inAdNo} onChange={setInAdNo} options={inAdOptions} allLabel="All IN-AD Nos" />
          <FilterSelect label="Schedule No" value={scheduleNo} onChange={setScheduleNo} options={scheduleOptions} allLabel="All Schedules" />
          <FilterSelect label="Job No" value={jobNo} onChange={setJobNo} options={jobOptions} allLabel="All Jobs" />
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-3">
          <p className="text-sm font-bold text-slate-700">{filteredReports.length} saved cut report{filteredReports.length !== 1 ? 's' : ''} found</p>
        </div>

        {isLoading ? (
          <div className="flex items-center gap-2 px-5 py-8 text-sm text-slate-500"><RefreshCw className="h-4 w-4 animate-spin" /> Loading reports...</div>
        ) : filteredReports.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-slate-400">No saved cut reports found for the selected filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                  <th className="px-3 py-2 text-left">Date</th>
                  <th className="px-3 py-2 text-left">Style / Customer</th>
                  <th className="px-3 py-2 text-left">Cut / Component</th>
                  <th className="px-3 py-2 text-left">IN-AD / Schedule</th>
                  <th className="px-3 py-2 text-left">Job</th>
                  <th className="px-3 py-2 text-right">Bundles</th>
                  <th className="px-3 py-2 text-left">Updated</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredReports.map(report => (
                  <tr key={report.id} className={selectedReport?.id === report.id ? 'bg-teal-50/60' : 'hover:bg-slate-50'}>
                    <td className="px-3 py-2 font-semibold text-slate-700">{report.reportDate || '-'}</td>
                    <td className="px-3 py-2"><div className="font-bold text-slate-800">{report.styleNo}</div><div className="text-slate-500">{report.customerName}</div></td>
                    <td className="px-3 py-2"><div className="font-bold text-slate-800">{report.cutNo}</div><div className="text-slate-500">{report.component || '-'}</div></td>
                    <td className="px-3 py-2"><div className="font-bold text-slate-800">{report.inAdNo || '-'}</div><div className="text-slate-500">Sch: {report.scheduleNo || '-'}</div></td>
                    <td className="px-3 py-2 text-slate-600">{report.jobNo || '-'}</td>
                    <td className="px-3 py-2 text-right font-bold text-slate-800">{formatQty(report.bundleCount)}</td>
                    <td className="px-3 py-2 text-slate-500">{report.updatedAt || report.createdAt || '-'}</td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => openReport(report)} className="rounded-lg bg-slate-800 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-slate-700">Open / Edit</button>
                        <button type="button" onClick={() => printSavedWorkerCutReport(report, tickStateFromReport(report))} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50">Print</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedReport && (
        <div className="rounded-xl border border-teal-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-sm font-black text-slate-900">Editing: {selectedReport.styleNo} / {selectedReport.cutNo}</h3>
              <p className="mt-1 text-xs text-slate-500">
                {selectedReport.customerName} · {selectedReport.component || '-'} · IN-AD {selectedReport.inAdNo || '-'} · Sch {selectedReport.scheduleNo || '-'} · Job {selectedReport.jobNo || '-'}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={saveSelectedReport} disabled={isSaving} className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50">
                <Save className="h-4 w-4" /> {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
              <button type="button" onClick={() => printSavedWorkerCutReport(selectedReport, tickState)} className="inline-flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">
                <Printer className="h-4 w-4" /> Print
              </button>
              <button type="button" onClick={closeSelectedReport} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                Close
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 border-b border-slate-100 bg-slate-50/60 px-5 py-4 md:grid-cols-4">
            <InfoCard label="Report Date" value={selectedReport.reportDate || '-'} sub={`Updated: ${selectedReport.updatedAt || '-'}`} />
            <InfoCard label="Colour" value={[selectedReport.bodyColour, selectedReport.printColour].filter(Boolean).join(' / ') || '-'} sub={`Season: ${selectedReport.season || '-'}`} />
            <InfoCard label="Cut Qty" value={formatQty(selectedReport.cutQty)} sub={`${formatQty(selectedReport.bundleCount)} bundles`} />
            <InfoCard label="Worker" value={selectedReport.workerName || '-'} sub={`Created: ${selectedReport.createdAt || '-'}`} />
          </div>

          <div className="overflow-x-auto p-5">
            <table className="min-w-275 w-full text-xs">
              <thead>
                <tr className="bg-slate-800 text-white">
                  <th className="px-3 py-2 text-left font-bold">Bundle</th>
                  <th className="px-3 py-2 text-right font-bold">Qty</th>
                  <th className="px-3 py-2 text-left font-bold">Size</th>
                  <th className="px-3 py-2 text-left font-bold">Range</th>
                  {CUT_REPORT_CHECK_COLUMNS.map(column => (
                    <th key={column.key} className="px-3 py-2 text-center font-bold">{column.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {selectedRows.length === 0 ? (
                  <tr><td colSpan={9} className="px-3 py-8 text-center text-slate-400">No bundle rows found in this saved report.</td></tr>
                ) : selectedRows.map((row, index) => {
                  const key = makeBundleKey(row, index);
                  return (
                    <tr key={key} className="hover:bg-slate-50">
                      <td className="px-3 py-2 font-semibold text-slate-800">{row.bundleNo}</td>
                      <td className="px-3 py-2 text-right font-bold text-slate-800">{formatQty(row.bundleQty)}</td>
                      <td className="px-3 py-2 text-slate-700">{row.size}</td>
                      <td className="px-3 py-2 text-slate-500">{row.numberRange || '-'}</td>
                      {CUT_REPORT_CHECK_COLUMNS.map(column => (
                        <td key={column.key} className="px-3 py-2 text-center">
                          <input
                            type="checkbox"
                            checked={tickState[key]?.[column.key] === true}
                            onChange={() => toggleTick(key, column.key)}
                            className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                          />
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </motion.div>
  );
}

function InfoCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-black text-slate-800">{value}</p>
      {sub && <p className="text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

function FilterInput({
  label,
  value,
  onChange,
  type = 'text',
  placeholder = '',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500"
      />
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
  allLabel,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  allLabel: string;
}) {
  return (
    <div>
      <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</label>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500"
      >
        <option value="">{allLabel}</option>
        {options.map(option => <option key={option} value={option}>{option}</option>)}
      </select>
    </div>
  );
}
