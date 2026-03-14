import { useEffect, useState } from 'react';
import { ROLES, Role, User } from '../../types';
import { getUsers, createUser, updateUser, deleteUser, resetPassword } from '../../services/services';

const emptyForm = {
  id: '',
  username: '',
  password: '',
  name: '',
  role: 'Developer' as Role,
};

export default function UserManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [passwordResetUserId, setPasswordResetUserId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await getUsers();
      setUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      if (editingId) {
        await updateUser(editingId, {
          username: form.username,
          name: form.name,
          role: form.role,
        });
      } else {
        await createUser({
          username: form.username,
          password: form.password,
          name: form.name,
          role: form.role,
        });
      }

      setForm(emptyForm);
      setEditingId(null);
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    }
  };

  const handleEdit = (user: User) => {
    setForm({
      id: user.id,
      username: user.username,
      password: '',
      name: user.name,
      role: user.role,
    });
    setEditingId(user.id);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this user?')) return;

    try {
      await deleteUser(id);
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  const handleResetPassword = async (id: string) => {
    if (!newPassword.trim()) {
      setError('Enter a new password first.');
      return;
    }

    try {
      await resetPassword(id, newPassword);
      setPasswordResetUserId(null);
      setNewPassword('');
      alert('Password reset successfully.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Password reset failed');
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">User Management</h1>
        <p className="text-sm text-slate-500">Create, update, and manage employee accounts.</p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
        <h2 className="text-lg font-semibold mb-4">
          {editingId ? 'Edit User' : 'Create User'}
        </h2>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="Full name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="border rounded-lg px-3 py-2"
            required
          />

          <input
            type="text"
            placeholder="Username"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            className="border rounded-lg px-3 py-2"
            required
          />

          {!editingId && (
            <input
              type="password"
              placeholder="Password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="border rounded-lg px-3 py-2"
              required
            />
          )}

          <select
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
            className="border rounded-lg px-3 py-2"
          >
            {ROLES.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>

          <div className="md:col-span-2 flex gap-3">
            <button
              type="submit"
              className="rounded-lg bg-blue-600 text-white px-4 py-2 hover:bg-blue-700"
            >
              {editingId ? 'Update User' : 'Create User'}
            </button>

            {editingId && (
              <button
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setForm(emptyForm);
                }}
                className="rounded-lg border px-4 py-2"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
        <h2 className="text-lg font-semibold mb-4">All Users</h2>

        {loading ? (
          <p className="text-sm text-slate-500">Loading users...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b text-left text-slate-600">
                  <th className="py-3 pr-4">Name</th>
                  <th className="py-3 pr-4">Username</th>
                  <th className="py-3 pr-4">Role</th>
                  <th className="py-3 pr-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b last:border-0">
                    <td className="py-3 pr-4">{user.name}</td>
                    <td className="py-3 pr-4">{user.username}</td>
                    <td className="py-3 pr-4">{user.role}</td>
                    <td className="py-3 pr-4 flex gap-2 flex-wrap">
                      <button
                        onClick={() => handleEdit(user)}
                        className="rounded-md border px-3 py-1 hover:bg-slate-50"
                      >
                        Edit
                      </button>

                      <button
                        onClick={() => handleDelete(user.id)}
                        className="rounded-md border border-red-200 text-red-600 px-3 py-1 hover:bg-red-50"
                      >
                        Delete
                      </button>

                      {passwordResetUserId === user.id ? (
                        <div className="flex gap-2">
                          <input
                            type="password"
                            placeholder="New password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="border rounded px-2 py-1"
                          />
                          <button
                            onClick={() => handleResetPassword(user.id)}
                            className="rounded-md bg-amber-500 text-white px-3 py-1"
                          >
                            Save
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setPasswordResetUserId(user.id)}
                          className="rounded-md border border-amber-200 text-amber-700 px-3 py-1 hover:bg-amber-50"
                        >
                          Reset Password
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}