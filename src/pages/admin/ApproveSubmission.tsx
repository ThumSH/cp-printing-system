// src/pages/admin/ApproveSubmission.tsx
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ClipboardCheck, AlertCircle, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { useDevelopmentStore } from '../../store/developmentStore';
import { useAdminStore, ApprovalStatus, ApprovalRecord } from '../../store/adminStore';

const INITIAL_FORM_STATE = {
  status: 'Pending' as ApprovalStatus,
  boardSet: '',
  approvalCard: '',
  raMeetingDate: '',
  bulkOrderQty: '',
};

export default function ApproveSubmission() {
  const { submissions } = useDevelopmentStore();
  const { approvals, processApproval, fetchApprovals } = useAdminStore();
  
  useEffect(() => {
    fetchApprovals();
  }, []);


  const [selectedSubmissionId, setSelectedSubmissionId] = useState('');
  const [autoFilledLevel, setAutoFilledLevel] = useState('');
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // --- DERIVED DATA FOR LISTS ---
  // A submission is pending if it has no approval record, OR if its record is set to 'Pending'
  const pendingSubmissions = submissions.filter(sub => {
    const record = approvals.find(a => a.submissionId === sub.id);
    return !record || record.status === 'Pending';
  });

  const rejectedStyles = approvals.filter(a => a.status === 'Rejected');

  // --- AUTO-FILL LOGIC ---
  useEffect(() => {
    if (selectedSubmissionId) {
      const sub = submissions.find(s => s.id === selectedSubmissionId);
      if (sub) {
        setAutoFilledLevel(sub.level);
        
        // If the admin previously worked on this and saved it as pending/rejected, load that data
        const existingRecord = approvals.find(a => a.submissionId === selectedSubmissionId);
        if (existingRecord) {
          setFormData({
            status: existingRecord.status,
            boardSet: existingRecord.boardSet || '',
            approvalCard: existingRecord.approvalCard || '',
            raMeetingDate: existingRecord.raMeetingDate || '',
            bulkOrderQty: existingRecord.bulkOrderQty || '',
          });
        } else {
          setFormData(INITIAL_FORM_STATE);
        }
      }
    } else {
      setAutoFilledLevel('');
      setFormData(INITIAL_FORM_STATE);
    }
  }, [selectedSubmissionId, submissions, approvals]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!selectedSubmissionId) newErrors.submission = 'Please select a style to review';
    
    // Only enforce these rules if the admin is trying to mark it as Approved
    if (formData.status === 'Approved') {
      if (!formData.boardSet.trim()) newErrors.boardSet = 'Board Set is required for approval';
      if (!formData.approvalCard.trim()) newErrors.approvalCard = 'Approval Card is required';
      if (!formData.raMeetingDate) newErrors.raMeetingDate = 'RA Meeting Date is required';
      if (!formData.bulkOrderQty || isNaN(Number(formData.bulkOrderQty))) newErrors.bulkOrderQty = 'Valid Bulk QTY is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const sub = submissions.find(s => s.id === selectedSubmissionId);
    if (!sub) return;

    const newRecord: ApprovalRecord = {
      id: Math.random().toString(36).substr(2, 9),
      submissionId: sub.id,
      styleNo: sub.styleNo,
      customerName: sub.customerName,
      level: sub.level,
      status: formData.status,
      reviewedAt: new Date().toISOString().split('T')[0],
      ...(formData.status === 'Approved' && {
        boardSet: formData.boardSet,
        approvalCard: formData.approvalCard,
        raMeetingDate: formData.raMeetingDate,
        bulkOrderQty: formData.bulkOrderQty,
      })
    };

    processApproval(newRecord);
    
    // Reset after processing
    setSelectedSubmissionId('');
    setFormData(INITIAL_FORM_STATE);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 pb-12">
      
      {/* HEADER */}
      <div className="flex items-center space-x-3 border-b border-slate-200 pb-4">
        <div className="p-2 bg-purple-100 rounded-lg"><ClipboardCheck className="w-6 h-6 text-purple-700" /></div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Approve Submissions</h2>
          <p className="text-slate-500 text-sm">Review development samples, assign status, and unlock production fields.</p>
        </div>
      </div>

      {/* APPROVAL WORKFLOW FORM */}
      <div className="bg-white p-6 md:p-8 rounded-xl border border-slate-200 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-800 mb-6">Decision Panel</h3>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50 p-6 rounded-lg border border-slate-100">
            
            {/* Style Dropdown (Only shows pending items to keep the list clean) */}
            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-700">Select Style No (Pending) <span className="text-red-500">*</span></label>
              <select
                value={selectedSubmissionId}
                onChange={(e) => setSelectedSubmissionId(e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg outline-none sm:text-sm bg-white ${errors.submission ? 'border-red-400' : 'border-slate-300 focus:ring-2 focus:ring-purple-600'}`}
              >
                <option value="">-- Choose Style --</option>
                {pendingSubmissions.map(sub => (
                  <option key={sub.id} value={sub.id}>{sub.styleNo} ({sub.customerName})</option>
                ))}
              </select>
              {errors.submission && <p className="text-[11px] text-red-600 mt-1"><AlertCircle className="w-3 h-3 inline mr-1" />{errors.submission}</p>}
            </div>

            {/* Auto-filled Level (Disabled) */}
            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-700">Submission Level</label>
              <input
                type="text"
                value={autoFilledLevel}
                readOnly
                placeholder="Auto-fills on selection..."
                className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none sm:text-sm bg-slate-100 text-slate-500 cursor-not-allowed"
              />
            </div>

            {/* Manual Status Control */}
            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-700">Update Status <span className="text-red-500">*</span></label>
              <select
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                disabled={!selectedSubmissionId}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none sm:text-sm bg-white focus:ring-2 focus:ring-purple-600 disabled:opacity-50"
              >
                <option value="Pending">Pending (Hold)</option>
                <option value="Approved">Approved (Proceed to Bulk)</option>
                <option value="Rejected">Rejected (Requires Revision)</option>
              </select>
            </div>
          </div>

          {/* CONDITIONAL FIELDS: Only expand if Approved */}
          <AnimatePresence>
            {formData.status === 'Approved' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pt-4 border-t border-slate-200 overflow-hidden"
              >
                {[
                  { label: 'Board Set', name: 'boardSet', type: 'text', placeholder: 'e.g. BS-102' },
                  { label: 'Approval Card', name: 'approvalCard', type: 'text', placeholder: 'e.g. AC-993' },
                  { label: 'RA Meeting Date', name: 'raMeetingDate', type: 'date' },
                  { label: 'Bulk Order QTY', name: 'bulkOrderQty', type: 'number', placeholder: 'e.g. 5000' },
                ].map((field) => (
                  <div key={field.name} className="space-y-1">
                    <label className="block text-sm font-medium text-slate-700">{field.label} <span className="text-red-500">*</span></label>
                    <input
                      type={field.type}
                      name={field.name}
                      value={(formData as any)[field.name]}
                      onChange={handleInputChange}
                      placeholder={field.placeholder}
                      className={`w-full px-3 py-2 border rounded-lg outline-none sm:text-sm ${errors[field.name] ? 'border-red-400 bg-red-50' : 'border-slate-300 focus:ring-2 focus:ring-purple-600'}`}
                    />
                    {errors[field.name] && <p className="text-[11px] text-red-600 mt-1"><AlertCircle className="w-3 h-3 inline mr-1" />{errors[field.name]}</p>}
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={!selectedSubmissionId}
              className={`px-6 py-2 text-white rounded-lg font-medium flex items-center shadow-sm transition-colors ${
                formData.status === 'Approved' ? 'bg-emerald-600 hover:bg-emerald-700' : 
                formData.status === 'Rejected' ? 'bg-red-600 hover:bg-red-700' : 
                'bg-slate-600 hover:bg-slate-700'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <CheckCircle2 className="w-4 h-4 mr-2" /> Save Decision
            </button>
          </div>
        </form>
      </div>

      {/* STATUS LISTS SPLIT VIEW */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
        
        {/* PENDING LIST */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <h3 className="font-semibold text-slate-800 flex items-center"><Clock className="w-4 h-4 mr-2 text-slate-500" /> Pending Review</h3>
            <span className="bg-slate-200 text-slate-700 text-xs font-bold px-2 py-0.5 rounded-full">{pendingSubmissions.length}</span>
          </div>
          <ul className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
            {pendingSubmissions.length > 0 ? pendingSubmissions.map(sub => (
              <li key={sub.id} className="p-4 hover:bg-slate-50 transition-colors">
                <p className="font-bold text-slate-900">{sub.styleNo}</p>
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>{sub.customerName}</span>
                  <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200">{sub.level}</span>
                </div>
              </li>
            )) : <li className="p-6 text-center text-slate-500 text-sm">No pending submissions.</li>}
          </ul>
        </div>

        {/* REJECTED LIST */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-red-50 flex items-center justify-between">
            <h3 className="font-semibold text-red-800 flex items-center"><XCircle className="w-4 h-4 mr-2 text-red-500" /> Rejected Styles</h3>
            <span className="bg-red-200 text-red-800 text-xs font-bold px-2 py-0.5 rounded-full">{rejectedStyles.length}</span>
          </div>
          <ul className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
            {rejectedStyles.length > 0 ? rejectedStyles.map(rej => (
              <li key={rej.id} className="p-4 hover:bg-red-50/50 transition-colors">
                <p className="font-bold text-slate-900 line-through decoration-red-400">{rej.styleNo}</p>
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>{rej.customerName}</span>
                  <span className="text-red-600 font-medium">Reviewed: {rej.reviewedAt}</span>
                </div>
              </li>
            )) : <li className="p-6 text-center text-slate-500 text-sm">No rejected styles currently.</li>}
          </ul>
        </div>

      </div>
    </motion.div>
  );
}