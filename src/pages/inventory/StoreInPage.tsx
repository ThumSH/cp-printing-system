// src/pages/inventory/StoreInPage.tsx
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PackageOpen, Plus, Trash2, Edit2, CheckCircle2, AlertCircle, Save } from 'lucide-react';
import { useDevelopmentStore } from '../../store/developmentStore';
import { useAdminStore } from '../../store/adminStore'; // <-- NEW
import { useInventoryStore, StoreInRecord } from '../../store/inventoryStore';

const SIZES = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL'];

const INITIAL_FORM_STATE = {
  styleNo: '',
  bodyColour: '',
  printColour: '',
  components: '',
  season: '',
  cutInDate: '',
  bulkQty: '', // <-- NEW
  inQty: '',
  cutQty: '',
  scheduleNo: '',
  cutNo: '',
  bundleQty: '',
  numberRange: '',
  size: '',
};

export default function StoreInPage() {
  const { jobs } = useDevelopmentStore();
  const { approvals } = useAdminStore(); // <-- NEW: Fetch Admin approvals
  const { storeInRecords, addStoreInRecord, updateStoreInRecord, deleteStoreInRecord } = useInventoryStore();

  const [formData, setFormData] = useState(INITIAL_FORM_STATE);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // --- DYNAMIC DATA: Only show styles that are explicitly 'Approved' by Admin ---
  const approvedRecords = approvals.filter(a => a.status === 'Approved');
  const availableStyles = Array.from(new Set(approvedRecords.map(a => a.styleNo)));

  // --- HANDLERS & AUTO-FILL ---
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'styleNo') {
      const matchedJob = jobs.find(j => j.styleNo === value);
      const matchedApproval = approvedRecords.find(a => a.styleNo === value);
      
      if (matchedJob && matchedApproval) {
        setFormData(prev => ({
          ...prev,
          styleNo: value,
          bodyColour: matchedJob.bodyColour,
          printColour: matchedJob.printColour,
          components: matchedJob.placements.join(', '), 
          season: matchedJob.season,
          bulkQty: matchedApproval.bulkOrderQty || '0', // <-- Auto-fill Bulk Qty from Admin
        }));
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  // --- DYNAMIC QUANTITY MATH ---
  const bulkQtyNum = parseInt(formData.bulkQty) || 0;
  const inQtyNum = parseInt(formData.inQty) || 0;
  const cutQtyNum = parseInt(formData.cutQty) || 0;
  
  const balanceBulkQty = Math.max(0, bulkQtyNum - inQtyNum); // What's left to receive from factory
  const availableQty = Math.max(0, inQtyNum - cutQtyNum);    // What's physically ready in the store

  // --- STRICT VALIDATION ENGINE ---
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.styleNo) newErrors.styleNo = 'Style No is required';
    if (!formData.cutInDate) newErrors.cutInDate = 'Cut In Date is required';
    if (!formData.scheduleNo.trim()) newErrors.scheduleNo = 'Schedule No is required';
    if (!formData.cutNo.trim()) newErrors.cutNo = 'Cut No is required';
    if (!formData.numberRange.trim()) newErrors.numberRange = 'Number Range is required';
    if (!formData.size) newErrors.size = 'Please select a Size';

    if (inQtyNum <= 0) newErrors.inQty = 'Must be > 0';
    if (inQtyNum > bulkQtyNum) newErrors.inQty = `Exceeds Bulk (${bulkQtyNum})`; // Blocks receiving more than ordered
    
    if (cutQtyNum < 0) newErrors.cutQty = 'Cannot be negative';
    if (cutQtyNum > inQtyNum) newErrors.cutQty = `Exceeds IN Qty (${inQtyNum})`; // Blocks cutting more than received
    
    if (parseInt(formData.bundleQty) <= 0 || !formData.bundleQty) newErrors.bundleQty = 'Invalid Bundle Qty';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const newRecord: StoreInRecord = {
      id: editingId || Math.random().toString(36).substr(2, 9),
      styleNo: formData.styleNo,
      bodyColour: formData.bodyColour,
      printColour: formData.printColour,
      components: formData.components,
      season: formData.season,
      cutInDate: formData.cutInDate,
      bulkQty: bulkQtyNum,
      inQty: inQtyNum,
      balanceBulkQty: balanceBulkQty,
      cutQty: cutQtyNum,
      availableQty: availableQty,
      scheduleNo: formData.scheduleNo,
      cutNo: formData.cutNo,
      bundleQty: parseInt(formData.bundleQty),
      numberRange: formData.numberRange,
      size: formData.size,
    };

    if (editingId) {
      updateStoreInRecord(editingId, newRecord);
      setEditingId(null);
    } else {
      addStoreInRecord(newRecord);
    }
    setFormData(INITIAL_FORM_STATE);
  };

  const handleEdit = (record: StoreInRecord) => {
    setFormData({
      ...record,
      bulkQty: record.bulkQty.toString(),
      inQty: record.inQty.toString(),
      cutQty: record.cutQty.toString(),
      bundleQty: record.bundleQty.toString(),
    });
    setEditingId(record.id);
    setErrors({});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this receiving record?')) {
      deleteStoreInRecord(id);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 pb-12">
      <div className="flex items-center space-x-3 border-b border-slate-200 pb-4">
        <div className="p-2 bg-orange-100 rounded-lg"><PackageOpen className="w-6 h-6 text-orange-700" /></div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Store-In (Receiving)</h2>
          <p className="text-slate-500 text-sm">Receive cut panels against Admin Bulk Orders and calculate available stock.</p>
        </div>
      </div>

      <div className="bg-white p-6 md:p-8 rounded-xl border border-slate-200 shadow-sm">
        <div className="mb-6 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-slate-800">
            {editingId ? 'Edit Store-In Record' : 'New Store-In Entry'}
          </h3>
          {editingId && <span className="px-3 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full animate-pulse">EDIT MODE</span>}
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-8">
          
          {/* AUTO-FILL SPECS */}
          <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
            <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200 pb-2">Garment Spec (Auto-Filled)</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="space-y-1 lg:col-span-1">
                <label className="block text-xs font-medium text-slate-500">Approved Style No <span className="text-red-500">*</span></label>
                <select name="styleNo" value={formData.styleNo} onChange={handleInputChange} className={`w-full px-3 py-2 border rounded-lg outline-none text-sm bg-white ${errors.styleNo ? 'border-red-400' : 'border-slate-300 focus:ring-2 focus:ring-orange-500'}`}>
                  <option value="" disabled>Select Style...</option>
                  {availableStyles.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                {errors.styleNo && <p className="text-[10px] text-red-600 mt-0.5">{errors.styleNo}</p>}
              </div>

              {[
                { label: 'Body Colour', name: 'bodyColour' },
                { label: 'Print Colour', name: 'printColour' },
                { label: 'Components (Placements)', name: 'components' },
                { label: 'Season', name: 'season' }
              ].map(field => (
                <div key={field.name} className="space-y-1 lg:col-span-1">
                  <label className="block text-xs font-medium text-slate-500">{field.label}</label>
                  <input type="text" value={(formData as any)[field.name]} readOnly className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-100 text-slate-600 cursor-not-allowed" />
                </div>
              ))}
            </div>
          </div>

          {/* MANUAL ENTRY */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-700">Cut In Date <span className="text-red-500">*</span></label>
              <input type="date" name="cutInDate" value={formData.cutInDate} onChange={handleInputChange} className={`w-full px-3 py-2 border rounded-lg outline-none sm:text-sm ${errors.cutInDate ? 'border-red-400 bg-red-50' : 'border-slate-300 focus:ring-2 focus:ring-orange-500'}`} />
              {errors.cutInDate && <p className="text-[11px] text-red-600"><AlertCircle className="w-3 h-3 inline mr-1" />{errors.cutInDate}</p>}
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-700">Schedule No <span className="text-red-500">*</span></label>
              <input type="text" name="scheduleNo" value={formData.scheduleNo} onChange={handleInputChange} placeholder="e.g. SCH-001" className={`w-full px-3 py-2 border rounded-lg outline-none sm:text-sm ${errors.scheduleNo ? 'border-red-400 bg-red-50' : 'border-slate-300 focus:ring-2 focus:ring-orange-500'}`} />
              {errors.scheduleNo && <p className="text-[11px] text-red-600"><AlertCircle className="w-3 h-3 inline mr-1" />{errors.scheduleNo}</p>}
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-700">Cut No <span className="text-red-500">*</span></label>
              <input type="text" name="cutNo" value={formData.cutNo} onChange={handleInputChange} placeholder="e.g. C-889" className={`w-full px-3 py-2 border rounded-lg outline-none sm:text-sm ${errors.cutNo ? 'border-red-400 bg-red-50' : 'border-slate-300 focus:ring-2 focus:ring-orange-500'}`} />
              {errors.cutNo && <p className="text-[11px] text-red-600"><AlertCircle className="w-3 h-3 inline mr-1" />{errors.cutNo}</p>}
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-700">Size <span className="text-red-500">*</span></label>
              <select name="size" value={formData.size} onChange={handleInputChange} className={`w-full px-3 py-2 border rounded-lg outline-none sm:text-sm bg-white ${errors.size ? 'border-red-400 bg-red-50' : 'border-slate-300 focus:ring-2 focus:ring-orange-500'}`}>
                <option value="" disabled>Select Size...</option>
                {SIZES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              {errors.size && <p className="text-[11px] text-red-600"><AlertCircle className="w-3 h-3 inline mr-1" />{errors.size}</p>}
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-700">Bundle Qty <span className="text-red-500">*</span></label>
              <input type="number" name="bundleQty" value={formData.bundleQty} onChange={handleInputChange} placeholder="e.g. 50" className={`w-full px-3 py-2 border rounded-lg outline-none sm:text-sm ${errors.bundleQty ? 'border-red-400 bg-red-50' : 'border-slate-300 focus:ring-2 focus:ring-orange-500'}`} />
              {errors.bundleQty && <p className="text-[11px] text-red-600"><AlertCircle className="w-3 h-3 inline mr-1" />{errors.bundleQty}</p>}
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-700">Number Range <span className="text-red-500">*</span></label>
              <input type="text" name="numberRange" value={formData.numberRange} onChange={handleInputChange} placeholder="e.g. 001 - 500" className={`w-full px-3 py-2 border rounded-lg outline-none sm:text-sm ${errors.numberRange ? 'border-red-400 bg-red-50' : 'border-slate-300 focus:ring-2 focus:ring-orange-500'}`} />
              {errors.numberRange && <p className="text-[11px] text-red-600"><AlertCircle className="w-3 h-3 inline mr-1" />{errors.numberRange}</p>}
            </div>
          </div>

          {/* UPDATED: CALCULATED QUANTITIES WATERFALL */}
          <div className="p-6 bg-orange-50/80 rounded-xl border border-orange-200">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
              
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-500 uppercase">Master Bulk Qty</label>
                <input type="text" value={formData.bulkQty} readOnly className="w-full px-3 py-3 border border-slate-200 rounded-lg text-sm bg-slate-100 text-slate-500 cursor-not-allowed font-semibold" />
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-bold text-orange-900">IN Qty (Received) <span className="text-red-500">*</span></label>
                <div className="relative">
                  <input type="number" name="inQty" value={formData.inQty} onChange={handleInputChange} placeholder="0" className={`w-full px-3 py-3 font-semibold border rounded-lg outline-none sm:text-sm ${errors.inQty ? 'border-red-400 bg-white focus:ring-red-500' : 'border-orange-300 focus:ring-2 focus:ring-orange-600'}`} />
                  {errors.inQty && <span className="absolute -bottom-5 left-0 text-[10px] text-red-600 bg-white px-1 rounded shadow-sm">{errors.inQty}</span>}
                </div>
              </div>

              <div className="space-y-1 border-r border-orange-200 pr-4">
                <label className="block text-[11px] font-bold text-orange-700 uppercase">Factory Balance</label>
                <div className="w-full px-3 py-3 border border-orange-200 bg-orange-100 rounded-lg text-sm font-bold text-orange-800">
                  {balanceBulkQty}
                </div>
              </div>

              <div className="space-y-1 pl-2">
                <label className="block text-sm font-bold text-orange-900">Cut Qty (Processed) <span className="text-red-500">*</span></label>
                <div className="relative">
                  <input type="number" name="cutQty" value={formData.cutQty} onChange={handleInputChange} placeholder="0" className={`w-full px-3 py-3 font-semibold border rounded-lg outline-none sm:text-sm ${errors.cutQty ? 'border-red-400 bg-white focus:ring-red-500' : 'border-orange-300 focus:ring-2 focus:ring-orange-600'}`} />
                  {errors.cutQty && <span className="absolute -bottom-5 left-0 text-[10px] text-red-600 bg-white px-1 rounded shadow-sm">{errors.cutQty}</span>}
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-bold text-emerald-700 uppercase">Shelf Available</label>
                <div className="w-full px-3 py-3 border-2 border-emerald-400 bg-emerald-50 rounded-lg text-lg font-black text-emerald-700 flex justify-between items-center shadow-inner">
                  <span>{availableQty}</span>
                </div>
              </div>

            </div>
          </div>

          <div className="flex justify-end pt-4 space-x-3 border-t border-slate-100">
            {editingId && (
              <button type="button" onClick={() => { setEditingId(null); setFormData(INITIAL_FORM_STATE); setErrors({}); }} className="px-4 py-2 border text-slate-700 rounded-lg hover:bg-slate-50 font-medium">Cancel</button>
            )}
            <button type="submit" className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium flex items-center shadow-sm">
              {editingId ? <Save className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
              {editingId ? 'Update Record' : 'Save Store-In Data'}
            </button>
          </div>
        </form>
      </div>

      {/* SUMMARY TABLE WITH NEW QUANTITY MATH */}
      {storeInRecords.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mt-8">
          <div className="p-6 border-b border-slate-200">
            <h3 className="text-lg font-semibold text-slate-800">Recent Store-In Records</h3>
          </div>
          <div className="overflow-x-auto">
             <table className="w-full text-left text-sm whitespace-nowrap min-w-max">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 font-semibold">Style / Spec</th>
                  <th className="px-6 py-3 font-semibold">Schedule & Details</th>
                  <th className="px-6 py-3 font-semibold">Bulk & Factory</th>
                  <th className="px-6 py-3 font-semibold">Store Inventory</th>
                  <th className="px-6 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <AnimatePresence>
                  {storeInRecords.map((record) => (
                    <motion.tr key={record.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-900">{record.styleNo}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">{record.bodyColour} / {record.season}</p>
                        <p className="text-[11px] text-slate-500 truncate max-w-[120px]">{record.components}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-slate-800">Sch: {record.scheduleNo} | Cut: {record.cutNo}</p>
                        <p className="text-xs text-slate-600 mt-0.5"><span className="font-bold">{record.size}</span> (Bundle: {record.bundleQty})</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Rng: {record.numberRange} | In: {record.cutInDate}</p>
                      </td>
                      
                      {/* NEW: Bulk & Factory Balance Column */}
                      <td className="px-6 py-4 bg-slate-50/50">
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs w-36"><span className="text-slate-500">Master Bulk:</span> <span className="font-medium text-slate-800">{record.bulkQty}</span></div>
                          <div className="flex justify-between text-xs w-36"><span className="text-slate-500">Received (IN):</span> <span className="font-medium text-orange-600">-{record.inQty}</span></div>
                          <div className="flex justify-between text-[11px] w-36 pt-1 border-t border-slate-200"><span className="font-bold text-slate-600">FACTORY OWES:</span> <span className="font-bold text-slate-800">{record.balanceBulkQty}</span></div>
                        </div>
                      </td>

                      {/* NEW: Store Inventory Column */}
                      <td className="px-6 py-4 bg-orange-50/30">
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs w-32"><span className="text-slate-500">IN Qty:</span> <span className="font-medium">{record.inQty}</span></div>
                          <div className="flex justify-between text-xs w-32"><span className="text-slate-500">CUT Qty:</span> <span className="font-medium text-red-600">-{record.cutQty}</span></div>
                          <div className="flex justify-between text-sm w-32 pt-1 border-t border-orange-200"><span className="font-bold text-emerald-700">ON SHELF:</span> <span className="font-black text-emerald-600">{record.availableQty}</span></div>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-right space-x-2">
                        <button onClick={() => handleEdit(record)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(record.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
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