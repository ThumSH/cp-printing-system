// src/pages/inventory/AdviceNotePage.tsx
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Save, Edit2, Trash2 } from 'lucide-react';
import { useInventoryStore } from '../../store/inventoryStore';
import { useAdviceNoteStore, AdviceNoteRecord, AdviceNoteRow } from '../../store/adviceNoteStore';

const COMPONENTS_LIST = ['Front', 'Back', 'Sleeve', 'Pocket', 'Waistband', 'Other'];

const INITIAL_FORM_STATE = {
  deliveryDate: '',
  attn: '',
  styleNo: '',
  address: '',
  scheduleNo: '',
  cutNo: '',
  component: '',
  receivedByName: '',
  prepByName: '',
  authByName: '',
};

export default function AdviceNotePage() {
  const { storeInRecords } = useInventoryStore();
  const { adviceNotes, addAdviceNote, updateAdviceNote, deleteAdviceNote } = useAdviceNoteStore();

  const [formData, setFormData] = useState(INITIAL_FORM_STATE);
  const [rowInputs, setRowInputs] = useState<Record<string, AdviceNoteRow>>({});
  const [editingId, setEditingId] = useState<string | null>(null);

  // --- AUTO-GENERATE AD NO ---
  // If editing, use existing. Otherwise, generate next number (e.g., AD No : 00001)
  const currentAdNo = editingId 
    ? adviceNotes.find(n => n.id === editingId)?.adNo 
    : `AD No : ${String(adviceNotes.length + 1).padStart(5, '0')}`;

  // --- DYNAMIC CASCADING DATA ---
  const availableStyles = Array.from(new Set(storeInRecords.map(r => r.styleNo)));
  
  const availableSchedules = formData.styleNo 
    ? Array.from(new Set(storeInRecords.filter(r => r.styleNo === formData.styleNo).map(r => r.scheduleNo))) 
    : [];
    
  const availableCuts = formData.scheduleNo 
    ? Array.from(new Set(storeInRecords.filter(r => r.styleNo === formData.styleNo && r.scheduleNo === formData.scheduleNo).map(r => r.cutNo)))
    : [];

  // --- TABLE POPULATION ---
  // Get the exact bundles that match the selected Style, Schedule, and Cut
  const activeBundles = storeInRecords.filter(r => 
    r.styleNo === formData.styleNo && 
    r.scheduleNo === formData.scheduleNo && 
    r.cutNo === formData.cutNo
  );

  // Initialize row data when bundles change
  useEffect(() => {
    if (activeBundles.length > 0 && !editingId) {
      const initialRows: Record<string, AdviceNoteRow> = {};
      activeBundles.forEach(bundle => {
        initialRows[bundle.id] = { storeInRecordId: bundle.id, pd: 0, fd: 0, goodQty: bundle.bundleQty };
      });
      setRowInputs(initialRows);
    } else if (!editingId) {
      setRowInputs({});
    }
  }, [formData.cutNo, storeInRecords]);

  // --- HANDLERS ---
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === 'styleNo') {
      setFormData(prev => ({ ...prev, styleNo: value, scheduleNo: '', cutNo: '' }));
    } else if (name === 'scheduleNo') {
      setFormData(prev => ({ ...prev, scheduleNo: value, cutNo: '' }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleRowChange = (bundleId: string, field: 'pd' | 'fd', value: string) => {
    const numValue = parseInt(value) || 0;
    setRowInputs(prev => {
      const currentRow = prev[bundleId] || { storeInRecordId: bundleId, pd: 0, fd: 0, goodQty: 0 };
      const updatedRow = { ...currentRow, [field]: numValue };
      
      // Auto-calculate Good Qty
      const bundle = activeBundles.find(b => b.id === bundleId);
      const totalPcs = bundle ? bundle.bundleQty : 0;
      updatedRow.goodQty = Math.max(0, totalPcs - (updatedRow.pd + updatedRow.fd));

      return { ...prev, [bundleId]: updatedRow };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.styleNo || !formData.deliveryDate) {
      alert("Style No and Delivery Date are required.");
      return;
    }

    const report: AdviceNoteRecord = {
      id: editingId || Math.random().toString(36).substr(2, 9),
      adNo: currentAdNo || '',
      deliveryDate: formData.deliveryDate,
      attn: formData.attn,
      styleNo: formData.styleNo,
      address: formData.address,
      scheduleNo: formData.scheduleNo,
      cutNo: formData.cutNo,
      component: formData.component,
      rows: rowInputs,
      receivedByName: formData.receivedByName,
      prepByName: formData.prepByName,
      authByName: formData.authByName,
    };

    if (editingId) {
      updateAdviceNote(editingId, report);
      setEditingId(null);
    } else {
      addAdviceNote(report);
    }

    setFormData(INITIAL_FORM_STATE);
    setRowInputs({});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEdit = (report: AdviceNoteRecord) => {
    setFormData({
      deliveryDate: report.deliveryDate,
      attn: report.attn,
      styleNo: report.styleNo,
      address: report.address,
      scheduleNo: report.scheduleNo,
      cutNo: report.cutNo,
      component: report.component,
      receivedByName: report.receivedByName,
      prepByName: report.prepByName,
      authByName: report.authByName,
    });
    setRowInputs(report.rows);
    setEditingId(report.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 pb-12 max-w-6xl mx-auto">
      
      {/* PAGE TITLE */}
      <div className="flex items-center space-x-3 border-b border-slate-200 pb-4">
        <div className="p-2 bg-blue-100 rounded-lg"><FileText className="w-6 h-6 text-blue-700" /></div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Advice Note / Delivery Report</h2>
          <p className="text-slate-500 text-sm">Generate dispatch notes for cut panels and bundles.</p>
        </div>
      </div>

      {/* PAPER-LIKE REPORT UI */}
      <div className="bg-white shadow-xl border border-slate-300 mx-auto overflow-hidden text-slate-900">
        <form onSubmit={handleSubmit}>
          
          {/* HEADER TIER */}
          <div className="flex justify-between items-start p-8 border-b-2 border-slate-800">
            <div className="w-1/3">
              <h1 className="text-3xl font-black tracking-tighter text-blue-900">COLOURPLUS</h1>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Screen Printing</p>
            </div>
            <div className="w-1/3 text-center">
              <h2 className="text-xl font-bold uppercase underline underline-offset-4 decoration-2 mb-2">Advice Note</h2>
              <div className="inline-block px-4 py-1 border-2 border-slate-800 font-bold text-lg text-slate-800 tracking-wider bg-slate-50">
                {currentAdNo}
              </div>
            </div>
            <div className="w-1/3 text-right text-sm">
              <p className="font-semibold">Colourplus Factory</p>
              <p className="text-slate-600">Industrial Estate, Main Road</p>
              <div className="mt-4 flex items-center justify-end space-x-2">
                <span className="font-bold uppercase text-xs">Date:</span>
                <input 
                  type="date" 
                  name="deliveryDate" 
                  value={formData.deliveryDate} 
                  onChange={handleInputChange} 
                  className="border-b border-slate-400 outline-none text-sm font-semibold focus:border-blue-600" 
                  required
                />
              </div>
            </div>
          </div>

          {/* SUB-HEADER INPUTS */}
          <div className="grid grid-cols-2 gap-8 p-8 border-b-2 border-slate-800 bg-slate-50">
            {/* Left Column */}
            <div className="space-y-4">
              <div className="flex items-end">
                <span className="w-24 font-bold text-sm uppercase">Attn:</span>
                <input type="text" name="attn" value={formData.attn} onChange={handleInputChange} className="flex-1 border-b border-slate-400 outline-none bg-transparent pb-1 focus:border-blue-600 font-medium" />
              </div>
              <div className="flex items-end">
                <span className="w-24 font-bold text-sm uppercase">Style No:</span>
                <select name="styleNo" value={formData.styleNo} onChange={handleInputChange} className="flex-1 border-b border-slate-400 outline-none bg-transparent pb-1 focus:border-blue-600 font-bold text-blue-800">
                  <option value="" disabled>Select Style...</option>
                  {availableStyles.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="flex items-start">
                <span className="w-24 font-bold text-sm uppercase pt-1">Address:</span>
                <textarea name="address" value={formData.address} onChange={handleInputChange} rows={2} className="flex-1 border-b border-slate-400 outline-none bg-transparent resize-none focus:border-blue-600 font-medium" />
              </div>
            </div>
            
            {/* Right Column */}
            <div className="space-y-4">
              <div className="flex items-end">
                <span className="w-32 font-bold text-sm uppercase">Schedule No:</span>
                <select name="scheduleNo" value={formData.scheduleNo} onChange={handleInputChange} disabled={!formData.styleNo} className="flex-1 border-b border-slate-400 outline-none bg-transparent pb-1 focus:border-blue-600 font-bold disabled:opacity-50">
                  <option value="" disabled>Select Schedule...</option>
                  {availableSchedules.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="flex items-end">
                <span className="w-32 font-bold text-sm uppercase">Cut No:</span>
                <select name="cutNo" value={formData.cutNo} onChange={handleInputChange} disabled={!formData.scheduleNo} className="flex-1 border-b border-slate-400 outline-none bg-transparent pb-1 focus:border-blue-600 font-bold disabled:opacity-50">
                  <option value="" disabled>Select Cut...</option>
                  {availableCuts.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="flex items-end">
                <span className="w-32 font-bold text-sm uppercase">Components:</span>
                <select name="component" value={formData.component} onChange={handleInputChange} className="flex-1 border-b border-slate-400 outline-none bg-transparent pb-1 focus:border-blue-600 font-medium">
                  <option value="" disabled>Select Component...</option>
                  {COMPONENTS_LIST.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* DYNAMIC BUNDLE TABLE */}
          <div className="min-h-75">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-slate-800 text-white divide-x divide-slate-600">
                  <th className="py-3 px-2 font-bold text-center w-10">#</th>
                  <th className="py-3 px-4 font-bold text-left">Colour</th>
                  <th className="py-3 px-2 font-bold text-center">Bun No</th>
                  <th className="py-3 px-2 font-bold text-center">Size</th>
                  <th className="py-3 px-2 font-bold text-center">Cut No</th>
                  <th className="py-3 px-2 font-bold text-center">Total PCS</th>
                  <th className="py-3 px-2 font-bold text-center bg-red-900 w-20">P/D</th>
                  <th className="py-3 px-2 font-bold text-center bg-red-900 w-20">F/D</th>
                  <th className="py-3 px-2 font-bold text-center bg-emerald-900 w-24">Good QTY</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300">
                {activeBundles.length > 0 ? (
                  activeBundles.map((bundle, idx) => {
                    const rowData = rowInputs[bundle.id] || { pd: 0, fd: 0, goodQty: bundle.bundleQty };
                    return (
                      <tr key={bundle.id} className="hover:bg-blue-50/30 divide-x divide-slate-300">
                        <td className="py-2 px-2 text-center text-slate-500 font-medium">{idx + 1}</td>
                        <td className="py-2 px-4 font-semibold text-slate-800">{bundle.bodyColour}</td>
                        <td className="py-2 px-2 text-center font-bold">{bundle.bundleQty}</td> {/* Note: As per prompt, Bun No is Bundle Qty */}
                        <td className="py-2 px-2 text-center font-bold text-slate-700">{bundle.size}</td>
                        <td className="py-2 px-2 text-center text-slate-600">{bundle.cutNo}</td>
                        <td className="py-2 px-2 text-center font-bold bg-slate-100">{bundle.bundleQty}</td>
                        
                        {/* Manual Inputs */}
                        <td className="p-0">
                          <input type="number" value={rowData.pd || ''} onChange={(e) => handleRowChange(bundle.id, 'pd', e.target.value)} className="w-full h-full py-2 bg-transparent text-center outline-none focus:bg-red-50 text-red-700 font-semibold" placeholder="0" />
                        </td>
                        <td className="p-0">
                          <input type="number" value={rowData.fd || ''} onChange={(e) => handleRowChange(bundle.id, 'fd', e.target.value)} className="w-full h-full py-2 bg-transparent text-center outline-none focus:bg-red-50 text-red-700 font-semibold" placeholder="0" />
                        </td>
                        
                        {/* Auto-Calculated Good Qty */}
                        <td className="py-2 px-2 text-center font-black text-emerald-700 bg-emerald-50/50">
                          {rowData.goodQty}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      Select a Style, Schedule, and Cut to load bundles.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* FOOTER & SIGNATURES */}
          <div className="border-t-2 border-slate-800 p-8 bg-slate-50">
            <div className="grid grid-cols-3 gap-12 text-center">
              
              {/* Received By */}
              <div className="space-y-6">
                <div className="h-16 border-b border-slate-400 border-dashed flex items-end justify-center pb-1">
                  <input type="text" name="receivedByName" value={formData.receivedByName} onChange={handleInputChange} placeholder="Name / ID" className="w-full bg-transparent text-center outline-none font-medium" />
                </div>
                <div className="space-y-1">
                  <p className="font-bold text-sm uppercase">Received By</p>
                  <p className="text-[10px] text-slate-500">Name / Sign / ID No</p>
                </div>
              </div>

              {/* Prep & Checked */}
              <div className="space-y-6">
                <div className="h-16 border-b border-slate-400 border-dashed flex items-end justify-center pb-1">
                  <input type="text" name="prepByName" value={formData.prepByName} onChange={handleInputChange} placeholder="Name / ID" className="w-full bg-transparent text-center outline-none font-medium" />
                </div>
                <div className="space-y-1">
                  <p className="font-bold text-sm uppercase">Prep & Checked By</p>
                  <p className="text-[10px] text-slate-500">Name / Sign / ID No</p>
                </div>
              </div>

              {/* Authorized */}
              <div className="space-y-6">
                <div className="h-16 border-b border-slate-400 border-dashed flex items-end justify-center pb-1">
                  <input type="text" name="authByName" value={formData.authByName} onChange={handleInputChange} placeholder="Name / ID" className="w-full bg-transparent text-center outline-none font-medium text-blue-700" />
                </div>
                <div className="space-y-1">
                  <p className="font-bold text-sm uppercase">Authorized By</p>
                  <p className="text-[10px] text-slate-500">Name / Sign / ID No</p>
                </div>
              </div>

            </div>
          </div>

          {/* ACTION BUTTONS */}
          <div className="p-4 bg-slate-800 flex justify-end space-x-4">
            {editingId && (
              <button type="button" onClick={() => { setEditingId(null); setFormData(INITIAL_FORM_STATE); setRowInputs({}); }} className="px-6 py-2 bg-slate-700 text-white hover:bg-slate-600 font-medium text-sm transition-colors">Cancel Edit</button>
            )}
            <button type="submit" disabled={activeBundles.length === 0} className="px-8 py-2 bg-blue-600 text-white font-bold text-sm flex items-center hover:bg-blue-500 transition-colors disabled:opacity-50">
               <Save className="w-4 h-4 mr-2" /> {editingId ? 'UPDATE ADVICE NOTE' : 'SAVE ADVICE NOTE'}
            </button>
          </div>
        </form>
      </div>

      {/* --- SAVED RECORDS TABLE --- */}
      {adviceNotes.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mt-8">
          <div className="p-4 border-b border-slate-200 bg-slate-50">
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Advice Note History</h3>
          </div>
          <div className="overflow-x-auto">
             <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-white text-slate-500 border-b border-slate-200 text-xs uppercase">
                <tr>
                  <th className="px-6 py-3 font-semibold">AD No & Date</th>
                  <th className="px-6 py-3 font-semibold">Style / Cut</th>
                  <th className="px-6 py-3 font-semibold">Attn / Address</th>
                  <th className="px-6 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <AnimatePresence>
                  {adviceNotes.map((note) => (
                    <motion.tr key={note.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <span className="inline-block px-2 py-1 bg-slate-800 text-white font-bold text-xs rounded mb-1">{note.adNo}</span>
                        <p className="text-xs text-slate-600 font-medium">{note.deliveryDate}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-bold text-blue-700">{note.styleNo}</p>
                        <p className="text-xs text-slate-500 mt-0.5">Sch: {note.scheduleNo} | Cut: {note.cutNo}</p>
                        <p className="text-xs text-slate-500 mt-0.5">Comp: {note.component}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-slate-800">{note.attn}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5 truncate max-w-50">{note.address}</p>
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <button onClick={() => handleEdit(note)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => deleteAdviceNote(note.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
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