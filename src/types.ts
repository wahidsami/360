export enum Role {
  SUPER_ADMIN = 'SUPER_ADMIN',
  OPS = 'OPS',
  PM = 'PM',
  DEV = 'DEV',
  FINANCE = 'FINANCE',
  CLIENT_OWNER = 'CLIENT_OWNER',
  CLIENT_MANAGER = 'CLIENT_MANAGER',
  CLIENT_MEMBER = 'CLIENT_MEMBER',
  VIEWER = 'VIEWER'
}

export const isInternalRole = (role: Role): boolean => {
  return [Role.SUPER_ADMIN, Role.OPS, Role.PM, Role.DEV, Role.FINANCE].includes(role);
};

export enum Permission {
  VIEW_DASHBOARD = 'VIEW_DASHBOARD',
  MANAGE_CLIENTS = 'MANAGE_CLIENTS',
  VIEW_CLIENTS = 'VIEW_CLIENTS',
  MANAGE_PROJECTS = 'MANAGE_PROJECTS',
  VIEW_FINANCIALS = 'VIEW_FINANCIALS',
  MANAGE_USERS = 'MANAGE_USERS',
  VIEW_ADMIN = 'VIEW_ADMIN',
  MANAGE_TASKS = 'MANAGE_TASKS',
  MANAGE_TEAM = 'MANAGE_TEAM'
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar?: string;
  /** Extra permissions beyond role defaults (e.g. MANAGE_CLIENTS, VIEW_FINANCIALS) */
  customPermissions?: string[];
  twoFactorEnabled?: boolean;
}

export type ClientStatus = 'active' | 'inactive' | 'lead' | 'archived';

export interface ClientBillingProfile {
  currency: string;
  vatNumber?: string;
  taxId?: string;
}

export interface Client {
  id: string;
  name: string;
  industry: string;
  status: ClientStatus;
  contactPerson: string;
  email: string;
  phone?: string;
  website?: string;
  address?: string;
  billing: ClientBillingProfile;
  notes?: string;
  logo?: string;
  logoUrl?: string;
  revenueYTD: number;
  outstandingBalance: number;
  lastActivity: string;
}

export interface ClientMember {
  id: string;
  clientId: string;
  userId: string;
  name: string; // Denormalized for display
  role: Role;
  joinedAt: string;
}

export interface ProjectMember {
  id: string;
  projectId: string;
  userId: string;
  name: string;
  email: string;
  avatar?: string;
  role: Role;
  joinedAt: string;
}

export interface FileAsset {
  id: string;
  entityId: string;
  name: string;
  category: 'contract' | 'invoice' | 'brief' | 'design' | 'docs' | 'build' | 'report' | 'other';
  type: string;
  size: string;
  url: string;
  uploadedAt: string;
  uploaderName: string;
  visibility?: 'internal' | 'public';
}

export interface Report {
  id: string;
  projectId: string;
  title: string;
  type: 'security' | 'performance' | 'financial' | 'status';
  generatedAt?: string;
  generatedBy?: string;
  status: 'ready' | 'generating' | 'failed' | string;
  url?: string;
  /** Backend: key for generated file (e.g. reports/xxx.pptx) */
  generatedFileKey?: string | null;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  body?: string;
  readAt: string | null;
  linkUrl?: string | null;
  entityId?: string | null;
  entityType?: string | null;
  createdAt: string;
}

export interface NotificationPreference {
  emailTasks: boolean;
  emailFindings: boolean;
  emailInvoices: boolean;
  inApp: boolean;
}

export interface TimeEntry {
  id: string;
  taskId: string;
  userId: string;
  minutes: number;
  date: string;
  billable: boolean;
  note?: string | null;
  user?: { id: string; name: string };
  task?: { id: string; title: string; projectId?: string };
}

export interface ActivityLog {
  id: string;
  entityId: string;
  action: string; // e.g., 'created', 'updated', 'uploaded'
  description: string;
  userId: string;
  userName: string;
  timestamp: string;
  type?: 'file' | 'update' | 'comment' | 'system';
}

export interface Discussion {
  id: string;
  projectId: string;
  title: string;
  body: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  replyCount: number;
  lastReplyAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DiscussionReply {
  id: string;
  discussionId: string;
  body: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  createdAt: string;
}

export type ProjectStatus = 'planning' | 'in_progress' | 'testing' | 'deployed' | 'maintenance' | 'archived' | 'on_hold' | 'completed';
export type ProjectHealth = 'good' | 'at-risk' | 'critical';

export interface Project {
  id: string;
  clientId: string;
  name: string;
  status: ProjectStatus;
  progress: number;
  startDate: string;
  deadline: string;
  budget: number;
  health: ProjectHealth;
  description?: string;
  tags?: string[];
}

export type MilestoneStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export interface Milestone {
  id: string;
  projectId: string;
  title: string;
  dueDate: string;
  status: MilestoneStatus;
  percentComplete: number;
  ownerId?: string;
  ownerName?: string;
  description?: string;
}

export interface Finding {
  id: string;
  projectId: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description?: string;
  status: 'open' | 'in_progress' | 'in_review' | 'closed' | 'dismissed';
  visibility: 'INTERNAL' | 'CLIENT';
  ownerName?: string;
  reportedById?: string;
  assignedToId?: string;
  remediation?: string;
  impact?: string;
  reportedBy?: {
    id: string;
    name: string;
    email: string;
  };
  assignedTo?: {
    id: string;
    name: string;
    email: string;
  };
  project?: {
    name: string;
  };
  updatedAt?: string;
  createdAt?: string;
  evidence?: EvidenceFile[];
}

export interface EvidenceFile {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  uploader?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface ProjectUpdate {
  id: string;
  projectId: string;
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  timestamp: string;
  type: 'general' | 'milestone' | 'risk';
  visibility: 'internal' | 'public';
}

export interface EnvironmentAccess {
  id: string;
  projectId: string;
  name: string;
  url: string;
  credentials?: {
    username: string;
    passwordHash: string; // Mock
  };
}

export interface Invoice {
  id: string;
  projectId: string;
  reference: string;
  amount: number;
  currency: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue';
  dueDate: string;
  issuedDate: string;
}

export interface Contract {
  id: string;
  projectId: string;
  totalValue: number;
  currency: string;
  startDate: string;
  endDate: string;
  status: 'draft' | 'active' | 'completed';
}

export interface CommentMessage {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  timestamp: string;
}

export interface CommentThread {
  id: string;
  projectId: string;
  topic: string;
  status: 'open' | 'resolved';
  messages: CommentMessage[];
  lastUpdated: string;
}

// --- TASKS ---
export type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'review' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId?: string;
  assigneeName?: string;
  milestoneId?: string;
  sprintId?: string;
  storyPoints?: number;
  startDate?: string;
  dueDate?: string;
  labels: string[];
  createdAt: string;
  updatedAt: string;
  comments?: CommentMessage[]; // Internal comments on the task
}

export type SprintStatus = 'PLANNING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

export interface Sprint {
  id: string;
  projectId: string;
  name: string;
  goal?: string | null;
  startDate: string;
  endDate: string;
  status: SprintStatus;
  _count?: { tasks: number };
}

export interface KpiStat {
  label: string;
  value: string | number;
  trend?: number; // percentage
  trendDirection?: 'up' | 'down';
}

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [Role.SUPER_ADMIN]: Object.values(Permission),
  [Role.OPS]: [Permission.VIEW_DASHBOARD, Permission.MANAGE_CLIENTS, Permission.MANAGE_PROJECTS, Permission.VIEW_CLIENTS, Permission.VIEW_FINANCIALS, Permission.MANAGE_TASKS, Permission.MANAGE_TEAM],
  [Role.PM]: [Permission.VIEW_DASHBOARD, Permission.MANAGE_PROJECTS, Permission.VIEW_CLIENTS, Permission.MANAGE_TASKS, Permission.MANAGE_TEAM],
  [Role.DEV]: [Permission.VIEW_DASHBOARD, Permission.VIEW_CLIENTS, Permission.MANAGE_TASKS],
  [Role.FINANCE]: [Permission.VIEW_DASHBOARD, Permission.VIEW_FINANCIALS, Permission.VIEW_CLIENTS],
  [Role.CLIENT_OWNER]: [Permission.VIEW_DASHBOARD, Permission.VIEW_CLIENTS, Permission.VIEW_FINANCIALS],
  [Role.CLIENT_MANAGER]: [Permission.VIEW_DASHBOARD, Permission.VIEW_CLIENTS],
  [Role.CLIENT_MEMBER]: [Permission.VIEW_DASHBOARD],
  [Role.VIEWER]: [Permission.VIEW_DASHBOARD]
};
