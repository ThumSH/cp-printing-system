// src/pages/qc/DeliveryTrackerPage.tsx
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { LayoutDashboard, Printer, Save, AlertCircle, RefreshCw } from 'lucide-react';
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

const API_BASE = API.DELIVERY_TRACKER;
const getHeaders = getAuthHeaders;

// ── Dropdown helper ────────────────────────────────────────
function CascadeSelect({ label, value, onChange, options, disabled = false, placeholder = "— Select —" }: {
  label: string; value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[]; disabled?: boolean; placeholder?: string;
}) {
  return (
    <div className="space-y-1">
      <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)} disabled={disabled}
        className="min-w-48 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed">
        <option value="">{placeholder}</option>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

export default function DeliveryTrackerPage() {
  const [summaries, setSummaries] = useState<TrackerSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Cascading Selection State
  const [selectedStyle, setSelectedStyle] = useState('');
  const [selectedSchedule, setSelectedSchedule] = useState('');
  
  const [savingId, setSavingId] = useState<string | null>(null);
  
  // Track combos that have been saved to hide them from the dropdowns permanently
  const [savedCombos, setSavedCombos] = useState<{styleNo: string, scheduleNo: string}[]>([]);
  const [filterOptions, setFilterOptions] = useState<{ styleNo: string; scheduleNo: string }[]>([]);

  // Fetch filtered report based on explicit selections
  const fetchReport = async (styleNo: string, scheduleNo: string) => {
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams();
      params.set('styleNo', styleNo);
      if (scheduleNo) params.set('scheduleNo', scheduleNo);
      
      const res = await fetch(`${API_BASE}/report?${params}`, { headers: getHeaders() });
      if (!res.ok) throw new Error(await res.text() || 'Failed to fetch');
      let data: TrackerSummary[] = await res.json();
      
      // Pre-calculate sizeTotal for editable fields so it has a concrete starting value
      data = data.map(summary => ({
        ...summary,
        rows: summary.rows.map(r => ({
          ...r,
          sizeTotal: r.sizeTotal ?? r.sizeBreakdown.reduce((sum, s) => sum + s.qty, 0)
        }))
      }));

      setSummaries(data);
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to load.'); }
    finally { setLoading(false); }
  };

  // Load lightweight dropdown options AND previously saved reports ONCE on mount
  useEffect(() => {
    (async () => {
      try {
        const [filtersRes, savedRes] = await Promise.all([
          fetch(`${API_BASE}/filters`, { headers: getHeaders() }),
          fetch(`${API_BASE}/saved`, { headers: getHeaders() })
        ]);
        
        if (filtersRes.ok) {
          setFilterOptions(await filtersRes.json());
        }
        
        if (savedRes.ok) {
          const savedData = await savedRes.json();
          // Extract the exact style+schedule combos that are already saved
          setSavedCombos(savedData.map((d: any) => ({ 
            styleNo: d.styleNo, 
            scheduleNo: d.fpoNo || '' 
          })));
        }
      } catch { /* silent */ }
    })();
  }, []);

  // Auto-load strictly when Style is picked
  useEffect(() => {
    if (selectedStyle) {
      fetchReport(selectedStyle, selectedSchedule);
    } else {
      setSummaries([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStyle, selectedSchedule]);

  // ── Handle Inline Row Edits ──────────────────────────────────────────────
  const handleRowEdit = (summaryIndex: number, rowIndex: number, field: keyof TrackerRow, val: string) => {
    const numVal = parseInt(val, 10) || 0;
    
    setSummaries(prev => {
      const newSummaries = [...prev];
      const summary = { ...newSummaries[summaryIndex] };
      const rows = [...summary.rows];
      
      // Update the specific field
      rows[rowIndex] = { ...rows[rowIndex], [field]: numVal };

      // Recalculate summary grand totals dynamically
      summary.rows = rows;
      summary.grandPdTotal = rows.reduce((sum, r) => sum + r.sizePdTotal, 0);
      summary.grandFdTotal = rows.reduce((sum, r) => sum + r.fdTotal, 0);
      summary.pdTotal = summary.grandPdTotal;
      summary.pdPercentage = summary.grandTotalQty > 0 
          ? ((summary.grandPdTotal / summary.grandTotalQty) * 100).toFixed(2) 
          : "0.00";
      
      newSummaries[summaryIndex] = summary;
      return newSummaries;
    });
  };

  const handleSave = async (summary: TrackerSummary) => {
    setSavingId(summary.storeInRecordId);
    try {
      const payload = {
        storeInRecordId: summary.storeInRecordId,
        styleNo: summary.styleNo,
        customerName: summary.customerName,
        fpoNo: summary.fpoNo || '', // MUST fallback to string to prevent API 400 Bad Request
        orderQty: summary.orderQty,
        deliveryQty: summary.deliveredQty,
        balanceQty: summary.balanceToRec,
        deliveryStatus: summary.balanceToRec <= 0 ? 'Delivered' : 'In Transit',
        rows: summary.rows.map((r, i) => ({
          id: `row_${i}`,
          adviceNoteId: r.inAd || '',
          inDate: r.inDate,
          deliveryDate: r.deliveryDate,
          style: r.styleNo,
          colour: r.colour,
          inAd: r.inAd,
          ad: r.ad,
          schedule: r.scheduleNo || '',
          fpoQty: r.fpoQty,
          allowedPd: r.allowedPd,
          cutNo: r.cutNo,
          sizeTotal: r.sizeTotal || 0,
          sizePdTotal: r.sizePdTotal,
          fdTotal: r.fdTotal,
          exceeded: r.exceeded,
          sizeData: Object.fromEntries(r.sizeBreakdown.map((s) => [s.size, { qty: s.qty, pd: s.pd, fd: s.fd }])),
        })),
      };
      
      const res = await fetch(`${API_BASE}/save`, { 
        method: 'POST', 
        headers: getHeaders(), 
        body: JSON.stringify(payload) 
      });
      
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || 'Failed to save tracker report.');
      }
      
      // 1. Mark as permanently saved for this session
      setSavedCombos(prev => [...prev, { styleNo: summary.styleNo, scheduleNo: summary.fpoNo || '' }]);
      
      // 2. Elegantly remove only the saved report from the screen
      setSummaries(prev => {
        const next = prev.filter(s => s.storeInRecordId !== summary.storeInRecordId);
        // 3. If it was the last report on the screen, clear the dropdowns completely
        if (next.length === 0) {
          setSelectedStyle('');
          setSelectedSchedule('');
        }
        return next;
      });

    } catch (e) { 
      setError(e instanceof Error ? e.message : 'Failed to save.'); 
    } finally { 
      setSavingId(null); 
    }
  };

  const handleReset = () => {
    setSelectedStyle('');
    setSelectedSchedule('');
    setSummaries([]);
    setError('');
  };

  // Exclude styles that have already been saved in the database or this session
  const activeFilterOptions = filterOptions.filter(f => 
    !savedCombos.some(sc => sc.styleNo === f.styleNo && sc.scheduleNo === (f.scheduleNo || ''))
  );

  // Build dropdown options
  const styleOptions = [...new Set(activeFilterOptions.map((f) => f.styleNo))]
    .filter(Boolean).sort().map(s => ({ value: s, label: s }));
    
  const scheduleOptions = activeFilterOptions
    .filter((f) => !selectedStyle || f.styleNo === selectedStyle)
    .map((f) => f.scheduleNo)
    .filter(Boolean)
    .filter((v, i, a) => a.indexOf(v) === i)
    .sort()
    .map(s => ({ value: s, label: s }));

  const isReady = !!selectedStyle;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 pb-12">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div className="flex items-center space-x-3">
          <div className="rounded-lg bg-indigo-100 p-2"><LayoutDashboard className="h-6 w-6 text-indigo-700" /></div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Delivery Tracker</h2>
            <p className="text-sm text-slate-500">Auto-generated tracker reports based on dispatched advice notes.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={handleReset} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
            Clear
          </button>
          {isReady && (
            <button onClick={() => fetchReport(selectedStyle, selectedSchedule)} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
              <RefreshCw className="h-4 w-4" /> Refresh
            </button>
          )}
        </div>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600"><AlertCircle className="inline h-4 w-4 mr-1" />{error}</div>}

      {/* ── Cascading Selection Scope ──────────────────────────────────────────── */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="mb-4 text-xs font-bold uppercase tracking-wider text-slate-400">Select Tracker Scope</p>
        <div className="flex flex-wrap items-end gap-4">
          <CascadeSelect 
            label="Style No *" 
            value={selectedStyle}
            onChange={v => { setSelectedStyle(v); setSelectedSchedule(''); }}
            options={styleOptions} 
            placeholder="— Select Style —"
          />
          <CascadeSelect 
            label="Schedule No (Optional)" 
            value={selectedSchedule}
            onChange={v => setSelectedSchedule(v)}
            options={scheduleOptions} 
            disabled={!selectedStyle} 
            placeholder="— All Schedules —"
          />
        </div>
      </div>

      {/* ── Loading & Empty States ────────────────────────────────────────────── */}
      {loading && <div className="py-12 text-center text-slate-400">Loading tracker report...</div>}

      {!loading && !isReady && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 py-16 text-center">
          <LayoutDashboard className="mx-auto mb-3 h-12 w-12 text-slate-300" />
          <p className="text-sm font-medium text-slate-500">Select a Style above to view the tracker.</p>
          <p className="mt-1 text-xs text-slate-400">Reports are kept hidden until explicitly selected to keep the page clean.</p>
        </div>
      )}

      {!loading && isReady && summaries.length === 0 && (
        <div className="py-12 text-center text-slate-400 border border-dashed border-slate-300 rounded-xl bg-slate-50">
          No delivery dispatch data was found for this specific Style and Schedule combination.
        </div>
      )}

      {/* ── Active Tracker Report(s) ────────────────────────────────────────── */}
      {summaries.map((summary, si) => (
        <div key={summary.storeInRecordId} className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden mb-6">
          
          {/* Tracker Header bar */}
          <div className="flex items-center justify-between bg-slate-800 px-5 py-3 text-white">
            <div className="flex items-center gap-4">
              <span className="text-sm font-bold">{summary.styleNo}</span>
              <span className="text-xs text-slate-300">{summary.customerName}</span>
              <span className="rounded bg-slate-700 px-2 py-0.5 text-xs font-medium">FPO: {summary.fpoNo || '(No Schedule)'}</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => handleSave(summary)} disabled={savingId === summary.storeInRecordId}
                className="inline-flex items-center gap-1 rounded bg-indigo-600 px-4 py-1 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors disabled:opacity-50">
                <Save className="h-3 w-3" /> {savingId === summary.storeInRecordId ? 'Saving...' : 'Save Tracker'}
              </button>
              <button onClick={() => printTracker(summary)} className="inline-flex items-center gap-1 rounded bg-slate-700 px-3 py-1 text-xs font-medium text-white hover:bg-slate-600 transition-colors">
                <Printer className="h-3 w-3" /> Print
              </button>
            </div>
          </div>

          <div className="flex flex-col md:flex-row">
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
                    <th className="border border-slate-300 px-2 py-1.5 font-bold bg-slate-200 whitespace-nowrap">SIZE TOTAL</th>
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
                      <td className="border border-slate-200 px-2 py-1">{row.scheduleNo || '-'}</td>
                      <td className="border border-slate-200 px-2 py-1 text-center font-bold">{row.fpoQty}</td>
                      
                      {/* Editable: Allowed PD */}
                      <td className="border border-slate-200 px-1 py-1 text-center">
                        <input
                          type="number"
                          value={row.allowedPd === 0 ? '' : row.allowedPd}
                          onChange={(e) => handleRowEdit(si, ri, 'allowedPd', e.target.value)}
                          className="w-12 text-center bg-transparent border-b border-dashed border-slate-300 focus:border-indigo-500 outline-none"
                        />
                      </td>

                      <td className="border border-slate-200 px-2 py-1 text-center font-medium">{row.cutNo}</td>
                      
                      {summary.allSizes.map((size) => {
                        const sd = row.sizeBreakdown.find((s) => s.size === size);
                        return [
                          <td key={`${size}`} className="border border-slate-200 px-1 py-1 text-center bg-blue-50/30 font-medium">{sd?.qty || ''}</td>,
                          <td key={`${size}-pd`} className="border border-slate-200 px-1 py-1 text-center bg-red-50/30 text-red-600 font-bold">{sd?.pd || ''}</td>,
                          <td key={`${size}-fd`} className="border border-slate-200 px-1 py-1 text-center bg-amber-50/30 text-amber-600">{sd?.fd || ''}</td>,
                        ];
                      })}

                      {/* Editable: Size Total Column */}
                      <td className="border border-slate-200 px-1 py-1 text-center font-bold bg-slate-100">
                        <input
                          type="number"
                          value={row.sizeTotal === 0 ? '' : row.sizeTotal}
                          onChange={(e) => handleRowEdit(si, ri, 'sizeTotal', e.target.value)}
                          className="w-12 text-center bg-transparent border-b border-dashed border-slate-300 focus:border-slate-500 outline-none font-bold text-slate-800"
                        />
                      </td>

                      {/* Editable: Size PD Total */}
                      <td className="border border-slate-200 px-1 py-1 text-center font-bold text-red-700 bg-slate-50">
                        <input
                          type="number"
                          value={row.sizePdTotal === 0 ? '' : row.sizePdTotal}
                          onChange={(e) => handleRowEdit(si, ri, 'sizePdTotal', e.target.value)}
                          className="w-12 text-center bg-transparent border-b border-dashed border-red-300 focus:border-red-500 outline-none font-bold text-red-700"
                        />
                      </td>

                      {/* Editable: FD Total */}
                      <td className="border border-slate-200 px-1 py-1 text-center font-bold bg-slate-50">
                        <input
                          type="number"
                          value={row.fdTotal === 0 ? '' : row.fdTotal}
                          onChange={(e) => handleRowEdit(si, ri, 'fdTotal', e.target.value)}
                          className="w-12 text-center bg-transparent border-b border-dashed border-slate-300 focus:border-slate-500 outline-none font-bold text-slate-800"
                        />
                      </td>

                      {/* Editable: Exceeded */}
                      <td className={`border border-slate-200 px-1 py-1 text-center font-black ${row.exceeded > 0 ? 'bg-red-100 text-red-800' : ''}`}>
                        <input
                          type="number"
                          value={row.exceeded === 0 ? '' : row.exceeded}
                          onChange={(e) => handleRowEdit(si, ri, 'exceeded', e.target.value)}
                          className={`w-12 text-center bg-transparent border-b border-dashed focus:border-red-500 outline-none font-black ${row.exceeded > 0 ? 'border-red-300 text-red-800' : 'border-slate-300 text-slate-400'}`}
                        />
                      </td>

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
                    {/* Sum of editable Size Totals */}
                    <td className="border border-slate-300 px-2 py-1.5 text-center font-bold bg-slate-200">
                      {summary.rows.reduce((sum, r) => sum + (r.sizeTotal || 0), 0)}
                    </td>
                    <td className="border border-slate-300 px-2 py-1.5 text-center text-red-700 bg-slate-200">{summary.grandPdTotal || ''}</td>
                    <td className="border border-slate-300 px-2 py-1.5 text-center bg-slate-200">{summary.grandFdTotal || ''}</td>
                    <td className="border border-slate-300 px-2 py-1.5 text-center bg-red-100"></td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Right summary panel */}
            <div className="w-full md:w-52 shrink-0 border-l border-slate-300 bg-slate-50 p-4 space-y-2 text-xs flex flex-col justify-center">
              <div className="flex justify-between"><span className="font-bold text-slate-600">Style #</span><span className="font-bold text-slate-900">{summary.styleNo}</span></div>
              <div className="flex justify-between"><span className="font-bold text-slate-600">FPO #</span><span className="font-medium">{summary.fpoNo || '(No Schedule)'}</span></div>
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
  summary.rows.forEach((r) => {
    let sizeCells = sizes.map(s => { 
      const d = r.sizeBreakdown.find(x => x.size === s); 
      return `<td class="sz">${d?.qty || ''}</td><td class="pd">${d?.pd || ''}</td><td class="fd">${d?.fd || ''}</td>`; 
    }).join('');
    
    let rowSizeTotal = r.sizeTotal || 0;

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
  
  let grandSizeTotal = summary.rows.reduce((sum, r) => sum + (r.sizeTotal || 0), 0);

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