import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ProjectMember, Role, User, Permission } from '@/types';
import { api } from '@/services/api';
import { Button, Select, Badge, Avatar } from '../ui/UIComponents';
import { Modal } from '../ui/Modal';
import { Plus, Trash2, Shield, User as UserIcon } from 'lucide-react';
import { PermissionGate } from '../PermissionGate';

interface TeamTabProps {
    members: ProjectMember[];
    onUpdateRole: (userId: string, role: Role) => void;
    onAdd: (userId: string, role: Role) => void;
    onRemove: (userId: string) => void;
}

export const TeamTab: React.FC<TeamTabProps> = ({ members, onUpdateRole, onAdd, onRemove }) => {
    const { t } = useTranslation();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [availableUsers, setAvailableUsers] = useState<User[]>([]);
    const [selectedUser, setSelectedUser] = useState<string>('');
    const [selectedRole, setSelectedRole] = useState<Role>(Role.VIEWER);

    // Initial load of users for the dropdown
    useEffect(() => {
        if (isModalOpen) {
            loadUsers();
        }
    }, [isModalOpen]);

    const loadUsers = async () => {
        try {
            const users = await api.users.list();
            // Filter out existing members
            const existingIds = members.map(m => m.userId);
            setAvailableUsers(users.filter(u => !existingIds.includes(u.id)));
        } catch (e) {
            console.error("Failed to load users", e);
        }
    };

    const handleAdd = () => {
        if (selectedUser) {
            onAdd(selectedUser, selectedRole);
            setIsModalOpen(false);
            setSelectedUser('');
            setSelectedRole(Role.VIEWER);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-white">{t('project_team')}</h3>
                <PermissionGate permission={Permission.MANAGE_TEAM}>
                    <Button size="sm" onClick={() => setIsModalOpen(true)}>
                        <Plus className="w-4 h-4 mr-2" /> {t('add_member')}
                    </Button>
                </PermissionGate>
            </div>

            <div className="bg-slate-900/50 rounded-xl border border-slate-800 overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-900 text-slate-400 uppercase font-medium">
                        <tr>
                            <th className="p-4">{t('member')}</th>
                            <th className="p-4">{t('role')}</th>
                            <th className="p-4">{t('joined')}</th>
                            <th className="p-4 text-right">{t('actions')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                        {members.map(member => (
                            <tr key={member.id} className="hover:bg-slate-800/30 transition-colors">
                                <td className="p-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-cyan-400 font-bold">
                                            {member.name.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="font-medium text-white">{member.name}</p>
                                            <p className="text-xs text-slate-500">{member.userId}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="p-4">
                                    <PermissionGate permission={Permission.MANAGE_TEAM} fallback={<Badge variant="neutral">{member.role}</Badge>}>
                                        <select
                                            value={member.role}
                                            onChange={(e) => onUpdateRole(member.userId, e.target.value as Role)}
                                            className="bg-slate-800 border-none rounded text-xs text-white p-1 focus:ring-1 focus:ring-cyan-500"
                                        >
                                            {Object.values(Role).map(r => (
                                                <option key={r} value={r}>{r}</option>
                                            ))}
                                        </select>
                                    </PermissionGate>
                                </td>
                                <td className="p-4 text-slate-500">
                                    {new Date(member.joinedAt).toLocaleDateString()}
                                </td>
                                <td className="p-4 text-right">
                                    <PermissionGate permission={Permission.MANAGE_TEAM}>
                                        <button onClick={() => onRemove(member.userId)} className="text-slate-500 hover:text-red-400 transition-colors">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </PermissionGate>
                                </td>
                            </tr>
                        ))}
                        {members.length === 0 && (
                            <tr>
                                <td colSpan={4} className="p-8 text-center text-slate-500">
                                    {t('no_members')}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={t('add_team_member')}>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">{t('user')}</label>
                        <select
                            className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white focus:outline-none focus:border-cyan-500"
                            value={selectedUser}
                            onChange={(e) => setSelectedUser(e.target.value)}
                        >
                            <option value="">{t('select_user')}</option>
                            {availableUsers.map(u => (
                                <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">{t('role')}</label>
                        <select
                            className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white focus:outline-none focus:border-cyan-500"
                            value={selectedRole}
                            onChange={(e) => setSelectedRole(e.target.value as Role)}
                        >
                            {Object.values(Role).map(r => (
                                <option key={r} value={r}>{r}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex justify-end gap-3 mt-6">
                        <Button variant="ghost" onClick={() => setIsModalOpen(false)}>{t('cancel')}</Button>
                        <Button onClick={handleAdd} disabled={!selectedUser}>{t('add_member')}</Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};
