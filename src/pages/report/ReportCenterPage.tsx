import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  ArrowLeft,
  BarChart3,
  BriefcaseBusiness,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  Filter,
  Loader2,
  PieChart as PieIcon,
  Printer,
  RefreshCw,
  TrendingUp,
  Users,
} from 'lucide-react';
import { API, getAuthHeaders } from '../../api/client';

type DepartmentKey = 'Development' | 'Stores' | 'QC' | 'Gatepass' | 'Worker';
type ReportView = 'Overview' | DepartmentKey | 'Users';
type PrintMode = 'summary' | 'summary-details';
type PeriodKey = 'today' | 'this-week' | 'this-month' | 'last-month' | 'this-year' | 'custom';

type MetricCard = {
  label: string;
  value: number;
  note: string;
};

type ChartPoint = {
  label: string;
  value: number;
  value2?: number;
  value3?: number;
  detail?: string;
};

type ReportChart = {
  key: string;
  type: 'bar' | 'pie' | 'line';
  title: string;
  description: string;
  points: ChartPoint[];
};

type DepartmentSummary = {
  section: DepartmentKey;
  title: string;
  primaryMetric: string;
  secondaryMetric: string;
  completedLabel: string;
  completedValue: number;
  pendingLabel: string;
  pendingValue: number;
  completionPercent: number;
  workloadValue: number;
  workloadSharePercent: number;
  performanceScore: number;
};

type DashboardResponse = {
  generatedAt: string;
  dateFrom: string;
  dateTo: string;
  title: string;
  headlineCards: MetricCard[];
  departments: DepartmentSummary[];
  charts: ReportChart[];
};

type ReportColumn = {
  key: string;
  label: string;
  type: 'text' | 'number';
};

type EmployeePerformance = {
  employeeName: string;
  role: string;
  department: string;
  recordCount: number;
  outputQty: number;
  completedQty: number;
  pendingQty: number;
  qualityQty: number;
  defectQty: number;
  score: number;
  basis: string;
};

type AppliedFilter = {
  label: string;
  value: string;
};

type SectionReport = {
  section: DepartmentKey;
  title: string;
  description: string;
  generatedAt: string;
  dateFrom: string;
  dateTo: string;
  metrics: MetricCard[];
  charts: ReportChart[];
  employeeRows: EmployeePerformance[];
  columns: ReportColumn[];
  rows: Record<string, unknown>[];
  page: number;
  pageSize: number;
  totalRows: number;
  totalPages: number;
  notes: string[];
  appliedFilters: AppliedFilter[];
};

type UserReportRow = {
  id: string;
  name: string;
  username: string;
  role: string;
  activityCount: number;
  lastLogin: string;
  lastActivity: string;
};

type FilterOptions = {
  sections: string[];
  roles: string[];
  employees: string[];
  statuses: string[];
  styles: string[];
  customers: string[];
  schedules: string[];
  timeSlots: string[];
};

type Filters = {
  role: string;
  employee: string;
  status: string;
  styleNo: string;
  customer: string;
  scheduleNo: string;
  timeSlot: string;
};

const API_BASE = API.REPORTS;
const SECTIONS: DepartmentKey[] = ['Development', 'Stores', 'QC', 'Gatepass', 'Worker'];
const PAGE_SIZES = [25, 50, 100, 200];
const PRINT_MODES: { value: PrintMode; label: string }[] = [
  { value: 'summary', label: 'Summary only' },
  { value: 'summary-details', label: 'Summary + details' },
];

const EMPTY_FILTERS: Filters = {
  role: '',
  employee: '',
  status: '',
  styleNo: '',
  customer: '',
  scheduleNo: '',
  timeSlot: '',
};

const EMPTY_OPTIONS: FilterOptions = {
  sections: [],
  roles: [],
  employees: [],
  statuses: [],
  styles: [],
  customers: [],
  schedules: [],
  timeSlots: [],
};

const PERIODS: { value: PeriodKey; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'this-week', label: 'This week' },
  { value: 'this-month', label: 'This month' },
  { value: 'last-month', label: 'Last month' },
  { value: 'this-year', label: 'This year' },
  { value: 'custom', label: 'Custom date range' },
];

const CHART_COLORS = ['#1d4ed8', '#059669', '#f59e0b', '#dc2626', '#7c3aed', '#0891b2', '#475569'];

function getColomboDate(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Colombo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const year = parts.find((p) => p.type === 'year')?.value ?? '';
  const month = parts.find((p) => p.type === 'month')?.value ?? '';
  const day = parts.find((p) => p.type === 'day')?.value ?? '';
  return `${year}-${month}-${day}`;
}

function toIso(date: Date) {
  return getColomboDate(date);
}

function getDateRange(period: PeriodKey) {
  const now = new Date();
  const today = new Date(`${getColomboDate(now)}T00:00:00`);
  const day = today.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;

  if (period === 'today') {
    return { from: toIso(today), to: toIso(today) };
  }

  if (period === 'this-week') {
    const start = new Date(today);
    start.setDate(today.getDate() + mondayOffset);
    return { from: toIso(start), to: toIso(today) };
  }

  if (period === 'last-month') {
    const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const end = new Date(today.getFullYear(), today.getMonth(), 0);
    return { from: toIso(start), to: toIso(end) };
  }

  if (period === 'this-year') {
    return { from: `${today.getFullYear()}-01-01`, to: toIso(today) };
  }

  return { from: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`, to: toIso(today) };
}

function toQuery(params: Record<string, string | number | undefined>) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') query.set(key, String(value));
  });
  return query.toString();
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error(await res.text() || `Request failed (${res.status})`);
  return res.json();
}

function formatNumber(value: number | string | undefined | null) {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return String(value ?? '');
  return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

function formatPercent(value: number | string | undefined | null) {
  return `${formatNumber(value)}%`;
}

function valueToText(value: unknown) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') return formatNumber(value);
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}

function clamp(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

function chartSeries(chart: ReportChart) {
  if (chart.key.includes('development')) return ['Created', 'Submitted', 'Approved'];
  if (chart.key.includes('stores')) return ['Received', 'Issued'];
  if (chart.key.includes('qc')) return ['Checked', 'Rejected'];
  if (chart.key.includes('gatepass')) return ['Dispatched', 'Good'];
  if (chart.key.includes('worker')) return ['Output', 'Dispatch'];
  if (chart.key.includes('company')) return ['Styles', 'Store received', 'Dispatched'];
  return ['Value', 'Value 2', 'Value 3'];
}

function activeReportTitle(view: ReportView) {
  if (view === 'Overview') return 'Management Overview';
  if (view === 'Users') return 'All Users Report';
  return `${view} Performance Report`;
}

function FieldLabel({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500">{label}</label>
      {children}
    </div>
  );
}

function SelectField({ value, onChange, options, placeholder, disabled = false }: {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder: string;
  disabled?: boolean;
}) {
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
    >
      <option value="">{placeholder}</option>
      {options.map((option) => <option key={option} value={option}>{option}</option>)}
    </select>
  );
}

function ReportHeader({ title, dateFrom, dateTo, generatedAt }: {
  title: string;
  dateFrom: string;
  dateTo: string;
  generatedAt?: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <img src="/report-header.svg" alt="Colour Plus report header" className="h-14 w-auto object-contain" />
          <div className="min-w-0">
            <h1 className="text-2xl font-black text-slate-950">Colour Plus Printing Systems (Pvt) Ltd</h1>
            <p className="text-sm font-bold text-slate-700">{title}</p>
            <p className="text-xs text-slate-500">Period: {dateFrom} to {dateTo}{generatedAt ? ` · Generated: ${generatedAt}` : ''}</p>
          </div>
        </div>
        <div className="rounded-2xl bg-slate-950 px-5 py-3 text-right text-white">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-300">Official report</p>
          <p className="text-sm font-bold">Management Performance</p>
        </div>
      </div>
    </div>
  );
}

function FilterPanel({
  period,
  dateFrom,
  dateTo,
  view,
  filters,
  options,
  pageSize,
  printMode,
  loading,
  onPeriod,
  onDateFrom,
  onDateTo,
  onView,
  onFilter,
  onPageSize,
  onPrintMode,
  onRefresh,
}: {
  period: PeriodKey;
  dateFrom: string;
  dateTo: string;
  view: ReportView;
  filters: Filters;
  options: FilterOptions;
  pageSize: number;
  printMode: PrintMode;
  loading: boolean;
  onPeriod: (value: PeriodKey) => void;
  onDateFrom: (value: string) => void;
  onDateTo: (value: string) => void;
  onView: (value: ReportView) => void;
  onFilter: (key: keyof Filters, value: string) => void;
  onPageSize: (value: number) => void;
  onPrintMode: (value: PrintMode) => void;
  onRefresh: () => void;
}) {
  const sectionMode = view !== 'Overview' && view !== 'Users';
  const workerMode = view === 'Worker';

  return (
    <div className="screen-only rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2 text-sm font-black text-slate-800">
        <Filter className="h-4 w-4 text-blue-700" />
        Report filters
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
        <FieldLabel label="Period">
          <select
            value={period}
            onChange={(e) => onPeriod(e.target.value as PeriodKey)}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500"
          >
            {PERIODS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </FieldLabel>

        <FieldLabel label="From">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => onDateFrom(e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500"
          />
        </FieldLabel>

        <FieldLabel label="To">
          <input
            type="date"
            value={dateTo}
            onChange={(e) => onDateTo(e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500"
          />
        </FieldLabel>

        <FieldLabel label="Report">
          <select
            value={view}
            onChange={(e) => onView(e.target.value as ReportView)}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="Overview">Management Overview</option>
            {SECTIONS.map((item) => <option key={item} value={item}>{item}</option>)}
            <option value="Users">Users Report</option>
          </select>
        </FieldLabel>

        <FieldLabel label="Role">
          <SelectField value={filters.role} onChange={(v) => onFilter('role', v)} options={options.roles} placeholder="All roles" disabled={!sectionMode && view !== 'Users'} />
        </FieldLabel>

        <FieldLabel label="Employee">
          <SelectField value={filters.employee} onChange={(v) => onFilter('employee', v)} options={options.employees} placeholder="All employees" disabled={!sectionMode} />
        </FieldLabel>

        <FieldLabel label="Status">
          <SelectField value={filters.status} onChange={(v) => onFilter('status', v)} options={options.statuses} placeholder="All statuses" disabled={!sectionMode} />
        </FieldLabel>

        <FieldLabel label="Style No">
          <SelectField value={filters.styleNo} onChange={(v) => onFilter('styleNo', v)} options={options.styles} placeholder="All styles" disabled={!sectionMode} />
        </FieldLabel>

        <FieldLabel label="Customer">
          <SelectField value={filters.customer} onChange={(v) => onFilter('customer', v)} options={options.customers} placeholder="All customers" disabled={!sectionMode} />
        </FieldLabel>

        <FieldLabel label="Schedule">
          <SelectField value={filters.scheduleNo} onChange={(v) => onFilter('scheduleNo', v)} options={options.schedules} placeholder="All schedules" disabled={!sectionMode || view === 'Development'} />
        </FieldLabel>

        <FieldLabel label="Time slot">
          <SelectField value={filters.timeSlot} onChange={(v) => onFilter('timeSlot', v)} options={options.timeSlots} placeholder="All time slots" disabled={!workerMode} />
        </FieldLabel>

        <FieldLabel label="Rows">
          <select
            value={pageSize}
            onChange={(e) => onPageSize(Number(e.target.value))}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500"
          >
            {PAGE_SIZES.map((size) => <option key={size} value={size}>{size}</option>)}
          </select>
        </FieldLabel>

        <FieldLabel label="Print mode">
          <select
            value={printMode}
            onChange={(e) => onPrintMode(e.target.value as PrintMode)}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500"
          >
            {PRINT_MODES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </FieldLabel>

        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Refresh
        </button>

        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800"
        >
          <Printer className="h-4 w-4" />
          Print report
        </button>
      </div>
    </div>
  );
}

function MetricGrid({ cards }: { cards: MetricCard[] }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-6">
      {cards.map((card) => (
        <div key={card.label} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">{card.label}</p>
          <p className="mt-2 text-3xl font-black text-slate-950">{formatNumber(card.value)}</p>
          <p className="mt-1 text-xs font-medium text-slate-500">{card.note}</p>
        </div>
      ))}
    </div>
  );
}

function DepartmentOverview({ departments, onOpen }: { departments: DepartmentSummary[]; onOpen: (section: DepartmentKey) => void }) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
      {departments.map((dept) => (
        <button
          key={dept.section}
          type="button"
          onClick={() => onOpen(dept.section)}
          className="group overflow-hidden rounded-3xl border border-slate-200 bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-lg"
        >
          <div className="border-b border-slate-100 bg-gradient-to-br from-slate-950 to-slate-800 p-5 text-white">
            <p className="text-[10px] font-black uppercase tracking-widest text-blue-200">Department report</p>
            <div className="mt-2 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-2xl font-black">{dept.section}</h3>
                <p className="mt-1 text-sm text-slate-300">{dept.title}</p>
              </div>
              <div className="rounded-2xl bg-white/10 px-4 py-3 text-center">
                <p className="text-[10px] font-black uppercase text-slate-300">Score</p>
                <p className="text-xl font-black">{formatPercent(dept.performanceScore)}</p>
              </div>
            </div>
          </div>

          <div className="p-5">
            <p className="text-sm font-bold text-slate-700">{dept.primaryMetric}</p>
            <p className="text-xs text-slate-500">{dept.secondaryMetric}</p>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <SmallMetric label={dept.completedLabel || 'Completed'} value={formatNumber(dept.completedValue)} />
              <SmallMetric label={dept.pendingLabel || 'Pending'} value={formatNumber(dept.pendingValue)} tone="amber" />
            </div>

            <div className="mt-5 space-y-3">
              <ProgressLine label="Completion" value={dept.completionPercent} />
              <ProgressLine label="Workload share" value={dept.workloadSharePercent} muted />
            </div>

            <p className="mt-4 text-xs font-black text-blue-600 group-hover:text-blue-700">Open {dept.section} full report →</p>
          </div>
        </button>
      ))}
    </div>
  );
}

function SmallMetric({ label, value, tone = 'blue' }: { label: string; value: string; tone?: 'blue' | 'amber' }) {
  return (
    <div className={`rounded-2xl px-3 py-3 text-center ${tone === 'amber' ? 'bg-amber-50' : 'bg-blue-50'}`}>
      <p className={`text-[10px] font-black uppercase tracking-wide ${tone === 'amber' ? 'text-amber-700' : 'text-blue-700'}`}>{label}</p>
      <p className="mt-1 text-lg font-black text-slate-900">{value}</p>
    </div>
  );
}

function ProgressLine({ label, value, muted = false }: { label: string; value: number; muted?: boolean }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="font-bold text-slate-500">{label}</span>
        <span className="font-black text-slate-800">{formatPercent(value)}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${muted ? 'bg-slate-500' : 'bg-blue-600'}`} style={{ width: `${clamp(value)}%` }} />
      </div>
    </div>
  );
}

function ChartGrid({ charts }: { charts: ReportChart[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      {charts.map((chart) => <ChartCard key={chart.key || chart.title} chart={chart} />)}
    </div>
  );
}

function ChartCard({ chart }: { chart: ReportChart }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-start gap-3">
        <div className="rounded-2xl bg-blue-50 p-2 text-blue-700">
          {chart.type === 'pie' ? <PieIcon className="h-5 w-5" /> : <BarChart3 className="h-5 w-5" />}
        </div>
        <div>
          <h3 className="text-base font-black text-slate-950">{chart.title}</h3>
          <p className="text-sm text-slate-500">{chart.description}</p>
        </div>
      </div>
      {chart.type === 'line' && <LineChart chart={chart} />}
      {chart.type === 'pie' && <PieChartView chart={chart} />}
      {chart.type === 'bar' && <BarChartView chart={chart} />}
    </div>
  );
}

function BarChartView({ chart }: { chart: ReportChart }) {
  const max = useMemo(() => Math.max(...chart.points.map((p) => Number(p.value) || 0), 1), [chart.points]);

  if (chart.points.length === 0) return <EmptyChart />;

  return (
    <div className="space-y-4">
      {chart.points.map((point, index) => {
        const width = clamp((Number(point.value || 0) / max) * 100);
        return (
          <div key={`${point.label}-${index}`}>
            <div className="mb-1 flex items-center justify-between gap-3 text-sm">
              <span className="font-bold text-slate-700">{point.label}</span>
              <span className="font-black text-slate-950">{formatNumber(point.value)}</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-blue-600" style={{ width: `${width}%` }} />
            </div>
            {point.detail && <p className="mt-1 text-xs text-slate-500">{point.detail}</p>}
          </div>
        );
      })}
    </div>
  );
}

function PieChartView({ chart }: { chart: ReportChart }) {
  const total = chart.points.reduce((sum, item) => sum + (Number(item.value) || 0), 0);
  if (total <= 0) return <EmptyChart />;

  let cursor = 0;
  const gradient = chart.points.map((point, index) => {
    const pct = ((Number(point.value) || 0) / total) * 100;
    const start = cursor;
    const end = cursor + pct;
    cursor = end;
    return `${CHART_COLORS[index % CHART_COLORS.length]} ${start}% ${end}%`;
  }).join(', ');

  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-[190px_1fr] md:items-center">
      <div className="mx-auto h-44 w-44 rounded-full shadow-inner" style={{ background: `conic-gradient(${gradient})` }} />
      <div className="space-y-3">
        {chart.points.map((point, index) => {
          const pct = total ? ((Number(point.value) || 0) / total) * 100 : 0;
          return (
            <div key={`${point.label}-${index}`} className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-3 py-2">
              <div className="flex min-w-0 items-center gap-2">
                <span className="h-3 w-3 rounded-full" style={{ background: CHART_COLORS[index % CHART_COLORS.length] }} />
                <span className="truncate text-sm font-bold text-slate-700">{point.label}</span>
              </div>
              <div className="text-right">
                <p className="text-sm font-black text-slate-950">{formatNumber(point.value)}</p>
                <p className="text-[10px] font-bold text-slate-400">{formatPercent(pct)}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LineChart({ chart }: { chart: ReportChart }) {
  const points = chart.points || [];
  const labels = chartSeries(chart);
  const seriesKeys: (keyof ChartPoint)[] = ['value', 'value2', 'value3'];
  const width = 720;
  const height = 260;
  const padding = { left: 46, right: 18, top: 18, bottom: 42 };
  const values = points.flatMap((p) => seriesKeys.map((key) => Number(p[key]) || 0));
  const max = Math.max(...values, 1);
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  if (points.length === 0) return <EmptyChart />;

  const x = (index: number) => padding.left + (points.length === 1 ? chartWidth / 2 : (index / (points.length - 1)) * chartWidth);
  const y = (value: number) => padding.top + chartHeight - ((value || 0) / max) * chartHeight;
  const pathFor = (key: keyof ChartPoint) => points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${x(idx)} ${y(Number(p[key]) || 0)}`).join(' ');
  const visibleTickIndexes = points.length <= 8
    ? points.map((_, idx) => idx)
    : [0, Math.floor(points.length / 4), Math.floor(points.length / 2), Math.floor(points.length * 0.75), points.length - 1];

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="min-w-[560px]">
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const yy = padding.top + chartHeight - ratio * chartHeight;
          return (
            <g key={ratio}>
              <line x1={padding.left} x2={width - padding.right} y1={yy} y2={yy} stroke="#e2e8f0" strokeWidth="1" />
              <text x={padding.left - 10} y={yy + 4} textAnchor="end" fontSize="10" fill="#64748b">{formatNumber(Math.round(max * ratio))}</text>
            </g>
          );
        })}
        {seriesKeys.map((key, index) => (
          <path key={key} d={pathFor(key)} fill="none" stroke={CHART_COLORS[index]} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        ))}
        {points.map((point, index) => seriesKeys.map((key, seriesIndex) => (
          <circle key={`${index}-${key}`} cx={x(index)} cy={y(Number(point[key]) || 0)} r="3" fill={CHART_COLORS[seriesIndex]} />
        )))}
        {visibleTickIndexes.map((idx) => (
          <text key={idx} x={x(idx)} y={height - 14} textAnchor="middle" fontSize="10" fill="#64748b">{points[idx]?.label}</text>
        ))}
      </svg>
      <div className="mt-2 flex flex-wrap gap-3">
        {seriesKeys.map((key, index) => (
          <span key={key} className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: CHART_COLORS[index] }} />
            {labels[index]}
          </span>
        ))}
      </div>
    </div>
  );
}

function EmptyChart() {
  return <div className="rounded-2xl bg-slate-50 p-8 text-center text-sm font-semibold text-slate-500">No chart data for the selected filters.</div>;
}

function EmployeePerformanceTable({ rows }: { rows: EmployeePerformance[] }) {
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-4">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-blue-700" />
          <h3 className="text-base font-black text-slate-950">Employee performance support</h3>
        </div>
        <p className="mt-1 text-sm text-slate-500">Shows completed work, pending work, output, quality and defects. It supports wage review but does not calculate salary.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs font-black uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 text-left">Employee / Operator</th>
              <th className="px-4 py-3 text-left">Role</th>
              <th className="px-4 py-3 text-right">Records</th>
              <th className="px-4 py-3 text-right">Output</th>
              <th className="px-4 py-3 text-right">Completed</th>
              <th className="px-4 py-3 text-right">Pending</th>
              <th className="px-4 py-3 text-right">Defects</th>
              <th className="px-4 py-3 text-left">Score</th>
              <th className="px-4 py-3 text-left">Basis</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 && (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-slate-500">No employee performance data stored for this report in this period.</td></tr>
            )}
            {rows.map((row, idx) => (
              <tr key={`${row.employeeName}-${row.role}-${idx}`} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-bold text-slate-950">{row.employeeName}</td>
                <td className="px-4 py-3 text-slate-600">{row.role}</td>
                <td className="px-4 py-3 text-right font-semibold text-slate-700">{formatNumber(row.recordCount)}</td>
                <td className="px-4 py-3 text-right font-black text-slate-900">{formatNumber(row.outputQty)}</td>
                <td className="px-4 py-3 text-right text-slate-600">{formatNumber(row.completedQty)}</td>
                <td className="px-4 py-3 text-right text-slate-600">{formatNumber(row.pendingQty)}</td>
                <td className="px-4 py-3 text-right text-slate-600">{formatNumber(row.defectQty)}</td>
                <td className="px-4 py-3"><ScoreBar score={row.score} /></td>
                <td className="min-w-80 px-4 py-3 text-xs text-slate-500">{row.basis}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ScoreBar({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-blue-600" style={{ width: `${clamp(score)}%` }} />
      </div>
      <span className="w-12 text-right text-xs font-black text-slate-700">{formatPercent(score)}</span>
    </div>
  );
}

function HistoryTable({ report, onPage }: { report: SectionReport; onPage: (page: number) => void }) {
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-base font-black text-slate-950">{report.section} work history</h3>
          <p className="text-sm text-slate-500">Showing {report.rows.length} of {formatNumber(report.totalRows)} records. Use page buttons for the rest.</p>
        </div>
        <div className="screen-only flex items-center gap-2">
          <button
            type="button"
            disabled={report.page <= 1}
            onClick={() => onPage(report.page - 1)}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700 disabled:opacity-40"
          >
            <ChevronLeft className="h-3.5 w-3.5" /> Prev
          </button>
          <span className="text-xs font-bold text-slate-500">Page {report.page} / {report.totalPages}</span>
          <button
            type="button"
            disabled={report.page >= report.totalPages}
            onClick={() => onPage(report.page + 1)}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700 disabled:opacity-40"
          >
            Next <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-950 text-xs font-black uppercase tracking-wide text-white">
            <tr>
              {report.columns.map((column) => (
                <th key={column.key} className={`whitespace-nowrap px-4 py-3 ${column.type === 'number' ? 'text-right' : 'text-left'}`}>{column.label}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {report.rows.length === 0 && (
              <tr><td colSpan={report.columns.length} className="px-4 py-8 text-center text-slate-500">No history records for the selected filters.</td></tr>
            )}
            {report.rows.map((row, rowIndex) => (
              <tr key={rowIndex} className="hover:bg-blue-50/30">
                {report.columns.map((column) => (
                  <td key={column.key} className={`max-w-96 px-4 py-3 align-top ${column.type === 'number' ? 'text-right font-semibold text-slate-800' : 'text-left text-slate-600'}`}>
                    <span className="line-clamp-3">{valueToText(row[column.key]) || '—'}</span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function UsersTable({ users }: { users: UserReportRow[] }) {
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-4">
        <h3 className="text-base font-black text-slate-950">All users report</h3>
        <p className="text-sm text-slate-500">System users with role, activity count and last known activity.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-950 text-xs font-black uppercase tracking-wide text-white">
            <tr>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Username</th>
              <th className="px-4 py-3 text-left">Role</th>
              <th className="px-4 py-3 text-right">Activities</th>
              <th className="px-4 py-3 text-left">Last Login</th>
              <th className="px-4 py-3 text-left">Last Activity</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-bold text-slate-950">{user.name}</td>
                <td className="px-4 py-3 text-slate-600">{user.username}</td>
                <td className="px-4 py-3"><span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700">{user.role}</span></td>
                <td className="px-4 py-3 text-right font-semibold text-slate-800">{formatNumber(user.activityCount)}</td>
                <td className="px-4 py-3 text-slate-600">{user.lastLogin || '—'}</td>
                <td className="px-4 py-3 text-slate-600">{user.lastActivity || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function NotesPanel({ notes }: { notes: string[] }) {
  if (!notes?.length) return null;
  return (
    <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
      <h3 className="mb-2 font-black">Report interpretation notes</h3>
      <ul className="list-disc space-y-1 pl-5">
        {notes.map((note) => <li key={note}>{note}</li>)}
      </ul>
    </div>
  );
}

function PrintReport({
  title,
  dateFrom,
  dateTo,
  generatedAt,
  dashboard,
  sectionReport,
  users,
  view,
  printMode,
}: {
  title: string;
  dateFrom: string;
  dateTo: string;
  generatedAt?: string;
  dashboard: DashboardResponse | null;
  sectionReport: SectionReport | null;
  users: UserReportRow[];
  view: ReportView;
  printMode: PrintMode;
}) {
  return (
    <div className="print-only">
      <div className="print-document">
        <div className="print-title-row">
          <div>
            <div className="print-company">Colour Plus Printing Systems (Pvt) Ltd</div>
            <div className="print-title">{title}</div>
            <div className="print-subtitle">Period: {dateFrom} to {dateTo} · Generated: {generatedAt || '—'}</div>
          </div>
          <img src="/report-header.svg" alt="Colour Plus" className="print-logo" />
        </div>

        {view === 'Overview' && dashboard && (
          <>
            <PrintSectionHeading title="Management summary" />
            <PrintMetricTable cards={dashboard.headlineCards} />
            <PrintSectionHeading title="Department performance" />
            <table className="print-table">
              <thead><tr><th>Department</th><th>Completed</th><th>Pending</th><th>Completion</th><th>Workload</th><th>Notes</th></tr></thead>
              <tbody>
                {dashboard.departments.map((d) => (
                  <tr key={d.section}>
                    <td>{d.section}</td>
                    <td className="num">{formatNumber(d.completedValue)}</td>
                    <td className="num">{formatNumber(d.pendingValue)}</td>
                    <td className="num">{formatPercent(d.completionPercent)}</td>
                    <td className="num">{formatNumber(d.workloadValue)}</td>
                    <td>{d.secondaryMetric}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {view !== 'Overview' && view !== 'Users' && sectionReport && (
          <>
            <PrintSectionHeading title="Summary" />
            <p className="print-note-text">{sectionReport.description}</p>
            <PrintMetricTable cards={sectionReport.metrics} />

            {sectionReport.appliedFilters?.length > 0 && (
              <>
                <PrintSectionHeading title="Applied filters" />
                <div className="print-filter-grid">
                  {sectionReport.appliedFilters.map((item) => (
                    <div key={`${item.label}-${item.value}`}><strong>{item.label}:</strong> {item.value}</div>
                  ))}
                </div>
              </>
            )}

            <PrintSectionHeading title="Employee performance support" />
            <table className="print-table compact">
              <thead><tr><th>Employee</th><th>Role</th><th>Records</th><th>Output</th><th>Completed</th><th>Pending</th><th>Defects</th><th>Score</th></tr></thead>
              <tbody>
                {sectionReport.employeeRows.slice(0, 12).map((r, idx) => (
                  <tr key={`${r.employeeName}-${idx}`}>
                    <td>{r.employeeName}</td><td>{r.role}</td><td className="num">{formatNumber(r.recordCount)}</td><td className="num">{formatNumber(r.outputQty)}</td><td className="num">{formatNumber(r.completedQty)}</td><td className="num">{formatNumber(r.pendingQty)}</td><td className="num">{formatNumber(r.defectQty)}</td><td className="num">{formatPercent(r.score)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {printMode === 'summary-details' && (
              <>
                <PrintSectionHeading title={`${sectionReport.section} detailed history`} />
                <table className="print-table compact">
                  <thead>
                    <tr>{sectionReport.columns.slice(0, 12).map((c) => <th key={c.key}>{c.label}</th>)}</tr>
                  </thead>
                  <tbody>
                    {sectionReport.rows.map((row, index) => (
                      <tr key={index}>{sectionReport.columns.slice(0, 12).map((c) => <td key={c.key} className={c.type === 'number' ? 'num' : ''}>{valueToText(row[c.key]) || '—'}</td>)}</tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}

            {sectionReport.notes?.length > 0 && (
              <div className="print-notes">
                <strong>Notes:</strong>
                <ul>{sectionReport.notes.map((note) => <li key={note}>{note}</li>)}</ul>
              </div>
            )}
          </>
        )}

        {view === 'Users' && (
          <>
            <PrintSectionHeading title="All users" />
            <table className="print-table">
              <thead><tr><th>Name</th><th>Username</th><th>Role</th><th>Activities</th><th>Last login</th><th>Last activity</th></tr></thead>
              <tbody>
                {users.map((user) => <tr key={user.id}><td>{user.name}</td><td>{user.username}</td><td>{user.role}</td><td className="num">{formatNumber(user.activityCount)}</td><td>{user.lastLogin || '—'}</td><td>{user.lastActivity || '—'}</td></tr>)}
              </tbody>
            </table>
          </>
        )}

        <div className="print-signatures">
          <div>Prepared By</div>
          <div>Checked By</div>
          <div>Authorized By</div>
        </div>
      </div>
    </div>
  );
}

function PrintSectionHeading({ title }: { title: string }) {
  return <h2 className="print-section-heading">{title}</h2>;
}

function PrintMetricTable({ cards }: { cards: MetricCard[] }) {
  return (
    <table className="print-table metric-table">
      <thead><tr><th>Metric</th><th>Value</th><th>Explanation</th></tr></thead>
      <tbody>
        {cards.map((card) => <tr key={card.label}><td>{card.label}</td><td className="num">{formatNumber(card.value)}</td><td>{card.note}</td></tr>)}
      </tbody>
    </table>
  );
}

export default function ReportCenterPage() {
  const defaultRange = useMemo(() => getDateRange('this-month'), []);
  const [period, setPeriod] = useState<PeriodKey>('this-month');
  const [dateFrom, setDateFrom] = useState(defaultRange.from);
  const [dateTo, setDateTo] = useState(defaultRange.to);
  const [view, setView] = useState<ReportView>('Overview');
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>(EMPTY_OPTIONS);
  const [pageSize, setPageSize] = useState(50);
  const [page, setPage] = useState(1);
  const [printMode, setPrintMode] = useState<PrintMode>('summary');

  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [sectionReport, setSectionReport] = useState<SectionReport | null>(null);
  const [users, setUsers] = useState<UserReportRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const title = activeReportTitle(view);
  const generatedAt = sectionReport?.generatedAt || dashboard?.generatedAt;

  const loadFilterOptions = async (nextView = view) => {
    const q = toQuery({ dateFrom, dateTo, section: nextView });
    const data = await fetchJson<FilterOptions>(`${API_BASE}/filter-options?${q}`);
    setFilterOptions(data);
  };

  const loadDashboard = async () => {
    const q = toQuery({ dateFrom, dateTo });
    const data = await fetchJson<DashboardResponse>(`${API_BASE}/overview?${q}`);
    setDashboard(data);
  };

  const loadSection = async (section: DepartmentKey, nextPage = page) => {
    const q = toQuery({
      dateFrom,
      dateTo,
      page: nextPage,
      pageSize,
      role: filters.role,
      employee: filters.employee,
      status: filters.status,
      styleNo: filters.styleNo,
      customer: filters.customer,
      scheduleNo: filters.scheduleNo,
      timeSlot: section === 'Worker' ? filters.timeSlot : '',
    });
    const data = await fetchJson<SectionReport>(`${API_BASE}/sections/${section}?${q}`);
    setSectionReport(data);
  };

  const loadUsers = async () => {
    const data = await fetchJson<UserReportRow[]>(`${API_BASE}/users`);
    setUsers(data);
  };

  const refresh = async (nextView = view, nextPage = page) => {
    setLoading(true);
    setError('');
    try {
      await loadFilterOptions(nextView);
      if (nextView === 'Overview') {
        setSectionReport(null);
        await loadDashboard();
      } else if (nextView === 'Users') {
        setSectionReport(null);
        await loadUsers();
      } else {
        await loadSection(nextView, nextPage);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load report data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh('Overview', 1);
    // initial load only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePeriod = (nextPeriod: PeriodKey) => {
    setPeriod(nextPeriod);
    if (nextPeriod !== 'custom') {
      const range = getDateRange(nextPeriod);
      setDateFrom(range.from);
      setDateTo(range.to);
    }
  };

  const handleDateFrom = (value: string) => {
    setPeriod('custom');
    setDateFrom(value);
  };

  const handleDateTo = (value: string) => {
    setPeriod('custom');
    setDateTo(value);
  };

  const openView = (nextView: ReportView) => {
    setView(nextView);
    setPage(1);
    setFilters(EMPTY_FILTERS);
    setTimeout(() => void refresh(nextView, 1), 0);
  };

  const handleFilter = (key: keyof Filters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const handleRefresh = () => {
    setPage(1);
    void refresh(view, 1);
  };

  const changePage = (nextPage: number) => {
    if (view === 'Overview' || view === 'Users') return;
    setPage(nextPage);
    void refresh(view, nextPage);
  };

  const handlePageSize = (size: number) => {
    setPageSize(size);
    setPage(1);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-7xl space-y-6 pb-12">
      <style>{`
        .print-only { display: none; }
        @media print {
          @page { size: A4 landscape; margin: 10mm; }
          body { background: white !important; }
          .screen-only, .report-screen { display: none !important; }
          .print-only { display: block !important; }
          .print-document { color: #0f172a; font-family: Arial, sans-serif; font-size: 10px; }
          .print-title-row { display: flex; align-items: flex-start; justify-content: space-between; border-bottom: 2px solid #0f172a; padding-bottom: 10px; margin-bottom: 12px; }
          .print-logo { height: 42px; object-fit: contain; }
          .print-company { font-size: 18px; font-weight: 800; }
          .print-title { margin-top: 3px; font-size: 13px; font-weight: 700; }
          .print-subtitle { margin-top: 2px; font-size: 10px; color: #475569; }
          .print-section-heading { margin: 12px 0 6px; padding: 5px 8px; background: #0f172a; color: #fff; font-size: 11px; text-transform: uppercase; letter-spacing: .04em; }
          .print-note-text { margin: 0 0 8px; color: #334155; }
          .print-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; table-layout: fixed; }
          .print-table th { background: #e2e8f0; color: #0f172a; border: 1px solid #94a3b8; padding: 5px; text-align: left; font-size: 9px; }
          .print-table td { border: 1px solid #cbd5e1; padding: 5px; vertical-align: top; word-break: break-word; }
          .print-table .num { text-align: right; font-variant-numeric: tabular-nums; }
          .print-table.compact th, .print-table.compact td { padding: 4px; font-size: 8.5px; }
          .metric-table td:nth-child(1) { width: 28%; font-weight: 700; }
          .metric-table td:nth-child(2) { width: 16%; font-size: 13px; font-weight: 800; }
          .print-filter-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; margin-bottom: 8px; }
          .print-filter-grid div { border: 1px solid #cbd5e1; padding: 5px; }
          .print-notes { margin-top: 10px; padding: 8px; border: 1px solid #f59e0b; background: #fffbeb; }
          .print-notes ul { margin: 5px 0 0 18px; padding: 0; }
          .print-signatures { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; margin-top: 24px; page-break-inside: avoid; }
          .print-signatures div { border-top: 1px solid #0f172a; padding-top: 6px; text-align: center; font-weight: 700; }
          tr { page-break-inside: avoid; }
          thead { display: table-header-group; }
        }
      `}</style>

      <div className="report-screen space-y-6">
        <ReportHeader title={title} dateFrom={dateFrom} dateTo={dateTo} generatedAt={generatedAt} />

        <FilterPanel
          period={period}
          dateFrom={dateFrom}
          dateTo={dateTo}
          view={view}
          filters={filters}
          options={filterOptions}
          pageSize={pageSize}
          printMode={printMode}
          loading={loading}
          onPeriod={handlePeriod}
          onDateFrom={handleDateFrom}
          onDateTo={handleDateTo}
          onView={openView}
          onFilter={handleFilter}
          onPageSize={handlePageSize}
          onPrintMode={setPrintMode}
          onRefresh={handleRefresh}
        />

        {error && (
          <div className="rounded-3xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="mr-2 inline h-4 w-4" />{error}
          </div>
        )}

        {loading && !dashboard && !sectionReport && (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-slate-500 shadow-sm">
            <Loader2 className="mx-auto mb-3 h-6 w-6 animate-spin" /> Loading report data...
          </div>
        )}

        {view === 'Overview' && dashboard && (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-blue-50 p-2 text-blue-700"><BriefcaseBusiness className="h-5 w-5" /></div>
              <div>
                <h2 className="text-xl font-black text-slate-950">Management overview</h2>
                <p className="text-sm text-slate-500">Click a department to review completed work, pending work, charts and supporting history.</p>
              </div>
            </div>
            <MetricGrid cards={dashboard.headlineCards} />
            <DepartmentOverview departments={dashboard.departments} onOpen={openView} />
            <ChartGrid charts={dashboard.charts} />
          </div>
        )}

        {view !== 'Overview' && view !== 'Users' && sectionReport && (
          <div className="space-y-6">
            <div className="screen-only flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => openView('Overview')}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
              >
                <ArrowLeft className="h-4 w-4" /> Back to management overview
              </button>
              <div className="flex items-center gap-2 rounded-xl bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700">
                <FileSpreadsheet className="h-4 w-4" /> {formatNumber(sectionReport.totalRows)} matching records
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-xl font-black text-slate-950">{sectionReport.title}</h2>
              <p className="mt-1 text-sm text-slate-500">{sectionReport.description}</p>
              {sectionReport.appliedFilters?.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {sectionReport.appliedFilters.map((item) => (
                    <span key={`${item.label}-${item.value}`} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                      {item.label}: {item.value}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <MetricGrid cards={sectionReport.metrics} />
            <ChartGrid charts={sectionReport.charts} />
            <EmployeePerformanceTable rows={sectionReport.employeeRows} />
            <NotesPanel notes={sectionReport.notes} />
            <HistoryTable report={sectionReport} onPage={changePage} />
          </div>
        )}

        {view === 'Users' && (
          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-xl font-black text-slate-950">Users report</h2>
              <p className="mt-1 text-sm text-slate-500">All system users and last known activity.</p>
            </div>
            <UsersTable users={users} />
          </div>
        )}
      </div>

      <PrintReport
        title={title}
        dateFrom={dateFrom}
        dateTo={dateTo}
        generatedAt={generatedAt}
        dashboard={dashboard}
        sectionReport={sectionReport}
        users={users}
        view={view}
        printMode={printMode}
      />
    </motion.div>
  );
}
