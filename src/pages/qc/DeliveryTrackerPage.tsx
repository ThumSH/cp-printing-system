// src/pages/qc/DeliveryTrackerPage.tsx
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { LayoutDashboard, Printer, RefreshCw, Save, CheckCircle2 } from 'lucide-react';
import { API, getAuthHeaders } from '../../api/client';

const SIZES_ORDER = ['XXS', 'XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL'];

interface SizeData { size: string; qty: number; pd: number; fd: number; }
interface TrackerRow {
  inDate: string; deliveryDate: string; styleNo: string; colour: string;
  inAd: string; ad: string; scheduleNo: string; fpoQty: number;
  allowedPd: number; cutNo: string; sizeBreakdown: SizeData[];
  totalQty: number; sizePdTotal: number; fdTotal: number; exceeded: number;
}
interface TrackerSummary {
  storeInRecordId: string; styleNo: string; fpoNo: string; customerName: string; orderQty: number;
  receivedQty: number; deliveredQty: number; balanceToRec: number;
  pdTotal: number; pdPercentage: string; allSizes: string[];
  rows: TrackerRow[]; sizeTotals: SizeData[];
  grandTotalQty: number; grandPdTotal: number; grandFdTotal: number;
}

const API_BASE = API.DELIVERY_TRACKER;
const getHeaders = getAuthHeaders;

export default function DeliveryTrackerPage() {
  const [summaries, setSummaries] = useState<TrackerSummary[]>([]);
  const [loading, setLoading] = useState(false);  // don't auto-load
  const [error, setError] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('');
  const [selectedSchedule, setSelectedSchedule] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  // Lightweight list of (styleNo, scheduleNo) combos for the dropdowns (loaded once)
  const [filterOptions, setFilterOptions] = useState<{ styleNo: string; scheduleNo: string }[]>([]);
  // Has the user triggered a load (either by picking filters or clicking 'Show Recent 10')?
  const [hasLoaded, setHasLoaded] = useState(false);

  // Fetch filtered report based on current selections (or recent 10 if no filter)
  const fetchReport = async (opts?: { styleNo?: string; scheduleNo?: string; recentOnly?: boolean }) => {
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams();
      if (opts?.styleNo) params.set('styleNo', opts.styleNo);
      if (opts?.scheduleNo) params.set('scheduleNo', opts.scheduleNo);
      if (opts?.recentOnly) params.set('limit', '10');
      const url = params.toString() ? `${API_BASE}/report?${params}` : `${API_BASE}/report`;
      const res = await fetch(url, { headers: getHeaders() });
      if (!res.ok) throw new Error(await res.text() || 'Failed to fetch');
      const data: TrackerSummary[] = await res.json();
      setSummaries(data);
      setHasLoaded(true);
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to load.'); }
    finally { setLoading(false); }
  };

  // Load lightweight dropdown options ONCE on mount (no heavy report data)
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/filters`, { headers: getHeaders() });
        if (res.ok) setFilterOptions(await res.json());
      } catch { /* silent */ }
    })();
  }, []);

  // Auto-load when BOTH style and schedule are picked
  useEffect(() => {
    if (selectedStyle && selectedSchedule) {
      fetchReport({ styleNo: selectedStyle, scheduleNo: selectedSchedule });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStyle, selectedSchedule]);

  const handleSave = async (summary: TrackerSummary) => {
    setSavingId(summary.storeInRecordId);
    try {
      const payload = {
        storeInRecordId: summary.storeInRecordId,
        styleNo: summary.styleNo,
        customerName: summary.customerName,
        fpoNo: summary.fpoNo,
        orderQty: summary.orderQty,
        deliveryQty: summary.deliveredQty,
        balanceQty: summary.balanceToRec,
        deliveryStatus: summary.balanceToRec <= 0 ? 'Delivered' : 'In Transit',
        rows: summary.rows.map((r, i) => ({
          id: `row_${i}`,
          adviceNoteId: r.inAd,
          inDate: r.inDate,
          deliveryDate: r.deliveryDate,
          style: r.styleNo,
          colour: r.colour,
          inAd: r.inAd,
          ad: r.ad,
          schedule: r.scheduleNo,
          fpoQty: r.fpoQty,
          allowedPd: r.allowedPd,
          cutNo: r.cutNo,
          sizeData: Object.fromEntries(r.sizeBreakdown.map((s) => [s.size, { qty: s.qty, pd: s.pd, fd: s.fd }])),
        })),
      };
      const res = await fetch(`${API_BASE}/save`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(payload) });
      if (!res.ok) throw new Error(await res.text());
      setSavedIds((prev) => new Set(prev).add(summary.storeInRecordId));
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to save.'); }
    finally { setSavingId(null); }
  };

  // Build dropdown options from the lightweight /filters endpoint — NOT from the heavy report
  const styleOptions = [...new Set(filterOptions.map((f) => f.styleNo))].filter(Boolean).sort();
  const scheduleOptions = filterOptions
    .filter((f) => !selectedStyle || f.styleNo === selectedStyle)
    .map((f) => f.scheduleNo)
    .filter(Boolean)
    .filter((v, i, a) => a.indexOf(v) === i)
    .sort();

  // Backend already filters — summaries is ready to render as-is
  const filteredSummaries = summaries;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 pb-12">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div className="flex items-center space-x-3">
          <div className="rounded-lg bg-indigo-100 p-2"><LayoutDashboard className="h-6 w-6 text-indigo-700" /></div>
          <div><h2 className="text-2xl font-bold text-slate-900">Delivery Tracker</h2><p className="text-sm text-slate-500">Auto-generated from Store In + Gatepass data. Select a style and schedule to view.</p></div>
        </div>
        <button onClick={() => {
          if (selectedStyle && selectedSchedule) fetchReport({ styleNo: selectedStyle, scheduleNo: selectedSchedule });
          else if (hasLoaded) fetchReport({ recentOnly: true });
        }} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      {/* Filter dropdowns */}
      {filterOptions.length > 0 && (
        <div className="flex items-end gap-4 rounded-lg border border-indigo-200 bg-indigo-50/50 p-4">
          <div className="space-y-1 flex-1 max-w-xs">
            <label className="block text-[10px] font-bold uppercase tracking-wide text-indigo-800">Style No</label>
            <select value={selectedStyle} onChange={(e) => { setSelectedStyle(e.target.value); setSelectedSchedule(''); }}
              className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="">All Styles</option>
              {styleOptions.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="space-y-1 flex-1 max-w-xs">
            <label className="block text-[10px] font-bold uppercase tracking-wide text-indigo-800">Schedule No (FPO)</label>
            <select value={selectedSchedule} onChange={(e) => setSelectedSchedule(e.target.value)}
              className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="">All Schedules</option>
              {scheduleOptions.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          {(selectedStyle || selectedSchedule) && (
            <button onClick={() => { setSelectedStyle(''); setSelectedSchedule(''); setSummaries([]); setHasLoaded(false); }}
              className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors">Clear</button>
          )}
          <button
            onClick={() => { setSelectedStyle(''); setSelectedSchedule(''); fetchReport({ recentOnly: true }); }}
            disabled={loading}
            className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            Show Recent 10
          </button>
        </div>
      )}

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}
      {loading && <div className="py-12 text-center text-slate-400">Loading report...</div>}

      {!loading && !hasLoaded && (
        <div className="py-16 text-center">
          <LayoutDashboard className="mx-auto mb-3 h-12 w-12 text-slate-300" />
          <p className="text-sm font-medium text-slate-500">Select a Style and Schedule above, or click "Show Recent 10"</p>
          <p className="mt-1 text-xs text-slate-400">Nothing is loaded yet to keep the page fast.</p>
        </div>
      )}

      {!loading && hasLoaded && summaries.length === 0 && !selectedStyle && !selectedSchedule && (
        <div className="py-16 text-center text-slate-400">
          <LayoutDashboard className="mx-auto mb-3 h-12 w-12 opacity-20" />
          <p>No delivery data yet. Create advice notes in Gatepass first.</p>
        </div>
      )}

      {!loading && hasLoaded && summaries.length === 0 && (selectedStyle || selectedSchedule) && (
        <div className="py-12 text-center text-slate-400">No delivery data for this Style + Schedule.</div>
      )}

      {filteredSummaries.map((summary, si) => (
        <div key={si} className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          {/* Header bar */}
          <div className="flex items-center justify-between bg-slate-800 px-5 py-3 text-white">
            <div className="flex items-center gap-4">
              <span className="text-sm font-bold">{summary.styleNo}</span>
              <span className="text-xs text-slate-300">{summary.customerName}</span>
              <span className="rounded bg-slate-700 px-2 py-0.5 text-xs font-medium">FPO: {summary.fpoNo}</span>
            </div>
            <div className="flex items-center gap-2">
              {savedIds.has(summary.storeInRecordId) ? (
                <span className="inline-flex items-center gap-1 rounded bg-emerald-600 px-3 py-1 text-xs font-medium text-white">
                  <CheckCircle2 className="h-3 w-3" /> Saved
                </span>
              ) : (
                <button onClick={() => handleSave(summary)} disabled={savingId === summary.storeInRecordId}
                  className="inline-flex items-center gap-1 rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-500 transition-colors disabled:opacity-50">
                  <Save className="h-3 w-3" /> {savingId === summary.storeInRecordId ? 'Saving...' : 'Save'}
                </button>
              )}
              <button onClick={() => printTracker(summary)} className="inline-flex items-center gap-1 rounded bg-slate-700 px-3 py-1 text-xs font-medium text-white hover:bg-slate-600 transition-colors">
                <Printer className="h-3 w-3" /> Print
              </button>
            </div>
          </div>

          <div className="flex">
            {/* Main table */}
            <div className="flex-1 overflow-x-auto">
              <table className="w-max min-w-full border-collapse text-[10px]">
                <thead>
                  <tr className="bg-slate-100 text-slate-700">
                    <th className="border border-slate-300 px-2 py-1.5 font-bold whitespace-nowrap">IN DATE</th>
                    <th className="border border-slate-300 px-2 py-1.5 font-bold whitespace-nowrap">DELIVERY DATE</th>
                    <th className="border border-slate-300 px-2 py-1.5 font-bold">STYLE</th>
                    <th className="border border-slate-300 px-2 py-1.5 font-bold">COLOUR</th>
                    <th className="border border-slate-300 px-2 py-1.5 font-bold">IN AD</th>
                    <th className="border border-slate-300 px-2 py-1.5 font-bold">AD</th>
                    <th className="border border-slate-300 px-2 py-1.5 font-bold">SCHEDULE</th>
                    <th className="border border-slate-300 px-2 py-1.5 font-bold whitespace-nowrap">FPO QTY</th>
                    <th className="border border-slate-300 px-2 py-1.5 font-bold whitespace-nowrap">ALLOWED PD</th>
                    <th className="border border-slate-300 px-2 py-1.5 font-bold whitespace-nowrap">CUT NO</th>
                    {summary.allSizes.map((size) => ([
                      <th key={`${size}`} className="border border-slate-300 px-1.5 py-1.5 font-bold text-center bg-blue-50">{size}</th>,
                      <th key={`${size}-pd`} className="border border-slate-300 px-1 py-1.5 font-bold text-center bg-red-50 text-red-700" style={{ fontSize: '8px' }}>PD</th>,
                      <th key={`${size}-fd`} className="border border-slate-300 px-1 py-1.5 font-bold text-center bg-amber-50 text-amber-700" style={{ fontSize: '8px' }}>FD</th>,
                    ]))}
                    <th className="border border-slate-300 px-2 py-1.5 font-bold bg-slate-200 whitespace-nowrap">SIZE PD TOTAL</th>
                    <th className="border border-slate-300 px-2 py-1.5 font-bold bg-slate-200 whitespace-nowrap">FD TOTAL</th>
                    <th className="border border-slate-300 px-2 py-1.5 font-bold bg-red-100 text-red-800">EXCEEDED</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.rows.map((row, ri) => (
                    <tr key={ri} className="hover:bg-slate-50/50">
                      <td className="border border-slate-200 px-2 py-1 whitespace-nowrap">{row.inDate}</td>
                      <td className="border border-slate-200 px-2 py-1 whitespace-nowrap">{row.deliveryDate}</td>
                      <td className="border border-slate-200 px-2 py-1 font-medium">{row.styleNo}</td>
                      <td className="border border-slate-200 px-2 py-1">{row.colour}</td>
                      <td className="border border-slate-200 px-2 py-1 font-medium">{row.inAd}</td>
                      <td className="border border-slate-200 px-2 py-1">{row.ad}</td>
                      <td className="border border-slate-200 px-2 py-1">{row.scheduleNo}</td>
                      <td className="border border-slate-200 px-2 py-1 text-center font-bold">{row.fpoQty}</td>
                      <td className="border border-slate-200 px-2 py-1 text-center">{row.allowedPd}</td>
                      <td className="border border-slate-200 px-2 py-1 text-center font-medium">{row.cutNo}</td>
                      {summary.allSizes.map((size) => {
                        const sd = row.sizeBreakdown.find((s) => s.size === size);
                        return [
                          <td key={`${size}`} className="border border-slate-200 px-1 py-1 text-center bg-blue-50/30 font-medium">{sd?.qty || ''}</td>,
                          <td key={`${size}-pd`} className="border border-slate-200 px-1 py-1 text-center bg-red-50/30 text-red-600 font-bold">{sd?.pd || ''}</td>,
                          <td key={`${size}-fd`} className="border border-slate-200 px-1 py-1 text-center bg-amber-50/30 text-amber-600">{sd?.fd || ''}</td>,
                        ];
                      })}
                      <td className="border border-slate-200 px-2 py-1 text-center font-bold text-red-700 bg-slate-50">{row.sizePdTotal || ''}</td>
                      <td className="border border-slate-200 px-2 py-1 text-center font-bold bg-slate-50">{row.fdTotal || ''}</td>
                      <td className={`border border-slate-200 px-2 py-1 text-center font-black ${row.exceeded > 0 ? 'bg-red-100 text-red-800' : ''}`}>{row.exceeded || ''}</td>
                    </tr>
                  ))}
                  {/* Totals row */}
                  <tr className="bg-slate-100 font-bold border-t-2 border-slate-400">
                    <td colSpan={7} className="border border-slate-300 px-2 py-1.5 text-right text-[9px] uppercase tracking-wide text-slate-500">TOTALS</td>
                    <td className="border border-slate-300 px-2 py-1.5 text-center">{summary.rows.reduce((s, r) => s + r.fpoQty, 0)}</td>
                    <td className="border border-slate-300 px-2 py-1.5 text-center"></td>
                    <td className="border border-slate-300 px-2 py-1.5"></td>
                    {summary.allSizes.map((size) => {
                      const st = summary.sizeTotals.find((s) => s.size === size);
                      return [
                        <td key={size} className="border border-slate-300 px-1 py-1.5 text-center bg-blue-50/50">{st?.qty || ''}</td>,
                        <td key={`${size}-pd`} className="border border-slate-300 px-1 py-1.5 text-center bg-red-50/50 text-red-700">{st?.pd || ''}</td>,
                        <td key={`${size}-fd`} className="border border-slate-300 px-1 py-1.5 text-center bg-amber-50/50 text-amber-700">{st?.fd || ''}</td>,
                      ];
                    })}
                    <td className="border border-slate-300 px-2 py-1.5 text-center text-red-700 bg-slate-200">{summary.grandPdTotal || ''}</td>
                    <td className="border border-slate-300 px-2 py-1.5 text-center bg-slate-200">{summary.grandFdTotal || ''}</td>
                    <td className="border border-slate-300 px-2 py-1.5 text-center bg-red-100"></td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Right summary panel */}
            <div className="w-52 shrink-0 border-l border-slate-300 bg-slate-50 p-4 space-y-2 text-xs">
              <div className="flex justify-between"><span className="font-bold text-slate-600">Style #</span><span className="font-bold text-slate-900">{summary.styleNo}</span></div>
              <div className="flex justify-between"><span className="font-bold text-slate-600">FPO #</span><span className="font-medium">{summary.fpoNo}</span></div>
              <div className="border-t border-slate-200 pt-2 flex justify-between"><span className="text-slate-600">Order qty</span><span className="font-bold">{summary.orderQty}</span></div>
              <div className="flex justify-between"><span className="text-slate-600">Received qty</span><span className="font-bold">{summary.receivedQty}</span></div>
              <div className="flex justify-between"><span className="text-slate-600">Delivered qty</span><span className="font-bold text-emerald-700">{summary.deliveredQty}</span></div>
              <div className="flex justify-between border-t border-slate-200 pt-2">
                <span className="font-bold text-slate-600">Balance to rec</span>
                <span className={`font-black ${summary.balanceToRec > 0 ? 'text-blue-700' : 'text-emerald-700'}`}>{summary.balanceToRec}</span>
              </div>
              <div className="border-t border-slate-200 pt-2 flex justify-between"><span className="text-red-600 font-bold">PD TOTAL</span><span className="font-black text-red-700">{summary.pdTotal}</span></div>
              <div className="flex justify-between"><span className="text-red-600 font-bold">PD %</span><span className="font-black text-red-700">{summary.pdPercentage}%</span></div>
            </div>
          </div>
        </div>
      ))}
    </motion.div>
  );
}

// ==========================================
// PRINT
// ==========================================
function printTracker(summary: TrackerSummary) {
  const sizes = summary.allSizes;
  let hdrCols = sizes.map(s => `<th class="sz">${s}</th><th class="pd">PD</th><th class="fd">FD</th>`).join('');
  let bodyRows = '';
  summary.rows.forEach((r, i) => {
    let sizeCells = sizes.map(s => { const d = r.sizeBreakdown.find(x => x.size === s); return `<td class="sz">${d?.qty || ''}</td><td class="pd">${d?.pd || ''}</td><td class="fd">${d?.fd || ''}</td>`; }).join('');
    bodyRows += `<tr><td>${r.inDate}</td><td>${r.deliveryDate}</td><td>${r.styleNo}</td><td>${r.colour}</td><td>${r.inAd}</td><td>${r.ad}</td><td>${r.scheduleNo}</td><td class="c bold">${r.fpoQty}</td><td class="c">${r.allowedPd}</td><td class="c">${r.cutNo}</td>${sizeCells}<td class="c bold red">${r.sizePdTotal || ''}</td><td class="c bold">${r.fdTotal || ''}</td><td class="c bold ${r.exceeded > 0 ? 'red' : ''}">${r.exceeded || ''}</td></tr>`;
  });
  // Totals
  let totSz = sizes.map(s => { const t = summary.sizeTotals.find(x => x.size === s); return `<td class="sz bold">${t?.qty || ''}</td><td class="pd bold">${t?.pd || ''}</td><td class="fd bold">${t?.fd || ''}</td>`; }).join('');
  bodyRows += `<tr class="total"><td colspan="7" style="text-align:right;font-size:7px">TOTALS</td><td class="c bold">${summary.rows.reduce((s,r)=>s+r.fpoQty,0)}</td><td></td><td></td>${totSz}<td class="c bold red">${summary.grandPdTotal||''}</td><td class="c bold">${summary.grandFdTotal||''}</td><td></td></tr>`;

  const html = `<!DOCTYPE html><html><head><title>Delivery Tracker - ${summary.styleNo}</title>
<style>@page{size:A3 landscape;margin:5mm}*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;font-size:8px;color:#000}
.hdr{display:flex;justify-content:space-between;margin-bottom:4px}.hdr h2{font-size:12px;font-weight:900}
.info{display:flex;gap:20px;margin-bottom:4px;font-size:9px}.info b{margin-right:4px}
table{width:100%;border-collapse:collapse;border:1px solid #000}th,td{border:0.5px solid #888;padding:1px 3px;font-size:7px;white-space:nowrap;text-align:center}
th{background:#e8e8e8;font-weight:700}.sz{background:#eef4ff}.pd{background:#fff0f0;color:#c00;font-size:6px}.fd{background:#fffbe6;color:#a50;font-size:6px}
.c{text-align:center}.bold{font-weight:700}.red{color:#c00}.total td{border-top:2px solid #000;font-weight:700}
.summary{margin-top:6px;font-size:9px}.summary td{padding:2px 6px;border:none}.summary .lbl{font-weight:700;text-align:right}.summary .val{font-weight:900;text-align:left;padding-left:8px}
@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style></head><body>
<div class="hdr"><h2>DELIVERY TRACKER — ${summary.styleNo} — ${summary.fpoNo}</h2><span>${summary.customerName}</span></div>
<div class="info"><span><b>Style #:</b>${summary.styleNo}</span><span><b>FPO #:</b>${summary.fpoNo}</span><span><b>Order Qty:</b>${summary.orderQty}</span><span><b>Received:</b>${summary.receivedQty}</span><span><b>Delivered:</b>${summary.deliveredQty}</span><span><b>Balance:</b>${summary.balanceToRec}</span></div>
<table><thead><tr><th>IN DATE</th><th>DELIVERY DATE</th><th>STYLE</th><th>COLOUR</th><th>IN AD</th><th>AD</th><th>SCHEDULE</th><th>FPO QTY</th><th>ALLOWED PD</th><th>CUT NO</th>${hdrCols}<th>SIZE PD TOTAL</th><th>FD TOTAL</th><th>EXCEEDED</th></tr></thead><tbody>${bodyRows}</tbody></table>
<table class="summary" style="width:auto;margin-top:8px;border:1px solid #000"><tr><td class="lbl">PD TOTAL</td><td class="val red">${summary.pdTotal}</td></tr><tr><td class="lbl">PD %</td><td class="val red">${summary.pdPercentage}%</td></tr></table>
</body></html>`;

  const ef = document.getElementById('tracker-print-frame') as HTMLIFrameElement | null; if (ef) ef.remove();
  const f = document.createElement('iframe'); f.id = 'tracker-print-frame'; f.style.cssText = 'position:fixed;top:-10000px;left:-10000px;width:1600px;height:1000px'; document.body.appendChild(f);
  const d = f.contentDocument || f.contentWindow?.document; if (d) { d.open(); d.write(html); d.close(); setTimeout(() => { f.contentWindow?.print(); setTimeout(() => f.remove(), 1000); }, 300); }
}