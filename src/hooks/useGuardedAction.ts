// src/hooks/useGuardedAction.ts
// Wraps any async action with a loading guard to prevent double-submission.
// Usage:
//   const [isDeleting, guardedDelete] = useGuardedAction(async (id: string) => { ... });
//   <button onClick={() => guardedDelete(id)} disabled={isDeleting}>Delete</button>

import { useState, useCallback } from 'react';

export function useGuardedAction<TArgs extends any[]>(
  action: (...args: TArgs) => Promise<void>
): [boolean, (...args: TArgs) => Promise<void>] {
  const [busy, setBusy] = useState(false);

  const guarded = useCallback(async (...args: TArgs) => {
    if (busy) return; // already in progress — ignore
    setBusy(true);
    try {
      await action(...args);
    } finally {
      setBusy(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busy, action]);

  return [busy, guarded];
}