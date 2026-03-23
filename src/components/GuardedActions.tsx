// src/components/GuardedActions.tsx
import { Edit2, Trash2, Lock, Printer } from 'lucide-react';

interface GuardedActionsProps {
  onEdit?: () => void;
  onDelete?: () => void;
  onPrint?: () => void;
  isLocked?: boolean;
  lockReason?: string;
}

export default function GuardedActions({ onEdit, onDelete, onPrint, isLocked = false, lockReason = 'Downstream records exist — cannot modify.' }: GuardedActionsProps) {
  if (isLocked) {
    return (
      <div className="flex items-center gap-1.5" title={lockReason}>
        {onPrint && (
          <button onClick={(e) => { e.stopPropagation(); onPrint(); }} className="rounded-md p-1.5 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"><Printer className="h-4 w-4" /></button>
        )}
        <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-slate-100">
          <Lock className="h-3.5 w-3.5 text-slate-400" />
          <span className="text-[10px] font-medium text-slate-400">Locked</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-0.5">
      {onPrint && (
        <button onClick={(e) => { e.stopPropagation(); onPrint(); }} className="rounded-md p-1.5 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 transition-colors" title="Print"><Printer className="h-4 w-4" /></button>
      )}
      {onEdit && (
        <button onClick={(e) => { e.stopPropagation(); onEdit(); }} className="rounded-md p-1.5 text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-colors" title="Edit"><Edit2 className="h-4 w-4" /></button>
      )}
      {onDelete && (
        <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors" title="Delete"><Trash2 className="h-4 w-4" /></button>
      )}
    </div>
  );
}