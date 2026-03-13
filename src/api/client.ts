// src/lib/api.ts

// Point this to your Express backend port
const BASE_URL = 'http://localhost:5000/api';

export const apiCall = async (endpoint: string, options: RequestInit = {}) => {
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    // If the server returns a 400/500 level error, throw it so the UI can catch it
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