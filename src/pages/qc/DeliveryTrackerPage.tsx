// src/pages/qc/DeliveryTrackerPage.tsx
import { useState, useEffect, useMemo, Fragment } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Save,
  Edit2,
  Trash2,
  AlertCircle,
  GitBranch,
  CheckCircle2,
} from 'lucide-react';
import {
  useDeliveryTrackerStore,
  DeliveryTrackerReport,
  DeliveryTrackerRow,
  TRACKING_SIZES,
  SizeData,
  DeliveryStatus,
} from '../../store/deliveryTrackerStore';

const INITIAL_SIZE_DATA = TRACKING_SIZES.reduce((acc, size) => {
  acc[size] = { qty: 0, pd: 0, fd: 0 };
  return acc;
}, {} as Record<string, SizeData>);

const INITIAL_FORM_STATE = {
  adviceNoteId: '',
  productionRecordId: '',
  storeInRecordId: '',
  submissionId: '',
  revisionNo: 1,
  styleNo: '',
  customerName: '',
  adNo: '',
  fpoNo: '',
  orderQty: '',
  deliveryQty: '',
  deliveryStatus: 'Pending' as DeliveryStatus,
  createdAt: new Date().toISOString().split('T')[0],
};

export default function DeliveryTrackerPage() {
  const {
    reports,
    eligibleTrackingItems,
    fetchReports,
    fetchEligibleTrackingItems,
    addReport,
    updateReport,
    deleteReport,
  } = useDeliveryTrackerStore();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);
  const [rows, setRows] = useState<DeliveryTrackerRow[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pageError, setPageError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadPageData = async () => {
      try {
        await Promise.all([fetchReports(), fetchEligibleTrackingItems()]);
      } catch (error) {
        setPageError(
          error instanceof Error ? error.message : 'Failed to load delivery tracker data.'
        );
      }
    };

    loadPageData();
  }, [fetchReports, fetchEligibleTrackingItems]);

  const selectedEligibleItem = useMemo(() => {
    return (
      eligibleTrackingItems.find(
        (item) => item.adviceNoteId === formData.adviceNoteId
      ) || null
    );
  }, [eligibleTrackingItems, formData.adviceNoteId]);

  const handleAdviceNoteSelection = (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const value = e.target.value;
    const matched = eligibleTrackingItems.find((item) => item.adviceNoteId === value);

    if (!matched) return;

    setFormData((prev) => ({
      ...prev,
      adviceNoteId: matched.adviceNoteId,
      productionRecordId: matched.productionRecordId,
      storeInRecordId: matched.storeInRecordId,
      submissionId: matched.submissionId,
      revisionNo: matched.revisionNo,
      styleNo: matched.styleNo,
      customerName: matched.customerName,
      adNo: matched.adNo,
      fpoNo: matched.scheduleNo,
      orderQty: String(matched.dispatchQty),
      deliveryQty: '',
    }));

    const newRow: DeliveryTrackerRow = {
      id: crypto.randomUUID(),
      adviceNoteId: matched.adviceNoteId,
      inDate: matched.deliveryDate,
      deliveryDate: '',
      style: matched.styleNo,
      colour: '',
      inAd: matched.adNo,
      ad: matched.adNo,
      schedule: matched.scheduleNo,
      fpoQty: matched.dispatchQty,
      allowedPd: 0,
      cutNo: matched.cutNo,
      sizeData: JSON.parse(JSON.stringify(INITIAL_SIZE_DATA)),
    };

    setRows([newRow]);
    setErrors({});
    setPageError('');
  };

  const handleFormFieldChange = (
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

    if (pageError) {
      setPageError('');
    }
  };

  const handleRowChange = (
    id: string,
    field: keyof DeliveryTrackerRow,
    value: string | number
  ) => {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  };

  const handleSizeChange = (
    rowId: string,
    size: string,
    field: keyof SizeData,
    value: number
  ) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== rowId) return r;

        const nextSizeData = {
          ...r.sizeData,
          [size]: {
            ...r.sizeData[size],
            [field]: value,
          },
        };

        return {
          ...r,
          sizeData: nextSizeData,
        };
      })
    );
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.adviceNoteId) newErrors.adviceNoteId = 'Advice Note is required';
    if (!formData.createdAt) newErrors.createdAt = 'Tracking date is required';
    if (!formData.deliveryQty || parseInt(formData.deliveryQty) <= 0) {
      newErrors.deliveryQty = 'Delivery qty must be greater than 0';
    }

    if (
      selectedEligibleItem &&
      parseInt(formData.deliveryQty || '0') > selectedEligibleItem.remainingTrackableQty
    ) {
      newErrors.deliveryQty = `Exceeds remaining trackable qty (${selectedEligibleItem.remainingTrackableQty})`;
    }

    if (rows.length === 0) {
      newErrors.rows = 'At least one tracker row is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      ...INITIAL_FORM_STATE,
      createdAt: new Date().toISOString().split('T')[0],
    });
    setRows([]);
    setErrors({});
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSaving(true);

    try {
      if (editingId) {
        const updatedReport: DeliveryTrackerReport = {
          id: editingId,
          adviceNoteId: formData.adviceNoteId,
          productionRecordId: formData.productionRecordId,
          storeInRecordId: formData.storeInRecordId,
          submissionId: formData.submissionId,
          revisionNo: formData.revisionNo,
          styleNo: formData.styleNo,
          customerName: formData.customerName,
          adNo: formData.adNo,
          fpoNo: formData.fpoNo,
          orderQty: Number(formData.orderQty),
          deliveryQty: Number(formData.deliveryQty),
          balanceQty: selectedEligibleItem
            ? Math.max(
                0,
                selectedEligibleItem.remainingTrackableQty - Number(formData.deliveryQty)
              )
            : 0,
          deliveryStatus: formData.deliveryStatus,
          rows,
          createdAt: formData.createdAt,
        };

        await updateReport(editingId, updatedReport);
      } else {
        await addReport({
          adviceNoteId: formData.adviceNoteId,
          fpoNo: formData.fpoNo,
          deliveryQty: Number(formData.deliveryQty),
          deliveryStatus: formData.deliveryStatus,
          rows,
          createdAt: formData.createdAt,
        });
      }

      resetForm();
      await fetchEligibleTrackingItems();
      await fetchReports();
    } catch (error) {
      setPageError(
        error instanceof Error ? error.message : 'Failed to save tracker report.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (report: DeliveryTrackerReport) => {
    setEditingId(report.id);
    setFormData({
      adviceNoteId: report.adviceNoteId,
      productionRecordId: report.productionRecordId,
      storeInRecordId: report.storeInRecordId,
      submissionId: report.submissionId,
      revisionNo: report.revisionNo,
      styleNo: report.styleNo,
      customerName: report.customerName,
      adNo: report.adNo,
      fpoNo: report.fpoNo,
      orderQty: String(report.orderQty),
      deliveryQty: String(report.deliveryQty),
      deliveryStatus: report.deliveryStatus,
      createdAt: report.createdAt,
    });
    setRows(report.rows);
    setErrors({});
    setPageError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this tracker report?')) {
      return;
    }

    try {
      await deleteReport(id);
      await fetchEligibleTrackingItems();
      await fetchReports();
    } catch (error) {
      setPageError(
        error instanceof Error ? error.message : 'Failed to delete tracker report.'
      );
    }
  };

  const totalFpoQty = rows.reduce((sum, r) => sum + (r.fpoQty || 0), 0);
  const totalAllowedPd = rows.reduce((sum, r) => sum + (r.allowedPd || 0), 0);

  const sizeGrandTotals = TRACKING_SIZES.reduce((acc, size) => {
    acc[size] = { qty: 0, pd: 0, fd: 0 };
    rows.forEach((r) => {
      acc[size].qty += r.sizeData[size]?.qty || 0;
      acc[size].pd += r.sizeData[size]?.pd || 0;
      acc[size].fd += r.sizeData[size]?.fd || 0;
    });
    return acc;
  }, {} as Record<string, SizeData>);

  const grandSizeTotal = TRACKING_SIZES.reduce(
    (sum, size) => sum + sizeGrandTotals[size].qty,
    0
  );
  const grandPdTotal = TRACKING_SIZES.reduce(
    (sum, size) => sum + sizeGrandTotals[size].pd,
    0
  );
  const grandFdTotal = TRACKING_SIZES.reduce(
    (sum, size) => sum + sizeGrandTotals[size].fd,
    0
  );
  const grandExceed = grandPdTotal - totalAllowedPd;

  const receivedQty = totalFpoQty;
  const deliveredQty = grandSizeTotal;
  const balanceToRec = (Number(formData.orderQty) || 0) - receivedQty;
  const pdPercentage =
    deliveredQty > 0 ? ((grandPdTotal / deliveredQty) * 100).toFixed(2) : '0.00';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-[1600px] space-y-8 pb-12"
    >
      <div className="flex items-center space-x-3 border-b border-slate-200 pb-4">
        <div className="rounded-lg bg-indigo-100 p-2">
          <LayoutDashboard className="h-6 w-6 text-indigo-700" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">
            QC Delivery & Defect Tracker
          </h2>
          <p className="text-sm text-slate-500">
            Delivery tracking can only start from dispatched Advice Notes.
          </p>
        </div>
      </div>

      {pageError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {pageError}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-800">
              {editingId ? 'Editing Tracker Report' : 'New Tracking Report'}
            </h3>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="space-y-1 md:col-span-2">
              <label className="block text-xs font-bold uppercase text-slate-500">
                Eligible Advice Note
              </label>
              <select
                value={formData.adviceNoteId}
                onChange={handleAdviceNoteSelection}
                disabled={!!editingId}
                className={`w-full rounded-lg border px-3 py-2 font-bold outline-none bg-white ${
                  errors.adviceNoteId
                    ? 'border-red-400 bg-red-50'
                    : 'border-slate-300 focus:border-indigo-500'
                } ${editingId ? 'cursor-not-allowed bg-slate-100 opacity-70' : ''}`}
              >
                <option value="" disabled>
                  Select Advice Note...
                </option>
                {eligibleTrackingItems.map((item) => (
                  <option key={item.adviceNoteId} value={item.adviceNoteId}>
                    {item.adNo} | {item.styleNo} | {item.customerName} | Rev {item.revisionNo}
                  </option>
                ))}
              </select>
              {errors.adviceNoteId && (
                <p className="text-[11px] text-red-600">
                  <AlertCircle className="mr-1 inline h-3 w-3" />
                  {errors.adviceNoteId}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold uppercase text-slate-500">
                Tracking Date
              </label>
              <input
                type="date"
                name="createdAt"
                value={formData.createdAt}
                onChange={handleFormFieldChange}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 font-semibold outline-none focus:border-indigo-500"
              />
            </div>

            <ReadOnlyField label="Style #" value={formData.styleNo} />
            <ReadOnlyField label="Customer" value={formData.customerName} />
            <ReadOnlyField label="Advice Note" value={formData.adNo} />

            <ReadOnlyField label="Schedule / FPO" value={formData.fpoNo} />
            <ReadOnlyField label="Order Qty" value={formData.orderQty} />
            <div className="space-y-1">
              <label className="block text-xs font-bold uppercase text-slate-500">
                Revision
              </label>
              <div className="inline-flex w-full items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 font-bold text-indigo-700">
                <GitBranch className="h-4 w-4" />
                Rev {formData.revisionNo}
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold uppercase text-slate-500">
                Delivery Qty
              </label>
              <input
                type="number"
                name="deliveryQty"
                value={formData.deliveryQty}
                onChange={handleFormFieldChange}
                className={`w-full rounded-lg border px-3 py-2 font-bold text-indigo-700 outline-none ${
                  errors.deliveryQty
                    ? 'border-red-400 bg-red-50'
                    : 'border-slate-300 focus:border-indigo-500'
                }`}
                placeholder="0"
              />
              {errors.deliveryQty && (
                <p className="text-[11px] text-red-600">{errors.deliveryQty}</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold uppercase text-slate-500">
                Delivery Status
              </label>
              <select
                name="deliveryStatus"
                value={formData.deliveryStatus}
                onChange={handleFormFieldChange}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 font-semibold outline-none focus:border-indigo-500 bg-white"
              >
                <option value="Pending">Pending</option>
                <option value="In Transit">In Transit</option>
                <option value="Delivered">Delivered</option>
                <option value="Returned">Returned</option>
                <option value="Delayed">Delayed</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold uppercase text-slate-500">
                Remaining Trackable
              </label>
              <div className="inline-flex w-full items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 font-bold text-emerald-700">
                <CheckCircle2 className="h-4 w-4" />
                {selectedEligibleItem?.remainingTrackableQty ?? '-'}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-xl border-b-4 border-indigo-500 bg-slate-800 p-6 text-white shadow-lg">
          <h3 className="mb-4 border-b border-slate-700 pb-2 text-sm font-black uppercase tracking-widest text-slate-400">
            Delivery Summary
          </h3>

          <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <div className="text-slate-400">Style #:</div>
            <div className="text-right font-bold">{formData.styleNo || '-'}</div>

            <div className="text-slate-400">Advice #:</div>
            <div className="text-right font-bold">{formData.adNo || '-'}</div>

            <div className="text-slate-400">Order Qty:</div>
            <div className="text-right font-bold text-indigo-300">
              {formData.orderQty || 0}
            </div>

            <div className="col-span-2 my-1 border-b border-slate-700"></div>

            <div className="text-slate-400">Received Qty:</div>
            <div className="text-right font-bold">{receivedQty}</div>

            <div className="text-slate-400">Delivered Qty:</div>
            <div className="text-right font-bold">{deliveredQty}</div>

            <div className="text-slate-400">Balance to Rec:</div>
            <div
              className={`text-right font-bold ${
                balanceToRec > 0 ? 'text-amber-400' : 'text-emerald-400'
              }`}
            >
              {balanceToRec}
            </div>

            <div className="col-span-2 my-1 border-b border-slate-700"></div>

            <div className="font-bold text-slate-400">PD TOTAL:</div>
            <div className="text-right text-lg font-black text-red-400">
              {grandPdTotal}
            </div>

            <div className="font-bold text-slate-400">PD %:</div>
            <div className="text-right text-lg font-black text-red-400">
              {pdPercentage}%
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm">
        <div className="border-b border-slate-300 bg-slate-50 p-4">
          <h3 className="font-bold text-slate-800">Batch Control Grid</h3>
          {errors.rows && (
            <p className="mt-2 text-[11px] text-red-600">{errors.rows}</p>
          )}
        </div>

        <div className="w-full overflow-x-auto pb-4">
          <table className="min-w-max w-full border-collapse whitespace-nowrap text-[11px]">
            <thead>
              <tr className="divide-x divide-slate-300 border-b border-slate-400 bg-slate-200 text-slate-800">
                <th colSpan={10} className="bg-slate-300 px-2 py-2 text-center font-black">
                  BATCH IDENTIFICATION & PLANNING
                </th>
                {TRACKING_SIZES.map((size) => (
                  <th
                    key={size}
                    colSpan={3}
                    className="border-l-2 border-slate-400 px-2 py-2 text-center font-black"
                  >
                    {size}
                  </th>
                ))}
                <th
                  colSpan={4}
                  className="border-l-2 border-slate-400 bg-slate-300 px-2 py-2 text-center font-black"
                >
                  ROW TOTALS
                </th>
              </tr>

              <tr className="divide-x divide-slate-300 border-b-2 border-slate-400 bg-slate-100 text-slate-600">
                <th className="px-2 py-1.5 font-bold">In Date</th>
                <th className="px-2 py-1.5 font-bold">Del Date</th>
                <th className="px-2 py-1.5 font-bold">Style</th>
                <th className="px-2 py-1.5 font-bold">Colour</th>
                <th className="px-2 py-1.5 font-bold">IN AD</th>
                <th className="px-2 py-1.5 font-bold">AD</th>
                <th className="px-2 py-1.5 font-bold">Schedule</th>
                <th className="px-2 py-1.5 font-bold text-indigo-700">FPO QTY</th>
                <th className="px-2 py-1.5 font-bold text-indigo-700">Allow PD</th>
                <th className="px-2 py-1.5 font-bold text-indigo-700">Cut No</th>

                {TRACKING_SIZES.map((size) => (
                  <Fragment key={size}>
                    <th className="w-16 border-l-2 border-slate-400 px-2 py-1.5 font-bold">
                      QTY
                    </th>
                    <th className="w-12 bg-pink-50 px-2 py-1.5 font-bold text-pink-700">
                      PD
                    </th>
                    <th className="w-12 bg-blue-50 px-2 py-1.5 font-bold text-blue-700">
                      FD
                    </th>
                  </Fragment>
                ))}

                <th className="border-l-2 border-slate-400 px-2 py-1.5 font-black">
                  SIZE TOT
                </th>
                <th className="px-2 py-1.5 font-black text-red-600">PD TOT</th>
                <th className="px-2 py-1.5 font-black text-red-600">FD TOT</th>
                <th className="px-2 py-1.5 font-black">EXCEED</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-300">
              {rows.length > 0 ? (
                rows.map((row) => {
                  let rowSizeTot = 0;
                  let rowPdTot = 0;
                  let rowFdTot = 0;

                  TRACKING_SIZES.forEach((s) => {
                    rowSizeTot += row.sizeData[s].qty;
                    rowPdTot += row.sizeData[s].pd;
                    rowFdTot += row.sizeData[s].fd;
                  });

                  const rowExceed = rowPdTot - row.allowedPd;

                  return (
                    <tr
                      key={row.id}
                      className="divide-x divide-slate-300 transition-colors hover:bg-indigo-50/20"
                    >
                      <td className="p-0">
                        <input
                          type="date"
                          value={row.inDate}
                          onChange={(e) => handleRowChange(row.id, 'inDate', e.target.value)}
                          className="w-24 bg-transparent p-1.5 outline-none"
                        />
                      </td>
                      <td className="p-0">
                        <input
                          type="date"
                          value={row.deliveryDate}
                          onChange={(e) =>
                            handleRowChange(row.id, 'deliveryDate', e.target.value)
                          }
                          className="w-24 bg-transparent p-1.5 outline-none focus:bg-white"
                        />
                      </td>
                      <td className="p-0">
                        <input
                          type="text"
                          value={row.style}
                          onChange={(e) => handleRowChange(row.id, 'style', e.target.value)}
                          className="w-20 bg-transparent p-1.5 font-bold outline-none"
                        />
                      </td>
                      <td className="p-0">
                        <input
                          type="text"
                          value={row.colour}
                          onChange={(e) => handleRowChange(row.id, 'colour', e.target.value)}
                          className="w-20 bg-transparent p-1.5 text-slate-600 outline-none"
                        />
                      </td>
                      <td className="p-0">
                        <input
                          type="text"
                          value={row.inAd}
                          onChange={(e) => handleRowChange(row.id, 'inAd', e.target.value)}
                          className="w-24 bg-transparent p-1.5 outline-none focus:bg-white"
                        />
                      </td>
                      <td className="p-0">
                        <input
                          type="text"
                          value={row.ad}
                          onChange={(e) => handleRowChange(row.id, 'ad', e.target.value)}
                          className="w-24 bg-transparent p-1.5 outline-none focus:bg-white"
                        />
                      </td>
                      <td className="p-0">
                        <input
                          type="text"
                          value={row.schedule}
                          onChange={(e) =>
                            handleRowChange(row.id, 'schedule', e.target.value)
                          }
                          className="w-24 bg-transparent p-1.5 outline-none"
                        />
                      </td>
                      <td className="bg-indigo-50/30 p-0">
                        <input
                          type="number"
                          value={row.fpoQty || ''}
                          onChange={(e) =>
                            handleRowChange(
                              row.id,
                              'fpoQty',
                              parseInt(e.target.value) || 0
                            )
                          }
                          className="w-16 bg-transparent p-1.5 text-center font-bold text-indigo-700 outline-none"
                          placeholder="0"
                        />
                      </td>
                      <td className="bg-amber-50/50 p-0">
                        <input
                          type="number"
                          value={row.allowedPd || ''}
                          onChange={(e) =>
                            handleRowChange(
                              row.id,
                              'allowedPd',
                              parseInt(e.target.value) || 0
                            )
                          }
                          className="w-16 bg-transparent p-1.5 text-center font-bold text-amber-700 outline-none focus:bg-white"
                          placeholder="0"
                        />
                      </td>
                      <td className="bg-indigo-50/30 p-0">
                        <input
                          type="text"
                          value={row.cutNo}
                          onChange={(e) => handleRowChange(row.id, 'cutNo', e.target.value)}
                          className="w-16 bg-transparent p-1.5 text-center font-bold text-indigo-700 outline-none"
                        />
                      </td>

                      {TRACKING_SIZES.map((size) => (
                        <Fragment key={size}>
                          <td className="border-l-2 border-slate-400 p-0">
                            <input
                              type="number"
                              value={row.sizeData[size].qty || ''}
                              onChange={(e) =>
                                handleSizeChange(
                                  row.id,
                                  size,
                                  'qty',
                                  parseInt(e.target.value) || 0
                                )
                              }
                              className="w-16 bg-transparent p-1.5 text-center font-semibold outline-none focus:bg-slate-100"
                              placeholder="0"
                            />
                          </td>
                          <td className="bg-pink-50/50 p-0">
                            <input
                              type="number"
                              value={row.sizeData[size].pd || ''}
                              onChange={(e) =>
                                handleSizeChange(
                                  row.id,
                                  size,
                                  'pd',
                                  parseInt(e.target.value) || 0
                                )
                              }
                              className="w-12 bg-transparent p-1.5 text-center font-bold text-pink-700 outline-none focus:bg-pink-100"
                              placeholder="0"
                            />
                          </td>
                          <td className="bg-blue-50/50 p-0">
                            <input
                              type="number"
                              value={row.sizeData[size].fd || ''}
                              onChange={(e) =>
                                handleSizeChange(
                                  row.id,
                                  size,
                                  'fd',
                                  parseInt(e.target.value) || 0
                                )
                              }
                              className="w-12 bg-transparent p-1.5 text-center font-bold text-blue-700 outline-none focus:bg-blue-100"
                              placeholder="0"
                            />
                          </td>
                        </Fragment>
                      ))}

                      <td className="border-l-2 border-slate-400 bg-slate-100 px-2 py-1.5 text-center font-black">
                        {rowSizeTot}
                      </td>
                      <td className="bg-red-50/50 px-2 py-1.5 text-center font-bold text-red-600">
                        {rowPdTot}
                      </td>
                      <td className="bg-red-50/50 px-2 py-1.5 text-center font-bold text-red-600">
                        {rowFdTot}
                      </td>
                      <td
                        className={`px-2 py-1.5 text-center font-black ${
                          rowExceed > 0 ? 'text-red-600' : 'text-emerald-600'
                        }`}
                      >
                        {rowExceed}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={35} className="p-8 text-center text-slate-400">
                    Select an Advice Note to load delivery tracking data.
                  </td>
                </tr>
              )}
            </tbody>

            {rows.length > 0 && (
              <tfoot className="divide-x divide-slate-600 bg-slate-800 font-black text-white">
                <tr>
                  <td colSpan={7} className="px-4 py-2 text-right uppercase tracking-widest text-slate-300">
                    Grand Totals:
                  </td>
                  <td className="px-2 py-2 text-center text-indigo-300">{totalFpoQty}</td>
                  <td className="px-2 py-2 text-center text-indigo-300">{totalAllowedPd}</td>
                  <td className="px-2 py-2"></td>

                  {TRACKING_SIZES.map((size) => (
                    <Fragment key={`tot-${size}`}>
                      <td className="border-l-2 border-slate-500 px-2 py-2 text-center">
                        {sizeGrandTotals[size].qty}
                      </td>
                      <td className="bg-pink-900/30 px-2 py-2 text-center text-pink-300">
                        {sizeGrandTotals[size].pd}
                      </td>
                      <td className="bg-blue-900/30 px-2 py-2 text-center text-blue-300">
                        {sizeGrandTotals[size].fd}
                      </td>
                    </Fragment>
                  ))}

                  <td className="border-l-2 border-slate-500 px-2 py-2 text-center">
                    {grandSizeTotal}
                  </td>
                  <td className="px-2 py-2 text-center text-red-400">{grandPdTotal}</td>
                  <td className="px-2 py-2 text-center text-red-400">{grandFdTotal}</td>
                  <td
                    className={`px-2 py-2 text-center ${
                      grandExceed > 0 ? 'text-red-400' : 'text-emerald-400'
                    }`}
                  >
                    {grandExceed}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        <div className="flex justify-end space-x-3 border-t border-slate-300 bg-slate-100 p-4">
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-lg border border-slate-300 bg-white px-6 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel Edit
            </button>
          )}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSaving}
            className="flex items-center rounded bg-indigo-600 px-8 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            <Save className="mr-2 h-4 w-4" />
            {isSaving
              ? 'SAVING TRACKER'
              : editingId
              ? 'UPDATE TRACKER'
              : 'SAVE TRACKER REPORT'}
          </button>
        </div>
      </div>

      {reports.length > 0 && (
        <div className="mt-12 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-slate-50 p-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">
              Tracker Archive
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full whitespace-nowrap text-left text-sm">
              <thead className="border-b border-slate-200 bg-white text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-6 py-3 font-semibold">Date / Style</th>
                  <th className="px-6 py-3 font-semibold">Advice / Customer</th>
                  <th className="px-6 py-3 font-semibold">Revision / Status</th>
                  <th className="px-6 py-3 font-semibold">Tracked Qty</th>
                  <th className="px-6 py-3 font-semibold">Rows Logged</th>
                  <th className="px-6 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                <AnimatePresence>
                  {reports.map((report) => (
                    <motion.tr
                      key={report.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="hover:bg-slate-50"
                    >
                      <td className="px-6 py-4">
                        <p className="text-xs font-medium text-slate-500">{report.createdAt}</p>
                        <p className="text-lg font-bold text-slate-900">{report.styleNo}</p>
                      </td>

                      <td className="px-6 py-4">
                        <p className="font-bold text-indigo-700">{report.adNo}</p>
                        <p className="mt-0.5 text-xs text-slate-600">{report.customerName}</p>
                      </td>

                      <td className="px-6 py-4">
                        <div className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                          <GitBranch className="h-3 w-3" />
                          Rev {report.revisionNo}
                        </div>
                        <p className="mt-2 text-xs font-bold text-slate-700">
                          {report.deliveryStatus}
                        </p>
                      </td>

                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-800">{report.deliveryQty}</p>
                        <p className="mt-0.5 text-xs text-emerald-600">
                          Balance: {report.balanceQty}
                        </p>
                      </td>

                      <td className="px-6 py-4">
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                          {report.rows.length} Rows Logged
                        </span>
                      </td>

                      <td className="space-x-2 px-6 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleEdit(report)}
                          className="rounded p-2 text-blue-600 hover:bg-blue-50"
                          title="Edit Report"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(report.id)}
                          className="rounded p-2 text-red-600 hover:bg-red-50"
                          title="Delete Report"
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
      <label className="block text-xs font-bold uppercase text-slate-500">{label}</label>
      <input
        type="text"
        value={value}
        readOnly
        className="w-full cursor-not-allowed rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 font-semibold text-slate-700 outline-none"
      />
    </div>
  );
}