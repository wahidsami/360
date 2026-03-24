
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import {
  Search, Plus, Shield, User as UserIcon,
  Mail, Edit2, Power, CheckCircle, Copy, ExternalLink
} from 'lucide-react';
import { GlassCard, Button, Badge, Input, Select, Label, CopyButton } from "@/components/ui/UIComponents";
import { Modal } from "@/components/ui/Modal";
import { api } from '@/services/api';
import { Role, User, Permission, Client } from '@/types';

if (!api?.users) {
  throw new Error("API client missing users namespace — check api import path.");
}

export const UsersAdmin: React.FC = () => {
  const { t } = useTranslation();

  // State
  const [users, setUsers] = useState<User[]>([]);
  const [clients, setClients] = useState<Client[]>([]);

  React.useEffect(() => {
    const loadData = async () => {
      try {
        const [usersData, clientsData] = await Promise.all([
          api.users.list(),
          api.clients.list()
        ]);
        setUsers(usersData);
        setClients(clientsData);
      } catch (e) {
        console.error("Failed to load data", e);
      }
    };
    loadData();
  }, []);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [isModalOpen, setModalOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [editPermissions, setEditPermissions] = useState<string[]>([]);
  const [newUser, setNewUser] = useState({ name: '', email: '', role: Role.VIEWER, permissions: [] as string[], clientId: '' });
  const [inviteResult, setInviteResult] = useState<{ link: string; email: string } | null>(null);
  const [editRole, setEditRole] = useState<Role>(Role.VIEWER);
  const [editIsActive, setEditIsActive] = useState(true);

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
        clientId: newUser.role.startsWith('CLIENT_') ? newUser.clientId : undefined,
        avatar: `https://ui-avatars.com/api/?name=${newUser.name}&background=random`
      } as any);
      setUsers([...users, created as User]);
      setModalOpen(false);
      setNewUser({ name: '', email: '', role: Role.VIEWER, permissions: [], clientId: '' });

      // Show invite result
      if ((created as any).inviteLink) {
        toast.success(`Invite email sent to ${newUser.email}`);
        setInviteResult({ link: (created as any).inviteLink, email: newUser.email });
      } else {
        toast.success('User created successfully');
      }
    } catch (e) {
      console.error("Failed to create user", e);
      toast.error('Failed to create user. Please try again.');
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
                      <div className="flex flex-col gap-0.5">
                        <p className="text-xs text-slate-500 flex items-center gap-1">
                          <Mail className="w-3 h-3" /> {user.email}
                        </p>
                        <div className="flex items-center gap-1 text-[10px] text-slate-600 font-mono">
                          <span>ID: {user.id}</span>
                          <CopyButton value={user.id} className="scale-75 origin-left" />
                        </div>
                      </div>
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
                    <Button variant="ghost" size="sm" title="Edit role & permissions" onClick={() => {
                        setEditUser(user);
                        setEditRole(user.role as Role);
                        setEditIsActive(user.isActive ?? true);
                        setEditPermissions(user.customPermissions || []);
                      }}>
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

      {/* Edit User Modal */}
      <Modal isOpen={!!editUser} onClose={() => setEditUser(null)} title={editUser ? `Edit User: ${editUser.name}` : ''}>
        {editUser && (
          <div className="space-y-5">

            {/* Role */}
            <div>
              <Label>System Role</Label>
              <Select
                value={editRole}
                onChange={(e) => setEditRole(e.target.value as Role)}
                className="mt-1"
              >
                {Object.values(Role).map(r => (
                  <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>
                ))}
              </Select>
              <p className="text-[10px] text-slate-500 mt-1">Changing role updates all permissions derived from that role.</p>
            </div>

            {/* Active toggle */}
            <div className="flex items-center justify-between p-3 rounded-lg border border-slate-700/50 bg-slate-800/30">
              <div>
                <p className="text-sm font-medium text-slate-200">Account Active</p>
                <p className="text-xs text-slate-500">Inactive users cannot log in.</p>
              </div>
              <button
                type="button"
                onClick={() => setEditIsActive(v => !v)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  editIsActive ? 'bg-cyan-600' : 'bg-slate-600'
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  editIsActive ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>

            {/* Custom permissions */}
            <div>
              <Label>Custom Permissions (in addition to role defaults)</Label>
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

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setEditUser(null)}>Cancel</Button>
              <Button type="button" onClick={async () => {
                if (!editUser) return;
                try {
                  const updated = await api.users.update(editUser.id, {
                    role: editRole,
                    isActive: editIsActive,
                    permissions: editPermissions,
                  } as any);
                  setUsers(users.map(u => u.id === editUser.id
                    ? { ...u, role: editRole, isActive: editIsActive, customPermissions: editPermissions }
                    : u
                  ));
                  setEditUser(null);
                  toast.success(`${editUser.name}'s profile updated`);
                } catch (e) {
                  toast.error('Failed to update user');
                }
              }}>Save Changes</Button>
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
          {newUser.role.startsWith('CLIENT_') && (
            <div className="animate-in slide-in-from-top-2 duration-300">
              <Label>Assigned Client Organization</Label>
              <Select
                value={newUser.clientId}
                onChange={(e) => setNewUser({ ...newUser, clientId: e.target.value })}
                required
              >
                <option value="">Select a Client...</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </Select>
              <p className="text-[10px] text-slate-500 mt-1">This user will be automatically added as a member of the selected client.</p>
            </div>
          )}
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

      {/* Invite Success Modal */}
      <Modal isOpen={!!inviteResult} onClose={() => setInviteResult(null)} title="User Created">
        {inviteResult && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
              <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
              <p className="text-sm text-emerald-300">
                Invite email sent to <strong>{inviteResult.email}</strong>
              </p>
            </div>
            <div>
              <Label>Backup invite link (in case email doesn't arrive)</Label>
              <div className="flex items-center gap-2 mt-2 p-2.5 bg-slate-800/50 rounded-lg border border-slate-700/50">
                <ExternalLink className="w-4 h-4 text-slate-500 shrink-0" />
                <p className="text-xs text-slate-400 truncate flex-1 font-mono">{inviteResult.link}</p>
                <CopyButton value={inviteResult.link} />
              </div>
              <p className="text-xs text-slate-500 mt-1.5">Link expires in 72 hours. Single-use only.</p>
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setInviteResult(null)}>Done</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>

  );
};

export default UsersAdmin;
