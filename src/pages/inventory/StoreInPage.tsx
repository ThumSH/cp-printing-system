// src/pages/inventory/StoreInPage.tsx
import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PackageOpen,
  Plus,
  Trash2,
  Edit2,
  AlertCircle,
  Save,
  GitBranch,
  CheckCircle2,
} from 'lucide-react';
import {
  useInventoryStore,
  StoreInRecord,
  EligibleStoreInItem,
} from '../../store/inventoryStore';

const SIZES = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL'];

const INITIAL_FORM_STATE = {
  submissionId: '',
  styleNo: '',
  customerName: '',
  revisionNo: 1,
  bodyColour: '',
  printColour: '',
  components: '',
  season: '',
  cutInDate: '',
  bulkQty: '',
  inQty: '',
  cutQty: '',
  scheduleNo: '',
  cutNo: '',
  bundleQty: '',
  numberRange: '',
  size: '',
};

export default function StoreInPage() {
  const {
    storeInRecords,
    eligibleStoreInItems,
    addStoreInRecord,
    updateStoreInRecord,
    deleteStoreInRecord,
    fetchRecords,
    fetchEligibleStoreInItems,
  } = useInventoryStore();

  const [formData, setFormData] = useState(INITIAL_FORM_STATE);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pageError, setPageError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadPageData = async () => {
      try {
        await Promise.all([fetchRecords(), fetchEligibleStoreInItems()]);
      } catch (error) {
        setPageError(
          error instanceof Error
            ? error.message
            : 'Failed to load inventory data.'
        );
      }
    };

    loadPageData();
  }, [fetchRecords, fetchEligibleStoreInItems]);

  const selectedEligibleItem = useMemo(() => {
    return (
      eligibleStoreInItems.find(
        (item) => item.submissionId === formData.submissionId
      ) || null
    );
  }, [eligibleStoreInItems, formData.submissionId]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    if (name === 'submissionId') {
      const matchedItem = eligibleStoreInItems.find(
        (item) => item.submissionId === value
      );

      if (matchedItem) {
        setFormData((prev) => ({
          ...prev,
          submissionId: matchedItem.submissionId,
          styleNo: matchedItem.styleNo,
          customerName: matchedItem.customerName,
          revisionNo: matchedItem.revisionNo,
          bodyColour: matchedItem.bodyColour,
          printColour: matchedItem.printColour,
          components: matchedItem.components,
          season: matchedItem.season,
          bulkQty: matchedItem.approvedBulkQty.toString(),
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

    if (pageError) {
      setPageError('');
    }
  };

  const bulkQtyNum = parseInt(formData.bulkQty) || 0;
  const inQtyNum = parseInt(formData.inQty) || 0;
  const cutQtyNum = parseInt(formData.cutQty) || 0;

  const balanceBulkQty = Math.max(0, bulkQtyNum - inQtyNum);
  const availableQty = Math.max(0, inQtyNum - cutQtyNum);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.submissionId) newErrors.submissionId = 'Approved revision is required';
    if (!formData.cutInDate) newErrors.cutInDate = 'Cut In Date is required';
    if (!formData.scheduleNo.trim()) newErrors.scheduleNo = 'Schedule No is required';
    if (!formData.cutNo.trim()) newErrors.cutNo = 'Cut No is required';
    if (!formData.numberRange.trim()) newErrors.numberRange = 'Number Range is required';
    if (!formData.size) newErrors.size = 'Please select a Size';

    if (inQtyNum <= 0) newErrors.inQty = 'Must be greater than 0';
    if (inQtyNum > bulkQtyNum) {
      newErrors.inQty = `Exceeds Approved Bulk Qty (${bulkQtyNum})`;
    }

    if (cutQtyNum < 0) newErrors.cutQty = 'Cannot be negative';
    if (cutQtyNum > inQtyNum) {
      newErrors.cutQty = `Exceeds IN Qty (${inQtyNum})`;
    }

    if (!formData.bundleQty || parseInt(formData.bundleQty) <= 0) {
      newErrors.bundleQty = 'Invalid Bundle Qty';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const resetForm = () => {
    setFormData(INITIAL_FORM_STATE);
    setEditingId(null);
    setErrors({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setIsSaving(true);

    try {
      if (editingId) {
        const updatedRecord: StoreInRecord = {
          id: editingId,
          submissionId: formData.submissionId,
          revisionNo: formData.revisionNo,
          styleNo: formData.styleNo,
          customerName: formData.customerName,
          bodyColour: formData.bodyColour,
          printColour: formData.printColour,
          components: formData.components,
          season: formData.season,
          cutInDate: formData.cutInDate,
          bulkQty: bulkQtyNum,
          inQty: inQtyNum,
          balanceBulkQty,
          cutQty: cutQtyNum,
          availableQty,
          scheduleNo: formData.scheduleNo,
          cutNo: formData.cutNo,
          bundleQty: parseInt(formData.bundleQty),
          numberRange: formData.numberRange,
          size: formData.size,
        };

        await updateStoreInRecord(editingId, updatedRecord);
      } else {
        await addStoreInRecord({
          submissionId: formData.submissionId,
          cutInDate: formData.cutInDate,
          bulkQty: bulkQtyNum,
          inQty: inQtyNum,
          balanceBulkQty,
          cutQty: cutQtyNum,
          availableQty,
          scheduleNo: formData.scheduleNo,
          cutNo: formData.cutNo,
          bundleQty: parseInt(formData.bundleQty),
          numberRange: formData.numberRange,
          size: formData.size,
        });
      }

      resetForm();
    } catch (error) {
      setPageError(
        error instanceof Error ? error.message : 'Failed to save Store-In record.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (record: StoreInRecord) => {
    setFormData({
      submissionId: record.submissionId,
      styleNo: record.styleNo,
      customerName: record.customerName,
      revisionNo: record.revisionNo,
      bodyColour: record.bodyColour,
      printColour: record.printColour,
      components: record.components,
      season: record.season,
      cutInDate: record.cutInDate,
      bulkQty: record.bulkQty.toString(),
      inQty: record.inQty.toString(),
      cutQty: record.cutQty.toString(),
      scheduleNo: record.scheduleNo,
      cutNo: record.cutNo,
      bundleQty: record.bundleQty.toString(),
      numberRange: record.numberRange,
      size: record.size,
    });

    setEditingId(record.id);
    setErrors({});
    setPageError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this receiving record?')) {
      return;
    }

    try {
      await deleteStoreInRecord(id);
    } catch (error) {
      setPageError(
        error instanceof Error ? error.message : 'Failed to delete record.'
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
        <div className="rounded-lg bg-orange-100 p-2">
          <PackageOpen className="h-6 w-6 text-orange-700" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Store-In (Receiving)</h2>
          <p className="text-sm text-slate-500">
            Only latest approved revisions can move into Stores.
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
            {editingId ? 'Edit Store-In Record' : 'New Store-In Entry'}
          </h3>

          {editingId && (
            <span className="animate-pulse rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">
              EDIT MODE
            </span>
          )}
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-8">
          {/* APPROVED REVISION PICKER */}
          <div className="space-y-4 rounded-xl border border-emerald-200 bg-emerald-50/60 p-5">
            <h4 className="border-b border-emerald-200 pb-2 text-sm font-bold uppercase tracking-wider text-emerald-800">
              Approved Latest Revision
            </h4>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1 lg:col-span-2">
                <label className="block text-xs font-medium text-slate-600">
                  Approved Revision <span className="text-red-500">*</span>
                </label>
                <select
                  name="submissionId"
                  value={formData.submissionId}
                  onChange={handleInputChange}
                  disabled={!!editingId}
                  className={`w-full rounded-lg border px-3 py-2 text-sm outline-none bg-white ${
                    errors.submissionId
                      ? 'border-red-400 bg-red-50'
                      : 'border-slate-300 focus:ring-2 focus:ring-orange-500'
                  } ${editingId ? 'cursor-not-allowed bg-slate-100' : ''}`}
                >
                  <option value="" disabled>
                    Select approved latest revision...
                  </option>
                  {eligibleStoreInItems.map((item) => (
                    <option key={item.submissionId} value={item.submissionId}>
                      {item.styleNo} | {item.customerName} | Rev {item.revisionNo}
                    </option>
                  ))}
                </select>
                {errors.submissionId && (
                  <p className="text-[11px] text-red-600">
                    <AlertCircle className="mr-1 inline h-3 w-3" />
                    {errors.submissionId}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-600">Customer</label>
                <input
                  type="text"
                  readOnly
                  value={formData.customerName}
                  className="w-full cursor-not-allowed rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-600"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-600">Revision</label>
                <div className="flex w-full items-center gap-2 rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-700">
                  <GitBranch className="h-4 w-4 text-indigo-600" />
                  <span>Rev {formData.revisionNo}</span>
                </div>
              </div>
            </div>

            {selectedEligibleItem && (
              <div className="flex flex-wrap gap-3">
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-medium text-emerald-700">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Approved
                </span>
                <span className="rounded-full border border-indigo-200 bg-white px-3 py-1 text-xs font-medium text-indigo-700">
                  Level: {selectedEligibleItem.level}
                </span>
                <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700">
                  Approved Bulk Qty: {selectedEligibleItem.approvedBulkQty}
                </span>
              </div>
            )}
          </div>

          {/* AUTO-FILL SPECS */}
          <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-5">
            <h4 className="border-b border-slate-200 pb-2 text-sm font-bold uppercase tracking-wider text-slate-700">
              Garment Spec (Auto-Filled)
            </h4>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-500">Style No</label>
                <input
                  type="text"
                  value={formData.styleNo}
                  readOnly
                  className="w-full cursor-not-allowed rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-600"
                />
              </div>

              {[
                { label: 'Body Colour', name: 'bodyColour' },
                { label: 'Print Colour', name: 'printColour' },
                { label: 'Components', name: 'components' },
                { label: 'Season', name: 'season' },
              ].map((field) => (
                <div key={field.name} className="space-y-1">
                  <label className="block text-xs font-medium text-slate-500">
                    {field.label}
                  </label>
                  <input
                    type="text"
                    value={(formData as Record<string, string | number>)[field.name] as string}
                    readOnly
                    className="w-full cursor-not-allowed rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-600"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* MANUAL ENTRY */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-700">
                Cut In Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="cutInDate"
                value={formData.cutInDate}
                onChange={handleInputChange}
                className={`w-full rounded-lg border px-3 py-2 outline-none sm:text-sm ${
                  errors.cutInDate
                    ? 'border-red-400 bg-red-50'
                    : 'border-slate-300 focus:ring-2 focus:ring-orange-500'
                }`}
              />
              {errors.cutInDate && (
                <p className="text-[11px] text-red-600">
                  <AlertCircle className="mr-1 inline h-3 w-3" />
                  {errors.cutInDate}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-700">
                Schedule No <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="scheduleNo"
                value={formData.scheduleNo}
                onChange={handleInputChange}
                placeholder="e.g. SCH-001"
                className={`w-full rounded-lg border px-3 py-2 outline-none sm:text-sm ${
                  errors.scheduleNo
                    ? 'border-red-400 bg-red-50'
                    : 'border-slate-300 focus:ring-2 focus:ring-orange-500'
                }`}
              />
              {errors.scheduleNo && (
                <p className="text-[11px] text-red-600">
                  <AlertCircle className="mr-1 inline h-3 w-3" />
                  {errors.scheduleNo}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-700">
                Cut No <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="cutNo"
                value={formData.cutNo}
                onChange={handleInputChange}
                placeholder="e.g. C-889"
                className={`w-full rounded-lg border px-3 py-2 outline-none sm:text-sm ${
                  errors.cutNo
                    ? 'border-red-400 bg-red-50'
                    : 'border-slate-300 focus:ring-2 focus:ring-orange-500'
                }`}
              />
              {errors.cutNo && (
                <p className="text-[11px] text-red-600">
                  <AlertCircle className="mr-1 inline h-3 w-3" />
                  {errors.cutNo}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-700">
                Size <span className="text-red-500">*</span>
              </label>
              <select
                name="size"
                value={formData.size}
                onChange={handleInputChange}
                className={`w-full rounded-lg border px-3 py-2 outline-none sm:text-sm bg-white ${
                  errors.size
                    ? 'border-red-400 bg-red-50'
                    : 'border-slate-300 focus:ring-2 focus:ring-orange-500'
                }`}
              >
                <option value="" disabled>
                  Select Size...
                </option>
                {SIZES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              {errors.size && (
                <p className="text-[11px] text-red-600">
                  <AlertCircle className="mr-1 inline h-3 w-3" />
                  {errors.size}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-700">
                Bundle Qty <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="bundleQty"
                value={formData.bundleQty}
                onChange={handleInputChange}
                placeholder="e.g. 50"
                className={`w-full rounded-lg border px-3 py-2 outline-none sm:text-sm ${
                  errors.bundleQty
                    ? 'border-red-400 bg-red-50'
                    : 'border-slate-300 focus:ring-2 focus:ring-orange-500'
                }`}
              />
              {errors.bundleQty && (
                <p className="text-[11px] text-red-600">
                  <AlertCircle className="mr-1 inline h-3 w-3" />
                  {errors.bundleQty}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-700">
                Number Range <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="numberRange"
                value={formData.numberRange}
                onChange={handleInputChange}
                placeholder="e.g. 001 - 500"
                className={`w-full rounded-lg border px-3 py-2 outline-none sm:text-sm ${
                  errors.numberRange
                    ? 'border-red-400 bg-red-50'
                    : 'border-slate-300 focus:ring-2 focus:ring-orange-500'
                }`}
              />
              {errors.numberRange && (
                <p className="text-[11px] text-red-600">
                  <AlertCircle className="mr-1 inline h-3 w-3" />
                  {errors.numberRange}
                </p>
              )}
            </div>
          </div>

          {/* QUANTITY WATERFALL */}
          <div className="rounded-xl border border-orange-200 bg-orange-50/80 p-6">
            <div className="grid grid-cols-1 items-end gap-4 md:grid-cols-5">
              <div className="space-y-1">
                <label className="block text-[11px] font-bold uppercase text-slate-500">
                  Approved Bulk Qty
                </label>
                <input
                  type="text"
                  value={formData.bulkQty}
                  readOnly
                  className="w-full cursor-not-allowed rounded-lg border border-slate-200 bg-slate-100 px-3 py-3 text-sm font-semibold text-slate-500"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-bold text-orange-900">
                  IN Qty (Received) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    name="inQty"
                    value={formData.inQty}
                    onChange={handleInputChange}
                    placeholder="0"
                    className={`w-full rounded-lg border px-3 py-3 font-semibold outline-none sm:text-sm ${
                      errors.inQty
                        ? 'border-red-400 bg-white focus:ring-red-500'
                        : 'border-orange-300 focus:ring-2 focus:ring-orange-600'
                    }`}
                  />
                  {errors.inQty && (
                    <span className="absolute -bottom-5 left-0 rounded bg-white px-1 text-[10px] text-red-600 shadow-sm">
                      {errors.inQty}
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-1 border-r border-orange-200 pr-4">
                <label className="block text-[11px] font-bold uppercase text-orange-700">
                  Factory Balance
                </label>
                <div className="w-full rounded-lg border border-orange-200 bg-orange-100 px-3 py-3 text-sm font-bold text-orange-800">
                  {balanceBulkQty}
                </div>
              </div>

              <div className="space-y-1 pl-2">
                <label className="block text-sm font-bold text-orange-900">
                  Cut Qty (Processed) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    name="cutQty"
                    value={formData.cutQty}
                    onChange={handleInputChange}
                    placeholder="0"
                    className={`w-full rounded-lg border px-3 py-3 font-semibold outline-none sm:text-sm ${
                      errors.cutQty
                        ? 'border-red-400 bg-white focus:ring-red-500'
                        : 'border-orange-300 focus:ring-2 focus:ring-orange-600'
                    }`}
                  />
                  {errors.cutQty && (
                    <span className="absolute -bottom-5 left-0 rounded bg-white px-1 text-[10px] text-red-600 shadow-sm">
                      {errors.cutQty}
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-bold uppercase text-emerald-700">
                  Shelf Available
                </label>
                <div className="flex items-center justify-between rounded-lg border-2 border-emerald-400 bg-emerald-50 px-3 py-3 text-lg font-black text-emerald-700 shadow-inner">
                  <span>{availableQty}</span>
                </div>
              </div>
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
              className="flex items-center rounded-lg bg-orange-600 px-6 py-2 font-medium text-white shadow-sm hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {editingId ? (
                <Save className="mr-2 h-4 w-4" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              {isSaving
                ? editingId
                  ? 'Updating...'
                  : 'Saving...'
                : editingId
                ? 'Update Record'
                : 'Save Store-In Data'}
            </button>
          </div>
        </form>
      </div>

      {/* SUMMARY TABLE */}
      {storeInRecords.length > 0 && (
        <div className="mt-8 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-800">Recent Store-In Records</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-max w-full whitespace-nowrap text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-6 py-3 font-semibold">Style / Spec</th>
                  <th className="px-6 py-3 font-semibold">Revision / Customer</th>
                  <th className="px-6 py-3 font-semibold">Schedule & Details</th>
                  <th className="px-6 py-3 font-semibold">Bulk & Factory</th>
                  <th className="px-6 py-3 font-semibold">Store Inventory</th>
                  <th className="px-6 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                <AnimatePresence>
                  {storeInRecords.map((record) => (
                    <motion.tr
                      key={record.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="transition-colors hover:bg-slate-50"
                    >
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-900">{record.styleNo}</p>
                        <p className="mt-0.5 text-[11px] text-slate-500">
                          {record.bodyColour} / {record.season}
                        </p>
                        <p className="max-w-40 truncate text-[11px] text-slate-500">
                          {record.components}
                        </p>
                      </td>

                      <td className="px-6 py-4">
                        <div className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                          <GitBranch className="h-3 w-3" />
                          Rev {record.revisionNo}
                        </div>
                        <p className="mt-2 text-xs text-slate-500">{record.customerName}</p>
                      </td>

                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-slate-800">
                          Sch: {record.scheduleNo} | Cut: {record.cutNo}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-600">
                          <span className="font-bold">{record.size}</span> (Bundle: {record.bundleQty})
                        </p>
                        <p className="mt-0.5 text-[11px] text-slate-400">
                          Rng: {record.numberRange} | In: {record.cutInDate}
                        </p>
                      </td>

                      <td className="bg-slate-50/50 px-6 py-4">
                        <div className="space-y-1">
                          <div className="flex w-36 justify-between text-xs">
                            <span className="text-slate-500">Approved Bulk:</span>
                            <span className="font-medium text-slate-800">{record.bulkQty}</span>
                          </div>
                          <div className="flex w-36 justify-between text-xs">
                            <span className="text-slate-500">Received (IN):</span>
                            <span className="font-medium text-orange-600">-{record.inQty}</span>
                          </div>
                          <div className="flex w-36 justify-between border-t border-slate-200 pt-1 text-[11px]">
                            <span className="font-bold text-slate-600">FACTORY OWES:</span>
                            <span className="font-bold text-slate-800">{record.balanceBulkQty}</span>
                          </div>
                        </div>
                      </td>

                      <td className="bg-orange-50/30 px-6 py-4">
                        <div className="space-y-1">
                          <div className="flex w-32 justify-between text-xs">
                            <span className="text-slate-500">IN Qty:</span>
                            <span className="font-medium">{record.inQty}</span>
                          </div>
                          <div className="flex w-32 justify-between text-xs">
                            <span className="text-slate-500">CUT Qty:</span>
                            <span className="font-medium text-red-600">-{record.cutQty}</span>
                          </div>
                          <div className="flex w-32 justify-between border-t border-orange-200 pt-1 text-sm">
                            <span className="font-bold text-emerald-700">ON SHELF:</span>
                            <span className="font-black text-emerald-600">{record.availableQty}</span>
                          </div>
                        </div>
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