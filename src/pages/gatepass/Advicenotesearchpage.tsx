// src/pages/qc/AdviceNoteSearchPage.tsx
import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Truck, ChevronDown, ChevronRight, Filter, CalendarDays, RotateCcw, Clock, Printer } from 'lucide-react'; // <-- Added Printer Icon
import { useAdviceNoteStore, AdviceNoteRecord, AdviceNoteRow } from '../../store/adviceNoteStore';

const RECENT_LIMIT = 10;

export default function AdviceNoteSearchPage() {
  const { adviceNotes, fetchAdviceNotes } = useAdviceNoteStore();
  const [filterStyle, setFilterStyle] = useState('');
  const [filterCustomer, setFilterCustomer] = useState('');
  const [filterSchedule, setFilterSchedule] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => { setIsLoading(true); try { await fetchAdviceNotes(); } catch (e) { console.error(e); } finally { setIsLoading(false); } };
    load();
  }, [fetchAdviceNotes]);

  const availableStyles = useMemo(() => {
    const map = new Map<string, { styleNo: string; customerName: string; count: number; latestDate: string }>();
    adviceNotes.forEach((n) => {
      const key = `${n.styleNo}|||${n.customerName}`;
      const ex = map.get(key);
      if (ex) { ex.count++; if ((n.deliveryDate || '') > ex.latestDate) ex.latestDate = n.deliveryDate || ''; }
      else map.set(key, { styleNo: n.styleNo, customerName: n.customerName, count: 1, latestDate: n.deliveryDate || '' });
    });
    return Array.from(map.entries()).map(([key, val]) => ({ key, ...val })).sort((a, b) => b.latestDate.localeCompare(a.latestDate));
  }, [adviceNotes]);

  const customers = useMemo(() => Array.from(new Set(adviceNotes.map((n) => n.customerName).filter(Boolean))).sort(), [adviceNotes]);
  const schedules = useMemo(() => {
    let recs = adviceNotes;
    if (filterStyle) { const [sn, cn] = filterStyle.split('|||'); recs = recs.filter((n) => n.styleNo === sn && n.customerName === cn); }
    return Array.from(new Set(recs.map((n) => n.scheduleNo).filter(Boolean))).sort();
  }, [adviceNotes, filterStyle]);

  const hasFilters = !!(filterStyle || filterCustomer || filterSchedule || filterDateFrom || filterDateTo);

  const filteredRecords = useMemo(() => {
    let recs = [...adviceNotes];
    if (filterStyle) { const [sn, cn] = filterStyle.split('|||'); recs = recs.filter((n) => n.styleNo === sn && n.customerName === cn); }
    if (filterCustomer) recs = recs.filter((n) => n.customerName === filterCustomer);
    if (filterSchedule) recs = recs.filter((n) => n.scheduleNo === filterSchedule);
    if (filterDateFrom) recs = recs.filter((n) => (n.deliveryDate || '') >= filterDateFrom);
    if (filterDateTo) recs = recs.filter((n) => (n.deliveryDate || '') <= filterDateTo);
    return recs;
  }, [adviceNotes, filterStyle, filterCustomer, filterSchedule, filterDateFrom, filterDateTo]);

  const displayRecords = useMemo(() => {
    if (!hasFilters) return [...adviceNotes].sort((a, b) => (b.deliveryDate || '').localeCompare(a.deliveryDate || '')).slice(0, RECENT_LIMIT);
    return filteredRecords;
  }, [hasFilters, adviceNotes, filteredRecords]);

  const summary = useMemo(() => ({
    total: displayRecords.length,
    totalDispatched: displayRecords.reduce((s, n) => s + n.dispatchQty, 0),
    totalBalance: displayRecords.reduce((s, n) => s + n.balanceQty, 0),
  }), [displayRecords]);

  const clearFilters = () => { setFilterStyle(''); setFilterCustomer(''); setFilterSchedule(''); setFilterDateFrom(''); setFilterDateTo(''); setExpandedId(null); };
  const activeCount = [filterStyle, filterCustomer, filterSchedule, filterDateFrom, filterDateTo].filter(Boolean).length;

  const getRows = (note: AdviceNoteRecord): AdviceNoteRow[] => {
    if (!note.rows) return [];
    return Object.values(note.rows);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-6xl space-y-6 pb-12">
      <div className="flex items-center space-x-3 border-b border-slate-200 pb-4">
        <div className="rounded-lg bg-amber-100 p-2"><Search className="h-6 w-6 text-amber-700" /></div>
        <div><h2 className="text-2xl font-bold text-slate-900">Advice Note Search</h2><p className="text-sm text-slate-500">Search gatepass advice notes by style, customer, schedule, and delivery date.</p></div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2"><Filter className="h-4 w-4 text-slate-500" /><h3 className="text-sm font-bold text-slate-700">Filters</h3>
            {activeCount > 0 && <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">{activeCount} active</span>}
          </div>
          <button onClick={clearFilters} className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${hasFilters ? 'bg-red-50 border border-red-200 text-red-700 hover:bg-red-100' : 'bg-slate-50 border border-slate-200 text-slate-400 cursor-default'}`}><RotateCcw className="h-3.5 w-3.5" />Clear All</button>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1 lg:col-span-2"><label className="block text-xs font-medium text-slate-600">Style</label>
            <select value={filterStyle} onChange={(e) => { setFilterStyle(e.target.value); setFilterSchedule(''); }} className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-colors ${filterStyle ? 'border-blue-400 bg-blue-50/50 ring-1 ring-blue-200' : 'border-slate-300 bg-white focus:ring-2 focus:ring-blue-500'}`}>
              <option value="">All Styles</option>{availableStyles.map((s) => <option key={s.key} value={s.key}>{s.styleNo} | {s.customerName} ({s.count})</option>)}
            </select>
          </div>
          <div className="space-y-1"><label className="block text-xs font-medium text-slate-600">Customer</label>
            <select value={filterCustomer} onChange={(e) => setFilterCustomer(e.target.value)} className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-colors ${filterCustomer ? 'border-blue-400 bg-blue-50/50 ring-1 ring-blue-200' : 'border-slate-300 bg-white focus:ring-2 focus:ring-blue-500'}`}>
              <option value="">All Customers</option>{customers.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="space-y-1"><label className="block text-xs font-medium text-slate-600">Schedule No</label>
            <select value={filterSchedule} onChange={(e) => setFilterSchedule(e.target.value)} className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-colors ${filterSchedule ? 'border-blue-400 bg-blue-50/50 ring-1 ring-blue-200' : 'border-slate-300 bg-white focus:ring-2 focus:ring-blue-500'}`}>
              <option value="">All Schedules</option>{schedules.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="space-y-1"><label className="block text-xs font-medium text-slate-600"><CalendarDays className="mr-1 inline h-3 w-3" />Delivery Date From</label>
            <input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-colors ${filterDateFrom ? 'border-blue-400 bg-blue-50/50 ring-1 ring-blue-200' : 'border-slate-300 bg-white focus:ring-2 focus:ring-blue-500'}`} />
          </div>
          <div className="space-y-1"><label className="block text-xs font-medium text-slate-600"><CalendarDays className="mr-1 inline h-3 w-3" />Delivery Date To</label>
            <input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-colors ${filterDateTo ? 'border-blue-400 bg-blue-50/50 ring-1 ring-blue-200' : 'border-slate-300 bg-white focus:ring-2 focus:ring-blue-500'}`} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Advice Notes" value={summary.total} /><StatCard label="Total Dispatched" value={summary.totalDispatched} color="green" /><StatCard label="Total Balance" value={summary.totalBalance} color="blue" />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50 px-6 py-3 flex items-center justify-between">
          {hasFilters ? <p className="text-sm font-medium text-slate-700">{filteredRecords.length} of {adviceNotes.length} notes</p>
            : <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-slate-400" /><p className="text-sm font-medium text-slate-700">Recent {Math.min(RECENT_LIMIT, adviceNotes.length)} of {adviceNotes.length}</p><span className="text-xs text-slate-400">(use filters to search all)</span></div>}
        </div>
        {isLoading ? <div className="py-16 text-center text-slate-400">Loading...</div>
          : displayRecords.length === 0 ? <div className="py-16 text-center text-slate-400"><Truck className="mx-auto mb-3 h-12 w-12 opacity-20" /><p>{hasFilters ? 'No notes match.' : 'No advice notes yet.'}</p></div>
          : <div className="divide-y divide-slate-100">
              {displayRecords.map((note) => {
                const isExp = expandedId === note.id;
                const rows = getRows(note);
                const totalGood = rows.reduce((s, r) => s + r.goodQty, 0);
                const totalPd = rows.reduce((s, r) => s + r.pd, 0);
                return (
                  <div key={note.id}>
                    <div className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50/50 cursor-pointer transition-colors" onClick={() => setExpandedId(isExp ? null : note.id)}>
                      {isExp ? <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" /> : <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap"><p className="font-bold text-slate-900">{note.styleNo}</p><span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-800">AD: {note.adNo}</span><span className="text-xs text-slate-500">{note.customerName}</span></div>
                        <p className="text-xs text-slate-500 mt-0.5">Sch: <span className="font-medium text-slate-700">{note.scheduleNo}</span> | Cut: <span className="font-medium text-slate-700">{note.cutNo}</span> | Delivery: <span className="font-medium text-slate-700">{note.deliveryDate}</span></p>
                      </div>
                      <div className="text-right space-y-0.5 shrink-0">
                        <div className="text-xs">Dispatch: <span className="font-bold text-emerald-600">{note.dispatchQty}</span></div>
                        <div className="text-xs">Balance: <span className="font-bold text-blue-700">{note.balanceQty}</span></div>
                        <div className="text-xs text-slate-500">{rows.length} bundle{rows.length !== 1 ? 's' : ''}</div>
                      </div>
                    </div>
                    <AnimatePresence>
                      {isExp && rows.length > 0 && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="border-t border-slate-100 bg-slate-50/50 px-6 py-4 overflow-hidden">
                          
                          {/* NEW: Action Bar with Print Feature */}
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="font-bold text-slate-800 text-sm">Advice Note Details</h4>
                            <button 
                              type="button" 
                              onClick={(e) => { e.stopPropagation(); printAdviceNote(note); }}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors shadow-sm"
                            >
                              <Printer className="h-3.5 w-3.5" /> Print Advice Note
                            </button>
                          </div>

                          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 mb-4 p-3 rounded-lg bg-white border border-slate-200">
                            <InfoField label="Attn" value={note.attn} /><InfoField label="Component" value={note.component} /><InfoField label="Prep By" value={note.prepByName} /><InfoField label="Remarks" value={note.remarks} />
                          </div>
                          <table className="w-full text-xs"><thead><tr className="bg-slate-100 text-slate-600"><th className="px-2 py-1.5 text-left">#</th><th className="px-2 py-1.5 text-left">Bundle</th><th className="px-2 py-1.5 text-left">Size</th><th className="px-2 py-1.5 text-left">Cut</th><th className="px-2 py-1.5 text-right">Pcs</th><th className="px-2 py-1.5 text-right">PD</th><th className="px-2 py-1.5 text-right">FD</th><th className="px-2 py-1.5 text-right">Good</th></tr></thead>
                            <tbody>{rows.map((r, i) => (<tr key={i} className="border-b border-slate-100"><td className="px-2 py-1">{i + 1}</td><td className="px-2 py-1 font-bold">{r.bundleNo}</td><td className="px-2 py-1">{r.size}</td><td className="px-2 py-1">{r.cutForm}</td><td className="px-2 py-1 text-right font-bold">{r.totalPcs}</td><td className="px-2 py-1 text-right text-red-600">{r.pd || '-'}</td><td className="px-2 py-1 text-right text-red-600">{r.fd || '-'}</td><td className="px-2 py-1 text-right font-bold text-emerald-700">{r.goodQty}</td></tr>))}</tbody>
                            <tfoot><tr className="bg-slate-100 font-bold"><td colSpan={4} className="px-2 py-1.5">Totals</td><td className="px-2 py-1.5 text-right">{rows.reduce((s, r) => s + r.totalPcs, 0)}</td><td className="px-2 py-1.5 text-right text-red-600">{totalPd}</td><td className="px-2 py-1.5 text-right text-red-600">{rows.reduce((s, r) => s + r.fd, 0)}</td><td className="px-2 py-1.5 text-right text-emerald-700">{totalGood}</td></tr></tfoot>
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
function InfoField({ label, value }: { label: string; value: string }) {
  return <div className="space-y-0.5"><label className="block text-[10px] font-medium uppercase tracking-wide text-slate-400">{label}</label><p className="text-sm font-medium text-slate-700">{value || '-'}</p></div>;
}

// ==========================================
// NEW: INTEGRATED PRINT ADVICE NOTE UTILITY
// ==========================================
function printAdviceNote(note: AdviceNoteRecord) {
  const rows = Object.values(note.rows || {});

  // Safe alphanumeric sorting by Cut Form, then Bundle Number sequence
  rows.sort((a, b) => {
    if (a.cutForm !== b.cutForm) return a.cutForm.localeCompare(b.cutForm, undefined, { numeric: true });
    return a.bundleNo.localeCompare(b.bundleNo, undefined, { numeric: true });
  });

  const cutGroups = new Map<string, typeof rows>();
  rows.forEach(r => {
    const key = r.cutForm;
    if (!cutGroups.has(key)) cutGroups.set(key, []);
    cutGroups.get(key)!.push(r);
  });

  const grandPcs  = rows.reduce((s, r) => s + (r.totalPcs  || 0), 0);
  const grandPd   = rows.reduce((s, r) => s + (r.pd        || 0), 0);
  const grandFd   = rows.reduce((s, r) => s + (r.fd        || 0), 0);
  const grandGood = rows.reduce((s, r) => s + (r.goodQty   || 0), 0);

  // Expanded print structure scaling parameters (Default rows padded to 28)
  const dataRowCount = rows.length + cutGroups.size;
  const minDataRows = Math.max(dataRowCount, 28);
  const blankPad = Math.max(0, minDataRows - dataRowCount);

  let tableRows = '';
  let rowNo = 1;

  cutGroups.forEach((cutRows, cutNo) => {
    const subPcs  = cutRows.reduce((s, r) => s + (r.totalPcs || 0), 0);
    const subPd   = cutRows.reduce((s, r) => s + (r.pd       || 0), 0);
    const subFd   = cutRows.reduce((s, r) => s + (r.fd       || 0), 0);
    const subGood = cutRows.reduce((s, r) => s + (r.goodQty  || 0), 0);

    cutRows.forEach(r => {
      tableRows += `<tr>
        <td>${String(rowNo++).padStart(2, '0')}</td>
        <td>${r.colour || ''}</td>
        <td><b>${r.bundleNo || ''}</b></td>
        <td>${r.size || ''}</td>
        <td>${r.cutForm || ''}</td>
        <td class="comp">${r.component || ''}</td>
        <td class="bold">${r.totalPcs || ''}</td>
        <td class="red">${r.pd || '—'}</td>
        <td class="red">${r.fd || '—'}</td>
        <td class="bold">${r.goodQty || ''}</td>
      </tr>`;
    });

    tableRows += `<tr class="sub-row">
      <td colspan="5" style="text-align:right;font-style:italic;padding-right:6px;color:#7c5d1e;">Sub-total: ${cutNo}</td>
      <td>—</td>
      <td class="bold">${subPcs}</td>
      <td class="red bold">${subPd || '—'}</td>
      <td class="red bold">${subFd || '—'}</td>
      <td class="bold" style="color:#166534;">${subGood}</td>
    </tr>`;
  });

  for (let i = 0; i < blankPad; i++) {
    tableRows += `<tr><td>${String(rowNo++).padStart(2, '0')}</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>`;
  }

  tableRows += `<tr class="total-row">
    <td colspan="6" style="text-align:right;padding-right:6px;">GRAND TOTAL</td>
    <td class="bold">${grandPcs}</td>
    <td class="red bold">${grandPd || '—'}</td>
    <td class="red bold">${grandFd || '—'}</td>
    <td class="bold" style="color:#166534;">${grandGood}</td>
  </tr>`;

  const html = `<!DOCTYPE html><html><head>
    <title>${note.adNo}</title>
    <style>
      @page { size: A4 portrait; margin: 0; }
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: Arial, sans-serif; font-size: 12px; color: #000; padding: 10mm; }
      .hdr { display: flex; justify-content: space-between; margin-bottom: 6px; }
      .hdr-left h1 { font-size: 16px; font-weight: 900; }
      .hdr-left p, .hdr-right p { margin: 2px 0; font-size: 11px; }
      .hdr-right { text-align: right; }
      .ad-block { text-align: center; margin: 8px 0; }
      .ad-no { font-size: 22px; font-weight: 900; border: 2px solid #000; padding: 4px 16px; display: inline-block; }
      .info .row { display: flex; margin: 4px 0; font-size: 12px;}
      .info .lbl { font-weight: 700; min-width: 100px; }
      .info .val { border-bottom: 1px solid #000; flex: 1; min-height: 16px; padding: 0 4px; }
      table { width: 100%; border-collapse: collapse; border: 1.5px solid #000; margin-top: 8px; }
      th, td { border: 0.5px solid #000; padding: 4px; font-size: 11px; text-align: center; height: 22px; }
      th { background: #e0e0e0; font-weight: 700; font-size: 12px;}
      .bold { font-weight: 700; }
      .red { color: #c00; }
      .comp { color: #1a6b3c; font-weight: 600; }
      .sub-row td { background: #fff8e7; font-weight: 700; border-top: 1.5px solid #d97706; border-bottom: 1.5px solid #d97706; }
      .total-row td { border-top: 2px solid #000; font-weight: 700; background: #f0f0f0; }
      .remarks { margin-top: 8px; font-size: 12px; border-top: 1px solid #000; padding-top: 5px; }
      .footer { display: flex; justify-content: space-between; margin-top: 24px; }
      .footer .sig { flex: 1; text-align: center; font-size: 12px; }
      .footer .sig .lbl { font-weight: 700; font-style: italic; margin-bottom: 24px; }
      .footer .sig .line { border-top: 1px solid #000; padding-top: 4px; margin: 0 15px; }
      @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
    </style>
    </head><body>
    <div class="hdr">
      <div class="hdr-left" style="display: flex; align-items: center; gap: 10px;">
        <img src="/logo.svg" alt="Logo" style="height: 40px; width: auto;" />
        <div><h1>COLOUR PLUS PRINTING SYSTEMS (PVT) LTD.</h1>
        <p>SCREEN PRINTERS FOR TEXTILES</p>
        <p>E-mail: colourplus@sitnet.lk</p></div>
      </div>
      <div class="hdr-right"><p>564, Athurugiriya Road, Kottawa.</p><p>Tel: 011 278 1525</p></div>
    </div>
    <div class="ad-block">
      <span style="font-size:12px;font-weight:700">AD No:</span>
      <span class="ad-no">${note.adNo}</span>
      <span style="margin-left:40px;font-size:12px"><b>Date:</b> ${note.deliveryDate}</span>
    </div>
    <div class="info">
      <div class="row"><span class="lbl">Customer:</span><span class="val">${note.customerName}</span>
      <span class="lbl" style="margin-left:20px">Attn:</span><span class="val">${note.attn}</span></div>
      <div class="row"><span class="lbl">Style #:</span><span class="val">${note.styleNo}</span></div>
      <div class="row"><span class="lbl">Address:</span><span class="val">${note.address}</span></div>
      <div class="row"><span class="lbl">Schedule No:</span><span class="val">${note.scheduleNo || ''}</span></div>
    </div>
    <table><thead><tr>
      <th style="width:24px"></th>
      <th>COLOUR</th><th>BUN NO.</th><th>SIZE</th><th>CUT FORM</th>
      <th>COMPONENT</th>
      <th>TOTAL PCS</th><th>P/D</th><th>F/D</th><th>GOOD QTY</th>
    </tr></thead><tbody>${tableRows}</tbody></table>
    <div class="remarks"><b>Remarks.</b> ${note.remarks || ''}</div>
    <div class="footer">
      <div class="sig"><div class="lbl">Received by</div><div class="line">${note.receivedByName || ''}</div></div>
      <div class="sig"><div class="lbl">Prep. & Checked by</div><div class="line">${note.prepByName || ''}</div></div>
      <div class="sig"><div class="lbl">Authorized by</div><div class="line">${note.authByName || ''}</div></div>
    </div>
    </body></html>`;

  const old = document.getElementById('gatepass-print-frame') as HTMLIFrameElement | null;
  if (old) old.remove();
  const frame = document.createElement('iframe');
  frame.id = 'gatepass-print-frame';
  frame.style.cssText = 'position:fixed;top:-10000px;left:-10000px;width:900px;height:1200px';
  document.body.appendChild(frame);
  const doc = frame.contentDocument || frame.contentWindow?.document;
  if (doc) {
    doc.open(); doc.write(html); doc.close();
    setTimeout(() => { frame.contentWindow?.print(); setTimeout(() => frame.remove(), 1000); }, 300);
  }
}