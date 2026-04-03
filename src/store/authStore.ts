import { create } from 'zustand';
import { User } from '../types';
import { API } from '../api/client';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  operatorName: string | null;       // The real person using the shared account
  needsOperatorSelect: boolean;      // Show operator selection screen
  login: (username: string, password: string) => Promise<boolean>;
  setOperator: (name: string) => void;
  logout: () => void;
}

const getStoredUser = (): User | null => {
  try {
    const rawUser = localStorage.getItem('user');
    return rawUser ? JSON.parse(rawUser) : null;
  } catch {
    localStorage.removeItem('user');
    return null;
  }
};

const storedUser = getStoredUser();
const storedToken = localStorage.getItem('token');
const storedOperator = localStorage.getItem('operatorName');

export const useAuthStore = create<AuthState>((set) => ({
  user: storedUser,
  token: storedToken,
  isAuthenticated: !!storedUser && !!storedToken && !!storedOperator,
  operatorName: storedOperator,
  needsOperatorSelect: !!storedUser && !!storedToken && !storedOperator,

  login: async (username, password) => {
    try {
      const res = await fetch(`${API.AUTH}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) return false;

      const data = await res.json();

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      set({
        user: data.user,
        token: data.token,
        isAuthenticated: false,       // Not yet — needs operator selection
        needsOperatorSelect: true,
        operatorName: null,
      });

      return true;
    } catch (error) {
      console.error('API Connection error:', error);
      return false;
    }
  },

  setOperator: (name: string) => {
    localStorage.setItem('operatorName', name);
    set({
      operatorName: name,
      isAuthenticated: true,
      needsOperatorSelect: false,
    });
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('operatorName');
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      operatorName: null,
      needsOperatorSelect: false,
    });
  },
}));