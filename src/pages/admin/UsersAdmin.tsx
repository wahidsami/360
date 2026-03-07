
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Search, Plus, MoreHorizontal, Shield, User as UserIcon,
  Mail, Edit2, Power, Filter, CheckCircle, XCircle
} from 'lucide-react';
import { GlassCard, Button, Badge, Input, Select, Label } from "@/components/ui/UIComponents";
import { Modal } from "@/components/ui/Modal";
import { api } from '@/services/api';
import { Role, User, Permission } from '@/types';

if (!api?.users) {
  throw new Error("API client missing users namespace — check api import path.");
}

export const UsersAdmin: React.FC = () => {
  const { t } = useTranslation();

  // State
  const [users, setUsers] = useState<User[]>([]);

  React.useEffect(() => {
    const loadUsers = async () => {
      try {
        const data = await api.users.list();
        setUsers(data);
      } catch (e) {
        console.error("Failed to load users", e);
      }
    };
    loadUsers();
  }, []);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [isModalOpen, setModalOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [editPermissions, setEditPermissions] = useState<string[]>([]);
  const [newUser, setNewUser] = useState({ name: '', email: '', role: Role.VIEWER, permissions: [] as string[] });

  // Filtering
  const filteredUsers = users.filter(u => {
    const matchSearch = u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  // Handlers
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await api.users.create({
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        permissions: newUser.permissions.length ? newUser.permissions : undefined,
        avatar: `https://ui-avatars.com/api/?name=${newUser.name}&background=random`
      });
      setUsers([...users, created as User]);
      setModalOpen(false);
      setNewUser({ name: '', email: '', role: Role.VIEWER, permissions: [] });

      // Show invite link if available (it should be returned by create)
      if ((created as any).inviteLink) {
        // We can use a toast or alert, but a nice modal is better. 
        // For now, let's use a simple prompt/alert to copy.
        // In a real app we'd have a specific "User Created" modal.
        window.prompt('User Created! Send this Invite Link to the user:', (created as any).inviteLink);
      }
    } catch (e) {
      console.error("Failed to create user", e);
      alert('Failed to create user');
    }
  };

  const getRoleBadgeVariant = (role: Role) => {
    if (role === Role.SUPER_ADMIN) return 'danger';
    if ([Role.PM, Role.OPS, Role.DEV].includes(role)) return 'info';
    if (role === Role.FINANCE) return 'success';
    if (role.startsWith('CLIENT')) return 'warning';
    return 'neutral';
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-display text-white">{t('admin')} / Users</h1>
          <p className="text-slate-400">Manage system access and user identities.</p>
        </div>
        <Button className="shadow-[0_0_15px_rgba(6,182,212,0.4)]" onClick={() => setModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" /> Add User
        </Button>
      </div>

      {/* Filters */}
      <GlassCard className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
            <Input
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="w-full md:w-64">
            <Select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
              <option value="all">All Roles</option>
              {Object.values(Role).map(r => (
                <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>
              ))}
            </Select>
          </div>
        </div>
      </GlassCard>

      {/* Users Table */}
      <GlassCard className="p-0 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-900/50 text-slate-400 border-b border-slate-700/50">
            <tr>
              <th className="p-4 font-medium">Identity</th>
              <th className="p-4 font-medium">Role</th>
              <th className="p-4 font-medium">Status</th>
              <th className="p-4 font-medium">Last Login</th>
              <th className="p-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {filteredUsers.map(user => (
              <tr key={user.id} className="hover:bg-slate-800/30 transition-colors group">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <img
                      src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random`}
                      alt={user.name}
                      className="w-9 h-9 rounded-full border border-slate-600 object-cover"
                    />
                    <div>
                      <p className="font-medium text-slate-200">{user.name}</p>
                      <p className="text-xs text-slate-500 flex items-center gap-1">
                        <Mail className="w-3 h-3" /> {user.email}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="p-4">
                  <Badge variant={getRoleBadgeVariant(user.role)}>
                    {user.role.replace(/_/g, ' ')}
                  </Badge>
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    <span className="text-slate-300">Active</span>
                  </div>
                </td>
                <td className="p-4 text-slate-400">
                  {new Date().toLocaleDateString()} <span className="text-xs opacity-50">14:20</span>
                </td>
                <td className="p-4 text-right">
                  <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="sm" title="Edit role & permissions" onClick={() => { setEditUser(user); setEditPermissions(user.customPermissions || []); }}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" title="Disable Account" className="hover:text-rose-400">
                      <Power className="w-4 h-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredUsers.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-slate-500">No users found matching criteria.</td>
              </tr>
            )}
          </tbody>
        </table>
      </GlassCard>

      {/* Edit User Permissions Modal */}
      <Modal isOpen={!!editUser} onClose={() => setEditUser(null)} title={editUser ? `Edit: ${editUser.name}` : ''}>
        {editUser && (
          <div className="space-y-4">
            <p className="text-sm text-slate-400">Role: <strong className="text-slate-200">{editUser.role.replace(/_/g, ' ')}</strong></p>
            <div>
              <Label>Custom permissions (in addition to role defaults)</Label>
              <div className="flex flex-wrap gap-3 mt-2 p-3 rounded-lg border border-slate-700/50 bg-slate-800/30">
                {Object.values(Permission).map(perm => (
                  <label key={perm} className="flex items-center gap-2 cursor-pointer text-sm text-slate-300">
                    <input
                      type="checkbox"
                      checked={editPermissions.includes(perm)}
                      onChange={(e) => {
                        const next = e.target.checked
                          ? [...editPermissions, perm]
                          : editPermissions.filter(p => p !== perm);
                        setEditPermissions(next);
                      }}
                      className="rounded border-slate-600 text-cyan-500 focus:ring-cyan-500"
                    />
                    {perm.replace(/_/g, ' ')}
                  </label>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button type="button" variant="ghost" onClick={() => setEditUser(null)}>Cancel</Button>
              <Button type="button" onClick={async () => {
                if (!editUser) return;
                await api.users.updatePermissions(editUser.id, editPermissions);
                setUsers(users.map(u => u.id === editUser.id ? { ...u, customPermissions: editPermissions } : u));
                setEditUser(null);
              }}>Save permissions</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Add User Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setModalOpen(false)} title="Create New Identity">
        <form onSubmit={handleAddUser} className="space-y-4">
          <div>
            <Label>Full Name</Label>
            <Input
              value={newUser.name}
              onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
              required
              placeholder="e.g. John Doe"
            />
          </div>
          <div>
            <Label>Email Address</Label>
            <Input
              type="email"
              value={newUser.email}
              onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
              required
              placeholder="user@nebula.com"
            />
          </div>
          <div>
            <Label>System Role</Label>
            <Select
              value={newUser.role}
              onChange={(e) => setNewUser({ ...newUser, role: e.target.value as Role })}
            >
              {Object.values(Role).map(r => (
                <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Custom permissions (optional, in addition to role)</Label>
            <div className="flex flex-wrap gap-3 mt-2 p-3 rounded-lg border border-slate-700/50 bg-slate-800/30">
              {Object.values(Permission).map(perm => (
                <label key={perm} className="flex items-center gap-2 cursor-pointer text-sm text-slate-300">
                  <input
                    type="checkbox"
                    checked={newUser.permissions.includes(perm)}
                    onChange={(e) => {
                      const next = e.target.checked
                        ? [...newUser.permissions, perm]
                        : newUser.permissions.filter(p => p !== perm);
                      setNewUser({ ...newUser, permissions: next });
                    }}
                    className="rounded border-slate-600 text-cyan-500 focus:ring-cyan-500"
                  />
                  {perm.replace(/_/g, ' ')}
                </label>
              ))}
            </div>
          </div>
          <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50 flex gap-3 items-start mt-2">
            <Shield className="w-5 h-5 text-cyan-500 shrink-0" />
            <p className="text-xs text-slate-400">
              New users will receive a temporary access link via email. Two-factor authentication is enforced by default.
            </p>
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>{t('cancel')}</Button>
            <Button type="submit">{t('confirm')}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default UsersAdmin;
