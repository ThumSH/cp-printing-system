// src/pages/qc/DeliveryTrackerPage.tsx
import { useState, useEffect, Fragment } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, Plus, Trash2, Save, FileSpreadsheet, Edit2, Zap } from 'lucide-react';

// Import ALL our connected stores
import { useAdminStore } from '../../store/adminStore';
import { useInventoryStore } from '../../store/inventoryStore';
import { useQCStore } from '../../store/qcStore';
import { useDeliveryTrackerStore, DeliveryTrackerReport, DeliveryTrackerRow, TRACKING_SIZES, SizeData } from '../../store/deliveryTrackerStore';

const INITIAL_SIZE_DATA = TRACKING_SIZES.reduce((acc, size) => {
  acc[size] = { qty: 0, pd: 0, fd: 0 };
  return acc;
}, {} as Record<string, SizeData>);

export default function DeliveryTrackerPage() {
  // Global Data
  const { approvals } = useAdminStore();
  const { storeInRecords } = useInventoryStore();
  const { cpiReports } = useQCStore();
  const { reports, addReport, updateReport, deleteReport } = useDeliveryTrackerStore();

  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Header State
  const [styleNo, setStyleNo] = useState('');
  const [fpoNo, setFpoNo] = useState(''); // Serves as Schedule No
  const [orderQty, setOrderQty] = useState<number | ''>('');
  
  // Rows State
  const [rows, setRows] = useState<DeliveryTrackerRow[]>([]);

  // --- DYNAMIC CASCADING DATABASES ---
  const availableStyles = Array.from(new Set(storeInRecords.map(r => r.styleNo)));
  const availableSchedules = styleNo 
    ? Array.from(new Set(storeInRecords.filter(r => r.styleNo === styleNo).map(r => r.scheduleNo))) 
    : [];

  // Auto-fill Order Qty when Style is selected
  useEffect(() => {
    if (styleNo && !editingId) {
      const approval = approvals.find(a => a.styleNo === styleNo);
      if (approval && approval.bulkOrderQty) {
        setOrderQty(Number(approval.bulkOrderQty));
      }
    }
  }, [styleNo, approvals, editingId]);

  // --- THE MAGIC AUTO-FETCH ENGINE ---
  const handleAutoFillData = () => {
    if (!styleNo || !fpoNo) {
      alert("Please select a Style No and FPO / Schedule No first.");
      return;
    }

    // 1. Find all Store bundles for this style and schedule
    const relevantStoreRecords = storeInRecords.filter(r => r.styleNo === styleNo && r.scheduleNo === fpoNo);
    
    // 2. Group them by Cut No
    const uniqueCuts = Array.from(new Set(relevantStoreRecords.map(r => r.cutNo)));

    // 3. Generate rows
    const generatedRows: DeliveryTrackerRow[] = uniqueCuts.map(cut => {
      const cutRecords = relevantStoreRecords.filter(r => r.cutNo === cut);
      const firstRec = cutRecords[0]; // Used for common data like colour/date
      
      const currentSizeData = JSON.parse(JSON.stringify(INITIAL_SIZE_DATA));
      let totalFpoQty = 0;

      // 4. Map Store Quantities and QC Defects
      cutRecords.forEach(rec => {
        const size = rec.size;
        // Map Store Qty (Using cutQty as it's what was processed)
        if (currentSizeData[size]) {
          currentSizeData[size].qty += rec.cutQty;
          totalFpoQty += rec.cutQty;

          // Search QC Reports for this exact bundle
          cpiReports.forEach(report => {
            Object.values(report.inspectionRows).forEach(cpiRow => {
              if (cpiRow.storeInRecordId === rec.id) {
                // PD = Defected Before, FD = Defected After
                currentSizeData[size].pd += (parseInt(cpiRow.defectedBefore) || 0);
                currentSizeData[size].fd += (parseInt(cpiRow.defectedAfter) || 0);
              }
            });
          });
        }
      });

      return {
        id: Math.random().toString(36).substr(2, 9),
        inDate: firstRec.cutInDate,
        deliveryDate: '', // Left for manual entry
        style: styleNo,
        colour: firstRec.bodyColour,
        inAd: '', // Manual
        ad: '', // Manual
        schedule: fpoNo,
        fpoQty: totalFpoQty,
        allowedPd: 0, // Manual
        cutNo: cut,
        sizeData: currentSizeData
      };
    });

    setRows(generatedRows);
  };

  // --- DYNAMIC CALCULATIONS (GRAND TOTALS) ---
  const totalFpoQty = rows.reduce((sum, r) => sum + (r.fpoQty || 0), 0);
  const totalAllowedPd = rows.reduce((sum, r) => sum + (r.allowedPd || 0), 0);

  const sizeGrandTotals = TRACKING_SIZES.reduce((acc, size) => {
    acc[size] = { qty: 0, pd: 0, fd: 0 };
    rows.forEach(r => {
      acc[size].qty += r.sizeData[size]?.qty || 0;
      acc[size].pd += r.sizeData[size]?.pd || 0;
      acc[size].fd += r.sizeData[size]?.fd || 0;
    });
    return acc;
  }, {} as Record<string, SizeData>);

  const grandSizeTotal = TRACKING_SIZES.reduce((sum, size) => sum + sizeGrandTotals[size].qty, 0);
  const grandPdTotal = TRACKING_SIZES.reduce((sum, size) => sum + sizeGrandTotals[size].pd, 0);
  const grandFdTotal = TRACKING_SIZES.reduce((sum, size) => sum + sizeGrandTotals[size].fd, 0);
  const grandExceed = grandPdTotal - totalAllowedPd;

  // Panel Summary Math
  const receivedQty = totalFpoQty; 
  const deliveredQty = grandSizeTotal;
  const balanceToRec = (Number(orderQty) || 0) - receivedQty;
  const pdPercentage = deliveredQty > 0 ? ((grandPdTotal / deliveredQty) * 100).toFixed(2) : '0.00';

  // --- MANUAL HANDLERS ---
  const handleAddRow = () => {
    const newRow: DeliveryTrackerRow = {
      id: Math.random().toString(36).substr(2, 9),
      inDate: new Date().toISOString().split('T')[0],
      deliveryDate: '', style: styleNo, colour: '', inAd: '', ad: '', schedule: fpoNo,
      fpoQty: 0, allowedPd: 0, cutNo: '',
      sizeData: JSON.parse(JSON.stringify(INITIAL_SIZE_DATA)),
    };
    setRows([...rows, newRow]);
  };

  const handleRowChange = (id: string, field: keyof DeliveryTrackerRow, value: string | number) => {
    setRows(rows.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const handleRemoveRow = (id: string) => {
    setRows(rows.filter(r => r.id !== id));
  };

  const handleSizeChange = (rowId: string, size: string, field: keyof SizeData, value: number) => {
    setRows(rows.map(r => {
      if (r.id === rowId) {
        const newSizeData = { ...r.sizeData };
        newSizeData[size] = { ...newSizeData[size], [field]: value };
        return { ...r, sizeData: newSizeData };
      }
      return r;
    }));
  };

  const handleSubmit = () => {
    if (!styleNo || !fpoNo || !orderQty || rows.length === 0) {
      alert("Please fill Style #, FPO #, Order Qty, and add at least one row.");
      return;
    }

    const report: DeliveryTrackerReport = {
      id: editingId || Math.random().toString(36).substr(2, 9),
      styleNo,
      fpoNo,
      orderQty: Number(orderQty),
      rows,
      createdAt: new Date().toISOString().split('T')[0],
    };

    if (editingId) {
      updateReport(editingId, report);
      setEditingId(null);
    } else {
      addReport(report);
    }

    setStyleNo(''); setFpoNo(''); setOrderQty(''); setRows([]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEdit = (report: DeliveryTrackerReport) => {
    setStyleNo(report.styleNo);
    setFpoNo(report.fpoNo);
    setOrderQty(report.orderQty);
    setRows(report.rows);
    setEditingId(report.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 pb-12 max-w-[1600px] mx-auto">
      
      {/* HEADER */}
      <div className="flex items-center space-x-3 border-b border-slate-200 pb-4">
        <div className="p-2 bg-indigo-100 rounded-lg"><LayoutDashboard className="w-6 h-6 text-indigo-700" /></div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">QC Delivery & Defect Tracker</h2>
          <p className="text-slate-500 text-sm">Master reconciliation sheet connected directly to Store and QC databases.</p>
        </div>
      </div>

      {/* TOP CONTROL PANEL & SUMMARY CARD */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left: Auto-Fill Info Inputs */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-800 flex items-center">
              <FileSpreadsheet className="w-5 h-5 mr-2 text-indigo-600"/> 
              {editingId ? 'Editing Tracker Report' : 'New Tracking Report'}
            </h3>
            
            {/* THE MAGIC DATA FETCH BUTTON */}
            <button 
              onClick={handleAutoFillData}
              disabled={!styleNo || !fpoNo}
              className="px-4 py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold rounded-lg flex items-center transition-colors disabled:opacity-50"
            >
              <Zap className="w-4 h-4 mr-2" /> Fetch Real Data
            </button>
          </div>
          
          <div className="grid grid-cols-3 gap-6">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-500 uppercase">Master Style #</label>
              <select value={styleNo} onChange={(e) => { setStyleNo(e.target.value); setFpoNo(''); setRows([]); }} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:border-indigo-500 font-bold text-slate-900 bg-white">
                <option value="" disabled>Select Style...</option>
                {availableStyles.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-500 uppercase">FPO / Schedule #</label>
              <select value={fpoNo} onChange={(e) => { setFpoNo(e.target.value); setRows([]); }} disabled={!styleNo} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:border-indigo-500 font-bold text-slate-900 bg-white disabled:opacity-50">
                <option value="" disabled>Select Schedule...</option>
                {availableSchedules.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-500 uppercase">Customer Order Qty</label>
              <input type="number" value={orderQty} onChange={(e) => setOrderQty(Number(e.target.value))} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:border-indigo-500 font-black text-indigo-700" placeholder="0" />
            </div>
          </div>
        </div>

        {/* Right: Summary Panel */}
        <div className="bg-slate-800 text-white p-6 rounded-xl shadow-lg border-b-4 border-indigo-500 flex flex-col justify-between">
          <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 border-b border-slate-700 pb-2 mb-4">Delivery Summary</h3>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <div className="text-slate-400">Style #:</div><div className="font-bold text-right">{styleNo || '-'}</div>
            <div className="text-slate-400">FPO #:</div><div className="font-bold text-right">{fpoNo || '-'}</div>
            <div className="text-slate-400">Order Qty:</div><div className="font-bold text-right text-indigo-300">{orderQty || 0}</div>
            
            <div className="col-span-2 my-1 border-b border-slate-700"></div>
            
            <div className="text-slate-400">Received Qty:</div><div className="font-bold text-right">{receivedQty}</div>
            <div className="text-slate-400">Delivered Qty:</div><div className="font-bold text-right">{deliveredQty}</div>
            <div className="text-slate-400">Balance to Rec:</div>
            <div className={`font-bold text-right ${balanceToRec > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {balanceToRec}
            </div>
            
            <div className="col-span-2 my-1 border-b border-slate-700"></div>
            
            <div className="text-slate-400 font-bold">PD TOTAL:</div><div className="font-black text-right text-red-400 text-lg">{grandPdTotal}</div>
            <div className="text-slate-400 font-bold">PD %:</div><div className="font-black text-right text-red-400 text-lg">{pdPercentage}%</div>
          </div>
        </div>
      </div>

      {/* --- THE MASSIVE DATA GRID --- */}
      <div className="bg-white border border-slate-300 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-300 flex justify-between items-center">
          <h3 className="font-bold text-slate-800">Batch Control Grid</h3>
          <button onClick={handleAddRow} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-bold rounded-lg shadow-sm flex items-center transition-colors">
            <Plus className="w-4 h-4 mr-2" /> Add Manual Cut
          </button>
        </div>
        
        <div className="overflow-x-auto w-full pb-4">
          <table className="w-full border-collapse text-[11px] whitespace-nowrap min-w-max">
            <thead>
              {/* TOP HEADER TIER */}
              <tr className="bg-slate-200 text-slate-800 divide-x divide-slate-300 border-b border-slate-400">
                <th colSpan={10} className="px-2 py-2 font-black text-center bg-slate-300">BATCH IDENTIFICATION & PLANNING</th>
                {TRACKING_SIZES.map(size => (
                  <th key={size} colSpan={3} className="px-2 py-2 font-black text-center border-l-2 border-slate-400">{size}</th>
                ))}
                <th colSpan={4} className="px-2 py-2 font-black text-center bg-slate-300 border-l-2 border-slate-400">ROW TOTALS</th>
                <th className="px-2 py-2 bg-slate-300"></th>
              </tr>
              
              {/* SUB HEADER TIER */}
              <tr className="bg-slate-100 text-slate-600 divide-x divide-slate-300 border-b-2 border-slate-400">
                <th className="px-2 py-1.5 font-bold">In Date</th>
                <th className="px-2 py-1.5 font-bold">Del Date</th>
                <th className="px-2 py-1.5 font-bold">Style</th>
                <th className="px-2 py-1.5 font-bold">Colour</th>
                <th className="px-2 py-1.5 font-bold">IN AD</th>
                <th className="px-2 py-1.5 font-bold">AD</th>
                <th className="px-2 py-1.5 font-bold">Schedule</th>
                <th className="px-2 py-1.5 font-bold text-indigo-700">FPO QTY</th>
                <th className="px-2 py-1.5 font-bold text-indigo-700">Allow PD</th>
                <th className="px-2 py-1.5 font-bold text-indigo-700">Cut No</th>
                
                {/* Size Sub-headers mapping */}
                {TRACKING_SIZES.map(size => (
                  <Fragment key={size}>
                    <th className="px-2 py-1.5 font-bold border-l-2 border-slate-400 w-16">QTY</th>
                    <th className="px-2 py-1.5 font-bold text-pink-700 bg-pink-50 w-12">PD</th>
                    <th className="px-2 py-1.5 font-bold text-blue-700 bg-blue-50 w-12">FD</th>
                  </Fragment>
                ))}

                <th className="px-2 py-1.5 font-black border-l-2 border-slate-400">SIZE TOT</th>
                <th className="px-2 py-1.5 font-black text-red-600">PD TOT</th>
                <th className="px-2 py-1.5 font-black text-red-600">FD TOT</th>
                <th className="px-2 py-1.5 font-black">EXCEED</th>
                <th className="px-2 py-1.5">Del</th>
              </tr>
            </thead>
            
            <tbody className="divide-y divide-slate-300">
              {rows.map((row) => {
                let rowSizeTot = 0, rowPdTot = 0, rowFdTot = 0;
                TRACKING_SIZES.forEach(s => {
                  rowSizeTot += row.sizeData[s].qty;
                  rowPdTot += row.sizeData[s].pd;
                  rowFdTot += row.sizeData[s].fd;
                });
                const rowExceed = rowPdTot - row.allowedPd;

                return (
                  <tr key={row.id} className="hover:bg-indigo-50/20 divide-x divide-slate-300 transition-colors">
                    {/* Identifier Inputs */}
                    <td className="p-0"><input type="date" value={row.inDate} onChange={e => handleRowChange(row.id, 'inDate', e.target.value)} className="w-24 p-1.5 bg-transparent outline-none" /></td>
                    <td className="p-0"><input type="date" value={row.deliveryDate} onChange={e => handleRowChange(row.id, 'deliveryDate', e.target.value)} className="w-24 p-1.5 bg-transparent outline-none focus:bg-white" /></td>
                    <td className="p-0"><input type="text" value={row.style} onChange={e => handleRowChange(row.id, 'style', e.target.value)} className="w-20 p-1.5 bg-transparent outline-none font-bold" /></td>
                    <td className="p-0"><input type="text" value={row.colour} onChange={e => handleRowChange(row.id, 'colour', e.target.value)} className="w-20 p-1.5 bg-transparent outline-none text-slate-600" /></td>
                    <td className="p-0"><input type="text" value={row.inAd} onChange={e => handleRowChange(row.id, 'inAd', e.target.value)} className="w-24 p-1.5 bg-transparent outline-none focus:bg-white" /></td>
                    <td className="p-0"><input type="text" value={row.ad} onChange={e => handleRowChange(row.id, 'ad', e.target.value)} className="w-24 p-1.5 bg-transparent outline-none focus:bg-white" /></td>
                    <td className="p-0"><input type="text" value={row.schedule} onChange={e => handleRowChange(row.id, 'schedule', e.target.value)} className="w-24 p-1.5 bg-transparent outline-none" /></td>
                    <td className="p-0 bg-indigo-50/30"><input type="number" value={row.fpoQty || ''} onChange={e => handleRowChange(row.id, 'fpoQty', parseInt(e.target.value)||0)} className="w-16 p-1.5 bg-transparent outline-none text-center font-bold text-indigo-700" placeholder="0"/></td>
                    <td className="p-0 bg-amber-50/50"><input type="number" value={row.allowedPd || ''} onChange={e => handleRowChange(row.id, 'allowedPd', parseInt(e.target.value)||0)} className="w-16 p-1.5 bg-transparent outline-none text-center font-bold text-amber-700 focus:bg-white" placeholder="0"/></td>
                    <td className="p-0 bg-indigo-50/30"><input type="text" value={row.cutNo} onChange={e => handleRowChange(row.id, 'cutNo', e.target.value)} className="w-16 p-1.5 bg-transparent outline-none text-center font-bold text-indigo-700" /></td>

                    {/* Size Inputs mapping */}
                    {TRACKING_SIZES.map(size => (
                      <Fragment key={size}>
                        <td className="p-0 border-l-2 border-slate-400">
                          <input type="number" value={row.sizeData[size].qty || ''} onChange={e => handleSizeChange(row.id, size, 'qty', parseInt(e.target.value)||0)} className="w-16 p-1.5 bg-transparent outline-none text-center font-semibold focus:bg-slate-100" placeholder="0" />
                        </td>
                        <td className="p-0 bg-pink-50/50">
                          <input type="number" value={row.sizeData[size].pd || ''} onChange={e => handleSizeChange(row.id, size, 'pd', parseInt(e.target.value)||0)} className="w-12 p-1.5 bg-transparent outline-none text-center font-bold text-pink-700 focus:bg-pink-100" placeholder="0" />
                        </td>
                        <td className="p-0 bg-blue-50/50">
                          <input type="number" value={row.sizeData[size].fd || ''} onChange={e => handleSizeChange(row.id, size, 'fd', parseInt(e.target.value)||0)} className="w-12 p-1.5 bg-transparent outline-none text-center font-bold text-blue-700 focus:bg-blue-100" placeholder="0" />
                        </td>
                      </Fragment>
                    ))}

                    <td className="px-2 py-1.5 text-center font-black bg-slate-100 border-l-2 border-slate-400">{rowSizeTot}</td>
                    <td className="px-2 py-1.5 text-center font-bold text-red-600 bg-red-50/50">{rowPdTot}</td>
                    <td className="px-2 py-1.5 text-center font-bold text-red-600 bg-red-50/50">{rowFdTot}</td>
                    <td className={`px-2 py-1.5 text-center font-black ${rowExceed > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{rowExceed}</td>
                    
                    <td className="px-2 py-1.5 text-center">
                      <button onClick={() => handleRemoveRow(row.id)} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4"/></button>
                    </td>
                  </tr>
                );
              })}

              {rows.length === 0 && (
                <tr><td colSpan={36} className="p-8 text-center text-slate-400">Click <span className="font-bold text-emerald-600 px-2 py-1 bg-emerald-50 rounded">Fetch Real Data</span> above to auto-populate this grid based on Store and QC logs.</td></tr>
              )}
            </tbody>

            {/* GRAND TOTALS FOOTER */}
            {rows.length > 0 && (
              <tfoot className="bg-slate-800 text-white font-black divide-x divide-slate-600">
                <tr>
                  <td colSpan={7} className="px-4 py-2 text-right uppercase tracking-widest text-slate-300">Grand Totals:</td>
                  <td className="px-2 py-2 text-center text-indigo-300">{totalFpoQty}</td>
                  <td className="px-2 py-2 text-center text-indigo-300">{totalAllowedPd}</td>
                  <td className="px-2 py-2"></td>
                  
                  {TRACKING_SIZES.map(size => (
                    <Fragment key={`tot-${size}`}>
                      <td className="px-2 py-2 text-center border-l-2 border-slate-500">{sizeGrandTotals[size].qty}</td>
                      <td className="px-2 py-2 text-center text-pink-300 bg-pink-900/30">{sizeGrandTotals[size].pd}</td>
                      <td className="px-2 py-2 text-center text-blue-300 bg-blue-900/30">{sizeGrandTotals[size].fd}</td>
                    </Fragment>
                  ))}

                  <td className="px-2 py-2 text-center border-l-2 border-slate-500">{grandSizeTotal}</td>
                  <td className="px-2 py-2 text-center text-red-400">{grandPdTotal}</td>
                  <td className="px-2 py-2 text-center text-red-400">{grandFdTotal}</td>
                  <td className={`px-2 py-2 text-center ${grandExceed > 0 ? 'text-red-400' : 'text-emerald-400'}`}>{grandExceed}</td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        <div className="p-4 bg-slate-100 flex justify-end space-x-3 border-t border-slate-300">
          <button onClick={handleSubmit} className="px-8 py-2.5 bg-indigo-600 text-white rounded shadow-md hover:bg-indigo-700 font-bold text-sm flex items-center">
            <Save className="w-4 h-4 mr-2" /> {editingId ? 'UPDATE TRACKER' : 'SAVE TRACKER REPORT'}
          </button>
        </div>
      </div>

      {/* --- ARCHIVE TABLE --- */}
      {reports.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mt-12">
          <div className="p-4 border-b border-slate-200 bg-slate-50">
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Tracker Archive</h3>
          </div>
          <div className="overflow-x-auto">
             <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-white text-slate-500 border-b border-slate-200 text-xs uppercase">
                <tr>
                  <th className="px-6 py-3 font-semibold">Date / Style</th>
                  <th className="px-6 py-3 font-semibold">FPO & Order Qty</th>
                  <th className="px-6 py-3 font-semibold">Batches Logged</th>
                  <th className="px-6 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <AnimatePresence>
                  {reports.map((report) => (
                    <motion.tr key={report.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <p className="font-medium text-slate-500 text-xs">{report.createdAt}</p>
                        <p className="font-bold text-slate-900 text-lg">{report.styleNo}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-bold text-indigo-700">FPO: {report.fpoNo}</p>
                        <p className="text-xs text-slate-600 mt-0.5">Target: {report.orderQty} pcs</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full font-bold text-xs">{report.rows.length} Cuts Logged</span>
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <button onClick={() => handleEdit(report)} className="p-2 text-blue-600 hover:bg-blue-50 rounded" title="Edit Report"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => deleteReport(report.id)} className="p-2 text-red-600 hover:bg-red-50 rounded" title="Delete Report"><Trash2 className="w-4 h-4" /></button>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </motion.div>
  );
}