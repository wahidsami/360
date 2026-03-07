import React from 'react';
import { Project, ProjectUpdate, Milestone, Task } from '@/types';
import { GlassCard, KpiCard, ProgressBar, Badge } from '../ui/UIComponents';
import { Activity, Calendar, CheckSquare, Clock, DollarSign, Flag } from 'lucide-react';
import { formatSAR } from '../../utils/currency';
import { formatDistanceToNow } from 'date-fns';
import { CustomFieldsSection } from '../CustomFieldsSection';

interface OverviewTabProps {
    project: Project;
    clientName?: string;
    stats?: {
        taskCount: number;
        completedTasks: number;
        milestoneCount: number;
        completedMilestones: number;
        budget: number;
        spent: number;
    };
    recentUpdates?: ProjectUpdate[];
}

export const OverviewTab: React.FC<OverviewTabProps> = ({ project, clientName, stats, recentUpdates = [] }) => {
    // Calculate progress if not provided
    const taskProgress = stats?.taskCount ? Math.round((stats.completedTasks / stats.taskCount) * 100) : 0;
    const milestoneProgress = stats?.milestoneCount ? Math.round((stats.completedMilestones / stats.milestoneCount) * 100) : 0;

    return (
        <div className="space-y-6">
            {/* Top Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KpiCard
                    label="Project Health"
                    value={<Badge variant={project.health === 'good' || project.health === 'GOOD' ? 'success' : project.health === 'at-risk' || project.health === 'AT_RISK' ? 'warning' : 'danger'}>{project.health}</Badge>}
                    icon={<Activity />}
                />
                <KpiCard
                    label="Progress"
                    value={`${project.progress}%`}
                    icon={<Clock />}
                    trend={taskProgress > 0 ? `Tasks: ${taskProgress}%` : undefined}
                    trendUp={true}
                />
                <KpiCard
                    label="Budget"
                    value={formatSAR(stats?.budget || 0)}
                    icon={<DollarSign />}
                    trend={stats?.spent ? `Spent: ${formatSAR(stats.spent)}` : undefined}
                />
                <KpiCard
                    label="Milestones"
                    value={`${stats?.completedMilestones || 0}/${stats?.milestoneCount || 0}`}
                    icon={<Flag />}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Info */}
                <div className="lg:col-span-2 space-y-6">
                    <GlassCard className="p-6">
                        <h3 className="text-lg font-bold text-white mb-4">Project Description</h3>
                        <p className="text-slate-300 leading-relaxed">
                            {project.description || "No description provided for this project."}
                        </p>

                        <div className="mt-6">
                            <h4 className="text-sm font-medium text-slate-400 mb-2">Overall Progress</h4>
                            <ProgressBar progress={project.progress} className="h-4" />
                        </div>
                    </GlassCard>

                    <GlassCard className="p-6">
                        <h3 className="text-lg font-bold text-white mb-4">Recent Activity</h3>
                        <div className="space-y-4">
                            {recentUpdates.length === 0 ? (
                                <p className="text-slate-500">No recent updates.</p>
                            ) : (
                                recentUpdates.map(update => (
                                    <div key={update.id} className="flex gap-4 border-b border-slate-700/50 pb-4 last:border-0 last:pb-0">
                                        <div className="mt-1 p-2 rounded-full bg-slate-800 text-cyan-400">
                                            <Activity className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-slate-200">{update.title}</p>
                                            <p className="text-xs text-slate-400 mt-1">{update.content}</p>
                                            <p className="text-[10px] text-slate-500 mt-1">
                                                {formatDistanceToNow(new Date(update.timestamp), { addSuffix: true })} by {update.authorName}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </GlassCard>
                </div>

                {/* Sidebar Info */}
                <div className="space-y-6">
                    <GlassCard className="p-6">
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Details</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs text-slate-500">Client</label>
                                <p className="text-slate-200 font-medium">{clientName || "Unknown Client"}</p>
                            </div>
                            <div>
                                <label className="text-xs text-slate-500">Start Date</label>
                                <p className="text-slate-200 font-medium">
                                    {project.startDate ? new Date(project.startDate).toLocaleDateString() : 'Not set'}
                                </p>
                            </div>
                            <div>
                                <label className="text-xs text-slate-500">End Date</label>
                                <p className="text-slate-200 font-medium">
                                    {project.deadline || (project as any).endDate ? new Date(project.deadline || (project as any).endDate).toLocaleDateString() : 'Not set'}
                                </p>
                            </div>
                            <div>
                                <label className="text-xs text-slate-500">Status</label>
                                <div className="mt-1">
                                    <Badge>{project.status}</Badge>
                                </div>
                            </div>
                        </div>
                    </GlassCard>

                    <GlassCard className="p-6">
                        <CustomFieldsSection entityType="PROJECT" entityId={project.id} />
                    </GlassCard>
                </div>
            </div>
        </div>
    );
};
