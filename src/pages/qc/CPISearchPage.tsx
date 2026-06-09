// src/pages/qc/CPISearchPage.tsx
import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, ClipboardList, ChevronDown, ChevronRight, Filter, 
  CalendarDays, RotateCcw, Clock, CheckCircle2, XCircle, AlertCircle, Printer 
} from 'lucide-react';
import { useQCStore, CPIReport } from '../../store/qcStore';

const RECENT_LIMIT = 10;

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

  const uniqueStyles = useMemo(() => {
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

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 pb-12 max-w-6xl mx-auto">
      <div className="flex items-center space-x-3 border-b border-slate-200 pb-4">
        <div className="rounded-lg bg-teal-100 p-2">
          <Search className="h-6 w-6 text-teal-700" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">CPI Report Search</h2>
          <p className="text-sm text-slate-500">Search and view historical Cut Panel Inspection reports.</p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-500" />
            <h3 className="text-sm font-bold text-slate-700">Filters</h3>
            {activeCount > 0 && <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">{activeCount} active</span>}
          </div>
          {hasFilters && (
            <button onClick={clearFilters} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors">
              <RotateCcw className="h-3.5 w-3.5" /> Clear All
            </button>
          )}
        </div>
        
        <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-600">Style No</label>
            <select value={filterStyle} onChange={e => setFilterStyle(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500 bg-white">
              <option value="">All Styles</option>
              {uniqueStyles.map(s => <option key={s.key} value={s.key}>{s.styleNo} | {s.customer} ({s.count})</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-600">Customer</label>
            <select value={filterCustomer} onChange={e => setFilterCustomer(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500 bg-white">
              <option value="">All Customers</option>
              {customers.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-600">Status</label>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500 bg-white">
              <option value="">All Statuses</option>
              <option value="Passed">Passed</option>
              <option value="Failed">Failed</option>
              <option value="Pending">Pending</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-600">Date From</label>
            <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500 bg-white" />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-600">Date To</label>
            <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500 bg-white" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Reports" value={summary.total} />
        <StatCard label="Passed" value={summary.passed} color="green" />
        <StatCard label="Failed" value={summary.failed} color="orange" />
        <StatCard label="Pending" value={summary.pending} color="blue" />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50 px-6 py-3 flex items-center justify-between">
          {hasFilters ? (
            <p className="text-sm font-medium text-slate-700">Found {displayRecords.length} reports</p>
          ) : (
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-slate-400" />
              <p className="text-sm font-medium text-slate-700">Recent {Math.min(RECENT_LIMIT, cpiReports.length)} reports</p>
              <span className="text-xs text-slate-400">(use filters to search all)</span>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="py-16 text-center text-slate-400">Loading reports...</div>
        ) : displayRecords.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <ClipboardList className="mx-auto mb-3 h-12 w-12 opacity-20" />
            <p>No CPI reports match your search.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {displayRecords.map(report => {
              const isExpanded = expandedId === report.id;
              
              const firstCutDefects = report.cutInspections?.[0]?.defectRows || [];
              const activeDefects = firstCutDefects.filter((d: any) => parseFloat(d.defectedQty) > 0);

              return (
                <div key={report.id}>
                  <div className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50/50 cursor-pointer transition-colors"
                    onClick={() => setExpandedId(isExpanded ? null : report.id)}>
                    {isExpanded ? <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" /> : <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />}
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-slate-900">{report.styleNo}</p>
                        <span className="text-xs text-slate-500">{report.customer}</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        <CalendarDays className="inline h-3 w-3 mr-1" /> {report.date} | Sch: {report.scheduleNo || '—'}
                      </p>
                    </div>

                    <div className="flex items-center gap-4 shrink-0 text-right">
                      <div className="hidden md:block">
                        <p className="text-xs text-slate-500">Cuts: <span className="font-bold text-slate-700">{report.cutInspections?.length || 0}</span></p>
                        <p className="text-xs text-slate-500 mt-0.5">Qty: <span className="font-bold text-slate-700">{report.cuttingQty}</span></p>
                      </div>
                      <div className="w-24 flex justify-end">
                        {statusBadge(report.inspectionStatus)}
                      </div>
                    </div>
                  </div>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                        className="border-t border-slate-100 bg-slate-50/50 px-6 py-4 overflow-hidden">
                        
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-bold text-slate-800 text-sm">Report Details</h4>
                          <button onClick={(e) => { e.stopPropagation(); printCPIReport(report); }}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-700 transition-colors shadow-sm">
                            <Printer className="h-3.5 w-3.5" /> Print Report
                          </button>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
                          <MiniStat label="Received Qty" value={report.receivedQty} color="orange" />
                          <MiniStat label="CPI Qty" value={report.cpiQty} />
                          <MiniStat label="Cutting Qty" value={report.cuttingQty} />
                          <MiniStat label="Rejected" value={report.rejDamageQty} color="orange" />
                          <MiniStat label="Balance" value={report.balanceQty} color="blue" />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 mb-4 p-3 rounded-lg bg-white border border-slate-200">
                          <InfoField label="Body Colour" value={report.bodyColour} />
                          <InfoField label="Print Colour" value={report.printColour} />
                          <InfoField label="Auditor" value={report.cpiAuditor || report.checkedBy} />
                          <InfoField label="App/Rej" value={report.appRej} />
                        </div>

                        <div className="space-y-3">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Inspected Cuts</p>
                          {(report.cutInspections || []).map((ci, idx) => (
                            <div key={idx} className="rounded-lg border border-slate-200 bg-white p-3">
                              <div className="flex items-center justify-between flex-wrap gap-2">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-sm font-bold text-slate-700">{ci.cutNo}</span>
                                  <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-600">Qty: {ci.cutQty} | Sample: {ci.sampleSize}</span>
                                  {ci.part && <span className="rounded-full bg-indigo-50 border border-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-700">{ci.part}</span>}
                                </div>
                                <div className="text-xs text-slate-500">
                                  Defected: <span className="font-bold text-red-600">{ci.totalDefectedQty}</span> ({ci.totalPercentage}%)
                                </div>
                              </div>
                              <div className="mt-2 text-[10px] text-slate-500">
                                <p><strong>Bundles:</strong> {ci.bundleNos || '-'}</p>
                                <p><strong>Sizes:</strong> {ci.sizes || '-'}</p>
                              </div>
                            </div>
                          ))}
                        </div>

                        {activeDefects.length > 0 && (
                          <div className="mt-4">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Recorded Defects</p>
                            <div className="rounded-lg border border-red-100 bg-red-50/30 overflow-hidden">
                              <table className="w-full text-xs text-left">
                                <thead className="bg-red-50 text-red-800">
                                  <tr>
                                    <th className="px-3 py-1.5 font-semibold">Defect</th>
                                    <th className="px-3 py-1.5 font-semibold text-right">Qty</th>
                                    <th className="px-3 py-1.5 font-semibold text-right">%</th>
                                    <th className="px-3 py-1.5 font-semibold">Remarks</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-red-100">
                                  {activeDefects.map((d: any, idx: number) => {
                                    const actualRemark = d.remarks?.includes('|||') ? d.remarks.split('|||')[2] : (d.remarks || '—');
                                    return (
                                      <tr key={idx}>
                                        <td className="px-3 py-1.5 font-medium text-slate-700">{d.defectName}</td>
                                        <td className="px-3 py-1.5 text-right font-bold text-red-600">{d.defectedQty}</td>
                                        <td className="px-3 py-1.5 text-right text-red-600">{d.percentage}%</td>
                                        <td className="px-3 py-1.5 text-slate-500">{actualRemark}</td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>)}
      </div>
    </motion.div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number | string; color?: 'orange' | 'blue' | 'green' }) {
  const cc = color === 'orange' ? 'text-orange-700' : color === 'blue' ? 'text-blue-700' : color === 'green' ? 'text-emerald-700' : 'text-slate-700';
  return <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm"><p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">{label}</p><p className={`text-xl font-black ${cc}`}>{value.toLocaleString()}</p></div>;
}

function MiniStat({ label, value, color }: { label: string; value: number | string; color?: 'orange' | 'blue' | 'green' }) {
  const cc = color === 'orange' ? 'text-orange-700' : color === 'blue' ? 'text-blue-700' : color === 'green' ? 'text-emerald-700' : 'text-slate-700';
  return <div className="rounded-lg bg-white border border-slate-200 px-3 py-2"><p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">{label}</p><p className={`text-lg font-black ${cc}`}>{value}</p></div>;
}

function InfoField({ label, value }: { label: string; value: string }) {
  return <div className="space-y-0.5"><label className="block text-[10px] font-medium uppercase tracking-wide text-slate-400">{label}</label><p className="text-sm font-medium text-slate-700">{value || '-'}</p></div>;
}

// ==========================================
// PRINT CPI REPORT LOGIC
// ==========================================
function printCPIReport(report: CPIReport) {
  
  const flatBundles: any[] = [];
  (report.cutInspections || []).forEach(c => {
      const bNos = (c.bundleNos || '').split(',').map(s=>s.trim()).filter(Boolean);
      const sizes = (c.sizes || '').split(',').map(s=>s.trim()).filter(Boolean);
      const ranges = (c.numberRanges || '').split(',').map(s=>s.trim()).filter(Boolean);

      bNos.forEach((bNo, bIdx) => {
          flatBundles.push({
              cutNo: c.cutNo,
              cutQty: c.cutQty,
              component: c.part || '',
              bundleNo: bNo,
              size: sizes[bIdx] || sizes[0] || '',
              numberRange: ranges[bIdx] || ranges[0] || '',
          });
      });
  });

  let currentCutNo = '';
  flatBundles.forEach(b => {
    b.isFirstOfCut = b.cutNo !== currentCutNo;
    currentCutNo = b.cutNo;
  });

  flatBundles.forEach((b, i) => {
      const dr = report.cutInspections?.[0]?.defectRows?.[i];
      if (dr) {
          b.beforeL_plus = dr.beforeLength || '';
          b.beforeL_minus = '';
          b.beforeW_plus = dr.beforeWidth || '';
          b.beforeW_minus = '';
          b.afterL_plus = dr.afterLength || '';
          b.afterL_minus = '';
          b.afterW_plus = dr.afterWidth || '';
          b.afterW_minus = '';
      }
  });

  const td  = (val: string | number, extra = '') =>
    `<td style="border:1px solid #bbb;padding:2px 4px;text-align:center;font-size:10px;${extra}">${val ?? ''}</td>`;
  const tdL = (val: string | number) =>
    `<td style="border:1px solid #bbb;padding:2px 4px;text-align:left;font-size:10px;">${val ?? ''}</td>`;

  let rows = '';
  const numRows = Math.max(14, flatBundles.length);
  let totalDefectedQty = 0;
  let totalSampleSize = 0;
  const totalQtyCombined = (report.cutInspections || []).reduce((s, c) => s + (c.cutQty || 0), 0);

  for (let i = 0; i < numRows; i++) {
    const defInfo = i < 14 ? DEFECTS[i] : null;
    const dr = report.cutInspections?.[0]?.defectRows?.[i]; 
    const bundle = i < flatBundles.length ? flatBundles[i] : null;

    let checkVal = dr?.check || '';
    let sampleVal = dr?.sampleSize || '';
    let remarkVal = dr?.remarks || '';

    // Unpack data hidden inside remarks
    if (remarkVal.includes('|||')) {
       const parts = remarkVal.split('|||');
       checkVal = parts[0] || checkVal;
       sampleVal = parts[1] || sampleVal;
       remarkVal = parts[2] || '';
    }

    if (sampleVal && parseFloat(sampleVal as any) > 0) {
      totalSampleSize += parseFloat(sampleVal as any) || 0;
    }
    if (dr) {
      totalDefectedQty += parseFloat(dr.defectedQty as any) || 0;
    }

    const checkMark  = checkVal === '✓' ? '&#10003;' : checkVal === '✗' ? '&#10007;' : '';
    const checkColor = checkVal === '✓' ? 'color:green;font-weight:bold;' : checkVal === '✗' ? 'color:red;font-weight:bold;' : '';

    rows += '<tr>'
      + td(defInfo?.code ?? '', 'color:#666;font-family:monospace;')
      + tdL(defInfo?.label ?? '')
      + td(checkMark, checkColor)
      + td(bundle?.isFirstOfCut ? bundle.cutNo : '')
      + td(i === 0 && bundle ? totalQtyCombined : '', 'font-weight:bold;')
      + td(bundle?.bundleNo ?? '', 'font-size:9px;')
      + td(bundle?.isFirstOfCut ? bundle.component : '')
      + td(bundle?.size ?? '')
      + td(bundle?.beforeL_plus ?? '') + td(bundle?.beforeL_minus ?? '')
      + td(bundle?.beforeW_plus ?? '') + td(bundle?.beforeW_minus ?? '')
      + td(bundle?.afterL_plus  ?? '') + td(bundle?.afterL_minus  ?? '')
      + td(bundle?.afterW_plus  ?? '') + td(bundle?.afterW_minus  ?? '')
      + td(bundle?.numberRange ?? '', 'font-size:9px;')
      + td(sampleVal) 
      + td(dr?.defectedQty ?? '')
      + td(dr?.percentage  ?? '')
      + td(remarkVal, 'text-align:left;')
      + '</tr>';
  }

  rows += '<tr style="background:#f0f0f0;font-weight:bold;">'
    + td('TOTALS', 'text-align:left;') + td('') + td('') + td('')
    + td(totalQtyCombined, 'font-weight:bold;')
    + td('') + td('') + td('')
    + td('') + td('') + td('') + td('')
    + td('') + td('') + td('') + td('')
    + td('')
    + td(totalSampleSize || '', 'font-weight:bold;') 
    + td(totalDefectedQty || '', 'font-weight:bold;')
    + td('') + td('')
    + '</tr>';

  const scheduleDisplay = report.scheduleNo ? report.scheduleNo : '(No Schedule)';
  const auditorDisplay = report.cpiAuditor || report.checkedBy || '_______________';
  const statusColor = report.inspectionStatus === 'Passed' ? '#16a34a' : report.inspectionStatus === 'Failed' ? '#dc2626' : '#d97706';
  
  const totalCutsCount = report.cutInspections?.length || 0;

  const html = `<!DOCTYPE html><html><head>
    <title>CPI Report - ${report.styleNo} - ${scheduleDisplay}</title>
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: Arial, sans-serif; font-size: 11px; padding: 10mm; }
      table { border-collapse: collapse; width: 100%; }
      th { border: 1px solid #999; padding: 2px 4px; text-align: center; font-size: 10px; background: #e8e8e8; font-weight: bold; }
      @page { size: A4 landscape; margin: 0; }
    </style></head><body>
    <div style="text-align:center;margin-bottom:6px;">
      <div style="font-weight:bold;font-size:13px;text-transform:uppercase;letter-spacing:1px;">Colour Plus Printing Systems (PVT) Ltd</div>
      <div style="font-size:11px;">Cut Panel Inspection Report (CP Chart No. 002)</div>
    </div>
    <table style="border:none;margin-bottom:6px;">
      <tr>
        <td style="border:none;width:12%;">Date:</td>
        <td style="border:none;border-bottom:1px solid black;width:20%;padding-right:8px;">${report.date}</td>
        <td style="border:none;width:14%;">Schedule number:</td>
        <td style="border:none;border-bottom:1px solid black;width:20%;padding-right:8px;">${scheduleDisplay}</td>
        <td style="border:none;width:12%;">Print colour:</td>
        <td style="border:none;border-bottom:1px solid black;width:22%;">${report.printColour}</td>
      </tr><tr>
        <td style="border:none;">Customer:</td>
        <td style="border:none;border-bottom:1px solid black;padding-right:8px;">${report.customer}</td>
        <td style="border:none;">Cut number:</td>
        <td style="border:none;border-bottom:1px solid black;padding-right:8px;">${(report.cutInspections || []).map(c => c.cutNo).join(', ')}</td>
        <td style="border:none;">Received Qty:</td>
        <td style="border:none;border-bottom:1px solid black;">${report.receivedQty}</td>
      </tr><tr>
        <td style="border:none;">Style number:</td>
        <td style="border:none;border-bottom:1px solid black;padding-right:8px;">${report.styleNo}</td>
        <td style="border:none;">Body colour:</td>
        <td style="border:none;border-bottom:1px solid black;padding-right:8px;">${report.bodyColour}</td>
        <td style="border:none;">CPI Qty:</td>
        <td style="border:none;border-bottom:1px solid black;">${report.cpiQty}</td>
      </tr><tr>
        <td style="border:none;">Status:</td>
        <td colspan="5" style="border:none;">
          <span style="font-weight:bold;color:${statusColor};font-size:12px;">${(report.inspectionStatus || '').toUpperCase()}</span>
        </td>
      </tr>
    </table>
    <table><thead>
      <tr>
        <th rowspan="2"></th>
        <th rowspan="2" style="text-align:left;min-width:110px;">Defect</th>
        <th rowspan="2">&#10003;</th>
        <th rowspan="2">Cut No.</th>
        <th rowspan="2">Qty</th>
        <th rowspan="2">Bundle No.</th>
        <th rowspan="2">Component</th>
        <th rowspan="2">Size</th>
        <th colspan="4" style="background:#ddeeff;">Before Printing Process</th>
        <th colspan="4" style="background:#ddffd4;">After Printing Process</th>
        <th rowspan="2">No. Range</th>
        <th rowspan="2">Sample Size 10%</th>
        <th rowspan="2">Defected Qty</th>
        <th rowspan="2">%</th>
        <th rowspan="2" style="min-width:60px;">Remarks</th>
      </tr><tr>
        <th style="background:#ddeeff;">L+</th><th style="background:#ddeeff;">L-</th>
        <th style="background:#ddeeff;">W+</th><th style="background:#ddeeff;">W-</th>
        <th style="background:#ddffd4;">L+</th><th style="background:#ddffd4;">L-</th>
        <th style="background:#ddffd4;">W+</th><th style="background:#ddffd4;">W-</th>
      </tr>
    </thead><tbody>
      ${rows}
    </tbody></table>
    <div style="margin-top:12px;display:flex;justify-content:space-between;font-size:11px;">
      <div>CPI Auditor: <span style="display:inline-block;min-width:150px;border-bottom:1px solid black;">${auditorDisplay}</span></div>
      <div style="font-size:10px;color:#555;">Total Cuts: ${totalCutsCount} | Total Qty: ${totalQtyCombined}</div>
    </div>
  </body></html>`;

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
}