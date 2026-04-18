// src/hooks/useAutoDraft.ts
// Auto-saves form state to localStorage on every change.
// Restores on page load if a draft exists. Clears on successful save.
// Usage:
//   const { draftRestored, clearDraft, dismissDraftNotice } = useAutoDraft('cpi-form', { cuts, date, ... }, restoreFn);

import { useEffect, useRef, useState, useCallback } from 'react';

const DRAFT_PREFIX = 'cpDraft_';
const DEBOUNCE_MS = 1000; // save at most once per second

export interface AutoDraftResult {
  /** True if a draft was restored on mount — show a toast */
  draftRestored: boolean;
  /** Call after successful save to wipe the draft */
  clearDraft: () => void;
  /** Dismiss the "draft restored" toast */
  dismissDraftNotice: () => void;
}

export function useAutoDraft<T>(
  key: string,
  formState: T,
  restoreState: (saved: T) => void
): AutoDraftResult {
  const storageKey = DRAFT_PREFIX + key;
  const [draftRestored, setDraftRestored] = useState(false);
  const restoredRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- RESTORE on mount (once) ---
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;

    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const saved = JSON.parse(raw) as T;
        restoreState(saved);
        setDraftRestored(true);
      }
    } catch {
      // Corrupt draft — discard silently
      localStorage.removeItem(storageKey);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally run once on mount

  // --- SAVE on every change (debounced) ---
  useEffect(() => {
    // Skip saving on the very first render (before user has typed anything)
    if (!restoredRef.current) return;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(formState));
      } catch {
        // localStorage full or unavailable — fail silently
      }
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [formState, storageKey]);

  const clearDraft = useCallback(() => {
    localStorage.removeItem(storageKey);
    setDraftRestored(false);
  }, [storageKey]);

  const dismissDraftNotice = useCallback(() => {
    setDraftRestored(false);
  }, []);

  return { draftRestored, clearDraft, dismissDraftNotice };
}