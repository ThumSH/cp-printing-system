import { useState, useEffect, useMemo } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { usePaginatedSearch } from '../../hooks/usePaginatedSearch';
import { PaginationControls } from '../../components/PaginatedTable';
import {
  Factory, Save, Trash2, AlertCircle, CheckCircle2, X, Clock,
  TrendingDown, Package, Printer, RefreshCw,
} from 'lucide-react';
import { API, getAuthHeaders } from '../../api/client';
import { useDashboardStore } from '../../store/dashboardStore';

const API_BASE = API.WORKER;
const getHeaders = getAuthHeaders;

// ==========================================
// TIME SLOTS
// ==========================================
const DEFAULT_TIME_SLOTS = [
  { timeFrom: '08:30', timeTo: '09:30' },
  { timeFrom: '09:30', timeTo: '10:30' },
  { timeFrom: '10:30', timeTo: '11:00' },
  { timeFrom: '11:00', timeTo: '12:00' },
  { timeFrom: '12:00', timeTo: '13:00' },
  { timeFrom: '13:00', timeTo: '13:30' },
  { timeFrom: '13:30', timeTo: '14:30' },
  { timeFrom: '14:30', timeTo: '15:30' },
  { timeFrom: '15:30', timeTo: '16:30' },
  { timeFrom: '16:30', timeTo: '17:30' },
  { timeFrom: '17:30', timeTo: '18:30' },
];

// ==========================================
// TYPES
// ==========================================
interface LockedFields {
  seating: boolean;
  printing: boolean;
  curing: boolean;
  checking: boolean;
  packing: boolean;
  dispatch: boolean;
}

interface TimeSlot {
  timeFrom: string;
  timeTo: string;
  seating: number;
  printing: number;
  curing: number;
  checking: number;
  packing: number;
  dispatch: number;
  lockedFields: LockedFields;
}

interface EligibleStyle {
  id: string;
  productionRecordId: string;
  storeInRecordId: string;
  submissionId: string;
  styleNo: string;
  customerName: string;
  cutNo: string;
  lineNo: string;
  component: string;
  bodyColour: string;
  originalQty: number; // true production issue qty from DB
  orderQty: number;    // backward-compatible: max remaining qty across stages
  dispatchedQty: number;
  scheduleNo: string;

  seatingAllocated?: number;
  printingAllocated?: number;
  curingAllocated?: number;
  checkingAllocated?: number;
  packingAllocated?: number;
  dispatchAllocated?: number;

  seatingRemaining?: number;
  printingRemaining?: number;
  curingRemaining?: number;
  checkingRemaining?: number;
  packingRemaining?: number;
  dispatchRemaining?: number;
}

interface DailyOutputRecord {
  id: string;
  productionRecordId: string;
  storeInRecordId: string;
  date: string;
  styleNo: string;
  customerName: string;
  cutNo: string;
  component: string;
  orderQty: number;
  tableNo: string;
  timeSlots: TimeSlot[];
  totalSeating: number;
  totalPrinting: number;
  totalCuring: number;
  totalChecking: number;
  totalPacking: number;
  totalDispatch: number;
  workerName: string;
}

interface WorkerResumePayload {
  record: DailyOutputRecord;
  eligibleStyle: EligibleStyle;
  canContinue: boolean;
  message?: string;
}

interface WorkerCutReportBundle {
  id: string;
  bundleNo: string;
  bundleQty: number;
  size: string;
  numberRange: string;
  bundleOrder?: number;
}

interface WorkerCutReportCut {
  id: string;
  cutNo: string;
  cutQty: number;
  bundles: WorkerCutReportBundle[];
}

interface WorkerCutReport {
  id: string;
  storeInRecordId: string;
  submissionId: string;
  revisionNo: number;
  styleNo: string;
  customerName: string;
  bodyColour: string;
  printColour: string;
  component: string;
  season: string;
  inAdNo: string;
  scheduleNo: string;
  jobNo: string;
  cutInDate: string;
  inQty: number;
  totalCutQty: number;
  cut: WorkerCutReportCut;
}

type CutReportCheckField =
  | 'productionIn'
  | 'productionOut'
  | 'handedOverToQc'
  | 'checkingStatus'
  | 'curingStatus';

type CutReportTickState = Record<string, Partial<Record<CutReportCheckField, boolean>>>;

const CUT_REPORT_CHECK_COLUMNS: { key: CutReportCheckField; label: string; printLabel: string }[] = [
  { key: 'productionIn', label: 'Production IN', printLabel: 'Production<br/>IN' },
  { key: 'productionOut', label: 'Production Out', printLabel: 'Production<br/>OUT' },
  { key: 'handedOverToQc', label: 'Handed over to QC department', printLabel: 'Handed Over<br/>to QC Dept.' },
  { key: 'checkingStatus', label: 'Checking status', printLabel: 'Checking<br/>Status' },
  { key: 'curingStatus', label: 'Curing status', printLabel: 'Curing<br/>Status' },
];

// ==========================================
// HELPERS
// ==========================================
function getColomboDateString(): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Colombo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());

  const year = parts.find((p) => p.type === 'year')?.value ?? '';
  const month = parts.find((p) => p.type === 'month')?.value ?? '';
  const day = parts.find((p) => p.type === 'day')?.value ?? '';

  return `${year}-${month}-${day}`;
}

function createEmptyTimeSlots(): TimeSlot[] {
  return DEFAULT_TIME_SLOTS.map((t) => ({
    ...t,
    seating: 0, printing: 0, curing: 0, checking: 0, packing: 0, dispatch: 0,
    lockedFields: { seating: false, printing: false, curing: false, checking: false, packing: false, dispatch: false },
  }));
}

const SECTIONS: { key: keyof LockedFields; label: string; color: string; bgColor: string }[] = [
  { key: 'seating', label: 'Seating', color: 'text-blue-700', bgColor: 'bg-blue-50' },
  { key: 'printing', label: 'Printing', color: 'text-purple-700', bgColor: 'bg-purple-50' },
  { key: 'curing', label: 'Curing', color: 'text-orange-700', bgColor: 'bg-orange-50' },
  { key: 'checking', label: 'Checking', color: 'text-teal-700', bgColor: 'bg-teal-50' },
  { key: 'packing', label: 'Packing', color: 'text-indigo-700', bgColor: 'bg-indigo-50' },
  { key: 'dispatch', label: 'Dispatch', color: 'text-emerald-700', bgColor: 'bg-emerald-50' },
];

const STAGE_BAR_CLASSES: Record<keyof LockedFields, string> = {
  seating: 'bg-blue-600',
  printing: 'bg-purple-600',
  curing: 'bg-orange-500',
  checking: 'bg-teal-600',
  packing: 'bg-indigo-600',
  dispatch: 'bg-emerald-600',
};

type StageKey = keyof LockedFields;
type StageTotals = Record<StageKey, number>;

const emptyStageTotals = (): StageTotals => ({
  seating: 0,
  printing: 0,
  curing: 0,
  checking: 0,
  packing: 0,
  dispatch: 0,
});

const maxStageValue = (totals: StageTotals) =>
  Math.max(...SECTIONS.map(sec => totals[sec.key]));

const minStageValue = (totals: StageTotals) =>
  Math.min(...SECTIONS.map(sec => totals[sec.key]));


const WORKER_CUT_REPORT_TITLE = 'STORE-IN CUT REPORT';
const WORKER_CUT_REPORT_LOGO_SRC = '/cp-logo.png';
const WORKER_CUT_REPORT_COMPANY = 'COLOUR PLUS PRINTING SYSTEMS (PVT) LTD';

function escapeCutReportHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatCutReportQty(value: unknown) {
  const parsed = typeof value === 'number' ? value : Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed.toLocaleString() : '';
}

function makeCutReportBundleKey(bundle: WorkerCutReportBundle, index: number) {
  return `${bundle.id || bundle.bundleNo || 'bundle'}_${index}`;
}

function printWorkerCutReport(report: WorkerCutReport, tickState: CutReportTickState) {
  const cut = report.cut;
  const bundles = Array.isArray(cut?.bundles) ? cut.bundles : [];
  const colourText = [report.bodyColour, report.printColour]
    .map(v => String(v || '').trim())
    .filter(Boolean)
    .join(' / ');

  const checkHeaders = CUT_REPORT_CHECK_COLUMNS
    .map(column => `<th class="check-head">${column.printLabel}</th>`)
    .join('');

  const bundleRowsHtml = bundles.map((bundle, index) => {
    const bundleKey = makeCutReportBundleKey(bundle, index);
    const checkCells = CUT_REPORT_CHECK_COLUMNS.map((column) => {
      const checked = tickState[bundleKey]?.[column.key] === true;
      return `<td class="check-cell"><span class="box">${checked ? '✓' : ''}</span></td>`;
    }).join('');

    return `
      <tr>
        <td>${escapeCutReportHtml(bundle.bundleNo)}</td>
        <td class="num">${formatCutReportQty(bundle.bundleQty)}</td>
        <td>${escapeCutReportHtml(bundle.size)}</td>
        <td>${escapeCutReportHtml(bundle.numberRange || '-')}</td>
        ${checkCells}
      </tr>
    `;
  }).join('') || `
      <tr>
        <td colspan="9" class="center muted">No bundle details found for the selected cut.</td>
      </tr>
    `;

  const html = `<!DOCTYPE html>
<html>
<head>
  <title>${escapeCutReportHtml(WORKER_CUT_REPORT_TITLE)} - ${escapeCutReportHtml(report.styleNo)}</title>
  <style>
    @page { size: A4 portrait; margin: 10mm; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: Arial, Helvetica, sans-serif; color: #111827; font-size: 10px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .header { display: flex; align-items: center; gap: 14px; border-bottom: 2px solid #111827; padding-bottom: 8px; margin-bottom: 10px; }
    .logo { width: 64px; height: 50px; border: 1px solid #d1d5db; display: flex; align-items: center; justify-content: center; font-size: 9px; font-weight: 800; text-align: center; color: #64748b; }
    .logo img { max-width: 100%; max-height: 100%; object-fit: contain; }
    .title { flex: 1; }
    .company { font-size: 15px; font-weight: 900; letter-spacing: .03em; text-transform: uppercase; }
    .report-title { font-size: 13px; font-weight: 900; letter-spacing: .08em; text-transform: uppercase; margin-top: 2px; color: #334155; }
    .generated { font-size: 10px; color: #64748b; text-align: right; }
    .meta { display: grid; grid-template-columns: 80px 1fr 75px 1fr; gap: 6px 10px; border: 1px solid #cbd5e1; padding: 8px; margin-bottom: 10px; }
    .label { font-weight: 800; text-transform: uppercase; color: #475569; }
    .value { border-bottom: 1px solid #94a3b8; min-height: 14px; font-weight: 700; padding: 0 2px 2px; }
    .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin-bottom: 10px; }
    .summary-card { border: 1px solid #cbd5e1; padding: 6px; }
    .summary-card .small { color: #64748b; text-transform: uppercase; font-size: 9px; font-weight: 800; }
    .summary-card .big { font-size: 15px; font-weight: 900; margin-top: 2px; }
    .cut-title { display: flex; justify-content: space-between; align-items: end; margin: 10px 0 4px; }
    .cut-title h3 { margin: 0; font-size: 13px; font-weight: 900; color: #1e293b; }
    .cut-index { display: block; font-size: 9px; text-transform: uppercase; color: #64748b; font-weight: 800; letter-spacing: .08em; }
    .cut-qty { font-size: 11px; color: #334155; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    th, td { border: 1px solid #334155; padding: 4px 5px; text-align: left; vertical-align: middle; height: 24px; }
    th { background: #f1f5f9; color: #334155; font-size: 8px; text-transform: uppercase; font-weight: 900; }
    .num { text-align: right; font-weight: 800; }
    .check-head { text-align: center; line-height: 1.15; }
    .check-cell { text-align: center; width: 72px; }
    .box { display: inline-flex; width: 13px; height: 13px; border: 1.5px solid #111827; align-items: center; justify-content: center; font-size: 11px; line-height: 1; font-weight: 900; }
    .center { text-align: center; }
    .muted { color: #64748b; }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo"><img src="${escapeCutReportHtml(WORKER_CUT_REPORT_LOGO_SRC)}" onerror="this.style.display='none'; this.parentElement.innerHTML='CP<br/>LOGO';" /></div>
    <div class="title">
      <div class="company">${escapeCutReportHtml(WORKER_CUT_REPORT_COMPANY)}</div>
      <div class="report-title">${escapeCutReportHtml(WORKER_CUT_REPORT_TITLE)}</div>
    </div>
    <div class="generated">Generated<br/>${escapeCutReportHtml(new Date().toLocaleString())}</div>
  </div>

  <div class="meta">
    <div class="label">Style No</div><div class="value">${escapeCutReportHtml(report.styleNo)}</div>
    <div class="label">Customer</div><div class="value">${escapeCutReportHtml(report.customerName)}</div>
    <div class="label">Revision</div><div class="value">${escapeCutReportHtml(report.revisionNo)}</div>
    <div class="label">Component</div><div class="value">${escapeCutReportHtml(report.component)}</div>
    <div class="label">IN-AD No</div><div class="value">${escapeCutReportHtml(report.inAdNo || '-')}</div>
    <div class="label">Schedule</div><div class="value">${escapeCutReportHtml(report.scheduleNo || '-')}</div>
    <div class="label">Job No</div><div class="value">${escapeCutReportHtml(report.jobNo || '-')}</div>
    <div class="label">Date</div><div class="value">${escapeCutReportHtml(report.cutInDate || '-')}</div>
    <div class="label">Colour</div><div class="value">${escapeCutReportHtml(colourText || '-')}</div>
    <div class="label">Season</div><div class="value">${escapeCutReportHtml(report.season || '-')}</div>
  </div>

  <div class="summary">
    <div class="summary-card"><div class="small">IN Qty</div><div class="big">${formatCutReportQty(report.inQty)}</div></div>
    <div class="summary-card"><div class="small">Total Cut Qty</div><div class="big">${formatCutReportQty(report.totalCutQty)}</div></div>
    <div class="summary-card"><div class="small">Cuts</div><div class="big">1</div></div>
    <div class="summary-card"><div class="small">Bundles</div><div class="big">${formatCutReportQty(bundles.length)}</div></div>
  </div>

  <div class="cut-title">
    <div>
      <span class="cut-index">Selected Cut</span>
      <h3>${escapeCutReportHtml(cut?.cutNo || '-')}</h3>
    </div>
    <div class="cut-qty">Qty: <strong>${formatCutReportQty(cut?.cutQty)}</strong></div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Bundle</th>
        <th>Qty</th>
        <th>Size</th>
        <th>Range</th>
        ${checkHeaders}
      </tr>
    </thead>
    <tbody>${bundleRowsHtml}</tbody>
  </table>
</body>
</html>`;

  const oldFrame = document.getElementById('worker-cut-report-print-frame') as HTMLIFrameElement | null;
  if (oldFrame) oldFrame.remove();

  const frame = document.createElement('iframe');
  frame.id = 'worker-cut-report-print-frame';
  frame.style.cssText = 'position:fixed;top:-10000px;left:-10000px;width:900px;height:1200px;';
  document.body.appendChild(frame);

  const doc = frame.contentDocument || frame.contentWindow?.document;
  if (!doc) return;

  doc.open();
  doc.write(html);
  doc.close();

  setTimeout(() => {
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
    setTimeout(() => frame.remove(), 1000);
  }, 300);
}

// ==========================================
// COMPONENT
// ==========================================
export default function DailyOutputPage() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const invalidateDashboard = useDashboardStore((state) => state.invalidate);
  const [eligibleStyles, setEligibleStyles] = useState<EligibleStyle[]>([]);
  const [records, setRecords] = useState<DailyOutputRecord[]>([]);
  const [isResumeLoading, setIsResumeLoading] = useState(false);
  const [resumeSourceRecordId, setResumeSourceRecordId] = useState('');
  const [resumeNotice, setResumeNotice] = useState('');
  
  const [pickedStyleKey, setPickedStyleKey] = useState('');   
  const [pickedCutNo, setPickedCutNo] = useState('');
  const [selectedStoreInId, setSelectedStoreInId] = useState(''); 
  const [selectedComponent, setSelectedComponent] = useState('');
  const [tableNo, setTableNo] = useState('');
  const [date, setDate] = useState(getColomboDateString);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>(createEmptyTimeSlots());
  const [workerName, setWorkerName] = useState(localStorage.getItem('operatorName') || '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pageError, setPageError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isCompletingJob, setIsCompletingJob] = useState(false);
  const [activeRecordId, setActiveRecordId] = useState<string | null>(null);
  const [workerCutReport, setWorkerCutReport] = useState<WorkerCutReport | null>(null);
  const [isCutReportLoading, setIsCutReportLoading] = useState(false);
  const [cutReportError, setCutReportError] = useState('');
  const [cutReportTicks, setCutReportTicks] = useState<CutReportTickState>({});

  const [confirmModal, setConfirmModal] = useState<{ rowIndex: number; slot: TimeSlot } | null>(null);

  const workerPagination = usePaginatedSearch({
    data: records,
    searchFields: ['styleNo' as any, 'customerName' as any, 'tableNo' as any, 'component' as any],
    pageSize: 25,
  });

  const fetchData = async () => {
    setPageError('');

    try {
      const [styRes, recRes] = await Promise.all([
        fetch(`${API_BASE}/eligible-styles`, { headers: getHeaders() }),
        fetch(`${API_BASE}/daily-output`, { headers: getHeaders() }),
      ]);

      if (!styRes.ok) {
        const message = await styRes.text();
        throw new Error(
          `Eligible styles request failed (${styRes.status}): ${message || styRes.statusText}`
        );
      }

      if (!recRes.ok) {
        const message = await recRes.text();
        throw new Error(
          `Daily output request failed (${recRes.status}): ${message || recRes.statusText}`
        );
      }

      const stylesData = await styRes.json();
      const recordsData = await recRes.json();

      setEligibleStyles(Array.isArray(stylesData) ? stylesData : []);
      setRecords(Array.isArray(recordsData) ? recordsData : []);
    } catch (error) {
      console.error('Failed to load worker data:', error);
      setEligibleStyles([]);
      setRecords([]);
      setPageError(error instanceof Error ? error.message : 'Failed to load worker data.');
    }
  };

  // History Continue uses one exact resume endpoint. WorkerHistoryPage also
  // passes the fetched payload through router state, so the Worker page can
  // render immediately without waiting for a second network request.
  const applyResumePayload = (
    payload: WorkerResumePayload,
    requestedTableNo: string,
    requestedDate: string,
  ) => {
    if (!payload?.record || !payload?.eligibleStyle) {
      throw new Error('The resume response is missing the Daily Output or Production record.');
    }

    if (payload.canContinue === false) {
      throw new Error(payload.message || 'This production allocation can no longer be continued.');
    }

    const sourceRecord: DailyOutputRecord = {
      ...payload.record,
      timeSlots: Array.isArray(payload.record.timeSlots)
        ? payload.record.timeSlots
        : [],
    };

    const productionRecordId = String(
      payload.eligibleStyle.productionRecordId ||
      payload.eligibleStyle.id ||
      sourceRecord.productionRecordId ||
      ''
    ).trim();

    const normalizedItem: EligibleStyle = {
      ...payload.eligibleStyle,
      id: String(payload.eligibleStyle.id || productionRecordId).trim(),
      productionRecordId,
      scheduleNo: String(payload.eligibleStyle.scheduleNo || '').trim(),
      storeInRecordId: String(
        payload.eligibleStyle.storeInRecordId ||
        sourceRecord.storeInRecordId ||
        ''
      ).trim(),
      component: String(
        payload.eligibleStyle.component ||
        sourceRecord.component ||
        ''
      ).trim(),
      originalQty: Number(
        payload.eligibleStyle.originalQty ||
        sourceRecord.orderQty ||
        0
      ),
      orderQty: Number(payload.eligibleStyle.orderQty || 0),
    };

    if (!normalizedItem.id || !normalizedItem.productionRecordId) {
      throw new Error('The resume response is missing the Production record ID.');
    }

    const resolvedDate =
      sourceRecord.date ||
      requestedDate ||
      getColomboDateString();

    const resolvedTableNo =
      sourceRecord.tableNo ||
      requestedTableNo ||
      '';

    setEligibleStyles([normalizedItem]);
    setRecords([sourceRecord]);
    setResumeSourceRecordId(sourceRecord.id);

    setPickedStyleKey(
      `${normalizedItem.styleNo}|||${normalizedItem.customerName}`
    );
    setPickedCutNo(normalizedItem.cutNo || sourceRecord.cutNo || '');
    setSelectedStoreInId(normalizedItem.id);
    setSelectedComponent(
      normalizedItem.component ||
      sourceRecord.component ||
      ''
    );
    setTableNo(resolvedTableNo);
    setDate(resolvedDate);

    if (sourceRecord.workerName) {
      setWorkerName(sourceRecord.workerName);
    }

    setResumeNotice(
      `Loaded ${normalizedItem.styleNo} ` +
      `(${normalizedItem.component || 'component'}) ` +
      `for ${resolvedDate}` +
      `${resolvedTableNo ? `, table ${resolvedTableNo}` : ''}.`
    );
  };

  const loadResumeData = async () => {
    const productionRecordId =
      (searchParams.get('productionRecordId') || '').trim();

    const sourceRecordId =
      (searchParams.get('sourceRecordId') || '').trim();

    const requestedTableNo =
      (searchParams.get('tableNo') || '').trim();

    const requestedDate =
      (
        searchParams.get('date') ||
        searchParams.get('sourceDate') ||
        ''
      ).trim();

    // Normal Daily Output page load.
    if (!productionRecordId && !sourceRecordId) {
      await fetchData();
      return;
    }

    if (!sourceRecordId) {
      setPageError(
        'The Continue link is missing the exact Daily Output record ID. Return to Worker History and click Continue again.'
      );
      return;
    }

    setIsResumeLoading(true);
    setPageError('');

    try {
      const navigationPayload = (
        location.state as
          | { workerResume?: WorkerResumePayload }
          | null
      )?.workerResume;

      // WorkerHistoryPage has already fetched and validated this exact row.
      // Use it directly when it matches the URL record ID.
      if (
        navigationPayload?.record?.id &&
        navigationPayload.record.id === sourceRecordId
      ) {
        applyResumePayload(
          navigationPayload,
          requestedTableNo,
          requestedDate
        );
        return;
      }

      // Direct reload/bookmark fallback: retrieve the Daily Output row and its
      // Production summary together in one backend request.
      const response = await fetch(
        `${API_BASE}/daily-output/${encodeURIComponent(sourceRecordId)}/resume`,
        { headers: getHeaders() }
      );

      if (!response.ok) {
        const message = await response.text();
        throw new Error(
          `Resume request failed (${response.status}): ` +
          `${message || response.statusText}`
        );
      }

      const payload: WorkerResumePayload =
        await response.json();

      applyResumePayload(
        payload,
        requestedTableNo,
        requestedDate
      );
    } catch (error) {
      console.error(
        'Failed to resume Worker Daily Output:',
        error
      );

      setEligibleStyles([]);
      setRecords([]);
      setResumeSourceRecordId('');
      setActiveRecordId(null);
      setTimeSlots(createEmptyTimeSlots());

      setPageError(
        error instanceof Error
          ? error.message
          : 'Failed to load the selected Worker Daily Output record.'
      );
    } finally {
      setIsResumeLoading(false);
    }
  };

  useEffect(() => {
    void loadResumeData();
    // Intentionally run once for the initial route/query values.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Disable old worker auto-draft behavior. Existing saved drafts are cleared once
  // so stale date/style/slot data cannot overwrite the live worker page.
  useEffect(() => {
    [
      'worker-daily-output',
      'draft-worker-daily-output',
      'autoDraft:worker-daily-output',
      'autodraft-worker-daily-output',
    ].forEach((key) => localStorage.removeItem(key));
  }, []);


  const selectedItem = useMemo(
    () => eligibleStyles.find((i) => i.id === selectedStoreInId) || null,
    [eligibleStyles, selectedStoreInId]
  );

  const effectiveStoreInId = selectedItem?.storeInRecordId || '';

  const loadWorkerCutReport = async (item: EligibleStyle | null, resetTicks = true) => {
    const storeInRecordId = item?.storeInRecordId?.trim() || '';
    const cutNo = item?.cutNo?.trim() || '';

    if (!storeInRecordId || !cutNo) {
      setWorkerCutReport(null);
      setCutReportError('');
      if (resetTicks) setCutReportTicks({});
      return;
    }

    setIsCutReportLoading(true);
    setCutReportError('');

    try {
      const response = await fetch(
        `${API_BASE}/store-in-cut-report?storeInRecordId=${encodeURIComponent(storeInRecordId)}&cutNo=${encodeURIComponent(cutNo)}`,
        { headers: getHeaders() }
      );

      if (!response.ok) {
        throw new Error(await response.text() || 'Failed to load Store-In cut report.');
      }

      const data = await response.json();
      setWorkerCutReport(data);
      if (resetTicks) setCutReportTicks({});
    } catch (error) {
      setWorkerCutReport(null);
      setCutReportError(error instanceof Error ? error.message : 'Failed to load Store-In cut report.');
      if (resetTicks) setCutReportTicks({});
    } finally {
      setIsCutReportLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const storeInRecordId = selectedItem?.storeInRecordId?.trim() || '';
      const cutNo = selectedItem?.cutNo?.trim() || '';

      if (!storeInRecordId || !cutNo) {
        setWorkerCutReport(null);
        setCutReportError('');
        setCutReportTicks({});
        return;
      }

      setIsCutReportLoading(true);
      setCutReportError('');
      setCutReportTicks({});

      try {
        const response = await fetch(
          `${API_BASE}/store-in-cut-report?storeInRecordId=${encodeURIComponent(storeInRecordId)}&cutNo=${encodeURIComponent(cutNo)}`,
          { headers: getHeaders() }
        );

        if (!response.ok) {
          throw new Error(await response.text() || 'Failed to load Store-In cut report.');
        }

        const data = await response.json();
        if (!cancelled) setWorkerCutReport(data);
      } catch (error) {
        if (!cancelled) {
          setWorkerCutReport(null);
          setCutReportError(error instanceof Error ? error.message : 'Failed to load Store-In cut report.');
        }
      } finally {
        if (!cancelled) setIsCutReportLoading(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [selectedItem?.storeInRecordId, selectedItem?.cutNo]);

  const toggleCutReportTick = (bundleKey: string, field: CutReportCheckField) => {
    setCutReportTicks(prev => ({
      ...prev,
      [bundleKey]: {
        ...(prev[bundleKey] || {}),
        [field]: !prev[bundleKey]?.[field],
      },
    }));
  };

  const distinctStyles = useMemo(() => {
    const map = new Map<string, {
      key: string; styleNo: string; customerName: string;
      totalRemaining: number; prodCount: number; components: string[];
    }>();
    eligibleStyles.forEach((s) => {
      const key = s.styleNo + '|||' + s.customerName;
      const comp = s.component || '';
      const existing = map.get(key);
      if (existing) {
        existing.totalRemaining += s.orderQty;
        existing.prodCount += 1;
        if (comp && !existing.components.includes(comp)) existing.components.push(comp);
      } else {
        map.set(key, {
          key, styleNo: s.styleNo, customerName: s.customerName,
          totalRemaining: s.orderQty, prodCount: 1,
          components: comp ? [comp] : [],
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.styleNo.localeCompare(b.styleNo));
  }, [eligibleStyles]);

  const cutsForStyle = useMemo(() => {
    if (!pickedStyleKey) return [];
    const [styleNo, customerName] = pickedStyleKey.split('|||');
    const rows = eligibleStyles.filter(s => s.styleNo === styleNo && s.customerName === customerName);
    const map = new Map<string, { cutNo: string; totalRemaining: number; lineCount: number; components: string[] }>();
    rows.forEach(s => {
      const comp = s.component || '';
      const existing = map.get(s.cutNo);
      if (existing) {
        existing.totalRemaining += s.orderQty;
        existing.lineCount += 1;
        if (comp && !existing.components.includes(comp)) existing.components.push(comp);
      } else {
        map.set(s.cutNo, { cutNo: s.cutNo, totalRemaining: s.orderQty, lineCount: 1, components: comp ? [comp] : [] });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.cutNo.localeCompare(b.cutNo));
  }, [eligibleStyles, pickedStyleKey]);

  const linesForCut = useMemo(() => {
    if (!pickedStyleKey || !pickedCutNo) return [];
    const [styleNo, customerName] = pickedStyleKey.split('|||');
    return eligibleStyles
      .filter((s) => s.styleNo === styleNo && s.customerName === customerName && s.cutNo === pickedCutNo)
      .sort((a, b) => (a.lineNo || '').localeCompare(b.lineNo || ''));
  }, [eligibleStyles, pickedStyleKey, pickedCutNo]);

  const activeRecord = useMemo(() => {
    // Continue must edit the exact History row that was clicked. The Daily
    // Output primary key is the strongest identity and avoids collisions when
    // the same production/table/date combination exists more than once.
    if (resumeSourceRecordId) {
      return records.find((record) => record.id === resumeSourceRecordId) || null;
    }

    if (!selectedItem || !tableNo) return null;

    return records.find((record) =>
      record.productionRecordId === selectedItem.productionRecordId &&
      record.tableNo.trim() === tableNo.trim() &&
      record.date === date
    ) || null;
  }, [records, resumeSourceRecordId, selectedItem, tableNo, date]);

  useEffect(() => {
    if (activeRecord) {
      const recordTimeSlots = Array.isArray(activeRecord.timeSlots)
        ? activeRecord.timeSlots
        : [];

      const loadedSlots = DEFAULT_TIME_SLOTS.map((t) => {
        const existing = recordTimeSlots.find(
          (s) => s.timeFrom === t.timeFrom && s.timeTo === t.timeTo
        );
        if (existing) {
          return {
            ...existing,
            lockedFields: {
              seating: existing.seating > 0,
              printing: existing.printing > 0,
              curing: existing.curing > 0,
              checking: existing.checking > 0,
              packing: existing.packing > 0,
              dispatch: existing.dispatch > 0,
            }
          } as TimeSlot;
        }
        return { ...t, seating: 0, printing: 0, curing: 0, checking: 0, packing: 0, dispatch: 0, lockedFields: { seating: false, printing: false, curing: false, checking: false, packing: false, dispatch: false } };
      });
      setTimeSlots(loadedSlots);
      setActiveRecordId(activeRecord.id);
    } else {
      setTimeSlots(createEmptyTimeSlots());
      setActiveRecordId(null);
    }
  }, [activeRecord]);

  // FIX: Use originalQty from the backend to represent the true base issue quantity
  const issueQty = selectedItem?.originalQty ?? 0;

  const totals = useMemo(() => ({
    seating: timeSlots.reduce((s, t) => s + (Number(t.seating) || 0), 0),
    printing: timeSlots.reduce((s, t) => s + (Number(t.printing) || 0), 0),
    curing: timeSlots.reduce((s, t) => s + (Number(t.curing) || 0), 0),
    checking: timeSlots.reduce((s, t) => s + (Number(t.checking) || 0), 0),
    packing: timeSlots.reduce((s, t) => s + (Number(t.packing) || 0), 0),
    dispatch: timeSlots.reduce((s, t) => s + (Number(t.dispatch) || 0), 0),
  }), [timeSlots]);

  const persistedElsewhere = useMemo(() => {
    if (!selectedItem) return emptyStageTotals();

    // eligible-styles already returns database-aggregated totals for the exact
    // ProductionRecordId. Subtract the record currently being edited so the UI
    // keeps the same independent-stage validation without downloading all
    // historical DailyOutput rows.
    return {
      seating: Math.max(0, (selectedItem.seatingAllocated || 0) - (activeRecord?.totalSeating || 0)),
      printing: Math.max(0, (selectedItem.printingAllocated || 0) - (activeRecord?.totalPrinting || 0)),
      curing: Math.max(0, (selectedItem.curingAllocated || 0) - (activeRecord?.totalCuring || 0)),
      checking: Math.max(0, (selectedItem.checkingAllocated || 0) - (activeRecord?.totalChecking || 0)),
      packing: Math.max(0, (selectedItem.packingAllocated || 0) - (activeRecord?.totalPacking || 0)),
      dispatch: Math.max(0, (selectedItem.dispatchAllocated || 0) - (activeRecord?.totalDispatch || 0)),
    };
  }, [selectedItem, activeRecord]);

  const allocated = useMemo(() => ({
    seating: persistedElsewhere.seating + totals.seating,
    printing: persistedElsewhere.printing + totals.printing,
    curing: persistedElsewhere.curing + totals.curing,
    checking: persistedElsewhere.checking + totals.checking,
    packing: persistedElsewhere.packing + totals.packing,
    dispatch: persistedElsewhere.dispatch + totals.dispatch,
  }), [persistedElsewhere, totals]);

  const stageRemaining = useMemo<StageTotals>(() => ({
    seating: Math.max(0, issueQty - allocated.seating),
    printing: Math.max(0, issueQty - allocated.printing),
    curing: Math.max(0, issueQty - allocated.curing),
    checking: Math.max(0, issueQty - allocated.checking),
    packing: Math.max(0, issueQty - allocated.packing),
    dispatch: Math.max(0, issueQty - allocated.dispatch),
  }), [issueQty, allocated]);

  const overLimitStages = useMemo(
    () => SECTIONS.filter(sec => allocated[sec.key] > issueQty).map(sec => sec.label),
    [allocated, issueQty]
  );

  const isOverLimit = overLimitStages.length > 0;
  const maxAllocated = maxStageValue(allocated);
  const lowestRemaining = minStageValue(stageRemaining);

  const updateSlot = (index: number, field: keyof TimeSlot, value: string) => {
    setTimeSlots((prev) => prev.map((slot, i) => {
      if (i !== index) return slot;
      if (field === 'timeFrom' || field === 'timeTo') return { ...slot, [field]: value };
      return { ...slot, [field]: Math.max(0, parseInt(value) || 0) };
    }));
  };

  const validateSetup = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!selectedStoreInId) newErrors.style = 'Select a style';
    if (!selectedComponent) newErrors.component = 'Component is missing from production record';
    if (!tableNo.trim()) newErrors.tableNo = 'Table No is required';
    if (!workerName.trim()) newErrors.worker = 'Worker name is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const requestSubmitRow = (rowIndex: number) => {
    if (!validateSetup()) {
      setPageError('Please fill in all required fields above first.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setPageError('');
    setConfirmModal({ rowIndex, slot: timeSlots[rowIndex] });
  };

  const confirmSubmitRow = async () => {
    if (!confirmModal) return;
    const { rowIndex } = confirmModal;

    setIsSaving(true);
    setPageError('');

    const updatedSlots = timeSlots.map((s, i) => {
      if (i === rowIndex) {
        return {
          ...s,
          lockedFields: {
            seating: s.seating > 0 || s.lockedFields.seating,
            printing: s.printing > 0 || s.lockedFields.printing,
            curing: s.curing > 0 || s.lockedFields.curing,
            checking: s.checking > 0 || s.lockedFields.checking,
            packing: s.packing > 0 || s.lockedFields.packing,
            dispatch: s.dispatch > 0 || s.lockedFields.dispatch,
          }
        };
      }
      return s;
    });

    const slotsToSave = updatedSlots.map(s => ({
      timeFrom: s.timeFrom,
      timeTo: s.timeTo,
      seating: s.lockedFields.seating ? s.seating : 0,
      printing: s.lockedFields.printing ? s.printing : 0,
      curing: s.lockedFields.curing ? s.curing : 0,
      checking: s.lockedFields.checking ? s.checking : 0,
      packing: s.lockedFields.packing ? s.packing : 0,
      dispatch: s.lockedFields.dispatch ? s.dispatch : 0,
    }));

    const newTotals = {
      seating: slotsToSave.reduce((sum, s) => sum + s.seating, 0),
      printing: slotsToSave.reduce((sum, s) => sum + s.printing, 0),
      curing: slotsToSave.reduce((sum, s) => sum + s.curing, 0),
      checking: slotsToSave.reduce((sum, s) => sum + s.checking, 0),
      packing: slotsToSave.reduce((sum, s) => sum + s.packing, 0),
      dispatch: slotsToSave.reduce((sum, s) => sum + s.dispatch, 0),
    };

    const payload = {
      productionRecordId: selectedItem?.productionRecordId ?? '',
      storeInRecordId: effectiveStoreInId,
      date,
      styleNo: selectedItem?.styleNo ?? '',
      customerName: selectedItem?.customerName ?? '',
      cutNo: selectedItem?.cutNo ?? '',
      component: selectedComponent,
      orderQty: issueQty, // Safe: sending the true base issue qty to DB
      tableNo: tableNo.trim(),
      timeSlots: slotsToSave,
      totalSeating: newTotals.seating,
      totalPrinting: newTotals.printing,
      totalCuring: newTotals.curing,
      totalChecking: newTotals.checking,
      totalPacking: newTotals.packing,
      totalDispatch: newTotals.dispatch,
      workerName,
    };

    try {
      let res;
      if (activeRecordId) {
        res = await fetch(`${API_BASE}/daily-output/${activeRecordId}`, {
          method: 'PUT',
          headers: getHeaders(),
          body: JSON.stringify({ ...payload, id: activeRecordId }),
        });
      } else {
        res = await fetch(`${API_BASE}/daily-output`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) throw new Error(await res.text());

      const saved = await res.json();
      if (!activeRecordId && saved?.id) setActiveRecordId(saved.id);

      setTimeSlots(updatedSlots);
      setConfirmModal(null);
      invalidateDashboard();
      await fetchData();
    } catch (e) {
      setPageError(e instanceof Error ? e.message : 'Failed to save.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCompleteJob = async () => {
    if (!selectedItem) return;

    const confirmMessage =
      `Complete this job?\n\n${selectedItem.styleNo} — ${selectedItem.customerName}\nCut: ${selectedItem.cutNo || '-'}\nLine: ${selectedItem.lineNo || '-'}\n\nThis will remove it from the Worker dropdown even if some stage quantities are still remaining.`;

    if (!window.confirm(confirmMessage)) return;

    setIsCompletingJob(true);
    setPageError('');

    try {
      const res = await fetch(`${API_BASE}/complete-job/${selectedItem.productionRecordId}`, {
        method: 'POST',
        headers: getHeaders(),
      });

      if (!res.ok) {
        throw new Error(await res.text() || 'Failed to complete job.');
      }

      const completedProductionRecordId = selectedItem.productionRecordId;

      setEligibleStyles(prev => prev.filter(item => item.productionRecordId !== completedProductionRecordId));
      setPickedStyleKey('');
      setPickedCutNo('');
      setSelectedStoreInId('');
      setSelectedComponent('');
      setTableNo('');
      setTimeSlots(createEmptyTimeSlots());
      setActiveRecordId(null);
      setResumeSourceRecordId('');
      setErrors({});
      setResumeNotice('Job completed successfully. It has been removed from the Worker dropdown.');

      invalidateDashboard();
      await fetchData();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      setPageError(e instanceof Error ? e.message : 'Failed to complete job.');
    } finally {
      setIsCompletingJob(false);
    }
  };

  const handleReset = () => {
    setPickedStyleKey('');
    setPickedCutNo('');
    setSelectedStoreInId('');
    setSelectedComponent('');
    setTableNo('');
    setTimeSlots(createEmptyTimeSlots());
    setActiveRecordId(null);
    setResumeSourceRecordId('');
    setErrors({});
    setPageError('');
    setResumeNotice('');
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this record? This cannot be undone.')) return;
    try {
      const response = await fetch(`${API_BASE}/daily-output/${id}`, { method: 'DELETE', headers: getHeaders() });
      if (!response.ok) throw new Error(await response.text() || 'Failed to delete.');
      invalidateDashboard();
      await fetchData();
    } catch (e) {
      setPageError('Failed to delete.');
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-7xl space-y-6 pb-12">

      <div className="flex items-center space-x-3 border-b border-slate-200 pb-4">
        <div className="rounded-lg bg-teal-100 p-2">
          <Factory className="h-6 w-6 text-teal-700" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Worker — Daily Output</h2>
          <p className="text-sm text-slate-500">Distribute your issued pieces across the stages they are currently located in.</p>
        </div>
      </div>

      {isResumeLoading && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700"
        >
          <Clock className="h-4 w-4 animate-pulse" />
          <span>Loading the exact Production and Daily Output records...</span>
        </motion.div>
      )}

      {pageError && (
        <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{pageError}</span>
          <button onClick={() => setPageError('')} className="ml-auto text-red-400 hover:text-red-600"><X className="h-4 w-4" /></button>
        </motion.div>
      )}

      {resumeNotice && (
        <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{resumeNotice}</span>
          <button onClick={() => setResumeNotice('')} className="ml-auto text-blue-400 hover:text-blue-600"><X className="h-4 w-4" /></button>
        </motion.div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
        <div className="rounded-lg border border-teal-200 bg-teal-50/50 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-teal-200 pb-2">
            <h4 className="text-sm font-bold uppercase tracking-wider text-teal-800">Style & Setup</h4>
            {activeRecordId && <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">EDITING EXISTING RECORD</span>}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-6">
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-600">Style *</label>
              <select
                value={pickedStyleKey}
                onChange={(e) => {
                  setPickedStyleKey(e.target.value);
                  setPickedCutNo('');            
                  setSelectedStoreInId('');
                  setSelectedComponent('');
                }}
                className={`w-full rounded border bg-white px-3 py-2 text-sm outline-none ${errors.style ? 'border-red-400 bg-red-50' : 'border-slate-300 focus:ring-2 focus:ring-teal-500'}`}
              >
                <option value="">Select style...</option>
                {distinctStyles.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.styleNo} — {s.customerName}
                    {s.components.length > 0 ? ' [' + s.components.join(', ') + ']' : ''}
                    {' (' + s.prodCount + ' cut' + (s.prodCount !== 1 ? 's' : '') + ', remaining ' + s.totalRemaining + ')'}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-600">Cut No *</label>
              <select
                value={pickedCutNo}
                disabled={!pickedStyleKey}
                onChange={(e) => {
                  setPickedCutNo(e.target.value);
                  setSelectedStoreInId('');
                  setSelectedComponent('');
                }}
                className={`w-full rounded border bg-white px-3 py-2 text-sm outline-none disabled:bg-slate-100 disabled:cursor-not-allowed ${errors.style ? 'border-red-400 bg-red-50' : 'border-slate-300 focus:ring-2 focus:ring-teal-500'}`}
              >
                <option value="">{pickedStyleKey ? 'Select cut...' : 'Pick a style first'}</option>
                {cutsForStyle.map((c) => (
                  <option key={c.cutNo} value={c.cutNo}>
                    {c.cutNo}
                    {c.components.length > 0 ? ' [' + c.components.join(', ') + ']' : ''}
                    {' — ' + c.lineCount + ' line' + (c.lineCount !== 1 ? 's' : '') + ' · remaining ' + c.totalRemaining}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-600">Line *</label>
              <select
                value={selectedStoreInId}
                disabled={!pickedCutNo}
                onChange={(e) => {
                  const selectedId = e.target.value;
                  setSelectedStoreInId(selectedId);
                  const matchedItem = eligibleStyles.find((s) => s.id === selectedId);
                  setSelectedComponent(matchedItem?.component || '');
                }}
                className={`w-full rounded border bg-white px-3 py-2 text-sm outline-none disabled:bg-slate-100 disabled:cursor-not-allowed ${errors.style ? 'border-red-400 bg-red-50' : 'border-slate-300 focus:ring-2 focus:ring-teal-500'}`}
              >
                <option value="">{pickedCutNo ? 'Select line...' : 'Pick a cut first'}</option>
                {linesForCut.map((l) => {
                  const comp = l.component || '';
                  const colour = l.bodyColour || '';
                  return (
                    <option key={l.id} value={l.id}>
                      {'Line ' + (l.lineNo || '—')}
                      {comp ? ' · ' + comp : ''}
                      {colour ? ' · ' + colour : ''}
                      {' — Issued ' + l.originalQty + ' (Open stage rem: ' + l.orderQty + ')'}
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-600">
                Schedule No
              </label>
              <input
                type="text"
                value={selectedItem?.scheduleNo || ''}
                readOnly
                disabled
                placeholder="Auto-filled"
                title="Auto-filled from Store In schedule number"
                className="w-full cursor-not-allowed rounded border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700 outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-600">Issue Qty (from Production)</label>
              <div className="rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-orange-700">{issueQty || '-'}</div>
            </div>

            {/* LOCKED COMPONENT FIELD */}
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-600">Component</label>
              <input
                type="text"
                value={selectedComponent}
                readOnly
                disabled
                placeholder="Auto-filled"
                title="This field is locked and auto-filled from the production record"
                className={`w-full rounded border px-3 py-2 text-sm font-bold outline-none cursor-not-allowed ${
                  selectedComponent ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-slate-300 bg-slate-50 text-slate-400'
                }`}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-600">Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500" />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-600">Table No *</label>
              <input type="text" value={tableNo} onChange={(e) => setTableNo(e.target.value)} placeholder="T01" className={`w-full rounded border px-3 py-2 text-sm outline-none ${errors.tableNo ? 'border-red-400 bg-red-50' : 'border-slate-300 focus:ring-2 focus:ring-teal-500'}`} />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-600">Worker Name *</label>
              <input type="text" value={workerName} onChange={(e) => setWorkerName(e.target.value)} placeholder="Your name" className={`w-full rounded border px-3 py-2 text-sm font-medium outline-none ${errors.worker ? 'border-red-400 bg-red-50' : 'border-slate-300 focus:ring-2 focus:ring-teal-500'}`} />
            </div>
          </div>
        </div>

        {selectedItem && (
          <div className="space-y-3">
            <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-orange-600 uppercase tracking-wide">
                <Package className="h-3.5 w-3.5" /> Issue Qty
              </div>
              <p className="mt-1 text-2xl font-black text-orange-700">{issueQty}</p>
              <p className="text-[11px] text-slate-500">
                This qty is the independent allocation limit for each stage. Seating, Printing, Curing, Checking, Packing, and Dispatch each have their own {issueQty} qty limit.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-6">
              {SECTIONS.map((sec) => {
                const used = allocated[sec.key];
                const rem = stageRemaining[sec.key];
                const over = used > issueQty;
                return (
                  <div key={sec.key} className={`rounded-lg border p-4 ${over ? 'border-red-300 bg-red-50' : rem <= 0 ? 'border-slate-200 bg-slate-50' : 'border-blue-200 bg-blue-50'}`}>
                    <div className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-wide ${over ? 'text-red-600' : rem <= 0 ? 'text-slate-600' : 'text-blue-600'}`}>
                      <TrendingDown className="h-3.5 w-3.5" /> {sec.label}
                    </div>
                    <p className={`mt-1 text-xl font-black ${over ? 'text-red-700' : rem <= 0 ? 'text-slate-700' : 'text-blue-700'}`}>
                      {rem}
                    </p>
                    <p className="text-[11px] text-slate-500">remaining for allocation</p>
                    <p className="mt-1 text-[10px] text-slate-400">{used} / {issueQty} allocated</p>
                  </div>
                );
              })}
            </div>

            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 uppercase tracking-wide">
                <CheckCircle2 className="h-3.5 w-3.5" /> Stage Progress
              </div>

              <div className="mt-3 space-y-2">
                {SECTIONS.map((sec) => {
                  const used = allocated[sec.key];
                  const rem = stageRemaining[sec.key];
                  const pct = issueQty > 0 ? Math.min(100, Math.max(0, (used / issueQty) * 100)) : 0;
                  const over = used > issueQty;

                  return (
                    <div key={sec.key} className="rounded-md bg-white/80 p-2">
                      <div className="mb-1 flex items-center justify-between gap-3">
                        <span className={`text-xs font-bold ${sec.color}`}>{sec.label}</span>
                        <span className={`text-[11px] font-semibold ${over ? 'text-red-600' : 'text-slate-500'}`}>
                          {used.toLocaleString()} / {issueQty.toLocaleString()} allocated · {rem.toLocaleString()} remaining
                        </span>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-slate-200">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ease-out ${over ? 'bg-red-500' : STAGE_BAR_CLASSES[sec.key]}`}
                          style={{ width: `${over ? 100 : pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <p className="mt-3 text-sm text-slate-600">
                Highest stage allocation: <span className="font-bold text-emerald-700">{maxAllocated}</span>.
                Lowest remaining stage balance: <span className="font-bold text-blue-700">{lowestRemaining}</span>.
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-bold text-slate-800">Finish this job manually</p>
                  <p className="text-xs text-slate-500">
                    Use this when the remaining stages will not be allocated. The job will be removed from the Worker dropdown.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCompleteJob}
                  disabled={isCompletingJob || isSaving}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {isCompletingJob ? 'Completing...' : 'Complete Job'}
                </button>
              </div>
            </div>
          </div>
        )}

        {isOverLimit && (
          <div className="rounded-lg border-2 border-red-300 bg-red-50 px-4 py-3 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-bold text-red-700">Stage Qty Exceeded</p>
              <p className="text-xs text-red-600">
                {overLimitStages.join(', ')} exceeds the independent Issue Qty limit ({issueQty}). Each stage must be {issueQty} or less.
              </p>
            </div>
          </div>
        )}

        {selectedItem && (
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-800 text-white text-xs">
                  <th className="border-r border-slate-600 px-2 py-2.5 text-center font-bold" colSpan={2}>TIME SLOT</th>
                  {SECTIONS.map((sec) => (
                    <th key={sec.key} className="border-r border-slate-600 px-3 py-2.5 text-center font-bold">
                      {sec.label.toUpperCase()}
                    </th>
                  ))}
                  <th className="px-3 py-2.5 text-center font-bold w-28">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {timeSlots.map((slot, idx) => {
                  const hasNewData = SECTIONS.some(sec => (slot[sec.key] as number) > 0 && !slot.lockedFields[sec.key]);

                  return (
                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                      <td className="border-r border-slate-200 p-0 w-24">
                        <input type="time" value={slot.timeFrom} onChange={(e) => updateSlot(idx, 'timeFrom', e.target.value)} className="w-full bg-transparent px-2 py-1.5 text-center text-xs outline-none focus:bg-blue-50" />
                      </td>
                      <td className="border-r border-slate-200 p-0 w-24">
                        <input type="time" value={slot.timeTo} onChange={(e) => updateSlot(idx, 'timeTo', e.target.value)} className="w-full bg-transparent px-2 py-1.5 text-center text-xs outline-none focus:bg-blue-50" />
                      </td>
                      {SECTIONS.map((sec) => {
                        const isFieldLocked = slot.lockedFields[sec.key];
                        const stageOver = allocated[sec.key] > issueQty;
                        return (
                          <td key={sec.key} className="border-r border-slate-200 p-0">
                            <input
                              type="number"
                              min={0}
                              value={(slot[sec.key] as number) || ''}
                              onChange={(e) => updateSlot(idx, sec.key, e.target.value)}
                              disabled={isFieldLocked}
                              className={`w-full bg-transparent py-1.5 text-center text-sm font-medium outline-none ${isFieldLocked ? 'cursor-not-allowed text-slate-400 font-bold bg-slate-50' : stageOver ? 'bg-red-50 text-red-700 focus:bg-red-50' : 'focus:bg-teal-50 hover:bg-slate-50'}`}
                              placeholder="0"
                            />
                          </td>
                        );
                      })}
                      <td className="p-0 text-center w-28">
                        <button
                          type="button"
                          onClick={() => requestSubmitRow(idx)}
                          disabled={!hasNewData || isSaving || isOverLimit}
                          className={`inline-flex items-center justify-center w-20 gap-1 rounded-md px-2 py-1.5 text-[10px] font-bold text-white transition-colors ${
                            isOverLimit
                              ? 'bg-red-300 cursor-not-allowed'
                              : hasNewData
                                ? 'bg-teal-600 hover:bg-teal-700'
                                : 'bg-slate-300 cursor-not-allowed'
                          }`}
                        >
                          {hasNewData ? <><Save className="h-3 w-3" /> Save</> : <><CheckCircle2 className="h-3 w-3" /> Saved</>}
                        </button>
                      </td>
                    </tr>
                  );
                })}
                <tr className="bg-slate-100 font-bold border-t-2 border-slate-400">
                  <td colSpan={2} className="border-r border-slate-300 px-3 py-2 text-right text-xs uppercase text-slate-500">TOTALS</td>
                  {SECTIONS.map((sec) => (
                    <td key={sec.key} className={`border-r border-slate-300 px-3 py-2 text-center ${sec.color}`}>
                      {totals[sec.key as keyof typeof totals]}
                    </td>
                  ))}
                  <td className="px-3 py-2 text-center">
                    <button onClick={handleReset} className="text-[10px] font-medium text-slate-500 hover:text-slate-700 underline">Reset Form</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {selectedItem && (
          <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-3 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
                  <Package className="h-4 w-4 text-teal-600" />
                  Selected Cut Report
                </div>
                <p className="mt-0.5 text-xs text-slate-500">
                  Store-In bundle details for the selected cut. Tick the status boxes only when needed before printing.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void loadWorkerCutReport(selectedItem, false)}
                  disabled={isCutReportLoading}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isCutReportLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
                <button
                  type="button"
                  onClick={() => workerCutReport && printWorkerCutReport(workerCutReport, cutReportTicks)}
                  disabled={!workerCutReport || isCutReportLoading}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Printer className="h-3.5 w-3.5" />
                  Print Cut Report
                </button>
              </div>
            </div>

            {isCutReportLoading ? (
              <div className="flex items-center gap-2 px-4 py-5 text-sm text-slate-500">
                <RefreshCw className="h-4 w-4 animate-spin" />
                Loading selected cut report...
              </div>
            ) : cutReportError ? (
              <div className="flex items-center gap-2 px-4 py-4 text-sm text-red-600">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {cutReportError}
              </div>
            ) : workerCutReport ? (
              <div className="space-y-4 p-4">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Style / Customer</p>
                    <p className="mt-1 text-sm font-black text-slate-800">{workerCutReport.styleNo}</p>
                    <p className="text-xs text-slate-500">{workerCutReport.customerName}</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Cut / Component</p>
                    <p className="mt-1 text-sm font-black text-slate-800">{workerCutReport.cut?.cutNo || '-'}</p>
                    <p className="text-xs text-slate-500">{workerCutReport.component || '-'}</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">IN-AD / Schedule</p>
                    <p className="mt-1 text-sm font-black text-slate-800">{workerCutReport.inAdNo || '-'}</p>
                    <p className="text-xs text-slate-500">Sch: {workerCutReport.scheduleNo || '-'}</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Cut Qty / Bundles</p>
                    <p className="mt-1 text-sm font-black text-slate-800">{formatCutReportQty(workerCutReport.cut?.cutQty)}</p>
                    <p className="text-xs text-slate-500">{formatCutReportQty(workerCutReport.cut?.bundles?.length || 0)} bundles</p>
                  </div>
                </div>

                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                  <span className="font-bold text-slate-700">Colour:</span>{' '}
                  {[workerCutReport.bodyColour, workerCutReport.printColour].filter(Boolean).join(' / ') || '-'}
                  <span className="mx-2 text-slate-300">|</span>
                  <span className="font-bold text-slate-700">Job:</span> {workerCutReport.jobNo || '-'}
                  <span className="mx-2 text-slate-300">|</span>
                  <span className="font-bold text-slate-700">Date:</span> {workerCutReport.cutInDate || '-'}
                </div>

                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="min-w-275 w-full text-xs">
                    <thead>
                      <tr className="bg-slate-800 text-white">
                        <th className="px-3 py-2 text-left font-bold">Bundle</th>
                        <th className="px-3 py-2 text-right font-bold">Qty</th>
                        <th className="px-3 py-2 text-left font-bold">Size</th>
                        <th className="px-3 py-2 text-left font-bold">Range</th>
                        {CUT_REPORT_CHECK_COLUMNS.map(column => (
                          <th key={column.key} className="px-3 py-2 text-center font-bold">
                            {column.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {(workerCutReport.cut?.bundles || []).length === 0 ? (
                        <tr>
                          <td colSpan={9} className="px-3 py-6 text-center text-slate-400">
                            No bundle details found for this cut.
                          </td>
                        </tr>
                      ) : (
                        workerCutReport.cut.bundles.map((bundle, index) => {
                          const bundleKey = makeCutReportBundleKey(bundle, index);
                          return (
                            <tr key={bundleKey} className="text-slate-700 hover:bg-slate-50">
                              <td className="px-3 py-2 font-semibold">{bundle.bundleNo}</td>
                              <td className="px-3 py-2 text-right font-bold">{formatCutReportQty(bundle.bundleQty)}</td>
                              <td className="px-3 py-2">{bundle.size}</td>
                              <td className="px-3 py-2 text-slate-500">{bundle.numberRange || '-'}</td>
                              {CUT_REPORT_CHECK_COLUMNS.map(column => (
                                <td key={column.key} className="px-3 py-2 text-center">
                                  <input
                                    type="checkbox"
                                    checked={cutReportTicks[bundleKey]?.[column.key] === true}
                                    onChange={() => toggleCutReportTick(bundleKey, column.key)}
                                    className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                                    aria-label={`${column.label} for bundle ${bundle.bundleNo}`}
                                  />
                                </td>
                              ))}
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="px-4 py-5 text-sm text-slate-400">
                Select a cut and line to load the Store-In cut report.
              </div>
            )}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-slate-400" />
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">All Output Records</h3>
          </div>
        </div>

        {records.length === 0 ? (
          <div className="py-12 text-center"><Factory className="mx-auto mb-2 h-10 w-10 text-slate-200" /><p className="text-sm text-slate-400">No output records yet.</p></div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-[11px] font-semibold text-slate-500 border-b border-slate-100">
                    <th className="px-4 py-2.5 text-left">Date</th>
                    <th className="px-4 py-2.5 text-left">Style</th>
                    <th className="px-4 py-2.5 text-left">Customer</th>
                    <th className="px-4 py-2.5 text-left">Component</th>
                    <th className="px-4 py-2.5 text-left">Table</th>
                    <th className="px-4 py-2.5 text-right">Issue</th>
                    <th className="px-4 py-2.5 text-right">Max Stage</th>
                    <th className="px-4 py-2.5 text-right">Lowest Rem.</th>
                    <th className="px-4 py-2.5 text-left">Worker</th>
                    <th className="px-4 py-2.5 text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {workerPagination.paginated.map((r) => {
                    const rec = r as DailyOutputRecord;
                    const recStageTotals = {
                      seating: rec.totalSeating || 0,
                      printing: rec.totalPrinting || 0,
                      curing: rec.totalCuring || 0,
                      checking: rec.totalChecking || 0,
                      packing: rec.totalPacking || 0,
                      dispatch: rec.totalDispatch || 0,
                    };
                    const recCompleted = Math.max(...Object.values(recStageTotals));
                    const rem = Math.min(...Object.values(recStageTotals).map(v => Math.max(0, rec.orderQty - v)));
                    
                    return (
                      <tr key={rec.id} className="hover:bg-slate-50/50">
                        <td className="px-4 py-2.5 text-slate-600 text-xs">{rec.date}</td>
                        <td className="px-4 py-2.5 font-bold text-slate-800">{rec.styleNo}</td>
                        <td className="px-4 py-2.5 text-slate-500">{rec.customerName}</td>
                        <td className="px-4 py-2.5 text-slate-600">{rec.component}</td>
                        <td className="px-4 py-2.5 font-mono text-xs">{rec.tableNo}</td>
                        <td className="px-4 py-2.5 text-right font-semibold text-orange-600">{rec.orderQty}</td>
                        <td className="px-4 py-2.5 text-right font-semibold text-emerald-600">{recCompleted}</td>
                        <td className={`px-4 py-2.5 text-right font-bold ${rem <= 0 ? 'text-slate-400' : 'text-blue-600'}`}>{rem}</td>
                        <td className="px-4 py-2.5 text-slate-600 text-xs">{rec.workerName}</td>
                        <td className="px-4 py-2.5 text-right">
                          <button onClick={() => handleDelete(rec.id)} className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"><Trash2 className="h-4 w-4" /></button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <PaginationControls 
              onSearchChange={workerPagination.setSearch} 
              onPageChange={workerPagination.goToPage} 
              {...workerPagination} 
              placeholder="Search records..." 
            />
          </>
        )}
      </div>

      <AnimatePresence>
        {confirmModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4" onClick={() => setConfirmModal(null)}>
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-3 mb-4">
                <div className="rounded-xl bg-amber-100 p-2.5"><AlertCircle className="h-5 w-5 text-amber-600" /></div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Confirm Submission</h3>
                  <p className="text-xs text-slate-500">Please double-check your inputs.</p>
                </div>
              </div>

              <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center gap-2 text-xs text-slate-500 mb-2"><Clock className="h-3 w-3" /><span className="font-bold">Time Slot:</span><span className="font-mono">{confirmModal.slot.timeFrom} — {confirmModal.slot.timeTo}</span></div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  {SECTIONS.map((sec) => (
                    <div key={sec.key} className={`rounded-md ${sec.bgColor} px-2 py-1.5 opacity-${confirmModal.slot[sec.key] > 0 && !confirmModal.slot.lockedFields[sec.key] ? '100' : '50'}`}>
                      <p className="text-[9px] uppercase font-bold text-slate-500">{sec.label}</p>
                      <p className={`text-base font-black ${sec.color}`}>{confirmModal.slot[sec.key] || 0}</p>
                    </div>
                  ))}
                </div>
              </div>

              <p className="mb-5 text-sm text-slate-600">Once submitted, <b>only the fields with values</b> will be locked. Empty fields will remain open for edits.</p>

              <div className="flex gap-2">
                <button onClick={() => setConfirmModal(null)} disabled={isSaving} className="flex-1 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">Cancel</button>
                <button onClick={confirmSubmitRow} disabled={isSaving || isOverLimit} className="flex-1 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-teal-700 disabled:opacity-50 flex items-center justify-center gap-2">
                  {isSaving ? 'Saving...' : (<><Save className="h-4 w-4" /> Save to DB</>)}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}