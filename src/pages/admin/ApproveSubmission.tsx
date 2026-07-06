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
import { useSampleStyleStore } from '../../store/sampleStyleStore';
import { API } from '../../api/client';

const INITIAL_FORM_STATE = {
  status: 'Pending' as ApprovalStatus,
  remarks: '',
};

const badgeStyles: Record<ApprovalStatus, string> = {
  Pending: 'bg-amber-50 text-amber-700 border-amber-200',
  Approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Rejected: 'bg-red-50 text-red-700 border-red-200',
};

export default function ApproveSubmission() {
  const { jobs, submissions, fetchData } = useDevelopmentStore();
  const { approvals, fetchApprovals, processApproval } = useAdminStore();
  const { styles: sampleStyles, fetchStyles } = useSampleStyleStore();

  const [searchCustomer, setSearchCustomer] = useState('');
  const [searchStyleNo, setSearchStyleNo] = useState('');
  const [selectedSubmissionId, setSelectedSubmissionId] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [storeInSubmissionIds, setStoreInSubmissionIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const loadPageData = async () => {
      try {
        await Promise.all([fetchData(), fetchApprovals()]);
        try {
          const storeInRes = await fetch(
            `${API.INVENTORY}/store-in`,
            { headers: { Authorization: `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' } }
          );
          if (storeInRes.ok) {
            const storeInData = await storeInRes.json();
            const ids = new Set<string>(storeInData.map((r: any) => r.submissionId));
            setStoreInSubmissionIds(ids);
          }
        } catch { /* non-critical */ }
      } catch (error) {
        console.error('Failed to load approval page data:', error);
        setErrors({
          submission: error instanceof Error ? error.message : 'Failed to load submissions or approvals.',
        });
      }
    };

    loadPageData();
    fetchStyles(true);
  }, [fetchData, fetchApprovals]);

  const enrichedSubmissions = useMemo(() => {
    const enriched = submissions.map((sub) => {
      const matchingSampleStyle = sampleStyles.find((s) => s.id === sub.id);
      const matchingJob = jobs.find((job) => {
        const baseMatch = 
          job.styleNo?.trim().toLowerCase() === sub.styleNo?.trim().toLowerCase() &&
          job.customer?.trim().toLowerCase() === sub.customerName?.trim().toLowerCase();
        
        if (!baseMatch) return false;

        if (matchingSampleStyle?.component && job.component) {
          return job.component.trim().toLowerCase() === matchingSampleStyle.component.trim().toLowerCase();
        }
        return true; 
      });

      const approval = approvals.find((a) => a.submissionId === sub.id);
      const componentName = matchingSampleStyle?.component || matchingJob?.component || 'Unknown';

      return {
        ...sub,
        job: matchingJob || null,
        sampleStyle: matchingSampleStyle || null,
        approval: approval || null,
        componentName,
        currentStatus: (approval?.status || 'Pending') as ApprovalStatus,
      };
    });

    // FIX: Calculate the latest revision per COMPONENT, not just per Style
    const latestRevisionsMap = new Map<string, number>();
    enriched.forEach((sub) => {
      const key = `${sub.styleNo}_${sub.customerName}_${sub.componentName}`.toLowerCase();
      const currentMax = latestRevisionsMap.get(key) || 0;
      if (sub.revisionNo > currentMax) {
        latestRevisionsMap.set(key, sub.revisionNo);
      }
    });

    return enriched.map((sub) => {
      const key = `${sub.styleNo}_${sub.customerName}_${sub.componentName}`.toLowerCase();
      const isLatestForComponent = sub.revisionNo === latestRevisionsMap.get(key);

      return {
        ...sub,
        isLatestForComponent,
      };
    });
  }, [submissions, jobs, approvals, sampleStyles]);

  const filteredSubmissions = useMemo(() => {
    const customerFilter = searchCustomer.trim().toLowerCase();
    const styleFilter = searchStyleNo.trim().toLowerCase();

    return enrichedSubmissions
      .filter((sub) => {
        const matchesCustomer = !customerFilter ? true : sub.customerName.toLowerCase().includes(customerFilter);
        const matchesStyle = !styleFilter ? true : sub.styleNo.toLowerCase().includes(styleFilter);
        // FIX: Use isLatestForComponent instead of the backend's flawed isLatestRevision
        const matchesHistory = showHistory ? true : sub.isLatestForComponent;

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

  // FIX: Validate locks against component logic
  const isLockedOldRevision = selectedSubmission ? !selectedSubmission.isLatestForComponent : false;

  const isLockedByStoreIn = selectedSubmission
    ? storeInSubmissionIds.has(selectedSubmission.id) && selectedSubmission.currentStatus === 'Approved'
    : false;

  useEffect(() => {
    if (!selectedSubmission) {
      setFormData(INITIAL_FORM_STATE);
      return;
    }

    if (selectedSubmission.approval) {
      setFormData({ status: selectedSubmission.approval.status, remarks: '' });
    } else {
      setFormData(INITIAL_FORM_STATE);
    }
  }, [selectedSubmission]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
    if (errors.submission) setErrors((prev) => ({ ...prev, submission: '' }));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!selectedSubmission) {
      newErrors.submission = 'Please select a submitted style.';
    }
    // FIX: Validate against component logic
    if (selectedSubmission && !selectedSubmission.isLatestForComponent) {
      newErrors.submission = 'This is an older revision. Only the latest revision can be edited.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveDecision = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm() || !selectedSubmission || !selectedSubmission.isLatestForComponent) {
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
        boardSet: (selectedSubmission as any).sampleStyle?.boardSet || '',
        approvalCard: '',
        raMeetingDate: (selectedSubmission as any).sampleStyle?.rcMeetingDate || '',
        bulkOrderQty: (selectedSubmission as any).sampleStyle?.bulkQty || '',
        remarks: (formData as any).remarks || '',
      }),
    };

    try {
      await processApproval(newRecord);

      try {
        await fetch(`${API.BASE}/api/samplestyle/${selectedSubmission.id}/adminaction`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
          },
          body: JSON.stringify({
            status: formData.status,
            remarks: (formData as any).remarks || '',
          }),
        });
      } catch { /* non-critical */ }

      await fetchApprovals();
      await fetchStyles(true);

      setErrors({});
      const decidedStatus = formData.status;
      setSelectedSubmissionId('');
      setFormData(INITIAL_FORM_STATE);
      setSuccessMsg(
        decidedStatus === 'Approved' ? `✓ Style approved successfully.` : `Decision saved as ${decidedStatus}.`
      );
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (error) {
      console.error('Failed to save approval decision:', error);
      setErrors({
        submission: error instanceof Error ? error.message : 'Failed to save approval decision.',
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

  // IMPORTANT: after an admin rejection correction, SampleStyle is the source of truth.
  // DevelopmentJob can be stale in the admin page cache, so show SampleStyle first
  // and only fall back to DevelopmentJob for legacy/date/artwork fields.
  const selectedStyleDetails = useMemo(() => {
    const ss = (selectedSubmission as any)?.sampleStyle;
    const job = selectedSubmission?.job;
    const first = (...values: any[]) =>
      values.find((v) => typeof v === 'string' && v.trim().length > 0)?.trim?.() || '';

    return {
      sampleStyle: ss,
      job,
      customer: first(ss?.customer, job?.customer, selectedSubmission?.customerName),
      styleNo: first(ss?.styleNo, job?.styleNo, selectedSubmission?.styleNo),
      season: first(ss?.season, job?.season),
      printingTechnique: first(ss?.printingTechnique, job?.printingTechnique),
      washingStandard: first(ss?.washingStandard, job?.washingStandard),
      bodyColour: first(ss?.bodyColour, job?.bodyColour),
      printColour: first(ss?.printColour, job?.printColour),
      printColourQty: first(ss?.printColourQty, job?.printColourQty),
      sampleOrderedDate: first(job?.sampleOrderedDate),
      sampleDeliveryDate: first(job?.sampleDeliveryDate),
      component: first(ss?.component, job?.component, (selectedSubmission as any)?.componentName),
    };
  }, [selectedSubmission]);

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

      <AnimatePresence>
        {successMsg && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 shadow-sm"
          >
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            {successMsg}
          </motion.div>
        )}
      </AnimatePresence>

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
              <input type="checkbox" checked={showHistory} onChange={(e) => setShowHistory(e.target.checked)} />
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

            <div className="space-y-3 max-h-150 overflow-y-auto pr-1">
              {filteredSubmissions.length > 0 ? (
                filteredSubmissions.map((sub) => {
                  const isSelected = selectedSubmissionId === sub.id;
                  const componentName = sub.componentName !== 'Unknown' ? sub.componentName : '';

                  return (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => {
                        setSelectedSubmissionId(sub.id);
                        setErrors({});
                      }}
                      className={`w-full rounded-xl border p-4 text-left transition ${
                        isSelected ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            {sub.styleNo}
                            {componentName && (
                              <span className="ml-1.5 font-normal text-slate-500">({componentName})</span>
                            )}
                          </p>
                          <p className="mt-1 text-sm text-slate-600">{sub.customerName}</p>
                        </div>
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-medium ${badgeStyles[sub.currentStatus]}`}>
                          {renderStatusIcon(sub.currentStatus)}
                          {sub.currentStatus}
                        </span>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                        <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2 py-1 font-medium text-indigo-700">
                          Rev {sub.revisionNo}
                        </span>
                        {/* FIX: Badge logic uses isLatestForComponent */}
                        {sub.isLatestForComponent ? (
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
                      <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        {selectedSubmission.styleNo}
                        {selectedSubmission.componentName !== 'Unknown' && (
                          <span className="rounded-md bg-slate-100 px-2.5 py-0.5 text-sm font-medium text-slate-600 border border-slate-200">
                            {selectedSubmission.componentName}
                          </span>
                        )}
                      </h2>
                      <p className="mt-1 text-sm text-slate-600">{selectedSubmission.customerName}</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-700">
                        <GitBranch className="h-4 w-4" />
                        Rev {selectedSubmission.revisionNo}
                      </span>
                      <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-sm font-medium ${badgeStyles[selectedSubmission.currentStatus]}`}>
                        {renderStatusIcon(selectedSubmission.currentStatus)}
                        {selectedSubmission.currentStatus}
                      </span>
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
                    <InfoCard icon={Layers3} label="Submission Level" value={selectedSubmission.level || '-'} />
                    <InfoCard icon={CalendarDays} label="Submission Date" value={selectedSubmission.submissionDate || '-'} />
                    <InfoCard icon={User2} label="Comment" value={selectedSubmission.comment || '-'} />
                  </div>

                  {/* FIX: Banner logic uses isLatestForComponent */}
                  {!selectedSubmission.isLatestForComponent && (
                    <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
                      <div className="flex items-center gap-2 font-semibold">
                        <Lock className="h-4 w-4" />
                        Older revision locked
                      </div>
                      <p className="mt-1">
                        This revision is history only. A newer revision exists for this component, so this decision cannot be edited anymore.
                      </p>
                    </div>
                  )}

                  {isLockedByStoreIn && (
                    <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-700">
                      <div className="flex items-center gap-2 font-semibold">
                        <Lock className="h-4 w-4" />
                        Locked — Store-In records exist
                      </div>
                      <p className="mt-1">
                        This approval has Store-In records created against it and is now locked.
                      </p>
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="mb-5 flex items-center gap-2">
                    <PackageCheck className="h-5 w-5 text-slate-500" />
                    <h3 className="text-lg font-semibold text-slate-900">Full Style Details</h3>
                  </div>

                {(selectedStyleDetails.sampleStyle || selectedStyleDetails.job) ? (
                  <>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                      <InfoCard icon={User2} label="Customer" value={selectedStyleDetails.customer || '-'} />
                      <InfoCard icon={Shirt} label="Style No" value={selectedStyleDetails.styleNo || '-'} />
                      <InfoCard icon={Layers3} label="Season" value={selectedStyleDetails.season || '-'} />
                      <InfoCard icon={Palette} label="Printing Technique" value={selectedStyleDetails.printingTechnique || '-'} />
                      <InfoCard icon={Palette} label="Washing Standard" value={selectedStyleDetails.washingStandard || '-'} />
                      <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                        <p className="text-xs text-slate-500 mb-1.5">Body Colour</p>
                        <div className="flex flex-wrap gap-1.5">
                          {String(
                                    (selectedSubmission as any).sampleStyle?.bodyColour ||
                                    selectedSubmission.job?.bodyColour ||
                                    ''
                                  )
                          .split(',')
                          .map((c: string) => c.trim())
                          .filter((c: string) => Boolean(c))
                          .map((c: string) => (
                            <span
                              key={c}
                              className="rounded-full bg-indigo-50 border border-indigo-200 px-2.5 py-1 text-xs font-semibold text-indigo-700"
                            >
                              {c}
                            </span>
                          ))}
                        </div>
                        </div>
                        <InfoCard icon={Palette} label="Print Colour" value={selectedStyleDetails.printColour || '-'} />
                        <InfoCard icon={Layers3} label="Print Colour Qty" value={selectedStyleDetails.printColourQty || '-'} />
                        <InfoCard icon={CalendarDays} label="Sample Ordered Date" value={selectedStyleDetails.sampleOrderedDate || '-'} />
                        <InfoCard icon={CalendarDays} label="Sample Delivery Date" value={selectedStyleDetails.sampleDeliveryDate || '-'} />
                      </div>

                      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-2">
                        <div className="rounded-xl border border-slate-200 p-4">
                          <p className="mb-2 text-sm font-semibold text-slate-800">Component</p>
                          <div className="flex flex-wrap gap-2">
                            {selectedStyleDetails.component ? (
                              <span className="rounded-full bg-indigo-50 border border-indigo-200 px-3 py-1 text-xs font-semibold text-indigo-700">
                                {selectedStyleDetails.component}
                              </span>
                            ) : (
                              <span className="text-sm text-slate-500">No component specified</span>
                            )}
                          </div>
                        </div>

                        <div className="rounded-xl border border-slate-200 p-4 space-y-3">
                          <div className="flex items-center gap-2">
                            <FileImage className="h-4 w-4 text-slate-500" />
                            <p className="text-sm font-semibold text-slate-800">Artwork</p>
                            {(selectedSubmission as any).sampleStyle?.revisions?.length > 0 && (
                              <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold px-2 py-0.5">
                                <GitBranch className="h-3 w-3" />
                                {(selectedSubmission as any).sampleStyle.revisions.length} revision{(selectedSubmission as any).sampleStyle.revisions.length !== 1 ? 's' : ''}
                              </span>
                            )}
                          </div>

                          {(() => {
                            const ss = (selectedSubmission as any).sampleStyle;
                            const artworkUrl = ss?.imagePath
                              ? ss.imagePath.startsWith('http')
                                ? ss.imagePath
                                : `${API.BASE}/api/samplestyle/image?path=${encodeURIComponent(ss.imagePath)}`
                              : selectedSubmission.job?.artworkPreviewUrl
                                ? selectedSubmission.job.artworkPreviewUrl.startsWith('http')
                                  ? selectedSubmission.job.artworkPreviewUrl
                                  : `${API.BASE}/api/development/image?path=${encodeURIComponent(selectedSubmission.job.artworkPreviewUrl)}`
                                : null;

                            return artworkUrl ? (
                              <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-3">
                                <img
                                  src={artworkUrl}
                                  alt="Latest artwork"
                                  className="max-h-72 w-full rounded-lg object-contain"
                                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                />
                              </div>
                            ) : (
                              <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                                No artwork preview available
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
                      Matching development job details were not found for this submission.
                    </div>
                  )}

                  {(() => {
                    const ss = (selectedSubmission as any).sampleStyle;
                    if (!ss) return null;
                    const revisions = ss.revisions ?? [];
                    const latest = revisions.length > 0
                      ? [...revisions].sort((a: any, b: any) => b.revisionNo - a.revisionNo)[0]
                      : null;
                    return (
                      <div className={`rounded-xl border p-4 space-y-3 ${revisions.length > 0 ? 'border-indigo-200 bg-indigo-50' : 'border-slate-200 bg-slate-50'}`}>
                        <div className="flex items-center gap-2">
                          <GitBranch className="h-4 w-4 text-indigo-600" />
                          <p className="text-sm font-bold text-indigo-800">
                            {revisions.length > 0
                              ? `Revised ${revisions.length} time${revisions.length !== 1 ? 's' : ''} by client`
                              : 'No client revisions — approved on first submission'}
                          </p>
                        </div>
                        {latest && (
                          <div className="rounded-lg border border-indigo-200 bg-white px-4 py-3">
                            <p className="text-[10px] font-bold uppercase tracking-wide text-indigo-400 mb-1">
                              Latest — Revision {latest.revisionNo}
                            </p>
                            <p className="text-sm text-slate-700">{latest.comment}</p>
                            <p className="text-[10px] text-slate-400 mt-1">{latest.createdAt} · {latest.createdBy}</p>
                          </div>
                        )}
                        {revisions.length > 1 && (
                          <div className="flex gap-2 overflow-x-auto pb-1">
                            {[...revisions]
                              .sort((a: any, b: any) => a.revisionNo - b.revisionNo)
                              .slice(0, -1)
                              .map((rev: any) => (
                                <div key={rev.id} className="shrink-0 w-40 rounded-lg border border-slate-200 bg-white p-2.5 space-y-1.5">
                                  <div className="flex items-center gap-1.5">
                                    <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-500 text-[9px] font-black flex items-center justify-center">
                                      {rev.revisionNo}
                                    </span>
                                    <span className="text-[10px] text-slate-400">{rev.createdAt?.slice(0, 10)}</span>
                                  </div>
                                  {rev.artworkUrl && (
                                    <img
                                      src={rev.artworkUrl.startsWith('http') ? rev.artworkUrl : `${API.BASE}/api/samplestyle/image?path=${encodeURIComponent(rev.artworkUrl)}`}
                                      alt={`Rev ${rev.revisionNo}`}
                                      className="w-full h-20 object-cover rounded border border-slate-200"
                                      onError={e => { (e.target as HTMLImageElement).style.display='none'; }}
                                    />
                                  )}
                                  <p className="text-[10px] text-slate-600 line-clamp-2">{rev.comment}</p>
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                    );
                  })()}
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
                      <label className="mb-1 block text-sm font-medium text-slate-700">Status</label>
                      <select
                        name="status"
                        value={formData.status}
                        onChange={handleInputChange}
                        disabled={isLockedOldRevision || isLockedByStoreIn}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
                      >
                        <option value="Pending">Pending</option>
                        <option value="Approved">Approved</option>
                        <option value="Rejected">Rejected</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Remarks (optional)</label>
                      <textarea
                        value={formData.remarks || ''}
                        onChange={e => setFormData(p => ({ ...p, remarks: e.target.value }))}
                        placeholder="Any notes for the developer…"
                        rows={2}
                        disabled={isLockedOldRevision || isLockedByStoreIn}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none disabled:bg-slate-50 disabled:text-slate-400"
                      />
                    </div>

                    {formData.status === 'Approved' && (selectedSubmission as any).sampleStyle && (
                      <div className="grid grid-cols-2 gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs">
                        <div><p className="text-slate-400">RA Meeting Date</p><p className="font-semibold text-slate-700">{(selectedSubmission as any).sampleStyle.rcMeetingDate || '—'}</p></div>
                        <div><p className="text-slate-400">Board Set</p><p className="font-semibold text-slate-700">{(selectedSubmission as any).sampleStyle.boardSet || '—'}</p></div>
                        <div><p className="text-slate-400">Bulk Qty</p><p className="font-semibold text-slate-700">{(selectedSubmission as any).sampleStyle.bulkQty || '—'} pcs</p></div>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-3">
                      <button
                        type="submit"
                        disabled={isSaving || isLockedOldRevision || isLockedByStoreIn}
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
                <h3 className="mt-4 text-lg font-semibold text-slate-900">Select a submitted style</h3>
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

function InfoCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string; }) {
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <div className="mb-2 flex items-center gap-2">
        <Icon className="h-4 w-4 text-slate-500" />
        <p className="text-sm font-medium text-slate-600">{label}</p>
      </div>
      <p className="wrap-break-word text-sm font-semibold text-slate-900">{value || '-'}</p>
    </div>
  );
}