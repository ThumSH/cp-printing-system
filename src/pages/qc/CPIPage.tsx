// src/pages/qc/CPIPage.tsx
import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ClipboardList,
  Save,
  Edit2,
  FileText,
  AlertCircle,
  GitBranch,
  CheckCircle2,
} from 'lucide-react';
import {
  useQCStore,
  CPIReport,
  CPIRowData,
  EligibleCpiItem,
  InspectionStatus,
} from '../../store/qcStore';

const DEFECT_ROWS = [
  'Cut panel Check List',
  'F1  Panel Shrinkage',
  'F2  Fabric colour variation',
  'F3  Crush mark',
  'F4  Shape out panel',
  'F5  Dust mark',
  'F6  Stain marks / Oil marks',
  'F7  Cut holes',
  'F8  Needle marks',
  'F9  Incorrect part',
  'F10 Numbering stickers missing',
  'F11 Numbering stickers mixed-up',
  'F12 Size mixed-up',
  'F13 Wrong Cut Mark',
  'Other',
];

export default function CPIPage() {
  const {
    cpiReports,
    eligibleCpiItems,
    fetchReports,
    fetchEligibleCpiItems,
    addCPIReport,
    updateCPIReport,
  } = useQCStore();

  const todayDate = new Date().toISOString().split('T')[0];

  const [selectedStoreInRecordId, setSelectedStoreInRecordId] = useState('');
  const [inspectionRows, setInspectionRows] = useState<Record<string, CPIRowData>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pageError, setPageError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const [summaryData, setSummaryData] = useState({
    inspectionStatus: 'Pending' as InspectionStatus,
    appRej: '',
    checkedBy: '',
    summaryDate: todayDate,
  });

  useEffect(() => {
    const loadPageData = async () => {
      try {
        await Promise.all([fetchReports(), fetchEligibleCpiItems()]);
      } catch (error) {
        setPageError(
          error instanceof Error ? error.message : 'Failed to load QC data.'
        );
      }
    };

    loadPageData();
  }, [fetchReports, fetchEligibleCpiItems]);

  const selectedEligibleItem = useMemo(() => {
    return (
      eligibleCpiItems.find(
        (item) => item.storeInRecordId === selectedStoreInRecordId
      ) || null
    );
  }, [eligibleCpiItems, selectedStoreInRecordId]);

  const receivedQty = selectedEligibleItem?.receivedQty || 0;
  const cpiQty = receivedQty;

  useEffect(() => {
    if (!selectedEligibleItem || editingId) return;

    const initialRows: Record<string, CPIRowData> = {};

    initialRows[`${selectedEligibleItem.storeInRecordId}-base`] = {
      storeInRecordId: selectedEligibleItem.storeInRecordId,
      part: '',
      sampleSize: '',
      defectedBefore: '',
      defectedAfter: '',
      remarks: '',
    };

    DEFECT_ROWS.forEach((_, index) => {
      initialRows[`${selectedEligibleItem.storeInRecordId}-${index}`] = {
        storeInRecordId: selectedEligibleItem.storeInRecordId,
        part: '',
        sampleSize: '',
        defectedBefore: '',
        defectedAfter: '',
        remarks: '',
      };
    });

    setInspectionRows(initialRows);
    setErrors({});
  }, [selectedEligibleItem, editingId]);

  let checkedQty = 0;
  let rejDamageQty = 0;

  Object.entries(inspectionRows).forEach(([key, row]) => {
    if (key.endsWith('-base')) {
      checkedQty += parseInt(row.sampleSize || '0') || 0;
    }
    rejDamageQty +=
      (parseInt(row.defectedBefore || '0') || 0) +
      (parseInt(row.defectedAfter || '0') || 0);
  });

  const rejectionPercentage =
    checkedQty > 0 ? ((rejDamageQty / checkedQty) * 100).toFixed(2) : '0.00';
  const balanceQty = Math.max(0, cpiQty - rejDamageQty);

  const handleEligibleSelection = (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const value = e.target.value;
    setSelectedStoreInRecordId(value);
    setErrors({});
    setPageError('');
  };

  const handleRowInputChange = (
    recordId: string,
    field: keyof CPIRowData,
    value: string
  ) => {
    setInspectionRows((prev) => ({
      ...prev,
      [recordId]: {
        ...(prev[recordId] || {}),
        [field]: value,
      },
    }));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!selectedStoreInRecordId) newErrors.storeInRecordId = 'Store-In record is required';
    if (!summaryData.inspectionStatus) newErrors.inspectionStatus = 'QC status is required';
    if (!summaryData.appRej) newErrors.appRej = 'Final decision required';
    if (!summaryData.checkedBy.trim()) newErrors.checkedBy = 'Signature required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const resetForm = () => {
    setSelectedStoreInRecordId('');
    setInspectionRows({});
    setSummaryData({
      inspectionStatus: 'Pending',
      appRej: '',
      checkedBy: '',
      summaryDate: todayDate,
    });
    setEditingId(null);
    setErrors({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm() || !selectedEligibleItem) {
      return;
    }

    setIsSaving(true);

    const report: CPIReport = {
      id: editingId || crypto.randomUUID(),
      storeInRecordId: selectedEligibleItem.storeInRecordId,
      submissionId: selectedEligibleItem.submissionId,
      revisionNo: selectedEligibleItem.revisionNo,
      date: todayDate,
      customer: selectedEligibleItem.customerName,
      styleNo: selectedEligibleItem.styleNo,
      scheduleNo: selectedEligibleItem.scheduleNo,
      bodyColour: selectedEligibleItem.bodyColour,
      printColour: selectedEligibleItem.printColour,
      receivedQty,
      cpiQty,
      inspectionRows,
      cuttingQty: cpiQty,
      checkedQty,
      rejDamageQty,
      rejectionPercentage,
      balanceQty,
      inspectionStatus: summaryData.inspectionStatus,
      appRej: summaryData.appRej,
      checkedBy: summaryData.checkedBy,
      summaryDate: summaryData.summaryDate,
    };

    try {
      if (editingId) {
        await updateCPIReport(editingId, report);
      } else {
        await addCPIReport(report);
      }

      resetForm();
      await fetchEligibleCpiItems();
    } catch (error) {
      setPageError(
        error instanceof Error ? error.message : 'Failed to save CPI report.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (report: CPIReport) => {
    const matchingEligible =
      eligibleCpiItems.find(
        (item) => item.storeInRecordId === report.storeInRecordId
      ) || null;

    setSelectedStoreInRecordId(report.storeInRecordId);
    setInspectionRows(report.inspectionRows);
    setSummaryData({
      inspectionStatus: report.inspectionStatus,
      appRej: report.appRej,
      checkedBy: report.checkedBy,
      summaryDate: report.summaryDate,
    });
    setEditingId(report.id);
    setErrors({});
    setPageError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (!matchingEligible) {
      setPageError(
        'This CPI report is linked to a Store-In item that is no longer in the eligible list. Edit is still allowed for the existing report.'
      );
    }
  };

  const activeDisplayData = useMemo(() => {
    if (selectedEligibleItem) return selectedEligibleItem;

    if (editingId) {
      const report = cpiReports.find((r) => r.id === editingId);
      if (!report) return null;

      return {
        storeInRecordId: report.storeInRecordId,
        submissionId: report.submissionId,
        revisionNo: report.revisionNo,
        styleNo: report.styleNo,
        customerName: report.customer,
        scheduleNo: report.scheduleNo,
        cutNo: '',
        bodyColour: report.bodyColour,
        printColour: report.printColour,
        components: '',
        season: '',
        receivedQty: report.receivedQty,
        cutInDate: '',
        size: '',
        bundleQty: 0,
        numberRange: '',
      } as EligibleCpiItem;
    }

    return null;
  }, [selectedEligibleItem, editingId, cpiReports]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-[1700px] space-y-8 pb-12"
    >
      <div className="flex items-center space-x-3 border-b border-slate-200 pb-4">
        <div className="rounded-lg bg-indigo-100 p-2">
          <ClipboardList className="h-6 w-6 text-indigo-700" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">QC Inspection (C.P.I)</h2>
          <p className="text-sm text-slate-500">
            CPI can only be created from actual Store-In records.
          </p>
        </div>
      </div>

      {pageError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {pageError}
        </div>
      )}

      <div className="overflow-hidden border border-slate-300 bg-white shadow-xl">
        <form onSubmit={handleSubmit} noValidate>
          {/* HEADER BLOCK */}
          <div className="border-b-4 border-slate-800">
            <div className="bg-slate-800 py-3 text-center text-white">
              <h3 className="text-xl font-black uppercase tracking-widest">
                {editingId ? 'Editing CPI Report' : 'Cut Panel Inspection Report'}
              </h3>
            </div>

            <div className="grid grid-cols-2 divide-y divide-slate-300 bg-slate-50 md:grid-cols-4 md:divide-x md:divide-y-0">
              <div className="p-3">
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500">
                  Date
                </label>
                <div className="text-sm font-semibold text-slate-900">{todayDate}</div>
              </div>

              <div className="p-3 md:col-span-2">
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500">
                  Eligible Store-In Record <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedStoreInRecordId}
                  onChange={handleEligibleSelection}
                  disabled={!!editingId}
                  className={`w-full border-b bg-transparent pb-1 text-sm font-semibold outline-none ${
                    errors.storeInRecordId
                      ? 'border-red-400 text-red-600'
                      : 'border-slate-300 text-slate-900 focus:border-indigo-600'
                  } ${editingId ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  <option value="" disabled>
                    Select Store-In item...
                  </option>
                  {eligibleCpiItems.map((item) => (
                    <option key={item.storeInRecordId} value={item.storeInRecordId}>
                      {item.styleNo} | {item.customerName} | Sch {item.scheduleNo} | Rev {item.revisionNo}
                    </option>
                  ))}
                </select>
                {errors.storeInRecordId && (
                  <p className="mt-1 text-[11px] text-red-600">
                    <AlertCircle className="mr-1 inline h-3 w-3" />
                    {errors.storeInRecordId}
                  </p>
                )}
              </div>

              <div className="p-3">
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500">
                  Revision
                </label>
                <div className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                  <GitBranch className="h-3 w-3" />
                  Rev {activeDisplayData?.revisionNo || '-'}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 divide-y divide-slate-300 border-t border-slate-300 bg-white md:grid-cols-4 md:divide-x md:divide-y-0">
              <div className="p-3">
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  Customer
                </label>
                <div className="text-sm font-medium text-slate-700">
                  {activeDisplayData?.customerName || '-'}
                </div>
              </div>

              <div className="p-3">
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  Style No
                </label>
                <div className="text-sm font-medium text-slate-700">
                  {activeDisplayData?.styleNo || '-'}
                </div>
              </div>

              <div className="p-3">
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  Schedule No
                </label>
                <div className="text-sm font-bold text-indigo-700">
                  {activeDisplayData?.scheduleNo || '-'}
                </div>
              </div>

              <div className="p-3">
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  Cut No
                </label>
                <div className="text-sm font-medium text-slate-700">
                  {activeDisplayData?.cutNo || '-'}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 divide-y divide-slate-300 border-t border-slate-300 bg-white md:grid-cols-4 md:divide-x md:divide-y-0">
              <div className="p-3">
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  Body Colour
                </label>
                <div className="text-sm font-medium text-slate-700">
                  {activeDisplayData?.bodyColour || '-'}
                </div>
              </div>

              <div className="p-3">
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  Print Colour
                </label>
                <div className="text-sm font-medium text-slate-700">
                  {activeDisplayData?.printColour || '-'}
                </div>
              </div>

              <div className="bg-slate-100 p-3">
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500">
                  Received Qty (IN)
                </label>
                <div className="text-sm font-bold text-slate-900">
                  {activeDisplayData ? receivedQty : '-'}
                </div>
              </div>

              <div className="bg-indigo-50 p-3">
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-indigo-500">
                  C.P.I Qty
                </label>
                <div className="text-sm font-bold text-indigo-700">
                  {activeDisplayData ? cpiQty : '-'}
                </div>
              </div>
            </div>
          </div>

          {/* TABLE */}
          <div className="w-full overflow-x-auto">
            {activeDisplayData ? (
              <table className="w-full border-collapse border-b-2 border-slate-800 text-[12px]">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-200 text-slate-800">
                    <th className="w-15 border-r border-slate-800 px-2 py-2 text-center font-bold">
                      Cut No
                    </th>
                    <th className="w-15 border-r border-slate-800 px-2 py-2 text-center font-bold">
                      Qty
                    </th>
                    <th className="w-20 border-r border-slate-800 px-2 py-2 text-center font-bold">
                      Bundle No
                    </th>
                    <th className="w-15 border-r border-slate-800 px-2 py-2 text-center font-bold">
                      Size
                    </th>
                    <th className="w-20 border-r border-slate-800 px-2 py-2 text-center font-bold">
                      Range
                    </th>
                    <th className="w-25 border-r border-slate-800 px-2 py-2 text-center font-bold">
                      Part
                    </th>
                    <th className="w-20 border-r border-slate-800 px-2 py-2 text-center font-bold">
                      Sample Size
                    </th>
                    <th className="min-w-50 border-r border-slate-800 px-2 py-2 text-left font-bold">
                      Defect Type
                    </th>
                    <th className="w-22.5 border-r border-slate-800 bg-slate-300 px-2 py-2 text-center font-bold">
                      Before Process
                    </th>
                    <th className="w-22.5 border-r border-slate-800 bg-slate-300 px-2 py-2 text-center font-bold">
                      After Process
                    </th>
                    <th className="w-15 border-r border-slate-800 px-2 py-2 text-center font-bold text-red-700">
                      Total
                    </th>
                    <th className="w-12.5 border-r border-slate-800 px-2 py-2 text-center font-bold text-red-700">
                      %
                    </th>
                    <th className="min-w-37.5 px-2 py-2 text-center font-bold">
                      Remarks
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-300">
                  {DEFECT_ROWS.map((defect, index) => {
                    const baseKey = `${activeDisplayData.storeInRecordId}-base`;
                    const rowKey = `${activeDisplayData.storeInRecordId}-${index}`;
                    const sampleSize =
                      parseInt(inspectionRows[baseKey]?.sampleSize || '0') || 0;
                    const beforeQty =
                      parseInt(inspectionRows[rowKey]?.defectedBefore || '0') || 0;
                    const afterQty =
                      parseInt(inspectionRows[rowKey]?.defectedAfter || '0') || 0;
                    const totalDefects = beforeQty + afterQty;
                    const percentage =
                      sampleSize > 0 ? Math.round((totalDefects / sampleSize) * 100) : 0;

                    const isFirst = index === 0;

                    return (
                      <tr
                        key={rowKey}
                        className={`hover:bg-indigo-50/20 ${
                          isFirst ? 'border-t-2 border-slate-800' : ''
                        }`}
                      >
                        {isFirst && (
                          <>
                            <td
                              rowSpan={DEFECT_ROWS.length}
                              className="border-r border-slate-800 bg-slate-50 px-2 py-1 text-center font-bold align-top"
                            >
                              {activeDisplayData.cutNo}
                            </td>
                            <td
                              rowSpan={DEFECT_ROWS.length}
                              className="border-r border-slate-800 px-2 py-1 text-center align-top"
                            >
                              {receivedQty}
                            </td>
                            <td
                              rowSpan={DEFECT_ROWS.length}
                              className="border-r border-slate-800 px-2 py-1 text-center font-semibold align-top"
                            >
                              {activeDisplayData.bundleQty}
                            </td>
                            <td
                              rowSpan={DEFECT_ROWS.length}
                              className="border-r border-slate-800 px-2 py-1 text-center font-bold align-top"
                            >
                              {activeDisplayData.size}
                            </td>
                            <td
                              rowSpan={DEFECT_ROWS.length}
                              className="border-r border-slate-800 px-2 py-1 text-center text-[10px] text-slate-500 align-top"
                            >
                              {activeDisplayData.numberRange}
                            </td>
                            <td className="border-r border-slate-800 p-0 align-top bg-white focus-within:bg-indigo-50">
                              <textarea
                                value={inspectionRows[baseKey]?.part || ''}
                                onChange={(e) =>
                                  handleRowInputChange(baseKey, 'part', e.target.value)
                                }
                                className="min-h-25 h-full w-full resize-none bg-transparent p-2 text-center outline-none"
                                placeholder="Enter Part..."
                              />
                            </td>
                            <td className="border-r border-slate-800 p-0 align-top bg-white focus-within:bg-indigo-50">
                              <input
                                type="number"
                                value={inspectionRows[baseKey]?.sampleSize || ''}
                                onChange={(e) =>
                                  handleRowInputChange(baseKey, 'sampleSize', e.target.value)
                                }
                                className="h-full w-full bg-transparent p-2 text-center font-bold text-indigo-700 outline-none"
                                placeholder="Qty"
                              />
                            </td>
                          </>
                        )}

                        <td className="border-r border-slate-800 bg-slate-50/50 px-2 py-1 text-left font-medium text-slate-700">
                          {defect}
                        </td>
                        <td className="border-r border-slate-800 p-0">
                          <input
                            type="number"
                            value={inspectionRows[rowKey]?.defectedBefore || ''}
                            onChange={(e) =>
                              handleRowInputChange(rowKey, 'defectedBefore', e.target.value)
                            }
                            className="w-full bg-transparent p-1.5 text-center outline-none focus:bg-indigo-50"
                          />
                        </td>
                        <td className="border-r border-slate-800 p-0">
                          <input
                            type="number"
                            value={inspectionRows[rowKey]?.defectedAfter || ''}
                            onChange={(e) =>
                              handleRowInputChange(rowKey, 'defectedAfter', e.target.value)
                            }
                            className="w-full bg-transparent p-1.5 text-center outline-none focus:bg-indigo-50"
                          />
                        </td>
                        <td className="border-r border-slate-800 bg-red-50/30 px-2 py-1 text-center font-bold text-red-600">
                          {totalDefects > 0 ? totalDefects : ''}
                        </td>
                        <td className="border-r border-slate-800 bg-red-50/30 px-2 py-1 text-center font-bold text-red-600">
                          {totalDefects > 0 ? `${percentage}%` : ''}
                        </td>
                        <td className="p-0">
                          <input
                            type="text"
                            value={inspectionRows[rowKey]?.remarks || ''}
                            onChange={(e) =>
                              handleRowInputChange(rowKey, 'remarks', e.target.value)
                            }
                            className="w-full bg-transparent p-1.5 outline-none focus:bg-indigo-50"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="bg-slate-50 p-12 text-center text-slate-400">
                <FileText className="mx-auto mb-3 h-12 w-12 opacity-20" />
                Select an eligible Store-In record to generate the CPI grid.
              </div>
            )}
          </div>

          {/* SUMMARY */}
          {activeDisplayData && (
            <div className="grid grid-cols-1 gap-12 border-x-2 border-slate-800 bg-white p-8 md:grid-cols-2">
              <div className="space-y-3">
                <div className="flex items-end">
                  <span className="w-48 text-sm font-bold text-slate-800">Cutting Qty</span>
                  <span className="flex-1 border-b border-dashed border-slate-400 bg-slate-50 pb-1 text-center font-semibold text-slate-700">
                    {cpiQty}
                  </span>
                </div>
                <div className="flex items-end">
                  <span className="w-48 text-sm font-bold text-slate-800">Received Qty</span>
                  <span className="flex-1 border-b border-dashed border-slate-400 bg-slate-50 pb-1 text-center font-semibold text-slate-700">
                    {receivedQty}
                  </span>
                </div>
                <div className="flex items-end">
                  <span className="w-48 text-sm font-bold text-slate-800">Checked Qty</span>
                  <span className="flex-1 border-b border-dashed border-slate-400 bg-indigo-50 pb-1 text-center font-bold text-indigo-700">
                    {checkedQty}
                  </span>
                </div>
                <div className="flex items-end">
                  <span className="w-48 text-sm font-bold text-slate-800">
                    Rej / Damage Qty
                  </span>
                  <span className="flex-1 border-b border-dashed border-slate-400 bg-red-50 pb-1 text-center font-bold text-red-600">
                    {rejDamageQty}
                  </span>
                </div>
                <div className="flex items-end">
                  <span className="w-48 text-sm font-bold text-slate-800">
                    Rejection %
                  </span>
                  <span className="flex-1 border-b border-dashed border-slate-400 bg-red-50 pb-1 text-center font-bold text-red-600">
                    {rejectionPercentage}%
                  </span>
                </div>
                <div className="flex items-end">
                  <span className="w-48 text-sm font-bold text-slate-800">Balance Qty</span>
                  <span className="flex-1 border-b border-dashed border-slate-400 bg-emerald-50 pb-1 text-center font-black text-emerald-600">
                    {balanceQty}
                  </span>
                </div>
              </div>

              <div className="space-y-6 pt-4 md:pt-0">
                <div className="flex items-end">
                  <span className="w-32 text-sm font-bold text-slate-800">
                    QC Status <span className="text-red-500">*</span>
                  </span>
                  <div className="flex-1 border-b border-dashed border-slate-400 pb-1">
                    <select
                      value={summaryData.inspectionStatus}
                      onChange={(e) =>
                        setSummaryData({
                          ...summaryData,
                          inspectionStatus: e.target.value as InspectionStatus,
                        })
                      }
                      className={`w-full bg-transparent text-center text-sm font-bold outline-none ${
                        errors.inspectionStatus ? 'text-red-600' : 'text-slate-900'
                      }`}
                    >
                      <option value="Pending">Pending</option>
                      <option value="Passed">Passed</option>
                      <option value="Failed">Failed</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-end">
                  <span className="w-32 text-sm font-bold text-slate-800">
                    App/Rej <span className="text-red-500">*</span>
                  </span>
                  <div className="flex-1 border-b border-dashed border-slate-400 pb-1">
                    <select
                      value={summaryData.appRej}
                      onChange={(e) =>
                        setSummaryData({ ...summaryData, appRej: e.target.value })
                      }
                      className={`w-full bg-transparent text-center text-sm font-bold outline-none ${
                        errors.appRej ? 'text-red-600' : 'text-slate-900'
                      }`}
                    >
                      <option value="" disabled>
                        Select Decision...
                      </option>
                      <option value="Approved">Approved</option>
                      <option value="Rejected">Rejected</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-end">
                  <span className="w-32 text-sm font-bold text-slate-800">
                    Checked By <span className="text-red-500">*</span>
                  </span>
                  <input
                    type="text"
                    value={summaryData.checkedBy}
                    onChange={(e) =>
                      setSummaryData({ ...summaryData, checkedBy: e.target.value })
                    }
                    className={`flex-1 border-b border-dashed border-slate-400 bg-transparent pb-1 text-center text-sm font-semibold outline-none ${
                      errors.checkedBy ? 'border-red-400 placeholder-red-300' : ''
                    }`}
                    placeholder="Inspector Name / Signature"
                  />
                </div>

                <div className="flex items-end">
                  <span className="w-32 text-sm font-bold text-slate-800">Date</span>
                  <input
                    type="date"
                    value={summaryData.summaryDate}
                    onChange={(e) =>
                      setSummaryData({ ...summaryData, summaryDate: e.target.value })
                    }
                    className="flex-1 border-b border-dashed border-slate-400 bg-transparent pb-1 text-center text-sm font-semibold text-slate-600 outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-3 border-t-2 border-slate-800 bg-slate-100 p-4">
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
              >
                Cancel Edit
              </button>
            )}
            <button
              type="submit"
              disabled={!activeDisplayData || isSaving}
              className="flex items-center rounded bg-slate-800 px-8 py-2 text-sm font-bold text-white shadow-md hover:bg-slate-900 disabled:opacity-50"
            >
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? 'SAVING...' : editingId ? 'UPDATE REPORT' : 'SUBMIT REPORT'}
            </button>
          </div>
        </form>
      </div>

      {/* HISTORY TABLE */}
      {cpiReports.length > 0 && (
        <div className="mt-12 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-slate-50 p-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">
              QC Report Archive
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-max w-full whitespace-nowrap text-left text-sm">
              <thead className="border-b border-slate-200 bg-white text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-6 py-3 font-semibold">Report Date</th>
                  <th className="px-6 py-3 font-semibold">Customer & Style</th>
                  <th className="px-6 py-3 font-semibold">Revision</th>
                  <th className="px-6 py-3 font-semibold">Schedule No</th>
                  <th className="px-6 py-3 font-semibold">QC Status</th>
                  <th className="px-6 py-3 font-semibold">Final Decision</th>
                  <th className="px-6 py-3 font-semibold">QC Summary</th>
                  <th className="px-6 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                <AnimatePresence>
                  {cpiReports.map((report) => (
                    <motion.tr
                      key={report.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="transition-colors hover:bg-slate-50"
                    >
                      <td className="px-6 py-4 font-medium text-slate-700">{report.date}</td>

                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-900">{report.styleNo}</p>
                        <p className="mt-0.5 text-xs text-slate-500">{report.customer}</p>
                      </td>

                      <td className="px-6 py-4">
                        <div className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                          <GitBranch className="h-3 w-3" />
                          Rev {report.revisionNo}
                        </div>
                      </td>

                      <td className="px-6 py-4 font-bold text-indigo-700">
                        {report.scheduleNo}
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${
                            report.inspectionStatus === 'Passed'
                              ? 'bg-emerald-100 text-emerald-800'
                              : report.inspectionStatus === 'Failed'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {report.inspectionStatus}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${
                            report.appRej === 'Approved'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {report.appRej}
                        </span>
                        <p className="mt-1.5 text-[10px] text-slate-500">
                          By: {report.checkedBy}
                        </p>
                      </td>

                      <td className="px-6 py-4">
                        <div className="space-y-0.5 text-xs text-slate-600">
                          <p>
                            Checked: <span className="font-bold">{report.checkedQty}</span>
                          </p>
                          <p>
                            Defects:{' '}
                            <span className="font-bold text-red-600">
                              {report.rejDamageQty} ({report.rejectionPercentage}%)
                            </span>
                          </p>
                          <p>
                            Balance:{' '}
                            <span className="font-bold text-emerald-600">
                              {report.balanceQty}
                            </span>
                          </p>
                        </div>
                      </td>

                      <td className="space-x-2 px-6 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleEdit(report)}
                          className="rounded p-1.5 text-blue-600 hover:bg-blue-50"
                          title="Edit Report"
                        >
                          <Edit2 className="h-4 w-4" />
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