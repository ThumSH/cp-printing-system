// src/api/client.ts

// Runtime config: reads from app-config.json (for Tauri deployment)
// Falls back to env variable, then localhost for development
let _apiUrl: string | null = null;

async function loadConfig(): Promise<string> {
  if (_apiUrl) return _apiUrl;
  try {
    const res = await fetch('/app-config.json');
    if (res.ok) {
      const config = await res.json();
      if (config.apiUrl) {
        _apiUrl = config.apiUrl.replace(/\/+$/, '');
        return _apiUrl;
      }
    }
  } catch { /* fall through */ }
  _apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/+$/, '');
  return _apiUrl;
}

function getApiUrl(): string {
  if (_apiUrl) return _apiUrl;
  return (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/+$/, '');
}

// Initialize on load
loadConfig();

// ==========================================
// EXPORTS — used by all stores and pages
// ==========================================

export const API = {
  get BASE() { return getApiUrl(); },
  get AUTH() { return `${getApiUrl()}/api/auth`; },
  get INVENTORY() { return `${getApiUrl()}/api/inventory`; },
  get QC() { return `${getApiUrl()}/api/qc`; },
  get GATEPASS() { return `${getApiUrl()}/api/gatepass`; },
  get AUDIT() { return `${getApiUrl()}/api/audit`; },
  get DELIVERY_TRACKER() { return `${getApiUrl()}/api/deliverytracker`; },
  get WORKER() { return `${getApiUrl()}/api/worker`; },
  get ADMIN() { return `${getApiUrl()}/api/admin`; },
} as const;

export const getAuthHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token')}`,
});

// Legacy apiCall — still works for anything using the old pattern
const BASE_URL = `${getApiUrl()}/api`;

export const apiCall = async (endpoint: string, options: RequestInit = {}) => {
  try {
    const response = await fetch(`${getApiUrl()}/api${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Server Error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`API Call failed for ${endpoint}:`, error);
    throw error;
  }
};

export { loadConfig };