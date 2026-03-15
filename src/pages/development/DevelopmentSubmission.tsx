// src/pages/development/DevelopmentSubmission.tsx
import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send,
  Plus,
  Trash2,
  AlertCircle,
  MessageSquare,
  GitBranch,
  History,
} from 'lucide-react';
import { useDevelopmentStore } from '../../store/developmentStore';

const INITIAL_FORM_STATE = {
  styleNo: '',
  customerName: '',
  submissionDate: '',
  level: '',
  comment: '',
};

export default function DevelopmentSubmission() {
  const { jobs, submissions, addSubmission, deleteSubmission } = useDevelopmentStore();

  const [formData, setFormData] = useState(INITIAL_FORM_STATE);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const uniqueCustomers = Array.from(new Set(jobs.map((job) => job.customer)));

  const availableStyles = formData.customerName
    ? jobs
        .filter((job) => job.customer === formData.customerName)
        .map((job) => job.styleNo)
    : jobs.map((job) => job.styleNo);

  const sortedSubmissions = useMemo(() => {
    return [...submissions].sort((a, b) => {
      const bTime = new Date(b.submissionDate).getTime();
      const aTime = new Date(a.submissionDate).getTime();

      if (bTime !== aTime) return bTime - aTime;
      return b.revisionNo - a.revisionNo;
    });
  }, [submissions]);

  const currentRevisionPreview = useMemo(() => {
    if (!formData.styleNo || !formData.customerName) return null;

    const related = submissions.filter(
      (sub) =>
        sub.styleNo === formData.styleNo && sub.customerName === formData.customerName
    );

    if (related.length === 0) {
      return { current: 0, next: 1 };
    }

    const currentMax = Math.max(...related.map((sub) => sub.revisionNo || 1));
    return {
      current: currentMax,
      next: currentMax + 1,
    };
  }, [formData.styleNo, formData.customerName, submissions]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;

    if (name === 'customerName') {
      setFormData((prev) => ({
        ...prev,
        customerName: value,
        styleNo: '',
      }));
    } else if (name === 'styleNo') {
      const matchedJob = jobs.find((job) => job.styleNo === value);
      if (matchedJob) {
        setFormData((prev) => ({
          ...prev,
          styleNo: value,
          customerName: matchedJob.customer,
        }));
      }
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }

    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.customerName) newErrors.customerName = 'Please select a customer';
    if (!formData.styleNo) newErrors.styleNo = 'Please select a style number';
    if (!formData.submissionDate) newErrors.submissionDate = 'Submission date is required';
    if (!formData.level) newErrors.level = 'Please select an approval level';
    if (!formData.comment.trim()) {
      newErrors.comment = 'A comment or note is required for reviewers';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    await addSubmission({
      ...formData,
      comment: formData.comment.trim(),
    });

    setFormData(INITIAL_FORM_STATE);
    setErrors({});
  };

  const handleDelete = async (submissionId: string, isLatestRevision: boolean) => {
    if (!isLatestRevision) {
      alert('Older revisions are history records and should not be deleted.');
      return;
    }

    if (
      window.confirm(
        'Are you sure you want to delete this latest revision submission?'
      )
    ) {
      await deleteSubmission(submissionId);
    }
  };

  if (jobs.length === 0) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
        <h2 className="text-lg font-semibold text-amber-800">
          No Development Jobs Found
        </h2>
        <p className="mt-2 text-sm text-amber-700">
          You must create at least one development job in the workspace before you
          can submit it for approval.
        </p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Submit for Approval</h1>
        <p className="mt-1 text-sm text-slate-500">
          Every resubmission creates a new revision. Older revisions stay in history.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-5 text-lg font-semibold text-slate-900">
          New Approval Submission
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Customer *
              </label>
              <select
                name="customerName"
                value={formData.customerName}
                onChange={handleInputChange}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a Customer...</option>
                {uniqueCustomers.map((customer) => (
                  <option key={customer} value={customer}>
                    {customer}
                  </option>
                ))}
              </select>
              {errors.customerName && (
                <p className="mt-1 text-xs text-red-600">{errors.customerName}</p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Style No *
              </label>
              <select
                name="styleNo"
                value={formData.styleNo}
                onChange={handleInputChange}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Style...</option>
                {availableStyles.map((style) => (
                  <option key={style} value={style}>
                    {style}
                  </option>
                ))}
              </select>
              {errors.styleNo && (
                <p className="mt-1 text-xs text-red-600">{errors.styleNo}</p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Submission Date *
              </label>
              <input
                type="date"
                name="submissionDate"
                value={formData.submissionDate}
                onChange={handleInputChange}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
              />
              {errors.submissionDate && (
                <p className="mt-1 text-xs text-red-600">{errors.submissionDate}</p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Submission Level *
              </label>
              <select
                name="level"
                value={formData.level}
                onChange={handleInputChange}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Level...</option>
                <option value="Level 1 (Initial Sample)">Level 1 (Initial Sample)</option>
                <option value="Level 2 (First Revision)">Level 2 (First Revision)</option>
                <option value="Level 3 (Second Revision)">Level 3 (Second Revision)</option>
                <option value="Level 4 (Pre-Production Final)">
                  Level 4 (Pre-Production Final)
                </option>
              </select>
              {errors.level && (
                <p className="mt-1 text-xs text-red-600">{errors.level}</p>
              )}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Developer Comments *
            </label>
            <textarea
              name="comment"
              value={formData.comment}
              onChange={handleInputChange}
              rows={4}
              placeholder="Describe what changed in this revision or what reviewers should focus on."
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
            />
            {errors.comment && (
              <p className="mt-1 flex items-center gap-1 text-xs text-red-600">
                <AlertCircle className="h-3 w-3" />
                {errors.comment}
              </p>
            )}
          </div>

          {currentRevisionPreview && (
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-blue-800">
                <GitBranch className="h-4 w-4" />
                Revision Preview
              </div>
              <p className="mt-2 text-sm text-blue-700">
                Current latest revision: <strong>Rev {currentRevisionPreview.current}</strong>
              </p>
              <p className="text-sm text-blue-700">
                This submission will be created as:{' '}
                <strong>Rev {currentRevisionPreview.next}</strong>
              </p>
            </div>
          )}

          <div className="flex justify-end border-t border-slate-100 pt-5">
            <button
              type="submit"
              className="inline-flex items-center rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Revision Submission
            </button>
          </div>
        </form>
      </div>

      {sortedSubmissions.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Submission History</h2>
              <p className="text-sm text-slate-500">
                Latest revision remains active. Older revisions stay as history.
              </p>
            </div>
            <History className="h-5 w-5 text-slate-400" />
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-6 py-3 font-semibold">Style / Customer</th>
                  <th className="px-6 py-3 font-semibold">Revision</th>
                  <th className="px-6 py-3 font-semibold">Date</th>
                  <th className="px-6 py-3 font-semibold">Level</th>
                  <th className="px-6 py-3 font-semibold">Comments</th>
                  <th className="px-6 py-3 font-semibold">State</th>
                  <th className="px-6 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                <AnimatePresence>
                  {sortedSubmissions.map((sub) => (
                    <motion.tr
                      key={sub.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="hover:bg-slate-50"
                    >
                      <td className="px-6 py-4">
                        <p className="font-semibold text-slate-900">{sub.styleNo}</p>
                        <p className="text-xs text-slate-500">{sub.customerName}</p>
                      </td>

                      <td className="px-6 py-4">
                        <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 border border-indigo-200">
                          Rev {sub.revisionNo}
                        </span>
                      </td>

                      <td className="px-6 py-4">{sub.submissionDate}</td>

                      <td className="px-6 py-4">
                        <span className="rounded border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                          {sub.level}
                        </span>
                      </td>

                      <td className="px-6 py-4 max-w-xs">
                        <div className="flex items-start">
                          <MessageSquare className="mr-2 mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                          <p
                            className="line-clamp-2 whitespace-normal text-slate-600"
                            title={sub.comment}
                          >
                            {sub.comment}
                          </p>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        {sub.isLatestRevision ? (
                          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                            Latest Active
                          </span>
                        ) : (
                          <span className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                            History
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() =>
                            handleDelete(sub.id, sub.isLatestRevision)
                          }
                          className={`rounded p-1.5 transition-colors ${
                            sub.isLatestRevision
                              ? 'text-red-600 hover:bg-red-50'
                              : 'cursor-not-allowed text-slate-300'
                          }`}
                          title={
                            sub.isLatestRevision
                              ? 'Delete latest revision'
                              : 'Older revision locked'
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
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