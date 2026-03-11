// src/pages/development/SubmissionSearch.tsx
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, XCircle, Filter, CheckCircle2, Clock } from 'lucide-react';
import { useDevelopmentStore } from '../../store/developmentStore';
import { useAdminStore } from '../../store/adminStore'; // <-- NEW: Import Admin Store

export default function SubmissionSearch() {
  const { submissions } = useDevelopmentStore();
  const { approvals } = useAdminStore(); // <-- NEW: Pull Admin decisions

  // --- SEARCH & FILTER STATE ---
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('');

  // --- DYNAMIC DROPDOWN DATA ---
  const uniqueCustomers = Array.from(new Set(submissions.map((sub) => sub.customerName)));
  const availableStyles = selectedCustomer
    ? submissions.filter((sub) => sub.customerName === selectedCustomer).map(sub => sub.styleNo)
    : [];

  // --- HANDLERS ---
  const handleSearchChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'customerSearch') {
      setSelectedCustomer(value);
      setSelectedStyle(''); 
    } else if (name === 'styleSearch') {
      setSelectedStyle(value);
    }
  };

  const handleClearSearch = () => {
    setSelectedCustomer('');
    setSelectedStyle('');
  };

  // Filter the table based on dropdowns
  const filteredSubmissions = submissions.filter(record => {
    const matchCustomer = selectedCustomer === '' || record.customerName === selectedCustomer;
    const matchStyle = selectedStyle === '' || record.styleNo === selectedStyle;
    return matchCustomer && matchStyle;
  });

  // Helper function to get the status badge
  const getStatusBadge = (submissionId: string) => {
    // Look for a matching decision in the Admin store
    const approvalRecord = approvals.find(a => a.submissionId === submissionId);
    const status = approvalRecord ? approvalRecord.status : 'Pending';

    switch (status) {
      case 'Approved':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 mr-1" /> Approved
          </span>
        );
      case 'Rejected':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">
            <XCircle className="w-3 h-3 mr-1" /> Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">
            <Clock className="w-3 h-3 mr-1" /> Pending
          </span>
        );
    }
  };

  if (submissions.length === 0) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center h-[60vh] text-center">
        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 max-w-md">
          <Search className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">No Submissions Found</h2>
          <p className="text-slate-600 text-sm mb-4">There are currently no development approvals submitted to the queue to search for.</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 pb-12 max-w-6xl mx-auto">
      
      {/* HEADER */}
      <div className="flex items-center space-x-3 border-b border-slate-200 pb-4">
        <div className="p-2 bg-emerald-100 rounded-lg">
          <Search className="w-6 h-6 text-emerald-700" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Submission Search</h2>
          <p className="text-slate-500 text-sm">Search and review past development submissions and their approval status.</p>
        </div>
      </div>

      {/* FILTER PANEL */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-6 items-end">
        <div className="w-full md:w-1/3 space-y-1">
          <label className="text-sm font-medium text-slate-700 flex items-center">
            <Filter className="w-4 h-4 mr-1"/> Filter by Customer
          </label>
          <select
            name="customerSearch"
            value={selectedCustomer}
            onChange={handleSearchChange}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none sm:text-sm focus:ring-2 focus:ring-emerald-600 bg-slate-50"
          >
            <option value="">All Customers</option>
            {uniqueCustomers.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div className="w-full md:w-1/3 space-y-1">
          <label className="block text-sm font-medium text-slate-700">Filter by Style No</label>
          <select
            name="styleSearch"
            value={selectedStyle}
            onChange={handleSearchChange}
            disabled={!selectedCustomer}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none sm:text-sm focus:ring-2 focus:ring-emerald-600 bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="">All Styles</option>
            {availableStyles.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        
        {(selectedCustomer || selectedStyle) && (
          <button 
            onClick={handleClearSearch} 
            className="px-4 py-2 text-sm text-slate-500 hover:text-slate-800 transition-colors flex items-center"
          >
             <XCircle className="w-4 h-4 mr-1" /> Clear Search
          </button>
        )}
      </div>

      {/* DATA TABLE */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mt-8">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider">Search Results</h3>
          <span className="bg-emerald-100 text-emerald-800 text-xs font-semibold px-2.5 py-1 rounded-full">
            {filteredSubmissions.length} Found
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap min-w-max">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 font-semibold w-1/5">Style / Customer</th>
                <th className="px-6 py-3 font-semibold w-1/6">Date</th>
                <th className="px-6 py-3 font-semibold w-1/6">Level</th>
                <th className="px-6 py-3 font-semibold w-1/5">Admin Status</th> {/* <-- NEW COLUMN */}
                <th className="px-6 py-3 font-semibold w-1/3">Comments</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSubmissions.length > 0 ? (
                filteredSubmissions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-900">{sub.styleNo}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{sub.customerName}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-medium text-slate-700">{sub.submissionDate}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded text-xs font-semibold">
                        {sub.level}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {/* Execute the badge helper function here */}
                      {getStatusBadge(sub.id)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="max-w-xs md:max-w-md">
                        <p className="text-sm text-slate-600 truncate whitespace-normal line-clamp-2" title={sub.comment}>
                          {sub.comment}
                        </p>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                    No submissions match your search criteria.
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