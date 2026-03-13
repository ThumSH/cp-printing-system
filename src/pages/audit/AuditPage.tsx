// src/pages/audit/AuditPage.tsx
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ClipboardCheck, Plus, Trash2, Save, AlertCircle, Printer, Download } from 'lucide-react';
import { useInventoryStore } from '../../store/inventoryStore';
import { useAuditStore, AuditRecord, AuditBundle } from '../../store/auditStore';

const SIZES = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL'];

export default function AuditPage() {
  const { storeInRecords } = useInventoryStore();
  const { auditRecords, addAuditRecord, updateAuditStatus, deleteAuditRecord, fetchAuditRecords } = useAuditStore();

  useEffect(() => {
    fetchAuditRecords();
  }, []);

  const todayDate = new Date().toISOString().split('T')[0];

  // --- FORM STATE ---
  const [styleNo, setStyleNo] = useState('');
  const [scheduleNo, setScheduleNo] = useState('');
  const [cutNo, setCutNo] = useState('');
  const [colour, setColour] = useState('');
  
  const [bundles, setBundles] = useState<AuditBundle[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // --- DYNAMIC CASCADING ---
  const availableStyles = Array.from(new Set(storeInRecords.map(r => r.styleNo)));
  const availableSchedules = styleNo ? Array.from(new Set(storeInRecords.filter(r => r.styleNo === styleNo).map(r => r.scheduleNo))) : [];
  const availableCuts = scheduleNo ? Array.from(new Set(storeInRecords.filter(r => r.styleNo === styleNo && r.scheduleNo === scheduleNo).map(r => r.cutNo))) : [];

  useEffect(() => {
    if (cutNo) {
      const match = storeInRecords.find(r => r.styleNo === styleNo && r.scheduleNo === scheduleNo && r.cutNo === cutNo);
      setColour(match ? match.bodyColour : '');
    } else {
      setColour('');
    }
  }, [cutNo, styleNo, scheduleNo, storeInRecords]);

  // --- MATH ENGINE (AQL LOGIC) ---
  const totalQty = bundles.reduce((sum, b) => sum + b.qty, 0);

  const calculateAuditQty = (qty: number): number => {
    if (qty <= 1) return qty;
    if (qty >= 2 && qty <= 8) return 3;
    if (qty >= 9 && qty <= 15) return 5;
    if (qty >= 16 && qty <= 25) return 8;
    if (qty >= 26 && qty <= 50) return 13;
    if (qty >= 51 && qty <= 90) return 20;
    if (qty >= 91 && qty <= 150) return 32;
    if (qty >= 151 && qty <= 280) return 50;
    if (qty >= 281 && qty <= 500) return 80;
    if (qty >= 501 && qty <= 1200) return 125;
    if (qty >= 1201 && qty <= 3200) return 200;
    if (qty >= 3201 && qty <= 10000) return 315;
    if (qty >= 10001 && qty <= 35000) return 500;
    if (qty >= 35001 && qty <= 150000) return 800;
    if (qty >= 150001 && qty <= 500000) return 1250;
    if (qty >= 500001) return 2000;
    return 0;
  };

  const auditQty = calculateAuditQty(totalQty);

  // --- BUNDLE HANDLERS ---
  const addBundleRow = () => setBundles([...bundles, { id: Math.random().toString(36).substr(2, 9), bundleNo: '', size: '', qty: 0 }]);
  const removeBundleRow = (id: string) => setBundles(bundles.filter(b => b.id !== id));
  const updateBundle = (id: string, field: keyof AuditBundle, value: string | number) => setBundles(bundles.map(b => b.id === id ? { ...b, [field]: value } : b));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    if (!styleNo) newErrors.styleNo = 'Required';
    if (!scheduleNo) newErrors.scheduleNo = 'Required';
    if (!cutNo) newErrors.cutNo = 'Required';
    if (bundles.length === 0) newErrors.bundles = 'Add at least one bundle';
    
    const invalidBundle = bundles.some(b => !b.bundleNo.trim() || !b.size || b.qty <= 0);
    if (invalidBundle) newErrors.bundles = 'Complete all bundle fields correctly';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const uniqueSizes = Array.from(new Set(bundles.map(b => b.size))).join(', ');

    const newRecord: AuditRecord = {
      id: Math.random().toString(36).substr(2, 9),
      date: todayDate,
      styleNo,
      scheduleNo,
      cutNo,
      colour,
      bundles,
      sizes: uniqueSizes,
      totalQty,
      auditQty,
      status: 'Pending',
      remarks: '',
    };

    addAuditRecord(newRecord);
    setStyleNo(''); setScheduleNo(''); setCutNo(''); setColour('');
    setBundles([]); setErrors({});
  };

  // --- EXPORT & PRINT HANDLERS ---
  const exportToCSV = () => {
    // 1. Create CSV Headers
    const headers = ['Date', 'Style No', 'Schedule No', 'Cut No', 'Colour', 'Size(s)', 'Total QTY', 'Audit QTY', 'Status', 'Remarks'];
    
    // 2. Map data to rows
    const rows = auditRecords.map(r => [
      r.date, 
      r.styleNo, 
      r.scheduleNo, 
      r.cutNo, 
      r.colour, 
      `"${r.sizes}"`, // Wrap in quotes in case of commas
      r.totalQty, 
      r.auditQty, 
      r.status, 
      `"${r.remarks}"`
    ]);

    // 3. Construct CSV string
    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
    // 4. Trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `Audit_Tracking_Report_${todayDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 pb-12 max-w-7xl mx-auto">
      
      {/* CSS Print Injection: 
        This strictly styles the print dialog so that ONLY the table is printed, 
        making it full width and hiding the sidebar/inputs. 
      */}
      <style>
        {`
          @media print {
            body * { visibility: hidden; }
            #printable-area, #printable-area * { visibility: visible; }
            #printable-area { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 0; }
            .print-hide { display: none !important; }
            /* Strip borders from inputs during print for a clean look */
            select, input { border: none !important; appearance: none !important; background: transparent !important; }
          }
        `}
      </style>

      {/* HEADER (Hidden during print) */}
      <div className="flex items-center space-x-3 border-b border-slate-200 pb-4 print-hide">
        <div className="p-2 bg-teal-100 rounded-lg"><ClipboardCheck className="w-6 h-6 text-teal-700" /></div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Quality Audit Setup</h2>
          <p className="text-slate-500 text-sm">Calculate required audit quantities based on bundle size.</p>
        </div>
      </div>

      {/* DATA ENTRY FORM (Hidden during print) */}
      <div className="bg-white p-6 md:p-8 rounded-xl border border-slate-200 shadow-sm print-hide">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 bg-slate-50 p-6 rounded-lg border border-slate-100">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">Style No</label>
              <select value={styleNo} onChange={(e) => { setStyleNo(e.target.value); setScheduleNo(''); setCutNo(''); }} className={`w-full px-3 py-2 border rounded-lg outline-none sm:text-sm bg-white ${errors.styleNo ? 'border-red-400' : 'border-slate-300 focus:border-teal-500'}`}>
                <option value="" disabled>Select Style...</option>
                {availableStyles.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">Schedule No</label>
              <select value={scheduleNo} onChange={(e) => { setScheduleNo(e.target.value); setCutNo(''); }} disabled={!styleNo} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none sm:text-sm bg-white disabled:opacity-50 focus:border-teal-500">
                <option value="" disabled>Select Schedule...</option>
                {availableSchedules.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">Cut No</label>
              <select value={cutNo} onChange={(e) => setCutNo(e.target.value)} disabled={!scheduleNo} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none sm:text-sm bg-white disabled:opacity-50 focus:border-teal-500">
                <option value="" disabled>Select Cut...</option>
                {availableCuts.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">Colour</label>
              <input type="text" value={colour} readOnly placeholder="Auto-fills..." className="w-full px-3 py-2 border border-slate-200 rounded-lg sm:text-sm bg-slate-100 text-slate-600 font-medium" />
            </div>
          </div>

          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <div className="bg-slate-800 p-3 flex justify-between items-center">
              <h4 className="text-white font-bold text-sm">Target Bundles</h4>
              <button type="button" onClick={addBundleRow} className="px-3 py-1 bg-teal-500 hover:bg-teal-400 text-white text-xs font-bold rounded flex items-center transition-colors">
                <Plus className="w-3 h-3 mr-1" /> Add Bundle
              </button>
            </div>
            
            {errors.bundles && <div className="p-3 bg-red-50 text-red-600 text-sm font-medium border-b border-red-100 flex items-center"><AlertCircle className="w-4 h-4 mr-2"/>{errors.bundles}</div>}

            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[11px] font-bold">
                <tr>
                  <th className="px-4 py-2">Bundle No</th>
                  <th className="px-4 py-2">Size</th>
                  <th className="px-4 py-2">Bundle Qty</th>
                  <th className="px-4 py-2 w-16"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bundles.map((b) => (
                  <tr key={b.id} className="bg-white hover:bg-slate-50">
                    <td className="px-4 py-2"><input type="text" value={b.bundleNo} onChange={(e) => updateBundle(b.id, 'bundleNo', e.target.value)} placeholder="e.g. B-01" className="w-full p-1.5 border border-slate-300 rounded outline-none focus:border-teal-500" /></td>
                    <td className="px-4 py-2">
                      <select value={b.size} onChange={(e) => updateBundle(b.id, 'size', e.target.value)} className="w-full p-1.5 border border-slate-300 rounded outline-none focus:border-teal-500">
                        <option value="" disabled>Size...</option>
                        {SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-2"><input type="number" value={b.qty || ''} onChange={(e) => updateBundle(b.id, 'qty', parseInt(e.target.value) || 0)} placeholder="0" className="w-full p-1.5 border border-slate-300 rounded outline-none focus:border-teal-500" /></td>
                    <td className="px-4 py-2 text-center"><button type="button" onClick={() => removeBundleRow(b.id)} className="text-red-500 hover:text-red-700 p-1"><Trash2 className="w-4 h-4" /></button></td>
                  </tr>
                ))}
                {bundles.length === 0 && <tr><td colSpan={4} className="p-6 text-center text-slate-400">No bundles added yet. Click "Add Bundle" to begin.</td></tr>}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between bg-teal-50 p-4 rounded-lg border border-teal-100">
            <div className="flex space-x-8">
              <div>
                <p className="text-xs font-bold text-teal-800 uppercase">Total QTY</p>
                <p className="text-2xl font-black text-teal-900">{totalQty}</p>
              </div>
              <div className="border-l-2 border-teal-200 pl-8">
                <p className="text-xs font-bold text-teal-800 uppercase">Required Audit QTY (AQL)</p>
                <p className="text-2xl font-black text-teal-600">{auditQty}</p>
              </div>
            </div>
            <button type="submit" className="px-6 py-2.5 bg-slate-800 text-white rounded-lg hover:bg-slate-900 font-bold flex items-center shadow-md">
               <Save className="w-4 h-4 mr-2" /> Create Audit Record
            </button>
          </div>
        </form>
      </div>

      {/* --- AUDIT TRACKING TABLE (THIS BECOMES THE PRINTABLE AREA) --- */}
      {auditRecords.length > 0 && (
        <div id="printable-area" className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mt-8 print:border-none print:shadow-none">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center print:bg-white print:border-none">
            <h3 className="text-lg font-bold text-slate-800 uppercase tracking-wider">Audit Tracking Board</h3>
            
            {/* Export & Print Buttons */}
            <div className="flex space-x-2 print-hide">
              <button 
                onClick={exportToCSV}
                className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300 rounded-lg text-sm font-bold flex items-center transition-colors"
                title="Download as Excel/CSV"
              >
                <Download className="w-4 h-4 mr-2" /> CSV
              </button>
              <button 
                onClick={handlePrint}
                className="px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg text-sm font-bold flex items-center transition-colors shadow-sm"
                title="Print or Save as PDF"
              >
                <Printer className="w-4 h-4 mr-2" /> Print / PDF
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
             <table className="w-full text-left text-sm whitespace-nowrap min-w-max print:text-[11px] print:border-collapse">
              <thead className="bg-white text-slate-500 border-b border-slate-200 text-[11px] uppercase tracking-wider print:border-b-2 print:border-black print:text-black">
                <tr>
                  <th className="px-4 py-3 font-semibold print:border print:border-slate-400 print:py-2">Date / Style</th>
                  <th className="px-4 py-3 font-semibold print:border print:border-slate-400 print:py-2">Schedule & Cut</th>
                  <th className="px-4 py-3 font-semibold print:border print:border-slate-400 print:py-2">Size(s)</th>
                  <th className="px-4 py-3 font-semibold print:border print:border-slate-400 print:py-2">Total QTY</th>
                  <th className="px-4 py-3 font-semibold text-indigo-700 print:text-black print:border print:border-slate-400 print:py-2">Audit QTY</th>
                  <th className="px-4 py-3 font-semibold w-32 print:border print:border-slate-400 print:py-2">Pass/Fail</th>
                  <th className="px-4 py-3 font-semibold min-w-50 print:border print:border-slate-400 print:py-2">Remarks</th>
                  <th className="px-4 py-3 font-semibold text-right print-hide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 print:divide-slate-400">
                <AnimatePresence>
                  {auditRecords.map((record) => (
                    <motion.tr key={record.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 print:border print:border-slate-400 print:py-1">
                        <p className="text-xs text-slate-500 font-medium print:text-black">{record.date}</p>
                        <p className="font-bold text-slate-900 mt-0.5 print:text-black">{record.styleNo}</p>
                      </td>
                      <td className="px-4 py-3 print:border print:border-slate-400 print:py-1">
                        <p className="font-semibold text-slate-800 print:text-black">Sch: {record.scheduleNo}</p>
                        <p className="text-xs text-slate-600 mt-0.5 print:text-black">Cut: {record.cutNo} | {record.colour}</p>
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-700 print:border print:border-slate-400 print:py-1 print:text-black">{record.sizes}</td>
                      <td className="px-4 py-3 font-medium text-slate-600 print:border print:border-slate-400 print:py-1 print:text-black">{record.totalQty}</td>
                      <td className="px-4 py-3 font-black text-indigo-600 bg-indigo-50/50 text-center print:border print:border-slate-400 print:bg-transparent print:text-black print:py-1">{record.auditQty}</td>
                      
                      {/* Inline Status Dropdown */}
                      <td className="px-4 py-3 print:border print:border-slate-400 print:py-1">
                        <select 
                          value={record.status} 
                          onChange={(e) => updateAuditStatus(record.id, e.target.value as any, record.remarks)}
                          className={`w-full px-2 py-1.5 rounded font-bold text-xs border outline-none cursor-pointer print:px-0 print:py-0 print:border-none print:font-bold ${
                            record.status === 'Pass' ? 'bg-emerald-100 text-emerald-800 border-emerald-200 print:text-black' :
                            record.status === 'Fail' ? 'bg-red-100 text-red-800 border-red-200 print:text-black' :
                            'bg-amber-100 text-amber-800 border-amber-200 print:text-black'
                          }`}
                        >
                          <option value="Pending">Pending</option>
                          <option value="Pass">Pass</option>
                          <option value="Fail">Fail</option>
                        </select>
                      </td>

                      {/* Inline Remarks Input */}
                      <td className="px-4 py-3 print:border print:border-slate-400 print:py-1">
                        <input 
                          type="text" 
                          value={record.remarks} 
                          placeholder="Add note..."
                          onChange={(e) => updateAuditStatus(record.id, record.status, e.target.value)}
                          className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded outline-none focus:border-teal-500 text-sm transition-colors print:px-0 print:py-0 print:border-none print:text-black"
                        />
                      </td>

                      {/* Hide Delete button on Print */}
                      <td className="px-4 py-3 text-right print-hide">
                        <button onClick={() => deleteAuditRecord(record.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors" title="Delete Audit Record">
                          <Trash2 className="w-4 h-4" />
                        </button>
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