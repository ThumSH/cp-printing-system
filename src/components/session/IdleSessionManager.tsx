// src/components/session/IdleSessionManager.tsx
// Tracks active/idle time, shows a 1-minute warning after 5 idle minutes,
// sends heartbeats, and performs backend-recorded system idle logout.

import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, Clock, LogOut, ShieldCheck } from 'lucide-react';
import { API } from '../../api/client';
import { useAuthStore } from '../../store/authStore';

const HEARTBEAT_EVERY_MS = 60_000;
const ONE_SECOND_MS = 1_000;

const readNumber = (key: string, fallback = 0) => {
  const value = Number(localStorage.getItem(key) || fallback);
  return Number.isFinite(value) && value > 0 ? Math.round(value) : fallback;
};

const formatSeconds = (seconds: number) => {
  const safe = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(safe / 60);
  const secs = safe % 60;
  if (minutes <= 0) return `${secs}s`;
  return `${minutes}m ${String(secs).padStart(2, '0')}s`;
};

export default function IdleSessionManager() {
  const {
    isAuthenticated,
    token,
    sessionId,
    idleWarningSeconds,
    idleLogoutGraceSeconds,
    logout,
    clearLocalSession,
  } = useAuthStore();

  const [warningVisible, setWarningVisible] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(idleLogoutGraceSeconds || 60);

  const lastActivityAtRef = useRef(Date.now());
  const lastHeartbeatAtRef = useRef(0);
  const warningShownRef = useRef(false);
  const warningStartedAtRef = useRef<number | null>(null);
  const systemLogoutStartedRef = useRef(false);
  const activeSecondsRef = useRef(readNumber('sessionActiveSeconds', 0));
  const idleSecondsRef = useRef(readNumber('sessionIdleSeconds', 0));

  const warningSeconds = Math.max(10, idleWarningSeconds || 300);
  const graceSeconds = Math.max(10, idleLogoutGraceSeconds || 60);

  const persistTotals = useCallback(() => {
    localStorage.setItem('sessionActiveSeconds', String(Math.max(0, Math.round(activeSecondsRef.current))));
    localStorage.setItem('sessionIdleSeconds', String(Math.max(0, Math.round(idleSecondsRef.current))));
  }, []);

  const postSessionEvent = useCallback(async (eventType: string, description: string) => {
    const currentToken = token || localStorage.getItem('token') || '';
    const currentSessionId = sessionId || localStorage.getItem('sessionId') || '';
    if (!currentToken || !currentSessionId) return;

    try {
      await fetch(`${API.AUTH}/session-event`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentToken}`,
          'X-Session-Id': currentSessionId,
        },
        body: JSON.stringify({
          sessionId: currentSessionId,
          eventType,
          description,
          activeSeconds: Math.max(0, Math.round(activeSecondsRef.current)),
          idleSeconds: Math.max(0, Math.round(idleSecondsRef.current)),
        }),
      });
    } catch (e) {
      console.error('IdleSessionManager.session-event:', e);
    }
  }, [sessionId, token]);

  const sendHeartbeat = useCallback(async () => {
    const currentToken = token || localStorage.getItem('token') || '';
    const currentSessionId = sessionId || localStorage.getItem('sessionId') || '';
    if (!currentToken || !currentSessionId) return;

    persistTotals();

    try {
      const res = await fetch(`${API.AUTH}/heartbeat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentToken}`,
          'X-Session-Id': currentSessionId,
        },
        body: JSON.stringify({
          sessionId: currentSessionId,
          activeSeconds: Math.max(0, Math.round(activeSecondsRef.current)),
          idleSeconds: Math.max(0, Math.round(idleSecondsRef.current)),
          isIdle: Date.now() - lastActivityAtRef.current >= warningSeconds * 1000,
        }),
      });

      if (res.status === 401) {
        clearLocalSession();
        return;
      }

      if (!res.ok) return;

      const data = await res.json().catch(() => null);
      if (data && data.isActive === false) {
        clearLocalSession();
      }
    } catch (e) {
      console.error('IdleSessionManager.heartbeat:', e);
    }
  }, [clearLocalSession, persistTotals, sessionId, token, warningSeconds]);

  const stayLoggedIn = useCallback(() => {
    lastActivityAtRef.current = Date.now();
    warningShownRef.current = false;
    warningStartedAtRef.current = null;
    setWarningVisible(false);
    setSecondsLeft(graceSeconds);
    postSessionEvent('UserActiveAgain', 'User continued after idle warning');
    sendHeartbeat();
  }, [graceSeconds, postSessionEvent, sendHeartbeat]);

  const systemIdleLogout = useCallback(async () => {
    if (systemLogoutStartedRef.current) return;
    systemLogoutStartedRef.current = true;
    persistTotals();
    await logout('SystemIdle', 'System auto logout after 5 minutes idle and 1 minute warning', {
      activeSeconds: activeSecondsRef.current,
      idleSeconds: idleSecondsRef.current,
    });
  }, [logout, persistTotals]);

  const handleActivity = useCallback(() => {
    if (!isAuthenticated) return;
    if (systemLogoutStartedRef.current) return;

    if (warningVisible) {
      stayLoggedIn();
      return;
    }

    lastActivityAtRef.current = Date.now();
    warningShownRef.current = false;
    warningStartedAtRef.current = null;
  }, [isAuthenticated, stayLoggedIn, warningVisible]);

  useEffect(() => {
    if (!isAuthenticated || !token || !sessionId) return;

    const events: Array<keyof WindowEventMap> = [
      'mousemove',
      'mousedown',
      'keydown',
      'scroll',
      'touchstart',
    ];

    events.forEach((eventName) => {
      window.addEventListener(eventName, handleActivity, { passive: true });
    });

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        handleActivity();
        sendHeartbeat();
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      events.forEach((eventName) => window.removeEventListener(eventName, handleActivity));
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [handleActivity, isAuthenticated, sendHeartbeat, sessionId, token]);

  useEffect(() => {
    if (!isAuthenticated || !token || !sessionId) return;

    lastActivityAtRef.current = Date.now();
    warningShownRef.current = false;
    warningStartedAtRef.current = null;
    systemLogoutStartedRef.current = false;
    setWarningVisible(false);
    setSecondsLeft(graceSeconds);

    sendHeartbeat();

    const timer = window.setInterval(() => {
      const now = Date.now();
      const idleMs = now - lastActivityAtRef.current;
      const isIdle = idleMs >= warningSeconds * 1000;

      if (isIdle) {
        idleSecondsRef.current += 1;
      } else {
        activeSecondsRef.current += 1;
      }
      persistTotals();

      if (!warningShownRef.current && isIdle) {
        warningShownRef.current = true;
        warningStartedAtRef.current = now;
        setWarningVisible(true);
        setSecondsLeft(graceSeconds);
        postSessionEvent('IdleWarningShown', 'Idle warning shown after 5 minutes of inactivity');
      }

      if (warningStartedAtRef.current) {
        const elapsedWarningSeconds = Math.floor((now - warningStartedAtRef.current) / 1000);
        const remaining = Math.max(0, graceSeconds - elapsedWarningSeconds);
        setSecondsLeft(remaining);

        if (remaining <= 0) {
          systemIdleLogout();
          return;
        }
      }

      if (now - lastHeartbeatAtRef.current >= HEARTBEAT_EVERY_MS) {
        lastHeartbeatAtRef.current = now;
        sendHeartbeat();
      }
    }, ONE_SECOND_MS);

    return () => window.clearInterval(timer);
  }, [graceSeconds, isAuthenticated, persistTotals, postSessionEvent, sendHeartbeat, sessionId, systemIdleLogout, token, warningSeconds]);

  if (!isAuthenticated || !token || !sessionId || !warningVisible) return null;

  return (
    <div className="fixed inset-0 z-9999 flex items-center justify-center bg-slate-950/60 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200">
        <div className="bg-amber-50 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-700">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900">Session idle warning</h2>
              <p className="text-sm font-medium text-amber-800">No activity detected for 5 minutes.</p>
            </div>
          </div>
        </div>

        <div className="space-y-5 px-6 py-6">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-700">
              <Clock className="h-4 w-4" />
              Automatic logout in
            </div>
            <div className="text-4xl font-black tracking-tight text-slate-900">{formatSeconds(secondsLeft)}</div>
            <p className="mt-2 text-xs font-medium text-slate-500">
              Click stay logged in or move/press any key to continue your session.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={stayLoggedIn}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-black text-white shadow-sm hover:bg-blue-700"
            >
              <ShieldCheck className="h-4 w-4" />
              Stay logged in
            </button>
            <button
              type="button"
              onClick={() => logout('User', 'Manual logout from idle warning', {
                activeSeconds: activeSecondsRef.current,
                idleSeconds: idleSecondsRef.current,
              })}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-black text-slate-700 hover:bg-slate-50"
            >
              <LogOut className="h-4 w-4" />
              Logout now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
