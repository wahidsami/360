import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { Briefcase, Flag, Clock, FileText } from 'lucide-react';
import { GlassCard, KpiCard, Badge, Button } from "@/components/ui/UIComponents";
import { ToolsPanel } from '@/components/ToolsPanel';
import { api } from '@/services/api';
import { Role } from '@/types';
import { useAuth } from '../../contexts/AuthContext';

export const ClientDashboard: React.FC<{ role: Role }> = ({ role }) => {
   const { t } = useTranslation();
   const { user } = useAuth();
   const navigate = useNavigate();
   const location = useLocation();
   const [stats, setStats] = useState<any>(null);
   const [loading, setLoading] = useState(true);

   useEffect(() => {
      const load = async () => {
         if (user) {
            const data = await api.dashboard.getClientStats();
            setStats(data);
         }
         setLoading(false);
      };
      load();
   }, [user]);

   useEffect(() => {
      if (location.hash !== '#shared-files') return;
      const timer = window.setTimeout(() => {
         const section = document.getElementById('shared-files');
         if (section) {
            section.scrollIntoView({ behavior: 'smooth', block: 'start' });
         }
      }, 0);
      return () => window.clearTimeout(timer);
   }, [location.hash, stats]);

   if (loading) return <div className="text-center p-10 text-slate-500">{t('loading_portal')}</div>;
   if (!stats) return <div className="text-center p-10 text-slate-500">{t('no_client_assoc')}</div>;
   const showUnassignedBanner = !stats.myProjects || stats.myProjects.length === 0;

   return (
      <div className="space-y-10">
         <div>
            <h1 className="text-4xl font-black font-display text-slate-900 dark:text-white uppercase tracking-tighter">{t('dashboard')}</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">{t('portfolio_overview')}</p>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <KpiCard label={t('active_projects')} value={stats.activeProjects} icon={<Briefcase />} />
            <KpiCard label={t('next_milestones')} value={stats.nextMilestonesCount ?? 0} icon={<Flag />} />
            <KpiCard label={t('pending_approvals')} value={stats.pendingApprovals ?? 0} icon={<Clock />} />
            <KpiCard label={t('shared_files')} value={stats.sharedFilesCount ?? 0} icon={<FileText />} />
         </div>

         {showUnassignedBanner && (
            <GlassCard className="border-[hsl(var(--brand-warning)/0.3)] bg-[hsl(var(--brand-warning)/0.08)]">
               <p className="text-sm font-black text-[hsl(var(--brand-warning))]">{t('no_assignment_title')}</p>
               <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">{t('no_assignment_message')}</p>
            </GlassCard>
         )}

         <ToolsPanel role={role} />

         <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
               <GlassCard title={t('my_projects')}>
                  <div className="space-y-4 mt-4">
                     {(stats.myProjects || []).map((p: any) => (
                        <div key={p.id} className="p-5 bg-slate-50/50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-700/50 rounded-2xl cursor-pointer hover:bg-white dark:hover:bg-slate-800/60 hover:shadow-lg transition-all group" onClick={() => navigate(`/app/projects/${p.id}`)}>
                           <div className="flex justify-between items-start mb-3">
                              <div>
                                 <h4 className="font-bold text-slate-800 dark:text-slate-200 tracking-tight group-hover:text-cyan-600 transition-colors">{p.name || t('untitled_project')}</h4>
                                 <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">{t('deadline_colon')} {p.deadline || t('no_deadline')}</p>
                              </div>
                              <Badge variant={p.health === 'good' ? 'success' : 'warning'} size="sm">{p.health || 'unknown'}</Badge>
                           </div>
                           <div className="w-full bg-slate-100 dark:bg-slate-900 rounded-full h-2 overflow-hidden shadow-inner">
                              <div className="bg-gradient-to-r from-cyan-400 to-blue-500 h-full rounded-full transition-all duration-1000 group-hover:scale-x-105 origin-left" style={{ width: `${p.progress || 0}%` }}></div>
                           </div>
                           <div className="flex justify-end mt-2 text-[10px] font-black text-cyan-600 dark:text-cyan-400 uppercase tracking-widest">{p.progress || 0}{t('percent_complete')}</div>
                        </div>
                     ))}
                     {(!stats.myProjects || stats.myProjects.length === 0) && <p className="text-slate-500 text-sm font-medium text-center py-6 italic">{t('no_active_projects')}</p>}
                  </div>
               </GlassCard>
            </div>

            <div className="space-y-6">
               <GlassCard id="shared-files" title={t('shared_files')}>
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
                     {(!stats.files || stats.files.length === 0) && <p className="text-slate-500 text-sm font-medium text-center py-6 italic">{t('no_shared_assets')}</p>}
                  </div>
               </GlassCard>
            </div>
         </div>
      </div>
   );
};
