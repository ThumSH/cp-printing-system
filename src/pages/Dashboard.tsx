// src/pages/Dashboard.tsx
import { motion,Variants } from 'framer-motion';
import { 
  Code, 
  Send, 
  Clock, 
  FileText,
  ArrowRight
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useDevelopmentStore } from '../store/developmentStore';
import { Link } from 'react-router-dom';

// --- ANIMATION VARIANTS ---
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const itemVariants: Variants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 300, damping: 24 } }
};

export default function Dashboard() {
  const { user } = useAuthStore();
  
  // Pull real-time data from our global development store
  const { jobs, submissions } = useDevelopmentStore();

  // --- DYNAMIC CALCULATIONS FOR DEVELOPER ---
  const totalJobs = jobs.length;
  const totalSubmissions = submissions.length;
  const recentSubmissions = submissions.slice(0, 4); // Get only the 4 most recent
  
  // Calculate how many submissions are Level 1 vs others (just as an example metric)
  const level1Count = submissions.filter(s => s.level.includes('Level 1')).length;
  const revisionCount = totalSubmissions - level1Count;

  // --- RENDER DEVELOPER DASHBOARD ---
  const renderDeveloperDashboard = () => (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-8">
      
      {/* Top Level Stats Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Total Workspace Jobs</p>
              <p className="text-3xl font-bold text-slate-900 mt-2">{totalJobs}</p>
            </div>
            <div className="p-3 rounded-lg bg-indigo-100"><Code className="w-6 h-6 text-indigo-600" /></div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Total Submissions</p>
              <p className="text-3xl font-bold text-slate-900 mt-2">{totalSubmissions}</p>
            </div>
            <div className="p-3 rounded-lg bg-blue-100"><Send className="w-6 h-6 text-blue-600" /></div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Initial Samples (L1)</p>
              <p className="text-3xl font-bold text-slate-900 mt-2">{level1Count}</p>
            </div>
            <div className="p-3 rounded-lg bg-emerald-100"><FileText className="w-6 h-6 text-emerald-600" /></div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Active Revisions</p>
              <p className="text-3xl font-bold text-slate-900 mt-2">{revisionCount}</p>
            </div>
            <div className="p-3 rounded-lg bg-amber-100"><Clock className="w-6 h-6 text-amber-600" /></div>
          </div>
        </div>
      </motion.div>

      {/* Main Content Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Recent Submissions Table */}
        <motion.div variants={itemVariants} className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-200 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-slate-900">Recent Submissions to Queue</h3>
            <Link to="/development/search" className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center">
              Search all <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-6 py-4 font-medium">Style No</th>
                  <th className="px-6 py-4 font-medium">Customer</th>
                  <th className="px-6 py-4 font-medium">Level</th>
                  <th className="px-6 py-4 font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentSubmissions.length > 0 ? (
                  recentSubmissions.map((sub) => (
                    <tr key={sub.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-900">{sub.styleNo}</td>
                      <td className="px-6 py-4 text-slate-700">{sub.customerName}</td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-100 rounded text-xs font-semibold">
                          {sub.level.split(' ')[0]} {/* Extracts just "Level 1" etc */}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-500">{sub.submissionDate}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                      No submissions found. Start by adding one in the Submission page.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Quick Links / Actions */}
        <motion.div variants={itemVariants} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <Link to="/development" className="flex items-center p-3 rounded-lg border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 transition-colors group">
              <div className="bg-white p-2 rounded shadow-sm border border-slate-100 group-hover:border-indigo-200 mr-3">
                <Code className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">New Workspace Job</p>
                <p className="text-xs text-slate-500">Create a new print formula</p>
              </div>
            </Link>

            <Link to="/development/submit" className="flex items-center p-3 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-colors group">
              <div className="bg-white p-2 rounded shadow-sm border border-slate-100 group-hover:border-blue-200 mr-3">
                <Send className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Submit Approval</p>
                <p className="text-xs text-slate-500">Route job to QC/Management</p>
              </div>
            </Link>
          </div>
        </motion.div>

      </div>
    </motion.div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Generic Welcome Header for all users */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">
            Welcome back, {user?.name?.split(' ')[0] || 'User'} 👋
          </h2>
          <p className="text-slate-500 mt-1">Here is your {user?.role} overview for today.</p>
        </div>
      </motion.div>

      {/* Conditionally render dashboards based on role */}
      {user?.role === 'Developer' || user?.role === 'Admin' ? (
        renderDeveloperDashboard()
      ) : (
        <div className="bg-white p-12 rounded-xl border border-slate-200 text-center">
          <p className="text-slate-500">Your specific role dashboard is currently under construction.</p>
        </div>
      )}
    </div>
  );
}