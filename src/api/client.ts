// src/api/client.ts

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const API = {
  BASE: API_URL,
  AUTH: `${API_URL}/api/auth`,
  INVENTORY: `${API_URL}/api/inventory`,
  QC: `${API_URL}/api/qc`,
  GATEPASS: `${API_URL}/api/gatepass`,
  AUDIT: `${API_URL}/api/audit`,
  DELIVERY_TRACKER: `${API_URL}/api/deliverytracker`,
  WORKER: `${API_URL}/api/worker`,
  ADMIN: `${API_URL}/api/admin`,
} as const;

export const getAuthHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
  'X-Operator-Name': localStorage.getItem('operatorName') || '',
});

export const apiCall = async (endpoint: string, options: RequestInit = {}) => {
  try {
    const response = await fetch(`${API_URL}/api${endpoint}`, {
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