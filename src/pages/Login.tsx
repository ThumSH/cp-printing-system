// src/pages/Login.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, LogIn, Loader2 } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    if (isAuthenticated) navigate('/');
  }, [isAuthenticated, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password.');
      return;
    }
    setIsLoading(true);
    const success = await login(username, password);
    if (success) { navigate('/'); }
    else { setError('Invalid credentials or server unreachable.'); }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex">
      {/* ===== Left panel — dark branding ===== */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden bg-slate-900">
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }} />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full bg-blue-600/20 blur-[120px]" />
        <div className="absolute -top-20 -right-20 w-[300px] h-[300px] rounded-full bg-teal-500/10 blur-[100px]" />

        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <img src="/logo.svg" alt="Colourplus" className="h-16 w-auto" />
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }} className="max-w-lg">
            <h1 className="text-4xl font-black text-white leading-tight tracking-tight">
              Screen Printing<br />
              <span className="text-blue-400">Management System</span>
            </h1>
            <p className="mt-4 text-slate-400 text-lg leading-relaxed">
              End-to-end production workflow — from development to delivery.
            </p>
            <div className="mt-8 flex flex-wrap gap-2">
              {['Production Tracking', 'Quality Control', 'Inventory', 'Dispatch', 'Audit Trail', 'Real-time Reports'].map((f, i) => (
                <motion.span key={f} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: 0.4 + i * 0.08 }}
                  className="px-3 py-1.5 rounded-full text-xs font-medium bg-white/5 text-slate-300 border border-white/10"
                >{f}</motion.span>
              ))}
            </div>
          </motion.div>

          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 0.8 }}
            className="text-xs text-slate-600">
            Colour Plus Printing Systems (Pvt) Ltd
          </motion.p>
        </div>
      </div>

      {/* ===== Right panel — white with design ===== */}
      <div className="flex-1 flex items-center justify-center p-8 relative overflow-hidden bg-white">
        {/* Soft color washes */}
        <div className="absolute top-[-15%] right-[-10%] w-[500px] h-[500px] rounded-full bg-blue-100/50 blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] rounded-full bg-indigo-50/60 blur-[100px]" />
        <div className="absolute top-[50%] right-[20%] w-[200px] h-[200px] rounded-full bg-teal-50/40 blur-[80px]" />

        {/* Grid */}
        <div className="absolute inset-0 opacity-[0.025]" style={{
          backgroundImage: `linear-gradient(#94a3b8 1px, transparent 1px),
                            linear-gradient(90deg, #94a3b8 1px, transparent 1px)`,
          backgroundSize: '48px 48px'
        }} />

        {/* Diagonal lines */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 right-[35%] w-px h-[150%] bg-gradient-to-b from-transparent via-blue-200/40 to-transparent -rotate-[20deg] origin-top" />
          <div className="absolute top-0 right-[55%] w-px h-[150%] bg-gradient-to-b from-transparent via-slate-200/30 to-transparent -rotate-[20deg] origin-top" />
          <div className="absolute top-0 right-[75%] w-px h-[150%] bg-gradient-to-b from-transparent via-indigo-100/25 to-transparent -rotate-[20deg] origin-top" />
        </div>

        {/* Floating rings */}
        <div className="absolute top-[12%] right-[8%] w-36 h-36 rounded-full border border-slate-200/60" />
        <div className="absolute bottom-[18%] left-[6%] w-24 h-24 rounded-full border border-blue-100/50" />
        <div className="absolute top-[55%] right-[30%] w-14 h-14 rounded-full border border-slate-100/40" />

        {/* Corner brackets */}
        <svg className="absolute top-7 right-7 w-14 h-14 text-slate-300" viewBox="0 0 56 56" fill="none">
          <path d="M56 0v16M40 0h16" stroke="currentColor" strokeWidth="1" />
        </svg>
        <svg className="absolute bottom-7 left-7 w-14 h-14 text-slate-300" viewBox="0 0 56 56" fill="none">
          <path d="M0 56v-16M16 56H0" stroke="currentColor" strokeWidth="1" />
        </svg>

        {/* Accent dots */}
        <div className="absolute top-[25%] left-[15%] w-2 h-2 rounded-full bg-blue-200/60" />
        <div className="absolute top-[70%] right-[12%] w-1.5 h-1.5 rounded-full bg-indigo-200/50" />
        <div className="absolute bottom-[30%] right-[40%] w-2.5 h-2.5 rounded-full bg-teal-200/40" />

        {/* Form card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="w-full max-w-sm relative z-10 rounded-2xl bg-white border border-slate-200/80 p-8 shadow-xl shadow-slate-200/50"
        >
          <div className="lg:hidden mb-8 flex justify-center">
            <img src="/logo.svg" alt="Colourplus" className="h-14 w-auto" />
          </div>

          <h2 className="text-2xl font-bold text-slate-900">Sign in</h2>
          <p className="mt-1 text-sm text-slate-500">Enter your credentials to continue.</p>

          <form onSubmit={handleLogin} className="mt-8 space-y-5">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide">Username</label>
              <input type="text" value={username}
                onChange={(e) => { setUsername(e.target.value); setError(''); }}
                placeholder="Enter username" autoFocus autoComplete="username"
                className={`w-full rounded-lg border px-4 py-3 text-sm outline-none transition-all ${
                  error ? 'border-red-300 bg-red-50/50 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                    : 'border-slate-200 bg-slate-50/50 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:bg-white'
                }`}
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide">Password</label>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  placeholder="Enter password" autoComplete="current-password"
                  className={`w-full rounded-lg border px-4 py-3 pr-11 text-sm outline-none transition-all ${
                    error ? 'border-red-300 bg-red-50/50 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                      : 'border-slate-200 bg-slate-50/50 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:bg-white'
                  }`}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <AnimatedError message={error} />

            <button type="submit" disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 active:bg-slate-950 transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-sm">
              {isLoading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Signing in...</>
              ) : (
                <><LogIn className="w-4 h-4" /> Sign in</>
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-[11px] text-slate-400">
            Colourplus ERP v1.0 — Contact admin for access.
          </p>
        </motion.div>
      </div>
    </div>
  );
}

function AnimatedError({ message }: { message: string }) {
  if (!message) return null;
  return (
    <motion.div initial={{ opacity: 0, y: -8, height: 0 }} animate={{ opacity: 1, y: 0, height: 'auto' }}
      className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700 font-medium">
      {message}
    </motion.div>
  );
}