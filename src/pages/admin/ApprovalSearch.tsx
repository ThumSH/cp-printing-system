// src/pages/admin/ApprovalSearch.tsx
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Edit2, Trash2, CheckCircle2, XCircle, Clock, Save, Filter } from 'lucide-react';
import { useAdminStore, ApprovalRecord, ApprovalStatus } from '../../store/adminStore';

const INITIAL_FORM_STATE = {
  status: 'Approved' as ApprovalStatus,
  boardSet: '',
  approvalCard: '',
  raMeetingDate: '',
  bulkOrderQty: '',
};

export default function ApprovalSearch() {
  const { approvals, processApproval, deleteApproval } = useAdminStore();

  // --- SEARCH & FILTER STATE ---
  const [filterCustomer, setFilterCustomer] = useState('');
  const [filterStatus, setFilterStatus] = useState<ApprovalStatus | 'All'>('All');

  // --- EDIT STATE ---
  const [activeRecord, setActiveRecord] = useState<ApprovalRecord | null>(null);
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // --- DYNAMIC DATA EXCTRACTION ---
  const uniqueCustomers = Array.from(new Set(approvals.map(a => a.customerName)));

  // Filter the table based on dropdowns (UPDATED: Now includes Pending records)
  const filteredApprovals = approvals.filter(record => {
    const matchCustomer = filterCustomer === '' || record.customerName === filterCustomer;
    const matchStatus = filterStatus === 'All' || record.status === filterStatus;
    return matchCustomer && matchStatus; 
  });

  // --- AUTO-FILL EDIT FORM ---
  useEffect(() => {
    if (activeRecord) {
      setFormData({
        status: activeRecord.status,
        boardSet: activeRecord.boardSet || '',
        approvalCard: activeRecord.approvalCard || '',
        raMeetingDate: activeRecord.raMeetingDate || '',
        bulkOrderQty: activeRecord.bulkOrderQty || '',
      });
      setErrors({});
    } else {
      setFormData(INITIAL_FORM_STATE);
    }
  }, [activeRecord]);

  // --- HANDLERS ---
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (formData.status === 'Approved') {
      if (!formData.boardSet.trim()) newErrors.boardSet = 'Board Set required';
      if (!formData.approvalCard.trim()) newErrors.approvalCard = 'Approval Card required';
      if (!formData.raMeetingDate) newErrors.raMeetingDate = 'Date required';
      if (!formData.bulkOrderQty) newErrors.bulkOrderQty = 'QTY required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRecord || !validateForm()) return;

    const updatedRecord: ApprovalRecord = {
      ...activeRecord,
      status: formData.status,
      reviewedAt: new Date().toISOString().split('T')[0], 
      ...(formData.status === 'Approved' ? {
        boardSet: formData.boardSet,
        approvalCard: formData.approvalCard,
        raMeetingDate: formData.raMeetingDate,
        bulkOrderQty: formData.bulkOrderQty,
      } : {
        // If changed to rejected or pending, wipe the production fields
        boardSet: undefined,
        approvalCard: undefined,
        raMeetingDate: undefined,
        bulkOrderQty: undefined,
      })
    };

    processApproval(updatedRecord);
    setActiveRecord(null); 
    alert('Decision updated successfully.');
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to completely delete this record?')) {
      deleteApproval(id);
      if (activeRecord?.id === id) setActiveRecord(null);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 pb-12">
      
      {/* HEADER */}
      <div className="flex items-center space-x-3 border-b border-slate-200 pb-4">
        <div className="p-2 bg-indigo-100 rounded-lg"><Search className="w-6 h-6 text-indigo-700" /></div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Approval History Search</h2>
          <p className="text-slate-500 text-sm">Search, filter, and modify previously processed development decisions.</p>
        </div>
      </div>

      {/* FILTER PANEL */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-6 items-end">
        <div className="w-full md:w-1/3 space-y-1">
          <label className="block text-sm font-medium text-slate-700 flex items-center"><Filter className="w-4 h-4 mr-1"/> Filter by Customer</label>
          <select
            value={filterCustomer}
            onChange={(e) => setFilterCustomer(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none sm:text-sm focus:ring-2 focus:ring-indigo-600"
          >
            <option value="">All Customers</option>
            {uniqueCustomers.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div className="w-full md:w-1/3 space-y-1">
          <label className="block text-sm font-medium text-slate-700">Filter by Status</label>
          {/* UPDATED: Added "Pending Only" to the search filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none sm:text-sm focus:ring-2 focus:ring-indigo-600"
          >
            <option value="All">All Statuses</option>
            <option value="Approved">Approved Only</option>
            <option value="Rejected">Rejected Only</option>
            <option value="Pending">Pending Only</option> 
          </select>
        </div>
        
        {(filterCustomer !== '' || filterStatus !== 'All') && (
          <button 
            onClick={() => { setFilterCustomer(''); setFilterStatus('All'); }} 
            className="px-4 py-2 text-sm text-slate-500 hover:text-slate-800 transition-colors"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* INLINE EDIT PANEL */}
      <AnimatePresence>
        {activeRecord && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="bg-slate-800 p-6 md:p-8 rounded-xl shadow-lg relative overflow-hidden text-white">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg font-semibold text-white flex items-center">
                  <Edit2 className="w-5 h-5 mr-2 text-indigo-400" /> Modifying Decision: {activeRecord.styleNo}
                </h3>
                <p className="text-slate-400 text-sm mt-1">{activeRecord.customerName} | Level: {activeRecord.level}</p>
              </div>
              <button onClick={() => setActiveRecord(null)} className="text-slate-400 hover:text-white"><XCircle className="w-6 h-6" /></button>
            </div>

            <form onSubmit={handleUpdate} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                
                {/* UPDATED: Added "Pending" to the edit form */}
                <div className="space-y-1 md:col-span-1">
                  <label className="block text-sm font-medium text-slate-300">Status</label>
                  <select name="status" value={formData.status} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-600 rounded-lg outline-none sm:text-sm bg-slate-700 text-white focus:ring-2 focus:ring-indigo-500">
                    <option value="Pending">Pending</option>
                    <option value="Approved">Approved</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>

                {formData.status === 'Approved' && (
                  <>
                    {[
                      { label: 'Board Set', name: 'boardSet', type: 'text' },
                      { label: 'Approval Card', name: 'approvalCard', type: 'text' },
                      { label: 'RA Meeting Date', name: 'raMeetingDate', type: 'date' },
                      { label: 'Bulk Order QTY', name: 'bulkOrderQty', type: 'number' },
                    ].map((field) => (
                      <div key={field.name} className="space-y-1 md:col-span-1">
                        <label className="block text-sm font-medium text-slate-300">{field.label}</label>
                        <input
                          type={field.type}
                          name={field.name}
                          value={(formData as any)[field.name]}
                          onChange={handleInputChange}
                          className={`w-full px-3 py-2 border rounded-lg outline-none sm:text-sm bg-slate-700 text-white ${errors[field.name] ? 'border-red-400' : 'border-slate-600 focus:ring-2 focus:ring-indigo-500'}`}
                        />
                      </div>
                    ))}
                  </>
                )}
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-700">
                <button type="submit" className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 font-medium flex items-center transition-colors">
                  <Save className="w-4 h-4 mr-2" /> Update Decision
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* DATA TABLE */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap min-w-max">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 font-semibold">Style Details</th>
                <th className="px-6 py-4 font-semibold">Status / Date</th>
                <th className="px-6 py-4 font-semibold">Production Data</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredApprovals.length > 0 ? (
                filteredApprovals.map((record) => (
                  <tr key={record.id} className={`hover:bg-slate-50 transition-colors ${activeRecord?.id === record.id ? 'bg-indigo-50/50' : ''}`}>
                    
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-900">{record.styleNo}</p>
                      <p className="text-xs text-slate-600 mt-0.5">{record.customerName}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">{record.level}</p>
                    </td>
                    
                    {/* UPDATED: Dynamic Badge Rendering for 3 states */}
                    <td className="px-6 py-4">
                      {record.status === 'Approved' ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 mr-1" /> Approved
                        </span>
                      ) : record.status === 'Rejected' ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">
                          <XCircle className="w-3 h-3 mr-1" /> Rejected
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">
                          <Clock className="w-3 h-3 mr-1" /> Pending
                        </span>
                      )}
                      <p className="text-[11px] text-slate-500 mt-1.5">Processed: {record.reviewedAt}</p>
                    </td>

                    {/* UPDATED: Dynamic Text for N/A fields */}
                    <td className="px-6 py-4">
                      {record.status === 'Approved' ? (
                        <div className="text-xs text-slate-600 space-y-1">
                          <p>BS: <span className="font-medium text-slate-900">{record.boardSet}</span> | AC: <span className="font-medium text-slate-900">{record.approvalCard}</span></p>
                          <p>RA Date: <span className="font-medium text-slate-900">{record.raMeetingDate}</span></p>
                          <p>Bulk QTY: <span className="font-medium text-indigo-700">{record.bulkOrderQty}</span></p>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">N/A - Style {record.status}</span>
                      )}
                    </td>

                    <td className="px-6 py-4 text-right space-x-2">
                      <button 
                        onClick={() => setActiveRecord(record)} 
                        className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded transition-colors" title="Edit Decision"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(record.id)} 
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors" title="Delete Decision completely"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                    No matching approval records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}