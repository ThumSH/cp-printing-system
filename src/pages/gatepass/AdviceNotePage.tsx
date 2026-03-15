// src/pages/gatepass/AdviceNotePage.tsx
import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  Save,
  Edit2,
  Trash2,
  AlertCircle,
  GitBranch,
  CheckCircle2,
} from 'lucide-react';
import {
  useAdviceNoteStore,
  AdviceNoteRecord,
  AdviceNoteRow,
  EligibleGatepassItem,
} from '../../store/adviceNoteStore';

const INITIAL_FORM_STATE = {
  productionRecordId: '',
  submissionId: '',
  revisionNo: 1,
  deliveryDate: '',
  attn: '',
  customerName: '',
  styleNo: '',
  address: '',
  scheduleNo: '',
  cutNo: '',
  component: '',
  dispatchQty: '',
  receivedByName: '',
  prepByName: '',
  authByName: '',
};

export default function AdviceNotePage() {
  const {
    adviceNotes,
    eligibleDispatchItems,
    fetchAdviceNotes,
    fetchEligibleDispatchItems,
    addAdviceNote,
    updateAdviceNote,
    deleteAdviceNote,
  } = useAdviceNoteStore();

  const [formData, setFormData] = useState(INITIAL_FORM_STATE);
  const [rowInputs, setRowInputs] = useState<Record<string, AdviceNoteRow>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pageError, setPageError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadPageData = async () => {
      try {
        await Promise.all([fetchAdviceNotes(), fetchEligibleDispatchItems()]);
      } catch (error) {
        setPageError(
          error instanceof Error
            ? error.message
            : 'Failed to load gatepass data.'
        );
      }
    };

    loadPageData();
  }, [fetchAdviceNotes, fetchEligibleDispatchItems]);

  const currentAdNo = useMemo(() => {
    if (editingId) {
      return adviceNotes.find((n) => n.id === editingId)?.adNo || '';
    }
    return `AD No : ${String(adviceNotes.length + 1).padStart(5, '0')}`;
  }, [editingId, adviceNotes]);

  const selectedEligibleItem = useMemo(() => {
    return (
      eligibleDispatchItems.find(
        (item) => item.productionRecordId === formData.productionRecordId
      ) || null
    );
  }, [eligibleDispatchItems, formData.productionRecordId]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;

    if (name === 'productionRecordId') {
      const matched = eligibleDispatchItems.find(
        (item) => item.productionRecordId === value
      );

      if (matched) {
        setFormData((prev) => ({
          ...prev,
          productionRecordId: matched.productionRecordId,
          submissionId: matched.submissionId,
          revisionNo: matched.revisionNo,
          styleNo: matched.styleNo,
          customerName: matched.customerName,
          cutNo: matched.cutNo,
          component: matched.components,
          dispatchQty: '',
        }));

        const initialRows: Record<string, AdviceNoteRow> = {
          [matched.productionRecordId]: {
            productionRecordId: matched.productionRecordId,
            pd: 0,
            fd: 0,
            goodQty: matched.remainingDispatchQty,
          },
        };

        setRowInputs(initialRows);
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

  const handleRowChange = (
    productionRecordId: string,
    field: 'pd' | 'fd',
    value: string
  ) => {
    const numValue = parseInt(value) || 0;

    setRowInputs((prev) => {
      const currentRow = prev[productionRecordId] || {
        productionRecordId,
        pd: 0,
        fd: 0,
        goodQty: 0,
      };

      const updatedRow = { ...currentRow, [field]: numValue };
      const dispatchQtyNum = parseInt(formData.dispatchQty) || 0;

      updatedRow.goodQty = Math.max(0, dispatchQtyNum - (updatedRow.pd + updatedRow.fd));

      return {
        ...prev,
        [productionRecordId]: updatedRow,
      };
    });
  };

  useEffect(() => {
    if (!selectedEligibleItem) return;

    const dispatchQtyNum = parseInt(formData.dispatchQty) || 0;

    setRowInputs((prev) => {
      const currentRow = prev[selectedEligibleItem.productionRecordId] || {
        productionRecordId: selectedEligibleItem.productionRecordId,
        pd: 0,
        fd: 0,
        goodQty: dispatchQtyNum,
      };

      return {
        ...prev,
        [selectedEligibleItem.productionRecordId]: {
          ...currentRow,
          goodQty: Math.max(0, dispatchQtyNum - ((currentRow.pd || 0) + (currentRow.fd || 0))),
        },
      };
    });
  }, [formData.dispatchQty, selectedEligibleItem]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.productionRecordId) newErrors.productionRecordId = 'Production item is required';
    if (!formData.deliveryDate) newErrors.deliveryDate = 'Delivery date is required';
    if (!formData.attn.trim()) newErrors.attn = 'Attn is required';
    if (!formData.address.trim()) newErrors.address = 'Address is required';
    if (!formData.dispatchQty || parseInt(formData.dispatchQty) <= 0) {
      newErrors.dispatchQty = 'Dispatch qty must be greater than 0';
    }

    if (
      selectedEligibleItem &&
      parseInt(formData.dispatchQty || '0') > selectedEligibleItem.remainingDispatchQty
    ) {
      newErrors.dispatchQty = `Dispatch exceeds remaining qty (${selectedEligibleItem.remainingDispatchQty})`;
    }

    if (!formData.receivedByName.trim()) newErrors.receivedByName = 'Required';
    if (!formData.prepByName.trim()) newErrors.prepByName = 'Required';
    if (!formData.authByName.trim()) newErrors.authByName = 'Required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const resetForm = () => {
    setFormData(INITIAL_FORM_STATE);
    setRowInputs({});
    setEditingId(null);
    setErrors({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSaving(true);

    try {
      if (editingId) {
        const updatedNote: AdviceNoteRecord = {
          id: editingId,
          productionRecordId: formData.productionRecordId,
          storeInRecordId:
            adviceNotes.find((n) => n.id === editingId)?.storeInRecordId || '',
          submissionId: formData.submissionId,
          revisionNo: formData.revisionNo,
          adNo: currentAdNo,
          deliveryDate: formData.deliveryDate,
          attn: formData.attn,
          customerName: formData.customerName,
          styleNo: formData.styleNo,
          address: formData.address,
          scheduleNo: formData.scheduleNo,
          cutNo: formData.cutNo,
          component: formData.component,
          dispatchQty: parseInt(formData.dispatchQty),
          balanceQty:
            selectedEligibleItem
              ? Math.max(
                  0,
                  selectedEligibleItem.remainingDispatchQty - parseInt(formData.dispatchQty)
                )
              : 0,
          rows: rowInputs,
          receivedByName: formData.receivedByName,
          prepByName: formData.prepByName,
          authByName: formData.authByName,
        };

        await updateAdviceNote(editingId, updatedNote);
      } else {
       await addAdviceNote({
  productionRecordId: formData.productionRecordId,
  adNo: currentAdNo,
  deliveryDate: formData.deliveryDate,
  attn: formData.attn,
  address: formData.address,
  scheduleNo: formData.scheduleNo,
  dispatchQty: parseInt(formData.dispatchQty),
  rows: rowInputs,
  receivedByName: formData.receivedByName,
  prepByName: formData.prepByName,
  authByName: formData.authByName,
});
      }

      resetForm();
      await fetchEligibleDispatchItems();
      await fetchAdviceNotes();
    } catch (error) {
      setPageError(
        error instanceof Error ? error.message : 'Failed to save advice note.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (note: AdviceNoteRecord) => {
    setFormData({
      productionRecordId: note.productionRecordId,
      submissionId: note.submissionId,
      revisionNo: note.revisionNo,
      deliveryDate: note.deliveryDate,
      attn: note.attn,
      customerName: note.customerName,
      styleNo: note.styleNo,
      address: note.address,
      scheduleNo: note.scheduleNo,
      cutNo: note.cutNo,
      component: note.component,
      dispatchQty: note.dispatchQty.toString(),
      receivedByName: note.receivedByName,
      prepByName: note.prepByName,
      authByName: note.authByName,
    });
    setRowInputs(note.rows);
    setEditingId(note.id);
    setErrors({});
    setPageError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this advice note?')) {
      return;
    }

    try {
      await deleteAdviceNote(id);
      await fetchEligibleDispatchItems();
      await fetchAdviceNotes();
    } catch (error) {
      setPageError(
        error instanceof Error ? error.message : 'Failed to delete advice note.'
      );
    }
  };

  const activeRow =
    selectedEligibleItem && rowInputs[selectedEligibleItem.productionRecordId]
      ? rowInputs[selectedEligibleItem.productionRecordId]
      : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-6xl space-y-8 pb-12"
    >
      <div className="flex items-center space-x-3 border-b border-slate-200 pb-4">
        <div className="rounded-lg bg-blue-100 p-2">
          <FileText className="h-6 w-6 text-blue-700" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Advice Note / Delivery Report</h2>
          <p className="text-sm text-slate-500">
            Gatepass can only dispatch items already issued to Production.
          </p>
        </div>
      </div>

      {pageError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {pageError}
        </div>
      )}

      <div className="mx-auto overflow-hidden border border-slate-300 bg-white text-slate-900 shadow-xl">
        <form onSubmit={handleSubmit}>
          {/* HEADER */}
          <div className="flex items-start justify-between border-b-2 border-slate-800 p-8">
            <div className="w-1/3">
              <h1 className="text-3xl font-black tracking-tighter text-blue-900">
                COLOURPLUS
              </h1>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
                Screen Printing
              </p>
            </div>

            <div className="w-1/3 text-center">
              <h2 className="mb-2 text-xl font-bold uppercase underline underline-offset-4 decoration-2">
                Advice Note
              </h2>
              <div className="inline-block border-2 border-slate-800 bg-slate-50 px-4 py-1 text-lg font-bold tracking-wider text-slate-800">
                {currentAdNo}
              </div>
            </div>

            <div className="w-1/3 text-right text-sm">
              <p className="font-semibold">Colourplus Factory</p>
              <p className="text-slate-600">Industrial Estate, Main Road</p>
              <div className="mt-4 flex items-center justify-end space-x-2">
                <span className="text-xs font-bold uppercase">Date:</span>
                <input
                  type="date"
                  name="deliveryDate"
                  value={formData.deliveryDate}
                  onChange={handleInputChange}
                  className="border-b border-slate-400 text-sm font-semibold outline-none focus:border-blue-600"
                  required
                />
              </div>
            </div>
          </div>

          {/* PRODUCTION PICKER */}
          <div className="border-b-2 border-slate-800 bg-blue-50/40 p-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1 lg:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wide text-slate-600">
                  Eligible Production Item <span className="text-red-500">*</span>
                </label>
                <select
                  name="productionRecordId"
                  value={formData.productionRecordId}
                  onChange={handleInputChange}
                  disabled={!!editingId}
                  className={`w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none ${
                    errors.productionRecordId
                      ? 'border-red-400 bg-red-50'
                      : 'border-slate-300 focus:ring-2 focus:ring-blue-500'
                  } ${editingId ? 'cursor-not-allowed bg-slate-100' : ''}`}
                >
                  <option value="" disabled>
                    Select production-issued item...
                  </option>
                  {eligibleDispatchItems.map((item) => (
                    <option key={item.productionRecordId} value={item.productionRecordId}>
                      {item.styleNo} | {item.customerName} | Rev {item.revisionNo} | Remaining {item.remainingDispatchQty}
                    </option>
                  ))}
                </select>
                {errors.productionRecordId && (
                  <p className="text-[11px] text-red-600">
                    <AlertCircle className="mr-1 inline h-3 w-3" />
                    {errors.productionRecordId}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold uppercase tracking-wide text-slate-600">
                  Revision
                </label>
                <div className="inline-flex w-full items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700">
                  <GitBranch className="h-4 w-4" />
                  Rev {formData.revisionNo}
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold uppercase tracking-wide text-slate-600">
                  Remaining Dispatch Qty
                </label>
                <div className="inline-flex w-full items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" />
                  {selectedEligibleItem?.remainingDispatchQty ?? '-'}
                </div>
              </div>
            </div>
          </div>

          {/* SUB HEADER */}
          <div className="grid grid-cols-2 gap-8 border-b-2 border-slate-800 bg-slate-50 p-8">
            <div className="space-y-4">
              <div className="flex items-end">
                <span className="w-24 text-sm font-bold uppercase">Attn:</span>
                <input
                  type="text"
                  name="attn"
                  value={formData.attn}
                  onChange={handleInputChange}
                  className="flex-1 border-b border-slate-400 bg-transparent pb-1 font-medium outline-none focus:border-blue-600"
                />
              </div>

              <div className="flex items-end">
                <span className="w-24 text-sm font-bold uppercase">Style No:</span>
                <input
                  type="text"
                  readOnly
                  value={formData.styleNo}
                  className="flex-1 border-b border-slate-300 bg-transparent pb-1 font-bold text-blue-800 outline-none"
                />
              </div>

              <div className="flex items-end">
                <span className="w-24 text-sm font-bold uppercase">Customer:</span>
                <input
                  type="text"
                  readOnly
                  value={formData.customerName}
                  className="flex-1 border-b border-slate-300 bg-transparent pb-1 font-medium outline-none"
                />
              </div>

              <div className="flex items-start">
                <span className="w-24 pt-1 text-sm font-bold uppercase">Address:</span>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  rows={2}
                  className="flex-1 resize-none border-b border-slate-400 bg-transparent font-medium outline-none focus:border-blue-600"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-end">
                <span className="w-32 text-sm font-bold uppercase">Schedule No:</span>
                <input
                  type="text"
                  name="scheduleNo"
                  value={formData.scheduleNo}
                  onChange={handleInputChange}
                  className="flex-1 border-b border-slate-400 bg-transparent pb-1 font-bold outline-none focus:border-blue-600"
                />
              </div>

              <div className="flex items-end">
                <span className="w-32 text-sm font-bold uppercase">Cut No:</span>
                <input
                  type="text"
                  readOnly
                  value={formData.cutNo}
                  className="flex-1 border-b border-slate-300 bg-transparent pb-1 font-bold outline-none"
                />
              </div>

              <div className="flex items-end">
                <span className="w-32 text-sm font-bold uppercase">Components:</span>
                <input
                  type="text"
                  readOnly
                  value={formData.component}
                  className="flex-1 border-b border-slate-300 bg-transparent pb-1 font-medium outline-none"
                />
              </div>

              <div className="flex items-end">
                <span className="w-32 text-sm font-bold uppercase">
                  Dispatch Qty <span className="text-red-500">*</span>
                </span>
                <input
                  type="number"
                  name="dispatchQty"
                  value={formData.dispatchQty}
                  onChange={handleInputChange}
                  className="flex-1 border-b border-slate-400 bg-transparent pb-1 font-bold text-blue-700 outline-none focus:border-blue-600"
                />
              </div>
              {errors.dispatchQty && (
                <p className="text-[11px] text-red-600">{errors.dispatchQty}</p>
              )}
            </div>
          </div>

          {/* GRID */}
          <div className="min-h-[280px]">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="divide-x divide-slate-600 bg-slate-800 text-white">
                  <th className="w-10 px-2 py-3 text-center font-bold">#</th>
                  <th className="px-4 py-3 text-left font-bold">Production Ref</th>
                  <th className="px-2 py-3 text-center font-bold">Dispatch Qty</th>
                  <th className="w-20 bg-red-900 px-2 py-3 text-center font-bold">P/D</th>
                  <th className="w-20 bg-red-900 px-2 py-3 text-center font-bold">F/D</th>
                  <th className="w-24 bg-emerald-900 px-2 py-3 text-center font-bold">Good QTY</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-300">
                {selectedEligibleItem && activeRow ? (
                  <tr className="divide-x divide-slate-300 hover:bg-blue-50/30">
                    <td className="px-2 py-2 text-center font-medium text-slate-500">1</td>
                    <td className="px-4 py-2 font-semibold text-slate-800">
                      {selectedEligibleItem.styleNo} | {selectedEligibleItem.cutNo} | {selectedEligibleItem.lineNo}
                    </td>
                    <td className="bg-slate-100 px-2 py-2 text-center font-bold">
                      {formData.dispatchQty || 0}
                    </td>
                    <td className="p-0">
                      <input
                        type="number"
                        value={activeRow.pd || ''}
                        onChange={(e) =>
                          handleRowChange(selectedEligibleItem.productionRecordId, 'pd', e.target.value)
                        }
                        className="h-full w-full bg-transparent py-2 text-center font-semibold text-red-700 outline-none focus:bg-red-50"
                        placeholder="0"
                      />
                    </td>
                    <td className="p-0">
                      <input
                        type="number"
                        value={activeRow.fd || ''}
                        onChange={(e) =>
                          handleRowChange(selectedEligibleItem.productionRecordId, 'fd', e.target.value)
                        }
                        className="h-full w-full bg-transparent py-2 text-center font-semibold text-red-700 outline-none focus:bg-red-50"
                        placeholder="0"
                      />
                    </td>
                    <td className="bg-emerald-50/50 px-2 py-2 text-center font-black text-emerald-700">
                      {activeRow.goodQty}
                    </td>
                  </tr>
                ) : (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      Select a production-issued item to load gatepass data.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* SIGNATURES */}
          <div className="border-t-2 border-slate-800 bg-slate-50 p-8">
            <div className="grid grid-cols-3 gap-12 text-center">
              <SignatureField
                label="Received By"
                sublabel="Name / Sign / ID No"
                name="receivedByName"
                value={formData.receivedByName}
                onChange={handleInputChange}
                error={errors.receivedByName}
              />
              <SignatureField
                label="Prep & Checked By"
                sublabel="Name / Sign / ID No"
                name="prepByName"
                value={formData.prepByName}
                onChange={handleInputChange}
                error={errors.prepByName}
              />
              <SignatureField
                label="Authorized By"
                sublabel="Name / Sign / ID No"
                name="authByName"
                value={formData.authByName}
                onChange={handleInputChange}
                error={errors.authByName}
                highlight
              />
            </div>
          </div>

          {/* ACTIONS */}
          <div className="flex justify-end space-x-4 bg-slate-800 p-4">
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="bg-slate-700 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-600"
              >
                Cancel Edit
              </button>
            )}
            <button
              type="submit"
              disabled={!selectedEligibleItem || isSaving}
              className="flex items-center bg-blue-600 px-8 py-2 text-sm font-bold text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
            >
              <Save className="mr-2 h-4 w-4" />
              {isSaving
                ? 'SAVING ADVICE NOTE'
                : editingId
                ? 'UPDATE ADVICE NOTE'
                : 'SAVE ADVICE NOTE'}
            </button>
          </div>
        </form>
      </div>

      {/* HISTORY */}
      {adviceNotes.length > 0 && (
        <div className="mt-8 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-slate-50 p-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">
              Advice Note History
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full whitespace-nowrap text-left text-sm">
              <thead className="border-b border-slate-200 bg-white text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-6 py-3 font-semibold">AD No & Date</th>
                  <th className="px-6 py-3 font-semibold">Style / Revision</th>
                  <th className="px-6 py-3 font-semibold">Cut / Component</th>
                  <th className="px-6 py-3 font-semibold">Dispatch</th>
                  <th className="px-6 py-3 font-semibold">Attn / Address</th>
                  <th className="px-6 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                <AnimatePresence>
                  {adviceNotes.map((note) => (
                    <motion.tr
                      key={note.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="transition-colors hover:bg-slate-50"
                    >
                      <td className="px-6 py-4">
                        <span className="mb-1 inline-block rounded bg-slate-800 px-2 py-1 text-xs font-bold text-white">
                          {note.adNo}
                        </span>
                        <p className="text-xs font-medium text-slate-600">
                          {note.deliveryDate}
                        </p>
                      </td>

                      <td className="px-6 py-4">
                        <p className="font-bold text-blue-700">{note.styleNo}</p>
                        <div className="mt-1 inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2 py-1 text-[11px] font-semibold text-indigo-700">
                          <GitBranch className="h-3 w-3" />
                          Rev {note.revisionNo}
                        </div>
                        <p className="mt-1 text-xs text-slate-500">{note.customerName}</p>
                      </td>

                      <td className="px-6 py-4">
                        <p className="text-xs text-slate-500">Sch: {note.scheduleNo}</p>
                        <p className="text-xs text-slate-500">Cut: {note.cutNo}</p>
                        <p className="mt-0.5 text-xs text-slate-500">Comp: {note.component}</p>
                      </td>

                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-800">Qty: {note.dispatchQty}</p>
                        <p className="text-xs text-emerald-600">Balance: {note.balanceQty}</p>
                      </td>

                      <td className="px-6 py-4">
                        <p className="font-medium text-slate-800">{note.attn}</p>
                        <p className="mt-0.5 max-w-56 truncate text-[11px] text-slate-500">
                          {note.address}
                        </p>
                      </td>

                      <td className="space-x-2 px-6 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleEdit(note)}
                          className="rounded p-1.5 text-blue-600 hover:bg-blue-50"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(note.id)}
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

function SignatureField({
  label,
  sublabel,
  name,
  value,
  onChange,
  error,
  highlight = false,
}: {
  label: string;
  sublabel: string;
  name: string;
  value: string;
  onChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => void;
  error?: string;
  highlight?: boolean;
}) {
  return (
    <div className="space-y-6">
      <div className="flex h-16 items-end justify-center border-b border-dashed border-slate-400 pb-1">
        <input
          type="text"
          name={name}
          value={value}
          onChange={onChange}
          placeholder="Name / ID"
          className={`w-full bg-transparent text-center font-medium outline-none ${
            highlight ? 'text-blue-700' : ''
          }`}
        />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-bold uppercase">{label}</p>
        <p className="text-[10px] text-slate-500">{sublabel}</p>
        {error && <p className="text-[11px] text-red-600">{error}</p>}
      </div>
    </div>
  );
}