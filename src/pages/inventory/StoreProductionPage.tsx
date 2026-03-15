import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Factory, Plus, Edit2, Trash2, Save, AlertCircle, GitBranch, CheckCircle2 } from 'lucide-react';
import {
  useInventoryStore,
  StoreProductionRecord,
  EligibleProductionItem,
} from '../../store/inventoryStore';

const INITIAL_FORM_STATE = {
  storeInRecordId: '',
  submissionId: '',
  revisionNo: 1,
  styleNo: '',
  customerName: '',
  components: '',
  cutNo: '',
  issueDate: new Date().toISOString().split('T')[0],
  issueQty: '',
  lineNo: '',
};

export default function StoreProductionPage() {
  const {
    productionRecords,
    eligibleProductionItems,
    fetchProductionRecords,
    fetchEligibleProductionItems,
    addProductionRecord,
    updateProductionRecord,
    deleteProductionRecord,
  } = useInventoryStore();

  const [formData, setFormData] = useState(INITIAL_FORM_STATE);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pageError, setPageError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadPageData = async () => {
      try {
        await Promise.all([fetchProductionRecords(), fetchEligibleProductionItems()]);
      } catch (error) {
        setPageError(
          error instanceof Error ? error.message : 'Failed to load production data.'
        );
      }
    };

    loadPageData();
  }, [fetchProductionRecords, fetchEligibleProductionItems]);

  const selectedEligibleItem = useMemo(() => {
    return (
      eligibleProductionItems.find(
        (item) => item.storeInRecordId === formData.storeInRecordId
      ) || null
    );
  }, [eligibleProductionItems, formData.storeInRecordId]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    if (name === 'storeInRecordId') {
      const matched = eligibleProductionItems.find(
        (item) => item.storeInRecordId === value
      );

      if (matched) {
        setFormData((prev) => ({
          ...prev,
          storeInRecordId: matched.storeInRecordId,
          submissionId: matched.submissionId,
          revisionNo: matched.revisionNo,
          styleNo: matched.styleNo,
          customerName: matched.customerName,
          components: matched.components,
          cutNo: matched.cutNo,
          issueQty: '',
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

    if (pageError) setPageError('');
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.storeInRecordId) newErrors.storeInRecordId = 'QC-passed item is required';
    if (!formData.issueDate) newErrors.issueDate = 'Issue Date is required';
    if (!formData.lineNo.trim()) newErrors.lineNo = 'Line No is required';

    const issueQtyNum = parseInt(formData.issueQty) || 0;
    if (issueQtyNum <= 0) {
      newErrors.issueQty = 'Issue Qty must be greater than 0';
    }

    if (selectedEligibleItem && issueQtyNum > selectedEligibleItem.availableQty) {
      newErrors.issueQty = `Exceeds available shelf qty (${selectedEligibleItem.availableQty})`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const resetForm = () => {
    setFormData({
      ...INITIAL_FORM_STATE,
      issueDate: new Date().toISOString().split('T')[0],
    });
    setEditingId(null);
    setErrors({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSaving(true);

    try {
      if (editingId) {
        const updatedRecord: StoreProductionRecord = {
          id: editingId,
          storeInRecordId: formData.storeInRecordId,
          submissionId: formData.submissionId,
          revisionNo: formData.revisionNo,
          styleNo: formData.styleNo,
          customerName: formData.customerName,
          components: formData.components,
          cutNo: formData.cutNo,
          issueDate: formData.issueDate,
          issueQty: parseInt(formData.issueQty),
          lineNo: formData.lineNo,
          balanceQty: selectedEligibleItem
            ? Math.max(0, selectedEligibleItem.availableQty - parseInt(formData.issueQty))
            : 0,
        };

        await updateProductionRecord(editingId, updatedRecord);
      } else {
        await addProductionRecord({
          storeInRecordId: formData.storeInRecordId,
          issueDate: formData.issueDate,
          issueQty: parseInt(formData.issueQty),
          lineNo: formData.lineNo,
        });
      }

      resetForm();
      await fetchEligibleProductionItems();
      await fetchProductionRecords();
    } catch (error) {
      setPageError(
        error instanceof Error ? error.message : 'Failed to save production issue.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (record: StoreProductionRecord) => {
    setFormData({
      storeInRecordId: record.storeInRecordId,
      submissionId: record.submissionId,
      revisionNo: record.revisionNo,
      styleNo: record.styleNo,
      customerName: record.customerName,
      components: record.components,
      cutNo: record.cutNo,
      issueDate: record.issueDate,
      issueQty: record.issueQty.toString(),
      lineNo: record.lineNo,
    });

    setEditingId(record.id);
    setErrors({});
    setPageError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this production issue record?')) {
      return;
    }

    try {
      await deleteProductionRecord(id);
      await fetchEligibleProductionItems();
      await fetchProductionRecords();
    } catch (error) {
      setPageError(
        error instanceof Error ? error.message : 'Failed to delete production issue.'
      );
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 pb-12"
    >
      <div className="flex items-center space-x-3 border-b border-slate-200 pb-4">
        <div className="rounded-lg bg-blue-100 p-2">
          <Factory className="h-6 w-6 text-blue-700" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Issue to Production</h2>
          <p className="text-sm text-slate-500">
            Only QC-passed Store-In items can move into Production.
          </p>
        </div>
      </div>

      {pageError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {pageError}
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-800">
            {editingId ? 'Edit Production Issue' : 'New Production Issue'}
          </h3>

          {editingId && (
            <span className="animate-pulse rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">
              EDIT MODE
            </span>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="space-y-4 rounded-xl border border-blue-200 bg-blue-50/60 p-5">
            <h4 className="border-b border-blue-200 pb-2 text-sm font-bold uppercase tracking-wider text-blue-800">
              QC-Passed Item
            </h4>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1 lg:col-span-2">
                <label className="block text-xs font-medium text-slate-600">
                  Eligible Production Item <span className="text-red-500">*</span>
                </label>
                <select
                  name="storeInRecordId"
                  value={formData.storeInRecordId}
                  onChange={handleInputChange}
                  disabled={!!editingId}
                  className={`w-full rounded-lg border px-3 py-2 text-sm outline-none bg-white ${
                    errors.storeInRecordId
                      ? 'border-red-400 bg-red-50'
                      : 'border-slate-300 focus:ring-2 focus:ring-blue-500'
                  } ${editingId ? 'cursor-not-allowed bg-slate-100' : ''}`}
                >
                  <option value="" disabled>
                    Select QC-passed item...
                  </option>
                  {eligibleProductionItems.map((item) => (
                    <option key={item.storeInRecordId} value={item.storeInRecordId}>
                      {item.styleNo} | {item.customerName} | Rev {item.revisionNo} | Avl {item.availableQty}
                    </option>
                  ))}
                </select>
                {errors.storeInRecordId && (
                  <p className="text-[11px] text-red-600">
                    <AlertCircle className="mr-1 inline h-3 w-3" />
                    {errors.storeInRecordId}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-600">QC Status</label>
                <div className="inline-flex w-full items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" />
                  {selectedEligibleItem?.inspectionStatus || '-'}
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-600">Revision</label>
                <div className="inline-flex w-full items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700">
                  <GitBranch className="h-4 w-4" />
                  Rev {formData.revisionNo}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <ReadOnlyField label="Style No" value={formData.styleNo} />
            <ReadOnlyField label="Customer" value={formData.customerName} />
            <ReadOnlyField label="Cut No" value={formData.cutNo} />
            <ReadOnlyField label="Components" value={formData.components} />
            <ReadOnlyField
              label="Available Shelf Qty"
              value={selectedEligibleItem ? String(selectedEligibleItem.availableQty) : ''}
            />

            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-700">
                Issue Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="issueDate"
                value={formData.issueDate}
                onChange={handleInputChange}
                className={`w-full rounded-lg border px-3 py-2 outline-none sm:text-sm ${
                  errors.issueDate
                    ? 'border-red-400 bg-red-50'
                    : 'border-slate-300 focus:ring-2 focus:ring-blue-500'
                }`}
              />
              {errors.issueDate && (
                <p className="text-[11px] text-red-600">
                  <AlertCircle className="mr-1 inline h-3 w-3" />
                  {errors.issueDate}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-700">
                Issue Qty <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="issueQty"
                value={formData.issueQty}
                onChange={handleInputChange}
                placeholder="e.g. 100"
                className={`w-full rounded-lg border px-3 py-2 outline-none sm:text-sm ${
                  errors.issueQty
                    ? 'border-red-400 bg-red-50'
                    : 'border-slate-300 focus:ring-2 focus:ring-blue-500'
                }`}
              />
              {errors.issueQty && (
                <p className="text-[11px] text-red-600">
                  <AlertCircle className="mr-1 inline h-3 w-3" />
                  {errors.issueQty}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-700">
                Line No <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="lineNo"
                value={formData.lineNo}
                onChange={handleInputChange}
                placeholder="e.g. Line 01"
                className={`w-full rounded-lg border px-3 py-2 outline-none sm:text-sm ${
                  errors.lineNo
                    ? 'border-red-400 bg-red-50'
                    : 'border-slate-300 focus:ring-2 focus:ring-blue-500'
                }`}
              />
              {errors.lineNo && (
                <p className="text-[11px] text-red-600">
                  <AlertCircle className="mr-1 inline h-3 w-3" />
                  {errors.lineNo}
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end space-x-3 border-t border-slate-100 pt-4">
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-lg border px-4 py-2 font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
            )}

            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center rounded-lg bg-blue-600 px-6 py-2 font-medium text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {editingId ? <Save className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
              {isSaving
                ? editingId
                  ? 'Updating...'
                  : 'Saving...'
                : editingId
                ? 'Update Production Issue'
                : 'Save Production Issue'}
            </button>
          </div>
        </form>
      </div>

      {productionRecords.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-800">Production Issue Records</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-max w-full whitespace-nowrap text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-6 py-3 font-semibold">Style / Customer</th>
                  <th className="px-6 py-3 font-semibold">Revision</th>
                  <th className="px-6 py-3 font-semibold">Cut / Components</th>
                  <th className="px-6 py-3 font-semibold">Issue</th>
                  <th className="px-6 py-3 font-semibold">Balance</th>
                  <th className="px-6 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                <AnimatePresence>
                  {productionRecords.map((record) => (
                    <motion.tr
                      key={record.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="transition-colors hover:bg-slate-50"
                    >
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-900">{record.styleNo}</p>
                        <p className="text-xs text-slate-500">{record.customerName}</p>
                      </td>

                      <td className="px-6 py-4">
                        <div className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                          <GitBranch className="h-3 w-3" />
                          Rev {record.revisionNo}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <p className="font-medium text-slate-800">Cut: {record.cutNo}</p>
                        <p className="text-xs text-slate-500">{record.components}</p>
                      </td>

                      <td className="px-6 py-4">
                        <p className="font-medium text-slate-800">Qty: {record.issueQty}</p>
                        <p className="text-xs text-slate-500">
                          {record.issueDate} | {record.lineNo}
                        </p>
                      </td>

                      <td className="px-6 py-4">
                        <span className="font-bold text-emerald-600">{record.balanceQty}</span>
                      </td>

                      <td className="space-x-2 px-6 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleEdit(record)}
                          className="rounded p-1.5 text-blue-600 hover:bg-blue-50"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(record.id)}
                          className="rounded p-1.5 text-red-600 hover:bg-red-50"
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

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-slate-700">{label}</label>
      <input
        type="text"
        readOnly
        value={value}
        className="w-full cursor-not-allowed rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-600"
      />
    </div>
  );
}