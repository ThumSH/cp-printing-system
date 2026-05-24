// src/pages/qc/CPISearchPage.tsx
import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, ClipboardList, ChevronDown, ChevronRight, Filter, 
  CalendarDays, RotateCcw, Clock, CheckCircle2, XCircle, AlertCircle, Printer 
} from 'lucide-react';
import { useQCStore, CPIReport } from '../../store/qcStore';

const RECENT_LIMIT = 10;

export default function CPISearchPage() {
  const { cpiReports, fetchReports } = useQCStore();
  const [filterStyle, setFilterStyle] = useState('');
  const [filterCustomer, setFilterCustomer] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => { 
      setIsLoading(true); 
      try { 
        await fetchReports(); 
      } catch (e) { 
        console.error(e); 
      } finally { 
        setIsLoading(false); 
      } 
    };
    load();
  }, [fetchReports]);

  const availableStyles = useMemo(() => {
    const map = new Map<string, { styleNo: string; customer: string; count: number; latestDate: string }>();
    cpiReports.forEach((r) => {
      const key = `${r.styleNo}|||${r.customer}`;
      const ex = map.get(key);
      if (ex) { 
        ex.count++; 
        if ((r.date || '') > ex.latestDate) ex.latestDate = r.date || ''; 
      }
      else map.set(key, { styleNo: r.styleNo, customer: r.customer, count: 1, latestDate: r.date || '' });
    });
    return Array.from(map.entries()).map(([key, val]) => ({ key, ...val })).sort((a, b) => b.latestDate.localeCompare(a.latestDate));
  }, [cpiReports]);

  const customers = useMemo(() => Array.from(new Set(cpiReports.map((r) => r.customer).filter(Boolean))).sort(), [cpiReports]);
  const hasFilters = !!(filterStyle || filterCustomer || filterStatus || filterDateFrom || filterDateTo);

  const filteredRecords = useMemo(() => {
    let recs = [...cpiReports];
    if (filterStyle) { 
      const [sn, cn] = filterStyle.split('|||'); 
      recs = recs.filter((r) => r.styleNo === sn && r.customer === cn); 
    }
    if (filterCustomer) recs = recs.filter((r) => r.customer === filterCustomer);
    if (filterStatus) recs = recs.filter((r) => r.inspectionStatus === filterStatus);
    if (filterDateFrom) recs = recs.filter((r) => (r.date || '') >= filterDateFrom);
    if (filterDateTo) recs = recs.filter((r) => (r.date || '') <= filterDateTo);
    return recs;
  }, [cpiReports, filterStyle, filterCustomer, filterStatus, filterDateFrom, filterDateTo]);

  const displayRecords = useMemo(() => {
    if (!hasFilters) return [...cpiReports].sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, RECENT_LIMIT);
    return filteredRecords;
  }, [hasFilters, cpiReports, filteredRecords]);

  const summary = useMemo(() => ({
    total: displayRecords.length,
    passed: displayRecords.filter((r) => r.inspectionStatus === 'Passed').length,
    failed: displayRecords.filter((r) => r.inspectionStatus === 'Failed').length,
    pending: displayRecords.filter((r) => r.inspectionStatus === 'Pending').length,
  }), [displayRecords]);

  const clearFilters = () => { 
    setFilterStyle(''); setFilterCustomer(''); setFilterStatus(''); setFilterDateFrom(''); setFilterDateTo(''); setExpandedId(null); 
  };
  
  const activeCount = [filterStyle, filterCustomer, filterStatus, filterDateFrom, filterDateTo].filter(Boolean).length;

  const statusBadge = (status: string) => {
    if (status === 'Passed') return <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700"><CheckCircle2 className="h-3 w-3" />Passed</span>;
    if (status === 'Failed') return <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-700"><XCircle className="h-3 w-3" />Failed</span>;
    return <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700"><AlertCircle className="h-3 w-3" />Pending</span>;
  };

  // ── Print handler for saved reports ──────────────────────────────────────
  const handlePrint = (rep: CPIReport, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent row collapse

    const td = (val: string | number, extra = '') =>
      `<td style="border:1px solid #bbb;padding:2px 4px;text-align:center;font-size:10px;${extra}">${val ?? ''}</td>`;
    const tdL = (val: string | number) =>
      `<td style="border:1px solid #bbb;padding:2px 4px;text-align:left;font-size:10px;">${val ?? ''}</td>`;

    let rows = '';
    let totalSampleSize = 0;
    let totalDefectedQty = 0;

    (rep.cutInspections || []).forEach((ci, cutIdx) => {
      const defs = ci.defectRows || [];
      const isFirstCut = cutIdx === 0; // Only print F1-F13 labels for the first cut
      
      defs.forEach((def, idx) => {
        const isFirstRow = idx === 0;
        if (isFirstRow) totalSampleSize += ci.sampleSize || 0;
        totalDefectedQty += def.defectedQty || 0;

        rows += '<tr>'
          + td(isFirstCut ? def.defectCode : '', isFirstCut ? 'color:#666;font-family:monospace;' : '')
          + tdL(isFirstCut ? def.defectName : '')
          + td('') // check mark placeholder
          + td(isFirstRow ? ci.cutNo : '')
          + td(isFirstRow ? ci.cutQty : '', 'font-weight:bold;')
          + td(isFirstRow ? (ci.bundleNos || '') : '')
          + td(isFirstRow ? (ci.part || '') : '')
          + td(isFirstRow ? (ci.sizes || '') : '')
          + td(def.beforeLength || '')
          + td('') // L- not saved in DB
          + td(def.beforeWidth || '')
          + td('') // W- not saved in DB
          + td(def.afterLength || '')
          + td('') // L- not saved in DB
          + td(def.afterWidth || '')
          + td('') // W- not saved in DB
          + td(isFirstRow ? (ci.numberRanges || '') : '', 'font-size:9px;')
          + td(isFirstRow ? ci.sampleSize : '')
          + td(def.defectedQty || '')
          + td(def.percentage || '')
          + td(def.remarks || '', 'text-align:left;')
          + '</tr>';
      });
    });

    // Blank rows if necessary
    const blankCount = Math.max(0, 2 - (rep.cutInspections?.length || 0));
    for (let i = 0; i < blankCount; i++) {
      rows += '<tr>' + Array(21).fill('<td style="border:1px solid #bbb;height:18px;"></td>').join('') + '</tr>';
    }

    // Totals row
    rows += '<tr style="background:#f0f0f0;font-weight:bold;">'
      + td('TOTALS', 'text-align:left;') + td('') + td('') + td('')
      + td(rep.cuttingQty || '', 'font-weight:bold;')
      + td('') + td('') + td('')
      + td('') + td('') + td('') + td('')
      + td('') + td('') + td('') + td('')
      + td('')
      + td(totalSampleSize || '', 'font-weight:bold;')
      + td(totalDefectedQty || '', 'font-weight:bold;')
      + td('') + td('')
      + '</tr>';

    const scheduleDisplay = rep.scheduleNo ? rep.scheduleNo : '(No Schedule)';
    const auditorDisplay = rep.cpiAuditor || rep.checkedBy || '_______________';

    const html = '<!DOCTYPE html><html><head>'
      + `<title>CPI Report - ${rep.styleNo} - ${scheduleDisplay}</title>`
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
      + `<td style="border:none;border-bottom:1px solid black;width:20%;padding-right:8px;">${rep.date}</td>`
      + '<td style="border:none;width:14%;">Schedule number:</td>'
      + `<td style="border:none;border-bottom:1px solid black;width:20%;padding-right:8px;">${scheduleDisplay}</td>`
      + '<td style="border:none;width:12%;">Print colour:</td>'
      + `<td style="border:none;border-bottom:1px solid black;width:22%;">${rep.printColour}</td>`
      + '</tr><tr>'
      + '<td style="border:none;">Customer:</td>'
      + `<td style="border:none;border-bottom:1px solid black;padding-right:8px;">${rep.customer}</td>`
      + '<td style="border:none;">Cut number:</td>'
      + `<td style="border:none;border-bottom:1px solid black;padding-right:8px;">${(rep.cutInspections || []).map(c => c.cutNo).join(', ')}</td>`
      + '<td style="border:none;">Received Qty:</td>'
      + `<td style="border:none;border-bottom:1px solid black;">${rep.receivedQty}</td>`
      + '</tr><tr>'
      + '<td style="border:none;">Style number:</td>'
      + `<td style="border:none;border-bottom:1px solid black;padding-right:8px;">${rep.styleNo}</td>`
      + '<td style="border:none;">Body colour:</td>'
      + `<td style="border:none;border-bottom:1px solid black;padding-right:8px;">${rep.bodyColour}</td>`
      + '<td style="border:none;">CPI Qty:</td>'
      + `<td style="border:none;border-bottom:1px solid black;">${rep.cpiQty}</td>`
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
      + `<div>CPI Auditor: <span style="display:inline-block;min-width:150px;border-bottom:1px solid black;">${auditorDisplay}</span></div>`
      + `<div style="font-size:10px;color:#555;">Total Cuts: ${rep.cutInspections?.length || 0} | Total Qty: ${rep.cuttingQty}</div>`
      + '</div>'
      + '</body></html>';

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

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-6xl space-y-6 pb-12">
      <div className="flex items-center space-x-3 border-b border-slate-200 pb-4">
        <div className="rounded-lg bg-teal-100 p-2"><Search className="h-6 w-6 text-teal-700" /></div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">CPI Inspection Search</h2>
          <p className="text-sm text-slate-500">Search CPI inspection reports by style, status, and date range.</p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-500" />
            <h3 className="text-sm font-bold text-slate-700">Filters</h3>
            {activeCount > 0 && <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">{activeCount} active</span>}
          </div>
          <button onClick={clearFilters} className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${hasFilters ? 'bg-red-50 border border-red-200 text-red-700 hover:bg-red-100' : 'bg-slate-50 border border-slate-200 text-slate-400 cursor-default'}`}>
            <RotateCcw className="h-3.5 w-3.5" />Clear All
          </button>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1 lg:col-span-2">
            <label className="block text-xs font-medium text-slate-600">Style</label>
            <select value={filterStyle} onChange={(e) => setFilterStyle(e.target.value)} className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-colors ${filterStyle ? 'border-blue-400 bg-blue-50/50 ring-1 ring-blue-200' : 'border-slate-300 bg-white focus:ring-2 focus:ring-blue-500'}`}>
              <option value="">All Styles</option>
              {availableStyles.map((s) => <option key={s.key} value={s.key}>{s.styleNo} | {s.customer} ({s.count})</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-600">Customer</label>
            <select value={filterCustomer} onChange={(e) => setFilterCustomer(e.target.value)} className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-colors ${filterCustomer ? 'border-blue-400 bg-blue-50/50 ring-1 ring-blue-200' : 'border-slate-300 bg-white focus:ring-2 focus:ring-blue-500'}`}>
              <option value="">All Customers</option>
              {customers.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-600">Inspection Status</label>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-colors ${filterStatus ? 'border-blue-400 bg-blue-50/50 ring-1 ring-blue-200' : 'border-slate-300 bg-white focus:ring-2 focus:ring-blue-500'}`}>
              <option value="">All Statuses</option><option value="Passed">Passed</option><option value="Failed">Failed</option><option value="Pending">Pending</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-600"><CalendarDays className="mr-1 inline h-3 w-3" />Date From</label>
            <input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-colors ${filterDateFrom ? 'border-blue-400 bg-blue-50/50 ring-1 ring-blue-200' : 'border-slate-300 bg-white focus:ring-2 focus:ring-blue-500'}`} />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-600"><CalendarDays className="mr-1 inline h-3 w-3" />Date To</label>
            <input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-colors ${filterDateTo ? 'border-blue-400 bg-blue-50/50 ring-1 ring-blue-200' : 'border-slate-300 bg-white focus:ring-2 focus:ring-blue-500'}`} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Reports" value={summary.total} />
        <StatCard label="Passed" value={summary.passed} color="green" />
        <StatCard label="Failed" value={summary.failed} color="orange" />
        <StatCard label="Pending" value={summary.pending} color="blue" />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50 px-6 py-3 flex items-center justify-between">
          {hasFilters ? <p className="text-sm font-medium text-slate-700">{filteredRecords.length} of {cpiReports.length} reports</p>
            : <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-slate-400" /><p className="text-sm font-medium text-slate-700">Recent {Math.min(RECENT_LIMIT, cpiReports.length)} of {cpiReports.length}</p><span className="text-xs text-slate-400">(use filters to search all)</span></div>}
        </div>
        {isLoading ? <div className="py-16 text-center text-slate-400">Loading...</div>
          : displayRecords.length === 0 ? <div className="py-16 text-center text-slate-400"><ClipboardList className="mx-auto mb-3 h-12 w-12 opacity-20" /><p>{hasFilters ? 'No reports match.' : 'No CPI reports yet.'}</p></div>
          : <div className="divide-y divide-slate-100">
              {displayRecords.map((rep) => {
                const isExp = expandedId === rep.id;
                return (
                  <div key={rep.id}>
                    <div className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50/50 cursor-pointer transition-colors" onClick={() => setExpandedId(isExp ? null : rep.id)}>
                      {isExp ? <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" /> : <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-slate-900">{rep.styleNo}</p>
                          {statusBadge(rep.inspectionStatus)}
                          <span className="text-xs text-slate-500">{rep.customer}</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Sch: <span className="font-medium text-slate-700">{rep.scheduleNo || '(No Schedule)'}</span> | 
                          Date: <span className="font-medium text-slate-700">{rep.date}</span> | 
                          Checked by: <span className="font-medium text-slate-700">{rep.checkedBy || '-'}</span>
                        </p>
                      </div>
                      <div className="text-right space-y-0.5 shrink-0">
                        <div className="text-xs">Received: <span className="font-bold text-orange-600">{rep.receivedQty}</span></div>
                        <div className="text-xs">Checked: <span className="font-bold text-slate-700">{rep.checkedQty}</span></div>
                        <div className="text-xs">Rej: <span className="font-bold text-red-600">{rep.rejDamageQty}</span> ({rep.rejectionPercentage || '0'}%)</div>
                      </div>
                    </div>
                    
                    <AnimatePresence>
                      {isExp && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="border-t border-slate-100 bg-slate-50/50 px-6 py-4 overflow-hidden">
                          <div className="flex items-center justify-between mb-4">
                             <h4 className="text-sm font-bold text-slate-800">Report Details</h4>
                             <button onClick={(e) => handlePrint(rep, e)} className="inline-flex items-center gap-1.5 rounded border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-teal-700 transition-colors">
                                <Printer className="h-3.5 w-3.5" /> Print Report
                             </button>
                          </div>
                          <div className="grid grid-cols-2 gap-3 md:grid-cols-5 mb-4">
                            <MiniStat label="Received Qty" value={rep.receivedQty} color="orange" />
                            <MiniStat label="CPI Qty" value={rep.cpiQty} />
                            <MiniStat label="Cutting Qty" value={rep.cuttingQty} />
                            <MiniStat label="Rejected" value={rep.rejDamageQty} color="orange" />
                            <MiniStat label="Balance" value={rep.balanceQty} color="blue" />
                          </div>
                          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 mb-4 p-3 rounded-lg bg-white border border-slate-200">
                            <InfoField label="Body Colour" value={rep.bodyColour} />
                            <InfoField label="Print Colour" value={rep.printColour} />
                            <InfoField label="Auditor" value={rep.cpiAuditor} />
                            <InfoField label="App/Rej" value={rep.appRej} />
                          </div>
                          {(rep.cutInspections ?? []).map((ci) => (
                            <div key={ci.cutNo} className="mb-3 p-3 rounded-lg border border-slate-200 bg-white">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-sm font-bold text-slate-700">{ci.cutNo}</span>
                                <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-600">Qty: {ci.cutQty} | Sample: {ci.sampleSize}</span>
                                <span className="text-[10px] text-slate-400">Part: {ci.part || '-'}</span>
                              </div>
                              <div className="text-xs text-slate-500 mb-1">Bundles: {ci.bundleNos || '-'} | Sizes: {ci.sizes || '-'}</div>
                              <div className="text-xs"><span className="text-red-600 font-bold">Defects: {ci.totalDefectedQty}</span> ({ci.totalPercentage || '0'}%)</div>
                            </div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>}
      </div>
    </motion.div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color?: 'orange' | 'blue' | 'green' }) {
  const cc = color === 'orange' ? 'text-orange-700' : color === 'blue' ? 'text-blue-700' : color === 'green' ? 'text-emerald-700' : 'text-slate-700';
  return <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm"><p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">{label}</p><p className={`text-xl font-black ${cc}`}>{value.toLocaleString()}</p></div>;
}
function MiniStat({ label, value, color }: { label: string; value: number; color?: 'orange' | 'blue' }) {
  const cc = color === 'orange' ? 'text-orange-700' : color === 'blue' ? 'text-blue-700' : 'text-slate-700';
  return <div className="rounded-lg bg-white border border-slate-200 px-3 py-2"><p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">{label}</p><p className={`text-lg font-black ${cc}`}>{value}</p></div>;
}
function InfoField({ label, value }: { label: string; value: string }) {
  return <div className="space-y-0.5"><label className="block text-[10px] font-medium uppercase tracking-wide text-slate-400">{label}</label><p className="text-sm font-medium text-slate-700">{value || '-'}</p></div>;
}