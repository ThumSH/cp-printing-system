// src/pages/development/DevelopmentSubmission.tsx
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Plus, Trash2, Edit2, CheckCircle2, AlertCircle, MessageSquare } from 'lucide-react';
import { useDevelopmentStore, SubmissionForm } from '../../store/developmentStore';

const INITIAL_FORM_STATE: Omit<SubmissionForm, 'id'> = {
  styleNo: '',
  customerName: '',
  submissionDate: '',
  level: '',
  comment: '',
};

export default function DevelopmentSubmission() {
  // Pull BOTH jobs (for dropdowns) and submissions (for the table) from the global store
  const { jobs, submissions, addSubmission, updateSubmission, deleteSubmission } = useDevelopmentStore();

  const [formData, setFormData] = useState(INITIAL_FORM_STATE);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // --- DYNAMIC DATA EXTRACTION ---
  const uniqueCustomers = Array.from(new Set(jobs.map((job) => job.customer)));
  const availableStyles = formData.customerName 
    ? jobs.filter((job) => job.customer === formData.customerName).map(job => job.styleNo)
    : jobs.map(job => job.styleNo);

  // --- HANDLERS ---
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (name === 'customerName') {
      setFormData((prev) => ({ ...prev, customerName: value, styleNo: '' }));
    } else if (name === 'styleNo') {
      const matchedJob = jobs.find(j => j.styleNo === value);
      if (matchedJob) {
        setFormData((prev) => ({ ...prev, styleNo: value, customerName: matchedJob.customer }));
      }
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
    
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.customerName) newErrors.customerName = 'Please select a customer';
    if (!formData.styleNo) newErrors.styleNo = 'Please select a style number';
    if (!formData.submissionDate) newErrors.submissionDate = 'Submission date is required';
    if (!formData.level) newErrors.level = 'Please select an approval level';
    if (!formData.comment.trim()) newErrors.comment = 'A comment or note is required for reviewers';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // --- GLOBALLY PERSISTED ACTIONS ---
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (editingId) {
      updateSubmission(editingId, { ...formData, id: editingId });
      setEditingId(null);
    } else {
      addSubmission({ ...formData, id: Math.random().toString(36).substr(2, 9) });
    }
    setFormData(INITIAL_FORM_STATE);
  };

  const handleEdit = (submission: SubmissionForm) => {
    setFormData(submission);
    setEditingId(submission.id);
    setErrors({});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to completely delete this submission?')) {
      deleteSubmission(id);
    }
  };

  // Warning state if no jobs exist yet
  if (jobs.length === 0) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center h-[60vh] text-center">
        <div className="bg-amber-50 p-6 rounded-2xl border border-amber-200 max-w-md">
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">No Development Jobs Found</h2>
          <p className="text-slate-600 text-sm mb-4">You must create at least one development job in the Workspace before you can submit it for approval.</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 pb-12">
      <div className="flex items-center space-x-3 border-b border-slate-200 pb-4">
        <div className="p-2 bg-blue-100 rounded-lg"><Send className="w-6 h-6 text-blue-700" /></div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Submit for Approval</h2>
          <p className="text-slate-500 text-sm">Route your completed development samples to management or QC.</p>
        </div>
      </div>

      <div className="bg-white p-6 md:p-8 rounded-xl border border-slate-200 shadow-sm">
        <div className="mb-6 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-slate-800">
            {editingId ? 'Edit Submission Entry' : 'New Approval Submission'}
          </h3>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Customer Dropdown */}
            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-700">Customer <span className="text-red-500">*</span></label>
              <div className="relative">
                <select name="customerName" value={formData.customerName} onChange={handleInputChange} className={`w-full px-3 py-2 border rounded-lg outline-none transition-all sm:text-sm appearance-none bg-white ${errors.customerName ? 'border-red-400 focus:ring-2 focus:ring-red-200 bg-red-50' : 'border-slate-300 focus:ring-2 focus:ring-blue-600 focus:border-blue-600'}`}>
                  <option value="" disabled>Select a Customer...</option>
                  {uniqueCustomers.map(customer => (<option key={customer} value={customer}>{customer}</option>))}
                </select>
                {errors.customerName && <div className="absolute -bottom-5 left-0 flex items-center text-[11px] text-red-600 font-medium"><AlertCircle className="w-3 h-3 mr-1" /> {errors.customerName}</div>}
              </div>
            </div>

            {/* Style No Dropdown */}
            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-700">Style No <span className="text-red-500">*</span></label>
              <div className="relative">
                <select name="styleNo" value={formData.styleNo} onChange={handleInputChange} className={`w-full px-3 py-2 border rounded-lg outline-none transition-all sm:text-sm appearance-none bg-white ${errors.styleNo ? 'border-red-400 focus:ring-2 focus:ring-red-200 bg-red-50' : 'border-slate-300 focus:ring-2 focus:ring-blue-600 focus:border-blue-600'}`}>
                  <option value="" disabled>Select Style...</option>
                  {availableStyles.map(style => (<option key={style} value={style}>{style}</option>))}
                </select>
                {errors.styleNo && <div className="absolute -bottom-5 left-0 flex items-center text-[11px] text-red-600 font-medium"><AlertCircle className="w-3 h-3 mr-1" /> {errors.styleNo}</div>}
              </div>
            </div>

            {/* Submission Date */}
            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-700">Submission Date <span className="text-red-500">*</span></label>
              <div className="relative">
                <input type="date" name="submissionDate" value={formData.submissionDate} onChange={handleInputChange} className={`w-full px-3 py-2 border rounded-lg outline-none transition-all sm:text-sm ${errors.submissionDate ? 'border-red-400 focus:ring-2 focus:ring-red-200 bg-red-50' : 'border-slate-300 focus:ring-2 focus:ring-blue-600 focus:border-blue-600'}`} />
                {errors.submissionDate && <div className="absolute -bottom-5 left-0 flex items-center text-[11px] text-red-600 font-medium"><AlertCircle className="w-3 h-3 mr-1" /> {errors.submissionDate}</div>}
              </div>
            </div>

            {/* Level Dropdown */}
            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-700">Submission Level <span className="text-red-500">*</span></label>
              <div className="relative">
                <select name="level" value={formData.level} onChange={handleInputChange} className={`w-full px-3 py-2 border rounded-lg outline-none transition-all sm:text-sm appearance-none bg-white ${errors.level ? 'border-red-400 focus:ring-2 focus:ring-red-200 bg-red-50' : 'border-slate-300 focus:ring-2 focus:ring-blue-600 focus:border-blue-600'}`}>
                  <option value="" disabled>Select Level...</option>
                  <option value="Level 1 (Initial Sample)">Level 1 (Initial Sample)</option>
                  <option value="Level 2 (First Revision)">Level 2 (First Revision)</option>
                  <option value="Level 3 (Second Revision)">Level 3 (Second Revision)</option>
                  <option value="Level 4 (Pre-Production Final)">Level 4 (Pre-Production Final)</option>
                </select>
                {errors.level && <div className="absolute -bottom-5 left-0 flex items-center text-[11px] text-red-600 font-medium"><AlertCircle className="w-3 h-3 mr-1" /> {errors.level}</div>}
              </div>
            </div>
          </div>

          {/* Comment Section */}
          <div className="space-y-1 pt-2">
            <label className="block text-sm font-medium text-slate-700">Developer Comments <span className="text-red-500">*</span></label>
            <div className="relative">
              <textarea name="comment" value={formData.comment} onChange={handleInputChange} rows={3} placeholder="Detail the exact changes made..." className={`w-full px-3 py-2 border rounded-lg outline-none transition-all sm:text-sm resize-none ${errors.comment ? 'border-red-400 focus:ring-2 focus:ring-red-200 bg-red-50' : 'border-slate-300 focus:ring-2 focus:ring-blue-600 focus:border-blue-600'}`} />
              {errors.comment && <div className="absolute -bottom-5 left-0 flex items-center text-[11px] text-red-600 font-medium"><AlertCircle className="w-3 h-3 mr-1" /> {errors.comment}</div>}
            </div>
          </div>

          <div className="flex justify-end pt-6 space-x-3 border-t border-slate-100">
            {editingId && (
              <button type="button" onClick={() => { setEditingId(null); setFormData(INITIAL_FORM_STATE); setErrors({}); }} className="px-4 py-2 border text-slate-700 rounded-lg hover:bg-slate-50 font-medium transition-colors">Cancel</button>
            )}
            <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center shadow-sm">
              {editingId ? <CheckCircle2 className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
              {editingId ? 'Update Submission' : 'Add to Queue'}
            </button>
          </div>
        </form>
      </div>

      {/* DYNAMIC SUMMARY TABLE WITH UPDATE/DELETE BUTTONS */}
      {submissions.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mt-8">
           <table className="w-full text-left text-sm whitespace-nowrap min-w-max">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 font-semibold w-1/4">Style / Customer</th>
                  <th className="px-6 py-3 font-semibold w-1/6">Date</th>
                  <th className="px-6 py-3 font-semibold w-1/6">Level</th>
                  <th className="px-6 py-3 font-semibold w-1/3">Comments</th>
                  <th className="px-6 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <AnimatePresence>
                  {submissions.map((sub) => (
                    <motion.tr key={sub.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-900">{sub.styleNo}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{sub.customerName}</p>
                      </td>
                      <td className="px-6 py-4"><span className="font-medium text-slate-700">{sub.submissionDate}</span></td>
                      <td className="px-6 py-4"><span className="px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded text-xs font-semibold">{sub.level}</span></td>
                      <td className="px-6 py-4">
                        <div className="flex items-start max-w-xs">
                          <MessageSquare className="w-4 h-4 text-slate-400 mr-2 shrink-0 mt-0.5" />
                          <p className="text-sm text-slate-600 truncate whitespace-normal line-clamp-2" title={sub.comment}>{sub.comment}</p>
                        </div>
                      </td>
                      
                      {/* ACTION BUTTONS */}
                      <td className="px-6 py-4 text-right space-x-2">
                        <button 
                          onClick={() => handleEdit(sub)} 
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors" 
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(sub.id)} 
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors" 
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
        </div>
      )}
    </motion.div>
  );
}