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
               const data = await api.dashboard.getClientStats();
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
      <div className="space-y-10">
         <div>
            <h1 className="text-4xl font-black font-display text-slate-900 dark:text-white uppercase tracking-tighter">{t('dashboard')}</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">Project Portfolio Overview & Asset Registry.</p>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <KpiCard label={t('active_projects')} value={stats.activeProjects} icon={<Briefcase />} />
            <KpiCard label={t('next_milestones')} value={stats.nextMilestonesCount ?? 0} icon={<Flag />} />
            <KpiCard label="Pending Approvals" value="0" icon={<Clock />} />
            <KpiCard label={t('last_activity')} value={stats.latestUpdatesCount ?? 0} />
         </div>

         <ToolsPanel role={role} />

         <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
               <GlassCard title={t('my_projects')}>
                  <div className="space-y-4 mt-4">
                     {(stats.myProjects || []).map((p: any) => (
                        <div key={p.id} className="p-5 bg-slate-50/50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-700/50 rounded-2xl cursor-pointer hover:bg-white dark:hover:bg-slate-800/60 hover:shadow-lg transition-all group" onClick={() => navigate(`/app/projects/${p.id}`)}>
                           <div className="flex justify-between items-start mb-3">
                              <div>
                                 <h4 className="font-bold text-slate-800 dark:text-slate-200 tracking-tight group-hover:text-cyan-600 transition-colors">{p.name || 'Untitled Project'}</h4>
                                 <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">Deadline: {p.deadline || 'No deadline'}</p>
                              </div>
                              <Badge variant={p.health === 'good' ? 'success' : 'warning'} size="sm">{p.health || 'unknown'}</Badge>
                           </div>
                           <div className="w-full bg-slate-100 dark:bg-slate-900 rounded-full h-2 overflow-hidden shadow-inner">
                              <div className="bg-gradient-to-r from-cyan-400 to-blue-500 h-full rounded-full transition-all duration-1000 group-hover:scale-x-105 origin-left" style={{ width: `${p.progress || 0}%` }}></div>
                           </div>
                           <div className="flex justify-end mt-2 text-[10px] font-black text-cyan-600 dark:text-cyan-400 uppercase tracking-widest">{p.progress || 0}% Complete</div>
                        </div>
                     ))}
                     {(!stats.myProjects || stats.myProjects.length === 0) && <p className="text-slate-500 text-sm font-medium text-center py-6 italic">No active projects in portfolio.</p>}
                  </div>
               </GlassCard>
            </div>

            <div className="space-y-6">
               <GlassCard title={t('shared_files')}>
                  <div className="space-y-3 mt-4">
                     {(stats.files || []).map((f: any) => (
                        <div key={f.id} className="flex items-center gap-4 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-all border border-transparent hover:border-slate-100 dark:hover:border-slate-700/50 group">
                           <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 group-hover:text-cyan-500 transition-colors">
                              <FileText className="w-5 h-5" />
                           </div>
                           <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-slate-700 dark:text-slate-300 truncate tracking-tight">{f.name}</p>
                              <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-0.5">{new Date(f.uploadedAt).toLocaleDateString()}</p>
                           </div>
                        </div>
                     ))}
                     {(!stats.files || stats.files.length === 0) && <p className="text-slate-500 text-sm font-medium text-center py-6 italic">No shared assets available.</p>}
                  </div>
               </GlassCard>
            </div>
         </div>
      </div>
   );
};
