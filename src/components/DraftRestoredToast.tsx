// src/components/DraftRestoredToast.tsx
// Small amber toast that shows when a saved draft is restored after a page reload / power cut.

import { X, RotateCcw } from 'lucide-react';

interface Props {
  visible: boolean;
  onDismiss: () => void;
  onDiscard: () => void;
}

export default function DraftRestoredToast({ visible, onDismiss, onDiscard }: Props) {
  if (!visible) return null;
  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 flex items-center gap-3 shadow-sm animate-in fade-in">
      <RotateCcw className="h-4 w-4 text-amber-600 shrink-0" />
      <p className="text-sm text-amber-800 flex-1">
        <span className="font-semibold">Draft restored</span> — your unsaved work was recovered.
      </p>
      <button
        onClick={onDiscard}
        className="text-xs font-medium text-amber-700 hover:text-amber-900 underline"
      >
        Discard
      </button>
      <button onClick={onDismiss} className="text-amber-400 hover:text-amber-600">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}