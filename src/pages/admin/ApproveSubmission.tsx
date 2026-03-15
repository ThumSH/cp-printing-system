// src/pages/admin/ApproveSubmission.tsx
import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ClipboardCheck,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  PackageCheck,
  CalendarDays,
  Palette,
  Shirt,
  Layers3,
  FileImage,
  User2,
  GitBranch,
  Lock,
} from 'lucide-react';
import { useDevelopmentStore } from '../../store/developmentStore';
import {
  useAdminStore,
  ApprovalStatus,
  ApprovalRecord,
} from '../../store/adminStore';

const INITIAL_FORM_STATE = {
  status: 'Pending' as ApprovalStatus,
  boardSet: '',
  approvalCard: '',
  raMeetingDate: '',
  bulkOrderQty: '',
};

const badgeStyles: Record<ApprovalStatus, string> = {
  Pending: 'bg-amber-50 text-amber-700 border-amber-200',
  Approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Rejected: 'bg-red-50 text-red-700 border-red-200',
};

export default function ApproveSubmission() {
  const { jobs, submissions, fetchData } = useDevelopmentStore();
  const { approvals, fetchApprovals, processApproval } = useAdminStore();

  const [searchCustomer, setSearchCustomer] = useState('');
  const [searchStyleNo, setSearchStyleNo] = useState('');
  const [selectedSubmissionId, setSelectedSubmissionId] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadPageData = async () => {
      try {
        await Promise.all([fetchData(), fetchApprovals()]);
      } catch (error) {
        console.error('Failed to load approval page data:', error);
        setErrors({
          submission:
            error instanceof Error
              ? error.message
              : 'Failed to load submissions or approvals.',
        });
      }
    };

    loadPageData();
  }, [fetchData, fetchApprovals]);

  const enrichedSubmissions = useMemo(() => {
    return submissions.map((sub) => {
      const matchingJob = jobs.find(
        (job) =>
          job.styleNo?.trim().toLowerCase() === sub.styleNo?.trim().toLowerCase() &&
          job.customer?.trim().toLowerCase() === sub.customerName?.trim().toLowerCase()
      );

      const approval = approvals.find((a) => a.submissionId === sub.id);

      return {
        ...sub,
        job: matchingJob || null,
        approval: approval || null,
        currentStatus: (approval?.status || 'Pending') as ApprovalStatus,
      };
    });
  }, [submissions, jobs, approvals]);

  const filteredSubmissions = useMemo(() => {
    const customerFilter = searchCustomer.trim().toLowerCase();
    const styleFilter = searchStyleNo.trim().toLowerCase();

    return enrichedSubmissions
      .filter((sub) => {
        const matchesCustomer = !customerFilter
          ? true
          : sub.customerName.toLowerCase().includes(customerFilter);

        const matchesStyle = !styleFilter
          ? true
          : sub.styleNo.toLowerCase().includes(styleFilter);

        const matchesHistory = showHistory ? true : sub.isLatestRevision;

        return matchesCustomer && matchesStyle && matchesHistory;
      })
      .sort((a, b) => {
        const bTime = new Date(b.submissionDate).getTime();
        const aTime = new Date(a.submissionDate).getTime();

        if (bTime !== aTime) return bTime - aTime;
        return b.revisionNo - a.revisionNo;
      });
  }, [enrichedSubmissions, searchCustomer, searchStyleNo, showHistory]);

  const selectedSubmission = useMemo(() => {
    return enrichedSubmissions.find((sub) => sub.id === selectedSubmissionId) || null;
  }, [enrichedSubmissions, selectedSubmissionId]);

  const isLockedOldRevision = selectedSubmission
    ? !selectedSubmission.isLatestRevision
    : false;

  useEffect(() => {
    if (!selectedSubmission) {
      setFormData(INITIAL_FORM_STATE);
      return;
    }

    if (selectedSubmission.approval) {
      setFormData({
        status: selectedSubmission.approval.status,
        boardSet: selectedSubmission.approval.boardSet || '',
        approvalCard: selectedSubmission.approval.approvalCard || '',
        raMeetingDate: selectedSubmission.approval.raMeetingDate || '',
        bulkOrderQty: selectedSubmission.approval.bulkOrderQty || '',
      });
    } else {
      setFormData(INITIAL_FORM_STATE);
    }
  }, [selectedSubmission]);

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

    if (errors.submission) {
      setErrors((prev) => ({
        ...prev,
        submission: '',
      }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!selectedSubmission) {
      newErrors.submission = 'Please select a submitted style.';
    }

    if (selectedSubmission && !selectedSubmission.isLatestRevision) {
      newErrors.submission =
        'This is an older revision. Only the latest revision can be edited.';
    }

    if (formData.status === 'Approved') {
      if (!formData.boardSet.trim()) {
        newErrors.boardSet = 'Board Set is required for approval.';
      }

      if (!formData.approvalCard.trim()) {
        newErrors.approvalCard = 'Approval Card is required for approval.';
      }

      if (!formData.raMeetingDate) {
        newErrors.raMeetingDate = 'RA Meeting Date is required for approval.';
      }

      if (!formData.bulkOrderQty.trim() || isNaN(Number(formData.bulkOrderQty))) {
        newErrors.bulkOrderQty = 'Valid Bulk Order Qty is required.';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveDecision = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm() || !selectedSubmission || !selectedSubmission.isLatestRevision) {
      return;
    }

    setIsSaving(true);

    const newRecord: ApprovalRecord = {
      id: selectedSubmission.approval?.id || crypto.randomUUID(),
      submissionId: selectedSubmission.id,
      styleNo: selectedSubmission.styleNo,
      customerName: selectedSubmission.customerName,
      level: selectedSubmission.level,
      revisionNo: selectedSubmission.revisionNo,
      status: formData.status,
      reviewedAt: new Date().toISOString().split('T')[0],
      ...(formData.status === 'Approved' && {
        boardSet: formData.boardSet.trim(),
        approvalCard: formData.approvalCard.trim(),
        raMeetingDate: formData.raMeetingDate,
        bulkOrderQty: formData.bulkOrderQty.trim(),
      }),
    };

    try {
      await processApproval(newRecord);
      await fetchApprovals();

      setErrors({});
    } catch (error) {
      console.error('Failed to save approval decision:', error);
      setErrors({
        submission:
          error instanceof Error
            ? error.message
            : 'Failed to save approval decision.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const renderStatusIcon = (status: ApprovalStatus) => {
    if (status === 'Approved') return <CheckCircle2 className="h-4 w-4" />;
    if (status === 'Rejected') return <XCircle className="h-4 w-4" />;
    return <Clock className="h-4 w-4" />;
  };

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl bg-blue-50 p-3">
            <ClipboardCheck className="h-7 w-7 text-blue-600" />
          </div>

          <div>
            <h1 className="text-2xl font-bold text-slate-900">Approve Submissions</h1>
            <p className="mt-1 text-sm text-slate-500">
              Review the full style details and make decisions only on the latest revision.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Search className="h-5 w-5 text-slate-500" />
          <h2 className="text-lg font-semibold text-slate-900">Search Submitted Styles</h2>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Customer</label>
            <input
              type="text"
              value={searchCustomer}
              onChange={(e) => setSearchCustomer(e.target.value)}
              placeholder="Search by customer"
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Style No</label>
            <input
              type="text"
              value={searchStyleNo}
              onChange={(e) => setSearchStyleNo(e.target.value)}
              placeholder="Search by style number"
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-end">
            <label className="flex w-full items-center gap-2 rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-700">
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
                setSearchCustomer('');
                setSearchStyleNo('');
                setShowHistory(false);
              }}
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Clear Search
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="xl:col-span-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Matching Submissions</h2>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                {filteredSubmissions.length} found
              </span>
            </div>

            <div className="space-y-3 max-h-[700px] overflow-y-auto pr-1">
              {filteredSubmissions.length > 0 ? (
                filteredSubmissions.map((sub) => {
                  const isSelected = selectedSubmissionId === sub.id;

                  return (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => {
                        setSelectedSubmissionId(sub.id);
                        setErrors({});
                      }}
                      className={`w-full rounded-xl border p-4 text-left transition ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{sub.styleNo}</p>
                          <p className="mt-1 text-sm text-slate-600">{sub.customerName}</p>
                        </div>

                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-medium ${badgeStyles[sub.currentStatus]}`}
                        >
                          {renderStatusIcon(sub.currentStatus)}
                          {sub.currentStatus}
                        </span>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                        <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2 py-1 font-medium text-indigo-700">
                          Rev {sub.revisionNo}
                        </span>
                        {sub.isLatestRevision ? (
                          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 font-medium text-emerald-700">
                            Latest
                          </span>
                        ) : (
                          <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-1 font-medium text-slate-600">
                            History
                          </span>
                        )}
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-500">
                        <span>Level: {sub.level || '-'}</span>
                        <span>Date: {sub.submissionDate || '-'}</span>
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                  No submissions match the current filters.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="xl:col-span-8">
          <AnimatePresence mode="wait">
            {selectedSubmission ? (
              <motion.div
                key={selectedSubmission.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -14 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-bold text-slate-900">
                        {selectedSubmission.styleNo}
                      </h2>
                      <p className="mt-1 text-sm text-slate-600">
                        {selectedSubmission.customerName}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-700">
                        <GitBranch className="h-4 w-4" />
                        Rev {selectedSubmission.revisionNo}
                      </span>

                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-sm font-medium ${badgeStyles[selectedSubmission.currentStatus]}`}
                      >
                        {renderStatusIcon(selectedSubmission.currentStatus)}
                        {selectedSubmission.currentStatus}
                      </span>
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
                    <InfoCard
                      icon={Layers3}
                      label="Submission Level"
                      value={selectedSubmission.level || '-'}
                    />
                    <InfoCard
                      icon={CalendarDays}
                      label="Submission Date"
                      value={selectedSubmission.submissionDate || '-'}
                    />
                    <InfoCard
                      icon={User2}
                      label="Comment"
                      value={selectedSubmission.comment || '-'}
                    />
                  </div>

                  {!selectedSubmission.isLatestRevision && (
                    <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
                      <div className="flex items-center gap-2 font-semibold">
                        <Lock className="h-4 w-4" />
                        Older revision locked
                      </div>
                      <p className="mt-1">
                        This revision is history only. A newer revision exists, so this decision
                        cannot be edited anymore.
                      </p>
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="mb-5 flex items-center gap-2">
                    <PackageCheck className="h-5 w-5 text-slate-500" />
                    <h3 className="text-lg font-semibold text-slate-900">Full Style Details</h3>
                  </div>

                  {selectedSubmission.job ? (
                    <>
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                        <InfoCard icon={User2} label="Customer" value={selectedSubmission.job.customer || '-'} />
                        <InfoCard icon={Shirt} label="Style No" value={selectedSubmission.job.styleNo || '-'} />
                        <InfoCard icon={Layers3} label="Season" value={selectedSubmission.job.season || '-'} />
                        <InfoCard icon={Palette} label="Printing Technique" value={selectedSubmission.job.printingTechnique || '-'} />
                        <InfoCard icon={Palette} label="Washing Standard" value={selectedSubmission.job.washingStandard || '-'} />
                        <InfoCard icon={Palette} label="Body Colour" value={selectedSubmission.job.bodyColour || '-'} />
                        <InfoCard icon={Palette} label="Print Colour" value={selectedSubmission.job.printColour || '-'} />
                        <InfoCard icon={Layers3} label="Print Colour Qty" value={selectedSubmission.job.printColourQty || '-'} />
                        <InfoCard icon={CalendarDays} label="Sample Ordered Date" value={selectedSubmission.job.sampleOrderedDate || '-'} />
                        <InfoCard icon={CalendarDays} label="Sample Delivery Date" value={selectedSubmission.job.sampleDeliveryDate || '-'} />
                      </div>

                      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-2">
                        <div className="rounded-xl border border-slate-200 p-4">
                          <p className="mb-2 text-sm font-semibold text-slate-800">Placements</p>
                          <div className="flex flex-wrap gap-2">
                            {selectedSubmission.job.placements?.length ? (
                              selectedSubmission.job.placements.map((placement) => (
                                <span
                                  key={placement}
                                  className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
                                >
                                  {placement}
                                </span>
                              ))
                            ) : (
                              <span className="text-sm text-slate-500">No placements available</span>
                            )}
                          </div>
                        </div>

                        <div className="rounded-xl border border-slate-200 p-4">
                          <div className="mb-2 flex items-center gap-2">
                            <FileImage className="h-4 w-4 text-slate-500" />
                            <p className="text-sm font-semibold text-slate-800">Artwork</p>
                          </div>

                          <p className="text-sm text-slate-600">
                            File: {selectedSubmission.job.artworkFileName || 'No file name'}
                          </p>

                          {selectedSubmission.job.artworkPreviewUrl ? (
                            <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-3">
                              <img
                                src={selectedSubmission.job.artworkPreviewUrl}
                                alt={selectedSubmission.job.artworkFileName || 'Artwork Preview'}
                                className="max-h-72 w-full rounded-lg object-contain"
                              />
                            </div>
                          ) : (
                            <div className="mt-3 rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                              No artwork preview available
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
                      Matching development job details were not found for this submission.
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="mb-5 flex items-center gap-2">
                    <ClipboardCheck className="h-5 w-5 text-slate-500" />
                    <h3 className="text-lg font-semibold text-slate-900">Admin Decision</h3>
                  </div>

                  {errors.submission && (
                    <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                      {errors.submission}
                    </div>
                  )}

                  <form onSubmit={handleSaveDecision} className="space-y-5">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">
                        Status
                      </label>
                      <select
                        name="status"
                        value={formData.status}
                        onChange={handleInputChange}
                        disabled={isLockedOldRevision}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
                      >
                        <option value="Pending">Pending</option>
                        <option value="Approved">Approved</option>
                        <option value="Rejected">Rejected</option>
                      </select>
                    </div>

                    <AnimatePresence>
                      {formData.status === 'Approved' && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="grid grid-cols-1 gap-4 md:grid-cols-2"
                        >
                          <Field
                            label="Board Set"
                            name="boardSet"
                            value={formData.boardSet}
                            onChange={handleInputChange}
                            error={errors.boardSet}
                            placeholder="e.g. BS-102"
                            disabled={isLockedOldRevision}
                          />

                          <Field
                            label="Approval Card"
                            name="approvalCard"
                            value={formData.approvalCard}
                            onChange={handleInputChange}
                            error={errors.approvalCard}
                            placeholder="e.g. AC-993"
                            disabled={isLockedOldRevision}
                          />

                          <Field
                            label="RA Meeting Date"
                            name="raMeetingDate"
                            value={formData.raMeetingDate}
                            onChange={handleInputChange}
                            error={errors.raMeetingDate}
                            type="date"
                            disabled={isLockedOldRevision}
                          />

                          <Field
                            label="Bulk Order Qty"
                            name="bulkOrderQty"
                            value={formData.bulkOrderQty}
                            onChange={handleInputChange}
                            error={errors.bulkOrderQty}
                            type="number"
                            placeholder="e.g. 5000"
                            disabled={isLockedOldRevision}
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="flex flex-wrap gap-3">
                      <button
                        type="submit"
                        disabled={isSaving || isLockedOldRevision}
                        className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {isSaving ? 'Saving...' : 'Save Decision'}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedSubmissionId('');
                          setFormData(INITIAL_FORM_STATE);
                          setErrors({});
                        }}
                        className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Clear Selection
                      </button>
                    </div>
                  </form>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="empty-state"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -14 }}
                className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm"
              >
                <ClipboardCheck className="mx-auto h-10 w-10 text-slate-400" />
                <h3 className="mt-4 text-lg font-semibold text-slate-900">
                  Select a submitted style
                </h3>
                <p className="mt-2 text-sm text-slate-500">
                  Search by customer or style number, then choose a submission to review.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function InfoCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <div className="mb-2 flex items-center gap-2">
        <Icon className="h-4 w-4 text-slate-500" />
        <p className="text-sm font-medium text-slate-600">{label}</p>
      </div>
      <p className="break-words text-sm font-semibold text-slate-900">{value || '-'}</p>
    </div>
  );
}

function Field({
  label,
  name,
  value,
  onChange,
  error,
  type = 'text',
  placeholder,
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
  placeholder?: string;
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
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none ${
          error
            ? 'border-red-400 focus:ring-2 focus:ring-red-400'
            : 'border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500'
        } disabled:bg-slate-100 disabled:cursor-not-allowed`}
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}