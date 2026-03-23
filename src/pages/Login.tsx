// src/pages/Login.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, LogIn, Loader2 } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

// Screen printing mesh pattern — SVG as data URI
const MESH_PATTERN = `url("data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3Cpattern id='mesh' width='60' height='60' patternUnits='userSpaceOnUse'%3E%3Ccircle cx='2' cy='2' r='0.8' fill='%2394a3b8'/%3E%3Ccircle cx='22' cy='2' r='0.8' fill='%2394a3b8'/%3E%3Ccircle cx='42' cy='2' r='0.8' fill='%2394a3b8'/%3E%3Ccircle cx='12' cy='12' r='0.8' fill='%2394a3b8'/%3E%3Ccircle cx='32' cy='12' r='0.8' fill='%2394a3b8'/%3E%3Ccircle cx='52' cy='12' r='0.8' fill='%2394a3b8'/%3E%3Ccircle cx='2' cy='22' r='0.8' fill='%2394a3b8'/%3E%3Ccircle cx='22' cy='22' r='0.8' fill='%2394a3b8'/%3E%3Ccircle cx='42' cy='22' r='0.8' fill='%2394a3b8'/%3E%3Ccircle cx='12' cy='32' r='0.8' fill='%2394a3b8'/%3E%3Ccircle cx='32' cy='32' r='0.8' fill='%2394a3b8'/%3E%3Ccircle cx='52' cy='32' r='0.8' fill='%2394a3b8'/%3E%3Ccircle cx='2' cy='42' r='0.8' fill='%2394a3b8'/%3E%3Ccircle cx='22' cy='42' r='0.8' fill='%2394a3b8'/%3E%3Ccircle cx='42' cy='42' r='0.8' fill='%2394a3b8'/%3E%3Ccircle cx='12' cy='52' r='0.8' fill='%2394a3b8'/%3E%3Ccircle cx='32' cy='52' r='0.8' fill='%2394a3b8'/%3E%3Ccircle cx='52' cy='52' r='0.8' fill='%2394a3b8'/%3E%3C/pattern%3E%3C/defs%3E%3Crect fill='url(%23mesh)' width='60' height='60'/%3E%3C/svg%3E")`;

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

      {/* ============================================
          LEFT PANEL — Dark branding
          ============================================ */}
      <div className="hidden lg:flex lg:w-[52%] relative overflow-hidden bg-slate-900">
        {/* Ambient gradients */}
        <div className="absolute -bottom-32 -left-32 w-[450px] h-[450px] rounded-full bg-blue-600/20 blur-[100px]" />
        <div className="absolute top-[10%] right-[-5%] w-[350px] h-[350px] rounded-full bg-cyan-500/10 blur-[80px]" />
        <div className="absolute top-[60%] right-[20%] w-[200px] h-[200px] rounded-full bg-indigo-500/10 blur-[60px]" />

        {/* Subtle grid */}
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.15) 1px, transparent 1px)',
          backgroundSize: '48px 48px'
        }} />

        {/* Content — centered layout */}
        <div className="relative z-10 flex flex-col items-center justify-center w-full h-full px-10">

          {/* Logo showcase — large, centered, with glowing backdrop */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="relative mb-10"
          >
            {/* Outer glow ring */}
            <div className="absolute -inset-8 rounded-[2rem] bg-gradient-to-br from-blue-500/10 via-cyan-500/5 to-teal-500/10 blur-2xl" />
            {/* Glass container */}
            <div className="relative rounded-[1.5rem] bg-white/[0.07] backdrop-blur-sm border border-white/[0.1] p-8 shadow-2xl shadow-blue-900/20">
              <img src="/cp-logo.png" alt="Colourplus" className="h-44 w-auto drop-shadow-xl" />
            </div>
          </motion.div>

          {/* Headline — centered */}
          <motion.div
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="text-center max-w-md"
          >
            <h1 className="text-[2.6rem] font-black text-white leading-[1.1] tracking-tight">
              Screen Printing
              <br />
              <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-teal-400 bg-clip-text text-transparent">
                Management System
              </span>
            </h1>
            <p className="mt-5 text-[15px] text-slate-400 leading-relaxed mx-auto max-w-sm">
              Complete production control — from initial development through quality inspection to final delivery.
            </p>

            {/* Feature chips */}
            <div className="mt-7 flex flex-wrap justify-center gap-2">
              {[
                { label: 'Development', dot: 'bg-blue-400' },
                { label: 'Store-In', dot: 'bg-cyan-400' },
                { label: 'QC Inspection', dot: 'bg-emerald-400' },
                { label: 'Production', dot: 'bg-violet-400' },
                { label: 'Dispatch', dot: 'bg-amber-400' },
                { label: 'Audit', dot: 'bg-rose-400' },
              ].map((f, i) => (
                <motion.span
                  key={f.label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.4 + i * 0.07 }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold bg-white/[0.06] text-slate-300 border border-white/[0.08] backdrop-blur-sm"
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${f.dot}`} />
                  {f.label}
                </motion.span>
              ))}
            </div>
          </motion.div>

          {/* Footer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="absolute bottom-8 left-10 right-10 flex items-center gap-3"
          >
            <div className="h-px flex-1 bg-gradient-to-r from-slate-800 to-transparent" />
            <p className="text-[11px] text-slate-400 whitespace-nowrap">
              Developed By Tranzix Global Impex Pvt (Ltd)
            </p>
          </motion.div>
        </div>
      </div>

      {/* ============================================
          RIGHT PANEL — White with screen printing-inspired design
          ============================================ */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-8 relative overflow-hidden bg-white">

        {/* ---- LAYER 1: Halftone mesh (screen printing texture) ---- */}
        <div className="absolute inset-0 opacity-[0.99]" style={{ backgroundImage: MESH_PATTERN }} />

        {/* ---- LAYER 2: Ink splash gradients ---- */}
        <div className="absolute top-[-8%] right-[-12%] w-[420px] h-[420px] rounded-full opacity-[0.09]"
          style={{ background: 'radial-gradient(circle, #3b82f6 0%, transparent 70%)' }} />
        <div className="absolute bottom-[-5%] left-[-8%] w-[350px] h-[350px] rounded-full opacity-[0.06]"
          style={{ background: 'radial-gradient(circle, #6366f1 0%, transparent 70%)' }} />
        <div className="absolute top-[45%] left-[60%] w-[180px] h-[180px] rounded-full opacity-[0.05]"
          style={{ background: 'radial-gradient(circle, #14b8a6 0%, transparent 70%)' }} />

        {/* ---- LAYER 3: Registration marks (screen printing alignment marks) ---- */}
        {/* Top-right registration mark */}
        <svg className="absolute top-8 right-8 w-10 h-10 text-slate-300/70" viewBox="0 0 40 40" fill="none">
          <circle cx="20" cy="20" r="8" stroke="currentColor" strokeWidth="0.95" />
          <line x1="20" y1="0" x2="20" y2="40" stroke="currentColor" strokeWidth="0.9" />
          <line x1="0" y1="20" x2="40" y2="20" stroke="currentColor" strokeWidth="0.9" />
        </svg>
        {/* Bottom-left registration mark */}
        <svg className="absolute bottom-8 left-8 w-10 h-10 text-slate-300/70" viewBox="0 0 40 40" fill="none">
          <circle cx="20" cy="20" r="8" stroke="currentColor" strokeWidth="0.75" />
          <line x1="20" y1="0" x2="20" y2="40" stroke="currentColor" strokeWidth="0.5" />
          <line x1="0" y1="20" x2="40" y2="20" stroke="currentColor" strokeWidth="0.5" />
        </svg>
        {/* Top-left crop mark */}
        <svg className="absolute top-8 left-8 w-8 h-8 text-slate-300/50" viewBox="0 0 32 32" fill="none">
          <path d="M0 12V0h12" stroke="currentColor" strokeWidth="0.75" />
        </svg>
        {/* Bottom-right crop mark */}
        <svg className="absolute bottom-8 right-8 w-8 h-8 text-slate-300/50" viewBox="0 0 32 32" fill="none">
          <path d="M32 20v12H20" stroke="currentColor" strokeWidth="0.75" />
        </svg>

        {/* ---- LAYER 4: Color swatch strip (screen printing test strip) ---- */}
        <div className="absolute top-0 right-16 flex flex-col gap-0">
          {['#3b82f6', '#6366f1', '#14b8a6', '#f59e0b', '#ef4444', '#8b5cf6'].map((c, i) => (
            <motion.div
              key={c}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 18, opacity: 0.42 }}
              transition={{ delay: 0.6 + i * 0.08, duration: 0.4 }}
              style={{ backgroundColor: c }}
              className="w-3"
            />
          ))}
        </div>

        {/* ---- LAYER 5: Subtle CMYK dots (bottom right) ---- */}
        <div className="absolute bottom-16 right-12 flex gap-3 opacity-[0.42]">
          <div className="w-5 h-5 rounded-full bg-cyan-500" />
          <div className="w-5 h-5 rounded-full bg-pink-500" />
          <div className="w-5 h-5 rounded-full bg-yellow-400" />
          <div className="w-5 h-5 rounded-full bg-slate-900" />
        </div>

        {/* ---- LAYER 6: Technical text (print-shop feel) ---- */}
        <p className="absolute top-10 left-10 text-[9px] font-mono tracking-[0.2em] text-slate-300/60 uppercase">
          Colourplus ERP / v1.0
        </p>
        <p className="absolute bottom-10 right-16 text-[9px] font-mono tracking-[0.2em] text-slate-300/50 uppercase">
          Secure Login Portal
        </p>

        {/* ============ FORM ============ */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-[360px] relative z-10"
        >
          {/* Mobile logo */}
          <div className="lg:hidden mb-8 flex justify-center">
            <img src="/logo.svg" alt="Colourplus" className="h-14 w-auto" />
          </div>

          {/* Title */}
          <div className="mb-8">
            <h2 className="text-[1.6rem] font-bold text-slate-900 tracking-tight">Welcome back</h2>
            <p className="mt-1 text-sm text-slate-500">Sign in to your account to continue.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {/* Username */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => { setUsername(e.target.value); setError(''); }}
                placeholder="Enter your username"
                autoFocus
                autoComplete="username"
                className={`w-full rounded-xl border-2 px-4 py-3 text-sm font-medium outline-none transition-all duration-200 ${
                  error
                    ? 'border-red-200 bg-red-50/30 text-red-900 placeholder-red-300 focus:border-red-400 focus:ring-4 focus:ring-red-500/10'
                    : 'border-slate-200 bg-slate-50/60 text-slate-900 placeholder-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 focus:bg-white'
                }`}
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  className={`w-full rounded-xl border-2 px-4 py-3 pr-11 text-sm font-medium outline-none transition-all duration-200 ${
                    error
                      ? 'border-red-200 bg-red-50/30 text-red-900 placeholder-red-300 focus:border-red-400 focus:ring-4 focus:ring-red-500/10'
                      : 'border-slate-200 bg-slate-50/60 text-slate-900 placeholder-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 focus:bg-white'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error */}
            <AnimatedError message={error} />

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3.5 text-sm font-bold text-white hover:bg-slate-800 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-slate-900/10"
            >
              {isLoading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Signing in...</>
              ) : (
                <><LogIn className="w-4 h-4" /> Sign in</>
              )}
            </button>
          </form>

          {/* Bottom divider + text */}
          <div className="mt-10 flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-200" />
            <p className="text-[10px] text-slate-400 whitespace-nowrap font-medium">Contact admin for access</p>
            <div className="h-px flex-1 bg-slate-200" />
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function AnimatedError({ message }: { message: string }) {
  if (!message) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: -6, height: 0 }}
      animate={{ opacity: 1, y: 0, height: 'auto' }}
      className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-600 font-medium"
    >
      {message}
    </motion.div>
  );
}