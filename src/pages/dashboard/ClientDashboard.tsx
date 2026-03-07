import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Briefcase, Flag, Clock, FileText, ArrowRight } from 'lucide-react';
import { GlassCard, KpiCard, Badge, Button } from "@/components/ui/UIComponents";
import { ToolsPanel } from '@/components/ToolsPanel';
import { api } from '@/services/api';
import { Role, Project, FileAsset } from '@/types';
import { useAuth } from '../../contexts/AuthContext';

export const ClientDashboard: React.FC<{ role: Role }> = ({ role }) => {
   const { t } = useTranslation();
   const { user } = useAuth();
   const navigate = useNavigate();
   const [stats, setStats] = useState<any>(null);
   const [loading, setLoading] = useState(true);

   useEffect(() => {
      const load = async () => {
         if (user) {
            const client = await api.clients.getMyClient(user.id);
            if (client) {
               const data = await api.dashboard.getClientStats(client.id);
               setStats(data);
            }
         }
         setLoading(false);
      };
      load();
   }, [user]);

   if (loading) return <div className="text-center p-10 text-slate-500">Loading Portal...</div>;
   if (!stats) return <div className="text-center p-10 text-slate-500">No client association found. Contact support.</div>;

   return (
      <div className="space-y-8">
         <div>
            <h1 className="text-3xl font-bold font-display text-white">{t('dashboard')}</h1>
            <p className="text-slate-400 mt-1">Project Portfolio Overview</p>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <KpiCard label={t('active_projects')} value={stats.activeProjects} icon={<Briefcase />} />
            <KpiCard label={t('next_milestones')} value={stats.nextMilestones} icon={<Flag />} />
            <KpiCard label="Pending Approvals" value="0" icon={<Clock />} />
            <KpiCard label={t('last_activity')} value={stats.latestUpdate ? new Date(stats.latestUpdate).toLocaleDateString() : 'N/A'} />
         </div>

         <ToolsPanel role={role} />

         <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
               <GlassCard title={t('my_projects')}>
                  <div className="space-y-4">
                     {(stats.projects as Project[]).map(p => (
                        <div key={p.id} className="p-4 bg-slate-800/40 border border-slate-700/50 rounded-lg cursor-pointer hover:border-cyan-500/30 transition-all" onClick={() => navigate(`/app/projects/${p.id}`)}>
                           <div className="flex justify-between items-start mb-2">
                              <div>
                                 <h4 className="font-bold text-slate-200">{p.name}</h4>
                                 <p className="text-xs text-slate-500">Deadline: {p.deadline}</p>
                              </div>
                              <Badge variant={p.health === 'good' ? 'success' : 'warning'}>{p.health}</Badge>
                           </div>
                           <div className="w-full bg-slate-900 rounded-full h-1.5 mt-2">
                              <div className="bg-cyan-500 h-1.5 rounded-full" style={{ width: `${p.progress}%` }}></div>
                           </div>
                           <div className="flex justify-end mt-1 text-xs text-cyan-400">{p.progress}% Complete</div>
                        </div>
                     ))}
                  </div>
               </GlassCard>
            </div>

            <div className="space-y-6">
               <GlassCard title={t('shared_files')}>
                  <div className="space-y-3">
                     {(stats.files as FileAsset[]).map(f => (
                        <div key={f.id} className="flex items-center gap-3 p-2 rounded hover:bg-slate-800/30">
                           <FileText className="w-4 h-4 text-slate-500" />
                           <div className="flex-1 min-w-0">
                              <p className="text-sm text-slate-300 truncate">{f.name}</p>
                              <p className="text-[10px] text-slate-500">{new Date(f.uploadedAt).toLocaleDateString()}</p>
                           </div>
                        </div>
                     ))}
                     {stats.files.length === 0 && <p className="text-slate-500 text-sm">No files shared yet.</p>}
                  </div>
               </GlassCard>
            </div>
         </div>
      </div>
   );
};
