// src/pages/Dashboard.tsx
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  LayoutDashboard, Package, CheckSquare, Truck, FileText, Factory,
  Clock, AlertTriangle, TrendingUp, Users, Code, ClipboardCheck,
  PackageOpen, ArrowRight, Loader2, RefreshCw, Activity, ChevronRight,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { API, getAuthHeaders } from '../api/client';
import { MiniBarChart, PieChart, MiniDonut, ProgressBar, HorizontalBarChart } from '../components/MiniChart';

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

// ==========================================
// REUSABLE COMPONENTS
// ==========================================
function Card({ children, className = '', title, icon: Icon, action }: {
  children: React.ReactNode; className?: string; title?: string; icon?: any; action?: React.ReactNode;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
      className={`rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden ${className}`}>
      {title && (
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            {Icon && <Icon className="h-4 w-4 text-slate-400" />}
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">{title}</h3>
          </div>
          {action}
        </div>
      )}
      <div className="p-5">{children}</div>
    </motion.div>
  );
}

function KpiCard({ icon: Icon, label, value, sub, color, href, delay = 0 }: {
  icon: any; label: string; value: string | number; sub?: string; color: string; href?: string; delay?: number;
}) {
  const styles: Record<string, { bg: string; ic: string; tx: string }> = {
    blue: { bg: 'bg-blue-50 border-blue-100', ic: 'bg-blue-500', tx: 'text-blue-700' },
    emerald: { bg: 'bg-emerald-50 border-emerald-100', ic: 'bg-emerald-500', tx: 'text-emerald-700' },
    amber: { bg: 'bg-amber-50 border-amber-100', ic: 'bg-amber-500', tx: 'text-amber-700' },
    red: { bg: 'bg-red-50 border-red-100', ic: 'bg-red-500', tx: 'text-red-700' },
    purple: { bg: 'bg-purple-50 border-purple-100', ic: 'bg-purple-500', tx: 'text-purple-700' },
    teal: { bg: 'bg-teal-50 border-teal-100', ic: 'bg-teal-500', tx: 'text-teal-700' },
    indigo: { bg: 'bg-indigo-50 border-indigo-100', ic: 'bg-indigo-500', tx: 'text-indigo-700' },
    slate: { bg: 'bg-slate-50 border-slate-200', ic: 'bg-slate-500', tx: 'text-slate-700' },
  };
  const c = styles[color] || styles.blue;
  const W = href ? Link : 'div';
  const wp = href ? { to: href } : {};

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay }}>
      <W {...wp as any} className={`block rounded-xl border p-4 ${c.bg} ${href ? 'hover:shadow-md cursor-pointer transition-shadow' : ''}`}>
        <div className="flex items-center justify-between mb-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${c.ic}`}>
            <Icon className="h-4 w-4 text-white" />
          </div>
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
    <Link to={href} className={`flex items-center gap-3 rounded-xl border-2 border-dashed ${colors[color]} p-3 hover:shadow-md transition-shadow`}>
      <Icon className={`h-5 w-5 ${textColors[color]}`} />
      <div className="flex-1">
        <p className={`text-sm font-bold ${textColors[color]}`}>{value}</p>
        <p className="text-[11px] text-slate-600">{label}</p>
      </div>
      <ChevronRight className="h-4 w-4 text-slate-400" />
    </Link>
  );
}

const STAGE_COLORS: Record<string, { bg: string; text: string }> = {
  'Completed': { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  'Dispatching': { bg: 'bg-teal-100', text: 'text-teal-700' },
  'In Production': { bg: 'bg-purple-100', text: 'text-purple-700' },
  'QC Passed': { bg: 'bg-blue-100', text: 'text-blue-700' },
  'Received': { bg: 'bg-amber-100', text: 'text-amber-700' },
  'Approved': { bg: 'bg-slate-100', text: 'text-slate-600' },
};

// ==========================================
// MAIN DASHBOARD
// ==========================================
export default function Dashboard() {
  const { user } = useAuthStore();
  const [data, setData] = useState<DashboardData | null>(null);
  const [styles, setStyles] = useState<StyleOverview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true); setError('');
    try {
      const [dRes, sRes] = await Promise.all([
        fetch(`${API.BASE}/api/dashboard`, { headers: getAuthHeaders() }),
        fetch(`${API.BASE}/api/dashboard/styles`, { headers: getAuthHeaders() }),
      ]);
      if (!dRes.ok) throw new Error(await dRes.text());
      setData(await dRes.json());
      if (sRes.ok) setStyles(await sRes.json());
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to load.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const role = user?.role || '';
  const isAdmin = role === 'Admin';
  const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 17 ? 'Good afternoon' : 'Good evening';

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

  // Computed values for charts
  const stageCount = styles.reduce((acc, s) => { acc[s.stage] = (acc[s.stage] || 0) + 1; return acc; }, {} as Record<string, number>);
  const totalWorkerToday = data.worker.todaySeating + data.worker.todayPrinting + data.worker.todayCuring + data.worker.todayChecking + data.worker.todayPacking + data.worker.todayDispatch;

  return (
    <div className="space-y-6">
      {/* ==========================================
          HEADER
          ========================================== */}
      <div className="flex items-end justify-between">
        <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}>
          <p className="text-sm text-slate-500">{greeting},</p>
          <h1 className="text-2xl font-bold text-slate-900">{user?.name}</h1>
        </motion.div>
        <button onClick={load} className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      {/* ==========================================
          ADMIN DASHBOARD
          ========================================== */}
      {isAdmin && (<>
        {/* ROW 1: Pipeline KPIs */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          <KpiCard icon={Code} label="Dev Jobs" value={data.development.totalJobs} color="slate" href="/development" delay={0.02} />
          <KpiCard icon={ClipboardCheck} label="Approved" value={data.approvals.approved} color="emerald" href="/admin/approve" delay={0.04} />
          <KpiCard icon={PackageOpen} label="Store-In" value={data.stores.totalStoreIn} sub={`${data.stores.totalInQty} pcs`} color="blue" href="/inventory/in" delay={0.06} />
          <KpiCard icon={CheckSquare} label="QC Passed" value={data.qc.passed} color="emerald" href="/qc/cpi" delay={0.08} />
          <KpiCard icon={Factory} label="Production" value={data.stores.totalProductionRecords} sub={`${data.stores.totalIssuedQty} pcs`} color="purple" href="/inventory/production" delay={0.1} />
          <KpiCard icon={Truck} label="Dispatched" value={data.gatepass.totalAdviceNotes} sub={`${data.gatepass.totalDispatchedQty} pcs`} color="teal" href="/gatepass/advicenote" delay={0.12} />
          <KpiCard icon={FileText} label="Audits" value={data.audit.total} color="indigo" href="/audit" delay={0.14} />
        </div>

        {/* ROW 2: Alerts */}
        {(data.approvals.pending > 0 || data.qc.pending > 0 || data.worker.pendingDowntime > 0) && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <AlertCard icon={ClipboardCheck} label="Submissions awaiting approval" value={data.approvals.pending} href="/admin/approve" color="amber" />
            <AlertCard icon={CheckSquare} label="QC inspections pending" value={data.qc.pending} href="/qc/cpi" color="amber" />
            <AlertCard icon={Clock} label="Downtime reports pending" value={data.worker.pendingDowntime} href="/worker/downtime" color="red" />
          </div>
        )}

        {/* ROW 3: Charts — Bulk Balance + QC Pie + Audit Pie */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card title="Bulk Balance" icon={Package}>
            <div className="flex items-center gap-6">
              <MiniDonut value={data.stores.bulkReceived} total={data.stores.bulkApproved} size={100} color="#3b82f6" />
              <div className="flex-1 space-y-2.5">
                <ProgressBar value={data.stores.bulkReceived} max={data.stores.bulkApproved} label="Received" color="#3b82f6" />
                <ProgressBar value={data.stores.totalIssuedQty} max={data.stores.bulkApproved} label="Issued" color="#8b5cf6" />
                <ProgressBar value={data.gatepass.totalDispatchedQty} max={data.stores.bulkApproved} label="Dispatched" color="#14b8a6" />
                <div className="pt-1 border-t border-slate-100 text-xs text-slate-500">
                  Remaining: <span className="font-bold text-slate-700">{data.stores.bulkRemaining.toLocaleString()} pcs</span>
                </div>
              </div>
            </div>
          </Card>

          <Card title="QC Results" icon={CheckSquare}>
            <PieChart data={[
              { label: 'Passed', value: data.qc.passed, color: '#10b981' },
              { label: 'Failed', value: data.qc.failed, color: '#ef4444' },
              { label: 'Pending', value: data.qc.pending, color: '#f59e0b' },
            ]} centerValue={String(data.qc.totalCpiReports)} centerLabel="Total" />
          </Card>

          <Card title="Audit Results" icon={FileText}>
            <PieChart data={[
              { label: 'Pass', value: data.audit.passed, color: '#10b981' },
              { label: 'Fail', value: data.audit.failed, color: '#ef4444' },
            ]} centerValue={data.audit.total > 0 ? `${Math.round(data.audit.passed / data.audit.total * 100)}%` : '—'} centerLabel="Pass rate" />
          </Card>
        </div>

        {/* ROW 4: Style Pipeline + Today Activity */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Style stage distribution */}
          <Card title="Styles by Stage" icon={TrendingUp}>
            <PieChart data={[
              { label: 'Completed', value: stageCount['Completed'] || 0, color: '#10b981' },
              { label: 'Dispatching', value: stageCount['Dispatching'] || 0, color: '#14b8a6' },
              { label: 'In Production', value: stageCount['In Production'] || 0, color: '#8b5cf6' },
              { label: 'QC Passed', value: stageCount['QC Passed'] || 0, color: '#3b82f6' },
              { label: 'Received', value: stageCount['Received'] || 0, color: '#f59e0b' },
              { label: 'Approved', value: stageCount['Approved'] || 0, color: '#94a3b8' },
            ]} centerValue={String(styles.length)} centerLabel="Styles" />
          </Card>

          {/* Today's activity */}
          <Card title="Today's Activity" icon={Clock}>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-blue-50 p-3 text-center">
                <p className="text-xl font-black text-blue-700">{data.stores.todayStoreIn}</p>
                <p className="text-[10px] font-medium text-blue-600">Store-In</p>
              </div>
              <div className="rounded-lg bg-purple-50 p-3 text-center">
                <p className="text-xl font-black text-purple-700">{data.stores.todayProduction}</p>
                <p className="text-[10px] font-medium text-purple-600">Production</p>
              </div>
              <div className="rounded-lg bg-teal-50 p-3 text-center">
                <p className="text-xl font-black text-teal-700">{data.qc.todayCpi}</p>
                <p className="text-[10px] font-medium text-teal-600">QC Inspections</p>
              </div>
              <div className="rounded-lg bg-emerald-50 p-3 text-center">
                <p className="text-xl font-black text-emerald-700">{data.gatepass.todayDispatched}</p>
                <p className="text-[10px] font-medium text-emerald-600">Dispatched</p>
              </div>
            </div>
          </Card>

          {/* Worker output today */}
          <Card title="Worker Output Today" icon={Factory}
            action={<span className="text-xs font-bold text-slate-700">{totalWorkerToday} total</span>}>
            <MiniBarChart data={[
              { label: 'Seat', value: data.worker.todaySeating, color: '#3b82f6' },
              { label: 'Print', value: data.worker.todayPrinting, color: '#8b5cf6' },
              { label: 'Cure', value: data.worker.todayCuring, color: '#f59e0b' },
              { label: 'Check', value: data.worker.todayChecking, color: '#14b8a6' },
              { label: 'Pack', value: data.worker.todayPacking, color: '#6366f1' },
              { label: 'Disp', value: data.worker.todayDispatch, color: '#10b981' },
            ]} height={130} />
          </Card>
        </div>

        {/* ROW 5: Styles Table */}
        {styles.length > 0 && (
          <Card title="All Styles — Pipeline Status" icon={Package} noPadding className="!p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-[11px] font-semibold text-slate-500 border-b border-slate-100">
                    <th className="px-4 py-3 text-left">Style</th>
                    <th className="px-4 py-3 text-left">Customer</th>
                    <th className="px-4 py-3 text-center">Stage</th>
                    <th className="px-4 py-3 text-right">Bulk</th>
                    <th className="px-4 py-3 text-right">Received</th>
                    <th className="px-4 py-3 text-right">Remaining</th>
                    <th className="px-4 py-3 text-center">QC</th>
                    <th className="px-4 py-3 text-right">Issued</th>
                    <th className="px-4 py-3 text-right">Dispatched</th>
                    <th className="px-4 py-3 text-center">Audit</th>
                    <th className="px-4 py-3 text-left min-w-[120px]">Progress</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {styles.map((s, i) => {
                    const sc = STAGE_COLORS[s.stage] || STAGE_COLORS['Approved'];
                    const pct = s.bulkQty > 0 ? Math.round(s.totalDispatched / s.bulkQty * 100) : 0;
                    return (
                      <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3 font-bold text-slate-800">{s.styleNo}</td>
                        <td className="px-4 py-3 text-slate-500">{s.customerName}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold ${sc.bg} ${sc.text}`}>{s.stage}</span>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold">{s.bulkQty.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right text-blue-600 font-semibold">{s.totalReceived.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={s.remainingBulk > 0 ? 'text-amber-600 font-semibold' : 'text-emerald-600 font-semibold'}>{s.remainingBulk.toLocaleString()}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {s.qcTotal > 0 ? <span className="text-xs"><span className="text-emerald-600 font-bold">{s.qcPassed}P</span>{s.qcFailed > 0 && <span className="text-red-500 font-bold ml-1">{s.qcFailed}F</span>}</span> : <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-4 py-3 text-right text-purple-600 font-semibold">{s.totalIssued > 0 ? s.totalIssued.toLocaleString() : <span className="text-slate-300">—</span>}</td>
                        <td className="px-4 py-3 text-right text-teal-600 font-semibold">{s.totalDispatched > 0 ? s.totalDispatched.toLocaleString() : <span className="text-slate-300">—</span>}</td>
                        <td className="px-4 py-3 text-center">
                          {s.auditTotal > 0 ? <span className="text-xs"><span className="text-emerald-600 font-bold">{s.auditPassed}P</span>{s.auditFailed > 0 && <span className="text-red-500 font-bold ml-1">{s.auditFailed}F</span>}</span> : <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2.5 rounded-full bg-slate-100 overflow-hidden">
                              <div className="h-full rounded-full transition-all duration-700"
                                style={{ width: `${Math.min(100, pct)}%`, backgroundColor: pct >= 100 ? '#10b981' : pct >= 50 ? '#3b82f6' : '#f59e0b' }} />
                            </div>
                            <span className="text-[11px] font-bold text-slate-600 w-8 text-right">{pct}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* ROW 6: Recent Dispatches */}
        {data.recent.dispatches.length > 0 && (
          <Card title="Recent Dispatches" icon={Truck}
            action={<Link to="/gatepass/advicenote" className="text-[10px] font-bold text-blue-600 flex items-center gap-1">View all <ArrowRight className="h-3 w-3" /></Link>}>
            <div className="overflow-x-auto -mx-5 -mb-5">
              <table className="w-full text-sm">
                <thead><tr className="bg-slate-50 text-[11px] font-semibold text-slate-500 border-b border-y border-slate-100">
                  <th className="px-5 py-2.5 text-left">AD No</th><th className="px-4 py-2.5 text-left">Style</th><th className="px-4 py-2.5 text-left">Customer</th><th className="px-4 py-2.5 text-right">Qty</th><th className="px-4 py-2.5 text-left">Date</th>
                </tr></thead>
                <tbody className="divide-y divide-slate-50">
                  {data.recent.dispatches.map((d: any, i: number) => (
                    <tr key={i} className="hover:bg-slate-50/50"><td className="px-5 py-2.5 font-bold">{d.adNo}</td><td className="px-4 py-2.5">{d.styleNo}</td><td className="px-4 py-2.5 text-slate-500">{d.customerName}</td><td className="px-4 py-2.5 text-right font-bold">{d.dispatchQty}</td><td className="px-4 py-2.5 text-slate-500">{d.date}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* ==========================================
            ADMIN — DEVELOPMENT OVERVIEW
            ========================================== */}
        <div className="pt-2 border-t-2 border-dashed border-slate-200">
          <div className="flex items-center gap-2 mb-4">
            <Code className="h-4 w-4 text-blue-500" />
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Development</h3>
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="grid grid-cols-3 gap-3">
              <KpiCard icon={Code} label="Jobs created" value={data.development.totalJobs} color="blue" href="/development" />
              <KpiCard icon={FileText} label="Submissions" value={data.development.totalSubmissions} color="purple" href="/development/submit" />
              <KpiCard icon={ClipboardCheck} label="Pending approval" value={data.development.pendingSubmissions} color={data.development.pendingSubmissions > 0 ? 'amber' : 'emerald'} />
            </div>
            <Card title="Approval Status" icon={ClipboardCheck}>
              <PieChart data={[
                { label: 'Approved', value: data.approvals.approved, color: '#10b981' },
                { label: 'Rejected', value: data.approvals.rejected, color: '#ef4444' },
                { label: 'Pending', value: data.approvals.pending, color: '#f59e0b' },
              ]} centerValue={String(data.approvals.total)} centerLabel="Total" />
            </Card>
          </div>
        </div>

        {/* ==========================================
            ADMIN — STORES OVERVIEW
            ========================================== */}
        <div className="pt-2 border-t-2 border-dashed border-slate-200">
          <div className="flex items-center gap-2 mb-4">
            <PackageOpen className="h-4 w-4 text-teal-500" />
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Stores / Inventory</h3>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-4">
            <KpiCard icon={PackageOpen} label="Store-In today" value={data.stores.todayStoreIn} color="blue" href="/inventory/in" />
            <KpiCard icon={Factory} label="Production today" value={data.stores.todayProduction} color="purple" href="/inventory/production" />
            <KpiCard icon={PackageOpen} label="Total received" value={data.stores.totalInQty.toLocaleString()} sub="all time" color="emerald" />
            <KpiCard icon={Factory} label="Total issued" value={data.stores.totalIssuedQty.toLocaleString()} sub="all time" color="teal" />
          </div>
          {styles.length > 0 && (
            <Card title="Bulk Balance by Style" icon={Package}>
              <HorizontalBarChart data={styles.map(s => ({ label: `${s.styleNo} — ${s.customerName}`, value: s.totalReceived, max: s.bulkQty, color: '#3b82f6' }))} />
            </Card>
          )}
        </div>

        {/* ==========================================
            ADMIN — QC OVERVIEW
            ========================================== */}
        <div className="pt-2 border-t-2 border-dashed border-slate-200">
          <div className="flex items-center gap-2 mb-4">
            <CheckSquare className="h-4 w-4 text-emerald-500" />
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Quality Control</h3>
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card title="Inspection Breakdown" icon={CheckSquare}>
              <PieChart data={[
                { label: 'Passed', value: data.qc.passed, color: '#10b981' },
                { label: 'Failed', value: data.qc.failed, color: '#ef4444' },
                { label: 'Pending', value: data.qc.pending, color: '#f59e0b' },
              ]} centerValue={String(data.qc.totalCpiReports)} centerLabel="Total" />
            </Card>
            <div className="grid grid-cols-2 gap-3">
              <KpiCard icon={CheckSquare} label="Total inspections" value={data.qc.totalCpiReports} color="blue" href="/qc/cpi" />
              <KpiCard icon={CheckSquare} label="Today" value={data.qc.todayCpi} color="teal" />
              <KpiCard icon={CheckSquare} label="Passed" value={data.qc.passed} color="emerald" />
              <KpiCard icon={AlertTriangle} label="Failed" value={data.qc.failed} color={data.qc.failed > 0 ? 'red' : 'slate'} />
            </div>
          </div>
        </div>

        {/* ==========================================
            ADMIN — GATEPASS / DISPATCH OVERVIEW
            ========================================== */}
        <div className="pt-2 border-t-2 border-dashed border-slate-200">
          <div className="flex items-center gap-2 mb-4">
            <Truck className="h-4 w-4 text-amber-500" />
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Gatepass / Dispatch</h3>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <KpiCard icon={Truck} label="Total advice notes" value={data.gatepass.totalAdviceNotes} color="blue" href="/gatepass/advicenote" />
            <KpiCard icon={Package} label="Total dispatched" value={data.gatepass.totalDispatchedQty.toLocaleString()} sub="pcs" color="emerald" />
            <KpiCard icon={Truck} label="Dispatched today" value={data.gatepass.todayDispatched} color="teal" />
          </div>
        </div>

        {/* ==========================================
            ADMIN — AUDIT OVERVIEW
            ========================================== */}
        <div className="pt-2 border-t-2 border-dashed border-slate-200">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="h-4 w-4 text-indigo-500" />
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Audit</h3>
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card title="Audit Pass/Fail" icon={FileText}>
              <PieChart data={[
                { label: 'Pass', value: data.audit.passed, color: '#10b981' },
                { label: 'Fail', value: data.audit.failed, color: '#ef4444' },
              ]} centerValue={data.audit.total > 0 ? `${Math.round(data.audit.passed / data.audit.total * 100)}%` : '—'} centerLabel="Pass rate" />
            </Card>
            <div className="grid grid-cols-2 gap-3">
              <KpiCard icon={FileText} label="Total audits" value={data.audit.total} color="blue" href="/audit" />
              <KpiCard icon={CheckSquare} label="Passed" value={data.audit.passed} color="emerald" />
              <KpiCard icon={AlertTriangle} label="Failed" value={data.audit.failed} color={data.audit.failed > 0 ? 'red' : 'slate'} />
              <KpiCard icon={FileText} label="Pass rate" value={data.audit.total > 0 ? `${Math.round(data.audit.passed / data.audit.total * 100)}%` : '—'} color="teal" />
            </div>
          </div>
        </div>

        {/* ==========================================
            ADMIN — WORKER OVERVIEW
            ========================================== */}
        <div className="pt-2 border-t-2 border-dashed border-slate-200">
          <div className="flex items-center gap-2 mb-4">
            <Factory className="h-4 w-4 text-orange-500" />
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Worker Output & Downtime</h3>
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card title="Today's Worker Output" icon={Factory}
              action={<span className="text-xs font-bold text-slate-700">{totalWorkerToday} total</span>}>
              <MiniBarChart data={[
                { label: 'Seating', value: data.worker.todaySeating, color: '#3b82f6' },
                { label: 'Printing', value: data.worker.todayPrinting, color: '#8b5cf6' },
                { label: 'Curing', value: data.worker.todayCuring, color: '#f59e0b' },
                { label: 'Checking', value: data.worker.todayChecking, color: '#14b8a6' },
                { label: 'Packing', value: data.worker.todayPacking, color: '#6366f1' },
                { label: 'Dispatch', value: data.worker.todayDispatch, color: '#10b981' },
              ]} height={140} />
            </Card>
            <div className="grid grid-cols-2 gap-3">
              <KpiCard icon={Factory} label="Total entries" value={data.worker.totalDailyOutput} color="blue" href="/worker" />
              <KpiCard icon={Factory} label="Today's entries" value={data.worker.todayOutput} color="teal" />
              <KpiCard icon={Clock} label="Total downtime" value={data.worker.totalDowntime} color="slate" href="/worker/downtime" />
              <KpiCard icon={Clock} label="Pending approval" value={data.worker.pendingDowntime} color={data.worker.pendingDowntime > 0 ? 'red' : 'slate'} href="/worker/downtime" />
            </div>
          </div>
        </div>
      </>)}

      {/* ==========================================
          DEVELOPER
          ========================================== */}
      {role === 'Developer' && (<>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <KpiCard icon={Code} label="Jobs created" value={data.development.totalJobs} color="blue" href="/development" delay={0.05} />
          <KpiCard icon={FileText} label="Submissions" value={data.development.totalSubmissions} color="purple" href="/development/submit" delay={0.1} />
          <KpiCard icon={ClipboardCheck} label="Pending approval" value={data.development.pendingSubmissions} color={data.development.pendingSubmissions > 0 ? 'amber' : 'emerald'} delay={0.15} />
        </div>
        <Card title="Approval Status" icon={ClipboardCheck}>
          <PieChart data={[
            { label: 'Approved', value: data.approvals.approved, color: '#10b981' },
            { label: 'Rejected', value: data.approvals.rejected, color: '#ef4444' },
            { label: 'Pending', value: data.approvals.pending, color: '#f59e0b' },
          ]} centerValue={String(data.approvals.total)} centerLabel="Total" />
        </Card>
      </>)}

      {/* ==========================================
          STORES
          ========================================== */}
      {role === 'Stores' && (<>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card title="Bulk Balance" icon={Package}>
            <div className="flex items-center gap-6">
              <MiniDonut value={data.stores.bulkReceived} total={data.stores.bulkApproved} size={100} color="#3b82f6" />
              <div className="flex-1 space-y-2.5">
                <ProgressBar value={data.stores.bulkReceived} max={data.stores.bulkApproved} label="Received" color="#3b82f6" />
                <ProgressBar value={data.stores.totalIssuedQty} max={data.stores.bulkReceived} label="Issued to production" color="#8b5cf6" />
                <div className="pt-1 border-t border-slate-100 text-xs text-slate-500">Remaining: <b className="text-slate-700">{data.stores.bulkRemaining.toLocaleString()}</b></div>
              </div>
            </div>
          </Card>
          <div className="grid grid-cols-2 gap-3">
            <KpiCard icon={PackageOpen} label="Store-In today" value={data.stores.todayStoreIn} color="blue" href="/inventory/in" />
            <KpiCard icon={Factory} label="Production today" value={data.stores.todayProduction} color="purple" href="/inventory/production" />
            <KpiCard icon={PackageOpen} label="Total received" value={data.stores.totalInQty.toLocaleString()} sub="pcs" color="emerald" />
            <KpiCard icon={Factory} label="Total issued" value={data.stores.totalIssuedQty.toLocaleString()} sub="pcs" color="teal" />
          </div>
        </div>
        {styles.length > 0 && (
          <Card title="Bulk Balance by Style" icon={Package}>
            <HorizontalBarChart data={styles.map(s => ({ label: `${s.styleNo} — ${s.customerName}`, value: s.totalReceived, max: s.bulkQty, color: '#3b82f6' }))} />
          </Card>
        )}
      </>)}

      {/* ==========================================
          QC
          ========================================== */}
      {role === 'QC' && (<>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card title="Inspection Results" icon={CheckSquare}>
            <PieChart data={[
              { label: 'Passed', value: data.qc.passed, color: '#10b981' },
              { label: 'Failed', value: data.qc.failed, color: '#ef4444' },
              { label: 'Pending', value: data.qc.pending, color: '#f59e0b' },
            ]} centerValue={String(data.qc.totalCpiReports)} centerLabel="Total" />
          </Card>
          <div className="grid grid-cols-2 gap-3">
            <KpiCard icon={CheckSquare} label="Total inspections" value={data.qc.totalCpiReports} color="blue" href="/qc/cpi" />
            <KpiCard icon={CheckSquare} label="Today" value={data.qc.todayCpi} color="teal" />
            <KpiCard icon={CheckSquare} label="Passed" value={data.qc.passed} color="emerald" />
            <KpiCard icon={AlertTriangle} label="Failed" value={data.qc.failed} color={data.qc.failed > 0 ? 'red' : 'slate'} />
          </div>
        </div>
      </>)}

      {/* ==========================================
          GATEPASS
          ========================================== */}
      {role === 'Gatepass' && (<>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <KpiCard icon={Truck} label="Total advice notes" value={data.gatepass.totalAdviceNotes} color="blue" href="/gatepass/advicenote" />
          <KpiCard icon={Package} label="Total dispatched" value={data.gatepass.totalDispatchedQty.toLocaleString()} sub="pcs" color="emerald" />
          <KpiCard icon={Truck} label="Today" value={data.gatepass.todayDispatched} color="teal" />
        </div>
        {data.recent.dispatches.length > 0 && (
          <Card title="Recent Dispatches" icon={FileText}>
            <div className="overflow-x-auto -mx-5 -mb-5">
              <table className="w-full text-sm"><thead><tr className="bg-slate-50 text-[11px] font-semibold text-slate-500 border-y border-slate-100">
                <th className="px-5 py-2 text-left">AD</th><th className="px-4 py-2 text-left">Style</th><th className="px-4 py-2 text-right">Qty</th><th className="px-4 py-2 text-left">Date</th>
              </tr></thead><tbody className="divide-y divide-slate-50">{data.recent.dispatches.map((d: any, i: number) => (
                <tr key={i}><td className="px-5 py-2 font-bold">{d.adNo}</td><td className="px-4 py-2">{d.styleNo}</td><td className="px-4 py-2 text-right font-bold">{d.dispatchQty}</td><td className="px-4 py-2 text-slate-500">{d.date}</td></tr>
              ))}</tbody></table>
            </div>
          </Card>
        )}
      </>)}

      {/* ==========================================
          AUDIT
          ========================================== */}
      {role === 'Audit' && (<>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card title="Audit Results" icon={FileText}>
            <PieChart data={[
              { label: 'Pass', value: data.audit.passed, color: '#10b981' },
              { label: 'Fail', value: data.audit.failed, color: '#ef4444' },
            ]} centerValue={data.audit.total > 0 ? `${Math.round(data.audit.passed / data.audit.total * 100)}%` : '—'} centerLabel="Pass rate" />
          </Card>
          <div className="grid grid-cols-2 gap-3">
            <KpiCard icon={FileText} label="Total audits" value={data.audit.total} color="blue" href="/audit" />
            <KpiCard icon={CheckSquare} label="Passed" value={data.audit.passed} color="emerald" />
            <KpiCard icon={AlertTriangle} label="Failed" value={data.audit.failed} color={data.audit.failed > 0 ? 'red' : 'slate'} />
            <KpiCard icon={FileText} label="Pass rate" value={data.audit.total > 0 ? `${Math.round(data.audit.passed / data.audit.total * 100)}%` : '—'} color="teal" />
          </div>
        </div>
      </>)}

      {/* ==========================================
          WORKER
          ========================================== */}
      {role === 'Worker' && (<>
        <Card title="Today's Output" icon={Factory}
          action={<span className="text-xs font-bold text-slate-700">{totalWorkerToday} total pcs</span>}>
          <MiniBarChart data={[
            { label: 'Seating', value: data.worker.todaySeating, color: '#3b82f6' },
            { label: 'Printing', value: data.worker.todayPrinting, color: '#8b5cf6' },
            { label: 'Curing', value: data.worker.todayCuring, color: '#f59e0b' },
            { label: 'Checking', value: data.worker.todayChecking, color: '#14b8a6' },
            { label: 'Packing', value: data.worker.todayPacking, color: '#6366f1' },
            { label: 'Dispatch', value: data.worker.todayDispatch, color: '#10b981' },
          ]} height={150} />
        </Card>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <KpiCard icon={Factory} label="Total entries" value={data.worker.totalDailyOutput} color="blue" href="/worker" />
          <KpiCard icon={Factory} label="Today's entries" value={data.worker.todayOutput} color="teal" />
          <KpiCard icon={Clock} label="Pending downtime" value={data.worker.pendingDowntime} color={data.worker.pendingDowntime > 0 ? 'amber' : 'slate'} href="/worker/downtime" />
        </div>
      </>)}
    </div>
  );
}