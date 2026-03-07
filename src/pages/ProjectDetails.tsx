import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Edit, Sparkles } from 'lucide-react';
import { Project, Client, Milestone, ProjectUpdate, EnvironmentAccess, Invoice, Contract, Discussion, DiscussionReply, Permission, ActivityLog, FileAsset, ProjectMember, Role, Finding, Report, Task, isInternalRole } from '../types';
import { api } from '../services/api';
import { Button, Badge, KpiCard } from '../components/ui/UIComponents';
import { PermissionGate } from '../components/PermissionGate';
import { MilestonesTab, UpdatesTab, EnvironmentsTab, FinancialsTab, DiscussionsTab, OverviewTab, FilesTab, TeamTab, FindingsTab, ReportsTab, TimeTab, TimelineTab, SprintsTab, ActivityTab } from '../components/project/ProjectTabs';
import { TasksTab } from '../components/project/TasksTab';
import { RecurringTasksTab } from '../components/project/RecurringTasksTab';
import { useAuth } from '../contexts/AuthContext';
import { useAI } from '../contexts/AIContext';
import ErrorBoundary from '../components/ui/ErrorBoundary';

export const ProjectDetails: React.FC = () => {
  const { t } = useTranslation();
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { user, can } = useAuth();
  const { openAI, setContext } = useAI();
  const [activeTab, setActiveTab] = useState('overview');
  const [isPending, startTransition] = React.useTransition();

  const [project, setProject] = useState<Project | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [updates, setUpdates] = useState<ProjectUpdate[]>([]);
  const [environments, setEnvironments] = useState<EnvironmentAccess[]>([]);
  const [financials, setFinancials] = useState<{ contract?: Contract, invoices: Invoice[] }>({ invoices: [] });
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [activity, setActivity] = useState<ActivityLog[]>([]);
  const [files, setFiles] = useState<FileAsset[]>([]);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    if (projectId) {
      setContext({ projectId });
      loadData();
    }
    return () => setContext({});
  }, [projectId, setContext]);

  const loadData = async () => {
    if (!projectId) return;
    const p = await api.projects.get(projectId);
    if (p) {
      startTransition(() => {
        setProject(p);
      });
      const c = await api.clients.get(p.clientId);
      startTransition(() => {
        setClient(c || null);
      });

      // Parallel fetch with error handling
      try {
        const [m, u, e, f, th, act, fl, mem, fnd, rep, tsk] = await Promise.all([
          api.projects.getMilestones(projectId).catch(e => { console.error('Milestones failed', e); return []; }),
          api.projects.getUpdates(projectId).catch(e => { console.error('Updates failed', e); return []; }),
          api.projects.getEnvironments(projectId).catch(e => { console.error('Environments failed', e); return []; }),
          api.projects.getFinancials(projectId).catch(e => { console.error('Financials failed', e); return { invoices: [] }; }),
          api.projects.getDiscussions(projectId).catch(e => { console.error('Discussions failed', e); return []; }),
          api.projects.getActivity(projectId).catch(e => { console.error('Activity failed', e); return []; }),
          api.projects.getFiles(projectId).catch(e => { console.error('Files failed', e); return []; }),
          api.projects.getMembers(projectId).catch(e => { console.error('Members failed', e); return []; }),
          api.projects.getFindings(projectId).catch(e => { console.error('Findings failed', e); return []; }),
          api.projects.getReports(projectId).catch(e => { console.error('Reports failed', e); return []; }),
          api.projects.getTasks(projectId).catch(e => { console.error('Tasks failed', e); return []; })
        ]);

        startTransition(() => {
          setMilestones(m);
          setUpdates(u);
          setEnvironments(e);
          setFinancials(f as any);
          setDiscussions(th as any);
          setActivity(act);
          setFiles(fl);
          setMembers(mem);
          setFindings(fnd);
          setReports(rep);
          setTasks(tsk);
        });
      } catch (error) {
        console.error("Critical error loading project data", error);
      }
    }
  };

  const handlePostUpdate = async (update: Partial<ProjectUpdate>) => {
    if (!project) return;
    await api.projects.createUpdate(project.id, {
      title: update.title!,
      content: update.content!,
      visibility: update.visibility || 'internal'
    });
    const u = await api.projects.getUpdates(project.id);
    setUpdates(u);
  };

  const handleUpsertMilestone = async (m: Partial<Milestone>) => {
    if (!project || !projectId) return;
    await api.projects.upsertMilestone({
      ...m,
      projectId,
      title: m.title!,
      dueDate: m.dueDate!,
      status: m.status || 'PENDING',
      percentComplete: m.percentComplete || 0
    } as Milestone);
    const ms = await api.projects.getMilestones(projectId);
    setMilestones(ms);
  };

  const handleDeleteMilestone = async (id: string) => {
    if (!projectId) return;
    await api.projects.deleteMilestone(projectId, id);
    const ms = await api.projects.getMilestones(projectId);
    setMilestones(ms);
  };

  const handleUploadFile = async (file: File, metadata: { name: string; category: string; visibility: string }) => {
    if (!project || !projectId) return;

    try {
      await api.projects.uploadFile(
        projectId,
        file,
        metadata.category,
        metadata.visibility,
        metadata.name || undefined  // Pass display name to backend
      );

      const fl = await api.projects.getFiles(projectId);
      setFiles(fl);
    } catch (error) {
      console.error("Failed to upload file:", error);
      alert("Failed to upload file. Please try again.");
    }
  };

  const handleDownloadFile = async (fileId: string): Promise<string | undefined> => {
    if (!projectId) return undefined;
    return api.projects.downloadFile(projectId, fileId);
  };

  const handleDeleteFile = async (fileId: string): Promise<void> => {
    if (!projectId) return;
    const success = await api.projects.deleteFile(projectId, fileId);
    if (success) {
      const fl = await api.projects.getFiles(projectId);
      setFiles(fl);
    } else {
      alert('Failed to delete file. Please try again.');
    }
  };

  // === Discussion Handlers ===
  const handleCreateDiscussion = async (title: string, body: string) => {
    if (!projectId) return;
    await api.projects.createDiscussion(projectId, title, body);
    const d = await api.projects.getDiscussions(projectId);
    setDiscussions(d);
  };

  const handleDeleteDiscussion = async (discussionId: string) => {
    if (!projectId) return;
    await api.projects.deleteDiscussion(projectId, discussionId);
    setDiscussions(prev => prev.filter(d => d.id !== discussionId));
  };

  const handleGetReplies = async (discussionId: string): Promise<DiscussionReply[]> => {
    if (!projectId) return [];
    return api.projects.getReplies(projectId, discussionId);
  };

  const handleCreateReply = async (discussionId: string, body: string) => {
    if (!projectId) return;
    await api.projects.createReply(projectId, discussionId, body);
    const d = await api.projects.getDiscussions(projectId);
    setDiscussions(d);
  };

  const handleDeleteReply = async (discussionId: string, replyId: string) => {
    if (!projectId) return;
    await api.projects.deleteReply(projectId, discussionId, replyId);
  };

  const handleUpdateRole = async (userId: string, role: Role) => {
    if (!projectId) return;
    await api.projects.updateMemberRole(projectId, userId, role);
    const mem = await api.projects.getMembers(projectId);
    setMembers(mem);
  };

  const handleAddMember = async (userId: string, role: Role) => {
    if (!projectId) return;
    await api.projects.addMember(projectId, userId, role);
    const mem = await api.projects.getMembers(projectId);
    setMembers(mem);
  };

  const handleRemoveMember = async (userId: string) => {
    if (!projectId) return;
    await api.projects.removeMember(projectId, userId);
    const mem = await api.projects.getMembers(projectId);
    setMembers(mem);
  };

  // --- Finding Handlers ---
  const handleRefreshFindings = async () => {
    if (!projectId) return;
    const fnd = await api.projects.getFindings(projectId);
    setFindings(fnd);
  };

  // --- Task Handlers ---
  const handleUpsertTask = async (t: Partial<Task>) => {
    if (!projectId) return;
    if (t.id) {
      await api.projects.updateTask(projectId, t.id, t);
    } else {
      await api.projects.createTask(projectId, t);
    }
    const newTasks = await api.projects.getTasks(projectId);
    setTasks(newTasks);
  };

  const handleDeleteTask = async (id: string) => {
    if (!projectId) return;
    await api.projects.deleteTask(projectId, id);
    const newTasks = await api.projects.getTasks(projectId);
    setTasks(newTasks);
  };

  const handleMoveTask = async (id: string, status: any) => {
    if (!projectId) return;
    await api.projects.moveTaskStatus(projectId, id, status);
    const newTasks = await api.projects.getTasks(projectId);
    setTasks(newTasks);
  };

  if (!project) return <div className="p-10 text-center text-slate-500">Loading mission data...</div>;

  const tabs = [
    { id: 'overview', label: t('overview') },
    { id: 'tasks', label: t('tasks'), hidden: user && !isInternalRole(user.role) },
    { id: 'time', label: t('time') || 'Time', hidden: user && !isInternalRole(user.role) },
    { id: 'timeline', label: t('timeline') || 'Timeline', hidden: user && !isInternalRole(user.role) },
    { id: 'sprints', label: t('sprints') || 'Sprints', hidden: user && !isInternalRole(user.role) },
    { id: 'recurring', label: 'Recurring tasks', hidden: user && !isInternalRole(user.role) },
    { id: 'milestones', label: t('milestones') },
    { id: 'updates', label: t('updates') },
    { id: 'files', label: t('files') },
    { id: 'team', label: t('team') },
    { id: 'findings', label: t('findings') },
    { id: 'reports', label: t('reports') },
    { id: 'testing', label: t('testing_access') },
    { id: 'financials', label: t('financials') },
    { id: 'discussions', label: t('discussions') },
    { id: 'activity', label: t('activity') || 'Activity' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="flex gap-4">
          <Button variant="ghost" onClick={() => navigate('/app/projects')}><ArrowLeft className="w-5 h-5" /></Button>
          <div>
            <h1 className="text-3xl font-bold font-display text-white">{project.name}</h1>
            <div className="flex items-center gap-3 mt-1">
              <p className="text-slate-400 cursor-pointer hover:text-cyan-400 transition-colors" onClick={() => navigate(`/app/clients/${client?.id}`)}>
                {client?.name || "Unknown Client"}
              </p>
              <span className="text-slate-600">•</span>
              <p className="text-slate-500 text-sm">
                {project.startDate ? new Date(project.startDate).toLocaleDateString() : '...'} — {project.deadline || (project as any).endDate ? new Date(project.deadline || (project as any).endDate).toLocaleDateString() : '...'}
              </p>
              {project.tags && project.tags.map((tag: string) => (
                <Badge key={tag} variant="neutral">{tag}</Badge>
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-3 items-center">
          <Button variant="outline" size="sm" onClick={() => openAI({ projectId: project.id })} title="AI Assistant">
            <Sparkles className="w-4 h-4 mr-1" /> AI
          </Button>
          <Badge variant={project.status === 'in_progress' ? 'info' : project.status === 'deployed' ? 'success' : 'neutral'}>{project.status}</Badge>
          <PermissionGate permission={Permission.MANAGE_PROJECTS}>
            <Button variant="secondary" size="sm" onClick={() => navigate(`/app/projects/${project.id}/edit`)}>
              <Edit className="w-4 h-4 mr-2" /> Edit
            </Button>
          </PermissionGate>
        </div>
      </div>

      {/* Tabs Nav */}
      <div className="flex border-b border-slate-700/50 overflow-x-auto scrollbar-none gap-8">
        {tabs.filter(t => !t.hidden).map(tab => (
          <button
            key={tab.id}
            onClick={() => {
              startTransition(() => {
                setActiveTab(tab.id);
              });
            }}
            className={`pb-4 px-2 font-medium text-sm transition-all border-b-2 whitespace-nowrap ${activeTab === tab.id ? 'text-cyan-400 border-cyan-400' : 'text-slate-500 border-transparent hover:text-slate-300'
              } ${isPending ? 'opacity-50' : ''}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        <ErrorBoundary fallback={<div className="p-10 text-center text-rose-400 bg-rose-500/5 border border-rose-500/10 rounded-xl">Something went wrong in this tab. Please try refreshing.</div>}>
          <React.Suspense fallback={<div className="p-10 text-center text-slate-500 animate-pulse flex flex-col items-center gap-2 font-display">
            <Sparkles className="w-8 h-8 text-cyan-500 animate-spin" />
            Loading {activeTab}...
          </div>}>
            {activeTab === 'overview' && (
              <OverviewTab
                project={project}
                clientName={client?.name}
                stats={{
                  taskCount: tasks.length,
                  completedTasks: tasks.filter(t => t.status === 'done').length,
                  milestoneCount: milestones.length,
                  completedMilestones: milestones.filter(m => m.status === 'completed').length,
                  budget: project.budget || financials.contract?.totalValue || 0,
                  spent: financials.invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.amount, 0)
                }}
                recentUpdates={updates.slice(0, 5)}
              />
            )}
            {activeTab === 'tasks' && <TasksTab projectId={projectId!} tasks={tasks} milestones={milestones} members={members} onUpsert={handleUpsertTask} onDelete={handleDeleteTask} onMove={handleMoveTask} onJoin={() => handleAddMember(user?.id || '', user?.role as any)} currentUserId={user?.id || ''} />}
            {activeTab === 'time' && projectId && <TimeTab projectId={projectId} tasks={tasks} currentUserId={user?.id} />}
            {activeTab === 'timeline' && projectId && <TimelineTab projectId={projectId} tasks={tasks} onRefreshTasks={async () => { if (projectId) { const tsk = await api.projects.getTasks(projectId); setTasks(tsk); } }} />}
            {activeTab === 'sprints' && projectId && <SprintsTab projectId={projectId} tasks={tasks} onRefreshTasks={async () => { if (projectId) { const tsk = await api.projects.getTasks(projectId); setTasks(tsk); } }} onUpsertTask={handleUpsertTask} />}
            {activeTab === 'recurring' && projectId && <RecurringTasksTab projectId={projectId} onRefreshTasks={async () => { if (projectId) { const tsk = await api.projects.getTasks(projectId); setTasks(tsk); } }} />}
            {activeTab === 'milestones' && <MilestonesTab milestones={milestones} onUpsert={handleUpsertMilestone} onDelete={handleDeleteMilestone} />}
            {activeTab === 'updates' && <UpdatesTab updates={updates} onPost={handlePostUpdate} />}
            {activeTab === 'files' && <FilesTab files={files} onUpload={handleUploadFile} onDownload={handleDownloadFile} onDelete={handleDeleteFile} />}
            {activeTab === 'team' && <TeamTab members={members} onUpdateRole={handleUpdateRole} onAdd={handleAddMember} onRemove={handleRemoveMember} />}
            {activeTab === 'findings' && <FindingsTab findings={findings} projectId={projectId!} onRefresh={handleRefreshFindings} />}
            {activeTab === 'reports' && <ReportsTab reports={reports} onRefresh={loadData} />}
            {activeTab === 'testing' && <EnvironmentsTab environments={environments} />}
            {activeTab === 'financials' && <FinancialsTab contract={financials.contract} invoices={financials.invoices} onRefresh={loadData} />}
            {activeTab === 'discussions' && <DiscussionsTab
              projectId={projectId!}
              discussions={discussions}
              onCreateThread={handleCreateDiscussion}
              onDeleteThread={handleDeleteDiscussion}
              onGetReplies={handleGetReplies}
              onCreateReply={handleCreateReply}
              onDeleteReply={handleDeleteReply}
            />}
            {activeTab === 'activity' && <ActivityTab activity={activity} onRefresh={loadData} />}
          </React.Suspense>
        </ErrorBoundary>
      </div>
    </div>
  );
};
