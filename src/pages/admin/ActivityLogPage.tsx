// src/pages/admin/ActivityLogPage.tsx
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity, Search, Filter, LogIn, Plus, Edit2, Trash2, RefreshCw,
  Loader2, Users, Clock, ChevronDown, ChevronRight, Shield,
} from 'lucide-react';
import { API, getAuthHeaders } from '../../api/client';

interface LogEntry {
  id: string; userId: string; userName: string; userRole: string;
  action: string; entity: string; entityId: string; description: string;
  timestamp: string; ipAddress: string;
}

interface LogSummary {
  totalToday: number; loginsToday: number; createsToday: number;
  updatesToday: number; deletesToday: number;
  activeUsers: { userName: string; userRole: string }[];
  recentLogs: LogEntry[];
}

const ACTION_ICONS: Record<string, { icon: any; color: string }> = {
  Login: { icon: LogIn, color: 'bg-blue-100 text-blue-600' },
  Create: { icon: Plus, color: 'bg-emerald-100 text-emerald-600' },
  Update: { icon: Edit2, color: 'bg-amber-100 text-amber-600' },
  Delete: { icon: Trash2, color: 'bg-red-100 text-red-600' },
};

const ROLE_COLORS: Record<string, string> = {
  Admin: 'text-red-600', Developer: 'text-blue-600', QC: 'text-emerald-600',
  Gatepass: 'text-amber-600', Audit: 'text-purple-600', Stores: 'text-teal-600', Worker: 'text-orange-600',
};

export default function ActivityLogPage() {
  const [summary, setSummary] = useState<LogSummary | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState('');
  const [filterEntity, setFilterEntity] = useState('');
  const [filterUser, setFilterUser] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterAction) params.set('action', filterAction);
      if (filterEntity) params.set('entity', filterEntity);
      if (filterUser) params.set('user', filterUser);
      params.set('limit', '200');

      const [summaryRes, logsRes] = await Promise.all([
        fetch(`${API.BASE}/api/activitylog/summary`, { headers: getAuthHeaders() }),
        fetch(`${API.BASE}/api/activitylog?${params}`, { headers: getAuthHeaders() }),
      ]);

      if (summaryRes.ok) setSummary(await summaryRes.json());
      if (logsRes.ok) setLogs(await logsRes.json());
    } catch { }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [filterAction, filterEntity, filterUser]);

  const clearFilters = () => { setFilterAction(''); setFilterEntity(''); setFilterUser(''); };

  const formatTime = (ts: string) => {
    try {
      const d = new Date(ts + 'Z');
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffMin = Math.floor(diffMs / 60000);
      if (diffMin < 1) return 'Just now';
      if (diffMin < 60) return `${diffMin}m ago`;
      const diffHrs = Math.floor(diffMin / 60);
      if (diffHrs < 24) return `${diffHrs}h ago`;
      return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    } catch { return ts; }
  };

  if (loading && !summary) return (
    <div className="flex items-center justify-center py-32"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between pb-5 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-indigo-100 p-2.5 text-indigo-600"><Activity className="h-5 w-5" /></div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Activity Log</h2>
            <p className="text-sm text-slate-500">Track all user actions across the system.</p>
          </div>
        </div>
        <button onClick={fetchData} className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </motion.div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <SummaryCard icon={Activity} label="Actions today" value={summary.totalToday} color="blue" />
          <SummaryCard icon={LogIn} label="Logins today" value={summary.loginsToday} color="indigo" />
          <SummaryCard icon={Plus} label="Creates" value={summary.createsToday} color="emerald" />
          <SummaryCard icon={Edit2} label="Updates" value={summary.updatesToday} color="amber" />
          <SummaryCard icon={Trash2} label="Deletes" value={summary.deletesToday} color="red" />
          <SummaryCard icon={Users} label="Active users" value={summary.activeUsers.length} color="teal" />
        </div>
      )}

      {/* Active users chips */}
      {summary && summary.activeUsers.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wide self-center mr-1">Online today:</span>
          {summary.activeUsers.map((u, i) => (
            <span key={i} className={`rounded-full bg-white border border-slate-200 px-3 py-1 text-xs font-medium ${ROLE_COLORS[u.userRole] || 'text-slate-600'}`}>
              {u.userName} <span className="text-slate-400">({u.userRole})</span>
            </span>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-2">
        <button onClick={() => setShowFilters(!showFilters)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors">
          <Filter className="h-3.5 w-3.5" /> Filters {showFilters ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        </button>
        {(filterAction || filterEntity || filterUser) && (
          <button onClick={clearFilters} className="text-xs font-medium text-blue-600 hover:text-blue-800">Clear all</button>
        )}
      </div>

      <AnimatePresence>{showFilters && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
          className="overflow-hidden">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 rounded-xl border border-slate-200 bg-white p-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Action</label>
              <select value={filterAction} onChange={(e) => setFilterAction(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20">
                <option value="">All actions</option>
                <option value="Login">Login</option>
                <option value="Create">Create</option>
                <option value="Update">Update</option>
                <option value="Delete">Delete</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Module</label>
              <select value={filterEntity} onChange={(e) => setFilterEntity(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20">
                <option value="">All modules</option>
                <option value="Auth">Auth</option>
                <option value="StoreIn">Store In</option>
                <option value="CPI">QC (CPI)</option>
                <option value="Production">Production</option>
                <option value="AdviceNote">Gatepass</option>
                <option value="Audit">Audit</option>
                <option value="DailyOutput">Daily Output</option>
                <option value="Downtime">Downtime</option>
                <option value="Approval">Approval</option>
                <option value="User">User Management</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wide text-slate-500">User</label>
              <input type="text" value={filterUser} onChange={(e) => setFilterUser(e.target.value)} placeholder="Search by username..."
                className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" />
            </div>
          </div>
        </motion.div>
      )}</AnimatePresence>

      {/* Logs timeline */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-3 flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-700">Activity Timeline</span>
          <span className="text-xs text-slate-500">{logs.length} entries</span>
        </div>

        {logs.length === 0 ? (
          <div className="py-16 text-center">
            <Activity className="mx-auto mb-3 h-12 w-12 text-slate-200" />
            <p className="text-slate-400 font-medium">No activity logs yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50 max-h-[600px] overflow-y-auto">
            {logs.map((log, i) => {
              const ac = ACTION_ICONS[log.action] || { icon: Activity, color: 'bg-slate-100 text-slate-600' };
              const Icon = ac.icon;
              return (
                <motion.div key={log.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(i * 0.02, 0.5) }}
                  className="flex items-start gap-3 px-5 py-3 hover:bg-slate-50/50 transition-colors">
                  <div className={`rounded-lg p-1.5 shrink-0 mt-0.5 ${ac.color}`}><Icon className="h-3.5 w-3.5" /></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-800">
                      <span className={`font-semibold ${ROLE_COLORS[log.userRole] || 'text-slate-700'}`}>{log.userName}</span>
                      <span className="text-slate-400 mx-1.5">·</span>
                      <span>{log.description}</span>
                    </p>
                    <div className="flex items-center gap-3 mt-0.5 text-[11px] text-slate-400">
                      <span>{formatTime(log.timestamp)}</span>
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">{log.entity}</span>
                      {log.ipAddress && log.ipAddress !== 'unknown' && <span>IP: {log.ipAddress}</span>}
                    </div>
                  </div>
                  <span className="text-[10px] font-medium text-slate-400 shrink-0 mt-1">{log.timestamp.split(' ')[1] || ''}</span>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  const styles: Record<string, string> = {
    blue: 'bg-blue-50 border-blue-100 text-blue-700',
    indigo: 'bg-indigo-50 border-indigo-100 text-indigo-700',
    emerald: 'bg-emerald-50 border-emerald-100 text-emerald-700',
    amber: 'bg-amber-50 border-amber-100 text-amber-700',
    red: 'bg-red-50 border-red-100 text-red-700',
    teal: 'bg-teal-50 border-teal-100 text-teal-700',
  };
  const iconStyles: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-600', indigo: 'bg-indigo-100 text-indigo-600',
    emerald: 'bg-emerald-100 text-emerald-600', amber: 'bg-amber-100 text-amber-600',
    red: 'bg-red-100 text-red-600', teal: 'bg-teal-100 text-teal-600',
  };
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border p-3 ${styles[color]}`}>
      <div className={`rounded-lg p-1.5 w-fit ${iconStyles[color]}`}><Icon className="h-3.5 w-3.5" /></div>
      <p className="mt-2 text-xl font-black">{value}</p>
      <p className="text-[10px] font-medium opacity-70">{label}</p>
    </motion.div>
  );
}