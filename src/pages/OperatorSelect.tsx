// Every role uses the same Admin-managed list and server-verified operator session.
// No cached names, generic defaults, or unrestricted text entry.
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Users, LogIn, Loader2, AlertCircle, UserCheck } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { API, getAuthHeaders } from '../api/client';

type OperatorInfo = { id: string; name: string; role: string };
const ROLE_COLORS: Record<string, string> = {
  Admin: 'from-red-500 to-red-600',
  SuperAdmin: 'from-slate-700 to-slate-900',
  Developer: 'from-blue-500 to-blue-600',
  QC: 'from-emerald-500 to-emerald-600',
  Gatepass: 'from-amber-500 to-amber-600',
  Audit: 'from-purple-500 to-purple-600',
  Stores: 'from-teal-500 to-teal-600',
  Worker: 'from-orange-500 to-orange-600',
  Accounts: 'from-cyan-500 to-cyan-600',
};

function isGeneric(name: string, role: string) {
  const v = name.trim().toLowerCase();
  const r = role.trim().toLowerCase();
  const singular = r === 'stores' ? 'store' : r === 'developer' ? 'development' : r;
  return !v || ['user','unknown','operator','employee','staff',
    'store','stores','store person','store account','stores account',
    'admin','superadmin','super admin','master administrator','worker person',
    r, singular, `${r} account`, `${r} person`, `${singular} account`, `${singular} person`].includes(v);
}

export default function OperatorSelect() {
  const { user, sessionId, setOperator, logout } = useAuthStore();
  const role = user?.role || '';
  const [operators, setOperators] = useState<OperatorInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!role) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true); setError(''); setOperators([]);
      try {
        const res = await fetch(`${API.BASE}/api/operator/by-role/${encodeURIComponent(role)}`, {
          headers: getAuthHeaders(),
        });
        if (!res.ok) throw new Error('Could not load registered employees. Contact Admin.');
        const list = await res.json() as OperatorInfo[];
        if (!cancelled) setOperators(list.filter(op => !isGeneric(op.name, role)));
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load employees.');
      } finally { if (!cancelled) setLoading(false); }
    };
    void load();
    return () => { cancelled = true; };
  }, [role]);

  const choose = async (operator: OperatorInfo) => {
    if (selecting) return;
    setError(''); setSelecting(true);
    try {
      if (!sessionId) throw new Error('Your login session is missing. Sign out and sign in again.');
      const res = await fetch(`${API.AUTH}/select-operator`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ sessionId, operatorId: operator.id }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message || 'Unable to verify employee for this session.');
      }
      const data = await res.json() as { name: string; sessionId: string; role: string };
      if (data.sessionId !== sessionId || data.role !== role)
        throw new Error('Session identity mismatch. Please sign in again.');
      setOperator(data.name); // Only after server verifies the active operator and current session.
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Employee selection failed.');
    } finally { setSelecting(false); }
  };

  const gradient = ROLE_COLORS[role] || 'from-slate-500 to-slate-600';
  const initials = role.slice(0, 2).toUpperCase() || '??';

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.35 }} className="w-full max-w-md">
        <div className={`rounded-t-2xl bg-linear-to-r ${gradient} px-6 py-5 text-white`}>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 text-lg font-bold">{initials}</div>
            <div><p className="text-sm opacity-80">Logged in as</p><p className="text-lg font-bold">{role} Account</p></div>
          </div>
        </div>
        <div className="rounded-b-2xl border border-t-0 border-slate-200 bg-white p-6 shadow-lg">
          <div className="mb-5 flex items-center gap-2">
            <Users className="h-5 w-5 text-slate-400" />
            <h2 className="text-base font-bold text-slate-900">Who is using this session?</h2>
          </div>
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-slate-400"><Loader2 className="h-5 w-5 animate-spin" /> Loading employees...</div>
          ) : (
            <div className="space-y-4">
              {error && <p role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"><AlertCircle className="h-4 w-4 shrink-0" />{error}</p>}
              {operators.length ? (
                <div className="grid grid-cols-2 gap-2">
                  {operators.map(op => (
                    <button key={op.id} type="button" disabled={selecting} onClick={() => void choose(op)}
                      className="flex items-center gap-2 rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-left hover:border-blue-400 hover:bg-blue-50 disabled:opacity-50">
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-linear-to-br ${gradient} text-xs font-bold text-white`}>
                        {op.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                      </div><span className="truncate text-sm font-semibold text-slate-800">{op.name}</span>
                      {selecting && <UserCheck className="ml-auto h-4 w-4 shrink-0 text-slate-400" />}
                    </button>
                  ))}
                </div>
              ) : !error && (
                <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                  No registered active employees for <strong>{role}</strong>. Ask Admin to register the names in <strong>Admin → Operators</strong> before using this account.
                </p>
              )}
              <p className="text-center text-[11px] text-slate-500">Only registered employees can use this session. Work and attendance will be attributed to the selected name.</p>
              <button type="button" disabled={selecting} onClick={() => void logout()}
                className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 py-2 text-xs font-medium text-slate-500 hover:bg-slate-50 disabled:opacity-50">
                <LogIn className="h-3.5 w-3.5 rotate-180" /> Sign out and switch account
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
