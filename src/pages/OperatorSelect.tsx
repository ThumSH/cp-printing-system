// src/pages/OperatorSelect.tsx
// "Who is using this session?" — shown after login, before entering the app
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, LogIn, Loader2, UserCheck } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { API, getAuthHeaders } from '../api/client';

interface OperatorInfo {
  id: string;
  name: string;
  role: string;
}

const ROLE_COLORS: Record<string, string> = {
  Admin: 'from-red-500 to-red-600',
  Developer: 'from-blue-500 to-blue-600',
  QC: 'from-emerald-500 to-emerald-600',
  Gatepass: 'from-amber-500 to-amber-600',
  Audit: 'from-purple-500 to-purple-600',
  Stores: 'from-teal-500 to-teal-600',
  Worker: 'from-orange-500 to-orange-600',
};

// Persist custom names in localStorage so they survive logout and appear in dropdown next time
const RECENT_NAMES_KEY = 'recentOperatorNames';

function getRecentNames(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_NAMES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveRecentName(name: string) {
  const names = getRecentNames().filter((n) => n.toLowerCase() !== name.toLowerCase());
  names.unshift(name); // most recent first
  // Keep max 10 recent names
  localStorage.setItem(RECENT_NAMES_KEY, JSON.stringify(names.slice(0, 10)));
}

export default function OperatorSelect() {
  const { user, setOperator, logout } = useAuthStore();
  const [operators, setOperators] = useState<OperatorInfo[]>([]);
  const [recentNames, setRecentNames] = useState<string[]>(getRecentNames());
  const [customName, setCustomName] = useState('');
  const [] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${API.BASE}/api/operator/by-role/${user?.role}`, { headers: getAuthHeaders() });
        if (res.ok) setOperators(await res.json());
      } catch { }
      finally { setLoading(false); }
    };
    if (user?.role) load();
  }, [user?.role]);

  const handleSelect = (name: string) => {
    if (!name.trim()) return;
    const trimmed = name.trim();
    // Save to recent names so it appears in dropdown next time (even after logout)
    saveRecentName(trimmed);
    setRecentNames(getRecentNames());
    setOperator(trimmed);
  };

  const gradient = ROLE_COLORS[user?.role || ''] || 'from-slate-500 to-slate-600';
  const initials = user?.role?.slice(0, 2).toUpperCase() || '??';

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md"
      >
        {/* Header card */}
        <div className={`rounded-t-2xl bg-linear-to-r ${gradient} px-6 py-5 text-white`}>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-lg font-bold backdrop-blur-sm">
              {initials}
            </div>
            <div>
              <p className="text-sm opacity-80">Logged in as</p>
              <p className="text-lg font-bold">{user?.role} Account</p>
            </div>
          </div>
        </div>

        {/* Selection area */}
        <div className="rounded-b-2xl bg-white border border-t-0 border-slate-200 shadow-lg p-6">
          <div className="flex items-center gap-2 mb-5">
            <Users className="h-5 w-5 text-slate-400" />
            <h2 className="text-base font-bold text-slate-900">Who is using this session?</h2>
          </div>

          {loading ? (
            <div className="py-8 flex items-center justify-center gap-2 text-slate-400">
              <Loader2 className="h-5 w-5 animate-spin" /> Loading operators...
            </div>
          ) : (
            <div className="space-y-4">
              {/* Operator buttons */}
              {operators.length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  {operators.map((op, i) => (
                    <motion.button
                      key={op.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      onClick={() => handleSelect(op.name)}
                      className="flex items-center gap-2.5 rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-left hover:border-blue-400 hover:bg-blue-50 active:scale-[0.98] transition-all"
                    >
                      <div className={`w-9 h-9 rounded-full bg-linear-to-br ${gradient} flex items-center justify-center text-white text-xs font-bold`}>
                        {op.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
                      </div>
                      <span className="text-sm font-semibold text-slate-800">{op.name}</span>
                    </motion.button>
                  ))}
                </div>
              )}

              {/* Recent custom names (from previous sessions on this device) */}
              {recentNames.filter((n) => !operators.some((op) => op.name.toLowerCase() === n.toLowerCase())).length > 0 && (
                <>
                  {operators.length > 0 && (
                    <div className="flex items-center gap-3">
                      <div className="h-px flex-1 bg-slate-200" />
                      <span className="text-[10px] text-slate-400 font-medium">recently used on this device</span>
                      <div className="h-px flex-1 bg-slate-200" />
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    {recentNames
                      .filter((n) => !operators.some((op) => op.name.toLowerCase() === n.toLowerCase()))
                      .map((name, i) => (
                        <motion.button
                          key={name}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.05 }}
                          onClick={() => handleSelect(name)}
                          className="flex items-center gap-2.5 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-left hover:border-blue-400 hover:bg-blue-50 active:scale-[0.98] transition-all"
                        >
                          <div className="w-9 h-9 rounded-full bg-slate-300 flex items-center justify-center text-white text-xs font-bold">
                            {name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
                          </div>
                          <span className="text-sm font-semibold text-slate-600">{name}</span>
                        </motion.button>
                      ))}
                  </div>
                </>
              )}

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-slate-200" />
                <span className="text-[10px] text-slate-400 font-medium">or type your name</span>
                <div className="h-px flex-1 bg-slate-200" />
              </div>

              {/* Custom name input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && customName.trim()) handleSelect(customName); }}
                  placeholder={operators.length > 0 ? "Not in the list? Type your name..." : "Enter your name to continue..."}
                  className="flex-1 rounded-xl border-2 border-slate-200 px-4 py-3 text-sm font-medium outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 transition-all"
                  autoFocus={operators.length === 0}
                />
                <button
                  onClick={() => handleSelect(customName)}
                  disabled={!customName.trim()}
                  className={`rounded-xl px-4 py-3 text-sm font-bold text-white bg-linear-to-r ${gradient} hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-40`}
                >
                  <UserCheck className="h-4 w-4" />
                </button>
              </div>

              {/* Info text */}
              <p className="text-[11px] text-slate-400 text-center">
                Your name will be recorded with every action you take in the system.
              </p>

              {/* Logout option */}
              <button onClick={logout}
                className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 py-2 text-xs font-medium text-slate-500 hover:bg-slate-50 transition-colors mt-2">
                <LogIn className="h-3.5 w-3.5 rotate-180" /> Sign out and switch account
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}