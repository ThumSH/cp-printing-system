// src/pages/admin/ActivityLogPage.tsx
import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity, Search, Filter, LogIn, Plus, Edit2, Trash2, RefreshCw,
  Loader2, Users, Clock, ChevronDown, ChevronRight, Shield, Eye,
  AlertTriangle, Calendar, User, XCircle,
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

const ACTION_CONFIG: Record<string, { icon: any; color: string; bg: string; label: string }> = {
  Login: { icon: LogIn, color: 'text-blue-600', bg: 'bg-blue-100', label: 'Login' },
  Create: { icon: Plus, color: 'text-emerald-600', bg: 'bg-emerald-100', label: 'Create' },
  Update: { icon: Edit2, color: 'text-amber-600', bg: 'bg-amber-100', label: 'Update' },
  Delete: { icon: Trash2, color: 'text-red-600', bg: 'bg-red-100', label: 'Delete' },
};

const ROLE_COLORS: Record<string, string> = {
  Admin: 'text-red-600', Developer: 'text-blue-600', QC: 'text-emerald-600',
  Gatepass: 'text-amber-600', Audit: 'text-purple-600', Stores: 'text-teal-600', Worker: 'text-orange-600',
};

const ENTITY_LABELS: Record<string, string> = {
  Auth: 'Authentication', StoreIn: 'Store-In', CPI: 'QC Inspection', Production: 'Production',
  AdviceNote: 'Gatepass', Audit: 'Audit', DailyOutput: 'Worker Output', Downtime: 'Downtime',
  Approval: 'Approval', User: 'User Management',
};

type Tab = 'timeline' | 'logins' | 'actions' | 'users';

export default function ActivityLogPage() {
  const [summary, setSummary] = useState<LogSummary | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('timeline');

  // Filters
  const [filterAction, setFilterAction] = useState('');
  const [filterEntity, setFilterEntity] = useState('');
  const [filterUser, setFilterUser] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterAction) params.set('action', filterAction);
      if (filterEntity) params.set('entity', filterEntity);
      if (filterUser) params.set('user', filterUser);
      if (filterDateFrom) params.set('from', filterDateFrom);
      if (filterDateTo) params.set('to', filterDateTo);
      params.set('limit', '500');

      const [sRes, lRes] = await Promise.all([
        fetch(`${API.BASE}/api/activitylog/summary`, { headers: getAuthHeaders() }),
        fetch(`${API.BASE}/api/activitylog?${params}`, { headers: getAuthHeaders() }),
      ]);
      if (sRes.ok) setSummary(await sRes.json());
      if (lRes.ok) setLogs(await lRes.json());
    } catch { }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [filterAction, filterEntity, filterUser, filterDateFrom, filterDateTo]);

  const clearFilters = () => { setFilterAction(''); setFilterEntity(''); setFilterUser(''); setFilterDateFrom(''); setFilterDateTo(''); setSearchQuery(''); };
  const hasFilters = filterAction || filterEntity || filterUser || filterDateFrom || filterDateTo;

  // Derived data
  const filteredLogs = useMemo(() => {
    if (!searchQuery.trim()) return logs;
    const q = searchQuery.toLowerCase();
    return logs.filter((l) => l.userName.toLowerCase().includes(q) || l.description.toLowerCase().includes(q) || l.entity.toLowerCase().includes(q) || l.ipAddress.includes(q));
  }, [logs, searchQuery]);

  // Login-specific data
  const loginLogs = useMemo(() => logs.filter((l) => l.action === 'Login'), [logs]);
  const loginsByUser = useMemo(() => {
    const map = new Map<string, { userName: string; userRole: string; logins: LogEntry[] }>();
    loginLogs.forEach((l) => {
      if (!map.has(l.userName)) map.set(l.userName, { userName: l.userName, userRole: l.userRole, logins: [] });
      map.get(l.userName)!.logins.push(l);
    });
    return [...map.values()].sort((a, b) => b.logins.length - a.logins.length);
  }, [loginLogs]);

  // Actions by user
  const actionsByUser = useMemo(() => {
    const map = new Map<string, { userName: string; userRole: string; actions: LogEntry[]; creates: number; updates: number; deletes: number }>();
    logs.filter((l) => l.action !== 'Login').forEach((l) => {
      if (!map.has(l.userName)) map.set(l.userName, { userName: l.userName, userRole: l.userRole, actions: [], creates: 0, updates: 0, deletes: 0 });
      const u = map.get(l.userName)!;
      u.actions.push(l);
      if (l.action === 'Create') u.creates++;
      if (l.action === 'Update') u.updates++;
      if (l.action === 'Delete') u.deletes++;
    });
    return [...map.values()].sort((a, b) => b.actions.length - a.actions.length);
  }, [logs]);

  // User sessions (login + actions grouped)
  const userSessions = useMemo(() => {
    const map = new Map<string, { userName: string; userRole: string; firstSeen: string; lastSeen: string; totalActions: number; ips: Set<string>; actions: LogEntry[] }>();
    logs.forEach((l) => {
      if (!map.has(l.userName)) map.set(l.userName, { userName: l.userName, userRole: l.userRole, firstSeen: l.timestamp, lastSeen: l.timestamp, totalActions: 0, ips: new Set(), actions: [] });
      const u = map.get(l.userName)!;
      u.totalActions++;
      u.ips.add(l.ipAddress);
      u.actions.push(l);
      if (l.timestamp < u.firstSeen) u.firstSeen = l.timestamp;
      if (l.timestamp > u.lastSeen) u.lastSeen = l.timestamp;
    });
    return [...map.values()].sort((a, b) => b.totalActions - a.totalActions);
  }, [logs]);

  const formatTime = (ts: string) => {
    try {
      const d = new Date(ts + 'Z');
      const now = new Date();
      const diffMin = Math.floor((now.getTime() - d.getTime()) / 60000);
      if (diffMin < 1) return 'Just now';
      if (diffMin < 60) return `${diffMin}m ago`;
      if (diffMin < 1440) return `${Math.floor(diffMin / 60)}h ago`;
      return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    } catch { return ts; }
  };

  const formatFullTime = (ts: string) => {
    try {
      const d = new Date(ts + 'Z');
      return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch { return ts; }
  };

  if (loading && !summary) return <div className="flex items-center justify-center py-32"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>;

  return (
    <div className="space-y-5">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-indigo-100 p-2.5 text-indigo-600"><Shield className="h-5 w-5" /></div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Security & Activity Log</h2>
            <p className="text-sm text-slate-500">Monitor all user actions, logins, and system changes.</p>
          </div>
        </div>
        <button onClick={fetchData} className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </motion.div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <SummaryCard icon={Activity} label="Total today" value={summary.totalToday} color="blue" />
          <SummaryCard icon={LogIn} label="Logins" value={summary.loginsToday} color="indigo" />
          <SummaryCard icon={Plus} label="Creates" value={summary.createsToday} color="emerald" />
          <SummaryCard icon={Edit2} label="Updates" value={summary.updatesToday} color="amber" />
          <SummaryCard icon={Trash2} label="Deletes" value={summary.deletesToday} color="red" />
          <SummaryCard icon={Users} label="Active users" value={summary.activeUsers.length} color="teal" />
        </div>
      )}

      {/* Active users */}
      {summary && summary.activeUsers.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active today:</span>
          {summary.activeUsers.map((u, i) => (
            <span key={i} className={`rounded-full bg-white border border-slate-200 px-2.5 py-1 text-[11px] font-semibold ${ROLE_COLORS[u.userRole] || 'text-slate-600'} cursor-pointer hover:shadow-sm transition-shadow`}
              onClick={() => { setFilterUser(u.userName); setActiveTab('timeline'); }}>
              {u.userName} <span className="text-slate-400 font-normal">({u.userRole})</span>
            </span>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200">
        {([
          { id: 'timeline', label: 'Full Timeline', icon: Activity },
          { id: 'logins', label: 'Login History', icon: LogIn },
          { id: 'actions', label: 'Actions by User', icon: Edit2 },
          { id: 'users', label: 'User Sessions', icon: Users },
        ] as { id: Tab; label: string; icon: any }[]).map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === tab.id ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}>
            <tab.icon className="h-3.5 w-3.5" /> {tab.label}
          </button>
        ))}
      </div>

      {/* Filters + Search */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search logs..."
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10" />
        </div>
        <button onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${hasFilters ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>
          <Filter className="h-3.5 w-3.5" /> Filters {hasFilters && <span className="rounded-full bg-blue-600 text-white px-1.5 text-[10px]">!</span>}
        </button>
        {hasFilters && <button onClick={clearFilters} className="text-xs font-medium text-blue-600 hover:text-blue-800">Clear all</button>}
        <span className="ml-auto text-xs text-slate-500">{filteredLogs.length} entries</span>
      </div>

      {/* Filter panel */}
      <AnimatePresence>{showFilters && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 rounded-xl border border-slate-200 bg-white p-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Action</label>
              <select value={filterAction} onChange={(e) => setFilterAction(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm outline-none focus:border-blue-500">
                <option value="">All</option>
                <option value="Login">Login</option><option value="Create">Create</option>
                <option value="Update">Update</option><option value="Delete">Delete</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Module</label>
              <select value={filterEntity} onChange={(e) => setFilterEntity(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm outline-none focus:border-blue-500">
                <option value="">All</option>
                {Object.entries(ENTITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">User</label>
              <input type="text" value={filterUser} onChange={(e) => setFilterUser(e.target.value)} placeholder="Username..."
                className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm outline-none focus:border-blue-500" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">From</label>
              <input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm outline-none focus:border-blue-500" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">To</label>
              <input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm outline-none focus:border-blue-500" />
            </div>
          </div>
        </motion.div>
      )}</AnimatePresence>

      {/* ==========================================
          TAB 1: FULL TIMELINE
          ========================================== */}
      {activeTab === 'timeline' && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          {filteredLogs.length === 0 ? (
            <div className="py-16 text-center"><Activity className="mx-auto mb-3 h-12 w-12 text-slate-200" /><p className="text-slate-400">No activity logs found.</p></div>
          ) : (
            <div className="divide-y divide-slate-50 max-h-[600px] overflow-y-auto">
              {filteredLogs.map((log, i) => <LogRow key={log.id} log={log} delay={Math.min(i * 0.015, 0.3)} formatTime={formatTime} />)}
            </div>
          )}
        </div>
      )}

      {/* ==========================================
          TAB 2: LOGIN HISTORY
          ========================================== */}
      {activeTab === 'logins' && (
        <div className="space-y-4">
          {/* Login summary per user */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {loginsByUser.map((u) => {
              const lastLogin = u.logins[0];
              const ips = [...new Set(u.logins.map((l) => l.ipAddress))];
              return (
                <div key={u.userName} className="rounded-xl border border-slate-200 bg-white p-4 hover:shadow-sm transition-shadow">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold ${
                      u.userRole === 'Admin' ? 'bg-red-100 text-red-700' : u.userRole === 'Developer' ? 'bg-blue-100 text-blue-700' :
                      u.userRole === 'QC' ? 'bg-emerald-100 text-emerald-700' : u.userRole === 'Stores' ? 'bg-teal-100 text-teal-700' :
                      u.userRole === 'Worker' ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-700'
                    }`}>{u.userName.slice(0, 2).toUpperCase()}</div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">{u.userName}</p>
                      <p className="text-[11px] text-slate-500">{u.userRole}</p>
                    </div>
                    <span className="ml-auto rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-bold text-blue-700">{u.logins.length} logins</span>
                  </div>
                  <div className="space-y-1 text-xs text-slate-500">
                    <div className="flex justify-between"><span>Last login:</span><span className="font-medium text-slate-700">{formatTime(lastLogin.timestamp)}</span></div>
                    <div className="flex justify-between"><span>IP(s):</span><span className="font-mono text-slate-600">{ips.join(', ')}</span></div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Full login list */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-slate-100 px-5 py-3"><span className="text-sm font-bold text-slate-700">All Login Events</span></div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="bg-slate-50 text-[11px] font-semibold text-slate-500 border-b border-slate-100">
                  <th className="px-4 py-2.5 text-left">User</th><th className="px-4 py-2.5 text-left">Role</th>
                  <th className="px-4 py-2.5 text-left">Time</th><th className="px-4 py-2.5 text-left">IP Address</th>
                  <th className="px-4 py-2.5 text-left">Status</th>
                </tr></thead>
                <tbody className="divide-y divide-slate-50">
                  {loginLogs.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-2.5 font-bold text-slate-800">{l.userName}</td>
                      <td className="px-4 py-2.5"><span className={`text-xs font-semibold ${ROLE_COLORS[l.userRole] || 'text-slate-600'}`}>{l.userRole}</span></td>
                      <td className="px-4 py-2.5 text-slate-600 font-mono text-xs">{formatFullTime(l.timestamp)}</td>
                      <td className="px-4 py-2.5 font-mono text-xs text-slate-500">{l.ipAddress}</td>
                      <td className="px-4 py-2.5">
                        {l.userId === 'unknown'
                          ? <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">FAILED</span>
                          : <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">SUCCESS</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          TAB 3: ACTIONS BY USER
          ========================================== */}
      {activeTab === 'actions' && (
        <div className="space-y-4">
          {actionsByUser.map((u) => (
            <UserActionCard key={u.userName} user={u} formatTime={formatTime} formatFullTime={formatFullTime} />
          ))}
          {actionsByUser.length === 0 && (
            <div className="py-16 text-center"><Edit2 className="mx-auto mb-3 h-12 w-12 text-slate-200" /><p className="text-slate-400">No actions recorded yet.</p></div>
          )}
        </div>
      )}

      {/* ==========================================
          TAB 4: USER SESSIONS
          ========================================== */}
      {activeTab === 'users' && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-slate-100 px-5 py-3 flex items-center justify-between">
            <span className="text-sm font-bold text-slate-700">User Activity Summary</span>
            <span className="text-xs text-slate-500">{userSessions.length} users</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="bg-slate-50 text-[11px] font-semibold text-slate-500 border-b border-slate-100">
                <th className="px-4 py-2.5 text-left">User</th><th className="px-4 py-2.5 text-left">Role</th>
                <th className="px-4 py-2.5 text-center">Total Actions</th><th className="px-4 py-2.5 text-left">First Seen</th>
                <th className="px-4 py-2.5 text-left">Last Seen</th><th className="px-4 py-2.5 text-left">IP Addresses</th>
                <th className="px-4 py-2.5 text-center">Logins</th><th className="px-4 py-2.5 text-center">Creates</th>
                <th className="px-4 py-2.5 text-center">Updates</th><th className="px-4 py-2.5 text-center">Deletes</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-50">
                {userSessions.map((u) => {
                  const logins = u.actions.filter((a) => a.action === 'Login').length;
                  const creates = u.actions.filter((a) => a.action === 'Create').length;
                  const updates = u.actions.filter((a) => a.action === 'Update').length;
                  const deletes = u.actions.filter((a) => a.action === 'Delete').length;
                  return (
                    <tr key={u.userName} className="hover:bg-slate-50/50">
                      <td className="px-4 py-2.5 font-bold text-slate-800">{u.userName}</td>
                      <td className="px-4 py-2.5"><span className={`text-xs font-semibold ${ROLE_COLORS[u.userRole] || ''}`}>{u.userRole}</span></td>
                      <td className="px-4 py-2.5 text-center font-bold">{u.totalActions}</td>
                      <td className="px-4 py-2.5 font-mono text-xs text-slate-500">{formatFullTime(u.firstSeen)}</td>
                      <td className="px-4 py-2.5 font-mono text-xs text-slate-500">{formatFullTime(u.lastSeen)}</td>
                      <td className="px-4 py-2.5 font-mono text-xs text-slate-500">{[...u.ips].join(', ')}</td>
                      <td className="px-4 py-2.5 text-center"><span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">{logins}</span></td>
                      <td className="px-4 py-2.5 text-center"><span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">{creates}</span></td>
                      <td className="px-4 py-2.5 text-center"><span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">{updates}</span></td>
                      <td className="px-4 py-2.5 text-center"><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${deletes > 0 ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-500'}`}>{deletes}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// SUB-COMPONENTS
// ==========================================

function SummaryCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  const styles: Record<string, string> = {
    blue: 'bg-blue-50 border-blue-100', indigo: 'bg-indigo-50 border-indigo-100',
    emerald: 'bg-emerald-50 border-emerald-100', amber: 'bg-amber-50 border-amber-100',
    red: 'bg-red-50 border-red-100', teal: 'bg-teal-50 border-teal-100',
  };
  const iconStyles: Record<string, string> = {
    blue: 'bg-blue-500', indigo: 'bg-indigo-500', emerald: 'bg-emerald-500',
    amber: 'bg-amber-500', red: 'bg-red-500', teal: 'bg-teal-500',
  };
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border p-3 ${styles[color]}`}>
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${iconStyles[color]}`}>
        <Icon className="h-3.5 w-3.5 text-white" />
      </div>
      <p className="mt-2 text-xl font-black text-slate-900">{value}</p>
      <p className="text-[10px] font-medium text-slate-500">{label}</p>
    </motion.div>
  );
}

function LogRow({ log, delay, formatTime }: { log: LogEntry; delay: number; formatTime: (ts: string) => string }) {
  const ac = ACTION_CONFIG[log.action] || { icon: Activity, color: 'text-slate-600', bg: 'bg-slate-100', label: log.action };
  const Icon = ac.icon;
  const isFailed = log.action === 'Login' && log.userId === 'unknown';

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay }}
      className={`flex items-start gap-3 px-5 py-3 hover:bg-slate-50/50 transition-colors ${isFailed ? 'bg-red-50/30' : ''}`}>
      <div className={`rounded-lg p-1.5 shrink-0 mt-0.5 ${isFailed ? 'bg-red-100' : ac.bg}`}>
        {isFailed ? <XCircle className="h-3.5 w-3.5 text-red-600" /> : <Icon className={`h-3.5 w-3.5 ${ac.color}`} />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-800">
          <span className={`font-semibold ${isFailed ? 'text-red-600' : ROLE_COLORS[log.userRole] || 'text-slate-700'}`}>{log.userName}</span>
          <span className="text-slate-400 mx-1.5">·</span>
          <span>{log.description}</span>
          {isFailed && <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">FAILED</span>}
        </p>
        <div className="flex items-center gap-3 mt-0.5 text-[11px] text-slate-400">
          <span>{formatTime(log.timestamp)}</span>
          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">{ENTITY_LABELS[log.entity] || log.entity}</span>
          {log.ipAddress && log.ipAddress !== 'unknown' && <span className="font-mono">IP: {log.ipAddress}</span>}
        </div>
      </div>
      <span className="text-[10px] font-mono text-slate-400 shrink-0 mt-1">{log.timestamp.split(' ')[1] || ''}</span>
    </motion.div>
  );
}

function UserActionCard({ user, formatTime, formatFullTime }: {
  user: { userName: string; userRole: string; actions: LogEntry[]; creates: number; updates: number; deletes: number };
  formatTime: (ts: string) => string; formatFullTime: (ts: string) => string;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center gap-4 px-5 py-3 cursor-pointer hover:bg-slate-50/50 transition-colors" onClick={() => setExpanded(!expanded)}>
        {expanded ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
        <div className="flex-1">
          <span className={`font-bold ${ROLE_COLORS[user.userRole] || 'text-slate-700'}`}>{user.userName}</span>
          <span className="text-xs text-slate-500 ml-2">({user.userRole})</span>
        </div>
        <div className="flex gap-2">
          {user.creates > 0 && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">{user.creates} creates</span>}
          {user.updates > 0 && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">{user.updates} updates</span>}
          {user.deletes > 0 && <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">{user.deletes} deletes</span>}
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">{user.actions.length} total</span>
        </div>
      </div>
      <AnimatePresence>{expanded && (
        <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden border-t border-slate-100">
          <div className="divide-y divide-slate-50 max-h-[300px] overflow-y-auto">
            {user.actions.map((a) => {
              const ac = ACTION_CONFIG[a.action] || { icon: Activity, color: 'text-slate-600', bg: 'bg-slate-100' };
              const Icon = ac.icon;
              return (
                <div key={a.id} className="flex items-center gap-3 px-5 py-2 text-xs">
                  <div className={`rounded p-1 ${ac.bg}`}><Icon className={`h-3 w-3 ${ac.color}`} /></div>
                  <span className="text-slate-700 flex-1">{a.description}</span>
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">{ENTITY_LABELS[a.entity] || a.entity}</span>
                  <span className="font-mono text-slate-400">{formatFullTime(a.timestamp)}</span>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}</AnimatePresence>
    </div>
  );
}