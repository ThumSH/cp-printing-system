// src/store/authStore.ts
// Session tracking update:
//   - Stores backend sessionId returned from /api/auth/login
//   - Sends manual/system logout to backend before clearing local storage
//   - Keeps the existing operator selection flow
//   - Keeps JWT expiry cleanup on app boot

import { create } from 'zustand';
import { User } from '../types';
import { API } from '../api/client';

// ── Lightweight JWT exp check ──────────────────────────────────────────────────
// Decodes the payload of a JWT without verifying the signature.
// Returns true if the token is expired. Returns false if it can't be parsed.
function isTokenExpired(token: string | null): boolean {
  if (!token) return true;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;
    const payload = JSON.parse(atob(parts[1]));
    if (!payload.exp) return false; // no exp claim — treat as valid
    return Date.now() / 1000 > payload.exp;
  } catch {
    return true; // malformed token — treat as expired
  }
}

// ── Read persisted state ───────────────────────────────────────────────────────
const getStoredUser = (): User | null => {
  try {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    localStorage.removeItem('user');
    return null;
  }
};

const toNumber = (value: string | null) => {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : 0;
};

const storedToken    = localStorage.getItem('token');
const storedUser     = getStoredUser();
const storedOperator = localStorage.getItem('operatorName');
const storedSession  = localStorage.getItem('sessionId');

// FIX: If token is expired on boot, clear storage immediately so the
// user is sent to the login screen rather than hitting a 401 mid-session.
const tokenExpired = isTokenExpired(storedToken);
if (tokenExpired && (storedToken || storedUser)) {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.removeItem('operatorName');
  localStorage.removeItem('sessionId');
  localStorage.removeItem('sessionActiveSeconds');
  localStorage.removeItem('sessionIdleSeconds');
  localStorage.removeItem('idleWarningSeconds');
  localStorage.removeItem('idleLogoutGraceSeconds');
}

const validSession = !tokenExpired && !!storedUser && !!storedToken;

type LogoutType = 'User' | 'SystemIdle' | 'TokenExpired' | 'BrowserClosed' | 'Forced';

interface LogoutTotals {
  activeSeconds?: number;
  idleSeconds?: number;
}

// ── Store ──────────────────────────────────────────────────────────────────────
interface AuthState {
  user:                User | null;
  token:               string | null;
  sessionId:           string | null;
  isAuthenticated:     boolean;
  operatorName:        string | null;
  needsOperatorSelect: boolean;
  idleWarningSeconds:  number;
  idleLogoutGraceSeconds: number;

  login:       (username: string, password: string) => Promise<boolean>;
  setOperator: (name: string) => void;
  logout:      (logoutType?: LogoutType, logoutReason?: string, totals?: LogoutTotals) => Promise<void>;
  clearLocalSession: () => void;
}

const clearLocalStorage = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.removeItem('operatorName');
  localStorage.removeItem('sessionId');
  localStorage.removeItem('sessionActiveSeconds');
  localStorage.removeItem('sessionIdleSeconds');
  localStorage.removeItem('idleWarningSeconds');
  localStorage.removeItem('idleLogoutGraceSeconds');
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user:                validSession ? storedUser    : null,
  token:               validSession ? storedToken   : null,
  sessionId:           validSession ? storedSession : null,
  isAuthenticated:     validSession && !!storedOperator,
  operatorName:        validSession ? storedOperator : null,
  needsOperatorSelect: validSession && !storedOperator,
  idleWarningSeconds:  toNumber(localStorage.getItem('idleWarningSeconds')) || 300,
  idleLogoutGraceSeconds: toNumber(localStorage.getItem('idleLogoutGraceSeconds')) || 60,

  login: async (username, password) => {
    try {
      const res = await fetch(`${API.AUTH}/login`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ username, password }),
      });
      if (!res.ok) return false;

      const data = await res.json();

      localStorage.setItem('token', data.token);
      localStorage.setItem('user',  JSON.stringify(data.user));

      if (data.sessionId) {
        localStorage.setItem('sessionId', data.sessionId);
      } else {
        localStorage.removeItem('sessionId');
      }

      const idleWarningSeconds = Number(data.idleWarningSeconds || 300);
      const idleLogoutGraceSeconds = Number(data.idleLogoutGraceSeconds || 60);

      localStorage.setItem('idleWarningSeconds', String(idleWarningSeconds));
      localStorage.setItem('idleLogoutGraceSeconds', String(idleLogoutGraceSeconds));
      localStorage.setItem('sessionActiveSeconds', '0');
      localStorage.setItem('sessionIdleSeconds', '0');

      set({
        user:                data.user,
        token:               data.token,
        sessionId:           data.sessionId || null,
        isAuthenticated:     false,   // waits for operator selection
        needsOperatorSelect: true,
        operatorName:        null,
        idleWarningSeconds,
        idleLogoutGraceSeconds,
      });
      return true;
    } catch (e) {
      console.error('authStore.login:', e);
      return false;
    }
  },

  setOperator: (name) => {
    localStorage.setItem('operatorName', name);
    set({ operatorName: name, isAuthenticated: true, needsOperatorSelect: false });
  },

  logout: async (logoutType = 'User', logoutReason = 'Manual logout', totals) => {
    const state = get();
    const token = state.token || localStorage.getItem('token') || '';
    const sessionId = state.sessionId || localStorage.getItem('sessionId') || '';
    const activeSeconds = Math.max(0, Math.round(totals?.activeSeconds ?? toNumber(localStorage.getItem('sessionActiveSeconds'))));
    const idleSeconds = Math.max(0, Math.round(totals?.idleSeconds ?? toNumber(localStorage.getItem('sessionIdleSeconds'))));

    if (token && sessionId) {
      try {
        await fetch(`${API.AUTH}/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            'X-Session-Id': sessionId,
          },
          body: JSON.stringify({
            sessionId,
            logoutType,
            logoutReason,
            activeSeconds,
            idleSeconds,
          }),
        });
      } catch (e) {
        console.error('authStore.logout:', e);
      }
    }

    clearLocalStorage();
    set({
      user:                null,
      token:               null,
      sessionId:           null,
      isAuthenticated:     false,
      operatorName:        null,
      needsOperatorSelect: false,
      idleWarningSeconds:  300,
      idleLogoutGraceSeconds: 60,
    });
  },

  clearLocalSession: () => {
    clearLocalStorage();
    set({
      user:                null,
      token:               null,
      sessionId:           null,
      isAuthenticated:     false,
      operatorName:        null,
      needsOperatorSelect: false,
      idleWarningSeconds:  300,
      idleLogoutGraceSeconds: 60,
    });
  },
}));
