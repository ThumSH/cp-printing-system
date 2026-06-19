// src/layouts/MainLayout.tsx
import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Users, LogOut, Activity, Truck, FileText,
  Code, Send, Search, ClipboardCheck, PackageOpen, ClipboardList,
  Factory, Clock, Menu, X, History, Palette, FlaskConical,Info,Receipt,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { Role } from '../types';

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  roles: Role[];
  // When true, only exact path match is active (prevents parent matching children)
  exact?: boolean;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { name: 'Dashboard', href: '/', icon: LayoutDashboard, roles: ['Admin', 'Developer', 'QC', 'Gatepass', 'Audit', 'Stores', 'Worker'], exact: true },
    ],
  },
  {
    label: 'Development',
    items: [
      { name: 'Jobs', href: '/development', icon: Code, roles: ['Admin', 'Developer'], exact: true },
      // exact: true so /development/samples doesn't stay active when on /development/samples/search
      { name: 'Sample Styles', href: '/development/samples', icon: FlaskConical, roles: ['Admin', 'Developer'], exact: true },
      { name: 'Sample Search', href: '/development/samples/search', icon: Search, roles: ['Admin', 'Developer'] },
      { name: 'Submit to Admin', href: '/development/submit', icon: Send, roles: ['Admin', 'Developer'] },
      { name: 'Search', href: '/development/search', icon: Search, roles: ['Admin', 'Developer'] },
    ],
  },
  {
    label: 'Admin',
    items: [
      { name: 'Approve', href: '/admin/approve', icon: ClipboardCheck, roles: ['Admin'] },
      { name: 'Approval Search', href: '/admin/search', icon: Search, roles: ['Admin'] },
      { name: 'Users', href: '/admin/users', icon: Users, roles: ['Admin'] },
      { name: 'Activity Log', href: '/admin/activity-log', icon: Activity, roles: ['Admin'] },
      { name: 'Colour Master', href: '/admin/colours', icon: Palette, roles: ['Admin', 'Developer'] },
    ],
  },
  {
    label: 'Stores',
    items: [
      { name: 'Store In', href: '/inventory/in', icon: PackageOpen, roles: ['Admin', 'Stores'] },
      { name: 'Store In Search', href: '/inventory/search', icon: Search, roles: ['Admin', 'Stores'] },
      { name: 'Production', href: '/inventory/production', icon: Factory, roles: ['Admin', 'Stores'], exact: true },
      { name: 'Production Search', href: '/inventory/production/search', icon: Search, roles: ['Admin', 'Stores'] },
    ],
  },
  {
    label: 'Quality',
    items: [
      { name: 'CPI Inspection', href: '/qc/cpi', icon: ClipboardList, roles: ['Admin', 'QC'], exact: true },
      { name: 'CPI Search', href: '/qc/cpi/search', icon: Search, roles: ['Admin', 'QC'] },
      { name: 'Delivery Tracker', href: '/qc/delivery-tracker', icon: LayoutDashboard, roles: ['Admin', 'QC'], exact: true },
      { name: 'Tracker Search', href: '/qc/delivery-tracker/search', icon: Search, roles: ['Admin', 'QC'] },
    ],
  },
  {
    label: 'Dispatch',
    items: [
      { name: 'Advice Note', href: '/gatepass/advicenote', icon: Truck, roles: ['Admin', 'Gatepass'] },
      { name: 'Advice Note Search', href: '/gatepass/search', icon: Search, roles: ['Admin', 'Gatepass'] },
    ],
  },
  {
    label: 'Audit',
    items: [
      { name: 'Audit Reports', href: '/audit', icon: FileText, roles: ['Admin', 'Audit'], exact: true },
      { name: 'Audit Search', href: '/audit/search', icon: Search, roles: ['Admin', 'Audit'] },
    ],
  },
  {
    label: 'Worker',
    items: [
      { name: 'Daily Output', href: '/worker', icon: Factory, roles: ['Admin', 'Worker'], exact: true },
      { name: 'Downtime', href: '/worker/downtime', icon: Clock, roles: ['Admin', 'Worker'] },
      { name: 'History', href: '/worker/history', icon: History, roles: ['Admin', 'Worker'] },
    ],
  },

  {
    label: 'System Developer',
    items: [
      { name: 'About Us', href: '/about', icon: Info, roles: ['Admin', 'Developer', 'QC', 'Gatepass', 'Audit', 'Stores', 'Worker'] },
    ],
  },
  //report-search
   {
    label: 'Report',
    items: [
      { name: 'Report', href: '/report', icon: Receipt, roles: ['Admin'] },
      { name: 'Report Search', href: '/report-search', icon: Receipt, roles: ['Admin'] },
    ],
  },
];

const ROLE_COLORS: Record<string, string> = {
  Admin: 'bg-red-100 text-red-700',
  Developer: 'bg-blue-100 text-blue-700',
  QC: 'bg-emerald-100 text-emerald-700',
  Gatepass: 'bg-amber-100 text-amber-700',
  Audit: 'bg-purple-100 text-purple-700',
  Stores: 'bg-teal-100 text-teal-700',
  Worker: 'bg-orange-100 text-orange-700',
};

function isNavActive(itemHref: string, pathname: string, exact?: boolean): boolean {
  if (exact) return pathname === itemHref;
  return pathname === itemHref || pathname.startsWith(itemHref + '/');
}

export default function MainLayout() {
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const visibleGroups = NAV_GROUPS
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => user?.role && item.roles.includes(user.role as Role)),
    }))
    .filter((group) => group.items.length > 0);

  const currentPageName = visibleGroups
    .flatMap((g) => g.items)
    .find((item) => isNavActive(item.href, location.pathname, item.exact))
    ?.name || 'Dashboard';

  const initials = user?.name
    ? user.name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
    : '??';

  return (
    <div className="flex h-screen w-full bg-slate-50 text-slate-900 overflow-hidden">

      {/* SIDEBAR */}
      <motion.aside
        initial={false}
        animate={{ width: sidebarOpen ? 256 : 0, opacity: sidebarOpen ? 1 : 0 }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
        className="bg-white border-r border-slate-200 flex flex-col shrink-0 overflow-hidden"
      >
        <div className="h-16 flex items-center px-5 border-b border-slate-100 shrink-0">
          <img src="/logo.svg" alt="Colourplus" className="h-10 w-auto object-contain" />
        </div>

        <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-5 scrollbar-thin">
          {visibleGroups.map((group) => (
            <div key={group.label}>
              <p className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const active = isNavActive(item.href, location.pathname, item.exact);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      to={item.href}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 ${
                        active
                          ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-white' : 'text-slate-400'}`} />
                      <span className="truncate">{item.name}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-slate-100 p-3 shrink-0">
          <div className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2.5">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold ${ROLE_COLORS[user?.role || ''] || 'bg-slate-200 text-slate-600'}`}>
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900 truncate">{user?.name}</p>
              <p className="text-[11px] text-slate-500">{user?.role}</p>
            </div>
            <button
              onClick={() => logout()}
              className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
              title="Log out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.aside>

      {/* MAIN */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div className="h-5 w-px bg-slate-200" />
            <h1 className="text-sm font-semibold text-slate-800">{currentPageName}</h1>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span>{new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</span>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          <div className="p-6 max-w-350 mx-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}