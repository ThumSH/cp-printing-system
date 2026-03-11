// src/pages/Login.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User as UserIcon } from 'lucide-react';
import { MOCK_CREDENTIALS } from '../data/mockAuth';
import { useAuthStore } from '../store/authStore';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Simulate database lookup
    const foundAccount = MOCK_CREDENTIALS.find(
      (acc) => acc.username === username.toLowerCase() && acc.password === password
    );

    if (foundAccount) {
      login(foundAccount.user);
      navigate('/'); // Redirect to the dashboard/main layout
    } else {
      setError('Invalid username or password. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Left Side - Branding (White-Blue Shades Blend) */}
      <div className="hidden lg:flex lg:w-1/2 bg-linear-to-br from-white via-sky-50 to-blue-200 items-center justify-center p-12 relative overflow-hidden">
        
        {/* Adjusted the glow to a soft blue so it shows up on the white background */}
        <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_center,var(--tw-gradient-stops))] from-blue-300/40 via-transparent to-transparent"></div>
        
        <div className="z-10 text-center flex flex-col items-center">
          
          {/* Image Option inside a beautiful frosted glass frame */}
          <div className="mb-8 p-6 bg-white/40 backdrop-blur-md rounded-3xl border border-white/60 shadow-xl">
            <img 
              src="/logo.svg" /* <-- Replace with your actual logo path like "/StoreLogo.png" */
              alt="Colourplus Logo" 
              className="w-48 h-48 object-contain drop-shadow-md"
            />
          </div>

          <p className="text-xl text-blue-900 font-bold tracking-wide drop-shadow-sm">
            Enterprise Screen Printing Management System
          </p>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8 bg-white p-10 rounded-2xl shadow-xl border border-slate-100">
          <div className="text-center">
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
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
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
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            </div>

            {/* Button updated to a pure blue gradient to match the new left side */}
            <button
              type="submit"
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-md text-sm font-medium text-white bg-linear-to-r from-blue-600 to-sky-500 hover:from-blue-700 hover:to-sky-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all"
            >
              Sign in securely
            </button>
          </form>
          
          <div className="mt-6 text-xs text-center text-slate-400">
            For development: Try username 'admin' or 'worker' with password '123'.
          </div>
        </div>
      </div>
    </div>
  );
}