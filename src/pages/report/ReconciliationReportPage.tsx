import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  FileSpreadsheet,
  Printer,
  RefreshCw,
  RotateCcw,
  Save,
} from 'lucide-react';

import { API, getAuthHeaders } from '../../api/client';

const NO_SCHEDULE_KEY = '__NO_SCHEDULE__';
const MANUAL_STORAGE_KEY = 'cp-reconciliation-manual-entries-v2';

// Put the real logo in public/cp-logo.png, or change this path.
const COMPANY_LOGO_SRC = '/cp-logo.png';
const COMPANY_NAME = 'COLOUR PLUS PRINTING SYSTEMS (PVT) LTD';
const REPORT_TITLE = 'RECONCILIATION REPORT';

interface ReconciliationStoreInCut {
  id: string;
  cutNo: string;
  cutQty: number;
  submissionId: string;
}

interface ReconciliationStoreInRecord {
  id: string;
  submissionId: string;
  revisionNo: number;
  styleNo: string;
  customerName: string;
  bodyColour: string;
  printColour: string;
  components: string;
  season: string;
  inAdNo: string;
  scheduleNo: string;
  jobNo: string;
  cutInDate: string;
  inQty: number;
  totalCutQty: number;
  cuts: ReconciliationStoreInCut[];
}

interface ReconciliationAdviceRow {
  colour: string;
  bundleNo: string;
  size: string;
  cutForm: string;
  component: string;
  totalPcs: number;
  pd: number;
  fd: number;
  goodQty: number;
}

interface ReconciliationAdviceNoteRecord {
  id: string;
  storeInRecordId: string;
  submissionId: string;
  revisionNo: number;
  adviceNoteAdNo: string;
  deliveryDate: string;
  customerName: string;
  styleNo: string;
  scheduleNo: string;
  jobNo: string;
  cutNo: string;
  component: string;
  dispatchQty: number;
  rows: Record<string, ReconciliationAdviceRow>;
}

interface ReconciliationSourceResponse {
  storeIns: ReconciliationStoreInRecord[];
  adviceNotes: ReconciliationAdviceNoteRecord[];
}

interface ReceivedRow {
  date: string;
  adNo: string;
  jobNo: string;
  cutNo: string;
  qty: number;
  runningTotal: number;
}

interface SentRow {
  key: string;
  date: string;
  adNo: string;
  jobNo: string;
  cutNo: string;
  total: number;
  pd: number;
  fd: number;
  sampleTesting: number;
  rtn: number;
  goodQty: number;
  goodTotal: number;
}

interface ManualEntry {
  sampleTesting: number;
  rtn: number;
}

function uniq(values: string[]) {
  return Array.from(new Set(values.map(v => (v || '').trim()).filter(Boolean))).sort();
}

function same(a?: string, b?: string) {
  return (a || '').trim().toLowerCase() === (b || '').trim().toLowerCase();
}

function num(value: unknown) {
  const parsed = typeof value === 'number' ? value : parseInt(String(value || '0'), 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatQty(value?: number) {
  if (value === undefined || value === null) return '';
  return value.toLocaleString();
}

// Compatible with older TS lib targets. Do not use String.replaceAll here.
function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getLastNumber<T extends { [key: string]: any }>(rows: T[], field: keyof T) {
  if (rows.length === 0) return 0;
  return num(rows[rows.length - 1][field]);
}

// Preserve Advice Note row order exactly as saved: row_0, row_1, row_2...
function getAdviceRowsInSavedOrder(rows?: Record<string, ReconciliationAdviceRow>): ReconciliationAdviceRow[] {
  if (!rows) return [];

  return Object.entries(rows)
    .map(([key, row], fallbackIndex) => {
      const match = key.match(/^row_(\d+)$/);
      return {
        row,
        order: match ? parseInt(match[1], 10) : Number.MAX_SAFE_INTEGER + fallbackIndex,
      };
    })
    .sort((a, b) => a.order - b.order)
    .map(item => item.row);
}

function getStoreInMatches(
  storeInRecords: ReconciliationStoreInRecord[],
  customer: string,
  styleNo: string,
  component: string,
  schedule: string,
  hasRealSchedules: boolean
) {
  if (!customer || !styleNo || !component) return [];

  const base = storeInRecords.filter(record =>
    same(record.customerName, customer) &&
    same(record.styleNo, styleNo) &&
    same(record.components, component)
  );

  if (hasRealSchedules) {
    if (!schedule) return [];

    if (schedule === NO_SCHEDULE_KEY) {
      return base.filter(record => !(record.scheduleNo || '').trim());
    }

    return base.filter(record => same(record.scheduleNo, schedule));
  }

  // If a selected style/component has no schedules, do not force schedule logic.
  return base;
}

export default function ReconciliationReportPage() {
  const [storeInRecords, setStoreInRecords] = useState<ReconciliationStoreInRecord[]>([]);
  const [adviceNotes, setAdviceNotes] = useState<ReconciliationAdviceNoteRecord[]>([]);

  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('');
  const [selectedComponent, setSelectedComponent] = useState('');
  const [selectedSchedule, setSelectedSchedule] = useState('');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [poNo, setPoNo] = useState('');

  const [manualEntries, setManualEntries] = useState<Record<string, ManualEntry>>({});
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSavingReport, setIsSavingReport] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(MANUAL_STORAGE_KEY);
      if (raw) setManualEntries(JSON.parse(raw));
    } catch {
      localStorage.removeItem(MANUAL_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(MANUAL_STORAGE_KEY, JSON.stringify(manualEntries));
    } catch {
      // Ignore browser storage issues. It should not break the report.
    }
  }, [manualEntries]);

  const loadData = async () => {
    setLoading(true);
    setPageError('');
    setSuccessMsg('');

    try {
      const res = await fetch(`${API.BASE}/api/reconciliation/report-source`, {
        headers: getAuthHeaders(),
      });

      if (!res.ok) {
        throw new Error(await res.text() || 'Failed to fetch reconciliation source.');
      }

      const data: ReconciliationSourceResponse = await res.json();
      setStoreInRecords(data.storeIns || []);
      setAdviceNotes(data.adviceNotes || []);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Failed to load reconciliation data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const customerOptions = useMemo(
    () => uniq(storeInRecords.map(record => record.customerName)),
    [storeInRecords]
  );

  const styleOptions = useMemo(() => {
    if (!selectedCustomer) return [];
    return uniq(
      storeInRecords
        .filter(record => same(record.customerName, selectedCustomer))
        .map(record => record.styleNo)
    );
  }, [storeInRecords, selectedCustomer]);

  const componentOptions = useMemo(() => {
    if (!selectedCustomer || !selectedStyle) return [];
    return uniq(
      storeInRecords
        .filter(record =>
          same(record.customerName, selectedCustomer) &&
          same(record.styleNo, selectedStyle)
        )
        .map(record => record.components)
    );
  }, [storeInRecords, selectedCustomer, selectedStyle]);

  const scheduleContextRecords = useMemo(() => {
    if (!selectedCustomer || !selectedStyle || !selectedComponent) return [];
    return storeInRecords.filter(record =>
      same(record.customerName, selectedCustomer) &&
      same(record.styleNo, selectedStyle) &&
      same(record.components, selectedComponent)
    );
  }, [storeInRecords, selectedCustomer, selectedStyle, selectedComponent]);

  const scheduleOptions = useMemo(
    () => uniq(scheduleContextRecords.map(record => record.scheduleNo)),
    [scheduleContextRecords]
  );

  const hasNoScheduleRows = useMemo(
    () => scheduleContextRecords.some(record => !(record.scheduleNo || '').trim()),
    [scheduleContextRecords]
  );

  const hasRealSchedules = scheduleOptions.length > 0;

  const matchingStoreIns = useMemo(
    () => getStoreInMatches(
      storeInRecords,
      selectedCustomer,
      selectedStyle,
      selectedComponent,
      selectedSchedule,
      hasRealSchedules
    ),
    [storeInRecords, selectedCustomer, selectedStyle, selectedComponent, selectedSchedule, hasRealSchedules]
  );

  const storeInById = useMemo(() => {
    const map = new Map<string, ReconciliationStoreInRecord>();
    storeInRecords.forEach(record => map.set(record.id, record));
    return map;
  }, [storeInRecords]);

  const reportMeta = useMemo(() => {
    const first = matchingStoreIns[0];

    const colours = uniq(
      matchingStoreIns.reduce<string[]>((arr, record) => {
        arr.push(record.bodyColour || '');
        arr.push(record.printColour || '');
        return arr;
      }, [])
    );

    const jobNos = uniq(matchingStoreIns.map(record => record.jobNo || '')).join(', ');

    return {
      customer: selectedCustomer,
      styleNo: selectedStyle,
      component: selectedComponent,
      scheduleNo:
        hasRealSchedules
          ? selectedSchedule === NO_SCHEDULE_KEY
            ? ''
            : selectedSchedule
          : '',
      jobNos,
      invoiceNo: invoiceNo.trim(),
      poNo: poNo.trim(),
      colour: colours.join(' / ') || first?.bodyColour || '',
    };
  }, [matchingStoreIns, selectedCustomer, selectedStyle, selectedComponent, selectedSchedule, hasRealSchedules, invoiceNo, poNo]);

  const receivedRows = useMemo<ReceivedRow[]>(() => {
    let runningTotal = 0;
    const rows: ReceivedRow[] = [];

    const records = [...matchingStoreIns].sort((a, b) => {
      const dateDiff = (a.cutInDate || '').localeCompare(b.cutInDate || '');
      if (dateDiff !== 0) return dateDiff;
      return (a.inAdNo || '').localeCompare(b.inAdNo || '', undefined, { numeric: true });
    });

    records.forEach(record => {
      (record.cuts || []).forEach(cut => {
        runningTotal += num(cut.cutQty);

        rows.push({
          date: record.cutInDate || '',
          adNo: record.inAdNo || '',
          jobNo: record.jobNo || '',
          cutNo: cut.cutNo || '',
          qty: num(cut.cutQty),
          runningTotal,
        });
      });
    });

    return rows;
  }, [matchingStoreIns]);

  const sentRows = useMemo<SentRow[]>(() => {
    const matchingStoreInIds = new Set(matchingStoreIns.map(record => record.id));

    const notes = adviceNotes
      .filter(note => matchingStoreInIds.has(note.storeInRecordId))
      .sort((a, b) => {
        const dateDiff = (a.deliveryDate || '').localeCompare(b.deliveryDate || '');
        if (dateDiff !== 0) return dateDiff;

        const storeA = storeInById.get(a.storeInRecordId);
        const storeB = storeInById.get(b.storeInRecordId);
        return (storeA?.inAdNo || '').localeCompare(storeB?.inAdNo || '', undefined, { numeric: true });
      });

    const baseRows: Array<Omit<SentRow, 'sampleTesting' | 'rtn' | 'goodQty' | 'goodTotal'>> = [];

    notes.forEach(note => {
      const adviceNoteAdNo = note.adviceNoteAdNo || '';

      const rows = getAdviceRowsInSavedOrder(note.rows);
      const groupedByCut = new Map<string, { total: number; pd: number; fd: number }>();

      rows.forEach(row => {
        const cutNo = row.cutForm || note.cutNo || '';
        const existing = groupedByCut.get(cutNo) || { total: 0, pd: 0, fd: 0 };

        groupedByCut.set(cutNo, {
          total: existing.total + num(row.totalPcs),
          pd: existing.pd + num(row.pd),
          fd: existing.fd + num(row.fd),
        });
      });

      groupedByCut.forEach((value, cutNo) => {
        baseRows.push({
          key: `${note.id}|||${cutNo}`,
          date: note.deliveryDate || '',
          adNo: adviceNoteAdNo, // Gatepass / Advice Note AD No printed on the bill.
          jobNo: note.jobNo || '',
          cutNo,
          total: value.total,
          pd: value.pd,
          fd: value.fd,
        });
      });
    });

    let runningGoodTotal = 0;

    return baseRows.map(row => {
      const manual = manualEntries[row.key] || { sampleTesting: 0, rtn: 0 };
      const sampleTesting = num(manual.sampleTesting);
      const rtn = num(manual.rtn);
      const goodQty = Math.max(0, row.total - row.pd - row.fd - sampleTesting - rtn);
      runningGoodTotal += goodQty;

      return {
        ...row,
        sampleTesting,
        rtn,
        goodQty,
        goodTotal: runningGoodTotal,
      };
    });
  }, [adviceNotes, matchingStoreIns, storeInById, manualEntries]);

  const maxRows = Math.max(receivedRows.length, sentRows.length);

  const showJobNoColumns = useMemo(
    () => [...receivedRows, ...sentRows].some(row => (row.jobNo || '').trim()),
    [receivedRows, sentRows]
  );

  const totals = useMemo(() => ({
    receivedQty: receivedRows.reduce((sum, row) => sum + row.qty, 0),
    sentTotal: sentRows.reduce((sum, row) => sum + row.total, 0),
    pd: sentRows.reduce((sum, row) => sum + row.pd, 0),
    fd: sentRows.reduce((sum, row) => sum + row.fd, 0),
    sampleTesting: sentRows.reduce((sum, row) => sum + row.sampleTesting, 0),
    rtn: sentRows.reduce((sum, row) => sum + row.rtn, 0),
    goodQty: sentRows.reduce((sum, row) => sum + row.goodQty, 0),
  }), [receivedRows, sentRows]);

  const lastReceivedRunningTotal = getLastNumber(receivedRows, 'runningTotal');
  const lastSentGoodTotal = getLastNumber(sentRows, 'goodTotal');

  const reportReady = !!selectedCustomer && !!selectedStyle && !!selectedComponent && (!hasRealSchedules || !!selectedSchedule);

  const updateManualEntry = (rowKey: string, field: keyof ManualEntry, value: string) => {
    const parsed = Math.max(0, parseInt(value || '0', 10) || 0);

    setManualEntries(prev => ({
      ...prev,
      [rowKey]: {
        sampleTesting: prev[rowKey]?.sampleTesting || 0,
        rtn: prev[rowKey]?.rtn || 0,
        [field]: parsed,
      },
    }));
  };

  const resetFilters = () => {
    setSelectedCustomer('');
    setSelectedStyle('');
    setSelectedComponent('');
    setSelectedSchedule('');
    setInvoiceNo('');
    setPoNo('');
  };

  const clearCurrentReportAfterSave = () => {
    const currentSentRowKeys = new Set(sentRows.map(row => row.key));

    // Clear only the manual values used by the report that was just saved.
    // This keeps old saved report data untouched and prevents the same report
    // from being saved again by mistake.
    if (currentSentRowKeys.size > 0) {
      setManualEntries(prev => {
        const next = { ...prev };
        currentSentRowKeys.forEach(key => { delete next[key]; });
        return next;
      });
    }

    setSelectedCustomer('');
    setSelectedStyle('');
    setSelectedComponent('');
    setSelectedSchedule('');
    setInvoiceNo('');
    setPoNo('');
  };


  const buildSavedRows = () => {
    const rows = [];

    for (let index = 0; index < maxRows; index += 1) {
      const received = receivedRows[index];
      const sent = sentRows[index];

      rows.push({
        receivedDate: received?.date || '',
        receivedAdNo: received?.adNo || '',
        receivedJobNo: received?.jobNo || '',
        receivedCutNo: received?.cutNo || '',
        receivedQty: received ? received.qty : null,
        receivedRunningTotal: received ? received.runningTotal : null,

        sentDate: sent?.date || '',
        sentAdNo: sent?.adNo || '',
        sentJobNo: sent?.jobNo || '',
        sentCutNo: sent?.cutNo || '',
        sentTotal: sent ? sent.total : null,
        pd: sent ? sent.pd : null,
        fd: sent ? sent.fd : null,
        sampleTesting: sent ? sent.sampleTesting : null,
        rtn: sent ? sent.rtn : null,
        goodQty: sent ? sent.goodQty : null,
        goodTotal: sent ? sent.goodTotal : null,
      });
    }

    return rows;
  };

  const saveReport = async () => {
    if (!reportReady || maxRows === 0) return;

    setIsSavingReport(true);
    setPageError('');
    setSuccessMsg('');

    try {
      const today = new Date().toISOString().split('T')[0];
      const payload = {
        customerName: reportMeta.customer,
        styleNo: reportMeta.styleNo,
        component: reportMeta.component,
        scheduleNo: reportMeta.scheduleNo || '',
        jobNos: reportMeta.jobNos || '',
        invoiceNo: reportMeta.invoiceNo || '',
        poNo: reportMeta.poNo || '',
        colour: reportMeta.colour || '',
        reportDate: today,
        totals: {
          receivedQty: totals.receivedQty,
          sentTotal: totals.sentTotal,
          pdTotal: totals.pd,
          fdTotal: totals.fd,
          sampleTestingTotal: totals.sampleTesting,
          rtnTotal: totals.rtn,
          goodQtyTotal: totals.goodQty,
        },
        rows: buildSavedRows(),
      };

      const res = await fetch(`${API.BASE}/api/reconciliation/saved`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(await res.text() || 'Failed to save reconciliation report.');
      }

      setSuccessMsg('Reconciliation report saved successfully. You can access it from the Reconciliation Report Search page.');
      clearCurrentReportAfterSave();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      window.setTimeout(() => setSuccessMsg(''), 5000);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Failed to save reconciliation report.');
    } finally {
      setIsSavingReport(false);
    }
  };

  const printReport = () => {
    if (!reportReady) return;

    const printTotalColumns = showJobNoColumns ? 17 : 15;
    const printReceivedColSpan = showJobNoColumns ? 6 : 5;
    const printSentColSpan = showJobNoColumns ? 11 : 10;
    const printReceivedTotalColSpan = showJobNoColumns ? 4 : 3;
    const printSentTotalColSpan = showJobNoColumns ? 4 : 3;

    const printColGroup = showJobNoColumns
      ? `<colgroup>
      <col style="width: 5.8%" /><col style="width: 5.8%" /><col style="width: 5.8%" /><col style="width: 5.8%" /><col style="width: 4.8%" /><col style="width: 5.2%" />
      <col style="width: 5.8%" /><col style="width: 5.8%" /><col style="width: 5.8%" /><col style="width: 5.8%" /><col style="width: 4.8%" />
      <col style="width: 4.2%" /><col style="width: 4.2%" /><col style="width: 8%" /><col style="width: 4.2%" /><col style="width: 6.2%" /><col style="width: 6.2%" />
    </colgroup>`
      : `<colgroup>
      <col style="width: 6.5%" /><col style="width: 6.5%" /><col style="width: 6.5%" /><col style="width: 5.5%" /><col style="width: 6%" />
      <col style="width: 6.5%" /><col style="width: 6.5%" /><col style="width: 6.5%" /><col style="width: 5.5%" /><col style="width: 4.5%" />
      <col style="width: 4.5%" /><col style="width: 9%" /><col style="width: 4.5%" /><col style="width: 7%" /><col style="width: 7%" />
    </colgroup>`;

    const rows: string[] = [];
    for (let index = 0; index < maxRows; index += 1) {
      const received = receivedRows[index];
      const sent = sentRows[index];

      rows.push(`<tr>
        <td>${escapeHtml(received?.date || '')}</td>
        <td>${escapeHtml(received?.adNo || '')}</td>
        ${showJobNoColumns ? `<td>${escapeHtml(received?.jobNo || '')}</td>` : ''}
        <td>${escapeHtml(received?.cutNo || '')}</td>
        <td class="num">${received ? formatQty(received.qty) : ''}</td>
        <td class="num bold">${received ? formatQty(received.runningTotal) : ''}</td>

        <td>${escapeHtml(sent?.date || '')}</td>
        <td>${escapeHtml(sent?.adNo || '')}</td>
        ${showJobNoColumns ? `<td>${escapeHtml(sent?.jobNo || '')}</td>` : ''}
        <td>${escapeHtml(sent?.cutNo || '')}</td>
        <td class="num">${sent ? formatQty(sent.total) : ''}</td>
        <td class="num">${sent ? formatQty(sent.pd) : ''}</td>
        <td class="num">${sent ? formatQty(sent.fd) : ''}</td>
        <td class="num">${sent ? formatQty(sent.sampleTesting) : ''}</td>
        <td class="num">${sent ? formatQty(sent.rtn) : ''}</td>
        <td class="num bold">${sent ? formatQty(sent.goodQty) : ''}</td>
        <td class="num bold">${sent ? formatQty(sent.goodTotal) : ''}</td>
      </tr>`);
    }

    const rowHtml = rows.join('') || `<tr><td colspan="${printTotalColumns}" class="center">No rows found for selected scope.</td></tr>`;

    const html = `<!DOCTYPE html>
<html>
<head>
  <title>${escapeHtml(REPORT_TITLE)} - ${escapeHtml(reportMeta.styleNo)}</title>
  <style>
    @page { size: A4 landscape; margin: 8mm; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: Arial, Helvetica, sans-serif; color: #111; font-size: 9px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .header { display: flex; justify-content: center; align-items: center; gap: 16px; margin-bottom: 8px; }
    .logo-box { width: 62px; height: 48px; border: 1px solid #222; display: flex; align-items: center; justify-content: center; font-size: 9px; font-weight: 800; text-align: center; line-height: 1.1; }
    .logo-box img { max-width: 100%; max-height: 100%; object-fit: contain; }
    .title { text-align: left; line-height: 1.25; }
    .title .company { font-size: 13px; font-weight: 800; letter-spacing: .02em; }
    .title .report { font-size: 13px; font-weight: 800; text-transform: uppercase; }
    .meta { display: grid; grid-template-columns: 80px 220px 70px 180px 90px 1fr; gap: 4px 8px; margin: 10px 0 8px; font-size: 9px; align-items: end; }
    .label { font-weight: 700; text-transform: uppercase; }
    .value { border-bottom: 1px solid #444; min-height: 14px; padding: 1px 3px; font-weight: 700; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; border: 1px solid #111; }
    th, td { border: 1px solid #222; padding: 3px 4px; vertical-align: middle; overflow-wrap: anywhere; }
    th { text-align: center; font-weight: 900; text-transform: uppercase; background: #efefef; font-size: 8px; }
    .section { background: #e6e6e6; font-size: 9px; letter-spacing: .02em; }
    .num { text-align: right; }
    .center { text-align: center; }
    .bold { font-weight: 900; }
    tfoot td { font-weight: 900; background: #f4f4f4; }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo-box"><img src="${escapeHtml(COMPANY_LOGO_SRC)}" onerror="this.style.display='none'; this.parentElement.innerHTML='CP<br/>LOGO';" /></div>
    <div class="title"><div class="company">${escapeHtml(COMPANY_NAME)}</div><div class="report">${escapeHtml(REPORT_TITLE)}</div></div>
  </div>

  <div class="meta">
    <div class="label">Customer</div><div class="value">${escapeHtml(reportMeta.customer)}</div>
    <div class="label">Colour</div><div class="value">${escapeHtml(reportMeta.colour)}</div>
    <div class="label">Component</div><div class="value">${escapeHtml(reportMeta.component)}</div>
    <div class="label">Style No</div><div class="value">${escapeHtml(reportMeta.styleNo)}</div>
    <div class="label">Schedule No</div><div class="value">${escapeHtml(reportMeta.scheduleNo || '(No Schedule)')}</div>
    <div class="label">Job No(s)</div><div class="value">${escapeHtml(reportMeta.jobNos || '—')}</div>
    <div class="label">Invoice No</div><div class="value">${escapeHtml(reportMeta.invoiceNo || '—')}</div>
    <div class="label">PO No</div><div class="value">${escapeHtml(reportMeta.poNo || '—')}</div>
  </div>

  <table>
    ${printColGroup}
    <thead>
      <tr><th class="section" colspan="${printReceivedColSpan}">Received Details</th><th class="section" colspan="${printSentColSpan}">Sent Details</th></tr>
      <tr>
        <th>Date</th><th>AD No</th>${showJobNoColumns ? '<th>Job No</th>' : ''}<th>Cut No</th><th>Qty</th><th>Total</th>
        <th>Date</th><th>AD No</th>${showJobNoColumns ? '<th>Job No</th>' : ''}<th>Cut No</th><th>Total</th><th>PD</th><th>FD</th><th>Sample / Testing</th><th>RTN</th><th>Good Qty</th><th>Good Total</th>
      </tr>
    </thead>
    <tbody>${rowHtml}</tbody>
    <tfoot>
      <tr>
        <td colspan="${printReceivedTotalColSpan}" class="num">TOTAL</td><td class="num">${formatQty(totals.receivedQty)}</td><td class="num">${formatQty(lastReceivedRunningTotal)}</td>
        <td colspan="${printSentTotalColSpan}" class="num">TOTAL</td><td class="num">${formatQty(totals.sentTotal)}</td><td class="num">${formatQty(totals.pd)}</td><td class="num">${formatQty(totals.fd)}</td><td class="num">${formatQty(totals.sampleTesting)}</td><td class="num">${formatQty(totals.rtn)}</td><td class="num">${formatQty(totals.goodQty)}</td><td class="num">${formatQty(lastSentGoodTotal)}</td>
      </tr>
    </tfoot>
  </table>
</body>
</html>`;

    const oldFrame = document.getElementById('reconciliation-print-frame') as HTMLIFrameElement | null;
    if (oldFrame) oldFrame.remove();

    const frame = document.createElement('iframe');
    frame.id = 'reconciliation-print-frame';
    frame.style.cssText = 'position:fixed;top:-10000px;left:-10000px;width:1600px;height:1000px;';
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
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-7xl space-y-6 pb-12">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div className="flex items-center space-x-3">
          <div className="rounded-lg bg-amber-100 p-2"><FileSpreadsheet className="h-6 w-6 text-amber-700" /></div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Reconciliation Report</h2>
            <p className="text-sm text-slate-500">Compare Store-In received details with Gatepass sent details.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={loadData} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"><RefreshCw className="h-4 w-4" />Refresh</button>
          <button type="button" onClick={saveReport} disabled={!reportReady || maxRows === 0 || isSavingReport} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"><Save className="h-4 w-4" />{isSavingReport ? 'Saving...' : 'Save'}</button>
          <button type="button" onClick={printReport} disabled={!reportReady} className="inline-flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"><Printer className="h-4 w-4" />Print</button>
        </div>
      </div>

      {pageError && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600"><AlertCircle className="mr-1 inline h-4 w-4" />{pageError}</div>}
      {successMsg && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{successMsg}</div>}

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Report Scope</p>
            <p className="text-sm text-slate-500">Select customer, style, component and schedule if available.</p>
          </div>
          <button type="button" onClick={resetFilters} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100"><RotateCcw className="h-3.5 w-3.5" />Clear</button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-600">Customer</label>
            <select value={selectedCustomer} onChange={(event) => { setSelectedCustomer(event.target.value); setSelectedStyle(''); setSelectedComponent(''); setSelectedSchedule(''); }} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-500">
              <option value="">Select customer...</option>
              {customerOptions.map(customer => <option key={customer} value={customer}>{customer}</option>)}
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-600">Style No</label>
            <select value={selectedStyle} onChange={(event) => { setSelectedStyle(event.target.value); setSelectedComponent(''); setSelectedSchedule(''); }} disabled={!selectedCustomer} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-500 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400">
              <option value="">{selectedCustomer ? 'Select style...' : 'Select customer first...'}</option>
              {styleOptions.map(style => <option key={style} value={style}>{style}</option>)}
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-600">Component</label>
            <select value={selectedComponent} onChange={(event) => { setSelectedComponent(event.target.value); setSelectedSchedule(''); }} disabled={!selectedStyle} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-500 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400">
              <option value="">{selectedStyle ? 'Select component...' : 'Select style first...'}</option>
              {componentOptions.map(component => <option key={component} value={component}>{component}</option>)}
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-600">Schedule No {hasRealSchedules ? <span className="text-red-500">*</span> : <span className="text-slate-400">(not available)</span>}</label>
            <select value={selectedSchedule} onChange={(event) => setSelectedSchedule(event.target.value)} disabled={!selectedComponent || !hasRealSchedules} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-500 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400">
              <option value="">{!selectedComponent ? 'Select component first...' : hasRealSchedules ? 'Select schedule...' : 'No schedule available'}</option>
              {scheduleOptions.map(schedule => <option key={schedule} value={schedule}>{schedule}</option>)}
              {hasRealSchedules && hasNoScheduleRows && <option value={NO_SCHEDULE_KEY}>No Schedule</option>}
            </select>
          </div>
        </div>

        {selectedComponent && (
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-1 xl:col-span-2">
              <label className="block text-xs font-medium text-slate-600">Job No(s)</label>
              <input
                type="text"
                readOnly
                value={hasRealSchedules && !selectedSchedule ? 'Select schedule first...' : reportMeta.jobNos || '—'}
                className="w-full cursor-default rounded-lg border border-slate-300 bg-slate-100 px-3 py-2.5 text-sm font-medium text-slate-700 outline-none"
              />
              <p className="text-[11px] text-slate-400">
                One Schedule No can include multiple Job Nos. The report includes all Job Nos under the selected Schedule No.
              </p>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-600">Invoice No</label>
              <input
                type="text"
                value={invoiceNo}
                onChange={(event) => setInvoiceNo(event.target.value)}
                placeholder="Enter invoice no..."
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-600">PO No</label>
              <input
                type="text"
                value={poNo}
                onChange={(event) => setPoNo(event.target.value)}
                placeholder="Enter PO no..."
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>
        )}
      </div>

      {!reportReady && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 py-14 text-center">
          <FileSpreadsheet className="mx-auto mb-3 h-12 w-12 text-slate-300" />
          <p className="text-sm font-medium text-slate-500">Select the report scope to generate the reconciliation table.</p>
          {selectedComponent && hasRealSchedules && !selectedSchedule && <p className="mt-1 text-xs text-amber-600">This style/component has schedule numbers, so choose a Schedule No before generating the report.</p>}
        </div>
      )}

      {reportReady && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-black uppercase tracking-wide text-slate-900">{COMPANY_NAME}</p>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{REPORT_TITLE}</p>
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-slate-600 md:grid-cols-4 xl:grid-cols-8">
                <span><b>Customer:</b> {reportMeta.customer}</span>
                <span><b>Style:</b> {reportMeta.styleNo}</span>
                <span><b>Component:</b> {reportMeta.component}</span>
                <span><b>Schedule:</b> {reportMeta.scheduleNo || '(No Schedule)'}</span>
                <span><b>Job No(s):</b> {reportMeta.jobNos || '-'}</span>
                <span><b>Invoice No:</b> {reportMeta.invoiceNo || '-'}</span>
                <span><b>PO No:</b> {reportMeta.poNo || '-'}</span>
                <span><b>Colour:</b> {reportMeta.colour || '-'}</span>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto p-4">
            <table className="w-max min-w-full border-collapse text-xs">
              <thead>
                <tr>
                  <th colSpan={showJobNoColumns ? 6 : 5} className="border border-slate-300 bg-slate-100 px-2 py-2 text-center text-[11px] font-black uppercase text-slate-700">Received Details</th>
                  <th colSpan={showJobNoColumns ? 11 : 10} className="border border-slate-300 bg-slate-100 px-2 py-2 text-center text-[11px] font-black uppercase text-slate-700">Sent Details</th>
                </tr>
                <tr className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
                  <th className="border border-slate-300 px-2 py-2">Date</th><th className="border border-slate-300 px-2 py-2">AD No</th>{showJobNoColumns && <th className="border border-slate-300 px-2 py-2">Job No</th>}<th className="border border-slate-300 px-2 py-2">Cut No</th><th className="border border-slate-300 px-2 py-2 text-right">Qty</th><th className="border border-slate-300 px-2 py-2 text-right">Total</th>
                  <th className="border border-slate-300 px-2 py-2">Date</th><th className="border border-slate-300 px-2 py-2">AD No</th>{showJobNoColumns && <th className="border border-slate-300 px-2 py-2">Job No</th>}<th className="border border-slate-300 px-2 py-2">Cut No</th><th className="border border-slate-300 px-2 py-2 text-right">Total</th><th className="border border-slate-300 px-2 py-2 text-right">PD</th><th className="border border-slate-300 px-2 py-2 text-right">FD</th><th className="border border-slate-300 px-2 py-2 text-right">Sample/Testing</th><th className="border border-slate-300 px-2 py-2 text-right">RTN</th><th className="border border-slate-300 px-2 py-2 text-right">Good Qty</th><th className="border border-slate-300 px-2 py-2 text-right">Good Total</th>
                </tr>
              </thead>

              <tbody>
                {maxRows === 0 ? (
                  <tr><td colSpan={showJobNoColumns ? 17 : 15} className="border border-slate-200 px-4 py-12 text-center text-slate-400">No received or sent rows found for this selected scope.</td></tr>
                ) : (
                  Array.from({ length: maxRows }).map((_, index) => {
                    const received = receivedRows[index];
                    const sent = sentRows[index];
                    return (
                      <tr key={index} className="hover:bg-slate-50">
                        <td className="border border-slate-200 px-2 py-1.5">{received?.date || ''}</td><td className="border border-slate-200 px-2 py-1.5 font-medium">{received?.adNo || ''}</td>{showJobNoColumns && <td className="border border-slate-200 px-2 py-1.5 font-medium text-slate-700">{received?.jobNo || ''}</td>}<td className="border border-slate-200 px-2 py-1.5">{received?.cutNo || ''}</td><td className="border border-slate-200 px-2 py-1.5 text-right font-medium">{received ? formatQty(received.qty) : ''}</td><td className="border border-slate-200 px-2 py-1.5 text-right font-black">{received ? formatQty(received.runningTotal) : ''}</td>
                        <td className="border border-slate-200 px-2 py-1.5">{sent?.date || ''}</td><td className="border border-slate-200 px-2 py-1.5 font-medium">{sent?.adNo || ''}</td>{showJobNoColumns && <td className="border border-slate-200 px-2 py-1.5 font-medium text-slate-700">{sent?.jobNo || ''}</td>}<td className="border border-slate-200 px-2 py-1.5">{sent?.cutNo || ''}</td><td className="border border-slate-200 px-2 py-1.5 text-right font-medium">{sent ? formatQty(sent.total) : ''}</td><td className="border border-slate-200 px-2 py-1.5 text-right text-red-700">{sent ? formatQty(sent.pd) : ''}</td><td className="border border-slate-200 px-2 py-1.5 text-right text-amber-700">{sent ? formatQty(sent.fd) : ''}</td>
                        <td className="border border-slate-200 px-1 py-1 text-right">{sent ? <input type="number" min={0} value={sent.sampleTesting === 0 ? '' : sent.sampleTesting} onChange={(event) => updateManualEntry(sent.key, 'sampleTesting', event.target.value)} className="w-20 rounded border border-slate-200 bg-white px-2 py-1 text-right text-xs font-bold text-slate-700 outline-none focus:ring-1 focus:ring-slate-500" /> : ''}</td>
                        <td className="border border-slate-200 px-1 py-1 text-right">{sent ? <input type="number" min={0} value={sent.rtn === 0 ? '' : sent.rtn} onChange={(event) => updateManualEntry(sent.key, 'rtn', event.target.value)} className="w-16 rounded border border-slate-200 bg-white px-2 py-1 text-right text-xs font-bold text-slate-700 outline-none focus:ring-1 focus:ring-slate-500" /> : ''}</td>
                        <td className="border border-slate-200 px-2 py-1.5 text-right font-black">{sent ? formatQty(sent.goodQty) : ''}</td><td className="border border-slate-200 px-2 py-1.5 text-right font-black">{sent ? formatQty(sent.goodTotal) : ''}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>

              <tfoot>
                <tr className="bg-slate-100 font-black text-slate-800">
                  <td colSpan={showJobNoColumns ? 4 : 3} className="border border-slate-300 px-2 py-2 text-right uppercase">Total</td><td className="border border-slate-300 px-2 py-2 text-right">{formatQty(totals.receivedQty)}</td><td className="border border-slate-300 px-2 py-2 text-right">{formatQty(lastReceivedRunningTotal)}</td>
                  <td colSpan={showJobNoColumns ? 4 : 3} className="border border-slate-300 px-2 py-2 text-right uppercase">Total</td><td className="border border-slate-300 px-2 py-2 text-right">{formatQty(totals.sentTotal)}</td><td className="border border-slate-300 px-2 py-2 text-right text-red-700">{formatQty(totals.pd)}</td><td className="border border-slate-300 px-2 py-2 text-right text-amber-700">{formatQty(totals.fd)}</td><td className="border border-slate-300 px-2 py-2 text-right">{formatQty(totals.sampleTesting)}</td><td className="border border-slate-300 px-2 py-2 text-right">{formatQty(totals.rtn)}</td><td className="border border-slate-300 px-2 py-2 text-right">{formatQty(totals.goodQty)}</td><td className="border border-slate-300 px-2 py-2 text-right">{formatQty(lastSentGoodTotal)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="border-t border-slate-200 px-5 py-3 text-xs text-slate-500">Received Details AD No is taken from Store-In IN-AD No. Sent Details AD No is taken from the Gatepass / Advice Note bill AD No. Job No(s) are grouped under the selected Schedule No.</div>
        </div>
      )}

      {loading && <div className="fixed inset-x-0 bottom-4 mx-auto w-fit rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-lg">Loading reconciliation data...</div>}
    </motion.div>
  );
}