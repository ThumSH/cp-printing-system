import { motion, AnimatePresence } from "framer-motion";

interface LoginProps {
  activeRole: string;
  setActiveRole: (role: string) => void;
  onLogin: (e: React.FormEvent) => void;
  roles: string[];
}

export default function Login({ activeRole, setActiveRole, onLogin, roles }: LoginProps) {
  return (
    <div className="flex h-screen w-full bg-white overflow-hidden font-sans">
      <div className="relative hidden md:flex w-1/2 bg-cplus-dark flex-col justify-between p-12 overflow-hidden border-r border-gray-800">
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-cplus-primary rounded-full mix-blend-screen filter blur-[100px] opacity-30"></div>
        <div className="absolute top-[30%] right-[-10%] w-80 h-80 bg-cplus-secondary rounded-full mix-blend-screen filter blur-[100px] opacity-20"></div>
        <div className="absolute bottom-[-10%] left-[20%] w-[500px] h-[500px] bg-cplus-accent rounded-full mix-blend-screen filter blur-[120px] opacity-10"></div>
        <div className="relative z-10 mt-10">
          <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8 }}>
            <h1 className="text-5xl font-extrabold text-white tracking-tight mb-4 drop-shadow-lg">
              Colour<span className="text-cplus-primary">plus</span>
            </h1>
            <p className="text-lg text-gray-400 max-w-md font-light leading-relaxed">
              Precision screen printing management. Streamline your workflow from development to gatepass.
            </p>
          </motion.div>
        </div>
        <div className="relative z-10 text-gray-600 text-sm font-medium">
          © 2026 Colourplus System. All rights reserved.
        </div>
      </div>

      <div className="flex w-full md:w-1/2 items-center justify-center p-8 lg:p-16 bg-cplus-light">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }} className="w-full max-w-sm">
          <div className="mb-10">
            <h2 className="text-3xl font-bold text-cplus-dark mb-2">Welcome Back</h2>
            <p className="text-gray-500 font-medium">Please enter your credentials to sign in.</p>
          </div>

          <form onSubmit={onLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Access Role</label>
              <div className="relative">
                <select
                  value={activeRole}
                  onChange={(e) => setActiveRole(e.target.value)}
                  className="w-full appearance-none bg-white border border-gray-300 text-cplus-dark font-medium py-3 px-4 pr-8 rounded-xl focus:outline-none focus:ring-2 focus:ring-cplus-primary focus:border-transparent cursor-pointer transition-all shadow-sm"
                >
                  {roles.map((role) => <option key={role} value={role}>{role}</option>)}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                  <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Employee ID</label>
              <input type="text" required className="w-full bg-white border border-gray-300 text-cplus-dark py-3 px-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-cplus-primary focus:border-transparent transition-all shadow-sm" placeholder="e.g. EMP-001" />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Password</label>
              <input type="password" required className="w-full bg-white border border-gray-300 text-cplus-dark py-3 px-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-cplus-primary focus:border-transparent transition-all shadow-sm" placeholder="••••••••" />
            </div>

            <div className="pt-4">
              <AnimatePresence mode="wait">
                <motion.button key="submit-btn" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit" className="w-full bg-cplus-primary text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-cplus-primary/30 hover:bg-sky-600 transition-colors">
                  Authenticate as {activeRole}
                </motion.button>
              </AnimatePresence>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
}