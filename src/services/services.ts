import { User, Role } from '../types';

const API_BASE = 'http://localhost:5000/api';

function getAuthHeaders() {
  const token = localStorage.getItem('token');

  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

export async function getUsers(): Promise<User[]> {
  const res = await fetch(`${API_BASE}/users`, {
    headers: getAuthHeaders(),
  });

  if (!res.ok) throw new Error('Failed to fetch users');
  return res.json();
}

export async function createUser(data: {
  username: string;
  password: string;
  name: string;
  role: Role;
}): Promise<User> {
  const res = await fetch(`${API_BASE}/users`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const msg = await res.text();
    throw new Error(msg || 'Failed to create user');
  }

  return res.json();
}

export async function updateUser(
  id: string,
  data: { username: string; name: string; role: Role }
): Promise<User> {
  const res = await fetch(`${API_BASE}/users/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const msg = await res.text();
    throw new Error(msg || 'Failed to update user');
  }

  return res.json();
}

export async function deleteUser(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/users/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    const msg = await res.text();
    throw new Error(msg || 'Failed to delete user');
  }
}

export async function resetPassword(id: string, newPassword: string): Promise<void> {
  const res = await fetch(`${API_BASE}/users/${id}/password`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({ newPassword }),
  });

  if (!res.ok) {
    const msg = await res.text();
    throw new Error(msg || 'Failed to reset password');
  }
}