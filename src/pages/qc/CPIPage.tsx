// src/pages/qc/CPIPage.tsx
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ClipboardList, Save, Edit2, FileText } from 'lucide-react';
import { useDevelopmentStore } from '../../store/developmentStore';
import { useInventoryStore } from '../../store/inventoryStore';
import { useQCStore, CPIReport, CPIRowData } from '../../store/qcStore';

const DEFECT_ROWS = [
  'Cut panel Check List', 'F1  Panel Shrinkage', 'F2  Fabric colour variation',
  'F3  Crush mark', 'F4  Shape out panel', 'F5  Dust mark',
  'F6  Stain marks / Oil marks', 'F7  Cut holes', 'F8  Needle marks',
  'F9  Incorrect part', 'F10 Numbering stickers missing', 'F11 Numbering stickers mixed-up',
  'F12 Size mixed-up', 'F13 Wrong Cut Mark', 'Other',
];

export default function CPIPage() {
  const { jobs } = useDevelopmentStore();
  const { storeInRecords } = useInventoryStore();
  const { cpiReports, addCPIReport, updateCPIReport } = useQCStore();

  const todayDate = new Date().toISOString().split('T')[0];

  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('');
  const [selectedSchedule, setSelectedSchedule] = useState('');
  
  const [inspectionRows, setInspectionRows] = useState<Record<string, CPIRowData>>({});
  
  // NEW: State for the bottom summary section
  const [summaryData, setSummaryData] = useState({
    appRej: '',
    checkedBy: '',
    summaryDate: todayDate,
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // --- DYNAMIC CASCADING DATA ---
  const stylesInStore = Array.from(new Set(storeInRecords.map(r => r.styleNo)));
  const uniqueCustomers = Array.from(new Set(jobs.filter(j => stylesInStore.includes(j.styleNo)).map(j => j.customer)));
  const availableStyles = selectedCustomer ? jobs.filter(j => j.customer === selectedCustomer && stylesInStore.includes(j.styleNo)).map(j => j.styleNo) : [];
  const availableSchedules = selectedStyle ? Array.from(new Set(storeInRecords.filter(r => r.styleNo === selectedStyle).map(r => r.scheduleNo))) : [];

  // --- AUTO-FILLED HEADER DATA ---
  const activeJob = jobs.find(j => j.styleNo === selectedStyle);
  const activeStoreRecords = storeInRecords.filter(r => r.styleNo === selectedStyle && r.scheduleNo === selectedSchedule);
  
  const receivedQty = activeStoreRecords.reduce((sum, r) => sum + r.inQty, 0);
  const cpiQty = activeStoreRecords.reduce((sum, r) => sum + r.cutQty, 0);

  // --- AUTO-CALCULATED SUMMARY MATH ---
  let checkedQty = 0;
  let rejDamageQty = 0;
  
  Object.entries(inspectionRows).forEach(([key, row]) => {
    if (key.endsWith('-base')) {
      checkedQty += parseInt(row.sampleSize || '0') || 0;
    }
    rejDamageQty += (parseInt(row.defectedBefore || '0') || 0) + (parseInt(row.defectedAfter || '0') || 0);
  });

  const rejectionPercentage = checkedQty > 0 ? ((rejDamageQty / checkedQty) * 100).toFixed(2) : '0.00';
  const balanceQty = Math.max(0, cpiQty - rejDamageQty);

  // --- GENERATE TABLE ROWS ---
  useEffect(() => {
    if (selectedSchedule && activeStoreRecords.length > 0 && !editingId) {
      const initialRows: Record<string, CPIRowData> = {};
      activeStoreRecords.forEach(record => {
        initialRows[`${record.id}-base`] = { storeInRecordId: record.id, part: '', sampleSize: '', defectedBefore: '', defectedAfter: '', remarks: '' };
        DEFECT_ROWS.forEach((_, index) => {
          initialRows[`${record.id}-${index}`] = { storeInRecordId: record.id, part: '', sampleSize: '', defectedBefore: '', defectedAfter: '', remarks: '' };
        });
      });
      setInspectionRows(initialRows);
      setErrors({});
    } else if (!editingId) {
      setInspectionRows({});
    }
  }, [selectedSchedule, storeInRecords]);

  // --- HANDLERS ---
  const handleDropdownChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'customer') { setSelectedCustomer(value); setSelectedStyle(''); setSelectedSchedule(''); } 
    else if (name === 'styleNo') { setSelectedStyle(value); setSelectedSchedule(''); } 
    else if (name === 'scheduleNo') { setSelectedSchedule(value); }
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleRowInputChange = (recordId: string, field: keyof CPIRowData, value: string) => {
    setInspectionRows(prev => ({ ...prev, [recordId]: { ...(prev[recordId] || {}), [field]: value } }));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!selectedCustomer) newErrors.customer = 'Required';
    if (!selectedStyle) newErrors.styleNo = 'Required';
    if (!selectedSchedule) newErrors.scheduleNo = 'Required';
    if (!summaryData.appRej) newErrors.appRej = 'Final decision required';
    if (!summaryData.checkedBy.trim()) newErrors.checkedBy = 'Signature required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      alert("Please complete the required summary fields at the bottom (App/Rej & Checked By).");
      return;
    }

    const report: CPIReport = {
      id: editingId || Math.random().toString(36).substr(2, 9),
      date: todayDate,
      customer: selectedCustomer,
      styleNo: selectedStyle,
      scheduleNo: selectedSchedule,
      bodyColour: activeJob?.bodyColour || '',
      printColour: activeJob?.printColour || '',
      receivedQty,
      cpiQty,
      inspectionRows,
      // Save the calculated summary metrics
      cuttingQty: cpiQty,
      checkedQty,
      rejDamageQty,
      rejectionPercentage,
      balanceQty,
      appRej: summaryData.appRej,
      checkedBy: summaryData.checkedBy,
      summaryDate: summaryData.summaryDate,
    };

    if (editingId) {
      updateCPIReport(editingId, report);
      setEditingId(null);
    } else {
      addCPIReport(report);
    }

    // Reset Form
    setSelectedCustomer(''); setSelectedStyle(''); setSelectedSchedule('');
    setInspectionRows({});
    setSummaryData({ appRej: '', checkedBy: '', summaryDate: todayDate });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEdit = (report: CPIReport) => {
    setSelectedCustomer(report.customer);
    setSelectedStyle(report.styleNo);
    setSelectedSchedule(report.scheduleNo);
    setInspectionRows(report.inspectionRows);
    setSummaryData({
      appRej: report.appRej,
      checkedBy: report.checkedBy,
      summaryDate: report.summaryDate,
    });
    setEditingId(report.id);
    setErrors({});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 pb-12 max-w-350 mx-auto">
      
      {/* PAGE TITLE */}
      <div className="flex items-center space-x-3 border-b border-slate-200 pb-4">
        <div className="p-2 bg-indigo-100 rounded-lg"><ClipboardList className="w-6 h-6 text-indigo-700" /></div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">QC Inspection (C.P.I)</h2>
          <p className="text-slate-500 text-sm">Digitized Cut Panel Inspection Report Form.</p>
        </div>
      </div>

      <div className="bg-white shadow-xl border border-slate-300 mx-auto overflow-hidden">
        <form onSubmit={handleSubmit} noValidate>
          
          {/* HEADER BLOCK */}
          <div className="border-b-4 border-slate-800">
            <div className="bg-slate-800 text-white text-center py-3">
              <h3 className="text-xl font-black tracking-widest uppercase">{editingId ? 'Editing CPI Report' : 'Cut Panel Inspection Report'}</h3>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-slate-300 bg-slate-50">
              <div className="p-3">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Date</label>
                <div className="text-sm font-semibold text-slate-900">{todayDate}</div>
              </div>
              <div className="p-3">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Customer <span className="text-red-500">*</span></label>
                <select name="customer" value={selectedCustomer} onChange={handleDropdownChange} className="w-full bg-transparent border-b border-slate-300 outline-none text-sm font-semibold text-slate-900 pb-1 focus:border-indigo-600">
                  <option value="" disabled>Select Customer</option>
                  {uniqueCustomers.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="p-3">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Style No <span className="text-red-500">*</span></label>
                <select name="styleNo" value={selectedStyle} onChange={handleDropdownChange} disabled={!selectedCustomer} className="w-full bg-transparent border-b border-slate-300 outline-none text-sm font-semibold text-slate-900 pb-1 focus:border-indigo-600 disabled:opacity-50">
                  <option value="" disabled>Select Style</option>
                  {availableStyles.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="p-3">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Schedule No <span className="text-red-500">*</span></label>
                <select name="scheduleNo" value={selectedSchedule} onChange={handleDropdownChange} disabled={!selectedStyle} className="w-full bg-transparent border-b border-slate-300 outline-none text-sm font-bold text-indigo-700 pb-1 focus:border-indigo-600 disabled:opacity-50">
                  <option value="" disabled>Select Schedule</option>
                  {availableSchedules.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-slate-300 border-t border-slate-300 bg-white">
              <div className="p-3">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Body Colour</label>
                <div className="text-sm font-medium text-slate-700">{activeJob?.bodyColour || '-'}</div>
              </div>
              <div className="p-3">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Print Colour</label>
                <div className="text-sm font-medium text-slate-700">{activeJob?.printColour || '-'}</div>
              </div>
              <div className="p-3 bg-slate-100">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Received Qty (IN)</label>
                <div className="text-sm font-bold text-slate-900">{selectedSchedule ? receivedQty : '-'}</div>
              </div>
              <div className="p-3 bg-indigo-50">
                <label className="block text-[10px] font-bold text-indigo-500 uppercase tracking-wide mb-1">C.P.I Qty</label>
                <div className="text-sm font-bold text-indigo-700">{selectedSchedule ? cpiQty : '-'}</div>
              </div>
            </div>
          </div>

          {/* EXACT TABLE STRUCTURE */}
          <div className="overflow-x-auto w-full">
            {selectedSchedule && activeStoreRecords.length > 0 ? (
              <table className="w-full border-collapse text-[12px] border-b-2 border-slate-800">
                <thead>
                  <tr className="bg-slate-200 border-b border-slate-800 text-slate-800">
                    <th className="border-r border-slate-800 px-2 py-2 font-bold text-center w-15">Cut No</th>
                    <th className="border-r border-slate-800 px-2 py-2 font-bold text-center w-15">Qty</th>
                    <th className="border-r border-slate-800 px-2 py-2 font-bold text-center w-20">Bundle No</th>
                    <th className="border-r border-slate-800 px-2 py-2 font-bold text-center w-15">Size</th>
                    <th className="border-r border-slate-800 px-2 py-2 font-bold text-center w-20">Range</th>
                    <th className="border-r border-slate-800 px-2 py-2 font-bold text-center w-25">Part</th>
                    <th className="border-r border-slate-800 px-2 py-2 font-bold text-center w-20">Sample Size</th>
                    <th className="border-r border-slate-800 px-2 py-2 font-bold text-left min-w-50">Defect Type</th>
                    <th className="border-r border-slate-800 px-2 py-2 font-bold text-center w-22.5 bg-slate-300">Before Process</th>
                    <th className="border-r border-slate-800 px-2 py-2 font-bold text-center w-22.5 bg-slate-300">After Process</th>
                    <th className="border-r border-slate-800 px-2 py-2 font-bold text-center w-15 text-red-700">Total</th>
                    <th className="border-r border-slate-800 px-2 py-2 font-bold text-center w-12.5 text-red-700">%</th>
                    <th className="px-2 py-2 font-bold text-center min-w-37.5">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300">
                  {activeStoreRecords.map((record) => {
                    return DEFECT_ROWS.map((defect, index) => {
                      const isFirst = index === 0;
                      const baseKey = `${record.id}-base`;
                      const rowKey = `${record.id}-${index}`;
                      const sampleSize = parseInt(inspectionRows[baseKey]?.sampleSize || '0') || 0;
                      const beforeQty = parseInt(inspectionRows[rowKey]?.defectedBefore || '0') || 0;
                      const afterQty = parseInt(inspectionRows[rowKey]?.defectedAfter || '0') || 0;
                      const totalDefects = beforeQty + afterQty;
                      const percentage = sampleSize > 0 ? Math.round((totalDefects / sampleSize) * 100) : 0;

                      return (
                        <tr key={rowKey} className={`hover:bg-indigo-50/20 ${isFirst ? 'border-t-2 border-slate-800' : ''}`}>
                          {isFirst && (
                            <>
                              <td rowSpan={DEFECT_ROWS.length} className="border-r border-slate-800 px-2 py-1 text-center font-bold bg-slate-50 align-top">{record.cutNo}</td>
                              <td rowSpan={DEFECT_ROWS.length} className="border-r border-slate-800 px-2 py-1 text-center align-top">{record.cutQty}</td>
                              <td rowSpan={DEFECT_ROWS.length} className="border-r border-slate-800 px-2 py-1 text-center font-semibold align-top">{record.bundleQty}</td>
                              <td rowSpan={DEFECT_ROWS.length} className="border-r border-slate-800 px-2 py-1 text-center font-bold align-top">{record.size}</td>
                              <td rowSpan={DEFECT_ROWS.length} className="border-r border-slate-800 px-2 py-1 text-center text-[10px] text-slate-500 align-top">{record.numberRange}</td>
                              <td rowSpan={DEFECT_ROWS.length} className="border-r border-slate-800 p-0 align-top bg-white focus-within:bg-indigo-50">
                                <textarea value={inspectionRows[baseKey]?.part || ''} onChange={(e) => handleRowInputChange(baseKey, 'part', e.target.value)} className="w-full h-full min-h-25 p-2 bg-transparent outline-none resize-none text-center" placeholder="Enter Part..." />
                              </td>
                              <td rowSpan={DEFECT_ROWS.length} className="border-r border-slate-800 p-0 align-top bg-white focus-within:bg-indigo-50">
                                <input type="number" value={inspectionRows[baseKey]?.sampleSize || ''} onChange={(e) => handleRowInputChange(baseKey, 'sampleSize', e.target.value)} className="w-full h-full p-2 bg-transparent outline-none text-center font-bold text-indigo-700" placeholder="Qty" />
                              </td>
                            </>
                          )}
                          <td className="border-r border-slate-800 px-2 py-1 text-left font-medium text-slate-700 bg-slate-50/50">{defect}</td>
                          <td className="border-r border-slate-800 p-0"><input type="number" value={inspectionRows[rowKey]?.defectedBefore || ''} onChange={(e) => handleRowInputChange(rowKey, 'defectedBefore', e.target.value)} className="w-full p-1.5 bg-transparent outline-none text-center focus:bg-indigo-50" /></td>
                          <td className="border-r border-slate-800 p-0"><input type="number" value={inspectionRows[rowKey]?.defectedAfter || ''} onChange={(e) => handleRowInputChange(rowKey, 'defectedAfter', e.target.value)} className="w-full p-1.5 bg-transparent outline-none text-center focus:bg-indigo-50" /></td>
                          <td className="border-r border-slate-800 px-2 py-1 text-center font-bold text-red-600 bg-red-50/30">{totalDefects > 0 ? totalDefects : ''}</td>
                          <td className="border-r border-slate-800 px-2 py-1 text-center font-bold text-red-600 bg-red-50/30">{totalDefects > 0 ? `${percentage}%` : ''}</td>
                          <td className="p-0"><input type="text" value={inspectionRows[rowKey]?.remarks || ''} onChange={(e) => handleRowInputChange(rowKey, 'remarks', e.target.value)} className="w-full p-1.5 bg-transparent outline-none focus:bg-indigo-50" /></td>
                        </tr>
                      );
                    });
                  })}
                </tbody>
              </table>
            ) : (
              <div className="p-12 text-center text-slate-400 bg-slate-50"><FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />Select a Customer, Style, and Schedule to generate the physical report grid.</div>
            )}
          </div>

          {/* --- NEW: SUMMARY SECTION (PAPER-LIKE UI) --- */}
          {selectedSchedule && activeStoreRecords.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 p-8 bg-white border-x-2 border-slate-800">
              
              {/* Left Column: Math & Quantities */}
              <div className="space-y-3">
                <div className="flex items-end">
                  <span className="w-48 font-bold text-slate-800 text-sm">Cutting Qty</span>
                  <span className="flex-1 border-b border-slate-400 border-dashed font-semibold text-slate-700 pb-1 text-center bg-slate-50">{cpiQty}</span>
                </div>
                <div className="flex items-end">
                  <span className="w-48 font-bold text-slate-800 text-sm">Received Qty</span>
                  <span className="flex-1 border-b border-slate-400 border-dashed font-semibold text-slate-700 pb-1 text-center bg-slate-50">{receivedQty}</span>
                </div>
                <div className="flex items-end">
                  <span className="w-48 font-bold text-slate-800 text-sm">Checked Qty</span>
                  <span className="flex-1 border-b border-slate-400 border-dashed font-bold text-indigo-700 pb-1 text-center bg-indigo-50">{checkedQty}</span>
                </div>
                <div className="flex items-end">
                  <span className="w-48 font-bold text-slate-800 text-sm">Rej / Damage Qty</span>
                  <span className="flex-1 border-b border-slate-400 border-dashed font-bold text-red-600 pb-1 text-center bg-red-50">{rejDamageQty}</span>
                </div>
                <div className="flex items-end">
                  <span className="w-48 font-bold text-slate-800 text-sm">Rejection %</span>
                  <span className="flex-1 border-b border-slate-400 border-dashed font-bold text-red-600 pb-1 text-center bg-red-50">{rejectionPercentage}%</span>
                </div>
                <div className="flex items-end">
                  <span className="w-48 font-bold text-slate-800 text-sm">Balance Qty</span>
                  <span className="flex-1 border-b border-slate-400 border-dashed font-black text-emerald-600 pb-1 text-center bg-emerald-50">{balanceQty}</span>
                </div>
              </div>

              {/* Right Column: Signatures & Decisions */}
              <div className="space-y-6 pt-4 md:pt-0">
                <div className="flex items-end">
                  <span className="w-32 font-bold text-slate-800 text-sm">App/Rej <span className="text-red-500">*</span></span>
                  <div className="flex-1 border-b border-slate-400 border-dashed pb-1">
                    <select 
                      value={summaryData.appRej} 
                      onChange={(e) => setSummaryData({...summaryData, appRej: e.target.value})} 
                      className={`w-full bg-transparent outline-none text-sm font-bold text-center ${errors.appRej ? 'text-red-600' : 'text-slate-900'}`}
                    >
                      <option value="" disabled>Select Decision...</option>
                      <option value="Approved">Approved</option>
                      <option value="Rejected">Rejected</option>
                    </select>
                  </div>
                </div>
                <div className="flex items-end">
                  <span className="w-32 font-bold text-slate-800 text-sm">Checked By <span className="text-red-500">*</span></span>
                  <input 
                    type="text" 
                    value={summaryData.checkedBy} 
                    onChange={(e) => setSummaryData({...summaryData, checkedBy: e.target.value})} 
                    className={`flex-1 border-b border-slate-400 border-dashed pb-1 outline-none text-sm bg-transparent font-semibold text-center ${errors.checkedBy ? 'border-red-400 placeholder-red-300' : ''}`}
                    placeholder="Inspector Name / Signature"
                  />
                </div>
                <div className="flex items-end">
                  <span className="w-32 font-bold text-slate-800 text-sm">Date</span>
                  <input 
                    type="date" 
                    value={summaryData.summaryDate} 
                    onChange={(e) => setSummaryData({...summaryData, summaryDate: e.target.value})} 
                    className="flex-1 border-b border-slate-400 border-dashed pb-1 outline-none text-sm bg-transparent font-semibold text-center text-slate-600" 
                  />
                </div>
              </div>
            </div>
          )}

          <div className="p-4 bg-slate-100 flex justify-end space-x-3 border-t-2 border-slate-800">
            {editingId && (
              <button type="button" onClick={() => { setEditingId(null); setSelectedSchedule(''); }} className="px-4 py-2 border border-slate-300 bg-white text-slate-700 rounded shadow-sm hover:bg-slate-50 font-medium text-sm">Cancel Edit</button>
            )}
            <button onClick={handleSubmit} disabled={!selectedSchedule || activeStoreRecords.length === 0} className="px-8 py-2 bg-slate-800 text-white rounded shadow-md hover:bg-slate-900 font-bold text-sm flex items-center disabled:opacity-50">
               <Save className="w-4 h-4 mr-2" /> {editingId ? 'UPDATE REPORT' : 'SUBMIT REPORT'}
            </button>
          </div>
        </form>
      </div>

      {/* --- HISTORY TABLE --- */}
      {cpiReports.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mt-12">
          <div className="p-4 border-b border-slate-200 bg-slate-50">
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">QC Report Archive</h3>
          </div>
          <div className="overflow-x-auto">
             <table className="w-full text-left text-sm whitespace-nowrap min-w-max">
              <thead className="bg-white text-slate-500 border-b border-slate-200 text-xs uppercase">
                <tr>
                  <th className="px-6 py-3 font-semibold">Report Date</th>
                  <th className="px-6 py-3 font-semibold">Customer & Style</th>
                  <th className="px-6 py-3 font-semibold">Schedule No</th>
                  <th className="px-6 py-3 font-semibold">Final Decision</th>
                  <th className="px-6 py-3 font-semibold">QC Summary</th>
                  <th className="px-6 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <AnimatePresence>
                  {cpiReports.map((report) => (
                    <motion.tr key={report.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-700">{report.date}</td>
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-900">{report.styleNo}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{report.customer}</p>
                      </td>
                      <td className="px-6 py-4 font-bold text-indigo-700">{report.scheduleNo}</td>
                      
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${report.appRej === 'Approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                          {report.appRej}
                        </span>
                        <p className="text-[10px] text-slate-500 mt-1.5">By: {report.checkedBy}</p>
                      </td>

                      <td className="px-6 py-4">
                        <div className="text-xs text-slate-600 space-y-0.5">
                          <p>Checked: <span className="font-bold">{report.checkedQty}</span></p>
                          <p>Defects: <span className="font-bold text-red-600">{report.rejDamageQty} ({report.rejectionPercentage}%)</span></p>
                          <p>Balance: <span className="font-bold text-emerald-600">{report.balanceQty}</span></p>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-right space-x-2">
                        <button onClick={() => handleEdit(report)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="Edit Report"><Edit2 className="w-4 h-4" /></button>
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