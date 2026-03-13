// src/store/authStore.ts
import { create } from 'zustand';
import { User } from '../types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  // Change login to accept username and password strings, and return a boolean success status
  login: (username: string, password: string) => Promise<boolean>; 
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  isAuthenticated: !!localStorage.getItem('token'),
  
  login: async (username, password) => {
    try {
      // Send the REAL typed username and password to your ASP.NET API
      const res = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }) 
      });
      
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        set({ user: data.user, isAuthenticated: true });
        return true; // Login successful!
      } else {
        console.error("Login rejected by API:", res.status);
        return false; // Login failed (Wrong password or username)
      }
    } catch (error) {
       console.error("API Connection error:", error);
       alert("Could not connect to the Backend API. Is 'dotnet run' running?");
       return false;
    }
  },
  
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({ user: null, isAuthenticated: false });
  },
}));