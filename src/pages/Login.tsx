import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, ShieldCheck, Sparkles, User as UserIcon } from 'lucide-react';
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
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const success = await login(username, password);

    if (success) {
      navigate('/');
    } else {
      setError('Login failed. Check your credentials or backend connection.');
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex bg-slate-50">
      <div className="hidden lg:flex lg:w-1/2 bg-linear-to-br from-white via-sky-50 to-blue-200 items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_center,var(--tw-gradient-stops))] from-blue-300/40 via-transparent to-transparent"></div>

        <div className="z-10 text-center flex flex-col items-center">
          <div className="mb-8 p-6 bg-white/40 backdrop-blur-md rounded-3xl border border-white/60 shadow-xl">
            <img
              src="/logo.svg"
              alt="Colourplus Logo"
              className="w-48 h-48 object-contain drop-shadow-md"
            />
          </div>

          <p className="text-xl text-blue-900 font-bold tracking-wide drop-shadow-sm max-w-md leading-relaxed">
            Enterprise Screen Printing Management System
          </p>

          <div className="mt-8 grid grid-cols-2 gap-3 text-left w-full max-w-md">
            {[
              'Production-ready workflows',
              'Real-time inventory visibility',
              'Quality-control tracking',
              'Audit-friendly records',
            ].map((feature) => (
              <div
                key={feature}
                className="flex items-start gap-2 rounded-xl bg-white/60 px-3 py-2 border border-white/70 shadow-sm"
              >
                <Sparkles className="h-4 w-4 text-blue-600 mt-0.5" />
                <span className="text-xs text-blue-950 font-medium leading-5">{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8 bg-linear-to-b from-slate-50 to-sky-50/40">
        <div className="w-full max-w-md space-y-8 bg-white/95 backdrop-blur-sm p-10 rounded-2xl shadow-xl border border-slate-100">
          <div className="text-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 text-blue-700 px-3 py-1 text-xs font-semibold border border-blue-100">
              <ShieldCheck className="h-3.5 w-3.5" /> Secure access
            </span>
            <h2 className="text-3xl font-extrabold text-slate-900">Sign in</h2>
            <p className="mt-2 text-sm text-slate-500">Access your workspace</p>
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleLogin}>
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm text-center border border-red-100">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <UserIcon className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    required
                    disabled={isLoading}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors disabled:bg-slate-100 disabled:cursor-not-allowed"
                    placeholder="Enter your username"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    disabled={isLoading}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-10 pr-11 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors disabled:bg-slate-100 disabled:cursor-not-allowed"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="absolute inset-y-0 right-0 px-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-md text-sm font-medium text-white bg-linear-to-r from-blue-600 to-sky-500 hover:from-blue-700 hover:to-sky-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Signing in...' : 'Sign in securely'}
            </button>
          </form>

          <div className="mt-6 text-xs text-center text-slate-400">
            Use your assigned system credentials to sign in.
          </div>
        </div>
      </div>
    </div>
  );
}