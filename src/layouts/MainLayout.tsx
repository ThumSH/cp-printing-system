// src/layouts/MainLayout.tsx
import { Outlet, Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Users, 
  Package, 
  Settings, 
  LogOut,
  CheckSquare,
  Truck,
  FileText,
  Code,
  Send,
  Search,
  ClipboardCheck,
  PackageOpen,
  ClipboardList,
  Factory
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { Role } from '../types';

// Define the structure for our navigation items
interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  roles: Role[]; // Which roles are allowed to see this menu item
}

export default function MainLayout() {
  const location = useLocation();
  const { user, logout } = useAuthStore();

  // Master list of all possible routes and the roles that can access them
 const ALL_NAV_ITEMS: NavItem[] = [
  {
    name: 'Dashboard',
    href: '/',
    icon: LayoutDashboard,
    roles: ['Admin', 'Developer', 'QC', 'Gatepass', 'Audit', 'Stores']
  },
  {
    name: 'Development',
    href: '/development',
    icon: Code,
    roles: ['Admin', 'Developer']
  },
  {
    name: 'Submit to QC',
    href: '/development/submit',
    icon: Send,
    roles: ['Admin', 'Developer']
  },
  {
    name: 'Search Submissions',
    href: '/development/search',
    icon: Search,
    roles: ['Admin', 'Developer']
  },
  {
    name: 'Approve Submissions',
    href: '/admin/approve',
    icon: ClipboardCheck,
    roles: ['Admin']
  },
  {
    name: 'Approval Search',
    href: '/admin/search',
    icon: Search,
    roles: ['Admin']
  },
  {
    name: 'Inventory (Stores)',
    href: '/inventory',
    icon: Package,
    roles: ['Admin', 'Stores']
  },
  {
    name: 'Store In (Receiving)',
    href: '/inventory/in',
    icon: PackageOpen,
    roles: ['Admin', 'Stores']
  },
  {
    name: 'Issue to Production',
    href: '/inventory/production',
    icon: Factory,
    roles: ['Admin', 'Stores']
  },
  {
    name: 'Quality Control',
    href: '/qc',
    icon: CheckSquare,
    roles: ['Admin', 'QC']
  },
  {
    name: 'QC Inspection (C.P.I)',
    href: '/qc/cpi',
    icon: ClipboardList,
    roles: ['Admin', 'QC']
  },
  {
    name: 'Delivery Tracker',
    href: '/qc/delivery-tracker',
    icon: LayoutDashboard,
    roles: ['Admin', 'QC']
  },
  {
    name: 'Advice Note (Gatepass)',
    href: '/gatepass',
    icon: Truck,
    roles: ['Admin', 'Gatepass']
  },
  {
    name: 'Advice Note (Dispatch)',
    href: '/gatepass/advicenote',
    icon: FileText,
    roles: ['Admin', 'Gatepass']
  },
  {
    name: 'Audit Reports',
    href: '/audit',
    icon: FileText,
    roles: ['Admin', 'Audit']
  },
  {
    name: 'Settings',
    href: '/settings',
    icon: Settings,
    roles: ['Admin']
  },
  {
  name: 'User Management',
  href: '/admin/users',
  icon: Users,
  roles: ['Admin']
}
];

  // Filter the navigation items so the user only sees what their role allows
  const authorizedNavigation = ALL_NAV_ITEMS.filter(
    (item) => user?.role && item.roles.includes(user.role)
  );

  return (
    <div className="flex h-screen w-full bg-slate-50 text-slate-900 overflow-hidden">
      
      {/* --- SIDEBAR --- */}
      <aside className="w-64 bg-white border-r border-slate-200 shadow-sm flex flex-col shrink-0">
        <div className="h-20 flex items-center px-6 border-b border-slate-200">
            <img 
              src="/logo.svg" /* <-- Replace with your actual logo path like "/StoreLogo.png" */
              alt="Colourplus Logo" 
              className="w-30 h-20 object-cover drop-shadow-md"
            />
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {authorizedNavigation.map((item) => {
            const isActive = location.pathname === item.href || 
                            (location.pathname.startsWith(item.href) && item.href !== '/');
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center px-3 py-2.5 rounded-lg transition-colors duration-200 ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon className={`w-5 h-5 mr-3 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* --- MAIN CONTENT AREA --- */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        
        {/* TOP HEADER */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shadow-sm shrink-0">
          <div className="text-sm font-medium text-slate-500">
            {location.pathname === '/' 
              ? 'Dashboard' 
              : location.pathname.substring(1).charAt(0).toUpperCase() + location.pathname.substring(2)}
          </div>
          
          <div className="flex items-center space-x-5">
            <div className="text-right">
              <p className="text-sm font-semibold text-slate-900 leading-tight">{user?.name}</p>
              <p className="text-xs text-blue-600 font-medium">{user?.role}</p>
            </div>
            
            <div className="h-8 w-px bg-slate-200"></div> {/* Visual Divider */}

            <button
              onClick={() => logout()}
              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center"
              title="Log out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* DYNAMIC PAGE CONTENT (Outlet) */}
        <div className="flex-1 overflow-y-auto p-8 bg-slate-50/50">
          <Outlet /> 
        </div>

      </main>
    </div>
  );
}