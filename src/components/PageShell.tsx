// src/components/PageShell.tsx
// Reusable page wrapper components for consistent look across all pages
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

interface PageHeaderProps {
  icon: React.ElementType;
  title: string;
  subtitle?: string;
  iconColor?: string;
  actions?: React.ReactNode;
}

export function PageHeader({ icon: Icon, title, subtitle, iconColor = 'bg-blue-100 text-blue-600', actions }: PageHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="flex items-center justify-between pb-5 mb-6 border-b border-slate-200"
    >
      <div className="flex items-center gap-3">
        <div className={`rounded-xl p-2.5 ${iconColor}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">{title}</h2>
          {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </motion.div>
  );
}

interface CardProps {
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
}

export function Card({ children, className = '', noPadding = false }: CardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={`rounded-xl border border-slate-200 bg-white shadow-sm ${noPadding ? '' : 'p-6'} ${className}`}
    >
      {children}
    </motion.div>
  );
}

interface FormSectionProps {
  title: string;
  color?: 'blue' | 'emerald' | 'orange' | 'purple' | 'teal' | 'amber';
  children: React.ReactNode;
}

const SECTION_COLORS = {
  blue: 'border-blue-200 bg-blue-50/40',
  emerald: 'border-emerald-200 bg-emerald-50/40',
  orange: 'border-orange-200 bg-orange-50/40',
  purple: 'border-purple-200 bg-purple-50/40',
  teal: 'border-teal-200 bg-teal-50/40',
  amber: 'border-amber-200 bg-amber-50/40',
};

const SECTION_TITLE_COLORS = {
  blue: 'text-blue-800 border-blue-200',
  emerald: 'text-emerald-800 border-emerald-200',
  orange: 'text-orange-800 border-orange-200',
  purple: 'text-purple-800 border-purple-200',
  teal: 'text-teal-800 border-teal-200',
  amber: 'text-amber-800 border-amber-200',
};

export function FormSection({ title, color = 'blue', children }: FormSectionProps) {
  return (
    <div className={`rounded-xl border p-5 space-y-4 ${SECTION_COLORS[color]}`}>
      <h4 className={`border-b pb-2 text-xs font-bold uppercase tracking-widest ${SECTION_TITLE_COLORS[color]}`}>
        {title}
      </h4>
      {children}
    </div>
  );
}

export function PageLoader() {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-3">
      <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      <p className="text-sm text-slate-400">Loading...</p>
    </div>
  );
}

interface ErrorBannerProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorBanner({ message, onRetry }: ErrorBannerProps) {
  if (!message) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-red-200 bg-red-50 px-5 py-3 flex items-center justify-between"
    >
      <p className="text-sm text-red-700 font-medium">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="text-xs font-semibold text-red-600 underline hover:text-red-800">Retry</button>
      )}
    </motion.div>
  );
}

interface EmptyStateProps {
  icon: React.ElementType;
  message: string;
  sub?: string;
}

export function EmptyState({ icon: Icon, message, sub }: EmptyStateProps) {
  return (
    <div className="py-16 text-center">
      <Icon className="mx-auto mb-3 h-12 w-12 text-slate-200" />
      <p className="text-slate-400 font-medium">{message}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}

interface SubmitButtonProps {
  isLoading: boolean;
  label: string;
  loadingLabel?: string;
  icon?: React.ElementType;
  onClick?: () => void;
  type?: 'submit' | 'button';
  variant?: 'primary' | 'secondary' | 'danger';
}

export function SubmitButton({ isLoading, label, loadingLabel, icon: Icon, onClick, type = 'submit', variant = 'primary' }: SubmitButtonProps) {
  const styles = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm shadow-blue-600/20',
    secondary: 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50',
    danger: 'bg-red-600 text-white hover:bg-red-700 shadow-sm shadow-red-600/20',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isLoading}
      className={`inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${styles[variant]}`}
    >
      {isLoading ? (
        <><Loader2 className="h-4 w-4 animate-spin" /> {loadingLabel || 'Saving...'}</>
      ) : (
        <>{Icon && <Icon className="h-4 w-4" />} {label}</>
      )}
    </button>
  );
}