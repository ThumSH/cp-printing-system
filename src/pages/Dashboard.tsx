// src/pages/Dashboard.tsx
import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Package, CheckSquare, Truck, FileText, Factory,
  Clock, AlertTriangle, TrendingUp, Code, ClipboardCheck,
  PackageOpen, ArrowRight, Loader2, RefreshCw, ChevronRight,
  ChevronDown, BarChart2, Activity, Shield, Layers,
  CheckCircle2, XCircle, Inbox, Send,
  Eye, PieChart as PieIcon, LayoutDashboard,
  Boxes, Gauge, Building2, ListFilter,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { MiniBarChart, PieChart, MiniDonut, ProgressBar, HorizontalBarChart } from '../components/MiniChart';
import { StoreInRecord } from '../store/inventoryStore';
import { useDashboardStore, DashboardData, StyleOverview } from '../store/dashboardStore';

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
    if (!ex) {
      map.set(key, { key, styleNo: r.styleNo, customerName: r.customerName, bulkQty: r.bulkQty || 0, totalInQty: r.inQty || 0, totalCutQty: r.totalCutQty || 0, totalBundles: bundleCount, recordCount: 1, latestDate: day, scheduleSet: new Set([r.scheduleNo].filter(Boolean)) });
      return;
    }
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
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-[10px] font-semibold text-slate-500 whitespace-nowrap">
        {value.toLocaleString()} / {max.toLocaleString()}
      </span>
    </div>
  );
}

function PipelineSteps({ style }: { style: StyleOverview }) {
  const steps = [
    { label: 'Admin',    done: true,                      color: '#94a3b8' },
    { label: 'Store-In', done: style.totalReceived > 0,   color: '#f59e0b' },
    { label: 'QC',       done: style.qcPassed > 0,        color: '#3b82f6' },
    { label: 'Prod',     done: style.totalIssued > 0,     color: '#8b5cf6' },
    { label: 'Gatepass', done: style.totalDispatched > 0, color: '#14b8a6' },
  ];
  return (
    <div className="flex items-center gap-0.5" title={steps.map(s => s.label).join(' ➔ ')}>
      {steps.map((s, i) => (
        <div key={i} className="flex items-center group relative">
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

function DeveloperDashboard({ data, styles }: { data: DashboardData, styles: StyleOverview[] }) {
  const runningJobs = data.development.totalJobs - data.approvals.approved;
  const top10Styles = styles.slice(0, 10); 
  const pendingApprovals = Math.max(Number(data.development?.pendingSubmissions) || 0, Number(data.approvals?.pending) || 0);
  
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard icon={Code}           label="Total Styles (Jobs)" value={data.development.totalJobs} color="blue"    href="/development"        delay={0.05} />
        <KpiCard icon={Activity}       label="Running Styles"      value={runningJobs > 0 ? runningJobs : 0} color="amber" delay={0.1}  />
        <KpiCard icon={CheckCircle2}   label="Client Approved"     value={data.approvals.approved}           color="emerald"                            delay={0.15} />
        <KpiCard icon={RefreshCw}      label="Client Revisions"    value={data.approvals.rejected}           color="red" delay={0.2} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card title="Top 10 Recent Styles & Bulk Qty" icon={Layers} className="lg:col-span-2">
          <SimpleTable
            headers={['Style No', 'Customer', 'Current Stage', 'Bulk Qty']}
            rows={top10Styles.map((s) => [
              <span className="font-bold">{s.styleNo}</span>,
              <span className="text-slate-600">{s.customerName}</span>,
              <StageBadge stage={s.stage} />,
              <span className="font-bold text-slate-700">{s.bulkQty.toLocaleString()} pcs</span>
            ])}
          />
        </Card>

        <Card title="Approval Breakdown" icon={BarChart2}>
          <div className="grid grid-cols-2 gap-4 mb-5">
            <StatTile label="Approved"  value={data.approvals.approved} color="text-emerald-700" bg="bg-emerald-50" />
            <StatTile label="Revisions" value={data.approvals.rejected} color="text-red-700"     bg="bg-red-50" />
          </div>
          <div className="space-y-2.5">
            <ProgressBar value={data.approvals.approved} max={data.approvals.total} label="Approved Total"  color="#10b981" />
            <ProgressBar value={data.approvals.rejected} max={data.approvals.total} label="Revision Total" color="#ef4444" />
            <ProgressBar value={pendingApprovals}        max={data.approvals.total} label="Pending Review" color="#f59e0b" />
          </div>
        </Card>
      </div>

      {pendingApprovals > 0 && (
        <div className="rounded-xl border-2 border-dashed border-amber-300 bg-amber-50 px-5 py-4 flex items-center gap-3">
          <Clock className="h-5 w-5 text-amber-600 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-bold text-amber-800">You have {pendingApprovals} submission{pendingApprovals > 1 ? 's' : ''} awaiting admin review</p>
            <p className="text-xs text-amber-600 mt-0.5">These will be approved or rejected by the admin team.</p>
          </div>
          <Link to="/development/submit" className="text-xs font-bold text-amber-700 flex items-center gap-1 hover:underline">View <ArrowRight className="h-3 w-3" /></Link>
        </div>
      )}
    </div>
  );
}

function StoresDashboard({ data, storeInRecords, styles }: { data: DashboardData; storeInRecords: StoreInRecord[]; styles: StyleOverview[] }) {
  const [styleFilter, setStyleFilter] = useState('');
  const [customerFilter, setCustomerFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const allSummaries = useMemo(() => buildStoreInStyleSummaries(storeInRecords), [storeInRecords]),
        styleOptions = useMemo(() => Array.from(new Set(allSummaries.map(r => r.styleNo))).filter(Boolean).sort(), [allSummaries]),
        customerOptions = useMemo(() => Array.from(new Set(allSummaries.map(r => r.customerName))).filter(Boolean).sort(), [allSummaries]);

  const filtered = useMemo(() => allSummaries.filter(r => {
    if (styleFilter && r.styleNo !== styleFilter) return false;
    if (customerFilter && r.customerName !== customerFilter) return false;
    if (dateFrom && r.latestDate < dateFrom) return false;
    if (dateTo && r.latestDate > dateTo) return false;
    return true;
  }), [allSummaries, styleFilter, customerFilter, dateFrom, dateTo]);

  const hasFilter = !!(styleFilter || customerFilter || dateFrom || dateTo);
  const display = hasFilter ? filtered : allSummaries.slice(0, 9);
  const pending = styles.filter(s => ['Approved', 'Received'].includes(s.stage)).length;
  const inProduction = styles.filter(s => s.stage === 'In Production').length;
  const atQC = styles.filter(s => ['QC Passed', 'Dispatching'].includes(s.stage)).length;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard icon={Inbox}        label="Styles from Admin"      value={styles.length}                           color="blue"    delay={0.05} />
        <KpiCard icon={Activity}     label="Pending IN Qty / Cuts"  value={pending}                                 color="amber"   delay={0.1}  />
        <KpiCard icon={Factory}      label="In Production"          value={inProduction}                            color="purple"  delay={0.15} />
        <KpiCard icon={CheckCircle2} label="At QC / Dispatching"    value={atQC}                                    color="emerald" delay={0.2}  />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard icon={PackageOpen}  label="Store-In Today"         value={data.stores.todayStoreIn}               color="teal"    href="/inventory/in"         delay={0.05} />
        <KpiCard icon={Factory}      label="Production Today"       value={data.stores.todayProduction}            color="indigo"  href="/inventory/production" delay={0.1}  />
        <KpiCard icon={Package}      label="Total Received"         value={data.stores.totalInQty.toLocaleString()} sub="pcs"      color="slate"                delay={0.15} />
        <KpiCard icon={Send}         label="Total Issued"           value={data.stores.totalIssuedQty.toLocaleString()} sub="pcs" color="orange"               delay={0.2}  />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Bulk Balance" icon={Package}>
          <div className="flex items-center gap-6">
            <MiniDonut value={data.stores.bulkReceived} total={data.stores.bulkApproved} size={100} color="#3b82f6" />
            <div className="flex-1 space-y-2.5">
              <ProgressBar value={data.stores.bulkReceived}   max={data.stores.bulkApproved} label="Received from Supplier" color="#3b82f6" />
              <ProgressBar value={data.stores.totalIssuedQty} max={data.stores.bulkApproved} label="Issued to Production"   color="#8b5cf6" />
              <div className="pt-1 border-t border-slate-100 flex justify-between text-xs text-slate-500">
                <span>Remaining in store</span>
                <b className="text-slate-700">{data.stores.bulkRemaining.toLocaleString()} pcs</b>
              </div>
            </div>
          </div>
        </Card>
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
      {styles.length > 0 && (
        <Card title="Received vs Bulk Qty — Per Style" icon={BarChart2}>
          <HorizontalBarChart data={styles.map(s => ({ label: `${s.styleNo} — ${s.customerName}`, value: s.totalReceived, max: Math.max(1, s.bulkQty), color: '#3b82f6' }))} />
        </Card>
      )}
      <Card title="Store-In Style Summary (Recent 9)" icon={PackageOpen}
        action={<span className="text-xs font-semibold text-slate-400">{allSummaries.length} total styles</span>}>
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <div className="flex-1 min-w-40">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Style No</label>
              <select value={styleFilter} onChange={e => setStyleFilter(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">All styles</option>
                {styleOptions.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="flex-1 min-w-40">
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

function QCDashboard({ data, styles }: { data: DashboardData; styles: StyleOverview[] }) {
  const qcStyles = styles.filter(s => s.qcTotal > 0);
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard icon={CheckSquare}  label="Total Inspections" value={data.qc.totalCpiReports} color="blue"    href="/qc/cpi" delay={0.05} />
        <KpiCard icon={Activity}     label="Received Today"    value={data.qc.todayCpi}        color="teal"               delay={0.1}  />
        <KpiCard icon={CheckCircle2} label="Passed"            value={data.qc.passed}          color="emerald"            delay={0.15} />
        <KpiCard icon={Clock}        label="Pending QC"        value={data.qc.pending}         color={data.qc.pending > 0 ? 'amber' : 'slate'} delay={0.2} />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card title="Inspection Results" icon={PieIcon}>
          <PieChart data={[
            { label: 'Passed',  value: data.qc.passed,  color: '#10b981' },
            { label: 'Failed',  value: data.qc.failed,  color: '#ef4444' },
            { label: 'Pending', value: data.qc.pending, color: '#f59e0b' },
          ]} centerValue={String(data.qc.passed)} centerLabel="Passed" />
        </Card>
        <Card title="Summary Stats" icon={BarChart2} className="lg:col-span-2">
          <div className="grid grid-cols-3 gap-4 mb-4">
            <StatTile label="Total Passed" value={data.qc.passed}  color="text-emerald-700" bg="bg-emerald-50" />
            <StatTile label="Total Failed" value={data.qc.failed}  color="text-red-700"     bg="bg-red-50"   />
            <StatTile label="Today"        value={data.qc.todayCpi} color="text-blue-700"   bg="bg-blue-50"    />
          </div>
          <div className="space-y-2.5">
            <ProgressBar value={data.qc.passed}  max={data.qc.totalCpiReports} label="Passed amount"  color="#10b981" />
            <ProgressBar value={data.qc.failed}  max={data.qc.totalCpiReports} label="Failed amount"  color="#ef4444" />
            <ProgressBar value={data.qc.pending} max={data.qc.totalCpiReports} label="Pending amount" color="#f59e0b" />
          </div>
        </Card>
      </div>
      {qcStyles.length > 0 && (
        <Card title="QC Results — Per Style" icon={CheckSquare}>
          <SimpleTable
            headers={['Style', 'Customer', 'Total', 'Passed', 'Failed', 'Pending', 'Completion Amount']}
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
    </div>
  );
}

function GatepassDashboard({ data, styles }: { data: DashboardData; styles: StyleOverview[] }) {
  const dispatchedStyles = styles.filter(s => s.totalDispatched > 0);
  const totalBulk = styles.reduce((s, x) => s + x.bulkQty, 0);
  const totalDispatched = styles.reduce((s, x) => s + x.totalDispatched, 0);
  const remaining = Math.max(0, totalBulk - totalDispatched);
  
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard icon={Truck}    label="Total Advice Notes" value={data.gatepass.totalAdviceNotes}                    color="blue"    href="/gatepass/advicenote" delay={0.05} />
        <KpiCard icon={Package}  label="Total Dispatched"   value={data.gatepass.totalDispatchedQty.toLocaleString()} sub="pcs"       color="emerald"             delay={0.1}  />
        <KpiCard icon={Activity} label="Dispatched Today"   value={data.gatepass.todayDispatched}                     color="teal"                                delay={0.15} />
        <KpiCard icon={Boxes}    label="Remaining Qty"      value={remaining.toLocaleString()}                        color={remaining > 0 ? 'amber' : 'slate'}   delay={0.2} />
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
      {data.recent.dispatches.length > 0 && (
        <Card title="Recent Dispatches" icon={FileText}
          action={<Link to="/gatepass/advicenote" className="text-[10px] font-bold text-blue-600 flex items-center gap-1">All <ArrowRight className="h-3 w-3" /></Link>}>
          <SimpleTable
            headers={['AD No', 'Style', 'Customer', 'Qty', 'Date']}
            rows={data.recent.dispatches.map((d: any) => [
              <span className="font-bold">{d.adNo}</span>, d.styleNo,
              <span className="text-slate-500">{d.customerName || '—'}</span>,
              <span className="font-bold text-teal-700">{d.dispatchQty}</span>,
              <span className="text-slate-400">{d.date}</span>,
            ])}
          />
        </Card>
      )}
    </div>
  );
}

function AuditDashboard({ data, styles }: { data: DashboardData; styles: StyleOverview[] }) {
  const auditedStyles = styles.filter(s => s.auditTotal > 0);
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard icon={Shield}       label="Total Audits" value={data.audit.total}  color="blue"    href="/audit" delay={0.05} />
        <KpiCard icon={CheckCircle2} label="Passed"       value={data.audit.passed} color="emerald"              delay={0.1}  />
        <KpiCard icon={XCircle}      label="Failed"       value={data.audit.failed} color={data.audit.failed > 0 ? 'red' : 'slate'} delay={0.15} />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card title="Audit Results" icon={PieIcon}>
          <PieChart data={[
            { label: 'Pass', value: data.audit.passed, color: '#10b981' },
            { label: 'Fail', value: data.audit.failed, color: '#ef4444' },
          ]} centerValue={String(data.audit.passed)} centerLabel="Passed" />
        </Card>
        <Card title="Audit Stats" icon={BarChart2} className="lg:col-span-2">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <StatTile label="Total Passed" value={data.audit.passed} color="text-emerald-700" bg="bg-emerald-50" />
            <StatTile label="Total Failed" value={data.audit.failed} color="text-red-700"     bg="bg-red-50"     />
          </div>
          <div className="space-y-2">
            <ProgressBar value={data.audit.passed} max={data.audit.total} label="Passed amount" color="#10b981" />
            <ProgressBar value={data.audit.failed} max={data.audit.total} label="Failed amount" color="#ef4444" />
          </div>
        </Card>
      </div>
      {auditedStyles.length > 0 && (
        <Card title="Audit Results — Per Style" icon={Shield}>
          <SimpleTable
            headers={['Style', 'Customer', 'Total', 'Passed', 'Failed', 'Completion Amount', 'Current Stage']}
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
    </div>
  );
}

function WorkerDashboard({ data, styles }: { data: DashboardData; styles: StyleOverview[] }) {
  const worker = data.worker ?? {} as DashboardData['worker'];

  const todayBreakdown = [
    { label: 'Seating',  value: Number(worker.todaySeating)  || 0, color: '#3b82f6' },
    { label: 'Printing', value: Number(worker.todayPrinting) || 0, color: '#8b5cf6' },
    { label: 'Curing',   value: Number(worker.todayCuring)   || 0, color: '#f59e0b' },
    { label: 'Checking', value: Number(worker.todayChecking) || 0, color: '#14b8a6' },
    { label: 'Packing',  value: Number(worker.todayPacking)  || 0, color: '#6366f1' },
    { label: 'Dispatch', value: Number(worker.todayDispatch) || 0, color: '#10b981' },
  ];

  const totalToday = todayBreakdown.reduce((sum, item) => sum + item.value, 0);
  const totalDailyOutput = Number(worker.totalDailyOutput) || 0;
  const todayOutput = Number(worker.todayOutput) || 0;
  const pendingDowntime = Number(worker.pendingDowntime) || 0;
  const workerStyles = styles.filter(s => (Number(s.workerEntries) || 0) > 0 || (Number(s.totalWorkerOutput) || 0) > 0);

  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-linear-to-r from-slate-800 to-slate-700 p-5 text-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs font-medium text-slate-300 uppercase tracking-widest">Today's Output</p>
            <p className="text-4xl font-black mt-1">{totalToday.toLocaleString()} <span className="text-lg font-normal text-slate-300">pcs</span></p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400">Entries logged</p>
            <p className="text-2xl font-black">{todayOutput.toLocaleString()}</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {todayBreakdown.map(item => (
            <div key={item.label} className="rounded-lg bg-white/10 p-2.5 text-center">
              <div className="w-2 h-2 rounded-full mx-auto mb-1.5" style={{ backgroundColor: item.color }} />
              <p className="text-sm font-black">{item.value.toLocaleString()}</p>
              <p className="text-[9px] text-slate-300 font-medium mt-0.5">{item.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <KpiCard icon={Factory} label="Total Entries (All Time)" value={totalDailyOutput.toLocaleString()} color="blue" href="/worker" delay={0.05} />
        <KpiCard icon={Layers}  label="Styles Worked On" value={workerStyles.length} color="purple" delay={0.1} />
        <KpiCard icon={Clock}   label="Pending Downtime Reports" value={pendingDowntime} color={pendingDowntime > 0 ? 'amber' : 'slate'} href="/worker/downtime" delay={0.15} />
      </div>

      <Card title="Today's Output — By Section" icon={BarChart2}
        action={<span className="text-xs font-bold text-slate-700">{totalToday.toLocaleString()} total pcs</span>}>
        <MiniBarChart data={todayBreakdown} height={150} />
      </Card>

      {workerStyles.length > 0 && (
        <Card title="Work Per Style — Qty & Remaining" icon={Layers}>
          <div className="space-y-3">
            {workerStyles.map(s => {
              const totalWorkerOutput = Number(s.totalWorkerOutput) || 0;
              const bulkQty = Number(s.bulkQty) || 0;
              const remaining = Math.max(0, bulkQty - totalWorkerOutput);
              const pct = bulkQty > 0 ? Math.min(100, Math.round(totalWorkerOutput / bulkQty * 100)) : 0;
              return (
                <div key={`${s.styleNo}-${s.customerName}`} className="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="font-bold text-sm text-slate-800">{s.styleNo}</span>
                      <span className="text-xs text-slate-500 ml-2">{s.customerName}</span>
                    </div>
                    <StageBadge stage={s.stage} />
                  </div>
                  <div className="grid grid-cols-3 gap-3 mb-2.5 text-center">
                    <div><p className="text-xs text-slate-400">Total Output</p><p className="text-lg font-black text-blue-700">{totalWorkerOutput.toLocaleString()}</p></div>
                    <div><p className="text-xs text-slate-400">Bulk Qty</p><p className="text-lg font-black text-slate-700">{bulkQty.toLocaleString()}</p></div>
                    <div><p className="text-xs text-slate-400">Remaining</p><p className={`text-lg font-black ${remaining > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>{remaining.toLocaleString()}</p></div>
                  </div>
                  <MiniProgress value={totalWorkerOutput} max={bulkQty} color={pct >= 100 ? '#10b981' : pct >= 50 ? '#3b82f6' : '#f59e0b'} />
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {pendingDowntime > 0 && (
        <Link to="/worker/downtime" className="block rounded-xl border-2 border-dashed border-amber-300 bg-amber-50 p-4">
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-amber-600 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-bold text-amber-800">You have {pendingDowntime} pending downtime report{pendingDowntime > 1 ? 's' : ''}</p>
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
// ADMIN PIPELINE TABLE
// ==========================================
function PipelineTable({ styles, storeInRecords }: { styles: StyleOverview[]; storeInRecords: StoreInRecord[] }) {
  const PAGE = 10;
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [componentSearch, setComponentSearch] = useState('');
  const [colourSearch, setColourSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [showTop10, setShowTop10] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const styleExtraData = useMemo(() => {
    const map = new Map<string, { totalCutQty: number; totalBundles: number; totalInQty: number; components: Set<string>; colours: Set<string>; latestDate: string }>();
    storeInRecords.forEach(r => {
      const bundleCount = (r.cuts || []).reduce((s, c) => s + (c.bundles?.length || 0), 0);
      const existing = map.get(r.styleNo) || { totalCutQty: 0, totalBundles: 0, totalInQty: 0, components: new Set(), colours: new Set(), latestDate: '' };
      existing.totalCutQty += r.totalCutQty || 0;
      existing.totalBundles += bundleCount;
      existing.totalInQty += r.inQty || 0;
      if (r.components) existing.components.add(r.components);
      if (r.bodyColour) existing.colours.add(r.bodyColour);
      if (r.cutInDate && r.cutInDate > existing.latestDate) existing.latestDate = r.cutInDate;
      map.set(r.styleNo, existing);
    });
    return map;
  }, [storeInRecords]);

  const filtered = useMemo(() => {
    let result = styles.filter(s => {
      const q = search.trim().toLowerCase();
      if (q && !s.styleNo.toLowerCase().includes(q) && !s.customerName.toLowerCase().includes(q)) return false;
      if (stageFilter && s.stage !== stageFilter) return false;

      const extra = styleExtraData.get(s.styleNo);
      if (componentSearch && extra && !Array.from(extra.components).some(c => c.toLowerCase().includes(componentSearch.toLowerCase()))) return false;
      if (colourSearch && extra && !Array.from(extra.colours).some(c => c.toLowerCase().includes(colourSearch.toLowerCase()))) return false;
      if (dateFrom && extra && extra.latestDate < dateFrom) return false;
      if (dateTo && extra && extra.latestDate > dateTo) return false;

      return true;
    });

    if (showTop10) {
      result = result.sort((a, b) => {
        const dateA = styleExtraData.get(a.styleNo)?.latestDate || '';
        const dateB = styleExtraData.get(b.styleNo)?.latestDate || '';
        return dateB.localeCompare(dateA);
      }).slice(0, 10);
    }

    return result;
  }, [styles, search, stageFilter, componentSearch, colourSearch, dateFrom, dateTo, showTop10, styleExtraData]);

  const pages = Math.ceil(filtered.length / PAGE);
  const slice = filtered.slice(page * PAGE, (page + 1) * PAGE);
  
  useEffect(() => { setPage(0); }, [search, stageFilter, componentSearch, colourSearch, dateFrom, dateTo, showTop10]);

  const hasActiveFilters = search || stageFilter || componentSearch || colourSearch || dateFrom || dateTo || showTop10;

  return (
    <Card title={`All Styles Pipeline Tracker (${filtered.length} of ${styles.length})`} icon={TrendingUp} noPadding>
      <div className="p-4 border-b border-slate-100 bg-slate-50 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <ListFilter className="h-4 w-4 text-slate-500" />
          <h4 className="text-[11px] font-bold uppercase text-slate-500">Filter & Search Pipeline</h4>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search Style or Customer..."
            className="flex-1 min-w-35 rounded border border-slate-300 px-3 py-1.5 text-xs outline-none focus:border-blue-500" />
          
          <input type="text" value={componentSearch} onChange={e => setComponentSearch(e.target.value)} placeholder="Search Component (e.g. Front)..."
            className="w-40 rounded border border-slate-300 px-3 py-1.5 text-xs outline-none focus:border-blue-500" />
          
          <input type="text" value={colourSearch} onChange={e => setColourSearch(e.target.value)} placeholder="Search Body Colour..."
            className="w-40 rounded border border-slate-300 px-3 py-1.5 text-xs outline-none focus:border-blue-500" />

          <select value={stageFilter} onChange={e => setStageFilter(e.target.value)}
            className="w-35 rounded border border-slate-300 bg-white px-3 py-1.5 text-xs outline-none focus:border-blue-500">
            <option value="">All Current Stages</option>
            {Object.keys(STAGE_META).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase">From</span>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              className="rounded border border-slate-300 px-3 py-1.5 text-xs outline-none focus:border-blue-500" />
            <span className="text-[10px] font-bold text-slate-500 uppercase">To</span>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              className="rounded border border-slate-300 px-3 py-1.5 text-xs outline-none focus:border-blue-500" />
          </div>

          <button onClick={() => setShowTop10(!showTop10)}
            className={`ml-auto rounded px-4 py-1.5 text-xs font-bold transition-colors ${showTop10 ? 'bg-indigo-600 text-white shadow-sm' : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'}`}>
            {showTop10 ? 'Showing Top 10' : 'Show Top 10 Recent'}
          </button>

          {hasActiveFilters && (
            <button onClick={() => { setSearch(''); setStageFilter(''); setComponentSearch(''); setColourSearch(''); setDateFrom(''); setDateTo(''); setShowTop10(false); }} 
              className="rounded bg-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-300">
              Clear All
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-800 text-[10px] font-bold uppercase tracking-wide text-white">
              <th className="px-3 py-3 text-left w-6 border-r border-slate-700"></th>
              <th className="px-3 py-3 text-left border-r border-slate-700">Style</th>
              <th className="px-3 py-3 text-left border-r border-slate-700">Customer</th>
              <th className="px-3 py-3 text-center border-r border-slate-700">Current Stage</th>
              <th className="px-3 py-3 text-right bg-slate-700 border-r border-slate-600">Bulk Qty</th>
              <th className="px-3 py-3 text-right bg-blue-900 border-r border-slate-600">Store-In Qty</th>
              <th className="px-3 py-3 text-right bg-purple-900 border-r border-slate-600">Production Qty</th>
              <th className="px-3 py-3 text-right bg-teal-900 border-r border-slate-600">Gatepass Qty</th>
              <th className="px-3 py-3 text-right bg-amber-900 border-r border-slate-600">Remain Qty</th>
              <th className="px-3 py-3 text-center border-r border-slate-700" title="Admin -> Store-In -> QC -> Production -> Gatepass">Pipeline Path</th>
              <th className="px-3 py-3 text-left min-w-27.5">Delivery Progress</th>
            </tr>
          </thead>
          <tbody>
            {slice.map((s) => {
              const pct = s.bulkQty > 0 ? Math.round(s.totalDispatched / s.bulkQty * 100) : 0;
              const isExp = expanded === s.styleNo;
              const extra = styleExtraData.get(s.styleNo) || { totalCutQty: 0, totalBundles: 0, totalInQty: 0 };
              return (
                <>
                  <tr key={s.styleNo} className="border-b border-slate-50 hover:bg-blue-50/30 cursor-pointer transition-colors" onClick={() => setExpanded(isExp ? null : s.styleNo)}>
                    <td className="px-3 py-3">
                      {isExp ? <ChevronDown className="h-3.5 w-3.5 text-slate-400" /> : <ChevronRight className="h-3.5 w-3.5 text-slate-400" />}
                    </td>
                    <td className="px-3 py-3 font-bold text-slate-800">{s.styleNo}</td>
                    <td className="px-3 py-3 text-slate-500 text-xs">{s.customerName}</td>
                    <td className="px-3 py-3 text-center"><StageBadge stage={s.stage} /></td>
                    <td className="px-3 py-3 text-right font-black text-slate-700 bg-slate-50/50">{s.bulkQty.toLocaleString()}</td>
                    <td className="px-3 py-3 text-right text-blue-700 font-bold bg-blue-50/20">{s.totalReceived > 0 ? s.totalReceived.toLocaleString() : <span className="text-slate-300">—</span>}</td>
                    <td className="px-3 py-3 text-right text-purple-700 font-bold bg-purple-50/20">{s.totalIssued > 0 ? s.totalIssued.toLocaleString() : <span className="text-slate-300">—</span>}</td>
                    <td className="px-3 py-3 text-right text-teal-700 font-bold bg-teal-50/20">{s.totalDispatched > 0 ? s.totalDispatched.toLocaleString() : <span className="text-slate-300">—</span>}</td>
                    <td className={`px-3 py-3 text-right font-black bg-amber-50/20 ${s.remainingBulk > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>{s.remainingBulk.toLocaleString()}</td>
                    <td className="px-3 py-3 text-center flex justify-center"><PipelineSteps style={s} /></td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${Math.min(100, pct)}%`, backgroundColor: pct >= 100 ? '#10b981' : pct >= 50 ? '#3b82f6' : '#f59e0b' }} />
                        </div>
                        <span className="text-[10px] font-bold text-slate-600 whitespace-nowrap">{s.totalDispatched.toLocaleString()} / {s.bulkQty.toLocaleString()}</span>
                      </div>
                    </td>
                  </tr>
                  {isExp && (
                    <tr key={`${s.styleNo}-exp`} className="border-b border-slate-100 bg-slate-100 inset-shadow-sm">
                      <td colSpan={11} className="px-6 py-4">
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6 text-xs">
                          {[
                            { label: 'Schedule No',    value: s.scheduleNo || '—' },
                            { label: 'Store-In Entries', value: s.storeInCount },
                            { label: 'Total Cuts Logged', value: s.totalCuts || '—' },
                            { label: 'Total Cut Qty',  value: extra.totalCutQty > 0 ? extra.totalCutQty.toLocaleString() : '—' },
                            { label: 'Total Bundles',  value: extra.totalBundles > 0 ? extra.totalBundles.toLocaleString() : '—' },
                            { label: 'Worker Output',  value: s.totalWorkerOutput.toLocaleString() },
                          ].map(({ label, value }) => (
                            <div key={label} className="rounded-lg bg-white border border-slate-200 p-3 text-center shadow-sm">
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">{label}</p>
                              <p className="text-sm font-black text-slate-700">{value}</p>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
            {slice.length === 0 && (
              <tr>
                <td colSpan={11} className="px-6 py-12 text-center text-slate-400">
                  <TrendingUp className="mx-auto h-8 w-8 opacity-20 mb-2" />
                  <p>No styles match the current filters.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
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
// ADMIN ROLE TABS
// ==========================================
type RoleTab = 'overview' | 'Developer' | 'Stores' | 'QC' | 'Gatepass' | 'Audit' | 'Worker';

const ROLE_TABS: { key: RoleTab; label: string; icon: any; color: string }[] = [
  { key: 'overview',  label: 'Overview',  icon: LayoutDashboard, color: 'text-slate-600'   },
  { key: 'Developer', label: 'Developer', icon: Code,            color: 'text-blue-600'    },
  { key: 'Stores',    label: 'Stores',    icon: PackageOpen,     color: 'text-teal-600'    },
  { key: 'QC',        label: 'QC',        icon: CheckSquare,     color: 'text-emerald-600' },
  { key: 'Gatepass',  label: 'Gatepass',  icon: Truck,           color: 'text-amber-600'   },
  { key: 'Audit',     label: 'Audit',     icon: Shield,          color: 'text-indigo-600'  },
  { key: 'Worker',    label: 'Worker',    icon: Factory,         color: 'text-orange-600'  },
];

function RoleTabBar({ active, onChange }: { active: RoleTab; onChange: (t: RoleTab) => void }) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm">
      {ROLE_TABS.map(tab => {
        const Icon = tab.icon;
        const isActive = active === tab.key;
        return (
          <button key={tab.key} onClick={() => onChange(tab.key)}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-bold whitespace-nowrap transition-all ${isActive ? 'bg-slate-900 text-white shadow-sm' : `${tab.color} hover:bg-slate-50`}`}>
            <Icon className="h-3.5 w-3.5" />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

// ==========================================
// MAIN DASHBOARD EXPORT
// ==========================================
export default function Dashboard() {
  const { user } = useAuthStore();
  const { data, styles, storeInRecords, loading, error, fetch: fetchDashboard, lastFetched } = useDashboardStore();
  const [adminTab, setAdminTab] = useState<RoleTab>('overview');

  useEffect(() => {
    fetchDashboard();
  }, []);

  const load = (force = false) => fetchDashboard(force);

  const role = user?.role || '';
  const isAdmin = role === 'Admin';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const todayStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  if (loading && !data) return (
    <div className="flex flex-col items-center justify-center py-32 gap-3">
      <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      <p className="text-sm text-slate-400">Loading dashboard...</p>
    </div>
  );

  if (error && !data) return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-6">
      <p className="font-semibold text-red-800">Failed to load dashboard</p>
      <p className="text-sm text-red-600 mt-1">{error}</p>
      <button onClick={() => load(true)} className="mt-3 text-xs font-bold text-red-700 underline">Retry</button>
    </div>
  );

  if (!data) return null;

  const cacheAge = lastFetched ? Math.round((Date.now() - lastFetched) / 1000) : null;
  const cacheLabel = cacheAge !== null
    ? cacheAge < 60 ? 'Just now' : `${Math.round(cacheAge / 60)}m ago`
    : '';

  const stageCount = styles.reduce((acc, s) => { acc[s.stage] = (acc[s.stage] || 0) + 1; return acc; }, {} as Record<string, number>);
  const totalWorkerToday =
    (Number(data.worker?.todaySeating) || 0) +
    (Number(data.worker?.todayPrinting) || 0) +
    (Number(data.worker?.todayCuring) || 0) +
    (Number(data.worker?.todayChecking) || 0) +
    (Number(data.worker?.todayPacking) || 0) +
    (Number(data.worker?.todayDispatch) || 0);
  
  // FIX: Admin now tracks data.development.pendingSubmissions specifically to catch new submissions
  const pendingApprovals = Number(data.development?.pendingSubmissions) || Number(data.approvals?.pending) || 0;
  const pendingQC = Number(data.qc?.pending) || 0;
  const pendingDowntime = Number(data.worker?.pendingDowntime) || 0;
  const activeAlerts = pendingApprovals + pendingQC + pendingDowntime;

  // NON-ADMIN
  if (!isAdmin) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 pb-12">
        <div className="flex items-end justify-between">
          <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}>
            <p className="text-sm text-slate-500">{greeting},</p>
            <h1 className="text-2xl font-bold text-slate-900">{user?.name}</h1>
            <p className="text-xs text-slate-400 mt-0.5 font-medium uppercase tracking-wider">{role}</p>
          </motion.div>
          <div className="flex items-center gap-2">
            {cacheLabel && !loading && <span className="text-[10px] text-slate-400">Updated {cacheLabel}</span>}
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-400" />}
            <button onClick={() => load(true)} className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors">
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </button>
          </div>
        </div>
        {role === 'Developer' && <DeveloperDashboard data={data} styles={styles} />}
        {role === 'Stores'    && <StoresDashboard data={data} storeInRecords={storeInRecords} styles={styles} />}
        {role === 'QC'        && <QCDashboard data={data} styles={styles} />}
        {role === 'Gatepass'  && <GatepassDashboard data={data} styles={styles} />}
        {role === 'Audit'     && <AuditDashboard data={data} styles={styles} />}
        {role === 'Worker'    && <WorkerDashboard data={data} styles={styles} />}
      </motion.div>
    );
  }

  // ADMIN
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 pb-12">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        className="relative overflow-hidden rounded-2xl bg-linear-to-br from-slate-900 via-slate-800 to-slate-900 p-6 text-white shadow-lg">
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
            <button onClick={() => load(true)} className="flex items-center gap-1.5 rounded-lg bg-white/10 hover:bg-white/20 backdrop-blur border border-white/10 px-3 py-2.5 text-xs font-semibold text-white transition-all">
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />} {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>
      </motion.div>

      <RoleTabBar active={adminTab} onChange={setAdminTab} />

      <AnimatePresence mode="wait">
        {adminTab === 'overview' && (
          <motion.div key="overview" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }} className="space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Gauge className="h-4 w-4 text-slate-400" />
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">Full Pipeline Flow</h3>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
                <KpiCard icon={Code}           label="Dev Jobs"   value={data.development.totalJobs}                          color="slate"   href="/development"           delay={0.02} sub={`${data.development.totalSubmissions} subs`} />
                <KpiCard icon={ClipboardCheck} label="Approved"   value={data.approvals.approved}                             color="emerald" href="/admin/approve"         delay={0.04} sub={`${pendingApprovals} pending`} />
                <KpiCard icon={PackageOpen}    label="Store-In"   value={data.stores.totalStoreIn}                            color="blue"    href="/inventory/in"          delay={0.06} sub={`${data.stores.totalInQty.toLocaleString()} pcs`} />
                <KpiCard icon={CheckSquare}    label="QC Passed"  value={data.qc.passed}                                      color="emerald" href="/qc/cpi"                delay={0.08} sub={`${pendingQC} pending`} />
                <KpiCard icon={Factory}        label="Production" value={data.stores.totalProductionRecords}                  color="purple"  href="/inventory/production"  delay={0.1}  sub={`${data.stores.totalIssuedQty.toLocaleString()} pcs`} />
                <KpiCard icon={Truck}          label="Dispatched" value={data.gatepass.totalAdviceNotes}                      color="teal"    href="/gatepass/advicenote"   delay={0.12} sub={`${data.gatepass.totalDispatchedQty.toLocaleString()} pcs`} />
                <KpiCard icon={Shield}         label="Audits"     value={data.audit.total}                                    color="indigo"  href="/audit"                 delay={0.14} sub={`${data.audit.passed} passed`} />
              </div>
            </div>

            {activeAlerts > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">Needs Your Attention</h3>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <AlertCard icon={ClipboardCheck} label="Submissions awaiting approval" value={pendingApprovals}      href="/admin/approve"   color="amber" />
                  <AlertCard icon={CheckSquare}    label="QC inspections pending"        value={pendingQC}             href="/qc/cpi"          color="amber" />
                  <AlertCard icon={Clock}          label="Downtime reports pending"      value={pendingDowntime} href="/worker/downtime" color="red"   />
                </div>
              </div>
            )}

            <Card title="Top 10 Recent Styles & Bulk Qty" icon={Layers}>
              <SimpleTable
                headers={['Style No', 'Customer', 'Current Stage', 'Bulk Qty']}
                rows={styles.slice(0, 10).map((s) => [
                  <span className="font-bold">{s.styleNo}</span>,
                  <span className="text-slate-600">{s.customerName}</span>,
                  <StageBadge stage={s.stage} />,
                  <span className="font-bold text-slate-700">{s.bulkQty.toLocaleString()} pcs</span>
                ])}
              />
            </Card>

            {styles.length > 0 && <PipelineTable styles={styles} storeInRecords={storeInRecords} />}

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <Card title="Bulk Balance" icon={Package}>
                <div className="flex items-center gap-5">
                  <MiniDonut value={data.stores.bulkReceived} total={data.stores.bulkApproved} size={90} color="#3b82f6" />
                  <div className="flex-1 space-y-2">
                    <ProgressBar value={data.stores.bulkReceived}         max={data.stores.bulkApproved} label="Received"   color="#3b82f6" />
                    <ProgressBar value={data.stores.totalIssuedQty}       max={data.stores.bulkApproved} label="Issued"     color="#8b5cf6" />
                    <ProgressBar value={data.gatepass.totalDispatchedQty} max={data.stores.bulkApproved} label="Dispatched" color="#14b8a6" />
                    <div className="text-xs text-slate-500 pt-1 border-t border-slate-100">Remaining: <b className="text-slate-700">{data.stores.bulkRemaining.toLocaleString()} pcs</b></div>
                  </div>
                </div>
              </Card>
              <Card title="QC Results" icon={CheckSquare}>
                <PieChart data={[
                  { label: 'Passed',  value: data.qc.passed,  color: '#10b981' },
                  { label: 'Failed',  value: data.qc.failed,  color: '#ef4444' },
                  { label: 'Pending', value: pendingQC, color: '#f59e0b' },
                ]} centerValue={String(data.qc.passed)} centerLabel="Passed" />
              </Card>
              <Card title="Styles by Stage" icon={TrendingUp}>
                <PieChart data={Object.entries(STAGE_META).sort((a,b) => b[1].order - a[1].order).map(([s, m]) => ({ label: s, value: stageCount[s] || 0, color: m.dot }))} centerValue={String(styles.length)} centerLabel="Styles" />
              </Card>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <Card title="Activity Snapshot" icon={Activity}>
                <div className="grid grid-cols-2 gap-3">
                  <StatTile label="Store-In"   value={data.stores.todayStoreIn}      color="text-blue-700"    bg="bg-blue-50"    />
                  <StatTile label="Production" value={data.stores.todayProduction}   color="text-purple-700"  bg="bg-purple-50"  />
                  <StatTile label="QC Checked" value={data.qc.todayCpi}             color="text-teal-700"    bg="bg-teal-50"    />
                  <StatTile label="Dispatched" value={data.gatepass.todayDispatched} color="text-emerald-700" bg="bg-emerald-50" />
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
              { label: 'Seat',  value: data.worker?.todaySeating || 0,  color: '#3b82f6' },
              { label: 'Print', value: data.worker?.todayPrinting || 0, color: '#8b5cf6' },
              { label: 'Cure',  value: data.worker?.todayCuring || 0,   color: '#f59e0b' },
              { label: 'Check', value: data.worker?.todayChecking || 0, color: '#14b8a6' },
              { label: 'Pack',  value: data.worker?.todayPacking || 0,  color: '#6366f1' },
              { label: 'Disp',  value: data.worker?.todayDispatch || 0, color: '#10b981' },
                ]} height={130} />
              </Card>
            </div>

            {data.recent.dispatches.length > 0 && (
              <Card title="Recent Dispatches" icon={Truck}
                action={<Link to="/gatepass/advicenote" className="text-[10px] font-bold text-blue-600 flex items-center gap-1">View all <ArrowRight className="h-3 w-3" /></Link>}>
                <SimpleTable
                  headers={['AD No', 'Style', 'Customer', 'Qty', 'Date']}
                  rows={data.recent.dispatches.map((d: any) => [
                    <span className="font-bold">{d.adNo}</span>, d.styleNo,
                    <span className="text-slate-500">{d.customerName}</span>,
                    <span className="font-bold text-teal-700">{d.dispatchQty}</span>,
                    <span className="text-slate-400">{d.date}</span>,
                  ])}
                />
              </Card>
            )}
          </motion.div>
        )}

        {adminTab === 'Developer' && (
          <motion.div key="developer" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-blue-50 border border-blue-100 px-4 py-2.5">
              <Eye className="h-4 w-4 text-blue-600" />
              <p className="text-xs font-bold text-blue-800">Viewing as Developer</p>
            </div>
            <DeveloperDashboard data={data} styles={styles} />
          </motion.div>
        )}
        {adminTab === 'Stores' && (
          <motion.div key="stores" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-teal-50 border border-teal-100 px-4 py-2.5">
              <Eye className="h-4 w-4 text-teal-600" />
              <p className="text-xs font-bold text-teal-800">Viewing as Stores</p>
            </div>
            <StoresDashboard data={data} storeInRecords={storeInRecords} styles={styles} />
          </motion.div>
        )}
        {adminTab === 'QC' && (
          <motion.div key="qc" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-100 px-4 py-2.5">
              <Eye className="h-4 w-4 text-emerald-600" />
              <p className="text-xs font-bold text-emerald-800">Viewing as QC</p>
            </div>
            <QCDashboard data={data} styles={styles} />
          </motion.div>
        )}
        {adminTab === 'Gatepass' && (
          <motion.div key="gatepass" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-100 px-4 py-2.5">
              <Eye className="h-4 w-4 text-amber-600" />
              <p className="text-xs font-bold text-amber-800">Viewing as Gatepass</p>
            </div>
            <GatepassDashboard data={data} styles={styles} />
          </motion.div>
        )}
        {adminTab === 'Audit' && (
          <motion.div key="audit" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-indigo-50 border border-indigo-100 px-4 py-2.5">
              <Eye className="h-4 w-4 text-indigo-600" />
              <p className="text-xs font-bold text-indigo-800">Viewing as Audit</p>
            </div>
            <AuditDashboard data={data} styles={styles} />
          </motion.div>
        )}
        {adminTab === 'Worker' && (
          <motion.div key="worker" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-orange-50 border border-orange-100 px-4 py-2.5">
              <Eye className="h-4 w-4 text-orange-600" />
              <p className="text-xs font-bold text-orange-800">Viewing as Worker</p>
            </div>
            <WorkerDashboard data={data} styles={styles} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}