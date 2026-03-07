import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Eye, Archive, Folder } from 'lucide-react';
import { Project, Client, Permission } from '../types';
import { api } from '../services/api';
import { GlassCard, Button, Badge, Input, Select } from '../components/ui/UIComponents';
import { PermissionGate } from '../components/PermissionGate';

export const ProjectsList: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Record<string, string>>({});
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterProjects();
  }, [searchTerm, statusFilter, projects]);

  const loadData = async () => {
    setLoading(true);
    const [pList, cList] = await Promise.all([
      api.projects.list(),
      api.clients.list()
    ]);

    // Map client IDs to names
    const clientMap: Record<string, string> = {};
    cList.forEach(c => clientMap[c.id] = c.name);

    setClients(clientMap);
    setProjects(pList);
    setLoading(false);
  };

  const filterProjects = () => {
    let result = projects;
    if (searchTerm) {
      result = result.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    if (statusFilter !== 'all') {
      result = result.filter(p => p.status === statusFilter);
    }
    setFilteredProjects(result);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-display text-white">{t('projects')}</h1>
          <p className="text-slate-400">Manage all active and planned missions.</p>
        </div>
        <PermissionGate permission={Permission.MANAGE_PROJECTS}>
          <Button onClick={() => navigate('new')} className="shadow-lg shadow-cyan-500/20">
            <Plus className="w-4 h-4 mr-2" /> {t('add_project')}
          </Button>
        </PermissionGate>
      </div>

      <GlassCard className="p-4">
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 w-5 h-5 text-slate-500 rtl:right-3 rtl:left-auto" />
            <Input
              placeholder={t('search')}
              className="pl-10 rtl:pr-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-40">
            <option value="all">{t('all_statuses')}</option>
            <option value="planning">Planning</option>
            <option value="in_progress">In Progress</option>
            <option value="testing">Testing</option>
            <option value="deployed">Deployed</option>
            <option value="maintenance">Maintenance</option>
            <option value="archived">Archived</option>
          </Select>
        </div>
      </GlassCard>

      <GlassCard className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-700/50 text-slate-400 text-sm">
                <th className="p-6 font-medium">{t('project_name')}</th>
                <th className="p-6 font-medium">{t('client_name')}</th>
                <th className="p-6 font-medium">{t('status')}</th>
                <th className="p-6 font-medium">{t('health')}</th>
                <th className="p-6 font-medium">{t('progress')}</th>
                <th className="p-6 font-medium">{t('deadline')}</th>
                <th className="p-6 font-medium text-right">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                <tr><td colSpan={7} className="p-8 text-center text-slate-500">Retrieving mission data...</td></tr>
              ) : filteredProjects.length === 0 ? (
                <tr><td colSpan={7} className="p-8 text-center text-slate-500">No projects found.</td></tr>
              ) : (
                filteredProjects.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-800/30 transition-colors cursor-pointer group" onClick={() => navigate(p.id)}>
                    <td className="p-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-cyan-900/20 text-cyan-400 flex items-center justify-center">
                          <Folder className="w-5 h-5" />
                        </div>
                        <span className="font-medium text-slate-200">{p.name}</span>
                      </div>
                    </td>
                    <td className="p-6 text-slate-400">{clients[p.clientId] || 'Unknown'}</td>
                    <td className="p-6"><Badge variant="neutral">{p.status}</Badge></td>
                    <td className="p-6">
                      <Badge variant={p.health === 'good' ? 'success' : p.health === 'at-risk' ? 'warning' : 'danger'}>
                        {p.health.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="p-6">
                      <div className="w-full bg-slate-800 rounded-full h-1.5 w-24">
                        <div className="bg-cyan-500 h-1.5 rounded-full" style={{ width: `${p.progress}%` }} />
                      </div>
                      <span className="text-xs text-slate-500 mt-1 block">{p.progress}%</span>
                    </td>
                    <td className="p-6 text-slate-400 text-sm">{p.deadline || (p as any).endDate}</td>
                    <td className="p-6 text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => navigate(p.id)}><Eye className="w-4 h-4" /></Button>
                        <PermissionGate permission={Permission.MANAGE_PROJECTS}>
                          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); navigate(`${p.id}/edit`); }}>
                            <Folder className="w-4 h-4 text-slate-400 hover:text-amber-400" />
                          </Button>
                        </PermissionGate>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
};
