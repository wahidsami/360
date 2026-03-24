import React from 'react';
import { useTranslation } from 'react-i18next';
import { Project, ProjectUpdate, Milestone, Task, ProjectReadiness, ReadinessAction, Permission, Role } from '@/types';
import { GlassCard, KpiCard, ProgressBar, Badge, Button } from '../ui/UIComponents';
import { Activity, Calendar, Clock, DollarSign, Flag, ArrowRight, CheckCircle, XCircle, AlertCircle, Info, Sparkles, Lock } from 'lucide-react';
import { formatSAR } from '../../utils/currency';
import { formatDistanceToNow } from 'date-fns';
import { CustomFieldsSection } from '../CustomFieldsSection';
import { useAuth } from '@/contexts/AuthContext';

interface OverviewTabProps {
    project: Project;
    clientName?: string;
    stats?: {
        taskCount: number;
        completedTasks: number;
        overdueTasks: number;
        milestoneCount: number;
        completedMilestones: number;
        atRiskMilestones: number;
        upcomingMilestones: number;
        findingCount: number;
        unresolvedFindings: number;
        pendingReports: number;
        budget: number;
        spent: number;
    };
    tasks?: any[]; // Full Task objects for inline previews
    findings?: any[]; // For severity analysis inside component
    milestones?: any[]; // For next milestone logic
    recentUpdates?: ProjectUpdate[];
    onAction?: (action: ReadinessAction) => void;
    onNavigate?: (tab: string) => void; // Keep for backward compatibility/quick links
    allowedTabs?: string[];
    readiness?: ProjectReadiness | null;
    metrics?: any;
    activity?: any[];
}

// --- NEW SUB-COMPONENTS ---
function ChecklistSection({ title, items, isComplete, onAction, onNavigate }: { title: string, items: any[], isComplete: boolean, onAction?: any, onNavigate?: any }) {
    const [isExpanded, setIsExpanded] = React.useState(!isComplete);

    return (
        <div className="bg-white dark:bg-slate-900/40 rounded-2xl border border-slate-200 dark:border-slate-800/60 p-6 flex flex-col mb-4 shadow-sm hover:shadow-md transition-all">
            <div
                className="flex items-center justify-between cursor-pointer mb-2"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-2">
                    <Badge variant="neutral" className="bg-cyan-500/10 text-cyan-400 border-cyan-400/20 uppercase text-[9px] tracking-widest font-black">{title}</Badge>
                    <CheckCircle className={`w-3.5 h-3.5 ${isComplete ? 'text-emerald-500' : 'text-slate-700'}`} />
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-500 font-bold">{items.filter(i => i.status === 'complete').length}/{items.length}</span>
                    <span className="text-slate-500 text-[10px]">{isExpanded ? '▼' : '▶'}</span>
                </div>
            </div>

            {isExpanded && (
                <div className="space-y-1.5 max-h-[160px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800 pr-2 mt-2 font-sans">
                    {items.filter(i => i.status !== 'not_applicable').map((item) => (
                        <div key={item.id} className={`flex items-center gap-3 p-1.5 rounded transition-colors ${item.status === 'complete' ? 'opacity-40' : item.status === 'missing' && item.type === 'required' ? 'bg-rose-50 border border-rose-100 dark:bg-rose-500/10 dark:border-rose-500/20' : 'bg-slate-50 dark:bg-slate-800/20'}`}>
                            <div className="shrink-0">
                                {item.status === 'complete' ? <CheckCircle className="w-3 h-3 text-slate-400" /> : <AlertCircle className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400" />}
                            </div>
                            <div className="flex-grow flex justify-between items-center break-all text-left">
                                <span className={`text-[10px] font-bold tracking-wider ${item.status === 'complete' ? 'text-slate-400' : item.status === 'missing' && item.type === 'required' ? 'text-rose-900 dark:text-white' : 'text-slate-600 dark:text-slate-300'}`}>{item.label}</span>
                                {item.action && item.status !== 'complete' && (
                                    <Button variant="ghost" size="sm" className="h-6 text-[9px] uppercase font-black text-rose-500 hover:text-rose-600 dark:text-rose-400 dark:hover:text-rose-300 px-2" onClick={(e) => { e.stopPropagation(); if (item.action.type === 'navigate_tab') { onNavigate?.(item.action.target); } else { onAction?.(item.action); } }}>
                                        Fix &rarr;
                                    </Button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function ActivityFeed({ activities, onNavigate }: { activities: any[], onNavigate?: any }) {
    const { t } = useTranslation();
    const getActivityIcon = (type: string) => {
        const icons: Record<string, string> = { task_overdue: '⏰', task_completed: '✅', finding_created: '📝', milestone_completed: '🎯', milestone_missed: '⚠️', budget_alert: '💰', member_added: '👤', file_uploaded: '📄', update_posted: '📢', blocker_created: '🚧' };
        return icons[type] || '•';
    };

    return (
        <GlassCard className="p-6 border-slate-200 dark:border-slate-800 bg-white">
            <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">RECENT ACTIVITY</h4>
            <div className="space-y-4 max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800 pr-2">
                {activities.map(activity => (
                    <div key={activity.id} className="flex gap-3 text-sm">
                        <div className="shrink-0 w-6 h-6 flex justify-center items-center bg-slate-50 dark:bg-slate-800/50 rounded-full text-[10px] border border-slate-200 dark:border-slate-700">
                            {getActivityIcon(activity.action || activity.type)}
                        </div>
                        <div className="flex-grow">
                            <p className="text-[10px] text-slate-400 mb-0.5 font-bold uppercase tracking-tighter">{formatDistanceToNow(new Date(activity.createdAt || activity.timestamp || Date.now()), { addSuffix: true })}</p>
                            <p className="text-xs text-slate-600 dark:text-slate-300 font-medium leading-normal">{activity.description || 'Action performed'}</p>
                        </div>
                    </div>
                ))}
                {activities.length === 0 && <p className="text-xs text-slate-500 italic text-center py-4">No recent activity.</p>}
            </div>
        </GlassCard>
    );
}

function calculateVelocity(tasks: any[]) {
    const completedTasks = tasks.filter(t => t.status?.toLowerCase() === 'done' && (t.completedAt || t.updatedAt));
    if (completedTasks.length === 0) return 0;

    const oldestCompletion = new Date(Math.min(...completedTasks.map(t => new Date(t.completedAt || t.updatedAt).getTime())));
    const daysSinceFirstCompletion = (Date.now() - oldestCompletion.getTime()) / (1000 * 60 * 60 * 24);

    return completedTasks.length / Math.max(daysSinceFirstCompletion, 1);
}

function PredictiveInsights({ project, tasks, milestones, metrics }: { project: any, tasks: any[], milestones: any[], metrics: any }) {
    const { t } = useTranslation();
    const insights = React.useMemo(() => {
        const predictions: any[] = [];

        // Completion date prediction
        const completedTasks = tasks.filter(t => t.status?.toLowerCase() === 'done').length;
        const totalTasks = tasks.length;
        const velocity = calculateVelocity(tasks);

        if (velocity > 0 && totalTasks > completedTasks) {
            const remainingTasks = totalTasks - completedTasks;
            const daysToComplete = Math.ceil(remainingTasks / velocity);
            const projectedDate = new Date(Date.now() + daysToComplete * 24 * 60 * 60 * 1000);
            const plannedDate = new Date(project.deadline || project.endDate || Date.now());
            const variance = Math.ceil((projectedDate.getTime() - plannedDate.getTime()) / (1000 * 60 * 60 * 24));

            if (variance > 0) {
                predictions.push({
                    type: 'schedule_risk',
                    severity: variance > 14 ? 'high' : 'medium',
                    message: `At current velocity, projected completion: ${projectedDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`,
                    impact: `${variance} days late`,
                    icon: '📊'
                });
            }
        }

        // Unassigned blocker detection
        const unassignedTasks = tasks.filter(t => (!t.assigneeId && !t.assignee) && t.status?.toLowerCase() !== 'done');
        const dependentTasks = tasks.filter((t: any) =>
            t.dependencies?.some((depId: string) => unassignedTasks.find(ut => ut.id === depId)) ||
            project.taskDependencies?.some((td: any) => td.dependentTaskId === t.id && unassignedTasks.find(ut => ut.id === td.dependsOnId))
        );

        if (unassignedTasks.length > 0 && dependentTasks.length > 0) {
            predictions.push({
                type: 'assignment_gap',
                severity: 'medium',
                message: `${unassignedTasks.length} unassigned tasks blocking ${dependentTasks.length} dependent items`,
                impact: 'Work cannot proceed',
                icon: '👤'
            });
        }

        // Team overallocation
        const overallocated = metrics?.capacity?.overallocated || [];
        if (overallocated.length > 0) {
            const totalOverallocation = overallocated.reduce((sum: number, m: any) => sum + (m.allocationPercent - 100), 0);
            predictions.push({
                type: 'capacity_risk',
                severity: totalOverallocation > 50 ? 'high' : 'medium',
                message: `Team overallocated by ${Math.round(totalOverallocation)}%`,
                impact: `${overallocated.length} member(s) at risk of burnout`,
                icon: '⚡'
            });
        }

        return predictions;
    }, [project, tasks, milestones, metrics]);

    if (insights.length === 0) return null;

    return (
        <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/60 rounded-2xl p-6 flex flex-col gap-3 mb-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
                <span className="text-base">🔮</span>
                <h3 className="text-[11px] font-black tracking-widest uppercase text-slate-900 dark:text-slate-400">{t('predictive_insights')}</h3>
            </div>
            <div className="space-y-2">
                {insights.map((insight, idx) => (
                    <div key={idx} className={`flex items-start gap-3 p-3 rounded-xl border ${insight.severity === 'high' ? 'bg-rose-50 dark:bg-rose-500/10 border-rose-100 dark:border-rose-500/20 text-rose-700 dark:text-rose-300' : 'bg-amber-50 dark:bg-amber-500/10 border-amber-100 dark:border-amber-500/20 text-amber-700 dark:text-amber-300'}`}>
                        <span className="text-lg mt-0.5">{insight.icon}</span>
                        <div>
                            <p className="text-sm font-bold leading-tight mb-0.5">{insight.message}</p>
                            <p className="text-[10px] uppercase font-black tracking-wider opacity-60">{insight.impact}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function PrimaryActionCard({ action, onNavigate, allowedTabs = [] }: { action: any, onNavigate?: any, allowedTabs?: string[] }) {
    const { t } = useTranslation();
    if (!action) return null;

    // Map severity to colors
    const severityColors: Record<string, string> = {
        critical_findings: 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/20',
        overdue_tasks: 'bg-orange-50 dark:bg-orange-500/10 border-orange-200 dark:border-orange-500/20',
        at_risk_milestones: 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20',
        stale_communication: 'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/20',
        setup_required: 'bg-cyan-50 dark:bg-cyan-500/10 border-cyan-200 dark:border-cyan-500/20',
        planning_required: 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20',
        on_track: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20'
    };

    const iconColors: Record<string, string> = {
        critical_findings: 'text-rose-600 bg-rose-100 dark:text-rose-400 dark:bg-rose-500/20',
        overdue_tasks: 'text-orange-600 bg-orange-100 dark:text-orange-400 dark:bg-orange-500/20',
        at_risk_milestones: 'text-amber-600 bg-amber-100 dark:text-amber-400 dark:bg-amber-500/20',
        stale_communication: 'text-indigo-600 bg-indigo-100 dark:text-indigo-400 dark:bg-indigo-500/20',
        setup_required: 'text-cyan-600 bg-cyan-100 dark:text-cyan-400 dark:bg-cyan-500/20',
        planning_required: 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-500/20',
        on_track: 'text-emerald-600 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-500/20'
    };

    return (
        <div className={`${severityColors[action.type] || 'bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'} border rounded-2xl p-6 flex flex-col gap-4 shadow-sm hover:shadow-xl transition-all duration-300`}>
            <div className="flex items-start gap-4">
                <div className={`shrink-0 p-2 rounded-lg ${iconColors[action.type] || 'text-slate-400 bg-slate-800'}`}>
                    <Sparkles className="w-5 h-5" />
                </div>
                <div className="flex-grow">
                    <p className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-60 text-slate-500 dark:text-slate-400">{t('primary_action')}</p>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">{t(action.title, { defaultValue: action.title })}</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 font-medium">{t(action.description, { defaultValue: action.description })}</p>

                    {action.details && (
                        <div className="mt-3 space-y-2">
                            {action.details.recommendation && (
                                <p className="text-[11px] font-bold italic text-slate-700 dark:text-white/90 border-l-2 pl-2 border-current">{action.details.recommendation}</p>
                            )}
                            {action.details.findings && (
                                <div className="text-[10px] bg-white/40 dark:bg-black/20 rounded p-2 mt-2 border border-black/5 dark:border-white/5">
                                    <strong className="text-slate-900 dark:text-white/90">Critical findings:</strong>
                                    <ul className="list-disc list-inside mt-1 text-slate-700 dark:text-slate-300 space-y-0.5">
                                        {action.details.findings.slice(0, 2).map((f: any, i: number) => (
                                            <li key={i} className="truncate">{f}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 mt-auto">
                {action.actions?.map((btn: any, idx: number) => {
                    if (btn.route && allowedTabs.length && !allowedTabs.includes(btn.route)) return null;
                    return (
                        <React.Fragment key={idx}>
                            <Button
                                size="sm"
                                variant={btn.primary ? 'primary' : 'outline'}
                                className={`w-full sm:w-auto font-black uppercase tracking-widest text-[10px] px-4 ${btn.primary ? '' : 'text-slate-600 dark:text-slate-300 border-slate-300/50 hover:bg-white'}`}
                                onClick={() => onNavigate?.(btn.route)}
                            >
                                {btn.label} <ArrowRight className="ml-1.5 w-3 h-3" />
                            </Button>
                        </React.Fragment>
                    );
                })}
            </div>
        </div>
    );
}

function QuickActionsPanel({ onNavigate, onRefresh, overdueCount, allowedTabs = [] }: { onNavigate?: any, onRefresh?: () => void, overdueCount: number, allowedTabs?: string[] }) {
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = React.useState(false);
    const canSee = (id: string) => allowedTabs.includes(id);
    const { user } = useAuth();
    const clientRoles = [Role.CLIENT_OWNER, Role.CLIENT_MANAGER, Role.CLIENT_MEMBER];
    const isClient = user && clientRoles.includes(user.role);

    return (
        <div className="relative">
            <Button
                onClick={() => setIsOpen(!isOpen)}
                variant="primary"
                className="bg-cyan-500 hover:bg-cyan-600 text-slate-900 border-none shadow-[0_0_15px_rgba(34,211,238,0.3)] hover:shadow-[0_0_20px_rgba(34,211,238,0.5)] font-black uppercase tracking-widest text-[10px] px-6 h-10 transition-all rounded-xl"
            >
                {t('quick_actions_btn')}
            </Button>

            {isOpen && (
                <div className="absolute top-12 right-0 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden flex flex-col p-1 animate-in fade-in slide-in-from-top-2 duration-200">
                    {canSee('tasks') && (
                        <button onClick={() => { setIsOpen(false); onNavigate?.('tasks'); }} className="flex items-center gap-3 w-full text-left px-4 py-2.5 text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white rounded-lg transition-colors">
                            <span className="text-emerald-500">➕</span> Add Task
                        </button>
                    )}
                    {canSee('updates') && (
                        <button onClick={() => { setIsOpen(false); onNavigate?.('updates'); }} className="flex items-center gap-3 w-full text-left px-4 py-2.5 text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white rounded-lg transition-colors">
                            <span className="text-cyan-600">📋</span> Post Update
                        </button>
                    )}
                    {canSee('findings') && !isClient && (
                        <button onClick={() => { setIsOpen(false); onNavigate?.('findings'); }} className="flex items-center gap-3 w-full text-left px-4 py-2.5 text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white rounded-lg transition-colors">
                            <span className="text-rose-500">⚠️</span> Log Risk/Finding
                        </button>
                    )}

                    {canSee('tasks') && overdueCount > 0 && (
                        <button onClick={() => { setIsOpen(false); onNavigate?.('tasks'); }} className="flex items-center gap-3 w-full text-left px-4 py-2.5 text-[11px] font-bold text-orange-700 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-500/10 rounded-lg transition-colors mt-1 border border-orange-200 dark:border-orange-500/20 bg-orange-50 dark:bg-orange-500/5">
                            <span>✅</span> Complete Overdue ({overdueCount})
                        </button>
                    )}

                    {canSee('reports') && (
                        <>
                            <div className="h-px bg-slate-100 dark:bg-slate-800 my-1 mx-2" />
                            <button onClick={() => { setIsOpen(false); alert('Export functionality coming soon!'); }} className="flex items-center gap-3 w-full text-left px-4 py-2.5 text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white rounded-lg transition-colors">
                                <span className="text-indigo-600">📊</span> Export Report
                            </button>
                        </>
                    )}
                    
                    <button onClick={() => {
                        setIsOpen(false);
                        if (onRefresh) onRefresh();
                    }}
                        className="flex items-center gap-3 w-full text-left px-4 py-2.5 text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white rounded-lg transition-colors"
                    >
                        <span className="text-blue-600">🔄</span> Refresh Data
                    </button>
                </div>
            )}
        </div>
    );
}

export const OverviewTab: React.FC<OverviewTabProps & { onRefresh?: () => void }> = ({ project, clientName, stats, tasks = [], findings = [], milestones = [], recentUpdates = [], onAction, onNavigate, onRefresh, allowedTabs = [], readiness, metrics, activity = [] }) => {
    const { t } = useTranslation();
    // Derived operational metrics
    const taskCount = stats?.taskCount || 0;
    const completedTasks = stats?.completedTasks || 0;
    const overdueTasks = stats?.overdueTasks || 0;
    const activeTasks = Math.max(0, taskCount - completedTasks - overdueTasks);

    const formatRelativeDate = (date: string) => {
        const due = new Date(date);
        due.setHours(23, 59, 59, 999);
        const days = Math.ceil((due.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        if (days === 0) return 'today';
        if (days === 1) return 'tomorrow';
        if (days > 1 && days < 7) return `in ${days} days`;
        return new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    };

    const taskPreviews = (tasks || [])
        .filter(t => t.status?.toLowerCase() !== 'done')
        .map(t => {
            let isOverdue = false;
            let daysRef = Infinity;
            let dueText = 'No due date';

            if (t.dueDate) {
                const due = new Date(t.dueDate);
                due.setHours(23, 59, 59, 999);
                const now = new Date();

                daysRef = (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
                isOverdue = daysRef < 0;

                if (isOverdue) {
                    const daysLate = Math.ceil(Math.abs(daysRef));
                    dueText = `${daysLate} day${daysLate === 1 ? '' : 's'} late`;
                } else {
                    dueText = `Due ${formatRelativeDate(t.dueDate)}`;
                }
            }

            return { ...t, isOverdue, daysRef, dueText };
        })
        .sort((a, b) => {
            if (a.isOverdue && !b.isOverdue) return -1;
            if (!a.isOverdue && b.isOverdue) return 1;
            return a.daysRef - b.daysRef;
        });

    const milestoneCount = stats?.milestoneCount || 0;
    const completedMilestones = stats?.completedMilestones || 0;
    const atRiskMilestones = stats?.atRiskMilestones || 0;
    const missedMilestonesList = (milestones || []).filter(m => m.status?.toUpperCase() !== 'COMPLETED' && m.dueDate && new Date(m.dueDate) < new Date());

    const daysUntilDeadline = project.deadline || (project as any).endDate
        ? Math.ceil((new Date(project.deadline || (project as any).endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : null;

    const findingCount = stats?.findingCount || 0;
    const unresolvedFindings = stats?.unresolvedFindings || 0;
    const resolvedFindings = Math.max(0, findingCount - unresolvedFindings);

    const findingsBySeverity = (findings || []).reduce((acc: any, f) => {
        const status = f.status?.toUpperCase();
        if (status !== 'CLOSED' && status !== 'DISMISSED') {
            const sev = f.severity?.toUpperCase() || 'LOW';
            acc[sev] = (acc[sev] || 0) + 1;
        }
        return acc;
    }, {} as Record<string, number>);

    const openFindings = (findings || []).filter(f => !['CLOSED', 'DISMISSED'].includes(f.status?.toUpperCase()));
    const mostCriticalFinding = openFindings.sort((a, b) => {
        const severityOrder: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
        return (severityOrder[a.severity?.toUpperCase()] ?? 4) - (severityOrder[b.severity?.toUpperCase()] ?? 4);
    })[0];

    const nextMilestone = (milestones || [])
        .filter(m => m.status?.toUpperCase() !== 'COMPLETED')
        .sort((a, b) => {
            const timeA = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
            const timeB = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
            return timeA - timeB;
        })[0];

    const lastUpdateAge = recentUpdates[0] ? formatDistanceToNow(new Date(recentUpdates[0].timestamp), { addSuffix: true }) : 'No update posted yet';
    const isStale = recentUpdates[0] ? (Date.now() - new Date(recentUpdates[0].timestamp).getTime()) > 7 * 24 * 60 * 60 * 1000 : true;

    const canSee = (tabId: string) => allowedTabs.includes(tabId);

    return (
        <div className="space-y-8 pb-12">
            <div className="flex justify-between items-center w-full border-b border-slate-200 dark:border-slate-800 pb-4 mb-2">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white px-2">{t('project_dashboard')}</h2>
                <QuickActionsPanel onNavigate={onNavigate} onRefresh={onRefresh} overdueCount={overdueTasks} allowedTabs={allowedTabs} />
            </div>

            {/* TOP ROW: Stage, Status & Next Best Action */}
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
                {/* Stage & Status Banner */}
                <GlassCard className="xl:col-span-3 p-0 overflow-hidden border-cyan-200 dark:border-cyan-500/20 bg-gradient-to-br from-white via-white to-cyan-50/30 dark:from-slate-900 dark:via-slate-900 dark:to-cyan-500/5 shadow-md border-l-4 border-l-cyan-400 dark:border-l-cyan-500">
                    <div className="flex flex-col md:flex-row h-full">
                        {/* Status Sidebar */}
                        <div className="w-full md:w-48 bg-cyan-500/10 flex flex-col items-center justify-center p-6 border-b md:border-b-0 md:border-r border-cyan-500/20">
                            <div className="p-3 bg-cyan-500/20 rounded-2xl text-cyan-400 mb-3 shadow-[0_0_20px_rgba(34,211,238,0.2)]">
                                <Activity className="w-8 h-8" />
                            </div>
                            <Badge variant={project.status === 'in_progress' ? 'info' : project.status === 'completed' ? 'success' : 'neutral'} className="px-3 py-1 text-xs uppercase tracking-widest font-black">
                                {t(`status_${project.status.toLowerCase()}`, { defaultValue: project.status.replace(/_/g, ' ') })}
                            </Badge>
                            <p className="text-[10px] text-cyan-400/60 font-bold mt-2 uppercase tracking-tighter">{t('current_status')}</p>
                        </div>

                        {/* Stage Progress */}
                        <div className="flex-grow p-6 flex flex-col justify-center gap-6">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="space-y-1">
                                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                                        {t('stage')}: <span className="text-cyan-600 dark:text-cyan-400">{t(`stage_${(readiness?.stage || 'SETUP').toLowerCase()}`).toUpperCase()}</span>
                                    </h2>
                                    <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                                        {t(`stage_desc_${(readiness?.stage || 'SETUP').toLowerCase()}`, { defaultValue: readiness?.stageExplanation || 'Initial project parameters and team setup required.' })}
                                    </p>
                                </div>

                                <div className="flex items-center gap-0 pt-2 pb-6 mr-4 sm:mr-8 md:mr-10">
                                    {['SETUP', 'PLANNING', 'ACTIVE', 'REVIEW', 'DONE'].map((s, idx) => {
                                        const stages = ['SETUP', 'PLANNING', 'ACTIVE', 'REVIEW', 'DONE', 'READY_FOR_BILLING'];
                                        const isCurrent = (readiness?.stage || 'SETUP') === s;
                                        const isPassed = stages.indexOf(readiness?.stage || 'SETUP') > idx;
                                        return (
                                            <div key={s} className="flex items-center">
                                                <div className="flex flex-col items-center relative">
                                                    <div
                                                        className={`w-4 h-4 rounded-full border-2 z-10 ${isCurrent ? 'bg-cyan-400 border-cyan-100 shadow-[0_0_15px_rgba(34,211,238,0.8)]' : isPassed ? 'bg-emerald-500 border-emerald-300' : 'bg-slate-800 border-slate-600'}`}
                                                        title={t(`stage_${s.toLowerCase()}`)}
                                                    />
                                                    <span className={`text-[10px] font-bold uppercase tracking-wider absolute top-6 left-1/2 -translate-x-1/2 whitespace-nowrap ${isCurrent ? 'text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]' : isPassed ? 'text-emerald-500/90' : 'text-slate-500'}`}>
                                                        {t(`stage_${s.toLowerCase()}`)}
                                                    </span>
                                                </div>
                                                {idx < 4 && <div className={`w-8 sm:w-12 h-0.5 ${isPassed ? 'bg-emerald-500/60' : 'bg-slate-700'}`} />}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Predictive Insights */}
                            <PredictiveInsights project={project} tasks={tasks} milestones={milestones} metrics={metrics} />

                            {/* Primary Alert / Action Card */}
                            <PrimaryActionCard action={readiness?.nextAction} onNavigate={onNavigate} allowedTabs={allowedTabs} />
                        </div>
                    </div>
                </GlassCard>

                {/* Readiness Score (Compressed) */}
                <GlassCard className="p-6 flex flex-col items-center justify-center gap-3 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50">
                    <div className="relative w-24 h-24">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                            <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-100 dark:text-slate-800" />
                            <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray={2 * Math.PI * 40} strokeDashoffset={2 * Math.PI * 40 * (1 - (readiness?.completeness || 0) / 100)} className="text-cyan-500 dark:text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.2)]" strokeLinecap="round" />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center flex-col">
                            <span className="text-xl font-black text-slate-900 dark:text-white">{readiness?.completeness || 0}%</span>
                        </div>
                    </div>
                    <div className="text-center">
                        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{t('workflow_readiness', { defaultValue: 'WORKFLOW READINESS' })}</h4>
                        <p className="text-[10px] text-cyan-600 dark:text-cyan-400/80 font-bold">{readiness?.stats?.completedRequired || 0} of {readiness?.stats?.totalRequired || 0} {t('setup_checks_complete')}</p>
                    </div>
                </GlassCard>
            </div>

            {/* MIDDLE ROW: Operational Health Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                {/* Task Health */}
                <GlassCard className={`p-6 border-t-4 border-t-blue-500 dark:border-slate-800 bg-white transition-colors flex flex-col h-full ${canSee('tasks') ? 'hover:border-slate-300 dark:hover:border-slate-700 cursor-pointer group' : ''}`} onClick={() => canSee('tasks') && onNavigate?.('tasks')}>
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-blue-50 dark:bg-blue-500/10 rounded-xl text-blue-600 dark:text-blue-400 shadow-sm transition-transform group-hover:scale-110">
                                <CheckCircle className="w-5 h-5" />
                            </div>
                            <div>
                                <span className="text-3xl font-black text-slate-900 dark:text-white leading-none tracking-tighter">{taskCount - completedTasks}</span>
                                <h3 className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-1">{t('active_tasks')}</h3>
                            </div>
                        </div>
                        {overdueTasks > 0 && <Badge variant="danger" className="text-[9px] px-1.5 py-0.5 font-bold shadow-sm">{overdueTasks} {t('overdue')}</Badge>}
                    </div>

                    <div className="space-y-3 mb-5">
                        <div className="flex h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner">
                            <div className="bg-emerald-500 transition-all duration-500" style={{ width: `${(completedTasks / (taskCount || 1)) * 100}%` }} title="Done" />
                            <div className="bg-blue-500 transition-all duration-500" style={{ width: `${(activeTasks / (taskCount || 1)) * 100}%` }} title="Active" />
                            <div className="bg-rose-500 transition-all duration-500" style={{ width: `${(overdueTasks / (taskCount || 1)) * 100}%` }} title="Overdue" />
                        </div>
                        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">
                            <span className="text-emerald-600 dark:text-emerald-500/80">{completedTasks} D</span>
                            <span className="text-blue-600 dark:text-blue-400/80">{activeTasks} A</span>
                            <span className={overdueTasks > 0 ? 'text-rose-600 dark:text-rose-400/80' : ''}>{overdueTasks} O</span>
                        </div>
                    </div>

                    <div className="flex-grow space-y-2 mt-auto">
                        {taskPreviews.slice(0, 3).map((task) => (
                            <div key={task.id} className={`flex flex-col gap-1 text-xs p-2.5 rounded-xl border transition-all ${task.isOverdue ? 'bg-rose-50 dark:bg-rose-500/5 border-rose-100 dark:border-rose-500/10' : 'bg-slate-50 dark:bg-slate-800/30 border-slate-100 dark:border-slate-700/50 hover:border-slate-200'}`}>
                                <span className={`font-bold truncate ${task.isOverdue ? 'text-rose-700 dark:text-rose-300' : 'text-slate-700 dark:text-slate-300'}`}>{task.title}</span>
                                <div className="flex items-center justify-between mt-1">
                                    <span className="text-[10px] text-slate-500 dark:text-slate-500 font-medium truncate max-w-[100px] opacity-80">{task.assigneeName || task.assignee?.name || 'Unassigned'}</span>
                                    <span className={`text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${task.isOverdue ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400' : 'text-slate-500 bg-slate-100 dark:bg-slate-800'}`}>
                                        {task.dueText}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {taskPreviews.length > 3 && canSee('tasks') && (
                        <div className="mt-4 text-center">
                            <span className="text-[10px] text-cyan-600 dark:text-cyan-500/80 hover:text-cyan-700 font-black uppercase tracking-widest group-hover:underline">View all {taskPreviews.length} tasks &rarr;</span>
                        </div>
                    )}
                </GlassCard>

                {/* Schedule / Milestone Health */}
                <GlassCard className={`p-6 border-t-4 border-t-amber-500 dark:border-slate-800 bg-white transition-colors flex flex-col h-full ${canSee('milestones') ? 'hover:border-slate-300 dark:hover:border-slate-700 cursor-pointer group' : ''}`} onClick={() => canSee('milestones') && onNavigate?.('milestones')}>
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-amber-50 dark:bg-amber-500/10 rounded-xl text-amber-600 dark:text-amber-400 shadow-sm transition-transform group-hover:scale-110">
                                <Calendar className="w-5 h-5" />
                            </div>
                            <h3 className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-1">{t('schedule_title')}</h3>
                        </div>
                        {atRiskMilestones > 0 && <Badge variant="danger" className="text-[9px] px-1.5 py-0.5 font-bold shadow-sm">{t('at_risk')}</Badge>}
                    </div>

                    <div className="space-y-4 mb-4">
                        <div className="bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-700/50 rounded-xl p-3.5 transition-all hover:bg-slate-100">
                            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1.5 opacity-60">{t('project_deadline')}</p>
                            <div className="flex items-end justify-between">
                                <p className="text-xl font-black text-slate-900 dark:text-white tracking-tighter">
                                    {project.deadline || (project as any).endDate ? new Date(project.deadline || (project as any).endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : t('not_set')}
                                </p>
                                {daysUntilDeadline !== null && (
                                    <span className={`text-[10px] font-black uppercase tracking-tighter mb-1 px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-500/10 ${daysUntilDeadline < 14 ? 'text-amber-700 dark:text-amber-400 animate-pulse' : 'text-slate-500'}`}>
                                        {daysUntilDeadline}d remain
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="bg-amber-50 dark:bg-amber-500/5 border border-amber-100 dark:border-amber-500/10 rounded-xl p-3.5">
                            <p className="text-[10px] text-amber-700 dark:text-amber-500/70 font-black uppercase tracking-widest mb-1.5 opacity-60">{t('next_milestone')}</p>
                            {nextMilestone ? (
                                <>
                                    <p className="text-sm font-bold text-amber-900 dark:text-amber-400 truncate mb-1">{nextMilestone.title}</p>
                                    <p className="text-[10px] text-amber-700 dark:text-amber-400/80 font-bold uppercase tracking-widest">Due {formatRelativeDate(nextMilestone.dueDate)}</p>
                                </>
                            ) : (
                                <p className="text-xs text-slate-500 font-medium italic">{t('no_upcoming_milestones')}</p>
                            )}
                        </div>
                    </div>

                    <div className="flex-grow mt-auto space-y-3">
                        {missedMilestonesList.length > 0 && (
                            <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 rounded-xl p-3.5">
                                <div className="flex items-center gap-1.5 mb-2">
                                    <AlertCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                                    <span className="text-[10px] font-black text-rose-700 dark:text-rose-400 uppercase tracking-widest">{missedMilestonesList.length} Missed</span>
                                </div>
                                <ul className="text-[11px] text-slate-600 dark:text-slate-300 space-y-1 list-disc list-inside font-medium">
                                    {missedMilestonesList.slice(0, 2).map((m: any) => (
                                        <li key={m.id} className="truncate">{m.title}</li>
                                    ))}
                                    {missedMilestonesList.length > 2 && <li className="text-[10px] text-slate-400 italic list-none ml-2">+{missedMilestonesList.length - 2} more...</li>}
                                </ul>
                            </div>
                        )}

                        <div className="flex items-center justify-between py-2 border-t border-slate-100 dark:border-slate-800 mx-1">
                            <div className="flex items-center gap-2">
                                <Flag className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                                <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                                    <span className="text-slate-900 dark:text-white">{completedMilestones}</span> / {milestoneCount} OK
                                </span>
                            </div>
                        </div>
                    </div>
                </GlassCard>

                {/* Findings Summary */}
                <GlassCard className={`p-6 border-t-4 border-t-rose-500 dark:border-slate-800 bg-white transition-colors flex flex-col h-full ${canSee('findings') ? 'hover:border-slate-300 dark:hover:border-slate-700 cursor-pointer group' : ''}`} onClick={() => canSee('findings') && onNavigate?.('findings')}>
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-rose-50 dark:bg-rose-500/10 rounded-xl text-rose-600 dark:text-rose-400 shadow-sm transition-transform group-hover:scale-110">
                                <AlertCircle className="w-5 h-5" />
                            </div>
                            <h3 className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-1">{t('quality')}</h3>
                        </div>
                        <Badge variant={unresolvedFindings > 0 ? 'warning' : 'success'} className="text-[9px] px-1.5 py-0.5 font-bold shadow-sm">
                            {unresolvedFindings} {t('open')}
                        </Badge>
                    </div>

                    {unresolvedFindings === 0 ? (
                        <div className="flex-grow flex flex-col items-center justify-center py-6 text-center">
                            <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 flex items-center justify-center mb-4 transition-all group-hover:scale-110">
                                <CheckCircle className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <p className="text-base font-black text-emerald-700 dark:text-emerald-400 mb-1">{t('clean_state')}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{resolvedFindings} resolved historically</p>
                        </div>
                    ) : (
                        <>
                            <div className="space-y-2 mb-5">
                                {findingsBySeverity.CRITICAL && findingsBySeverity.CRITICAL > 0 && (
                                    <div className="flex items-center gap-3">
                                        <div className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]" />
                                        <span className="text-sm font-black text-rose-700 dark:text-rose-400 w-6">{findingsBySeverity.CRITICAL}</span>
                                        <span className="text-[10px] uppercase font-black text-slate-500 dark:text-slate-400 tracking-widest">Critical</span>
                                    </div>
                                )}
                                {findingsBySeverity.HIGH && findingsBySeverity.HIGH > 0 && (
                                    <div className="flex items-center gap-3">
                                        <div className="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.4)]" />
                                        <span className="text-sm font-black text-orange-700 dark:text-orange-400 w-6">{findingsBySeverity.HIGH}</span>
                                        <span className="text-[10px] uppercase font-black text-slate-500 dark:text-slate-400 tracking-widest">High</span>
                                    </div>
                                )}
                                {findingsBySeverity.MEDIUM && findingsBySeverity.MEDIUM > 0 && (
                                    <div className="flex items-center gap-3">
                                        <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                                        <span className="text-sm font-black text-amber-700 dark:text-amber-400 w-6">{findingsBySeverity.MEDIUM}</span>
                                        <span className="text-[10px] uppercase font-black text-slate-500 dark:text-slate-400 tracking-widest">Medium</span>
                                    </div>
                                )}
                                {findingsBySeverity.LOW && findingsBySeverity.LOW > 0 && (
                                    <div className="flex items-center gap-3">
                                        <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                                        <span className="text-sm font-black text-blue-700 dark:text-blue-400 w-6">{findingsBySeverity.LOW}</span>
                                        <span className="text-[10px] uppercase font-black text-slate-500 dark:text-slate-400 tracking-widest">Low</span>
                                    </div>
                                )}
                            </div>

                            {mostCriticalFinding && (
                                <div className="mt-auto bg-slate-800/40 border border-slate-700/60 rounded-lg p-3">
                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Oldest / Most Severe</p>
                                    <p className="text-xs font-semibold text-slate-300 truncate mb-2">{mostCriticalFinding.title}</p>
                                    <div className="flex justify-between items-center text-[9px] text-slate-500 font-medium">
                                        <span className="truncate max-w-[100px]">Assigned: {mostCriticalFinding.assignedToName || mostCriticalFinding.assignedTo?.name || 'Unassigned'}</span>
                                        <span>Age: {mostCriticalFinding.createdAt ? Math.floor((Date.now() - new Date(mostCriticalFinding.createdAt).getTime()) / (1000 * 60 * 60 * 24)) : 0}d</span>
                                    </div>
                                </div>
                            )}

                            {canSee('findings') && (
                                <div className="mt-4 text-center">
                                    <span className="text-[10px] text-cyan-500/80 hover:text-cyan-400 font-bold uppercase tracking-wider group-hover:underline">View all findings &rarr;</span>
                                </div>
                            )}
                        </>
                    )}
                </GlassCard>

                {/* Updates / Review Health */}
                <GlassCard className="p-6 border-t-4 border-t-cyan-500 dark:border-slate-800 bg-white hover:border-slate-300 dark:hover:border-slate-700 transition-colors h-full flex flex-col group">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-cyan-50 dark:bg-cyan-500/10 rounded-xl text-cyan-600 dark:text-cyan-400 shadow-sm transition-transform group-hover:scale-110">
                            <Clock className="w-5 h-5" />
                        </div>
                        <Badge variant={isStale ? 'warning' : 'success'} className="text-[9px] px-1.5 py-0.5 font-black uppercase tracking-widest shadow-sm">
                            {isStale ? 'STALE' : 'UP TO DATE'}
                        </Badge>
                    </div>
                    <h3 className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-1 mb-4">{t('communication')}</h3>
                    <div className="space-y-4">
                        <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-3.5 border border-slate-100 dark:border-slate-700/50">
                            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1.5 opacity-60">{t('last_weekly_update')}</p>
                            <p className="text-xl font-black text-slate-900 dark:text-white truncate tracking-tighter">{lastUpdateAge}</p>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t border-slate-100 dark:border-slate-800">
                            <div className="flex flex-col">
                                <span className="text-sm font-black text-slate-900 dark:text-white leading-none">{recentUpdates.length}</span>
                                <span className="text-[9px] text-slate-400 dark:text-slate-500 uppercase font-black tracking-widest mt-1">{t('total_posts')}</span>
                            </div>
                            {canSee('updates') && (
                                <Button variant="ghost" size="sm" className="h-8 text-[9px] uppercase font-black text-cyan-600 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-slate-800" onClick={() => onNavigate?.('updates')}>{t('post_update')} &rarr;</Button>
                            )}
                        </div>
                    </div>
                </GlassCard>
            </div>

            {/* PM METRICS ROW */}
            {metrics && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">


                    {metrics.capacity.members && (
                        <GlassCard className={`p-6 border-t-4 border-t-indigo-500 dark:border-slate-800 relative transition-colors h-full ${canSee('team') ? 'hover:border-slate-300 dark:hover:border-slate-700 cursor-pointer' : ''}`} onClick={() => canSee('team') && onNavigate?.('team')}>
                            <div className="flex justify-between items-start mb-4">
                                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                    <Activity className="w-4 h-4 text-blue-500" /> {t('team_capacity')}
                                </h3>
                                {metrics.capacity.highLoad?.length > 0 && <Badge variant="danger" className="text-[9px] px-1.5 py-0.5 shadow-sm">{metrics.capacity.highLoad.length} High Load</Badge>}
                            </div>

                            <table className="w-full text-left border-collapse mb-1">
                                <thead>
                                    <tr className="border-b border-slate-800 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                        <th className="pb-2 font-medium">Member</th>
                                        <th className="pb-2 font-medium text-center">Tasks</th>
                                        <th className="pb-2 font-medium text-right">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {metrics.capacity.members.map((member: any) => {
                                        const getStatusColor = (status: string) => {
                                            switch (status) {
                                                case 'high': return '#ef4444';
                                                case 'medium': return '#f59e0b';
                                                case 'low': return '#22c55e';
                                                case 'available': return '#94a3b8';
                                                default: return '#94a3b8';
                                            }
                                        };
                                        const getStatusLabel = (status: string) => {
                                            switch (status) {
                                                case 'high': return '🔴 High';
                                                case 'medium': return '🟡 Medium';
                                                case 'low': return '🟢 Low';
                                                case 'available': return '⚪ Available';
                                                default: return '⚪ Unknown';
                                            }
                                        };
                                        const statusColor = getStatusColor(member.status);
                                        return (
                                            <tr key={member.id} className="border-b border-slate-800/50 last:border-0 hover:bg-slate-800/30 transition-colors">
                                                <td className="py-2">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-[10px] font-bold text-white shadow-sm border border-slate-700">
                                                            {member.name.charAt(0)}
                                                        </div>
                                                        <span className="text-[11px] font-semibold text-slate-300 truncate max-w-[80px]">{member.name}</span>
                                                    </div>
                                                </td>
                                                <td className="py-2 text-center">
                                                    <span className="text-xs font-black" style={{ color: statusColor }}>
                                                        {member.taskCount}
                                                    </span>
                                                </td>
                                                <td className="py-2 text-right">
                                                    <span className="text-[10px] font-bold tracking-wider" style={{ color: statusColor }}>
                                                        {getStatusLabel(member.status)}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>

                            {metrics.capacity.available?.length > 0 && (
                                <div className="mt-4 p-2 bg-emerald-500/10 rounded border border-emerald-500/20 text-center">
                                    <span className="text-[9px] text-emerald-400 font-bold uppercase tracking-wider">
                                        {metrics.capacity.available.length} {t('members_available')}
                                    </span>
                                </div>
                            )}

                            {canSee('team') && (
                                <div className="mt-4 text-center pt-1 border-t border-slate-800/50">
                                    <span className="text-[9px] text-cyan-500/80 font-bold uppercase tracking-wider">{t('view_team_details')} &rarr;</span>
                                </div>
                            )}
                        </GlassCard>
                    )}

                    <GlassCard className="p-6 border-t-4 border-t-rose-600 dark:border-slate-800 text-center flex flex-col items-center justify-center relative min-h-[200px]">
                        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest w-full text-left flex items-center gap-2 absolute top-6 left-6">
                            <Lock className="w-4 h-4 text-rose-500" /> {t('blockers')}
                        </h3>
                        {metrics.blockers.active.length === 0 ? (
                            <div className="flex flex-col items-center justify-center pt-6">
                                <div className="p-2 bg-emerald-500/10 rounded-full mb-2"><CheckCircle className="w-6 h-6 text-emerald-500" /></div>
                                <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">{t('work_unblocked')}</span>
                            </div>
                        ) : (
                            <div className="pt-6 w-full text-left">
                                <div className="space-y-2 mb-2">
                                    {metrics.blockers.active.slice(0, 2).map((blk: any) => (
                                        <div key={blk.id} className="text-xs text-rose-300 p-2 bg-rose-500/10 rounded border border-rose-500/20">{blk.title}</div>
                                    ))}
                                </div>
                                <Button variant="ghost" size="sm" className="w-full text-[9px] uppercase tracking-widest text-cyan-400" onClick={() => onNavigate?.('tasks')}>{t('manage_blockers')}</Button>
                            </div>
                        )}
                    </GlassCard>
                </div>
            )}

            {/* LOWER SECTION: Setup & Checklists vs Sidebar */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Adaptive Checklists */}
                        <div className="space-y-2">
                            <ChecklistSection
                                title={t('core_setup')}
                                items={readiness?.sections.core.items || []}
                                isComplete={readiness?.sections.core.items.every((i: any) => i.status === 'complete') || false}
                                onAction={onAction} onNavigate={onNavigate}
                            />
                            <ChecklistSection
                                title={t('planning')}
                                items={readiness?.sections.planning.items || []}
                                isComplete={readiness?.sections.planning.items.every((i: any) => i.status !== 'missing') || false}
                                onAction={onAction} onNavigate={onNavigate}
                            />
                            <ChecklistSection
                                title={t('resources')}
                                items={readiness?.sections.resources.items || []}
                                isComplete={readiness?.sections.resources.items.every((i: any) => i.status !== 'missing') || false}
                                onAction={onAction} onNavigate={onNavigate}
                            />
                        </div>
                    </div>
                </div>

                {/* Sidebar Workspace Context & Activity Feed */}
                <div className="space-y-6">
                    <ActivityFeed activities={activity} onNavigate={onNavigate} />

                    <GlassCard className="p-5 border-slate-800">
                        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">{t('project_context_title')}</h4>
                        <div className="space-y-4">
                            <div>
                                <label className="text-[9px] text-slate-500 uppercase font-black">{t('client_account')}</label>
                                <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight mt-0.5">{clientName || t('unassigned')}</p>
                            </div>
                            <div className="pt-3 border-t border-slate-800/50">
                                <div className="flex justify-between items-center group cursor-pointer" onClick={() => onNavigate?.('discussions')}>
                                    <span className="text-[10px] text-slate-400 uppercase font-bold group-hover:text-cyan-400 transition-colors">{t('team_discussions')}</span>
                                    <ArrowRight className="w-3 h-3 text-slate-600" />
                                </div>
                            </div>
                            <div className="pt-3 border-t border-slate-800/50">
                                <div className="flex justify-between items-center group cursor-pointer" onClick={() => onNavigate?.('files')}>
                                    <span className="text-[10px] text-slate-400 uppercase font-bold group-hover:text-cyan-400 transition-colors">{t('project_files')}</span>
                                    <ArrowRight className="w-3 h-3 text-slate-600" />
                                </div>
                            </div>
                        </div>
                    </GlassCard>
                </div>
            </div>

            {/* Project Overview / Description Section - Full Width */}
            <GlassCard className="p-6 border-slate-200 dark:border-slate-800/50 bg-white dark:bg-slate-900/30">
                <div className="flex items-center gap-3 mb-4">
                    <Info className="w-5 h-5 text-slate-400" />
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">{t('project_brief_scope')}</h3>
                </div>
                <div className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed whitespace-pre-wrap">
                    {project.description || t('no_project_description_overview')}
                </div>
            </GlassCard>
        </div>
    );
};
