// src/pages/Dashboard.tsx
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, Package, CheckSquare, Truck, FileText, Factory,
  Clock, AlertTriangle, TrendingUp, Users, Code, ClipboardCheck,
  PackageOpen, ArrowRight,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { API, getAuthHeaders } from '../api/client';

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

function StatCard({ icon: Icon, label, value, sub, color = 'blue', onClick }: { icon: any; label: string; value: string | number; sub?: string; color?: string; onClick?: () => void }) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    teal: 'bg-teal-50 text-teal-700 border-teal-200',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    slate: 'bg-slate-50 text-slate-700 border-slate-200',
  };
  const iconColors: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-600', emerald: 'bg-emerald-100 text-emerald-600',
    amber: 'bg-amber-100 text-amber-600', red: 'bg-red-100 text-red-600',
    purple: 'bg-purple-100 text-purple-600', teal: 'bg-teal-100 text-teal-600',
    indigo: 'bg-indigo-100 text-indigo-600', slate: 'bg-slate-100 text-slate-600',
  };
  return (
    <div className={`rounded-xl border p-4 ${colors[color]} ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`} onClick={onClick}>
      <div className="flex items-start justify-between">
        <div className={`rounded-lg p-2 ${iconColors[color]}`}><Icon className="h-5 w-5" /></div>
        {sub && <span className="text-[10px] font-medium opacity-70">{sub}</span>}
      </div>
      <p className="mt-3 text-2xl font-black">{value}</p>
      <p className="text-xs font-medium opacity-70 mt-0.5">{label}</p>
    </div>
  );
}

function SectionHeader({ title, icon: Icon }: { title: string; icon: any }) {
  return (
    <div className="flex items-center gap-2 mb-3 mt-6 first:mt-0">
      <Icon className="h-5 w-5 text-slate-400" />
      <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">{title}</h3>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuthStore();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${API.BASE}/api/dashboard`, { headers: getAuthHeaders() });
        if (!res.ok) throw new Error(await res.text());
        setData(await res.json());
      } catch (e) { setError(e instanceof Error ? e.message : 'Failed to load dashboard.'); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const role = user?.role || '';
  const isAdmin = role === 'Admin';
  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  if (loading) return <div className="py-20 text-center text-slate-400">Loading dashboard...</div>;
  if (error) return <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">{error}</div>;
  if (!data) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-2 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Welcome back, {user?.name}</h1>
          <p className="text-sm text-slate-500">{today}</p>
        </div>
        <div className="rounded-lg bg-blue-100 px-3 py-1.5 text-xs font-bold text-blue-700">{role}</div>
      </div>

      {/* ===== ADMIN: Everything ===== */}
      {isAdmin && (
        <>
          {/* Pipeline overview */}
          <SectionHeader title="Pipeline overview" icon={TrendingUp} />
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
            <StatCard icon={Code} label="Dev jobs" value={data.development.totalJobs} color="slate" />
            <StatCard icon={ClipboardCheck} label="Approved" value={data.approvals.approved} color="emerald" />
            <StatCard icon={PackageOpen} label="Store-In" value={data.stores.totalStoreIn} sub={`${data.stores.totalInQty} pcs`} color="blue" />
            <StatCard icon={CheckSquare} label="QC passed" value={data.qc.passed} color="emerald" />
            <StatCard icon={Factory} label="Production" value={data.stores.totalProductionRecords} sub={`${data.stores.totalIssuedQty} pcs`} color="purple" />
            <StatCard icon={Truck} label="Dispatched" value={data.gatepass.totalAdviceNotes} sub={`${data.gatepass.totalDispatchedQty} pcs`} color="teal" />
            <StatCard icon={FileText} label="Audits" value={data.audit.total} color="indigo" />
          </div>

          {/* Alerts */}
          {(data.approvals.pending > 0 || data.qc.pending > 0 || data.worker.pendingDowntime > 0) && (
            <>
              <SectionHeader title="Needs attention" icon={AlertTriangle} />
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                {data.approvals.pending > 0 && <StatCard icon={ClipboardCheck} label="Pending approvals" value={data.approvals.pending} color="amber" />}
                {data.qc.pending > 0 && <StatCard icon={CheckSquare} label="QC pending" value={data.qc.pending} color="amber" />}
                {data.worker.pendingDowntime > 0 && <StatCard icon={Clock} label="Pending downtime" value={data.worker.pendingDowntime} color="red" />}
              </div>
            </>
          )}

          {/* Bulk balance */}
          <SectionHeader title="Bulk balance" icon={Package} />
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <StatCard icon={Package} label="Total bulk approved" value={data.stores.bulkApproved.toLocaleString()} color="blue" />
            <StatCard icon={PackageOpen} label="Total received" value={data.stores.bulkReceived.toLocaleString()} color="emerald" />
            <StatCard icon={Package} label="Remaining to receive" value={data.stores.bulkRemaining.toLocaleString()} color={data.stores.bulkRemaining > 0 ? 'amber' : 'emerald'} />
          </div>

          {/* Today */}
          <SectionHeader title="Today's activity" icon={Clock} />
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard icon={PackageOpen} label="Store-In today" value={data.stores.todayStoreIn} color="blue" />
            <StatCard icon={Factory} label="Production today" value={data.stores.todayProduction} color="purple" />
            <StatCard icon={CheckSquare} label="QC today" value={data.qc.todayCpi} color="teal" />
            <StatCard icon={Truck} label="Dispatched today" value={data.gatepass.todayDispatched} color="emerald" />
          </div>

          {/* Worker output today */}
          <SectionHeader title="Worker output today" icon={Factory} />
          <div className="grid grid-cols-3 gap-3 md:grid-cols-6">
            <StatCard icon={Factory} label="Seating" value={data.worker.todaySeating} color="blue" />
            <StatCard icon={Factory} label="Printing" value={data.worker.todayPrinting} color="purple" />
            <StatCard icon={Factory} label="Curing" value={data.worker.todayCuring} color="amber" />
            <StatCard icon={Factory} label="Checking" value={data.worker.todayChecking} color="teal" />
            <StatCard icon={Factory} label="Packing" value={data.worker.todayPacking} color="indigo" />
            <StatCard icon={Factory} label="Dispatch" value={data.worker.todayDispatch} color="emerald" />
          </div>

          {/* Recent activity */}
          <SectionHeader title="Recent dispatches" icon={Truck} />
          {data.recent.dispatches.length > 0 ? (
            <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
              <table className="w-full text-sm">
                <thead><tr className="bg-slate-50 text-xs text-slate-500 border-b border-slate-200">
                  <th className="px-4 py-2 text-left">AD No</th><th className="px-4 py-2 text-left">Style</th><th className="px-4 py-2 text-left">Customer</th><th className="px-4 py-2 text-right">Qty</th><th className="px-4 py-2 text-left">Date</th>
                </tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {data.recent.dispatches.map((d: any, i: number) => (
                    <tr key={i}><td className="px-4 py-2 font-bold">{d.adNo}</td><td className="px-4 py-2">{d.styleNo}</td><td className="px-4 py-2 text-slate-500">{d.customerName}</td><td className="px-4 py-2 text-right font-bold">{d.dispatchQty}</td><td className="px-4 py-2 text-slate-500">{d.date}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="text-sm text-slate-400">No dispatches yet.</p>}
        </>
      )}

      {/* ===== DEVELOPER ===== */}
      {(role === 'Developer') && (
        <>
          <SectionHeader title="My work" icon={Code} />
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <StatCard icon={Code} label="Total jobs created" value={data.development.totalJobs} color="blue" />
            <StatCard icon={FileText} label="Total submissions" value={data.development.totalSubmissions} color="purple" />
            <StatCard icon={ClipboardCheck} label="Pending approval" value={data.development.pendingSubmissions} color={data.development.pendingSubmissions > 0 ? 'amber' : 'emerald'} />
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 mt-3">
            <StatCard icon={ClipboardCheck} label="Approved" value={data.approvals.approved} color="emerald" />
            <StatCard icon={AlertTriangle} label="Rejected" value={data.approvals.rejected} color={data.approvals.rejected > 0 ? 'red' : 'slate'} />
          </div>
        </>
      )}

      {/* ===== STORES ===== */}
      {(role === 'Stores') && (
        <>
          <SectionHeader title="Inventory" icon={Package} />
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <StatCard icon={Package} label="Bulk approved" value={data.stores.bulkApproved.toLocaleString()} color="blue" />
            <StatCard icon={PackageOpen} label="Total received" value={data.stores.bulkReceived.toLocaleString()} color="emerald" />
            <StatCard icon={Package} label="Remaining" value={data.stores.bulkRemaining.toLocaleString()} color={data.stores.bulkRemaining > 0 ? 'amber' : 'emerald'} />
          </div>
          <SectionHeader title="Today" icon={Clock} />
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <StatCard icon={PackageOpen} label="Store-In today" value={data.stores.todayStoreIn} color="blue" />
            <StatCard icon={Factory} label="Production today" value={data.stores.todayProduction} color="purple" />
            <StatCard icon={Factory} label="Total issued" value={data.stores.totalIssuedQty.toLocaleString()} sub="all time" color="teal" />
          </div>
        </>
      )}

      {/* ===== QC ===== */}
      {(role === 'QC') && (
        <>
          <SectionHeader title="Quality control" icon={CheckSquare} />
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard icon={CheckSquare} label="Total inspections" value={data.qc.totalCpiReports} color="blue" />
            <StatCard icon={CheckSquare} label="Passed" value={data.qc.passed} color="emerald" />
            <StatCard icon={AlertTriangle} label="Failed" value={data.qc.failed} color={data.qc.failed > 0 ? 'red' : 'slate'} />
            <StatCard icon={Clock} label="Pending" value={data.qc.pending} color={data.qc.pending > 0 ? 'amber' : 'slate'} />
          </div>
          <SectionHeader title="Today" icon={Clock} />
          <StatCard icon={CheckSquare} label="Inspections today" value={data.qc.todayCpi} color="teal" />
        </>
      )}

      {/* ===== GATEPASS ===== */}
      {(role === 'Gatepass') && (
        <>
          <SectionHeader title="Dispatch" icon={Truck} />
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <StatCard icon={Truck} label="Total advice notes" value={data.gatepass.totalAdviceNotes} color="blue" />
            <StatCard icon={Package} label="Total dispatched" value={data.gatepass.totalDispatchedQty.toLocaleString()} sub="pcs" color="emerald" />
            <StatCard icon={Truck} label="Dispatched today" value={data.gatepass.todayDispatched} color="teal" />
          </div>
          <SectionHeader title="Recent dispatches" icon={FileText} />
          {data.recent.dispatches.length > 0 ? (
            <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
              <table className="w-full text-sm"><thead><tr className="bg-slate-50 text-xs text-slate-500 border-b"><th className="px-4 py-2 text-left">AD No</th><th className="px-4 py-2 text-left">Style</th><th className="px-4 py-2 text-right">Qty</th><th className="px-4 py-2 text-left">Date</th></tr></thead>
              <tbody className="divide-y divide-slate-100">{data.recent.dispatches.map((d: any, i: number) => (<tr key={i}><td className="px-4 py-2 font-bold">{d.adNo}</td><td className="px-4 py-2">{d.styleNo}</td><td className="px-4 py-2 text-right font-bold">{d.dispatchQty}</td><td className="px-4 py-2 text-slate-500">{d.date}</td></tr>))}</tbody></table>
            </div>
          ) : <p className="text-sm text-slate-400">No dispatches yet.</p>}
        </>
      )}

      {/* ===== AUDIT ===== */}
      {(role === 'Audit') && (
        <>
          <SectionHeader title="Audit summary" icon={FileText} />
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard icon={FileText} label="Total audits" value={data.audit.total} color="blue" />
            <StatCard icon={CheckSquare} label="Passed" value={data.audit.passed} color="emerald" />
            <StatCard icon={AlertTriangle} label="Failed" value={data.audit.failed} color={data.audit.failed > 0 ? 'red' : 'slate'} />
            <StatCard icon={Clock} label="Pending" value={data.audit.pending} color={data.audit.pending > 0 ? 'amber' : 'slate'} />
          </div>
        </>
      )}

      {/* ===== WORKER ===== */}
      {(role === 'Worker') && (
        <>
          <SectionHeader title="Today's output" icon={Factory} />
          <div className="grid grid-cols-3 gap-3 md:grid-cols-6">
            <StatCard icon={Factory} label="Seating" value={data.worker.todaySeating} color="blue" />
            <StatCard icon={Factory} label="Printing" value={data.worker.todayPrinting} color="purple" />
            <StatCard icon={Factory} label="Curing" value={data.worker.todayCuring} color="amber" />
            <StatCard icon={Factory} label="Checking" value={data.worker.todayChecking} color="teal" />
            <StatCard icon={Factory} label="Packing" value={data.worker.todayPacking} color="indigo" />
            <StatCard icon={Factory} label="Dispatch" value={data.worker.todayDispatch} color="emerald" />
          </div>
          <SectionHeader title="Summary" icon={TrendingUp} />
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <StatCard icon={Factory} label="Total entries" value={data.worker.totalDailyOutput} color="blue" />
            <StatCard icon={Factory} label="Today's entries" value={data.worker.todayOutput} color="teal" />
            <StatCard icon={Clock} label="Pending downtime" value={data.worker.pendingDowntime} color={data.worker.pendingDowntime > 0 ? 'amber' : 'slate'} />
          </div>
        </>
      )}
    </motion.div>
  );
}