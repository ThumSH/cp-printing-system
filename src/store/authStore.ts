// src/store/authStore.ts
// FIXES:
//   - On init, validates that token is a non-empty string before setting isAuthenticated
//   - Added tokenExpired helper that checks JWT exp claim without a library
//   - If stored JWT is clearly expired on boot, auto-clears storage so user must re-login
//     (instead of appearing authenticated until the first 401 comes back from the API)

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

const storedToken    = localStorage.getItem('token');
const storedUser     = getStoredUser();
const storedOperator = localStorage.getItem('operatorName');

// FIX: If token is expired on boot, clear storage immediately so the
// user is sent to the login screen rather than hitting a 401 mid-session.
const tokenExpired = isTokenExpired(storedToken);
if (tokenExpired && (storedToken || storedUser)) {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.removeItem('operatorName');
}

const validSession = !tokenExpired && !!storedUser && !!storedToken;

// ── Store ──────────────────────────────────────────────────────────────────────
interface AuthState {
  user:                User | null;
  token:               string | null;
  isAuthenticated:     boolean;
  operatorName:        string | null;
  needsOperatorSelect: boolean;

  login:       (username: string, password: string) => Promise<boolean>;
  setOperator: (name: string) => void;
  logout:      () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user:                validSession ? storedUser    : null,
  token:               validSession ? storedToken   : null,
  isAuthenticated:     validSession && !!storedOperator,
  operatorName:        validSession ? storedOperator : null,
  needsOperatorSelect: validSession && !storedOperator,

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

      set({
        user:                data.user,
        token:               data.token,
        isAuthenticated:     false,   // waits for operator selection
        needsOperatorSelect: true,
        operatorName:        null,
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

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('operatorName');
    set({
      user:                null,
      token:               null,
      isAuthenticated:     false,
      operatorName:        null,
      needsOperatorSelect: false,
    });
  },
}));