// src/components/GuardedActions.tsx
// Reusable action buttons with lock awareness for records that have downstream data
import { Edit2, Trash2, Lock } from 'lucide-react';

interface GuardedActionsProps {
  onEdit?: () => void;
  onDelete?: () => void;
  isLocked?: boolean;
  lockReason?: string;
  showEdit?: boolean;
  showDelete?: boolean;
}

export default function GuardedActions({
  onEdit,
  onDelete,
  isLocked = false,
  lockReason = 'This record has downstream data and cannot be modified.',
  showEdit = true,
  showDelete = true,
}: GuardedActionsProps) {
  if (isLocked) {
    return (
      <div className="flex items-center gap-1" title={lockReason}>
        <Lock className="h-4 w-4 text-slate-300" />
        <span className="text-[10px] text-slate-400 hidden sm:inline">Locked</span>
      </div>
    );
  }

  return (
    <div className="flex gap-1">
      {showEdit && onEdit && (
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
          className="rounded p-1.5 text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"
          title="Edit"
        >
          <Edit2 className="h-4 w-4" />
        </button>
      )}
      {showDelete && onDelete && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
          title="Delete"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}