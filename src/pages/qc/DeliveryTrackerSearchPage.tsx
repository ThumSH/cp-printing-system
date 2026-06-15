// src/pages/qc/DeliveryTrackerSearchPage.tsx
import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, LayoutDashboard, ChevronDown, ChevronRight, Filter, RotateCcw, Clock, Printer } from 'lucide-react';
import { API, getAuthHeaders } from '../../api/client';

interface SizeData { size: string; qty: number; pd: number; fd: number; }
interface TrackerRow {
  inDate: string; deliveryDate: string; styleNo: string; colour: string;
  inAd: string; ad: string; scheduleNo: string; fpoQty: number;
  allowedPd: number; cutNo: string; sizeBreakdown: SizeData[];
  totalQty: number; sizeTotal?: number; sizePdTotal: number; fdTotal: number; exceeded: number;
}
interface TrackerSummary {
  storeInRecordId: string; styleNo: string; fpoNo: string; customerName: string; orderQty: number;
  receivedQty: number; deliveredQty: number; balanceToRec: number;
  pdTotal: number; pdPercentage: string; allSizes: string[];
  rows: TrackerRow[]; sizeTotals: SizeData[];
  grandTotalQty: number; grandPdTotal: number; grandFdTotal: number;
}

const RECENT_LIMIT = 5;


// ── Scheduled tracker grouping ───────────────────────────────────────────────
// Only groups reports that have a real schedule/FPO number. No-schedule reports
// are returned as individual trackers to keep the existing no-schedule flow unchanged.
const getTrackerSchedule = (summary: TrackerSummary) =>
  (summary.fpoNo || summary.rows.find(r => (r.scheduleNo || '').trim())?.scheduleNo || '').trim();

const getRowSizeTotal = (row: TrackerRow) =>
  row.sizeTotal ?? row.sizeBreakdown.reduce((sum, size) => sum + (size.qty || 0), 0);

const prepareTrackerRows = (rows: TrackerRow[]) =>
  rows.map(row => ({
    ...row,
    sizeTotal: getRowSizeTotal(row),
  }));

const getAllSizes = (summaries: TrackerSummary[], rows: TrackerRow[]) =>
  Array.from(new Set([
    ...summaries.flatMap(summary => summary.allSizes || []),
    ...rows.flatMap(row => row.sizeBreakdown.map(size => size.size)),
  ])).filter(Boolean);

const buildSizeTotals = (rows: TrackerRow[], allSizes: string[]): SizeData[] =>
  allSizes.map(size => ({
    size,
    qty: rows.reduce((sum, row) => sum + (row.sizeBreakdown.find(item => item.size === size)?.qty || 0), 0),
    pd: rows.reduce((sum, row) => sum + (row.sizeBreakdown.find(item => item.size === size)?.pd || 0), 0),
    fd: rows.reduce((sum, row) => sum + (row.sizeBreakdown.find(item => item.size === size)?.fd || 0), 0),
  }));

const recalculateSummaryTotals = (summary: TrackerSummary): TrackerSummary => {
  const rows = prepareTrackerRows(summary.rows);
  const allSizes = getAllSizes([summary], rows);
  const grandTotalQty = rows.reduce((sum, row) => sum + (row.totalQty || getRowSizeTotal(row)), 0);
  const grandPdTotal = rows.reduce((sum, row) => sum + (row.sizePdTotal || 0), 0);
  const grandFdTotal = rows.reduce((sum, row) => sum + (row.fdTotal || 0), 0);

  return {
    ...summary,
    rows,
    allSizes,
    sizeTotals: buildSizeTotals(rows, allSizes),
    grandTotalQty,
    grandPdTotal,
    grandFdTotal,
    pdTotal: grandPdTotal,
    pdPercentage: grandTotalQty > 0 ? ((grandPdTotal / grandTotalQty) * 100).toFixed(2) : '0.00',
  };
};

const groupScheduledTrackerSummaries = (summaries: TrackerSummary[]): TrackerSummary[] => {
  const buckets: { firstIndex: number; key: string; items: TrackerSummary[] }[] = [];
  const bucketByKey = new Map<string, { firstIndex: number; key: string; items: TrackerSummary[] }>();

  summaries.forEach((summary, index) => {
    const schedule = getTrackerSchedule(summary);

    // Important: if there is no schedule, do not merge it with any other report.
    if (!schedule) {
      buckets.push({
        firstIndex: index,
        key: `no-schedule-${summary.storeInRecordId}-${index}`,
        items: [summary],
      });
      return;
    }

    const key = [summary.styleNo, summary.customerName, schedule]
      .map(part => (part || '').trim().toLowerCase())
      .join('|||');

    let bucket = bucketByKey.get(key);
    if (!bucket) {
      bucket = { firstIndex: index, key, items: [] };
      bucketByKey.set(key, bucket);
      buckets.push(bucket);
    }

    bucket.items.push({ ...summary, fpoNo: summary.fpoNo || schedule });
  });

  return buckets
    .sort((a, b) => a.firstIndex - b.firstIndex)
    .map(bucket => {
      if (bucket.items.length === 1) {
        return recalculateSummaryTotals(bucket.items[0]);
      }

      const first = bucket.items[0];
      const schedule = getTrackerSchedule(first);
      const rows = prepareTrackerRows(bucket.items.flatMap(summary =>
        summary.rows.map(row => ({
          ...row,
          scheduleNo: row.scheduleNo || schedule,
        }))
      ));
      const allSizes = getAllSizes(bucket.items, rows);
      const orderQty = Math.max(...bucket.items.map(summary => summary.orderQty || 0));
      const deliveredQty = bucket.items.reduce((sum, summary) => sum + (summary.deliveredQty || 0), 0);
      const receivedQty = bucket.items.reduce((sum, summary) => sum + (summary.receivedQty || 0), 0);
      const summedBalance = bucket.items.reduce((sum, summary) => sum + (summary.balanceToRec || 0), 0);

      return recalculateSummaryTotals({
        ...first,
        // Keep the first real Store-In ID so the existing Save API remains compatible.
        storeInRecordId: first.storeInRecordId,
        fpoNo: schedule,
        orderQty,
        receivedQty,
        deliveredQty,
        balanceToRec: orderQty > 0 ? Math.max(0, orderQty - deliveredQty) : summedBalance,
        rows,
        allSizes,
        sizeTotals: buildSizeTotals(rows, allSizes),
      });
    });
};

export default function DeliveryTrackerSearchPage() {
  const [summaries, setSummaries] = useState<TrackerSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStyle, setFilterStyle] = useState('');
  const [filterCustomer, setFilterCustomer] = useState('');
  const [filterSchedule, setFilterSchedule] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true); setError('');
      try {
        const res = await fetch(`${API.DELIVERY_TRACKER}/report`, { headers: getAuthHeaders() });
        if (!res.ok) throw new Error(await res.text() || 'Failed to fetch');
        const data: TrackerSummary[] = await res.json();
        setSummaries(groupScheduledTrackerSummaries(data));
      } catch (e) { setError(e instanceof Error ? e.message : 'Failed to load.'); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const availableStyles = useMemo(() => {
    const map = new Map<string, { styleNo: string; customerName: string; count: number }>();
    summaries.forEach((s) => {
      const key = `${s.styleNo}|||${s.customerName}`;
      const ex = map.get(key);
      if (ex) ex.count++; else map.set(key, { styleNo: s.styleNo, customerName: s.customerName, count: 1 });
    });
    return Array.from(map.entries()).map(([key, val]) => ({ key, ...val }));
  }, [summaries]);

  const customers = useMemo(() => Array.from(new Set(summaries.map((s) => s.customerName).filter(Boolean))).sort(), [summaries]);
  const schedules = useMemo(() => {
    let recs = summaries;
    if (filterStyle) { const [sn, cn] = filterStyle.split('|||'); recs = recs.filter((s) => s.styleNo === sn && s.customerName === cn); }
    return Array.from(new Set(recs.map((s) => s.fpoNo).filter(Boolean))).sort();
  }, [summaries, filterStyle]);

  const hasFilters = !!(filterStyle || filterCustomer || filterSchedule);

  const filteredSummaries = useMemo(() => {
    let recs = [...summaries];
    if (filterStyle) { const [sn, cn] = filterStyle.split('|||'); recs = recs.filter((s) => s.styleNo === sn && s.customerName === cn); }
    if (filterCustomer) recs = recs.filter((s) => s.customerName === filterCustomer);
    if (filterSchedule) recs = recs.filter((s) => s.fpoNo === filterSchedule);
    return recs;
  }, [summaries, filterStyle, filterCustomer, filterSchedule]);

  const displaySummaries = useMemo(() => {
    if (!hasFilters) return summaries.slice(0, RECENT_LIMIT);
    return filteredSummaries;
  }, [hasFilters, summaries, filteredSummaries]);

  const clearFilters = () => { setFilterStyle(''); setFilterCustomer(''); setFilterSchedule(''); setExpandedId(null); };
  const activeCount = [filterStyle, filterCustomer, filterSchedule].filter(Boolean).length;

  const totalStats = useMemo(() => ({
    reports: displaySummaries.length,
    delivered: displaySummaries.reduce((s, r) => s + r.deliveredQty, 0),
    pd: displaySummaries.reduce((s, r) => s + r.pdTotal, 0),
  }), [displaySummaries]);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-6xl space-y-6 pb-12">
      <div className="flex items-center space-x-3 border-b border-slate-200 pb-4">
        <div className="rounded-lg bg-cyan-100 p-2"><Search className="h-6 w-6 text-cyan-700" /></div>
        <div><h2 className="text-2xl font-bold text-slate-900">Delivery Tracker Search</h2><p className="text-sm text-slate-500">Search delivery tracker reports by style, customer, and schedule.</p></div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2"><Filter className="h-4 w-4 text-slate-500" /><h3 className="text-sm font-bold text-slate-700">Filters</h3>
            {activeCount > 0 && <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">{activeCount} active</span>}
          </div>
          <button onClick={clearFilters} className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${hasFilters ? 'bg-red-50 border border-red-200 text-red-700 hover:bg-red-100' : 'bg-slate-50 border border-slate-200 text-slate-400 cursor-default'}`}><RotateCcw className="h-3.5 w-3.5" />Clear All</button>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="space-y-1"><label className="block text-xs font-medium text-slate-600">Style</label>
            <select value={filterStyle} onChange={(e) => { setFilterStyle(e.target.value); setFilterSchedule(''); }} className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-colors ${filterStyle ? 'border-blue-400 bg-blue-50/50 ring-1 ring-blue-200' : 'border-slate-300 bg-white focus:ring-2 focus:ring-blue-500'}`}>
              <option value="">All Styles</option>{availableStyles.map((s) => <option key={s.key} value={s.key}>{s.styleNo} | {s.customerName} ({s.count})</option>)}
            </select>
          </div>
          <div className="space-y-1"><label className="block text-xs font-medium text-slate-600">Customer</label>
            <select value={filterCustomer} onChange={(e) => setFilterCustomer(e.target.value)} className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-colors ${filterCustomer ? 'border-blue-400 bg-blue-50/50 ring-1 ring-blue-200' : 'border-slate-300 bg-white focus:ring-2 focus:ring-blue-500'}`}>
              <option value="">All Customers</option>{customers.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="space-y-1"><label className="block text-xs font-medium text-slate-600">Schedule / FPO</label>
            <select value={filterSchedule} onChange={(e) => setFilterSchedule(e.target.value)} className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-colors ${filterSchedule ? 'border-blue-400 bg-blue-50/50 ring-1 ring-blue-200' : 'border-slate-300 bg-white focus:ring-2 focus:ring-blue-500'}`}>
              <option value="">All Schedules</option>{schedules.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Reports" value={totalStats.reports} /><StatCard label="Total Delivered" value={totalStats.delivered} color="green" /><StatCard label="Total PD" value={totalStats.pd} color="orange" />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50 px-6 py-3 flex items-center justify-between">
          {hasFilters ? <p className="text-sm font-medium text-slate-700">{filteredSummaries.length} of {summaries.length} reports</p>
            : <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-slate-400" /><p className="text-sm font-medium text-slate-700">Recent {Math.min(RECENT_LIMIT, summaries.length)} of {summaries.length}</p><span className="text-xs text-slate-400">(use filters to search all)</span></div>}
        </div>
        {loading ? <div className="py-16 text-center text-slate-400">Loading...</div>
          : error ? <div className="py-8 text-center text-red-500">{error}</div>
          : displaySummaries.length === 0 ? <div className="py-16 text-center text-slate-400"><LayoutDashboard className="mx-auto mb-3 h-12 w-12 opacity-20" /><p>{hasFilters ? 'No reports match.' : 'No delivery tracker data.'}</p></div>
          : <div className="divide-y divide-slate-100">
              {displaySummaries.map((summary) => {
                const isExp = expandedId === summary.storeInRecordId;
                return (
                  <div key={summary.storeInRecordId}>
                    <div className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50/50 cursor-pointer transition-colors" onClick={() => setExpandedId(isExp ? null : summary.storeInRecordId)}>
                      {isExp ? <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" /> : <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2"><p className="font-bold text-slate-900">{summary.styleNo}</p><span className="text-xs text-slate-500">{summary.customerName}</span></div>
                        <p className="text-xs text-slate-500 mt-0.5">FPO: <span className="font-medium text-slate-700">{summary.fpoNo || '(No Schedule)'}</span> | Order: {summary.orderQty} | Received: {summary.receivedQty}</p>
                      </div>
                      <div className="text-right space-y-0.5 shrink-0">
                        <div className="text-xs">Delivered: <span className="font-bold text-emerald-600">{summary.deliveredQty}</span></div>
                        <div className="text-xs">PD: <span className="font-bold text-red-600">{summary.pdTotal}</span> ({summary.pdPercentage}%)</div>
                        <div className="text-xs">Balance: <span className="font-bold text-blue-700">{summary.balanceToRec}</span></div>
                      </div>
                    </div>
                    <AnimatePresence>
                      {isExp && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="border-t border-slate-100 bg-slate-50/50 px-6 py-4 overflow-hidden overflow-x-auto">
                          
                          {/* Print Button Header */}
                          <div className="flex justify-between items-center mb-3">
                            <h4 className="font-bold text-slate-700">Detailed Report</h4>
                            <button onClick={() => printTracker(summary)} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-600 transition-colors">
                              <Printer className="h-3.5 w-3.5" /> Print Report
                            </button>
                          </div>

                          <table className="w-full text-xs border-collapse mb-4">
                            <thead><tr className="bg-slate-100 text-slate-600">
                              <th className="px-2 py-1.5 text-left font-medium">Date</th><th className="px-2 py-1.5 text-left font-medium">AD</th><th className="px-2 py-1.5 text-left font-medium">Cut</th><th className="px-2 py-1.5 text-right font-medium">FPO Qty</th>
                              {summary.allSizes.map((sz) => <th key={sz} className="px-2 py-1.5 text-center font-medium">{sz}</th>)}
                              <th className="px-2 py-1.5 text-right font-medium whitespace-nowrap">Size Total</th>
                              <th className="px-2 py-1.5 text-right font-medium">PD</th><th className="px-2 py-1.5 text-right font-medium">FD</th>
                            </tr></thead>
                            <tbody>{summary.rows.map((row, ri) => (
                              <tr key={ri} className="border-b border-slate-100 hover:bg-white">
                                <td className="px-2 py-1">{row.deliveryDate}</td><td className="px-2 py-1 font-medium">{row.ad}</td><td className="px-2 py-1">{row.cutNo}</td><td className="px-2 py-1 text-right font-bold">{row.fpoQty}</td>
                                {summary.allSizes.map((sz) => { const d = row.sizeBreakdown.find((s) => s.size === sz); return <td key={sz} className="px-2 py-1 text-center">{d?.qty || '-'}</td>; })}
                                {/* Row Size Total */}
                                <td className="px-2 py-1 text-right font-bold bg-slate-50 text-slate-700">
                                  {row.sizeTotal ?? row.sizeBreakdown.reduce((sum, s) => sum + s.qty, 0)}
                                </td>
                                <td className="px-2 py-1 text-right text-red-600 font-bold">{row.sizePdTotal || '-'}</td><td className="px-2 py-1 text-right text-amber-600">{row.fdTotal || '-'}</td>
                              </tr>
                            ))}</tbody>
                            <tfoot><tr className="bg-slate-100 font-bold text-slate-800">
                              <td colSpan={3} className="px-2 py-1.5">Totals</td><td className="px-2 py-1.5 text-right">{summary.rows.reduce((s, r) => s + r.fpoQty, 0)}</td>
                              {summary.allSizes.map((sz) => { const d = summary.sizeTotals.find((s) => s.size === sz); return <td key={sz} className="px-2 py-1.5 text-center">{d?.qty || '-'}</td>; })}
                              {/* Grand Size Total */}
                              <td className="px-2 py-1.5 text-right bg-slate-200">
                                {summary.rows.reduce((sum, r) => sum + (r.sizeTotal ?? r.sizeBreakdown.reduce((s2, sz) => s2 + sz.qty, 0)), 0)}
                              </td>
                              <td className="px-2 py-1.5 text-right text-red-600">{summary.grandPdTotal}</td><td className="px-2 py-1.5 text-right text-amber-600">{summary.grandFdTotal}</td>
                            </tr></tfoot>
                          </table>
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

// ==========================================
// PRINT
// ==========================================
function printTracker(summary: TrackerSummary) {
  const sizes = summary.allSizes;
  let hdrCols = sizes.map(s => `<th class="sz">${s}</th><th class="pd">PD</th><th class="fd">FD</th>`).join('');
  
  let bodyRows = '';
  summary.rows.forEach((r) => {
    let sizeCells = sizes.map(s => { 
      const d = r.sizeBreakdown.find(x => x.size === s); 
      return `<td class="sz">${d?.qty || ''}</td><td class="pd">${d?.pd || ''}</td><td class="fd">${d?.fd || ''}</td>`; 
    }).join('');
    
    let rowSizeTotal = r.sizeTotal ?? r.sizeBreakdown.reduce((sum, s) => sum + s.qty, 0);

    bodyRows += `<tr>
      <td>${r.inDate}</td>
      <td>${r.deliveryDate}</td>
      <td class="bold">${r.styleNo}</td>
      <td>${r.colour}</td>
      <td class="bold">${r.inAd}</td>
      <td>${r.ad}</td>
      <td>${r.scheduleNo || '-'}</td>
      <td class="c bold">${r.fpoQty}</td>
      <td class="c">${r.allowedPd || ''}</td>
      <td class="c bold">${r.cutNo}</td>
      ${sizeCells}
      <td class="c bold" style="background:#f1f5f9;">${rowSizeTotal || 0}</td>
      <td class="c bold red">${r.sizePdTotal || ''}</td>
      <td class="c bold">${r.fdTotal || ''}</td>
      <td class="c bold ${r.exceeded > 0 ? 'red bg-red' : ''}">${r.exceeded || ''}</td>
    </tr>`;
  });

  // Totals
  let totSz = sizes.map(s => { 
    const t = summary.sizeTotals.find(x => x.size === s); 
    return `<td class="sz bold">${t?.qty || ''}</td><td class="pd bold">${t?.pd || ''}</td><td class="fd bold">${t?.fd || ''}</td>`; 
  }).join('');
  
  let grandSizeTotal = summary.rows.reduce((sum, r) => sum + (r.sizeTotal ?? r.sizeBreakdown.reduce((s2, sz) => s2 + sz.qty, 0)), 0);

  bodyRows += `<tr class="total">
    <td colspan="7" style="text-align:right; padding-right: 15px;">TOTALS</td>
    <td class="c bold">${summary.rows.reduce((s,r)=>s+r.fpoQty,0)}</td>
    <td></td><td></td>
    ${totSz}
    <td class="c bold" style="background:#e2e8f0;">${grandSizeTotal || 0}</td>
    <td class="c bold red">${summary.grandPdTotal || ''}</td>
    <td class="c bold">${summary.grandFdTotal || ''}</td>
    <td></td>
  </tr>`;

  const html = `<!DOCTYPE html>
<html>
<head>
<title>Delivery Tracker - ${summary.styleNo}</title>
<style>
  @page { size: A4 landscape; margin: 10mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; font-size: 10px; color: #000; padding-top: 10px; }
  
  .hdr { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 8px; border-bottom: 2px solid #000; padding-bottom: 4px; }
  .hdr h2 { font-size: 16px; font-weight: 900; text-transform: uppercase; margin: 0; }
  .hdr span { font-size: 12px; font-weight: bold; }
  
  .info { display: flex; gap: 20px; margin-bottom: 12px; font-size: 11px; flex-wrap: wrap; }
  .info span { background: #f8f9fa; padding: 4px 8px; border: 1px solid #ddd; border-radius: 4px; }
  .info b { margin-right: 4px; color: #444; }
  
  table { width: 100%; border-collapse: collapse; border: 1px solid #000; margin-bottom: 15px; }
  th, td { border: 1px solid #888; padding: 4px 6px; font-size: 9px; text-align: center; }
  th { background: #e8e8e8; font-weight: bold; font-size: 9px; }
  
  .sz { background: #eef4ff; }
  .pd { background: #fff0f0; color: #c00; font-size: 9px; font-weight: bold; }
  .fd { background: #fffbe6; color: #a50; font-size: 9px; font-weight: bold; }
  
  .c { text-align: center; }
  .bold { font-weight: bold; }
  .red { color: #c00; }
  .bg-red { background: #fee2e2; }
  
  .total td { border-top: 2px solid #000; font-weight: bold; background: #f8f9fa; font-size: 10px; padding-top: 6px; padding-bottom: 6px; }
  
  /* Print Summary Box */
  .summary { width: 280px; border: none; border-collapse: collapse; float: right; margin-top: 20px; font-size: 12px; background: #f8fafc; border-radius: 6px; padding: 10px; }
  .summary td { padding: 8px 12px; border: none; text-align: left; }
  .summary .lbl { font-weight: bold; color: #475569; width: 60%; }
  .summary .val { font-weight: 900; text-align: right; color: #0f172a; }
  .summary .spacer td { border-bottom: 1px solid #e2e8f0; height: 1px; padding: 0; }
  .text-emerald { color: #059669; }
  .text-blue { color: #1d4ed8; }
  .red-row .lbl, .red-row .val { color: #dc2626; font-size: 14px; }

  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head>
<body>
  <div class="hdr">
    <h2>DELIVERY TRACKER — ${summary.styleNo} — ${summary.fpoNo || '(No Schedule)'}</h2>
    <span>${summary.customerName}</span>
  </div>
  
  <table>
    <thead>
      <tr>
        <th>IN DATE</th>
        <th>DELIVERY DATE</th>
        <th>STYLE</th>
        <th>COLOUR</th>
        <th>IN AD</th>
        <th>AD</th>
        <th>SCHEDULE</th>
        <th>FPO QTY</th>
        <th>ALLOWED PD</th>
        <th>CUT NO</th>
        ${hdrCols}
        <th>SIZE TOTAL</th>
        <th>SIZE PD TOTAL</th>
        <th>FD TOTAL</th>
        <th>EXCEEDED</th>
      </tr>
    </thead>
    <tbody>
      ${bodyRows}
    </tbody>
  </table>

  <table class="summary">
    <tr><td class="lbl">Style #</td><td class="val">${summary.styleNo}</td></tr>
    <tr><td class="lbl">FPO #</td><td class="val" style="font-weight:normal;">${summary.fpoNo || '(No Schedule)'}</td></tr>
    
    <tr class="spacer"><td colspan="2"></td></tr>
    
    <tr><td class="lbl" style="font-weight:normal;">Order qty</td><td class="val">${summary.orderQty}</td></tr>
    <tr><td class="lbl" style="font-weight:normal;">Received qty</td><td class="val">${summary.receivedQty}</td></tr>
    <tr><td class="lbl" style="font-weight:normal;">Delivered qty</td><td class="val text-emerald">${summary.deliveredQty}</td></tr>
    
    <tr class="spacer"><td colspan="2"></td></tr>
    
    <tr>
      <td class="lbl text-blue" style="font-size:14px;">Balance to rec</td>
      <td class="val text-blue" style="font-size:14px;">${summary.balanceToRec}</td>
    </tr>
    
    <tr class="spacer"><td colspan="2"></td></tr>
    
    <tr class="red-row"><td class="lbl" style="text-transform:uppercase;">PD TOTAL</td><td class="val">${summary.pdTotal}</td></tr>
    <tr class="red-row"><td class="lbl">PD %</td><td class="val">${summary.pdPercentage}%</td></tr>
  </table>
</body>
</html>`;

  const ef = document.getElementById('tracker-print-frame') as HTMLIFrameElement | null; 
  if (ef) ef.remove();
  
  const f = document.createElement('iframe'); 
  f.id = 'tracker-print-frame'; 
  f.style.cssText = 'position:fixed;top:-10000px;left:-10000px;width:1600px;height:1000px'; 
  document.body.appendChild(f);
  
  const d = f.contentDocument || f.contentWindow?.document; 
  if (d) { 
    d.open(); 
    d.write(html); 
    d.close(); 
    setTimeout(() => { 
      f.contentWindow?.print(); 
      setTimeout(() => f.remove(), 1000); 
    }, 300); 
  }
}