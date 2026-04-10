// src/pages/Dashboard.tsx
import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Package, CheckSquare, Truck, FileText, Factory,
  Clock, AlertTriangle, TrendingUp, Code, ClipboardCheck,
  PackageOpen, ArrowRight, Loader2, RefreshCw, ChevronRight,
  ChevronDown, BarChart2, Activity, Shield, User, Layers,
  Circle, CheckCircle2, XCircle, Timer, Inbox, Send,
  Eye, PieChart as PieIcon, Star, Zap, LayoutDashboard,
  Scissors, Boxes, Gauge, Building2,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { API, getAuthHeaders } from '../api/client';
import { MiniBarChart, PieChart, MiniDonut, ProgressBar, HorizontalBarChart } from '../components/MiniChart';
import { StoreInRecord } from '../store/inventoryStore';

// ==========================================
// TYPES
// ==========================================
interface DashboardData {
  development: { totalJobs: number; totalSubmissions: number; pendingSubmissions: number };
  approvals: { total: number; approved: number; rejected: number; pending: number };
  stores: { totalStoreIn: number; totalInQty: number; todayStoreIn: number; totalProductionRecords: number; totalIssuedQty: number; todayProduction: number; bulkApproved: number; bulkReceived: number; bulkRemaining: number };
  qc: { totalCpiReports: number; passed: number; failed: number; pending: number; todayCpi: number };
  gatepass: { totalAdviceNotes: number; totalDispatchedQty: number; todayDispatched: number };
  audit: { total: number; passed: number; failed: number; pending: number };
  worker: { totalDailyOutput: number; todayOutput: number; todaySeating: number; todayPrinting: number; todayCuring: number; todayChecking: number; todayPacking: number; todayDispatch: number; totalDowntime: number; pendingDowntime: number };
  recent: { storeIn: any[]; dispatches: any[]; audits: any[] };
}

interface StyleOverview {
  styleNo: string; customerName: string; scheduleNo: string; bulkQty: number; stage: string;
  storeInCount: number; totalReceived: number; remainingBulk: number; receivedPct: number; totalCuts: number;
  qcTotal: number; qcPassed: number; qcFailed: number; qcPending: number;
  productionCount: number; totalIssued: number;
  dispatchCount: number; totalDispatched: number; dispatchedPct: number;
  auditTotal: number; auditPassed: number; auditFailed: number;
  workerEntries: number; totalWorkerOutput: number;
}

interface StoreInStyleSummary {
  key: string; styleNo: string; customerName: string; bulkQty: number;
  totalInQty: number; totalCutQty: number; totalBundles: number;
  recordCount: number; scheduleCount: number; latestDate: string;
}

// ==========================================
// HELPERS
// ==========================================
const normalizeDay = (v?: string) => (v || '').slice(0, 10);

const buildStoreInStyleSummaries = (records: StoreInRecord[]): StoreInStyleSummary[] => {
  const map = new Map<string, Omit<StoreInStyleSummary, 'scheduleCount'> & { scheduleSet: Set<string> }>();
  records.forEach((r) => {
    const key = `${r.styleNo}|||${r.customerName}`;
    const bundleCount = (r.cuts || []).reduce((s, c) => s + (c.bundles?.length || 0), 0);
    const day = normalizeDay(r.cutInDate);
    const ex = map.get(key);
    if (!ex) { map.set(key, { key, styleNo: r.styleNo, customerName: r.customerName, bulkQty: r.bulkQty || 0, totalInQty: r.inQty || 0, totalCutQty: r.totalCutQty || 0, totalBundles: bundleCount, recordCount: 1, latestDate: day, scheduleSet: new Set([r.scheduleNo].filter(Boolean)) }); return; }
    ex.bulkQty = Math.max(ex.bulkQty, r.bulkQty || 0);
    ex.totalInQty += r.inQty || 0;
    ex.totalCutQty += r.totalCutQty || 0;
    ex.totalBundles += bundleCount;
    ex.recordCount += 1;
    if (day > ex.latestDate) ex.latestDate = day;
    if (r.scheduleNo) ex.scheduleSet.add(r.scheduleNo);
  });
  return Array.from(map.values()).map(({ scheduleSet, ...rest }) => ({ ...rest, scheduleCount: scheduleSet.size })).sort((a, b) => b.latestDate.localeCompare(a.latestDate));
};

const STAGE_META: Record<string, { bg: string; text: string; dot: string; order: number }> = {
  'Completed':    { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: '#10b981', order: 6 },
  'Dispatching':  { bg: 'bg-teal-100',    text: 'text-teal-700',    dot: '#14b8a6', order: 5 },
  'In Production':{ bg: 'bg-purple-100',  text: 'text-purple-700',  dot: '#8b5cf6', order: 4 },
  'QC Passed':    { bg: 'bg-blue-100',    text: 'text-blue-700',    dot: '#3b82f6', order: 3 },
  'Received':     { bg: 'bg-amber-100',   text: 'text-amber-700',   dot: '#f59e0b', order: 2 },
  'Approved':     { bg: 'bg-slate-100',   text: 'text-slate-600',   dot: '#94a3b8', order: 1 },
};

// ==========================================
// SHARED UI PRIMITIVES
// ==========================================

function SectionHeader({ icon: Icon, title, color = 'text-slate-400', subtitle }: { icon: any; title: string; color?: string; subtitle?: string }) {
  return (
    <div className="flex items-center gap-2.5 mb-5 pt-6 border-t border-slate-100">
      <div className="p-1.5 rounded-lg bg-slate-100"><Icon className={`h-4 w-4 ${color}`} /></div>
      <div>
        <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500">{title}</h3>
        {subtitle && <p className="text-[11px] text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

function Card({ children, className = '', title, icon: Icon, action, noPadding = false, accent }: {
  children: React.ReactNode; className?: string; title?: string; icon?: any; action?: React.ReactNode; noPadding?: boolean; accent?: string;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
      className={`rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden ${className}`}>
      {title && (
        <div className={`flex items-center justify-between px-5 py-3 border-b border-slate-100 ${accent ? accent : ''}`}>
          <div className="flex items-center gap-2">
            {Icon && <Icon className="h-4 w-4 text-slate-400" />}
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-600">{title}</h3>
          </div>
          {action}
        </div>
      )}
      <div className={noPadding ? '' : 'p-5'}>{children}</div>
    </motion.div>
  );
}

function StatTile({ label, value, sub, color = 'text-slate-800', bg = 'bg-slate-50' }: { label: string; value: string | number; sub?: string; color?: string; bg?: string }) {
  return (
    <div className={`rounded-lg ${bg} p-4 border border-slate-100`}>
      <p className={`text-2xl font-black ${color} leading-none`}>{value}</p>
      {sub && <p className="text-[10px] font-medium text-slate-400 mt-0.5">{sub}</p>}
      <p className="text-[11px] font-medium text-slate-500 mt-1.5">{label}</p>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, sub, color, href, delay = 0 }: {
  icon: any; label: string; value: string | number; sub?: string; color: string; href?: string; delay?: number;
}) {
  const styles: Record<string, { bg: string; ic: string; tx: string }> = {
    blue:    { bg: 'bg-blue-50 border-blue-100',    ic: 'bg-blue-500',    tx: 'text-blue-700' },
    emerald: { bg: 'bg-emerald-50 border-emerald-100', ic: 'bg-emerald-500', tx: 'text-emerald-700' },
    amber:   { bg: 'bg-amber-50 border-amber-100',  ic: 'bg-amber-500',   tx: 'text-amber-700' },
    red:     { bg: 'bg-red-50 border-red-100',      ic: 'bg-red-500',     tx: 'text-red-700' },
    purple:  { bg: 'bg-purple-50 border-purple-100',ic: 'bg-purple-500',  tx: 'text-purple-700' },
    teal:    { bg: 'bg-teal-50 border-teal-100',    ic: 'bg-teal-500',    tx: 'text-teal-700' },
    indigo:  { bg: 'bg-indigo-50 border-indigo-100',ic: 'bg-indigo-500',  tx: 'text-indigo-700' },
    slate:   { bg: 'bg-slate-50 border-slate-200',  ic: 'bg-slate-500',   tx: 'text-slate-700' },
    orange:  { bg: 'bg-orange-50 border-orange-100',ic: 'bg-orange-500',  tx: 'text-orange-700' },
  };
  const c = styles[color] || styles.blue;
  const W = href ? Link : 'div';
  const wp = href ? { to: href } : {};
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay }}>
      <W {...wp as any} className={`block rounded-xl border p-4 ${c.bg} ${href ? 'hover:shadow-md cursor-pointer transition-all hover:-translate-y-0.5' : ''}`}>
        <div className="flex items-center justify-between mb-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${c.ic}`}><Icon className="h-4 w-4 text-white" /></div>
          {sub && <span className="text-[10px] font-semibold text-slate-500 bg-white/60 rounded-full px-2 py-0.5">{sub}</span>}
        </div>
        <p className={`text-2xl font-black ${c.tx}`}>{value}</p>
        <p className="text-[11px] font-medium text-slate-500 mt-0.5">{label}</p>
      </W>
    </motion.div>
  );
}

function AlertCard({ icon: Icon, label, value, href, color }: { icon: any; label: string; value: number; href: string; color: string }) {
  if (value <= 0) return null;
  const colors: Record<string, string> = { amber: 'border-amber-300 bg-amber-50', red: 'border-red-300 bg-red-50' };
  const textColors: Record<string, string> = { amber: 'text-amber-800', red: 'text-red-800' };
  return (
    <Link to={href} className={`flex items-center gap-3 rounded-xl border-2 border-dashed ${colors[color]} p-3 hover:shadow-md transition-all hover:-translate-y-0.5`}>
      <Icon className={`h-5 w-5 ${textColors[color]}`} />
      <div className="flex-1"><p className={`text-sm font-bold ${textColors[color]}`}>{value}</p><p className="text-[11px] text-slate-600">{label}</p></div>
      <ChevronRight className="h-4 w-4 text-slate-400" />
    </Link>
  );
}

function InlineDonut({ value, total, color, size = 64 }: { value: number; total: number; color: string; size?: number }) {
  const pct = total > 0 ? Math.min(100, Math.round(value / total * 100)) : 0;
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#f1f5f9" strokeWidth={6} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={6}
          strokeDasharray={circ} strokeDashoffset={circ * (1 - pct/100)} strokeLinecap="round" />
      </svg>
      <span className="absolute text-xs font-black text-slate-700">{pct}%</span>
    </div>
  );
}

function SimpleTable({ headers, rows, className = '' }: { headers: string[]; rows: (string | number | React.ReactNode)[][]; className?: string }) {
  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-100">
            {headers.map((h, i) => (
              <th key={i} className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {rows.map((row, ri) => (
            <tr key={ri} className="hover:bg-slate-50/60 transition-colors">
              {row.map((cell, ci) => (
                <td key={ci} className="px-4 py-2.5 text-sm text-slate-700">{cell}</td>
              ))}
            </tr>
          ))}
          {rows.length === 0 && (
            <tr><td colSpan={headers.length} className="px-4 py-8 text-center text-sm text-slate-400">No records found</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function StageBadge({ stage }: { stage: string }) {
  const m = STAGE_META[stage] || STAGE_META['Approved'];
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold ${m.bg} ${m.text}`}>{stage}</span>;
}

function MiniProgress({ value, max, color = '#3b82f6' }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min(100, Math.round(value / max * 100)) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-[11px] font-semibold text-slate-500 w-7 text-right">{pct}%</span>
    </div>
  );
}

// Pipeline step visualization
function PipelineSteps({ style }: { style: StyleOverview }) {
  const steps = [
    { label: 'Approved', done: true,                      color: '#94a3b8' },
    { label: 'Received', done: style.totalReceived > 0,   color: '#f59e0b' },
    { label: 'QC',       done: style.qcPassed > 0,        color: '#3b82f6' },
    { label: 'Issued',   done: style.totalIssued > 0,     color: '#8b5cf6' },
    { label: 'Dispatch', done: style.totalDispatched > 0, color: '#14b8a6' },
  ];
  return (
    <div className="flex items-center gap-0.5">
      {steps.map((s, i) => (
        <div key={i} className="flex items-center">
          <div className={`w-4 h-4 rounded-full flex items-center justify-center ${s.done ? '' : 'bg-slate-100'}`}
            style={s.done ? { backgroundColor: s.color } : {}}>
            {s.done ? <div className="w-1.5 h-1.5 bg-white rounded-full" /> : <div className="w-1.5 h-1.5 bg-slate-300 rounded-full" />}
          </div>
          {i < steps.length - 1 && <div className={`h-0.5 w-3 ${s.done && steps[i+1].done ? 'bg-slate-400' : 'bg-slate-200'}`} />}
        </div>
      ))}
    </div>
  );
}

// ==========================================
// ROLE DASHBOARDS
// ==========================================

// ---------- DEVELOPER ----------
function DeveloperDashboard({ data }: { data: DashboardData }) {
  const passRate = data.approvals.total > 0 ? Math.round(data.approvals.approved / data.approvals.total * 100) : 0;
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard icon={Code}           label="Jobs Created"       value={data.development.totalJobs}        color="blue"    href="/development"        delay={0.05} />
        <KpiCard icon={FileText}       label="Total Submissions"  value={data.development.totalSubmissions} color="purple"  href="/development/submit" delay={0.1}  />
        <KpiCard icon={CheckCircle2}   label="Approved"           value={data.approvals.approved}           color="emerald"                            delay={0.15} />
        <KpiCard icon={Timer}          label="Pending Approval"   value={data.development.pendingSubmissions} color={data.development.pendingSubmissions > 0 ? 'amber' : 'slate'} delay={0.2} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Approval Pie */}
        <Card title="Submission Status" icon={PieIcon}>
          <PieChart data={[
            { label: 'Approved', value: data.approvals.approved, color: '#10b981' },
            { label: 'Rejected', value: data.approvals.rejected, color: '#ef4444' },
            { label: 'Pending',  value: data.approvals.pending,  color: '#f59e0b' },
          ]} centerValue={String(data.approvals.total)} centerLabel="Total" />
        </Card>

        {/* Stats breakdown */}
        <Card title="Approval Breakdown" icon={BarChart2} className="lg:col-span-2">
          <div className="grid grid-cols-3 gap-4 mb-5">
            <StatTile label="Approved"  value={data.approvals.approved} color="text-emerald-700" bg="bg-emerald-50" sub="submissions" />
            <StatTile label="Rejected"  value={data.approvals.rejected} color="text-red-700"     bg="bg-red-50"     sub="submissions" />
            <StatTile label="Pass Rate" value={`${passRate}%`}          color="text-blue-700"    bg="bg-blue-50"    sub="all-time" />
          </div>
          <div className="space-y-2.5">
            <div>
              <div className="flex justify-between text-xs text-slate-500 mb-1"><span>Approval rate</span><span>{passRate}%</span></div>
              <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full rounded-full bg-emerald-500" style={{ width: `${passRate}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs text-slate-500 mb-1"><span>Rejection rate</span><span>{data.approvals.total > 0 ? Math.round(data.approvals.rejected/data.approvals.total*100) : 0}%</span></div>
              <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full rounded-full bg-red-400" style={{ width: `${data.approvals.total > 0 ? Math.round(data.approvals.rejected/data.approvals.total*100) : 0}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs text-slate-500 mb-1"><span>Pending</span><span>{data.approvals.total > 0 ? Math.round(data.approvals.pending/data.approvals.total*100) : 0}%</span></div>
              <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full rounded-full bg-amber-400" style={{ width: `${data.approvals.total > 0 ? Math.round(data.approvals.pending/data.approvals.total*100) : 0}%` }} />
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Pending alert */}
      {data.development.pendingSubmissions > 0 && (
        <div className="rounded-xl border-2 border-dashed border-amber-300 bg-amber-50 px-5 py-4 flex items-center gap-3">
          <Clock className="h-5 w-5 text-amber-600 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-bold text-amber-800">You have {data.development.pendingSubmissions} submission{data.development.pendingSubmissions > 1 ? 's' : ''} awaiting admin review</p>
            <p className="text-xs text-amber-600 mt-0.5">These will be approved or rejected by the admin team.</p>
          </div>
          <Link to="/development/submit" className="text-xs font-bold text-amber-700 flex items-center gap-1 hover:underline">View <ArrowRight className="h-3 w-3" /></Link>
        </div>
      )}
    </div>
  );
}

// ---------- STORES ----------
function StoresDashboard({ data, storeInRecords, styles }: { data: DashboardData; storeInRecords: StoreInRecord[]; styles: StyleOverview[] }) {
  const [styleFilter, setStyleFilter] = useState('');
  const [customerFilter, setCustomerFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const allSummaries = useMemo(() => buildStoreInStyleSummaries(storeInRecords), [storeInRecords]);

  // Unique style numbers and customer names (sorted) for dropdowns
  const styleOptions = useMemo(() => Array.from(new Set(allSummaries.map(r => r.styleNo))).filter(Boolean).sort(), [allSummaries]);
  const customerOptions = useMemo(() => Array.from(new Set(allSummaries.map(r => r.customerName))).filter(Boolean).sort(), [allSummaries]);

  const filtered = useMemo(() => {
    return allSummaries.filter(r => {
      if (styleFilter && r.styleNo !== styleFilter) return false;
      if (customerFilter && r.customerName !== customerFilter) return false;
      if (dateFrom && r.latestDate < dateFrom) return false;
      if (dateTo && r.latestDate > dateTo) return false;
      return true;
    });
  }, [allSummaries, styleFilter, customerFilter, dateFrom, dateTo]);

  const hasFilter = !!(styleFilter || customerFilter || dateFrom || dateTo);
  const display = hasFilter ? filtered : allSummaries.slice(0, 9);

  // Pipeline stats
  const pending = styles.filter(s => ['Approved', 'Received'].includes(s.stage)).length;
  const inProduction = styles.filter(s => s.stage === 'In Production').length;
  const atQC = styles.filter(s => ['QC Passed', 'Dispatching'].includes(s.stage)).length;

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard icon={Inbox}      label="Styles from Admin"    value={styles.length}                              color="blue"    delay={0.05} />
        <KpiCard icon={Activity}   label="Pending IN Qty / Cuts" value={pending}                                  color="amber"   delay={0.1}  />
        <KpiCard icon={Factory}    label="In Production"        value={inProduction}                               color="purple"  delay={0.15} />
        <KpiCard icon={CheckCircle2} label="At QC / Dispatching" value={atQC}                                     color="emerald" delay={0.2}  />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard icon={PackageOpen} label="Store-In Today"      value={data.stores.todayStoreIn}                   color="teal"    href="/inventory/in"         delay={0.05} />
        <KpiCard icon={Factory}     label="Production Today"    value={data.stores.todayProduction}                color="indigo"  href="/inventory/production" delay={0.1}  />
        <KpiCard icon={Package}     label="Total Received"      value={data.stores.totalInQty.toLocaleString()}    sub="pcs"       color="slate"                delay={0.15} />
        <KpiCard icon={Send}        label="Total Issued"        value={data.stores.totalIssuedQty.toLocaleString()} sub="pcs"      color="orange"               delay={0.2}  />
      </div>

      {/* Bulk balance */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Bulk Balance" icon={Package}>
          <div className="flex items-center gap-6">
            <MiniDonut value={data.stores.bulkReceived} total={data.stores.bulkApproved} size={100} color="#3b82f6" />
            <div className="flex-1 space-y-2.5">
              <ProgressBar value={data.stores.bulkReceived}     max={data.stores.bulkApproved} label="Received from Supplier" color="#3b82f6" />
              <ProgressBar value={data.stores.totalIssuedQty}   max={data.stores.bulkApproved} label="Issued to Production"   color="#8b5cf6" />
              <div className="pt-1 border-t border-slate-100 flex justify-between text-xs text-slate-500">
                <span>Remaining in store</span>
                <b className="text-slate-700">{data.stores.bulkRemaining.toLocaleString()} pcs</b>
              </div>
            </div>
          </div>
        </Card>

        {/* Styles in each stage */}
        <Card title="Styles by Stage" icon={Layers}>
          <div className="space-y-2">
            {Object.entries(STAGE_META).sort((a,b) => b[1].order - a[1].order).map(([stage, meta]) => {
              const count = styles.filter(s => s.stage === stage).length;
              if (count === 0) return null;
              return (
                <div key={stage} className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: meta.dot }} />
                  <div className="flex-1 text-sm text-slate-600">{stage}</div>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${meta.bg} ${meta.text}`}>{count}</span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Bulk balance chart by style */}
      {styles.length > 0 && (
        <Card title="Received vs Bulk Qty — Per Style" icon={BarChart2}>
          <HorizontalBarChart data={styles.map(s => ({ label: `${s.styleNo} — ${s.customerName}`, value: s.totalReceived, max: Math.max(1, s.bulkQty), color: '#3b82f6' }))} />
        </Card>
      )}

      {/* Style Summary Table */}
      <Card title="Store-In Style Summary (Recent 9)" icon={PackageOpen}
        action={<span className="text-xs font-semibold text-slate-400">{allSummaries.length} total styles</span>}>
        <div className="space-y-3">
          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            <div className="flex-1 min-w-[160px]">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Style No</label>
              <select value={styleFilter} onChange={e => setStyleFilter(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">All styles</option>
                {styleOptions.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="flex-1 min-w-[160px]">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Customer</label>
              <select value={customerFilter} onChange={e => setCustomerFilter(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">All customers</option>
                {customerOptions.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">From Date</label>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">To Date</label>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            {hasFilter && (
              <div className="flex items-end">
                <button onClick={() => { setStyleFilter(''); setCustomerFilter(''); setDateFrom(''); setDateTo(''); }}
                  className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-100">Clear</button>
              </div>
            )}
          </div>
          <p className="text-xs text-slate-400">Showing {display.length} {hasFilter ? `of ${allSummaries.length}` : 'most recent'} styles</p>

          <SimpleTable
            headers={['Style', 'Customer', 'Bulk Qty', 'In Qty', 'Cut Qty', 'Bundles', 'Schedules', 'Entries', 'Latest']}
            rows={display.map(r => [
              <span className="font-bold text-slate-800">{r.styleNo}</span>,
              r.customerName,
              r.bulkQty.toLocaleString(),
              <span className="font-bold text-blue-700">{r.totalInQty.toLocaleString()}</span>,
              <span className="font-bold text-purple-700">{r.totalCutQty.toLocaleString()}</span>,
              <span className="font-bold text-emerald-700">{r.totalBundles.toLocaleString()}</span>,
              r.scheduleCount,
              r.recordCount,
              <span className="text-slate-400">{r.latestDate || '—'}</span>,
            ])}
          />
        </div>
      </Card>
    </div>
  );
}

// ---------- QC ----------
function QCDashboard({ data, styles }: { data: DashboardData; styles: StyleOverview[] }) {
  const passRate = data.qc.totalCpiReports > 0 ? Math.round(data.qc.passed / data.qc.totalCpiReports * 100) : 0;
  const qcStyles = styles.filter(s => s.qcTotal > 0);

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard icon={CheckSquare}  label="Total Inspections"  value={data.qc.totalCpiReports} color="blue"    href="/qc/cpi" delay={0.05} />
        <KpiCard icon={Activity}     label="Received Today"     value={data.qc.todayCpi}        color="teal"               delay={0.1}  />
        <KpiCard icon={CheckCircle2} label="Passed"             value={data.qc.passed}          color="emerald"            delay={0.15} />
        <KpiCard icon={XCircle}      label="Failed"             value={data.qc.failed}          color={data.qc.failed > 0 ? 'red' : 'slate'} delay={0.2} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Pie */}
        <Card title="Inspection Results" icon={PieIcon}>
          <PieChart data={[
            { label: 'Passed',  value: data.qc.passed,  color: '#10b981' },
            { label: 'Failed',  value: data.qc.failed,  color: '#ef4444' },
            { label: 'Pending', value: data.qc.pending, color: '#f59e0b' },
          ]} centerValue={String(data.qc.totalCpiReports)} centerLabel="Total" />
        </Card>

        {/* Stats */}
        <Card title="Summary Stats" icon={BarChart2} className="lg:col-span-2">
          <div className="grid grid-cols-3 gap-4 mb-4">
            <StatTile label="Pass Rate" value={`${passRate}%`}   color="text-emerald-700" bg="bg-emerald-50" />
            <StatTile label="Pending"   value={data.qc.pending}  color="text-amber-700"  bg="bg-amber-50"   />
            <StatTile label="Today"     value={data.qc.todayCpi} color="text-blue-700"   bg="bg-blue-50"    />
          </div>
          <div className="space-y-2.5">
            <div>
              <div className="flex justify-between text-xs text-slate-500 mb-1"><span>Pass rate</span><span className="font-bold text-emerald-600">{passRate}%</span></div>
              <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${passRate}%` }} /></div>
            </div>
            <div>
              <div className="flex justify-between text-xs text-slate-500 mb-1"><span>Fail rate</span><span className="font-bold text-red-600">{data.qc.totalCpiReports > 0 ? Math.round(data.qc.failed/data.qc.totalCpiReports*100) : 0}%</span></div>
              <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden"><div className="h-full rounded-full bg-red-400" style={{ width: `${data.qc.totalCpiReports > 0 ? Math.round(data.qc.failed/data.qc.totalCpiReports*100) : 0}%` }} /></div>
            </div>
            <div>
              <div className="flex justify-between text-xs text-slate-500 mb-1"><span>Pending rate</span><span className="font-bold text-amber-600">{data.qc.totalCpiReports > 0 ? Math.round(data.qc.pending/data.qc.totalCpiReports*100) : 0}%</span></div>
              <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden"><div className="h-full rounded-full bg-amber-400" style={{ width: `${data.qc.totalCpiReports > 0 ? Math.round(data.qc.pending/data.qc.totalCpiReports*100) : 0}%` }} /></div>
            </div>
          </div>
        </Card>
      </div>

      {/* Per-style QC results */}
      {qcStyles.length > 0 && (
        <Card title="QC Results — Per Style" icon={CheckSquare}>
          <SimpleTable
            headers={['Style', 'Customer', 'Total', 'Passed', 'Failed', 'Pending', 'Pass Rate']}
            rows={qcStyles.map(s => [
              <span className="font-bold">{s.styleNo}</span>,
              <span className="text-slate-500">{s.customerName}</span>,
              s.qcTotal,
              <span className="font-bold text-emerald-700">{s.qcPassed}</span>,
              <span className={`font-bold ${s.qcFailed > 0 ? 'text-red-600' : 'text-slate-400'}`}>{s.qcFailed}</span>,
              <span className={`font-bold ${s.qcPending > 0 ? 'text-amber-600' : 'text-slate-400'}`}>{s.qcPending}</span>,
              <MiniProgress value={s.qcPassed} max={s.qcTotal} color="#10b981" />,
            ])}
          />
        </Card>
      )}

      {/* Delivery tracker summary */}
      {styles.filter(s => s.totalDispatched > 0).length > 0 && (
        <Card title="Delivery Tracker Summary" icon={Truck}
          action={<Link to="/gatepass/advicenote" className="text-[10px] font-bold text-blue-600 flex items-center gap-1">Full tracker <ArrowRight className="h-3 w-3" /></Link>}>
          <SimpleTable
            headers={['Style', 'Customer', 'Bulk Qty', 'Dispatched', 'Remaining', 'Progress']}
            rows={styles.filter(s => s.totalDispatched > 0).map(s => [
              <span className="font-bold">{s.styleNo}</span>,
              <span className="text-slate-500">{s.customerName}</span>,
              s.bulkQty.toLocaleString(),
              <span className="font-bold text-teal-700">{s.totalDispatched.toLocaleString()}</span>,
              <span className={`font-bold ${s.remainingBulk > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>{s.remainingBulk.toLocaleString()}</span>,
              <MiniProgress value={s.totalDispatched} max={s.bulkQty} color="#14b8a6" />,
            ])}
          />
        </Card>
      )}
    </div>
  );
}

// ---------- GATEPASS ----------
function GatepassDashboard({ data, styles }: { data: DashboardData; styles: StyleOverview[] }) {
  const dispatchedStyles = styles.filter(s => s.totalDispatched > 0);
  const totalBulk = styles.reduce((s, x) => s + x.bulkQty, 0);
  const totalDispatched = styles.reduce((s, x) => s + x.totalDispatched, 0);
  const deliveryRate = totalBulk > 0 ? Math.round(totalDispatched / totalBulk * 100) : 0;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard icon={Truck}        label="Total Advice Notes" value={data.gatepass.totalAdviceNotes}              color="blue"    href="/gatepass/advicenote" delay={0.05} />
        <KpiCard icon={Package}      label="Total Dispatched"   value={data.gatepass.totalDispatchedQty.toLocaleString()} sub="pcs"  color="emerald"                          delay={0.1}  />
        <KpiCard icon={Activity}     label="Dispatched Today"   value={data.gatepass.todayDispatched}                color="teal"                                             delay={0.15} />
        <KpiCard icon={Star}         label="Delivery Rate"      value={`${deliveryRate}%`}                           color={deliveryRate >= 80 ? 'emerald' : deliveryRate >= 50 ? 'amber' : 'red'} delay={0.2} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card title="Delivery Progress" icon={Truck}>
          <MiniDonut value={totalDispatched} total={totalBulk} size={120} color="#14b8a6" />
          <div className="mt-4 text-center">
            <p className="text-xs text-slate-500">Dispatched of total bulk</p>
            <p className="text-lg font-black text-slate-800 mt-1">{totalDispatched.toLocaleString()} / {totalBulk.toLocaleString()} pcs</p>
          </div>
        </Card>

        {dispatchedStyles.length > 0 && (
          <Card title="Dispatch by Style" icon={BarChart2} className="lg:col-span-2">
            <HorizontalBarChart data={dispatchedStyles.map(s => ({ label: `${s.styleNo}`, value: s.totalDispatched, max: Math.max(1, s.bulkQty), color: '#14b8a6' }))} />
          </Card>
        )}
      </div>

      {/* Recent dispatches */}
      {data.recent.dispatches.length > 0 && (
        <Card title="Recent Dispatches" icon={FileText}
          action={<Link to="/gatepass/advicenote" className="text-[10px] font-bold text-blue-600 flex items-center gap-1">All <ArrowRight className="h-3 w-3" /></Link>}>
          <SimpleTable
            headers={['AD No', 'Style', 'Customer', 'Qty', 'Date']}
            rows={data.recent.dispatches.map((d: any) => [
              <span className="font-bold">{d.adNo}</span>,
              d.styleNo,
              <span className="text-slate-500">{d.customerName || '—'}</span>,
              <span className="font-bold text-teal-700">{d.dispatchQty}</span>,
              <span className="text-slate-400">{d.date}</span>,
            ])}
          />
        </Card>
      )}

      {/* Delivery tracker */}
      {dispatchedStyles.length > 0 && (
        <Card title="Delivery Tracker — All Styles" icon={Truck}>
          <SimpleTable
            headers={['Style', 'Customer', 'Stage', 'Bulk Qty', 'Dispatched', 'Remaining', 'Progress']}
            rows={dispatchedStyles.map(s => [
              <span className="font-bold">{s.styleNo}</span>,
              <span className="text-slate-500">{s.customerName}</span>,
              <StageBadge stage={s.stage} />,
              s.bulkQty.toLocaleString(),
              <span className="font-bold text-teal-700">{s.totalDispatched.toLocaleString()}</span>,
              <span className={`font-bold ${s.remainingBulk > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>{s.remainingBulk.toLocaleString()}</span>,
              <MiniProgress value={s.totalDispatched} max={s.bulkQty} color="#14b8a6" />,
            ])}
          />
        </Card>
      )}
    </div>
  );
}

// ---------- AUDIT ----------
function AuditDashboard({ data, styles }: { data: DashboardData; styles: StyleOverview[] }) {
  const passRate = data.audit.total > 0 ? Math.round(data.audit.passed / data.audit.total * 100) : 0;
  const auditedStyles = styles.filter(s => s.auditTotal > 0);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard icon={Shield}       label="Total Audits"   value={data.audit.total}  color="blue"    href="/audit" delay={0.05} />
        <KpiCard icon={CheckCircle2} label="Passed"         value={data.audit.passed} color="emerald"              delay={0.1}  />
        <KpiCard icon={XCircle}      label="Failed"         value={data.audit.failed} color={data.audit.failed > 0 ? 'red' : 'slate'} delay={0.15} />
        <KpiCard icon={Star}         label="Pass Rate"      value={`${passRate}%`}    color={passRate >= 80 ? 'emerald' : passRate >= 50 ? 'amber' : 'red'} delay={0.2} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card title="Audit Results" icon={PieIcon}>
          <PieChart data={[
            { label: 'Pass', value: data.audit.passed, color: '#10b981' },
            { label: 'Fail', value: data.audit.failed, color: '#ef4444' },
          ]} centerValue={`${passRate}%`} centerLabel="Pass rate" />
        </Card>

        <Card title="Audit Stats" icon={BarChart2} className="lg:col-span-2">
          <div className="grid grid-cols-3 gap-4 mb-4">
            <StatTile label="Pass Rate"    value={`${passRate}%`}    color="text-emerald-700" bg="bg-emerald-50" />
            <StatTile label="Passed"       value={data.audit.passed} color="text-emerald-700" bg="bg-emerald-50" />
            <StatTile label="Failed"       value={data.audit.failed} color="text-red-700"     bg="bg-red-50"     />
          </div>
          <div className="space-y-2">
            <div>
              <div className="flex justify-between text-xs text-slate-500 mb-1"><span>Pass rate</span><span className="font-bold text-emerald-600">{passRate}%</span></div>
              <div className="h-3 rounded-full bg-slate-100 overflow-hidden"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${passRate}%` }} /></div>
            </div>
            <div>
              <div className="flex justify-between text-xs text-slate-500 mb-1"><span>Fail rate</span><span className="font-bold text-red-600">{100 - passRate}%</span></div>
              <div className="h-3 rounded-full bg-slate-100 overflow-hidden"><div className="h-full rounded-full bg-red-400" style={{ width: `${100 - passRate}%` }} /></div>
            </div>
          </div>
        </Card>
      </div>

      {/* Per-style audit */}
      {auditedStyles.length > 0 && (
        <Card title="Audit Results — Per Style" icon={Shield}>
          <SimpleTable
            headers={['Style', 'Customer', 'Total', 'Passed', 'Failed', 'Pass Rate', 'Stage']}
            rows={auditedStyles.map(s => [
              <span className="font-bold">{s.styleNo}</span>,
              <span className="text-slate-500">{s.customerName}</span>,
              s.auditTotal,
              <span className="font-bold text-emerald-700">{s.auditPassed}</span>,
              <span className={`font-bold ${s.auditFailed > 0 ? 'text-red-600' : 'text-slate-400'}`}>{s.auditFailed}</span>,
              <MiniProgress value={s.auditPassed} max={s.auditTotal} color="#10b981" />,
              <StageBadge stage={s.stage} />,
            ])}
          />
        </Card>
      )}

      {/* Recent audits */}
      {data.recent.audits.length > 0 && (
        <Card title="Recent Audits" icon={FileText}
          action={<Link to="/audit" className="text-[10px] font-bold text-blue-600 flex items-center gap-1">All <ArrowRight className="h-3 w-3" /></Link>}>
          <SimpleTable
            headers={['Style', 'Result', 'Date']}
            rows={data.recent.audits.map((a: any) => [
              <span className="font-bold">{a.styleNo || '—'}</span>,
              <span className={`font-bold ${a.result === 'Pass' ? 'text-emerald-700' : 'text-red-600'}`}>{a.result}</span>,
              <span className="text-slate-400">{a.date}</span>,
            ])}
          />
        </Card>
      )}

      {/* Delivery tracker for audit role */}
      {styles.filter(s => s.totalDispatched > 0).length > 0 && (
        <Card title="Delivery Tracker Summary" icon={Truck}>
          <SimpleTable
            headers={['Style', 'Customer', 'Stage', 'Dispatched', 'Remaining', 'Progress']}
            rows={styles.filter(s => s.totalDispatched > 0).map(s => [
              <span className="font-bold">{s.styleNo}</span>,
              <span className="text-slate-500">{s.customerName}</span>,
              <StageBadge stage={s.stage} />,
              <span className="font-bold text-teal-700">{s.totalDispatched.toLocaleString()}</span>,
              <span className={`font-bold ${s.remainingBulk > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>{s.remainingBulk.toLocaleString()}</span>,
              <MiniProgress value={s.totalDispatched} max={s.bulkQty} color="#14b8a6" />,
            ])}
          />
        </Card>
      )}
    </div>
  );
}

// ---------- WORKER ----------
function WorkerDashboard({ data, styles }: { data: DashboardData; styles: StyleOverview[] }) {
  const totalToday = data.worker.todaySeating + data.worker.todayPrinting + data.worker.todayCuring +
    data.worker.todayChecking + data.worker.todayPacking + data.worker.todayDispatch;

  const workerStyles = styles.filter(s => s.workerEntries > 0 || s.totalWorkerOutput > 0);

  const todayBreakdown = [
    { label: 'Seating',  value: data.worker.todaySeating,  color: '#3b82f6' },
    { label: 'Printing', value: data.worker.todayPrinting, color: '#8b5cf6' },
    { label: 'Curing',   value: data.worker.todayCuring,   color: '#f59e0b' },
    { label: 'Checking', value: data.worker.todayChecking, color: '#14b8a6' },
    { label: 'Packing',  value: data.worker.todayPacking,  color: '#6366f1' },
    { label: 'Dispatch', value: data.worker.todayDispatch, color: '#10b981' },
  ];

  return (
    <div className="space-y-5">
      {/* Today highlight */}
      <div className="rounded-xl bg-gradient-to-r from-slate-800 to-slate-700 p-5 text-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs font-medium text-slate-300 uppercase tracking-widest">Today's Output</p>
            <p className="text-4xl font-black mt-1">{totalToday} <span className="text-lg font-normal text-slate-300">pcs</span></p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400">Entries logged</p>
            <p className="text-2xl font-black">{data.worker.todayOutput}</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {todayBreakdown.map(item => (
            <div key={item.label} className="rounded-lg bg-white/10 p-2.5 text-center">
              <div className="w-2 h-2 rounded-full mx-auto mb-1.5" style={{ backgroundColor: item.color }} />
              <p className="text-sm font-black">{item.value}</p>
              <p className="text-[9px] text-slate-300 font-medium mt-0.5">{item.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <KpiCard icon={Factory}       label="Total Entries (All Time)" value={data.worker.totalDailyOutput}  color="blue"  href="/worker"          delay={0.05} />
        <KpiCard icon={Layers}        label="Styles Worked On"         value={workerStyles.length}           color="purple"                         delay={0.1}  />
        <KpiCard icon={Clock}         label="Pending Downtime Reports" value={data.worker.pendingDowntime}   color={data.worker.pendingDowntime > 0 ? 'amber' : 'slate'} href="/worker/downtime" delay={0.15} />
      </div>

      {/* Today's bar chart */}
      <Card title="Today's Output — By Section" icon={BarChart2}
        action={<span className="text-xs font-bold text-slate-700">{totalToday} total pcs</span>}>
        <MiniBarChart data={todayBreakdown} height={150} />
      </Card>

      {/* Per style breakdown */}
      {workerStyles.length > 0 && (
        <Card title="Work Per Style — Qty & Remaining" icon={Layers}>
          <div className="space-y-3">
            {workerStyles.map(s => {
              const remaining = Math.max(0, s.bulkQty - s.totalWorkerOutput);
              const pct = s.bulkQty > 0 ? Math.min(100, Math.round(s.totalWorkerOutput / s.bulkQty * 100)) : 0;
              return (
                <div key={s.styleNo} className="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="font-bold text-sm text-slate-800">{s.styleNo}</span>
                      <span className="text-xs text-slate-500 ml-2">{s.customerName}</span>
                    </div>
                    <StageBadge stage={s.stage} />
                  </div>
                  <div className="grid grid-cols-3 gap-3 mb-2.5 text-center">
                    <div>
                      <p className="text-xs text-slate-400">Total Output</p>
                      <p className="text-lg font-black text-blue-700">{s.totalWorkerOutput.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Bulk Qty</p>
                      <p className="text-lg font-black text-slate-700">{s.bulkQty.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Remaining</p>
                      <p className={`text-lg font-black ${remaining > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>{remaining.toLocaleString()}</p>
                    </div>
                  </div>
                  <MiniProgress value={s.totalWorkerOutput} max={s.bulkQty} color={pct >= 100 ? '#10b981' : pct >= 50 ? '#3b82f6' : '#f59e0b'} />
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Downtime alert */}
      {data.worker.pendingDowntime > 0 && (
        <Link to="/worker/downtime" className="block rounded-xl border-2 border-dashed border-amber-300 bg-amber-50 p-4">
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-amber-600 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-bold text-amber-800">You have {data.worker.pendingDowntime} pending downtime report{data.worker.pendingDowntime > 1 ? 's' : ''}</p>
              <p className="text-xs text-amber-600">These need manager approval.</p>
            </div>
            <ArrowRight className="h-4 w-4 text-amber-600" />
          </div>
        </Link>
      )}
    </div>
  );
}

// ==========================================
// ADMIN — ENHANCED PIPELINE TABLE WITH FULL QTY TYPES
// ==========================================
function PipelineTable({ styles, storeInRecords }: { styles: StyleOverview[]; storeInRecords: StoreInRecord[] }) {
  const PAGE = 10;
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  // Build a map of styleNo → cut qty / bundles from store-in records
  const styleExtraData = useMemo(() => {
    const map = new Map<string, { totalCutQty: number; totalBundles: number; totalInQty: number }>();
    storeInRecords.forEach(r => {
      const bundleCount = (r.cuts || []).reduce((s, c) => s + (c.bundles?.length || 0), 0);
      const existing = map.get(r.styleNo) || { totalCutQty: 0, totalBundles: 0, totalInQty: 0 };
      existing.totalCutQty += r.totalCutQty || 0;
      existing.totalBundles += bundleCount;
      existing.totalInQty += r.inQty || 0;
      map.set(r.styleNo, existing);
    });
    return map;
  }, [storeInRecords]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return styles.filter(s => {
      if (q && !s.styleNo.toLowerCase().includes(q) && !s.customerName.toLowerCase().includes(q)) return false;
      if (stageFilter && s.stage !== stageFilter) return false;
      return true;
    });
  }, [styles, search, stageFilter]);

  const pages = Math.ceil(filtered.length / PAGE);
  const slice = filtered.slice(page * PAGE, (page + 1) * PAGE);

  useEffect(() => { setPage(0); }, [search, stageFilter]);

  return (
    <Card title={`All Styles — Full Pipeline with Qty Breakdown (${filtered.length} of ${styles.length})`} icon={TrendingUp} noPadding>
      {/* Filters */}
      <div className="flex flex-wrap gap-2 p-4 border-b border-slate-100">
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search style or customer..."
          className="flex-1 min-w-[160px] rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
        <select value={stageFilter} onChange={e => setStageFilter(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">All stages</option>
          {Object.keys(STAGE_META).map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        {(search || stageFilter) && (
          <button onClick={() => { setSearch(''); setStageFilter(''); }} className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-600">Clear</button>
        )}
      </div>

      {/* Column legend */}
      <div className="px-4 py-2 border-b border-slate-100 bg-slate-50/60">
        <p className="text-[10px] text-slate-500 leading-relaxed">
          <b className="text-slate-600">Bulk</b> = approved order qty · <b className="text-blue-600">IN</b> = received in store · <b className="text-purple-600">Cut</b> = cut for production · <b className="text-amber-600">Bundles</b> = bundle count · <b className="text-indigo-600">Issued</b> = sent to production · <b className="text-teal-600">Dispatched</b> = shipped · <b className="text-emerald-600">Remain</b> = bulk − dispatched
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold uppercase tracking-wide text-slate-500">
              <th className="px-3 py-3 text-left w-6"></th>
              <th className="px-3 py-3 text-left">Style</th>
              <th className="px-3 py-3 text-left">Customer</th>
              <th className="px-3 py-3 text-center">Stage</th>
              <th className="px-3 py-3 text-right">Bulk</th>
              <th className="px-3 py-3 text-right">IN</th>
              <th className="px-3 py-3 text-right">Cut</th>
              <th className="px-3 py-3 text-right">Bdls</th>
              <th className="px-3 py-3 text-right">Issued</th>
              <th className="px-3 py-3 text-right">Disp.</th>
              <th className="px-3 py-3 text-right">Remain</th>
              <th className="px-3 py-3 text-center">Pipeline</th>
              <th className="px-3 py-3 text-left min-w-[110px]">Progress</th>
            </tr>
          </thead>
          <tbody>
            {slice.map((s, i) => {
              const pct = s.bulkQty > 0 ? Math.round(s.totalDispatched / s.bulkQty * 100) : 0;
              const isExp = expanded === s.styleNo;
              const extra = styleExtraData.get(s.styleNo) || { totalCutQty: 0, totalBundles: 0, totalInQty: 0 };
              return (
                <>
                  <tr key={s.styleNo} className="border-b border-slate-50 hover:bg-slate-50/60 cursor-pointer" onClick={() => setExpanded(isExp ? null : s.styleNo)}>
                    <td className="px-3 py-3">
                      {isExp ? <ChevronDown className="h-3.5 w-3.5 text-slate-400" /> : <ChevronRight className="h-3.5 w-3.5 text-slate-400" />}
                    </td>
                    <td className="px-3 py-3 font-bold text-slate-800">{s.styleNo}</td>
                    <td className="px-3 py-3 text-slate-500 text-xs">{s.customerName}</td>
                    <td className="px-3 py-3 text-center"><StageBadge stage={s.stage} /></td>
                    <td className="px-3 py-3 text-right font-semibold text-slate-700">{s.bulkQty.toLocaleString()}</td>
                    <td className="px-3 py-3 text-right text-blue-600 font-semibold">{s.totalReceived > 0 ? s.totalReceived.toLocaleString() : <span className="text-slate-300">—</span>}</td>
                    <td className="px-3 py-3 text-right text-purple-600 font-semibold">{extra.totalCutQty > 0 ? extra.totalCutQty.toLocaleString() : <span className="text-slate-300">—</span>}</td>
                    <td className="px-3 py-3 text-right text-amber-600 font-semibold">{extra.totalBundles > 0 ? extra.totalBundles.toLocaleString() : <span className="text-slate-300">—</span>}</td>
                    <td className="px-3 py-3 text-right text-indigo-600 font-semibold">{s.totalIssued > 0 ? s.totalIssued.toLocaleString() : <span className="text-slate-300">—</span>}</td>
                    <td className="px-3 py-3 text-right text-teal-600 font-semibold">{s.totalDispatched > 0 ? s.totalDispatched.toLocaleString() : <span className="text-slate-300">—</span>}</td>
                    <td className={`px-3 py-3 text-right font-semibold ${s.remainingBulk > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>{s.remainingBulk.toLocaleString()}</td>
                    <td className="px-3 py-3 text-center"><PipelineSteps style={s} /></td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${Math.min(100, pct)}%`, backgroundColor: pct >= 100 ? '#10b981' : pct >= 50 ? '#3b82f6' : '#f59e0b' }} />
                        </div>
                        <span className="text-[11px] font-bold text-slate-600 w-8 text-right">{pct}%</span>
                      </div>
                    </td>
                  </tr>
                  {isExp && (
                    <tr key={`${s.styleNo}-exp`} className="border-b border-slate-100 bg-slate-50/80">
                      <td colSpan={13} className="px-6 py-4">
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7 text-xs">
                          <div className="rounded-lg bg-white border border-slate-200 p-3 text-center">
                            <p className="text-slate-400 font-medium mb-1">Schedule No</p>
                            <p className="text-sm font-bold text-slate-700">{s.scheduleNo || '—'}</p>
                          </div>
                          <div className="rounded-lg bg-white border border-slate-200 p-3 text-center">
                            <p className="text-slate-400 font-medium mb-1">Store-In Records</p>
                            <p className="text-lg font-black text-slate-700">{s.storeInCount}</p>
                          </div>
                          <div className="rounded-lg bg-white border border-slate-200 p-3 text-center">
                            <p className="text-slate-400 font-medium mb-1">Total Cuts</p>
                            <p className="text-lg font-black text-slate-700">{s.totalCuts || '—'}</p>
                          </div>
                          <div className="rounded-lg bg-white border border-slate-200 p-3 text-center">
                            <p className="text-slate-400 font-medium mb-1">QC Results</p>
                            <p className="text-sm font-bold"><span className="text-emerald-600">{s.qcPassed}P</span>{s.qcFailed > 0 && <span className="text-red-500 ml-1">{s.qcFailed}F</span>}{s.qcPending > 0 && <span className="text-amber-500 ml-1">{s.qcPending}⌛</span>}{s.qcTotal === 0 && <span className="text-slate-300">—</span>}</p>
                          </div>
                          <div className="rounded-lg bg-white border border-slate-200 p-3 text-center">
                            <p className="text-slate-400 font-medium mb-1">Audit</p>
                            <p className="text-sm font-bold">{s.auditTotal > 0 ? <><span className="text-emerald-600">{s.auditPassed}P</span>{s.auditFailed > 0 && <span className="text-red-500 ml-1">{s.auditFailed}F</span>}</> : <span className="text-slate-300">—</span>}</p>
                          </div>
                          <div className="rounded-lg bg-white border border-slate-200 p-3 text-center">
                            <p className="text-slate-400 font-medium mb-1">Worker Output</p>
                            <p className="text-lg font-black text-purple-700">{s.totalWorkerOutput.toLocaleString()}</p>
                          </div>
                          <div className="rounded-lg bg-white border border-slate-200 p-3 text-center">
                            <p className="text-slate-400 font-medium mb-1">Received %</p>
                            <p className="text-lg font-black text-blue-700">{s.receivedPct}%</p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>
      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50">
          <p className="text-xs text-slate-500">Showing {page * PAGE + 1}–{Math.min((page + 1) * PAGE, filtered.length)} of {filtered.length}</p>
          <div className="flex gap-1">
            <button disabled={page === 0} onClick={() => setPage(p => p - 1)}
              className="rounded px-2.5 py-1 text-xs font-medium border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40">Prev</button>
            {Array.from({ length: Math.min(5, pages) }, (_, i) => {
              const pg = page <= 2 ? i : page >= pages - 3 ? pages - 5 + i : page - 2 + i;
              if (pg < 0 || pg >= pages) return null;
              return (
                <button key={pg} onClick={() => setPage(pg)}
                  className={`rounded px-2.5 py-1 text-xs font-medium border ${pg === page ? 'border-blue-500 bg-blue-500 text-white' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>{pg + 1}</button>
              );
            })}
            <button disabled={page >= pages - 1} onClick={() => setPage(p => p + 1)}
              className="rounded px-2.5 py-1 text-xs font-medium border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40">Next</button>
          </div>
        </div>
      )}
    </Card>
  );
}

// ==========================================
// ADMIN — SYSTEM BULK SUMMARY PER STYLE
// ==========================================
function SystemBulkSummary({ styles, storeInRecords }: { styles: StyleOverview[]; storeInRecords: StoreInRecord[] }) {
  const [styleFilter, setStyleFilter] = useState('');
  const [customerFilter, setCustomerFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Merge style overview + store-in records (for cut qty / bundles / latest date)
  const merged = useMemo(() => {
    const extraMap = new Map<string, { cutQty: number; bundles: number; latestDate: string }>();
    storeInRecords.forEach(r => {
      const bundleCount = (r.cuts || []).reduce((s, c) => s + (c.bundles?.length || 0), 0);
      const day = (r.cutInDate || '').slice(0, 10);
      const ex = extraMap.get(r.styleNo) || { cutQty: 0, bundles: 0, latestDate: '' };
      ex.cutQty += r.totalCutQty || 0;
      ex.bundles += bundleCount;
      if (day > ex.latestDate) ex.latestDate = day;
      extraMap.set(r.styleNo, ex);
    });
    return styles.map(s => {
      const extra = extraMap.get(s.styleNo) || { cutQty: 0, bundles: 0, latestDate: '' };
      return { ...s, totalCutQty: extra.cutQty, totalBundles: extra.bundles, latestDate: extra.latestDate };
    });
  }, [styles, storeInRecords]);

  // Unique sorted options
  const styleOptions = useMemo(() => Array.from(new Set(merged.map(s => s.styleNo))).filter(Boolean).sort(), [merged]);
  const customerOptions = useMemo(() => Array.from(new Set(merged.map(s => s.customerName))).filter(Boolean).sort(), [merged]);

  const filtered = useMemo(() => {
    return merged.filter(s => {
      if (styleFilter && s.styleNo !== styleFilter) return false;
      if (customerFilter && s.customerName !== customerFilter) return false;
      if (dateFrom && s.latestDate && s.latestDate < dateFrom) return false;
      if (dateTo && s.latestDate && s.latestDate > dateTo) return false;
      // If date filter active but style has no date, exclude it
      if ((dateFrom || dateTo) && !s.latestDate) return false;
      return true;
    });
  }, [merged, styleFilter, customerFilter, dateFrom, dateTo]);

  const hasFilter = !!(styleFilter || customerFilter || dateFrom || dateTo);

  // Totals (computed from filtered view so admin sees numbers for filter selection)
  const totals = useMemo(() => ({
    bulk: filtered.reduce((s, x) => s + x.bulkQty, 0),
    received: filtered.reduce((s, x) => s + x.totalReceived, 0),
    cut: filtered.reduce((s, x) => s + x.totalCutQty, 0),
    issued: filtered.reduce((s, x) => s + x.totalIssued, 0),
    dispatched: filtered.reduce((s, x) => s + x.totalDispatched, 0),
    remaining: filtered.reduce((s, x) => s + x.remainingBulk, 0),
  }), [filtered]);

  return (
    <Card title="System Bulk Qty per Style — Complete Overview" icon={Boxes} noPadding
      action={hasFilter ? <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Filtered View</span> : undefined}>
      {/* Totals row */}
      <div className="grid grid-cols-2 gap-0 sm:grid-cols-3 lg:grid-cols-6 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white">
        <div className="p-4 border-r border-slate-100">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">System Bulk</p>
          <p className="text-2xl font-black text-slate-800 mt-1">{totals.bulk.toLocaleString()}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">pcs ordered</p>
        </div>
        <div className="p-4 border-r border-slate-100">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total IN</p>
          <p className="text-2xl font-black text-blue-700 mt-1">{totals.received.toLocaleString()}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">pcs received</p>
        </div>
        <div className="p-4 border-r border-slate-100">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Cut</p>
          <p className="text-2xl font-black text-purple-700 mt-1">{totals.cut.toLocaleString()}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">pcs cut</p>
        </div>
        <div className="p-4 border-r border-slate-100">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Issued</p>
          <p className="text-2xl font-black text-indigo-700 mt-1">{totals.issued.toLocaleString()}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">pcs to prod.</p>
        </div>
        <div className="p-4 border-r border-slate-100">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Dispatched</p>
          <p className="text-2xl font-black text-teal-700 mt-1">{totals.dispatched.toLocaleString()}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">pcs shipped</p>
        </div>
        <div className="p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Remaining</p>
          <p className={`text-2xl font-black mt-1 ${totals.remaining > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>{totals.remaining.toLocaleString()}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">pcs pending</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3 p-4 border-b border-slate-100">
        <div className="flex-1 min-w-[160px]">
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Style No</label>
          <select value={styleFilter} onChange={e => setStyleFilter(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">All styles</option>
            {styleOptions.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="flex-1 min-w-[160px]">
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Customer</label>
          <select value={customerFilter} onChange={e => setCustomerFilter(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">All customers</option>
            {customerOptions.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">From Date</label>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">To Date</label>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        {hasFilter && (
          <button onClick={() => { setStyleFilter(''); setCustomerFilter(''); setDateFrom(''); setDateTo(''); }}
            className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-100">Clear</button>
        )}
        <span className="text-xs text-slate-400 ml-auto">{filtered.length} of {merged.length} styles</span>
      </div>

      {/* Style cards grid */}
      <div className="divide-y divide-slate-100">
        {filtered.map(s => {
          const cutVsBulk = s.bulkQty > 0 ? Math.min(100, Math.round(s.totalCutQty / s.bulkQty * 100)) : 0;
          const recVsBulk = s.bulkQty > 0 ? Math.min(100, Math.round(s.totalReceived / s.bulkQty * 100)) : 0;
          const dispVsBulk = s.bulkQty > 0 ? Math.min(100, Math.round(s.totalDispatched / s.bulkQty * 100)) : 0;
          return (
            <div key={s.styleNo} className="p-4 hover:bg-slate-50/50 transition-colors">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div>
                    <span className="font-bold text-sm text-slate-800">{s.styleNo}</span>
                    <span className="text-xs text-slate-500 ml-2">— {s.customerName}</span>
                  </div>
                  <StageBadge stage={s.stage} />
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-slate-400 font-medium">Bulk Qty</p>
                  <p className="text-lg font-black text-slate-800">{s.bulkQty.toLocaleString()}</p>
                </div>
              </div>

              {/* Stacked bar showing all qty stages */}
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-bold text-slate-500 uppercase w-16 shrink-0">Received</span>
                  <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full rounded-full bg-blue-500" style={{ width: `${recVsBulk}%` }} />
                  </div>
                  <span className="text-xs font-bold text-blue-700 w-20 text-right shrink-0">{s.totalReceived.toLocaleString()} <span className="text-slate-400 font-normal">({recVsBulk}%)</span></span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-bold text-slate-500 uppercase w-16 shrink-0">Cut</span>
                  <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full rounded-full bg-purple-500" style={{ width: `${cutVsBulk}%` }} />
                  </div>
                  <span className="text-xs font-bold text-purple-700 w-20 text-right shrink-0">{s.totalCutQty.toLocaleString()} <span className="text-slate-400 font-normal">({cutVsBulk}%)</span></span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-bold text-slate-500 uppercase w-16 shrink-0">Dispatched</span>
                  <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full rounded-full bg-teal-500" style={{ width: `${dispVsBulk}%` }} />
                  </div>
                  <span className="text-xs font-bold text-teal-700 w-20 text-right shrink-0">{s.totalDispatched.toLocaleString()} <span className="text-slate-400 font-normal">({dispVsBulk}%)</span></span>
                </div>
              </div>

              {/* Mini qty row */}
              <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-3 gap-2 sm:grid-cols-6 text-xs">
                <div><span className="text-slate-400">Bundles: </span><b className="text-amber-700">{s.totalBundles}</b></div>
                <div><span className="text-slate-400">Cuts: </span><b className="text-slate-700">{s.totalCuts}</b></div>
                <div><span className="text-slate-400">Issued: </span><b className="text-indigo-700">{s.totalIssued.toLocaleString()}</b></div>
                <div><span className="text-slate-400">QC: </span><b className="text-emerald-700">{s.qcPassed}</b>/<b className="text-slate-500">{s.qcTotal}</b></div>
                <div><span className="text-slate-400">Output: </span><b className="text-purple-700">{s.totalWorkerOutput.toLocaleString()}</b></div>
                <div><span className="text-slate-400">Remaining: </span><b className={s.remainingBulk > 0 ? 'text-amber-600' : 'text-emerald-600'}>{s.remainingBulk.toLocaleString()}</b></div>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="p-12 text-center text-sm text-slate-400">No styles match the selected filters</div>
        )}
      </div>
    </Card>
  );
}

// ==========================================
// ADMIN — ROLE TABS (for viewing each role dashboard)
// ==========================================
type RoleTab = 'overview' | 'Developer' | 'Stores' | 'QC' | 'Gatepass' | 'Audit' | 'Worker';

const ROLE_TABS: { key: RoleTab; label: string; icon: any; color: string }[] = [
  { key: 'overview',  label: 'Overview',   icon: LayoutDashboard, color: 'text-slate-600'  },
  { key: 'Developer', label: 'Developer',  icon: Code,            color: 'text-blue-600'   },
  { key: 'Stores',    label: 'Stores',     icon: PackageOpen,     color: 'text-teal-600'   },
  { key: 'QC',        label: 'QC',         icon: CheckSquare,     color: 'text-emerald-600'},
  { key: 'Gatepass',  label: 'Gatepass',   icon: Truck,           color: 'text-amber-600'  },
  { key: 'Audit',     label: 'Audit',      icon: Shield,          color: 'text-indigo-600' },
  { key: 'Worker',    label: 'Worker',     icon: Factory,         color: 'text-orange-600' },
];

function RoleTabBar({ active, onChange }: { active: RoleTab; onChange: (t: RoleTab) => void }) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm">
      {ROLE_TABS.map(tab => {
        const Icon = tab.icon;
        const isActive = active === tab.key;
        return (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-bold whitespace-nowrap transition-all ${
              isActive
                ? 'bg-slate-900 text-white shadow-sm'
                : `${tab.color} hover:bg-slate-50`
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

// ==========================================
// MAIN DASHBOARD
// ==========================================
export default function Dashboard() {
  const { user } = useAuthStore();
  const [data, setData] = useState<DashboardData | null>(null);
  const [styles, setStyles] = useState<StyleOverview[]>([]);
  const [storeInRecords, setStoreInRecords] = useState<StoreInRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [adminTab, setAdminTab] = useState<RoleTab>('overview');

  const load = async () => {
    setLoading(true); setError('');
    try {
      const [dRes, sRes, storeInRes] = await Promise.all([
        fetch(`${API.BASE}/api/dashboard`, { headers: getAuthHeaders() }),
        fetch(`${API.BASE}/api/dashboard/styles`, { headers: getAuthHeaders() }),
        fetch(`${API.INVENTORY}/store-in`, { headers: getAuthHeaders() }),
      ]);
      if (!dRes.ok) throw new Error(await dRes.text());
      setData(await dRes.json());
      if (sRes.ok) setStyles(await sRes.json());
      if (storeInRes.ok) setStoreInRecords(await storeInRes.json());
      else setStoreInRecords([]);
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to load.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const role = user?.role || '';
  const isAdmin = role === 'Admin';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const todayStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-32 gap-3">
      <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      <p className="text-sm text-slate-400">Loading dashboard...</p>
    </div>
  );
  if (error) return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-6">
      <p className="font-semibold text-red-800">Failed to load dashboard</p>
      <p className="text-sm text-red-600 mt-1">{error}</p>
      <button onClick={load} className="mt-3 text-xs font-bold text-red-700 underline">Retry</button>
    </div>
  );
  if (!data) return null;

  const stageCount = styles.reduce((acc, s) => { acc[s.stage] = (acc[s.stage] || 0) + 1; return acc; }, {} as Record<string, number>);
  const totalWorkerToday = data.worker.todaySeating + data.worker.todayPrinting + data.worker.todayCuring + data.worker.todayChecking + data.worker.todayPacking + data.worker.todayDispatch;
  const activeAlerts = (data.approvals.pending > 0 ? 1 : 0) + (data.qc.pending > 0 ? 1 : 0) + (data.worker.pendingDowntime > 0 ? 1 : 0);

  // ===== NON-ADMIN HEADER =====
  if (!isAdmin) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 pb-12">
        <div className="flex items-end justify-between">
          <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}>
            <p className="text-sm text-slate-500">{greeting},</p>
            <h1 className="text-2xl font-bold text-slate-900">{user?.name}</h1>
            <p className="text-xs text-slate-400 mt-0.5 font-medium uppercase tracking-wider">{role}</p>
          </motion.div>
          <button onClick={load} className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
        </div>

        {role === 'Developer' && <DeveloperDashboard data={data} />}
        {role === 'Stores'    && <StoresDashboard data={data} storeInRecords={storeInRecords} styles={styles} />}
        {role === 'QC'        && <QCDashboard data={data} styles={styles} />}
        {role === 'Gatepass'  && <GatepassDashboard data={data} styles={styles} />}
        {role === 'Audit'     && <AuditDashboard data={data} styles={styles} />}
        {role === 'Worker'    && <WorkerDashboard data={data} styles={styles} />}
      </motion.div>
    );
  }

  // ===== ADMIN — PROFESSIONAL DASHBOARD =====
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 pb-12">
      {/* ── Executive Header ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 text-white shadow-lg"
      >
        {/* Decorative pattern */}
        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute -bottom-12 -left-12 w-48 h-48 rounded-full bg-purple-500/10 blur-3xl" />

        <div className="relative flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Building2 className="h-4 w-4 text-blue-300" />
              <p className="text-xs font-bold text-blue-200 uppercase tracking-widest">Admin Control Center</p>
            </div>
            <h1 className="text-3xl font-black tracking-tight">{greeting}, {user?.name}</h1>
            <p className="text-sm text-slate-300 mt-1">{todayStr}</p>
          </div>

          {/* Quick pulse */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="rounded-lg bg-white/10 backdrop-blur px-4 py-2.5 border border-white/10">
              <p className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Active Styles</p>
              <p className="text-2xl font-black">{styles.length}</p>
            </div>
            <div className="rounded-lg bg-white/10 backdrop-blur px-4 py-2.5 border border-white/10">
              <p className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Today's Output</p>
              <p className="text-2xl font-black">{totalWorkerToday.toLocaleString()}</p>
            </div>
            <div className={`rounded-lg backdrop-blur px-4 py-2.5 border ${activeAlerts > 0 ? 'bg-amber-500/20 border-amber-400/30' : 'bg-emerald-500/20 border-emerald-400/30'}`}>
              <p className="text-[10px] font-bold text-slate-200 uppercase tracking-wider">Alerts</p>
              <p className={`text-2xl font-black ${activeAlerts > 0 ? 'text-amber-200' : 'text-emerald-200'}`}>{activeAlerts}</p>
            </div>
            <button onClick={load} className="flex items-center gap-1.5 rounded-lg bg-white/10 hover:bg-white/20 backdrop-blur border border-white/10 px-3 py-2.5 text-xs font-semibold text-white transition-all">
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </button>
          </div>
        </div>
      </motion.div>

      {/* ── Role Tab Bar ── */}
      <RoleTabBar active={adminTab} onChange={setAdminTab} />

      <AnimatePresence mode="wait">
        {adminTab === 'overview' && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {/* ── Master Pipeline KPI Strip ── */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Gauge className="h-4 w-4 text-slate-400" />
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">Full Pipeline Flow</h3>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
                <KpiCard icon={Code}           label="Dev Jobs"    value={data.development.totalJobs}                          color="slate"   href="/development"           delay={0.02} sub={`${data.development.totalSubmissions} subs`} />
                <KpiCard icon={ClipboardCheck} label="Approved"    value={data.approvals.approved}                             color="emerald" href="/admin/approve"         delay={0.04} sub={`${data.approvals.pending} pending`} />
                <KpiCard icon={PackageOpen}    label="Store-In"    value={data.stores.totalStoreIn}                            color="blue"    href="/inventory/in"          delay={0.06} sub={`${data.stores.totalInQty.toLocaleString()} pcs`} />
                <KpiCard icon={CheckSquare}    label="QC Passed"   value={data.qc.passed}                                      color="emerald" href="/qc/cpi"                delay={0.08} sub={`${data.qc.pending} pending`} />
                <KpiCard icon={Factory}        label="Production"  value={data.stores.totalProductionRecords}                  color="purple"  href="/inventory/production"  delay={0.1}  sub={`${data.stores.totalIssuedQty.toLocaleString()} pcs`} />
                <KpiCard icon={Truck}          label="Dispatched"  value={data.gatepass.totalAdviceNotes}                      color="teal"    href="/gatepass/advicenote"   delay={0.12} sub={`${data.gatepass.totalDispatchedQty.toLocaleString()} pcs`} />
                <KpiCard icon={Shield}         label="Audits"      value={data.audit.total}                                    color="indigo"  href="/audit"                 delay={0.14} sub={`${data.audit.passed} passed`} />
              </div>
            </div>

            {/* ── Alerts ── */}
            {activeAlerts > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">Needs Your Attention</h3>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <AlertCard icon={ClipboardCheck} label="Submissions awaiting approval" value={data.approvals.pending}      href="/admin/approve"    color="amber" />
                  <AlertCard icon={CheckSquare}    label="QC inspections pending"        value={data.qc.pending}             href="/qc/cpi"           color="amber" />
                  <AlertCard icon={Clock}          label="Downtime reports pending"      value={data.worker.pendingDowntime} href="/worker/downtime"  color="red"   />
                </div>
              </div>
            )}

            {/* ── System Bulk Summary per Style (NEW — full qty breakdown) ── */}
            {styles.length > 0 && <SystemBulkSummary styles={styles} storeInRecords={storeInRecords} />}

            {/* ── Full pipeline table with ALL qty types ── */}
            {styles.length > 0 && <PipelineTable styles={styles} storeInRecords={storeInRecords} />}

            {/* ── Visual summary row ── */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <PieIcon className="h-4 w-4 text-slate-400" />
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">Quality & Distribution</h3>
              </div>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <Card title="Bulk Balance" icon={Package}>
                  <div className="flex items-center gap-5">
                    <MiniDonut value={data.stores.bulkReceived} total={data.stores.bulkApproved} size={90} color="#3b82f6" />
                    <div className="flex-1 space-y-2">
                      <ProgressBar value={data.stores.bulkReceived}           max={data.stores.bulkApproved} label="Received"   color="#3b82f6" />
                      <ProgressBar value={data.stores.totalIssuedQty}         max={data.stores.bulkApproved} label="Issued"     color="#8b5cf6" />
                      <ProgressBar value={data.gatepass.totalDispatchedQty}   max={data.stores.bulkApproved} label="Dispatched" color="#14b8a6" />
                      <div className="text-xs text-slate-500 pt-1 border-t border-slate-100">Remaining: <b className="text-slate-700">{data.stores.bulkRemaining.toLocaleString()} pcs</b></div>
                    </div>
                  </div>
                </Card>
                <Card title="QC Results" icon={CheckSquare}>
                  <PieChart data={[
                    { label: 'Passed',  value: data.qc.passed,  color: '#10b981' },
                    { label: 'Failed',  value: data.qc.failed,  color: '#ef4444' },
                    { label: 'Pending', value: data.qc.pending, color: '#f59e0b' },
                  ]} centerValue={String(data.qc.totalCpiReports)} centerLabel="Total" />
                </Card>
                <Card title="Styles by Stage" icon={TrendingUp}>
                  <PieChart data={Object.entries(STAGE_META).sort((a,b) => b[1].order - a[1].order).map(([s, m]) => ({ label: s, value: stageCount[s] || 0, color: m.dot }))} centerValue={String(styles.length)} centerLabel="Styles" />
                </Card>
              </div>
            </div>

            {/* ── Today's activity ── */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Activity className="h-4 w-4 text-slate-400" />
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">Today's Activity</h3>
              </div>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <Card title="Activity Snapshot" icon={Activity}>
                  <div className="grid grid-cols-2 gap-3">
                    <StatTile label="Store-In"     value={data.stores.todayStoreIn}    color="text-blue-700"    bg="bg-blue-50"    />
                    <StatTile label="Production"   value={data.stores.todayProduction} color="text-purple-700"  bg="bg-purple-50"  />
                    <StatTile label="QC Checked"   value={data.qc.todayCpi}           color="text-teal-700"    bg="bg-teal-50"    />
                    <StatTile label="Dispatched"   value={data.gatepass.todayDispatched} color="text-emerald-700" bg="bg-emerald-50" />
                  </div>
                </Card>
                <Card title="Worker Output" icon={Factory} className="lg:col-span-2"
                  action={<span className="text-xs font-bold text-slate-700">{totalWorkerToday} pcs</span>}>
                  <MiniBarChart data={[
                    { label: 'Seat',  value: data.worker.todaySeating,  color: '#3b82f6' },
                    { label: 'Print', value: data.worker.todayPrinting, color: '#8b5cf6' },
                    { label: 'Cure',  value: data.worker.todayCuring,   color: '#f59e0b' },
                    { label: 'Check', value: data.worker.todayChecking, color: '#14b8a6' },
                    { label: 'Pack',  value: data.worker.todayPacking,  color: '#6366f1' },
                    { label: 'Disp',  value: data.worker.todayDispatch, color: '#10b981' },
                  ]} height={130} />
                </Card>
              </div>
            </div>

            {/* ── Recent dispatches ── */}
            {data.recent.dispatches.length > 0 && (
              <Card title="Recent Dispatches" icon={Truck}
                action={<Link to="/gatepass/advicenote" className="text-[10px] font-bold text-blue-600 flex items-center gap-1">View all <ArrowRight className="h-3 w-3" /></Link>}>
                <SimpleTable
                  headers={['AD No', 'Style', 'Customer', 'Qty', 'Date']}
                  rows={data.recent.dispatches.map((d: any) => [
                    <span className="font-bold">{d.adNo}</span>,
                    d.styleNo,
                    <span className="text-slate-500">{d.customerName}</span>,
                    <span className="font-bold text-teal-700">{d.dispatchQty}</span>,
                    <span className="text-slate-400">{d.date}</span>,
                  ])}
                />
              </Card>
            )}
          </motion.div>
        )}

        {/* ── Role-specific views (admin viewing each role's full dashboard) ── */}
        {adminTab === 'Developer' && (
          <motion.div key="developer" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-blue-50 border border-blue-100 px-4 py-2.5">
              <Eye className="h-4 w-4 text-blue-600" />
              <p className="text-xs font-bold text-blue-800">Viewing as Developer — full role dashboard</p>
            </div>
            <DeveloperDashboard data={data} />
          </motion.div>
        )}
        {adminTab === 'Stores' && (
          <motion.div key="stores" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-teal-50 border border-teal-100 px-4 py-2.5">
              <Eye className="h-4 w-4 text-teal-600" />
              <p className="text-xs font-bold text-teal-800">Viewing as Stores — full role dashboard</p>
            </div>
            <StoresDashboard data={data} storeInRecords={storeInRecords} styles={styles} />
          </motion.div>
        )}
        {adminTab === 'QC' && (
          <motion.div key="qc" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-100 px-4 py-2.5">
              <Eye className="h-4 w-4 text-emerald-600" />
              <p className="text-xs font-bold text-emerald-800">Viewing as QC — full role dashboard</p>
            </div>
            <QCDashboard data={data} styles={styles} />
          </motion.div>
        )}
        {adminTab === 'Gatepass' && (
          <motion.div key="gatepass" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-100 px-4 py-2.5">
              <Eye className="h-4 w-4 text-amber-600" />
              <p className="text-xs font-bold text-amber-800">Viewing as Gatepass — full role dashboard</p>
            </div>
            <GatepassDashboard data={data} styles={styles} />
          </motion.div>
        )}
        {adminTab === 'Audit' && (
          <motion.div key="audit" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-indigo-50 border border-indigo-100 px-4 py-2.5">
              <Eye className="h-4 w-4 text-indigo-600" />
              <p className="text-xs font-bold text-indigo-800">Viewing as Audit — full role dashboard</p>
            </div>
            <AuditDashboard data={data} styles={styles} />
          </motion.div>
        )}
        {adminTab === 'Worker' && (
          <motion.div key="worker" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-orange-50 border border-orange-100 px-4 py-2.5">
              <Eye className="h-4 w-4 text-orange-600" />
              <p className="text-xs font-bold text-orange-800">Viewing as Worker — full role dashboard</p>
            </div>
            <WorkerDashboard data={data} styles={styles} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}