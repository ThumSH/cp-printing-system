import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertCircle,
  ChevronDown,
  ChevronRight,
  FileSpreadsheet,
  Filter,
  Printer,
  RefreshCw,
  RotateCcw,
  Search,
} from 'lucide-react';

import { API, getAuthHeaders } from '../../api/client';

const COMPANY_LOGO_SRC = '/cp-logo.png';
const COMPANY_NAME = 'COLOUR PLUS PRINTING SYSTEMS (PVT) LTD';
const REPORT_TITLE = 'RECONCILIATION REPORT';

interface ReconciliationReportTotals {
  receivedQty: number;
  sentTotal: number;
  pdTotal: number;
  fdTotal: number;
  sampleTestingTotal: number;
  rtnTotal: number;
  goodQtyTotal: number;
}

interface ReconciliationSavedRow {
  receivedDate: string;
  receivedAdNo: string;
  receivedCutNo: string;
  receivedQty: number | null;
  receivedRunningTotal: number | null;

  sentDate: string;
  sentAdNo: string;
  sentCutNo: string;
  sentTotal: number | null;
  pd: number | null;
  fd: number | null;
  sampleTesting: number | null;
  rtn: number | null;
  goodQty: number | null;
  goodTotal: number | null;
}

interface ReconciliationSavedReport {
  id: string;
  customerName: string;
  styleNo: string;
  component: string;
  scheduleNo: string;
  jobNos: string;
  colour: string;
  reportDate: string;
  createdAt: string;
  updatedAt: string;
  totals: ReconciliationReportTotals;
  rows: ReconciliationSavedRow[];
}

function uniq(values: string[]) {
  return Array.from(new Set(values.map(v => (v || '').trim()).filter(Boolean))).sort();
}

function getJobNoValues(value?: string) {
  return (value || '')
    .split(',')
    .map(v => v.trim())
    .filter(Boolean);
}

function hasJobNo(report: ReconciliationSavedReport, jobNo: string) {
  if (!jobNo) return true;
  return getJobNoValues(report.jobNos).some(value => value.toLowerCase() === jobNo.toLowerCase());
}

function formatQty(value?: number | null) {
  if (value === undefined || value === null) return '';
  return value.toLocaleString();
}

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function printSavedReport(report: ReconciliationSavedReport) {
  const rowHtml = (report.rows || []).map(row => `<tr>
    <td>${escapeHtml(row.receivedDate)}</td>
    <td>${escapeHtml(row.receivedAdNo)}</td>
    <td>${escapeHtml(row.receivedCutNo)}</td>
    <td class="num">${formatQty(row.receivedQty)}</td>
    <td class="num bold">${formatQty(row.receivedRunningTotal)}</td>

    <td>${escapeHtml(row.sentDate)}</td>
    <td>${escapeHtml(row.sentAdNo)}</td>
    <td>${escapeHtml(row.sentCutNo)}</td>
    <td class="num">${formatQty(row.sentTotal)}</td>
    <td class="num">${formatQty(row.pd)}</td>
    <td class="num">${formatQty(row.fd)}</td>
    <td class="num">${formatQty(row.sampleTesting)}</td>
    <td class="num">${formatQty(row.rtn)}</td>
    <td class="num bold">${formatQty(row.goodQty)}</td>
    <td class="num bold">${formatQty(row.goodTotal)}</td>
  </tr>`).join('') || `<tr><td colspan="15" class="center">No rows found.</td></tr>`;

  const html = `<!DOCTYPE html>
<html>
<head>
  <title>${escapeHtml(REPORT_TITLE)} - ${escapeHtml(report.styleNo)}</title>
  <style>
    @page { size: A4 landscape; margin: 8mm; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: Arial, Helvetica, sans-serif; color: #111; font-size: 9px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .header { display: flex; justify-content: center; align-items: center; gap: 16px; margin-bottom: 8px; }
    .logo-box { width: 62px; height: 48px; border: 1px solid #222; display: flex; align-items: center; justify-content: center; font-size: 9px; font-weight: 800; text-align: center; line-height: 1.1; }
    .logo-box img { max-width: 100%; max-height: 100%; object-fit: contain; }
    .title { text-align: left; line-height: 1.25; }
    .title .company { font-size: 13px; font-weight: 800; letter-spacing: .02em; }
    .title .report { font-size: 13px; font-weight: 800; text-transform: uppercase; }
    .meta { display: grid; grid-template-columns: 80px 220px 70px 180px 90px 1fr; gap: 4px 8px; margin: 10px 0 8px; font-size: 9px; align-items: end; }
    .label { font-weight: 700; text-transform: uppercase; }
    .value { border-bottom: 1px solid #444; min-height: 14px; padding: 1px 3px; font-weight: 700; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; border: 1px solid #111; }
    th, td { border: 1px solid #222; padding: 3px 4px; vertical-align: middle; overflow-wrap: anywhere; }
    th { text-align: center; font-weight: 900; text-transform: uppercase; background: #efefef; font-size: 8px; }
    .section { background: #e6e6e6; font-size: 9px; letter-spacing: .02em; }
    .num { text-align: right; }
    .center { text-align: center; }
    .bold { font-weight: 900; }
    tfoot td { font-weight: 900; background: #f4f4f4; }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo-box"><img src="${escapeHtml(COMPANY_LOGO_SRC)}" onerror="this.style.display='none'; this.parentElement.innerHTML='CP<br/>LOGO';" /></div>
    <div class="title"><div class="company">${escapeHtml(COMPANY_NAME)}</div><div class="report">${escapeHtml(REPORT_TITLE)}</div></div>
  </div>

  <div class="meta">
    <div class="label">Customer</div><div class="value">${escapeHtml(report.customerName)}</div>
    <div class="label">Colour</div><div class="value">${escapeHtml(report.colour)}</div>
    <div class="label">Component</div><div class="value">${escapeHtml(report.component)}</div>
    <div class="label">Style No</div><div class="value">${escapeHtml(report.styleNo)}</div>
    <div class="label">Schedule No</div><div class="value">${escapeHtml(report.scheduleNo || '(No Schedule)')}</div>
    <div class="label">Job No(s)</div><div class="value">${escapeHtml(report.jobNos || '-')}</div>
  </div>

  <table>
    <thead>
      <tr><th class="section" colspan="5">Received Details</th><th class="section" colspan="10">Sent Details</th></tr>
      <tr>
        <th>Date</th><th>Store-In AD No</th><th>Cut No</th><th>Qty</th><th>Total</th>
        <th>Date</th><th>Gatepass AD No</th><th>Cut No</th><th>Total</th><th>PD</th><th>FD</th><th>Sample / Testing</th><th>RTN</th><th>Good Qty</th><th>Good Total</th>
      </tr>
    </thead>
    <tbody>${rowHtml}</tbody>
    <tfoot>
      <tr>
        <td colspan="3" class="num">TOTAL</td><td class="num">${formatQty(report.totals.receivedQty)}</td><td></td>
        <td colspan="3" class="num">TOTAL</td><td class="num">${formatQty(report.totals.sentTotal)}</td><td class="num">${formatQty(report.totals.pdTotal)}</td><td class="num">${formatQty(report.totals.fdTotal)}</td><td class="num">${formatQty(report.totals.sampleTestingTotal)}</td><td class="num">${formatQty(report.totals.rtnTotal)}</td><td class="num">${formatQty(report.totals.goodQtyTotal)}</td><td></td>
      </tr>
    </tfoot>
  </table>
</body>
</html>`;

  const oldFrame = document.getElementById('reconciliation-search-print-frame') as HTMLIFrameElement | null;
  if (oldFrame) oldFrame.remove();

  const frame = document.createElement('iframe');
  frame.id = 'reconciliation-search-print-frame';
  frame.style.cssText = 'position:fixed;top:-10000px;left:-10000px;width:1600px;height:1000px;';
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

export default function ReconciliationReportSearchPage() {
  const [reports, setReports] = useState<ReconciliationSavedReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [filterCustomer, setFilterCustomer] = useState('');
  const [filterStyle, setFilterStyle] = useState('');
  const [filterComponent, setFilterComponent] = useState('');
  const [filterJobNo, setFilterJobNo] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  const loadReports = async () => {
    setLoading(true);
    setPageError('');
    try {
      const res = await fetch(`${API.BASE}/api/reconciliation/saved`, {
        headers: getAuthHeaders(),
      });

      if (!res.ok) throw new Error(await res.text() || 'Failed to fetch saved reconciliation reports.');

      const data: ReconciliationSavedReport[] = await res.json();
      setReports(data || []);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Failed to load saved reports.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const customers = useMemo(() => uniq(reports.map(report => report.customerName)), [reports]);

  const styles = useMemo(() => {
    let scoped = reports;
    if (filterCustomer) scoped = scoped.filter(report => report.customerName === filterCustomer);
    return uniq(scoped.map(report => report.styleNo));
  }, [reports, filterCustomer]);

  const components = useMemo(() => {
    let scoped = reports;
    if (filterCustomer) scoped = scoped.filter(report => report.customerName === filterCustomer);
    if (filterStyle) scoped = scoped.filter(report => report.styleNo === filterStyle);
    return uniq(scoped.map(report => report.component));
  }, [reports, filterCustomer, filterStyle]);

  const jobNos = useMemo(() => {
    let scoped = reports;
    if (filterCustomer) scoped = scoped.filter(report => report.customerName === filterCustomer);
    if (filterStyle) scoped = scoped.filter(report => report.styleNo === filterStyle);
    if (filterComponent) scoped = scoped.filter(report => report.component === filterComponent);

    const values: string[] = [];
    scoped.forEach(report => {
      values.push(...getJobNoValues(report.jobNos));
    });

    return uniq(values);
  }, [reports, filterCustomer, filterStyle, filterComponent]);

  const hasFilters = !!(filterCustomer || filterStyle || filterComponent || filterJobNo || filterDateFrom || filterDateTo);

  const filteredReports = useMemo(() => {
    let list = reports.slice();

    if (filterCustomer) list = list.filter(report => report.customerName === filterCustomer);
    if (filterStyle) list = list.filter(report => report.styleNo === filterStyle);
    if (filterComponent) list = list.filter(report => report.component === filterComponent);
    if (filterJobNo) list = list.filter(report => hasJobNo(report, filterJobNo));
    if (filterDateFrom) list = list.filter(report => report.reportDate >= filterDateFrom);
    if (filterDateTo) list = list.filter(report => report.reportDate <= filterDateTo);

    return list;
  }, [reports, filterCustomer, filterStyle, filterComponent, filterJobNo, filterDateFrom, filterDateTo]);

  const clearFilters = () => {
    setFilterCustomer('');
    setFilterStyle('');
    setFilterComponent('');
    setFilterJobNo('');
    setFilterDateFrom('');
    setFilterDateTo('');
    setExpandedId(null);
  };

  const activeFilterCount = [filterCustomer, filterStyle, filterComponent, filterJobNo, filterDateFrom, filterDateTo].filter(Boolean).length;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-7xl space-y-6 pb-12">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div className="flex items-center space-x-3">
          <div className="rounded-lg bg-cyan-100 p-2"><Search className="h-6 w-6 text-cyan-700" /></div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Reconciliation Report Search</h2>
            <p className="text-sm text-slate-500">Search saved reconciliation reports by customer, style, component, job no, and saved date.</p>
          </div>
        </div>
        <button type="button" onClick={loadReports} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      {pageError && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600"><AlertCircle className="mr-1 inline h-4 w-4" />{pageError}</div>}

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-500" />
            <h3 className="text-sm font-bold text-slate-700">Filters</h3>
            {activeFilterCount > 0 && <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">{activeFilterCount} active</span>}
          </div>
          <button type="button" onClick={clearFilters} className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${hasFilters ? 'bg-red-50 border border-red-200 text-red-700 hover:bg-red-100' : 'bg-slate-50 border border-slate-200 text-slate-400 cursor-default'}`}>
            <RotateCcw className="h-3.5 w-3.5" /> Clear All
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-600">Customer</label>
            <select value={filterCustomer} onChange={e => { setFilterCustomer(e.target.value); setFilterStyle(''); setFilterComponent(''); setFilterJobNo(''); }} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-cyan-500">
              <option value="">All Customers</option>
              {customers.map(customer => <option key={customer} value={customer}>{customer}</option>)}
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-600">Style No</label>
            <select value={filterStyle} onChange={e => { setFilterStyle(e.target.value); setFilterComponent(''); setFilterJobNo(''); }} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-cyan-500">
              <option value="">All Styles</option>
              {styles.map(style => <option key={style} value={style}>{style}</option>)}
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-600">Component</label>
            <select value={filterComponent} onChange={e => { setFilterComponent(e.target.value); setFilterJobNo(''); }} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-cyan-500">
              <option value="">All Components</option>
              {components.map(component => <option key={component} value={component}>{component}</option>)}
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-600">Job No</label>
            <select value={filterJobNo} onChange={e => setFilterJobNo(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-cyan-500">
              <option value="">All Job Nos</option>
              {jobNos.map(jobNo => <option key={jobNo} value={jobNo}>{jobNo}</option>)}
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-600">Date From</label>
            <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-cyan-500" />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-600">Date To</label>
            <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-cyan-500" />
          </div>
        </div>
      </div>

      {!hasFilters && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 py-14 text-center">
          <FileSpreadsheet className="mx-auto mb-3 h-12 w-12 text-slate-300" />
          <p className="text-sm font-medium text-slate-500">Use filters to search saved reconciliation reports.</p>
          <p className="mt-1 text-xs text-slate-400">Customer, style, component, job no, and date range can be used together.</p>
        </div>
      )}

      {hasFilters && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-slate-200 bg-slate-50 px-6 py-3">
            <p className="text-sm font-medium text-slate-700">{filteredReports.length} saved report{filteredReports.length !== 1 ? 's' : ''} found</p>
          </div>

          {loading ? (
            <div className="py-16 text-center text-slate-400">Loading...</div>
          ) : filteredReports.length === 0 ? (
            <div className="py-16 text-center text-slate-400">No saved reports match these filters.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredReports.map(report => {
                const isExpanded = expandedId === report.id;

                return (
                  <div key={report.id}>
                    <div className="flex cursor-pointer items-center gap-4 px-6 py-4 transition-colors hover:bg-slate-50" onClick={() => setExpandedId(isExpanded ? null : report.id)}>
                      {isExpanded ? <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" /> : <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-bold text-slate-900">{report.styleNo}</p>
                          <span className="text-xs text-slate-500">{report.customerName}</span>
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">{report.component}</span>
                          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">{report.scheduleNo || 'No Schedule'}</span>
                          {report.jobNos && (
                            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">Job: {report.jobNos}</span>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-slate-500">Saved Date: {report.reportDate} | Colour: {report.colour || '-'}{report.jobNos ? ' | Job No(s): ' + report.jobNos : ''}</p>
                      </div>
                      <div className="shrink-0 text-right text-xs">
                        <div>Received: <span className="font-bold text-slate-800">{formatQty(report.totals.receivedQty)}</span></div>
                        <div>Good Qty: <span className="font-bold text-emerald-700">{formatQty(report.totals.goodQtyTotal)}</span></div>
                      </div>
                    </div>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden border-t border-slate-100 bg-slate-50/50 px-6 py-4">
                          <div className="mb-3 flex items-center justify-between">
                            <div>
                              <h4 className="font-bold text-slate-700">Saved Report Details</h4>
                              <p className="text-[11px] text-slate-400">Received AD No = Store-In IN-AD No · Sent AD No = Gatepass bill AD No{report.jobNos ? ' · Job No(s): ' + report.jobNos : ''}</p>
                            </div>
                            <button type="button" onClick={() => printSavedReport(report)} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700">
                              <Printer className="h-3.5 w-3.5" /> Print Report
                            </button>
                          </div>

                          <div className="overflow-x-auto">
                            <table className="w-max min-w-full border-collapse text-xs">
                              <thead>
                                <tr>
                                  <th colSpan={5} className="border border-slate-300 bg-slate-100 px-2 py-2 text-center text-[11px] font-black uppercase text-slate-700">Received Details</th>
                                  <th colSpan={10} className="border border-slate-300 bg-slate-100 px-2 py-2 text-center text-[11px] font-black uppercase text-slate-700">Sent Details</th>
                                </tr>
                                <tr className="bg-white text-[10px] uppercase tracking-wide text-slate-500">
                                  <th className="border border-slate-300 px-2 py-2">Date</th><th className="border border-slate-300 px-2 py-2">Store-In AD No</th><th className="border border-slate-300 px-2 py-2">Cut No</th><th className="border border-slate-300 px-2 py-2 text-right">Qty</th><th className="border border-slate-300 px-2 py-2 text-right">Total</th>
                                  <th className="border border-slate-300 px-2 py-2">Date</th><th className="border border-slate-300 px-2 py-2">Gatepass AD No</th><th className="border border-slate-300 px-2 py-2">Cut No</th><th className="border border-slate-300 px-2 py-2 text-right">Total</th><th className="border border-slate-300 px-2 py-2 text-right">PD</th><th className="border border-slate-300 px-2 py-2 text-right">FD</th><th className="border border-slate-300 px-2 py-2 text-right">Sample/Testing</th><th className="border border-slate-300 px-2 py-2 text-right">RTN</th><th className="border border-slate-300 px-2 py-2 text-right">Good Qty</th><th className="border border-slate-300 px-2 py-2 text-right">Good Total</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(report.rows || []).map((row, index) => (
                                  <tr key={index} className="bg-white hover:bg-slate-50">
                                    <td className="border border-slate-200 px-2 py-1.5">{row.receivedDate}</td><td className="border border-slate-200 px-2 py-1.5 font-medium">{row.receivedAdNo}</td><td className="border border-slate-200 px-2 py-1.5">{row.receivedCutNo}</td><td className="border border-slate-200 px-2 py-1.5 text-right font-medium">{formatQty(row.receivedQty)}</td><td className="border border-slate-200 px-2 py-1.5 text-right font-black">{formatQty(row.receivedRunningTotal)}</td>
                                    <td className="border border-slate-200 px-2 py-1.5">{row.sentDate}</td><td className="border border-slate-200 px-2 py-1.5 font-medium">{row.sentAdNo}</td><td className="border border-slate-200 px-2 py-1.5">{row.sentCutNo}</td><td className="border border-slate-200 px-2 py-1.5 text-right font-medium">{formatQty(row.sentTotal)}</td><td className="border border-slate-200 px-2 py-1.5 text-right text-red-700">{formatQty(row.pd)}</td><td className="border border-slate-200 px-2 py-1.5 text-right text-amber-700">{formatQty(row.fd)}</td><td className="border border-slate-200 px-2 py-1.5 text-right font-bold">{formatQty(row.sampleTesting)}</td><td className="border border-slate-200 px-2 py-1.5 text-right">{formatQty(row.rtn)}</td><td className="border border-slate-200 px-2 py-1.5 text-right font-black">{formatQty(row.goodQty)}</td><td className="border border-slate-200 px-2 py-1.5 text-right font-black">{formatQty(row.goodTotal)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}