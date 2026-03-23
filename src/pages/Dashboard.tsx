// src/pages/Dashboard.tsx
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  LayoutDashboard, Package, CheckSquare, Truck, FileText, Factory,
  Clock, AlertTriangle, TrendingUp, Users, Code, ClipboardCheck,
  PackageOpen, ArrowRight, Loader2, RefreshCw,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { API, getAuthHeaders } from '../api/client';
import { MiniBarChart, MiniDonut, ProgressBar } from '../components/MiniChart';

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

// Animated stat card
function Stat({ icon: Icon, label, value, sub, color = 'blue', href, delay = 0 }: {
  icon: any; label: string; value: string | number; sub?: string; color?: string; href?: string; delay?: number;
}) {
  const colors: Record<string, { bg: string; icon: string; text: string }> = {
    blue: { bg: 'bg-blue-50 border-blue-100', icon: 'bg-blue-100 text-blue-600', text: 'text-blue-700' },
    emerald: { bg: 'bg-emerald-50 border-emerald-100', icon: 'bg-emerald-100 text-emerald-600', text: 'text-emerald-700' },
    amber: { bg: 'bg-amber-50 border-amber-100', icon: 'bg-amber-100 text-amber-600', text: 'text-amber-700' },
    red: { bg: 'bg-red-50 border-red-100', icon: 'bg-red-100 text-red-600', text: 'text-red-700' },
    purple: { bg: 'bg-purple-50 border-purple-100', icon: 'bg-purple-100 text-purple-600', text: 'text-purple-700' },
    teal: { bg: 'bg-teal-50 border-teal-100', icon: 'bg-teal-100 text-teal-600', text: 'text-teal-700' },
    indigo: { bg: 'bg-indigo-50 border-indigo-100', icon: 'bg-indigo-100 text-indigo-600', text: 'text-indigo-700' },
    slate: { bg: 'bg-slate-50 border-slate-200', icon: 'bg-slate-100 text-slate-600', text: 'text-slate-700' },
  };
  const c = colors[color] || colors.blue;
  const Wrapper = href ? Link : 'div';
  const wrapperProps = href ? { to: href } : {};

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay }}>
      <Wrapper {...wrapperProps as any} className={`block rounded-xl border p-4 ${c.bg} ${href ? 'hover:shadow-md transition-shadow cursor-pointer' : ''}`}>
        <div className="flex items-start justify-between">
          <div className={`rounded-lg p-2 ${c.icon}`}><Icon className="h-4 w-4" /></div>
          {sub && <span className="text-[10px] font-medium text-slate-500">{sub}</span>}
        </div>
        <p className={`mt-3 text-2xl font-black ${c.text}`}>{value}</p>
        <p className="text-xs font-medium text-slate-500 mt-0.5">{label}</p>
        {href && <p className="mt-2 text-[10px] font-semibold text-blue-600 flex items-center gap-1">View <ArrowRight className="h-3 w-3" /></p>}
      </Wrapper>
    </motion.div>
  );
}

function Section({ title, icon: Icon, delay = 0, children }: { title: string; icon: any; delay?: number; children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3, delay }}>
      <div className="flex items-center gap-2 mb-3">
        <Icon className="h-4 w-4 text-slate-400" />
        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">{title}</h3>
      </div>
      {children}
    </motion.div>
  );
}

export default function Dashboard() {
  const { user } = useAuthStore();
  const [data, setData] = useState<DashboardData | null>(null);
  const [styles, setStyles] = useState<StyleOverview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true); setError('');
    try {
      const [dashRes, stylesRes] = await Promise.all([
        fetch(`${API.BASE}/api/dashboard`, { headers: getAuthHeaders() }),
        fetch(`${API.BASE}/api/dashboard/styles`, { headers: getAuthHeaders() }),
      ]);
      if (!dashRes.ok) throw new Error(await dashRes.text());
      setData(await dashRes.json());
      if (stylesRes.ok) setStyles(await stylesRes.json());
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to load.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const role = user?.role || '';
  const isAdmin = role === 'Admin';
  const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 17 ? 'Good afternoon' : 'Good evening';

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
    </div>
  );

  if (error) return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
      <p className="font-semibold">Failed to load dashboard</p>
      <p className="mt-1 text-red-600">{error}</p>
      <button onClick={load} className="mt-3 text-xs font-semibold text-red-700 underline">Retry</button>
    </div>
  );

  if (!data) return null;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-end justify-between">
        <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}>
          <p className="text-sm text-slate-500">{greeting},</p>
          <h1 className="text-2xl font-bold text-slate-900">{user?.name}</h1>
        </motion.div>
        <button onClick={load} className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      {/* ===== ADMIN ===== */}
      {isAdmin && (<>
        {/* Pipeline flow */}
        <Section title="Pipeline overview" icon={TrendingUp}>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
            <Stat icon={Code} label="Dev jobs" value={data.development.totalJobs} color="slate" href="/development" delay={0.05} />
            <Stat icon={ClipboardCheck} label="Approved" value={data.approvals.approved} color="emerald" href="/admin/approve" delay={0.1} />
            <Stat icon={PackageOpen} label="Store-In" value={data.stores.totalStoreIn} sub={`${data.stores.totalInQty} pcs`} color="blue" href="/inventory/in" delay={0.15} />
            <Stat icon={CheckSquare} label="QC passed" value={data.qc.passed} color="emerald" href="/qc/cpi" delay={0.2} />
            <Stat icon={Factory} label="Production" value={data.stores.totalProductionRecords} sub={`${data.stores.totalIssuedQty} pcs`} color="purple" href="/inventory/production" delay={0.25} />
            <Stat icon={Truck} label="Dispatched" value={data.gatepass.totalAdviceNotes} sub={`${data.gatepass.totalDispatchedQty} pcs`} color="teal" href="/gatepass/advicenote" delay={0.3} />
            <Stat icon={FileText} label="Audits" value={data.audit.total} color="indigo" href="/audit" delay={0.35} />
          </div>
        </Section>

        {/* Alerts */}
        {(data.approvals.pending > 0 || data.qc.pending > 0 || data.worker.pendingDowntime > 0) && (
          <Section title="Needs attention" icon={AlertTriangle} delay={0.2}>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {data.approvals.pending > 0 && <Stat icon={ClipboardCheck} label="Pending approvals" value={data.approvals.pending} color="amber" href="/admin/approve" />}
              {data.qc.pending > 0 && <Stat icon={CheckSquare} label="QC pending" value={data.qc.pending} color="amber" href="/qc/cpi" />}
              {data.worker.pendingDowntime > 0 && <Stat icon={Clock} label="Downtime pending" value={data.worker.pendingDowntime} color="red" href="/worker/downtime" />}
            </div>
          </Section>
        )}

        {/* Styles Overview */}
        {styles.length > 0 && (
          <Section title="Styles overview" icon={Package} delay={0.25}>
            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-[11px] font-semibold text-slate-500 border-b border-slate-100">
                      <th className="px-4 py-2.5 text-left">Style</th>
                      <th className="px-4 py-2.5 text-left">Customer</th>
                      <th className="px-4 py-2.5 text-center">Stage</th>
                      <th className="px-4 py-2.5 text-right">Bulk Qty</th>
                      <th className="px-4 py-2.5 text-right">Received</th>
                      <th className="px-4 py-2.5 text-right">Remaining</th>
                      <th className="px-4 py-2.5 text-center">Cuts</th>
                      <th className="px-4 py-2.5 text-center">QC</th>
                      <th className="px-4 py-2.5 text-right">Issued</th>
                      <th className="px-4 py-2.5 text-right">Dispatched</th>
                      <th className="px-4 py-2.5 text-center">Audit</th>
                      <th className="px-4 py-2.5 text-center">Worker</th>
                      <th className="px-4 py-2.5 text-left">Progress</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {styles.map((s, i) => {
                      const stageBadge: Record<string, string> = {
                        'Completed': 'bg-emerald-100 text-emerald-700',
                        'Dispatching': 'bg-teal-100 text-teal-700',
                        'In Production': 'bg-purple-100 text-purple-700',
                        'QC Passed': 'bg-blue-100 text-blue-700',
                        'Received': 'bg-amber-100 text-amber-700',
                        'Approved': 'bg-slate-100 text-slate-600',
                      };
                      const pct = s.bulkQty > 0 ? Math.round(s.totalDispatched / s.bulkQty * 100) : 0;
                      return (
                        <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-4 py-2.5 font-bold text-slate-800">{s.styleNo}</td>
                          <td className="px-4 py-2.5 text-slate-500">{s.customerName}</td>
                          <td className="px-4 py-2.5 text-center">
                            <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${stageBadge[s.stage] || 'bg-slate-100 text-slate-600'}`}>
                              {s.stage}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-right font-semibold">{s.bulkQty.toLocaleString()}</td>
                          <td className="px-4 py-2.5 text-right text-blue-700 font-semibold">{s.totalReceived.toLocaleString()}</td>
                          <td className="px-4 py-2.5 text-right">
                            <span className={s.remainingBulk > 0 ? 'text-amber-600 font-semibold' : 'text-emerald-600 font-semibold'}>
                              {s.remainingBulk.toLocaleString()}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-center text-slate-600">{s.totalCuts}</td>
                          <td className="px-4 py-2.5 text-center">
                            {s.qcTotal > 0 ? (
                              <span className="text-xs">
                                <span className="text-emerald-600 font-bold">{s.qcPassed}</span>
                                {s.qcFailed > 0 && <span className="text-red-500 font-bold ml-1">/ {s.qcFailed}F</span>}
                              </span>
                            ) : <span className="text-slate-300">—</span>}
                          </td>
                          <td className="px-4 py-2.5 text-right text-purple-700 font-semibold">{s.totalIssued > 0 ? s.totalIssued.toLocaleString() : <span className="text-slate-300">—</span>}</td>
                          <td className="px-4 py-2.5 text-right text-teal-700 font-semibold">{s.totalDispatched > 0 ? s.totalDispatched.toLocaleString() : <span className="text-slate-300">—</span>}</td>
                          <td className="px-4 py-2.5 text-center">
                            {s.auditTotal > 0 ? (
                              <span className="text-xs">
                                <span className="text-emerald-600 font-bold">{s.auditPassed}P</span>
                                {s.auditFailed > 0 && <span className="text-red-500 font-bold ml-1">{s.auditFailed}F</span>}
                              </span>
                            ) : <span className="text-slate-300">—</span>}
                          </td>
                          <td className="px-4 py-2.5 text-center text-slate-600">
                            {s.workerEntries > 0 ? s.workerEntries : <span className="text-slate-300">—</span>}
                          </td>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2 min-w-[100px]">
                              <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                                <div className="h-full rounded-full transition-all duration-700"
                                  style={{ width: `${Math.min(100, pct)}%`, backgroundColor: pct >= 100 ? '#10b981' : pct >= 50 ? '#3b82f6' : '#f59e0b' }} />
                              </div>
                              <span className="text-[10px] font-bold text-slate-600 w-8 text-right">{pct}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </Section>
        )}

        {/* Charts row */}
        <Section title="Bulk balance & QC" icon={Package} delay={0.3}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {/* Bulk donut */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 flex items-center gap-6">
              <MiniDonut value={data.stores.bulkReceived} total={data.stores.bulkApproved} color="#3b82f6" label="Bulk received" />
              <div className="space-y-2 flex-1">
                <ProgressBar value={data.stores.bulkReceived} max={data.stores.bulkApproved} label="Received" color="#3b82f6" />
                <ProgressBar value={data.gatepass.totalDispatchedQty} max={data.stores.bulkApproved} label="Dispatched" color="#14b8a6" />
                <p className="text-xs text-slate-500 mt-1">Remaining: <b className="text-slate-700">{data.stores.bulkRemaining.toLocaleString()}</b></p>
              </div>
            </div>

            {/* QC chart */}
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">QC results</p>
              <MiniBarChart data={[
                { label: 'Passed', value: data.qc.passed, color: '#10b981' },
                { label: 'Failed', value: data.qc.failed, color: '#ef4444' },
                { label: 'Pending', value: data.qc.pending, color: '#f59e0b' },
              ]} height={100} />
            </div>

            {/* Audit chart */}
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Audit results</p>
              <MiniBarChart data={[
                { label: 'Pass', value: data.audit.passed, color: '#10b981' },
                { label: 'Fail', value: data.audit.failed, color: '#ef4444' },
                { label: 'Pending', value: data.audit.pending, color: '#f59e0b' },
              ]} height={100} />
            </div>
          </div>
        </Section>

        {/* Today + worker output */}
        <Section title="Today's activity" icon={Clock} delay={0.4}>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat icon={PackageOpen} label="Store-In today" value={data.stores.todayStoreIn} color="blue" />
            <Stat icon={Factory} label="Production today" value={data.stores.todayProduction} color="purple" />
            <Stat icon={CheckSquare} label="QC today" value={data.qc.todayCpi} color="teal" />
            <Stat icon={Truck} label="Dispatched today" value={data.gatepass.todayDispatched} color="emerald" />
          </div>
        </Section>

        {/* Worker output bar chart */}
        <Section title="Worker output today" icon={Factory} delay={0.5}>
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <MiniBarChart data={[
              { label: 'Seating', value: data.worker.todaySeating, color: '#3b82f6' },
              { label: 'Printing', value: data.worker.todayPrinting, color: '#8b5cf6' },
              { label: 'Curing', value: data.worker.todayCuring, color: '#f59e0b' },
              { label: 'Checking', value: data.worker.todayChecking, color: '#14b8a6' },
              { label: 'Packing', value: data.worker.todayPacking, color: '#6366f1' },
              { label: 'Dispatch', value: data.worker.todayDispatch, color: '#10b981' },
            ]} height={140} />
          </div>
        </Section>

        {/* Recent dispatches */}
        {data.recent.dispatches.length > 0 && (
          <Section title="Recent dispatches" icon={Truck} delay={0.6}>
            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
              <table className="w-full text-sm">
                <thead><tr className="bg-slate-50 text-[11px] font-semibold text-slate-500 border-b border-slate-100">
                  <th className="px-4 py-2.5 text-left">AD No</th><th className="px-4 py-2.5 text-left">Style</th><th className="px-4 py-2.5 text-left">Customer</th><th className="px-4 py-2.5 text-right">Qty</th><th className="px-4 py-2.5 text-left">Date</th>
                </tr></thead>
                <tbody className="divide-y divide-slate-50">
                  {data.recent.dispatches.map((d: any, i: number) => (
                    <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-2.5 font-bold text-slate-800">{d.adNo}</td>
                      <td className="px-4 py-2.5">{d.styleNo}</td>
                      <td className="px-4 py-2.5 text-slate-500">{d.customerName}</td>
                      <td className="px-4 py-2.5 text-right font-bold">{d.dispatchQty}</td>
                      <td className="px-4 py-2.5 text-slate-500">{d.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        )}
      </>)}

      {/* ===== DEVELOPER ===== */}
      {role === 'Developer' && (<>
        <Section title="My work" icon={Code}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Stat icon={Code} label="Jobs created" value={data.development.totalJobs} color="blue" href="/development" delay={0.05} />
            <Stat icon={FileText} label="Submissions" value={data.development.totalSubmissions} color="purple" href="/development/submit" delay={0.1} />
            <Stat icon={ClipboardCheck} label="Pending approval" value={data.development.pendingSubmissions} color={data.development.pendingSubmissions > 0 ? 'amber' : 'emerald'} delay={0.15} />
          </div>
        </Section>
        <Section title="Approval status" icon={ClipboardCheck} delay={0.2}>
          <div className="rounded-xl border border-slate-200 bg-white p-5 max-w-md">
            <MiniBarChart data={[
              { label: 'Approved', value: data.approvals.approved, color: '#10b981' },
              { label: 'Rejected', value: data.approvals.rejected, color: '#ef4444' },
              { label: 'Pending', value: data.approvals.pending, color: '#f59e0b' },
            ]} height={100} />
          </div>
        </Section>
      </>)}

      {/* ===== STORES ===== */}
      {role === 'Stores' && (<>
        <Section title="Inventory" icon={Package}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-5 flex items-center gap-6">
              <MiniDonut value={data.stores.bulkReceived} total={data.stores.bulkApproved} color="#3b82f6" label="Bulk received" />
              <div className="space-y-2 flex-1">
                <ProgressBar value={data.stores.bulkReceived} max={data.stores.bulkApproved} label="Received" color="#3b82f6" />
                <ProgressBar value={data.stores.totalIssuedQty} max={data.stores.bulkReceived} label="Issued to production" color="#8b5cf6" />
                <p className="text-xs text-slate-500">Remaining: <b>{data.stores.bulkRemaining.toLocaleString()}</b></p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Stat icon={PackageOpen} label="Store-In today" value={data.stores.todayStoreIn} color="blue" href="/inventory/in" />
              <Stat icon={Factory} label="Production today" value={data.stores.todayProduction} color="purple" href="/inventory/production" />
              <Stat icon={PackageOpen} label="Total received" value={data.stores.totalInQty.toLocaleString()} sub="pcs" color="emerald" />
              <Stat icon={Factory} label="Total issued" value={data.stores.totalIssuedQty.toLocaleString()} sub="pcs" color="teal" />
            </div>
          </div>
        </Section>
        {styles.length > 0 && (
          <Section title="Bulk balance by style" icon={Package} delay={0.2}>
            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
              <table className="w-full text-sm">
                <thead><tr className="bg-slate-50 text-[11px] font-semibold text-slate-500 border-b border-slate-100">
                  <th className="px-4 py-2.5 text-left">Style</th><th className="px-4 py-2.5 text-left">Customer</th>
                  <th className="px-4 py-2.5 text-right">Bulk Qty</th><th className="px-4 py-2.5 text-right">Received</th>
                  <th className="px-4 py-2.5 text-right">Remaining</th><th className="px-4 py-2.5 text-right">Issued</th>
                  <th className="px-4 py-2.5 text-left">Progress</th>
                </tr></thead>
                <tbody className="divide-y divide-slate-50">
                  {styles.map((s, i) => (
                    <tr key={i} className="hover:bg-slate-50/50">
                      <td className="px-4 py-2.5 font-bold">{s.styleNo}</td>
                      <td className="px-4 py-2.5 text-slate-500">{s.customerName}</td>
                      <td className="px-4 py-2.5 text-right font-semibold">{s.bulkQty.toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-right text-blue-700 font-semibold">{s.totalReceived.toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-right"><span className={s.remainingBulk > 0 ? 'text-amber-600 font-semibold' : 'text-emerald-600 font-semibold'}>{s.remainingBulk.toLocaleString()}</span></td>
                      <td className="px-4 py-2.5 text-right text-purple-700 font-semibold">{s.totalIssued.toLocaleString()}</td>
                      <td className="px-4 py-2.5"><div className="flex items-center gap-2 min-w-[80px]"><div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden"><div className="h-full rounded-full bg-blue-500 transition-all duration-700" style={{ width: `${s.receivedPct}%` }} /></div><span className="text-[10px] font-bold text-slate-500">{s.receivedPct}%</span></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        )}
      </>)}

      {/* ===== QC ===== */}
      {role === 'QC' && (<>
        <Section title="Quality control" icon={CheckSquare}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Inspection results</p>
              <MiniBarChart data={[
                { label: 'Passed', value: data.qc.passed, color: '#10b981' },
                { label: 'Failed', value: data.qc.failed, color: '#ef4444' },
                { label: 'Pending', value: data.qc.pending, color: '#f59e0b' },
              ]} height={120} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Stat icon={CheckSquare} label="Total inspections" value={data.qc.totalCpiReports} color="blue" href="/qc/cpi" />
              <Stat icon={CheckSquare} label="Today" value={data.qc.todayCpi} color="teal" />
              <Stat icon={CheckSquare} label="Passed" value={data.qc.passed} color="emerald" />
              <Stat icon={AlertTriangle} label="Failed" value={data.qc.failed} color={data.qc.failed > 0 ? 'red' : 'slate'} />
            </div>
          </div>
        </Section>
      </>)}

      {/* ===== GATEPASS ===== */}
      {role === 'Gatepass' && (<>
        <Section title="Dispatch" icon={Truck}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Stat icon={Truck} label="Total advice notes" value={data.gatepass.totalAdviceNotes} color="blue" href="/gatepass/advicenote" delay={0.05} />
            <Stat icon={Package} label="Total dispatched" value={data.gatepass.totalDispatchedQty.toLocaleString()} sub="pcs" color="emerald" delay={0.1} />
            <Stat icon={Truck} label="Today" value={data.gatepass.todayDispatched} color="teal" delay={0.15} />
          </div>
        </Section>
        {data.recent.dispatches.length > 0 && (
          <Section title="Recent" icon={FileText} delay={0.2}>
            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
              <table className="w-full text-sm"><thead><tr className="bg-slate-50 text-[11px] font-semibold text-slate-500 border-b"><th className="px-4 py-2 text-left">AD</th><th className="px-4 py-2 text-left">Style</th><th className="px-4 py-2 text-right">Qty</th><th className="px-4 py-2 text-left">Date</th></tr></thead>
              <tbody className="divide-y divide-slate-50">{data.recent.dispatches.map((d: any, i: number) => (<tr key={i}><td className="px-4 py-2 font-bold">{d.adNo}</td><td className="px-4 py-2">{d.styleNo}</td><td className="px-4 py-2 text-right font-bold">{d.dispatchQty}</td><td className="px-4 py-2 text-slate-500">{d.date}</td></tr>))}</tbody></table>
            </div>
          </Section>
        )}
      </>)}

      {/* ===== AUDIT ===== */}
      {role === 'Audit' && (<>
        <Section title="Audit summary" icon={FileText}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Results</p>
              <MiniBarChart data={[
                { label: 'Pass', value: data.audit.passed, color: '#10b981' },
                { label: 'Fail', value: data.audit.failed, color: '#ef4444' },
              ]} height={100} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Stat icon={FileText} label="Total audits" value={data.audit.total} color="blue" href="/audit" />
              <Stat icon={CheckSquare} label="Passed" value={data.audit.passed} color="emerald" />
              <Stat icon={AlertTriangle} label="Failed" value={data.audit.failed} color={data.audit.failed > 0 ? 'red' : 'slate'} />
              <Stat icon={FileText} label="Pass rate" value={data.audit.total > 0 ? `${Math.round(data.audit.passed / data.audit.total * 100)}%` : '—'} color="teal" />
            </div>
          </div>
        </Section>
      </>)}

      {/* ===== WORKER ===== */}
      {role === 'Worker' && (<>
        <Section title="Today's output" icon={Factory}>
          <div className="rounded-xl border border-slate-200 bg-white p-5 mb-4">
            <MiniBarChart data={[
              { label: 'Seating', value: data.worker.todaySeating, color: '#3b82f6' },
              { label: 'Printing', value: data.worker.todayPrinting, color: '#8b5cf6' },
              { label: 'Curing', value: data.worker.todayCuring, color: '#f59e0b' },
              { label: 'Checking', value: data.worker.todayChecking, color: '#14b8a6' },
              { label: 'Packing', value: data.worker.todayPacking, color: '#6366f1' },
              { label: 'Dispatch', value: data.worker.todayDispatch, color: '#10b981' },
            ]} height={140} />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Stat icon={Factory} label="Total entries" value={data.worker.totalDailyOutput} color="blue" href="/worker" />
            <Stat icon={Factory} label="Today's entries" value={data.worker.todayOutput} color="teal" />
            <Stat icon={Clock} label="Pending downtime" value={data.worker.pendingDowntime} color={data.worker.pendingDowntime > 0 ? 'amber' : 'slate'} href="/worker/downtime" />
          </div>
        </Section>
      </>)}
    </div>
  );
}