// src/pages/inventory/StoreProductionPage.tsx
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Factory,  Trash2, Edit2, Save } from 'lucide-react';
import { useInventoryStore } from '../../store/inventoryStore';
import { useStoreProductionStore, StoreProductionRecord } from '../../store/storeProductionStore';

const INITIAL_FORM_STATE = {
  styleNo: '',
  cutNo: '',
  issueQty: '',
  lineNo: '',
};

export default function StoreProductionPage() {
  const { storeInRecords } = useInventoryStore();
  const { productionRecords, addRecord, updateRecord, deleteRecord } = useStoreProductionStore();

  const [formData, setFormData] = useState(INITIAL_FORM_STATE);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [components, setComponents] = useState('');

  const todayDate = new Date().toISOString().split('T')[0];

  // --- DYNAMIC DATA CASCADING ---
  // 1. Unique styles currently in the store that have available stock
  const availableStyles = Array.from(new Set(storeInRecords.filter(r => r.availableQty > 0).map(r => r.styleNo)));
  
  // 2. Available cuts for the selected style
  const availableCuts = formData.styleNo 
    ? storeInRecords.filter(r => r.styleNo === formData.styleNo) 
    : [];

  // --- DYNAMIC MATH ENGINE ---
  // Find the base record from Store-In to know our starting point
  const activeCutRecord = availableCuts.find(c => c.cutNo === formData.cutNo);
  
  // Calculate how many have already been issued to production for this specific cut
  const previouslyIssuedQty = productionRecords
    .filter(pr => pr.cutNo === formData.cutNo && pr.id !== editingId) // Exclude current edit from sum
    .reduce((sum, pr) => sum + pr.issueQty, 0);

  // The true available quantity on the shelf right now
  const currentAvailableQty = activeCutRecord ? (activeCutRecord.availableQty - previouslyIssuedQty) : 0;
  
  // The balance after the user types an issue amount
  const issueQtyNum = parseInt(formData.issueQty) || 0;
  const balanceQty = Math.max(0, currentAvailableQty - issueQtyNum);

  // --- AUTO-FILL COMPONENTS ---
  useEffect(() => {
    if (formData.styleNo) {
      // Grab the components from the first matching store record for this style
      const match = storeInRecords.find(r => r.styleNo === formData.styleNo);
      setComponents(match ? match.components : '');
    } else {
      setComponents('');
    }
  }, [formData.styleNo, storeInRecords]);

  // --- HANDLERS ---
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'styleNo') {
      setFormData({ styleNo: value, cutNo: '', issueQty: '', lineNo: '' });
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.styleNo) newErrors.styleNo = 'Select a style';
    if (!formData.cutNo) newErrors.cutNo = 'Select a cut';
    if (!formData.lineNo.trim()) newErrors.lineNo = 'Line No is required';
    
    if (issueQtyNum <= 0) newErrors.issueQty = 'Issue Qty must be greater than 0';
    if (issueQtyNum > currentAvailableQty) newErrors.issueQty = `Cannot exceed available (${currentAvailableQty})`;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const newRecord: StoreProductionRecord = {
      id: editingId || Math.random().toString(36).substr(2, 9),
      issueDate: todayDate,
      styleNo: formData.styleNo,
      components: components,
      cutNo: formData.cutNo,
      issueQty: issueQtyNum,
      balanceQty: balanceQty,
      lineNo: formData.lineNo,
    };

    if (editingId) {
      updateRecord(editingId, newRecord);
      setEditingId(null);
    } else {
      addRecord(newRecord);
    }
    
    setFormData(INITIAL_FORM_STATE);
  };

  const handleEdit = (record: StoreProductionRecord) => {
    setFormData({
      styleNo: record.styleNo,
      cutNo: record.cutNo,
      issueQty: record.issueQty.toString(),
      lineNo: record.lineNo,
    });
    setComponents(record.components);
    setEditingId(record.id);
    setErrors({});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this issue record? The quantities will be returned to the store shelf.')) {
      deleteRecord(id);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 pb-12 max-w-6xl mx-auto">
      
      {/* HEADER */}
      <div className="flex items-center space-x-3 border-b border-slate-200 pb-4">
        <div className="p-2 bg-amber-100 rounded-lg"><Factory className="w-6 h-6 text-amber-700" /></div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Store Issue (To Production)</h2>
          <p className="text-slate-500 text-sm">Issue available cut panels directly to the printing lines.</p>
        </div>
      </div>

      {/* FORM ENTRY SECTION */}
      <div className="bg-white p-6 md:p-8 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-slate-800">{editingId ? 'Edit Issue Record' : 'New Production Issue'}</h3>
          {editingId && <span className="px-3 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full animate-pulse">EDIT MODE</span>}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Style Dropdown */}
            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-700">Style No <span className="text-red-500">*</span></label>
              <select name="styleNo" value={formData.styleNo} onChange={handleInputChange} className={`w-full px-3 py-2 border rounded-lg outline-none sm:text-sm bg-white ${errors.styleNo ? 'border-red-400' : 'border-slate-300 focus:ring-2 focus:ring-amber-500'}`}>
                <option value="" disabled>Select Style...</option>
                {availableStyles.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {/* Auto-Filled Components */}
            <div className="space-y-1 lg:col-span-2">
              <label className="block text-sm font-medium text-slate-400">Components (Auto-filled)</label>
              <input type="text" value={components} readOnly placeholder="Select a style first..." className="w-full px-3 py-2 border border-slate-200 rounded-lg sm:text-sm bg-slate-50 text-slate-500 cursor-not-allowed" />
            </div>

            {/* Cut No Dropdown */}
            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-700">Cut No <span className="text-red-500">*</span></label>
              <select name="cutNo" value={formData.cutNo} onChange={handleInputChange} disabled={!formData.styleNo} className="w-full px-3 py-2 border rounded-lg outline-none sm:text-sm bg-white focus:ring-2 focus:ring-amber-500 disabled:opacity-50">
                <option value="" disabled>Select Cut...</option>
                {availableCuts.map(c => <option key={c.cutNo} value={c.cutNo}>{c.cutNo} (Size: {c.size})</option>)}
              </select>
            </div>
          </div>

          {/* QUANTITY AND LINE SECTION */}
          <div className="p-6 bg-amber-50/50 rounded-xl border border-amber-200 mt-6 grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
            
            {/* Display Available Qty dynamically */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-amber-700 uppercase tracking-wider">Current Available</label>
              <div className="w-full px-3 py-3 border border-amber-200 bg-white rounded-lg text-lg font-black text-amber-600 shadow-sm">
                {formData.cutNo ? currentAvailableQty : '-'}
              </div>
            </div>

            {/* Issue Qty Input */}
            <div className="space-y-1">
              <label className="block text-sm font-bold text-slate-800">Issue Qty <span className="text-red-500">*</span></label>
              <div className="relative">
                <input type="number" name="issueQty" value={formData.issueQty} onChange={handleInputChange} disabled={!formData.cutNo || currentAvailableQty === 0} placeholder="0" className={`w-full px-3 py-3 font-semibold border rounded-lg outline-none sm:text-sm disabled:opacity-50 ${errors.issueQty ? 'border-red-400 focus:ring-red-500' : 'border-slate-300 focus:ring-2 focus:ring-amber-600'}`} />
                {errors.issueQty && <span className="absolute -bottom-5 left-0 text-[10px] text-red-600 font-medium">{errors.issueQty}</span>}
              </div>
            </div>

            {/* Balance Auto-Calc */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Balance Remaining</label>
              <div className="w-full px-3 py-3 border border-slate-200 bg-slate-100 rounded-lg text-lg font-bold text-slate-700">
                {formData.cutNo && formData.issueQty ? balanceQty : '-'}
              </div>
            </div>

            {/* Line No Input */}
            <div className="space-y-1">
              <label className="block text-sm font-bold text-slate-800">Line No <span className="text-red-500">*</span></label>
              <input type="text" name="lineNo" value={formData.lineNo} onChange={handleInputChange} placeholder="e.g. Line 04" className={`w-full px-3 py-3 font-semibold border rounded-lg outline-none sm:text-sm ${errors.lineNo ? 'border-red-400 bg-red-50' : 'border-slate-300 focus:ring-2 focus:ring-amber-600'}`} />
              {errors.lineNo && <span className="absolute -bottom-5 left-0 text-[10px] text-red-600">{errors.lineNo}</span>}
            </div>

          </div>

          <div className="flex justify-end pt-4 space-x-3">
            {editingId && (
              <button type="button" onClick={() => { setEditingId(null); setFormData(INITIAL_FORM_STATE); setErrors({}); }} className="px-4 py-2 border text-slate-700 rounded-lg hover:bg-slate-50 font-medium">Cancel Edit</button>
            )}
            <button type="submit" disabled={!formData.cutNo || currentAvailableQty === 0} className="px-8 py-2.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 font-bold flex items-center shadow-md disabled:opacity-50">
               <Save className="w-5 h-5 mr-2" /> {editingId ? 'Update Issue Record' : 'Issue to Production'}
            </button>
          </div>
        </form>
      </div>

      {/* SUMMARY TABLE */}
      {productionRecords.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mt-8">
          <div className="p-6 border-b border-slate-200 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-slate-800">Production Issue History</h3>
          </div>
          <div className="overflow-x-auto">
             <table className="w-full text-left text-sm whitespace-nowrap min-w-max">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 font-semibold">Date</th>
                  <th className="px-6 py-3 font-semibold">Style & Components</th>
                  <th className="px-6 py-3 font-semibold">Cut No</th>
                  <th className="px-6 py-3 font-semibold">Line Destination</th>
                  <th className="px-6 py-3 font-semibold">Quantities</th>
                  <th className="px-6 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <AnimatePresence>
                  {productionRecords.map((record) => (
                    <motion.tr key={record.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-700">{record.issueDate}</td>
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-900">{record.styleNo}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5 truncate max-w-50">{record.components}</p>
                      </td>
                      <td className="px-6 py-4 font-bold text-amber-700">{record.cutNo}</td>
                      <td className="px-6 py-4">
                        <span className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-xs font-bold border border-amber-200">
                          {record.lineNo}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs w-32"><span className="text-slate-500">Issued:</span> <span className="font-bold text-slate-900">{record.issueQty}</span></div>
                          <div className="flex justify-between text-xs w-32"><span className="text-slate-500">Balance left:</span> <span className="font-medium text-slate-500">{record.balanceQty}</span></div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <button onClick={() => handleEdit(record)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(record.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded" title="Return to store"><Trash2 className="w-4 h-4" /></button>
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