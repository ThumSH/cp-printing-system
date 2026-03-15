import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ClipboardCheck,
  Plus,
  Trash2,
  Save,
  AlertCircle,
  Printer,
  Download,
  GitBranch,
  CheckCircle2,
} from 'lucide-react';
import {
  useAuditStore,
  AuditRecord,
  AuditBundle,
  AuditStatus,
} from '../../store/auditStore';

const SIZES = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL'];

const INITIAL_FORM_STATE = {
  deliveryTrackerReportId: '',
  date: new Date().toISOString().split('T')[0],
  styleNo: '',
  customerName: '',
  scheduleNo: '',
  cutNo: '',
  colour: '',
  adNo: '',
  deliveryStatus: '',
  sizes: '',
  auditQty: '',
  status: 'Pending' as AuditStatus,
  auditorName: '',
  remarks: '',
};

export default function AuditPage() {
  const {
    auditRecords,
    eligibleAuditItems,
    fetchAuditRecords,
    fetchEligibleAuditItems,
    addAuditRecord,
    updateAuditRecord,
    updateAuditStatus,
    deleteAuditRecord,
  } = useAuditStore();

  const [formData, setFormData] = useState(INITIAL_FORM_STATE);
  const [bundles, setBundles] = useState<AuditBundle[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pageError, setPageError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadPageData = async () => {
      try {
        await Promise.all([fetchAuditRecords(), fetchEligibleAuditItems()]);
      } catch (error) {
        setPageError(
          error instanceof Error ? error.message : 'Failed to load audit data.'
        );
      }
    };

    loadPageData();
  }, [fetchAuditRecords, fetchEligibleAuditItems]);

  const selectedEligibleItem = useMemo(() => {
    return (
      eligibleAuditItems.find(
        (item) => item.deliveryTrackerReportId === formData.deliveryTrackerReportId
      ) || null
    );
  }, [eligibleAuditItems, formData.deliveryTrackerReportId]);

  const totalQty = bundles.reduce((sum, b) => sum + b.qty, 0);

  const calculateAuditQty = (qty: number): number => {
    if (qty <= 1) return qty;
    if (qty >= 2 && qty <= 8) return 3;
    if (qty >= 9 && qty <= 15) return 5;
    if (qty >= 16 && qty <= 25) return 8;
    if (qty >= 26 && qty <= 50) return 13;
    if (qty >= 51 && qty <= 90) return 20;
    if (qty >= 91 && qty <= 150) return 32;
    if (qty >= 151 && qty <= 280) return 50;
    if (qty >= 281 && qty <= 500) return 80;
    if (qty >= 501 && qty <= 1200) return 125;
    if (qty >= 1201 && qty <= 3200) return 200;
    if (qty >= 3201 && qty <= 10000) return 315;
    if (qty >= 10001 && qty <= 35000) return 500;
    if (qty >= 35001 && qty <= 150000) return 800;
    if (qty >= 150001 && qty <= 500000) return 1250;
    if (qty >= 500001) return 2000;
    return 0;
  };

  const calculatedAuditQty = calculateAuditQty(totalQty);

  const handleEligibleSelection = (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const value = e.target.value;
    const matched = eligibleAuditItems.find(
      (item) => item.deliveryTrackerReportId === value
    );

    if (!matched) return;

    setFormData((prev) => ({
      ...prev,
      deliveryTrackerReportId: matched.deliveryTrackerReportId,
      styleNo: matched.styleNo,
      customerName: matched.customerName,
      scheduleNo: matched.scheduleNo,
      cutNo: matched.cutNo,
      colour: '',
      adNo: matched.adNo,
      deliveryStatus: matched.deliveryStatus,
      auditQty: '',
    }));

    setBundles([]);
    setErrors({});
    setPageError('');
  };

  const handleFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
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

    if (pageError) setPageError('');
  };

  const addBundleRow = () => {
    setBundles((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        bundleNo: '',
        size: '',
        qty: 0,
      },
    ]);
  };

  const removeBundleRow = (id: string) => {
    setBundles((prev) => prev.filter((b) => b.id !== id));
  };

  const updateBundle = (
    id: string,
    field: keyof AuditBundle,
    value: string | number
  ) => {
    setBundles((prev) =>
      prev.map((b) => (b.id === id ? { ...b, [field]: value } : b))
    );
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.deliveryTrackerReportId) {
      newErrors.deliveryTrackerReportId = 'Tracked delivery selection is required';
    }

    if (!formData.date) newErrors.date = 'Date is required';
    if (bundles.length === 0) newErrors.bundles = 'Add at least one bundle';

    const invalidBundle = bundles.some(
      (b) => !b.bundleNo.trim() || !b.size || b.qty <= 0
    );
    if (invalidBundle) newErrors.bundles = 'Complete all bundle fields correctly';

    if (totalQty <= 0) newErrors.totalQty = 'Total quantity must be greater than 0';

    if (
      selectedEligibleItem &&
      totalQty > selectedEligibleItem.remainingAuditQty
    ) {
      newErrors.totalQty = `Bundle qty exceeds remaining auditable qty (${selectedEligibleItem.remainingAuditQty})`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const resetForm = () => {
    setFormData({
      ...INITIAL_FORM_STATE,
      date: new Date().toISOString().split('T')[0],
    });
    setBundles([]);
    setEditingId(null);
    setErrors({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    const uniqueSizes = Array.from(new Set(bundles.map((b) => b.size))).join(', ');

    setIsSaving(true);

    try {
      if (editingId) {
        const existing = auditRecords.find((r) => r.id === editingId);

        const updatedRecord: AuditRecord = {
          id: editingId,
          deliveryTrackerReportId: formData.deliveryTrackerReportId,
          adviceNoteId: existing?.adviceNoteId || '',
          productionRecordId: existing?.productionRecordId || '',
          storeInRecordId: existing?.storeInRecordId || '',
          submissionId: existing?.submissionId || '',
          revisionNo: existing?.revisionNo || 1,
          date: formData.date,
          styleNo: formData.styleNo,
          customerName: formData.customerName,
          scheduleNo: formData.scheduleNo,
          cutNo: formData.cutNo,
          colour: formData.colour,
          adNo: formData.adNo,
          deliveryStatus: formData.deliveryStatus,
          bundles,
          sizes: uniqueSizes,
          totalQty: existing?.totalQty || 0,
          auditQty: calculatedAuditQty,
          status: formData.status,
          auditorName: formData.auditorName,
          remarks: formData.remarks,
        };

        await updateAuditRecord(editingId, updatedRecord);
      } else {
        await addAuditRecord({
          deliveryTrackerReportId: formData.deliveryTrackerReportId,
          date: formData.date,
          bundles,
          sizes: uniqueSizes,
          auditQty: calculatedAuditQty,
          status: formData.status,
          auditorName: formData.auditorName,
          remarks: formData.remarks,
        });
      }

      resetForm();
      await fetchEligibleAuditItems();
      await fetchAuditRecords();
    } catch (error) {
      setPageError(
        error instanceof Error ? error.message : 'Failed to save audit record.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (record: AuditRecord) => {
    setEditingId(record.id);
    setFormData({
      deliveryTrackerReportId: record.deliveryTrackerReportId,
      date: record.date,
      styleNo: record.styleNo,
      customerName: record.customerName,
      scheduleNo: record.scheduleNo,
      cutNo: record.cutNo,
      colour: record.colour,
      adNo: record.adNo,
      deliveryStatus: record.deliveryStatus,
      sizes: record.sizes,
      auditQty: String(record.auditQty),
      status: record.status,
      auditorName: record.auditorName,
      remarks: record.remarks,
    });
    setBundles(record.bundles);
    setErrors({});
    setPageError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this audit record?')) {
      return;
    }

    try {
      await deleteAuditRecord(id);
      await fetchEligibleAuditItems();
      await fetchAuditRecords();
    } catch (error) {
      setPageError(
        error instanceof Error ? error.message : 'Failed to delete audit record.'
      );
    }
  };

  const handleQuickStatusUpdate = async (
    record: AuditRecord,
    status: AuditStatus,
    remarks: string
  ) => {
    try {
      await updateAuditStatus(
        record.id,
        status,
        remarks,
        record.auditorName || formData.auditorName
      );
    } catch (error) {
      setPageError(
        error instanceof Error ? error.message : 'Failed to update audit status.'
      );
    }
  };

  const exportToCSV = () => {
    const headers = [
      'Date',
      'Style No',
      'Customer',
      'AD No',
      'Schedule No',
      'Cut No',
      'Status',
      'Delivery Status',
      'Size(s)',
      'Total QTY',
      'Audit QTY',
      'Auditor',
      'Remarks',
    ];

    const rows = auditRecords.map((r) => [
      r.date,
      r.styleNo,
      `"${r.customerName}"`,
      r.adNo,
      r.scheduleNo,
      r.cutNo,
      r.status,
      r.deliveryStatus,
      `"${r.sizes}"`,
      r.totalQty,
      r.auditQty,
      `"${r.auditorName}"`,
      `"${r.remarks}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const blob = new Blob([csvContent], {
      type: 'text/csv;charset=utf-8;',
    });

    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute(
      'download',
      `Audit_Tracking_Report_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-7xl space-y-8 pb-12"
    >
      <style>
        {`
          @media print {
            body * { visibility: hidden; }
            #printable-area, #printable-area * { visibility: visible; }
            #printable-area { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 0; }
            .print-hide { display: none !important; }
            select, input, textarea { border: none !important; appearance: none !important; background: transparent !important; }
          }
        `}
      </style>

      <div className="print-hide flex items-center space-x-3 border-b border-slate-200 pb-4">
        <div className="rounded-lg bg-teal-100 p-2">
          <ClipboardCheck className="h-6 w-6 text-teal-700" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Quality Audit Setup</h2>
          <p className="text-sm text-slate-500">
            Audit can only be created from tracked delivery records.
          </p>
        </div>
      </div>

      {pageError && (
        <div className="print-hide rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {pageError}
        </div>
      )}

      <div className="print-hide rounded-xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 gap-6 rounded-lg border border-slate-100 bg-slate-50 p-6 md:grid-cols-4">
            <div className="space-y-1 md:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">
                Eligible Tracked Delivery
              </label>
              <select
                value={formData.deliveryTrackerReportId}
                onChange={handleEligibleSelection}
                disabled={!!editingId}
                className={`w-full rounded-lg border px-3 py-2 outline-none sm:text-sm bg-white ${
                  errors.deliveryTrackerReportId
                    ? 'border-red-400'
                    : 'border-slate-300 focus:border-teal-500'
                } ${editingId ? 'cursor-not-allowed bg-slate-100 opacity-70' : ''}`}
              >
                <option value="" disabled>
                  Select tracked delivery...
                </option>
                {eligibleAuditItems.map((item) => (
                  <option
                    key={item.deliveryTrackerReportId}
                    value={item.deliveryTrackerReportId}
                  >
                    {item.adNo} | {item.styleNo} | {item.customerName} | Rev {item.revisionNo}
                  </option>
                ))}
              </select>
              {errors.deliveryTrackerReportId && (
                <p className="text-[11px] text-red-600">
                  <AlertCircle className="mr-1 inline h-3 w-3" />
                  {errors.deliveryTrackerReportId}
                </p>
              )}
            </div>

            <ReadOnlyField label="Style No" value={formData.styleNo} />
            <ReadOnlyField label="Customer" value={formData.customerName} />

            <ReadOnlyField label="AD No" value={formData.adNo} />
            <ReadOnlyField label="Schedule No" value={formData.scheduleNo} />
            <ReadOnlyField label="Cut No" value={formData.cutNo} />

            <div className="space-y-1">
              <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">
                Revision
              </label>
              <div className="inline-flex w-full items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 font-bold text-indigo-700">
                <GitBranch className="h-4 w-4" />
                Rev {selectedEligibleItem?.revisionNo || '-'}
              </div>
            </div>

            <ReadOnlyField label="Delivery Status" value={formData.deliveryStatus} />
            <ReadOnlyField
              label="Remaining Audit Qty"
              value={
                selectedEligibleItem
                  ? String(selectedEligibleItem.remainingAuditQty)
                  : ''
              }
            />

            <div className="space-y-1">
              <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">
                Audit Date
              </label>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleFormChange}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none sm:text-sm focus:border-teal-500"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">
                Auditor Name
              </label>
              <input
                type="text"
                name="auditorName"
                value={formData.auditorName}
                onChange={handleFormChange}
                placeholder="Auditor name"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none sm:text-sm focus:border-teal-500"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">
                Audit Status
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleFormChange}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none sm:text-sm bg-white focus:border-teal-500"
              >
                <option value="Pending">Pending</option>
                <option value="Pass">Pass</option>
                <option value="Fail">Fail</option>
              </select>
            </div>

            <div className="space-y-1 md:col-span-4">
              <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">
                Remarks
              </label>
              <textarea
                name="remarks"
                value={formData.remarks}
                onChange={handleFormChange}
                rows={2}
                placeholder="Audit remarks..."
                className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2 outline-none sm:text-sm focus:border-teal-500"
              />
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-slate-200">
            <div className="flex items-center justify-between bg-slate-800 p-3">
              <h4 className="text-sm font-bold text-white">Audit Bundles</h4>
              <button
                type="button"
                onClick={addBundleRow}
                className="flex items-center rounded bg-teal-500 px-3 py-1 text-xs font-bold text-white transition-colors hover:bg-teal-400"
              >
                <Plus className="mr-1 h-3 w-3" /> Add Bundle
              </button>
            </div>

            {errors.bundles && (
              <div className="flex items-center border-b border-red-100 bg-red-50 p-3 text-sm font-medium text-red-600">
                <AlertCircle className="mr-2 h-4 w-4" />
                {errors.bundles}
              </div>
            )}

            {errors.totalQty && (
              <div className="flex items-center border-b border-red-100 bg-red-50 p-3 text-sm font-medium text-red-600">
                <AlertCircle className="mr-2 h-4 w-4" />
                {errors.totalQty}
              </div>
            )}

            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-2">Bundle No</th>
                  <th className="px-4 py-2">Size</th>
                  <th className="px-4 py-2">Bundle Qty</th>
                  <th className="w-16 px-4 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bundles.map((b) => (
                  <tr key={b.id} className="bg-white hover:bg-slate-50">
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        value={b.bundleNo}
                        onChange={(e) => updateBundle(b.id, 'bundleNo', e.target.value)}
                        placeholder="e.g. B-01"
                        className="w-full rounded border border-slate-300 p-1.5 outline-none focus:border-teal-500"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <select
                        value={b.size}
                        onChange={(e) => updateBundle(b.id, 'size', e.target.value)}
                        className="w-full rounded border border-slate-300 p-1.5 outline-none focus:border-teal-500"
                      >
                        <option value="" disabled>
                          Size...
                        </option>
                        {SIZES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        value={b.qty || ''}
                        onChange={(e) =>
                          updateBundle(b.id, 'qty', parseInt(e.target.value) || 0)
                        }
                        placeholder="0"
                        className="w-full rounded border border-slate-300 p-1.5 outline-none focus:border-teal-500"
                      />
                    </td>
                    <td className="px-4 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => removeBundleRow(b.id)}
                        className="p-1 text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}

                {bundles.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-slate-400">
                      No bundles added yet. Click "Add Bundle" to begin.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-teal-100 bg-teal-50 p-4">
            <div className="flex space-x-8">
              <div>
                <p className="text-xs font-bold uppercase text-teal-800">Total QTY</p>
                <p className="text-2xl font-black text-teal-900">{totalQty}</p>
              </div>
              <div className="border-l-2 border-teal-200 pl-8">
                <p className="text-xs font-bold uppercase text-teal-800">
                  Required Audit QTY (AQL)
                </p>
                <p className="text-2xl font-black text-teal-600">
                  {calculatedAuditQty}
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center rounded-lg bg-slate-800 px-6 py-2.5 font-bold text-white shadow-md hover:bg-slate-900 disabled:opacity-60"
              >
                <Save className="mr-2 h-4 w-4" />
                {isSaving
                  ? 'Saving...'
                  : editingId
                  ? 'Update Audit Record'
                  : 'Create Audit Record'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {auditRecords.length > 0 && (
        <div
          id="printable-area"
          className="mt-8 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm print:border-none print:shadow-none"
        >
          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 p-4 print:border-none print:bg-white">
            <h3 className="text-lg font-bold uppercase tracking-wider text-slate-800">
              Audit Tracking Board
            </h3>

            <div className="print-hide flex space-x-2">
              <button
                onClick={exportToCSV}
                className="flex items-center rounded-lg border border-slate-300 bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-200"
              >
                <Download className="mr-2 h-4 w-4" /> CSV
              </button>
              <button
                onClick={handlePrint}
                className="flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-indigo-700 shadow-sm"
              >
                <Printer className="mr-2 h-4 w-4" /> Print / PDF
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-max w-full whitespace-nowrap text-left text-sm print:border-collapse print:text-[11px]">
              <thead className="border-b border-slate-200 bg-white text-[11px] uppercase tracking-wider text-slate-500 print:border-b-2 print:border-black print:text-black">
                <tr>
                  <th className="px-4 py-3 font-semibold print:border print:border-slate-400 print:py-2">
                    Date / Style
                  </th>
                  <th className="px-4 py-3 font-semibold print:border print:border-slate-400 print:py-2">
                    Customer / AD
                  </th>
                  <th className="px-4 py-3 font-semibold print:border print:border-slate-400 print:py-2">
                    Schedule & Cut
                  </th>
                  <th className="px-4 py-3 font-semibold print:border print:border-slate-400 print:py-2">
                    Size(s)
                  </th>
                  <th className="px-4 py-3 font-semibold print:border print:border-slate-400 print:py-2">
                    Total QTY
                  </th>
                  <th className="px-4 py-3 font-semibold text-indigo-700 print:border print:border-slate-400 print:py-2 print:text-black">
                    Audit QTY
                  </th>
                  <th className="px-4 py-3 font-semibold print:border print:border-slate-400 print:py-2">
                    Auditor
                  </th>
                  <th className="w-32 px-4 py-3 font-semibold print:border print:border-slate-400 print:py-2">
                    Pass/Fail
                  </th>
                  <th className="min-w-50 px-4 py-3 font-semibold print:border print:border-slate-400 print:py-2">
                    Remarks
                  </th>
                  <th className="print-hide px-4 py-3 text-right font-semibold">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 print:divide-slate-400">
                <AnimatePresence>
                  {auditRecords.map((record) => (
                    <motion.tr
                      key={record.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="transition-colors hover:bg-slate-50"
                    >
                      <td className="px-4 py-3 print:border print:border-slate-400 print:py-1">
                        <p className="text-xs font-medium text-slate-500 print:text-black">
                          {record.date}
                        </p>
                        <p className="mt-0.5 font-bold text-slate-900 print:text-black">
                          {record.styleNo}
                        </p>
                        <div className="mt-1 inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2 py-1 text-[11px] font-semibold text-indigo-700 print:border-none print:bg-transparent print:text-black">
                          <GitBranch className="h-3 w-3" />
                          Rev {record.revisionNo}
                        </div>
                      </td>

                      <td className="px-4 py-3 print:border print:border-slate-400 print:py-1">
                        <p className="font-semibold text-slate-800 print:text-black">
                          {record.customerName}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-600 print:text-black">
                          {record.adNo}
                        </p>
                      </td>

                      <td className="px-4 py-3 print:border print:border-slate-400 print:py-1">
                        <p className="font-semibold text-slate-800 print:text-black">
                          Sch: {record.scheduleNo}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-600 print:text-black">
                          Cut: {record.cutNo}
                        </p>
                      </td>

                      <td className="px-4 py-3 font-bold text-slate-700 print:border print:border-slate-400 print:py-1 print:text-black">
                        {record.sizes}
                      </td>

                      <td className="px-4 py-3 font-medium text-slate-600 print:border print:border-slate-400 print:py-1 print:text-black">
                        {record.totalQty}
                      </td>

                      <td className="bg-indigo-50/50 px-4 py-3 text-center font-black text-indigo-600 print:border print:border-slate-400 print:bg-transparent print:py-1 print:text-black">
                        {record.auditQty}
                      </td>

                      <td className="px-4 py-3 print:border print:border-slate-400 print:py-1">
                        <input
                          type="text"
                          value={record.auditorName}
                          placeholder="Auditor..."
                          onChange={(e) =>
                            handleQuickStatusUpdate(
                              record,
                              record.status,
                              record.remarks
                            )
                          }
                          className="w-full rounded border border-slate-200 px-2 py-1.5 text-sm outline-none transition-colors focus:border-teal-500 print:border-none print:px-0 print:py-0 print:text-black"
                        />
                        <p className="mt-1 text-[10px] text-slate-500 print:hidden">
                          Use edit form to change full details
                        </p>
                      </td>

                      <td className="px-4 py-3 print:border print:border-slate-400 print:py-1">
                        <select
                          value={record.status}
                          onChange={(e) =>
                            handleQuickStatusUpdate(
                              record,
                              e.target.value as AuditStatus,
                              record.remarks
                            )
                          }
                          className={`w-full rounded border px-2 py-1.5 text-xs font-bold outline-none cursor-pointer print:border-none print:px-0 print:py-0 print:font-bold ${
                            record.status === 'Pass'
                              ? 'border-emerald-200 bg-emerald-100 text-emerald-800 print:bg-transparent print:text-black'
                              : record.status === 'Fail'
                              ? 'border-red-200 bg-red-100 text-red-800 print:bg-transparent print:text-black'
                              : 'border-amber-200 bg-amber-100 text-amber-800 print:bg-transparent print:text-black'
                          }`}
                        >
                          <option value="Pending">Pending</option>
                          <option value="Pass">Pass</option>
                          <option value="Fail">Fail</option>
                        </select>
                      </td>

                      <td className="px-4 py-3 print:border print:border-slate-400 print:py-1">
                        <input
                          type="text"
                          value={record.remarks}
                          placeholder="Add note..."
                          onChange={(e) =>
                            handleQuickStatusUpdate(
                              record,
                              record.status,
                              e.target.value
                            )
                          }
                          className="w-full rounded border border-slate-200 px-2 py-1.5 text-sm outline-none transition-colors focus:border-teal-500 print:border-none print:px-0 print:py-0 print:text-black"
                        />
                      </td>

                      <td className="print-hide px-4 py-3 text-right space-x-2">
                        <button
                          onClick={() => handleEdit(record)}
                          className="rounded p-1.5 text-blue-600 transition-colors hover:bg-blue-50"
                          title="Edit Audit Record"
                        >
                          <Plus className="h-4 w-4 rotate-45" />
                        </button>
                        <button
                          onClick={() => handleDelete(record.id)}
                          className="rounded p-1.5 text-red-500 transition-colors hover:bg-red-50"
                          title="Delete Audit Record"
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

function ReadOnlyField({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="space-y-1">
      <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </label>
      <input
        type="text"
        value={value}
        readOnly
        className="w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-slate-700 font-medium outline-none"
      />
    </div>
  );
}