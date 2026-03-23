// src/pages/admin/UserManagement.tsx
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Plus, Edit2, Trash2, KeyRound, Save, X, Loader2, Shield, Eye, EyeOff, Search, UserPlus,
} from 'lucide-react';
import { ROLES, Role, User } from '../../types';
import { getUsers, createUser, updateUser, deleteUser, resetPassword } from '../../services/services';

const ROLE_COLORS: Record<string, string> = {
  Admin: 'bg-red-100 text-red-700 border-red-200',
  Developer: 'bg-blue-100 text-blue-700 border-blue-200',
  QC: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  Gatepass: 'bg-amber-100 text-amber-700 border-amber-200',
  Audit: 'bg-purple-100 text-purple-700 border-purple-200',
  Stores: 'bg-teal-100 text-teal-700 border-teal-200',
  Worker: 'bg-orange-100 text-orange-700 border-orange-200',
};

const emptyForm = { id: '', username: '', password: '', name: '', role: 'Developer' as Role };

export default function UserManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [passwordResetUserId, setPasswordResetUserId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const loadUsers = async () => {
    try {
      setLoading(true);
      setUsers(await getUsers());
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to load users'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadUsers(); }, []);

  const filteredUsers = users.filter((u) =>
    !searchQuery.trim() ||
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccess(''); setSaving(true);
    try {
      if (editingId) {
        await updateUser(editingId, { username: form.username, name: form.name, role: form.role });
        setSuccess(`User "${form.name}" updated.`);
      } else {
        await createUser({ username: form.username, password: form.password, name: form.name, role: form.role });
        setSuccess(`User "${form.name}" created.`);
      }
      setForm(emptyForm); setEditingId(null); setShowForm(false);
      await loadUsers();
    } catch (err) { setError(err instanceof Error ? err.message : 'Save failed'); }
    finally { setSaving(false); }
  };

  const handleEdit = (user: User) => {
    setForm({ id: user.id, username: user.username, password: '', name: user.name, role: user.role });
    setEditingId(user.id);
    setShowForm(true);
    setError(''); setSuccess('');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try { await deleteUser(id); await loadUsers(); setSuccess('User deleted.'); }
    catch (err) { setError(err instanceof Error ? err.message : 'Delete failed'); }
  };

  const handleResetPassword = async (id: string) => {
    if (!newPassword.trim()) { setError('Enter a new password.'); return; }
    try {
      await resetPassword(id, newPassword);
      setPasswordResetUserId(null); setNewPassword(''); setShowPassword(false);
      setSuccess('Password reset successfully.');
    } catch (err) { setError(err instanceof Error ? err.message : 'Reset failed'); }
  };

  const cancelForm = () => { setForm(emptyForm); setEditingId(null); setShowForm(false); setError(''); };

  // Auto-clear success message
  useEffect(() => { if (success) { const t = setTimeout(() => setSuccess(''), 4000); return () => clearTimeout(t); } }, [success]);

  const initials = (name: string) => name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between pb-5 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-red-100 p-2.5 text-red-600"><Shield className="h-5 w-5" /></div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">User Management</h2>
            <p className="text-sm text-slate-500">Create, update, and manage employee accounts.</p>
          </div>
        </div>
        {!showForm && (
          <button onClick={() => { setShowForm(true); setEditingId(null); setForm(emptyForm); setError(''); }}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-600/20 hover:bg-blue-700 transition-colors">
            <UserPlus className="h-4 w-4" /> Add User
          </button>
        )}
      </motion.div>

      {/* Notifications */}
      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="rounded-xl border border-red-200 bg-red-50 px-5 py-3 flex items-center justify-between">
            <p className="text-sm text-red-700 font-medium">{error}</p>
            <button onClick={() => setError('')} className="text-red-400 hover:text-red-600"><X className="h-4 w-4" /></button>
          </motion.div>
        )}
        {success && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm text-emerald-700 font-medium">
            {success}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create / Edit Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden">
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-base font-bold text-slate-900">
                  {editingId ? 'Edit User' : 'Create New User'}
                </h3>
                <button onClick={cancelForm} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide">Full Name *</label>
                    <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="e.g. Sarath Perera"
                      className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide">Username *</label>
                    <input type="text" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required placeholder="e.g. sarath"
                      className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all" />
                  </div>
                  {!editingId && (
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide">Password *</label>
                      <div className="relative">
                        <input type={showPassword ? 'text' : 'password'} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required placeholder="Min 6 characters"
                          className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-4 py-2.5 pr-10 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all" />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide">Role *</label>
                    <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all">
                      {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="submit" disabled={saving}
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 transition-colors">
                    {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</> : <><Save className="h-4 w-4" /> {editingId ? 'Update User' : 'Create User'}</>}
                  </button>
                  <button type="button" onClick={cancelForm}
                    className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Users list */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {/* Search bar */}
        <div className="border-b border-slate-100 px-5 py-3 flex items-center justify-between">
          <div className="relative max-w-xs flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search users..."
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 transition-all" />
          </div>
          <span className="text-xs font-medium text-slate-500">{filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''}</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin" /> Loading users...
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-16 text-center">
            <Users className="mx-auto mb-3 h-12 w-12 text-slate-200" />
            <p className="text-slate-400 font-medium">{searchQuery ? 'No users match your search.' : 'No users yet.'}</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {filteredUsers.map((user, i) => (
              <motion.div key={user.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50/50 transition-colors">
                {/* Avatar */}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${ROLE_COLORS[user.role] || 'bg-slate-100 text-slate-600'}`}>
                  {initials(user.name)}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{user.name}</p>
                  <p className="text-xs text-slate-500">@{user.username}</p>
                </div>

                {/* Role badge */}
                <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold shrink-0 ${ROLE_COLORS[user.role] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                  {user.role}
                </span>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => handleEdit(user)} title="Edit"
                    className="rounded-md p-1.5 text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-colors">
                    <Edit2 className="h-4 w-4" />
                  </button>

                  {/* Password reset */}
                  {passwordResetUserId === user.id ? (
                    <div className="flex items-center gap-1.5 ml-1">
                      <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="New password"
                        className="w-28 rounded-md border border-slate-200 px-2 py-1 text-xs outline-none focus:border-blue-400" autoFocus />
                      <button onClick={() => handleResetPassword(user.id)} className="rounded-md bg-emerald-600 p-1.5 text-white hover:bg-emerald-700 transition-colors" title="Confirm">
                        <KeyRound className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => { setPasswordResetUserId(null); setNewPassword(''); }} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100" title="Cancel">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => { setPasswordResetUserId(user.id); setNewPassword(''); setError(''); }} title="Reset password"
                      className="rounded-md p-1.5 text-slate-400 hover:bg-amber-50 hover:text-amber-600 transition-colors">
                      <KeyRound className="h-4 w-4" />
                    </button>
                  )}

                  <button onClick={() => handleDelete(user.id)} title="Delete"
                    className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}