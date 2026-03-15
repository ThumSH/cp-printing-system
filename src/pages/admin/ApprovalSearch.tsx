// src/pages/admin/ApprovalSearch.tsx
import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  Save,
  Filter,
  Lock,
  GitBranch,
} from 'lucide-react';
import { useAdminStore, ApprovalRecord, ApprovalStatus } from '../../store/adminStore';
import { useDevelopmentStore } from '../../store/developmentStore';

const INITIAL_FORM_STATE = {
  status: 'Approved' as ApprovalStatus,
  boardSet: '',
  approvalCard: '',
  raMeetingDate: '',
  bulkOrderQty: '',
};

export default function ApprovalSearch() {
  const { approvals, fetchApprovals, processApproval, deleteApproval } = useAdminStore();
  const { submissions, fetchData } = useDevelopmentStore();

  const [filterCustomer, setFilterCustomer] = useState('');
  const [filterStatus, setFilterStatus] = useState<'All' | ApprovalStatus>('All');
  const [showHistory, setShowHistory] = useState(false);

  const [activeRecord, setActiveRecord] = useState<ApprovalRecord | null>(null);
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const loadPageData = async () => {
      try {
        await Promise.all([fetchApprovals(), fetchData()]);
      } catch (error) {
        setErrors({
          status:
            error instanceof Error
              ? error.message
              : 'Failed to load approval history.',
        });
      }
    };

    loadPageData();
  }, [fetchApprovals, fetchData]);

  const approvalRows = useMemo(() => {
    return approvals
      .map((record) => {
        const linkedSubmission = submissions.find((sub) => sub.id === record.submissionId);

        return {
          ...record,
          revisionNo: linkedSubmission?.revisionNo || record.revisionNo || 1,
          isLatestRevision: linkedSubmission?.isLatestRevision ?? true,
          submissionDate: linkedSubmission?.submissionDate || '',
        };
      })
      .filter((row) => {
        const matchCustomer =
          filterCustomer === '' || row.customerName === filterCustomer;

        const matchStatus =
          filterStatus === 'All' || row.status === filterStatus;

        const matchHistory = showHistory ? true : row.isLatestRevision;

        return matchCustomer && matchStatus && matchHistory;
      })
      .sort((a, b) => {
        const bTime = new Date(b.submissionDate || b.reviewedAt).getTime();
        const aTime = new Date(a.submissionDate || a.reviewedAt).getTime();

        if (bTime !== aTime) return bTime - aTime;
        return (b.revisionNo || 1) - (a.revisionNo || 1);
      });
  }, [approvals, submissions, filterCustomer, filterStatus, showHistory]);

  const uniqueCustomers = Array.from(new Set(approvals.map((a) => a.customerName)));

  const activeSubmission = activeRecord
    ? submissions.find((sub) => sub.id === activeRecord.submissionId) || null
    : null;

  const isLockedOldRevision = activeSubmission
    ? !activeSubmission.isLatestRevision
    : false;

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

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }

    if (errors.status) {
      setErrors((prev) => ({
        ...prev,
        status: '',
      }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!activeRecord) {
      newErrors.status = 'Please select an approval record first.';
    }

    if (isLockedOldRevision) {
      newErrors.status = 'Older revisions are locked and cannot be modified.';
    }

    if (formData.status === 'Approved') {
      if (!formData.boardSet.trim()) newErrors.boardSet = 'Board Set required';
      if (!formData.approvalCard.trim()) newErrors.approvalCard = 'Approval Card required';
      if (!formData.raMeetingDate) newErrors.raMeetingDate = 'Date required';
      if (!formData.bulkOrderQty.trim() || isNaN(Number(formData.bulkOrderQty))) {
        newErrors.bulkOrderQty = 'Valid QTY required';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!activeRecord || !validateForm() || isLockedOldRevision) return;

    setIsSaving(true);

    const updatedRecord: ApprovalRecord = {
      ...activeRecord,
      status: formData.status,
      reviewedAt: new Date().toISOString().split('T')[0],
      ...(formData.status === 'Approved'
        ? {
            boardSet: formData.boardSet.trim(),
            approvalCard: formData.approvalCard.trim(),
            raMeetingDate: formData.raMeetingDate,
            bulkOrderQty: formData.bulkOrderQty.trim(),
          }
        : {
            boardSet: undefined,
            approvalCard: undefined,
            raMeetingDate: undefined,
            bulkOrderQty: undefined,
          }),
    };

    try {
      await processApproval(updatedRecord);
      await fetchApprovals();
      setActiveRecord(null);
      setErrors({});
    } catch (error) {
      setErrors({
        status:
          error instanceof Error ? error.message : 'Failed to update approval.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (record: ApprovalRecord) => {
    const linkedSubmission = submissions.find((sub) => sub.id === record.submissionId);

    if (linkedSubmission && !linkedSubmission.isLatestRevision) {
      setErrors({
        status: 'Older revision decisions are locked and should remain as history.',
      });
      return;
    }

    if (!window.confirm('Are you sure you want to completely delete this record?')) {
      return;
    }

    setIsDeletingId(record.id);

    try {
      await deleteApproval(record.id);
      if (activeRecord?.id === record.id) {
        setActiveRecord(null);
      }
      setErrors({});
    } catch (error) {
      setErrors({
        status:
          error instanceof Error ? error.message : 'Failed to delete approval.',
      });
    } finally {
      setIsDeletingId(null);
    }
  };

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Approval History Search</h1>
        <p className="mt-1 text-sm text-slate-500">
          Search and review approval decisions. Older revisions are history-only.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Filter className="h-5 w-5 text-slate-500" />
          <h2 className="text-lg font-semibold text-slate-900">Filters</h2>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Filter by Customer
            </label>
            <select
              value={filterCustomer}
              onChange={(e) => setFilterCustomer(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-600"
            >
              <option value="">All Customers</option>
              {uniqueCustomers.map((customer) => (
                <option key={customer} value={customer}>
                  {customer}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Filter by Status
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as 'All' | ApprovalStatus)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-600"
            >
              <option value="All">All Statuses</option>
              <option value="Approved">Approved Only</option>
              <option value="Rejected">Rejected Only</option>
              <option value="Pending">Pending Only</option>
            </select>
          </div>

          <div className="flex items-end">
            <label className="flex w-full items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={showHistory}
                onChange={(e) => setShowHistory(e.target.checked)}
              />
              Show history revisions
            </label>
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={() => {
                setFilterCustomer('');
                setFilterStatus('All');
                setShowHistory(false);
                setErrors({});
              }}
              className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-500 hover:text-slate-800"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {activeRecord && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">
                Modifying Decision: {activeRecord.styleNo}
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                {activeRecord.customerName} | Level: {activeRecord.level}
              </p>
              <div className="mt-2 inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                <GitBranch className="h-3 w-3" />
                Rev {activeRecord.revisionNo}
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setActiveRecord(null);
                setErrors({});
              }}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              ×
            </button>
          </div>

          {isLockedOldRevision && (
            <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
              <div className="flex items-center gap-2 font-semibold">
                <Lock className="h-4 w-4" />
                Older revision locked
              </div>
              <p className="mt-1">
                A newer revision exists for this style, so this older approval record cannot be changed.
              </p>
            </div>
          )}

          {errors.status && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {errors.status}
            </div>
          )}

          <form onSubmit={handleUpdate} className="space-y-5">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Status
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                disabled={isLockedOldRevision || isSaving}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-600 disabled:bg-slate-100"
              >
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>

            {formData.status === 'Approved' && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <InputField
                  label="Board Set"
                  name="boardSet"
                  value={formData.boardSet}
                  onChange={handleInputChange}
                  error={errors.boardSet}
                  disabled={isLockedOldRevision || isSaving}
                />
                <InputField
                  label="Approval Card"
                  name="approvalCard"
                  value={formData.approvalCard}
                  onChange={handleInputChange}
                  error={errors.approvalCard}
                  disabled={isLockedOldRevision || isSaving}
                />
                <InputField
                  label="RA Meeting Date"
                  name="raMeetingDate"
                  type="date"
                  value={formData.raMeetingDate}
                  onChange={handleInputChange}
                  error={errors.raMeetingDate}
                  disabled={isLockedOldRevision || isSaving}
                />
                <InputField
                  label="Bulk Order QTY"
                  name="bulkOrderQty"
                  type="number"
                  value={formData.bulkOrderQty}
                  onChange={handleInputChange}
                  error={errors.bulkOrderQty}
                  disabled={isLockedOldRevision || isSaving}
                />
              </div>
            )}

            <button
              type="submit"
              disabled={isLockedOldRevision || isSaving}
              className="inline-flex items-center rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? 'Updating...' : 'Update Decision'}
            </button>
          </form>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {approvalRows.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm whitespace-nowrap">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-6 py-3 font-semibold">Style Details</th>
                  <th className="px-6 py-3 font-semibold">Revision</th>
                  <th className="px-6 py-3 font-semibold">Status / Date</th>
                  <th className="px-6 py-3 font-semibold">Production Data</th>
                  <th className="px-6 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                <AnimatePresence>
                  {approvalRows.map((record) => (
                    <motion.tr
                      key={record.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="hover:bg-slate-50"
                    >
                      <td className="px-6 py-4">
                        <p className="font-semibold text-slate-900">{record.styleNo}</p>
                        <p className="text-xs text-slate-500">{record.customerName}</p>
                        <p className="mt-1 text-xs text-slate-400">{record.level}</p>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-2">
                          <span className="inline-flex w-fit items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                            <GitBranch className="h-3 w-3" />
                            Rev {record.revisionNo}
                          </span>

                          {record.isLatestRevision ? (
                            <span className="inline-flex w-fit rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                              Latest
                            </span>
                          ) : (
                            <span className="inline-flex w-fit rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                              History
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        {record.status === 'Approved' ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Approved
                          </span>
                        ) : record.status === 'Rejected' ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">
                            <XCircle className="h-3.5 w-3.5" />
                            Rejected
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                            <Clock className="h-3.5 w-3.5" />
                            Pending
                          </span>
                        )}

                        <p className="mt-2 text-xs text-slate-500">
                          Processed: {record.reviewedAt}
                        </p>
                      </td>

                      <td className="px-6 py-4">
                        {record.status === 'Approved' ? (
                          <div className="space-y-1 text-xs text-slate-600">
                            <p>BS: {record.boardSet}</p>
                            <p>AC: {record.approvalCard}</p>
                            <p>RA Date: {record.raMeetingDate}</p>
                            <p>Bulk QTY: {record.bulkOrderQty}</p>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">
                            N/A - Style {record.status}
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveRecord(record);
                              setErrors({});
                            }}
                            disabled={!record.isLatestRevision}
                            className={`rounded p-1.5 transition-colors ${
                              record.isLatestRevision
                                ? 'text-indigo-600 hover:bg-indigo-50'
                                : 'cursor-not-allowed text-slate-300'
                            }`}
                            title={
                              record.isLatestRevision
                                ? 'Edit Decision'
                                : 'Older revision locked'
                            }
                          >
                            {record.isLatestRevision ? (
                              <Edit2 className="h-4 w-4" />
                            ) : (
                              <Lock className="h-4 w-4" />
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(record)}
                            disabled={!record.isLatestRevision || isDeletingId === record.id}
                            className={`rounded p-1.5 transition-colors ${
                              record.isLatestRevision
                                ? 'text-red-600 hover:bg-red-50'
                                : 'cursor-not-allowed text-slate-300'
                            }`}
                            title={
                              record.isLatestRevision
                                ? 'Delete Decision completely'
                                : 'Older revision locked'
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-sm text-slate-500">
            No matching approval records found.
          </div>
        )}
      </div>
    </div>
  );
}

function InputField({
  label,
  name,
  value,
  onChange,
  error,
  type = 'text',
  disabled = false,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => void;
  error?: string;
  type?: string;
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-600 disabled:bg-slate-100"
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}