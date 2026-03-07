# Arena360 — System Documentation

> **Purpose:** End-to-end system documentation, feature inventory, operational flows, and competitive positioning for presentation and stakeholder reference.

---

## 1. System Overview

**Arena360** is a **full-stack, multi-tenant project management and operations platform** for **digital agencies, IT service companies, and consultancy firms** that manage multiple clients, projects, and teams.

The platform is a **centralized command center** where internal teams (project managers, developers, finance) and external stakeholders (clients) collaborate on projects, track deliverables, manage financials, log and resolve quality findings, generate reports, track time, automate workflows, collect payments, and integrate with third-party tools — all from a **single, role-aware interface**.

### Core Philosophy

| Aspect | Description |
|--------|-------------|
| **Target Market** | B2B service companies managing client portfolios |
| **Architecture** | Full-stack monolith with clear frontend/backend separation |
| **Multi-Tenancy** | Multiple organizations per deployment with full data isolation |
| **Client Orientation** | Dual-persona: internal operations + external client portal |
| **Design Language** | Dark/light theme, glassmorphism, modern SaaS aesthetic |

---

## 2. Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | React 18 + TypeScript | Single-page application |
| **Bundler** | Vite | Fast development and build |
| **Routing** | React Router v6 (HashRouter) | Client-side navigation |
| **Styling** | Tailwind CSS | Utility-first CSS |
| **Charts** | Recharts | Dashboards and analytics |
| **Calendar** | FullCalendar | Tasks and milestones |
| **Gantt** | react-frappe-gantt | Timeline view |
| **i18n** | react-i18next | English / Arabic, RTL |
| **Notifications** | react-hot-toast + in-app drawer | Toasts and notification center |
| **Backend** | NestJS (Node.js) | REST API server |
| **ORM** | Prisma | Database access |
| **Database** | PostgreSQL 15+ | Relational store |
| **Auth** | JWT + bcrypt + TOTP (speakeasy) | Login, 2FA |
| **SSO** | Google OAuth 2.0, SAML | Org-level SSO |
| **Email** | Resend | Invites, password reset |
| **Rate Limiting** | @nestjs/throttler | Request throttling |
| **API Docs** | Swagger (OpenAPI) | Interactive docs at `/api-docs` |
| **File Storage** | Local `uploads/` or MinIO (S3-compatible) | Uploads and reports |
| **Report Generation** | pptxgenjs, pdfkit | PPTX and PDF |
| **Payments** | Stripe | Invoice payment and webhooks |
| **AI** | OpenAI API (optional) | Summaries, suggestions, chat |
| **Real-time** | Socket.IO | WebSocket notifications |
| **Audit** | Custom AuditInterceptor | Action logging |

---

## 3. User Types & Roles

Arena360 uses a **9-role** permission model in two groups: internal (staff) and external (client).

### 3.1 Internal Roles (Staff)

| Role | Description | Key Permissions |
|------|-------------|-----------------|
| **SUPER_ADMIN** | System administrator | All permissions; users, SSO, admin panel |
| **OPS** | Operations manager | Clients, projects, financials, tasks, team |
| **PM** | Project Manager | Projects, clients, tasks, team (no financials) |
| **DEV** | Developer | Dashboard, clients, own tasks |
| **FINANCE** | Financial officer | Dashboard, financials, clients (read-heavy) |

### 3.2 External Roles (Client)

| Role | Description | Key Permissions |
|------|-------------|-----------------|
| **CLIENT_OWNER** | Client org owner | Dashboard, clients, financials for own org |
| **CLIENT_MANAGER** | Client manager | Dashboard and client-scoped data |
| **CLIENT_MEMBER** | Client member | Dashboard only |
| **VIEWER** | Read-only guest | Dashboard only |

### 3.3 Permission Matrix

| Permission | SUPER_ADMIN | OPS | PM | DEV | FINANCE | CLIENT_OWNER | CLIENT_MANAGER | CLIENT_MEMBER | VIEWER |
|------------|:-----------:|:--:|:--:|:---:|:-------:|:------------:|:--------------:|:-------------:|:------:|
| VIEW_DASHBOARD | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| VIEW_CLIENTS | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| MANAGE_CLIENTS | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| MANAGE_PROJECTS | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| MANAGE_TASKS | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| MANAGE_TEAM | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| VIEW_FINANCIALS | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |
| MANAGE_USERS | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| VIEW_ADMIN | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

Custom permissions allow per-user overrides on top of role defaults.

---

## 4. Features (Detailed)

### 4.1 Authentication & Authorization

- **JWT login** with email/password (bcrypt)
- **Two-Factor Authentication (2FA)** — TOTP setup, verify at login, disable with password
- **Forgot password** — Email reset link (hashed token, 1-hour expiry, single-use) via Resend
- **Reset password** — Dedicated page; token from URL; backend validates and updates password
- **Google SSO** — Per-org OAuth; login and callback with org in state
- **SAML SSO** — Metadata, authorize URL, callback; find-or-create user from SAML; Settings: entry point, issuer, IdP cert
- **Invite-based onboarding** — Invite links (SHA-256 hashed tokens, expiry, single-use)
- **Role-based protection** — Frontend routes and backend JWT + guards
- **User impersonation** — Super Admins can impersonate for support
- **Org-scoped isolation** — All data scoped by `orgId`
- **Rate limiting** — Stricter limits on login, 2FA, forgot/reset password, accept-invite

---

### 4.2 Multi-Tenancy & Onboarding

- **Multiple organizations** — Org creation (e.g. POST /org, signup-org flow); full data isolation per org
- **Onboarding wizard** — Guided steps for new orgs; GET/PATCH onboarding-status; dismiss for SUPER_ADMIN
- **Org settings** — Name, slug, logo, primary/accent colors, usage, SSO config

---

### 4.3 Dashboard (Role-Adaptive)

Dashboards are **role-specific**: Admin, Developer, Finance, and Client.

- **Admin (SUPER_ADMIN, OPS, PM):** KPIs (clients, projects, revenue, overdue tasks), revenue chart, latest updates, projects at risk, pending approvals, quick actions
- **Developer (DEV):** My open tasks, due soon, in review, overdue; task list with project link
- **Finance (FINANCE):** Financial KPIs, revenue, outstanding, invoices due
- **Client (CLIENT_*):** Client-scoped projects, status, and CLIENT-visible updates

**Dashboard customization:** Users can show/hide widgets and reorder them via “Customize dashboard” (stored in `dashboardPreferences`).

---

### 4.4 Client Management (CRM)

- **Full lifecycle** — List, create, edit, archive; search and filter by status
- **Client detail** — Profile (logo, contact, industry), billing (currency, VAT, tax ID), revenue YTD, outstanding balance
- **Files** — Upload, download (presigned), categorize, visibility (Internal/Client)
- **Members** — Add/remove client users; CLIENT_OWNER / CLIENT_MANAGER / CLIENT_MEMBER
- **Projects** — List of projects for the client
- **Statuses:** ACTIVE, INACTIVE, LEAD, ARCHIVED

---

### 4.5 Project Management

**CRUD:** Create (name, client, description, status, budget, dates, tags), edit, archive. List with search and filters.

**Statuses:** PLANNING, IN_PROGRESS, TESTING, DEPLOYED, MAINTENANCE, ACTIVE, ON_HOLD, COMPLETED, ARCHIVED  
**Health:** GOOD, AT_RISK, CRITICAL

**Project detail — tabs:**

| Tab | Content |
|-----|---------|
| **Overview** | Description, status, health, progress, dates, budget, tags, metrics |
| **Tasks** | Kanban (Backlog, To Do, In Progress, Review, Done); create/edit/delete; assign; priority; due date; labels; link to milestones |
| **Time** | Time entries per task (date, minutes, billable, note); CRUD |
| **Timeline** | Gantt (react-frappe-gantt) for tasks |
| **Sprints** | Create/edit/delete sprints; backlog vs sprint tasks; assign tasks to sprint |
| **Recurring tasks** | Templates (title, recurrence rule, next run); cron creates tasks; enable/disable |
| **Milestones** | Create/edit/delete; status; percent complete; owner; due date |
| **Updates** | Status updates; visibility INTERNAL/CLIENT; author and timestamp |
| **Files** | Upload/download/delete; categories; visibility |
| **Findings** | Project findings; link to QA module |
| **Reports** | Create reports; generate PPTX/PDF; download |
| **Financials** | Contracts and invoices; Pay with Card (Stripe); multi-step approvals |
| **Team** | Add/remove members; change roles |
| **Discussions** | Threaded discussions; replies; delete |
| **Activity** | Activity feed for the project |

---

### 4.6 Task Management

- **Fields:** Title, description, status, priority, assignee, due date, labels, milestone, sprint, story points
- **Workflow:** BACKLOG → TODO → IN_PROGRESS → REVIEW → DONE
- **Task dependencies** — Predecessor/successor; add/remove; list for project
- **Recurring tasks** — Tasks created from templates (link via `sourceRecurringId`)
- **My Work** — Tasks assigned to current user; KPIs (open, due soon, in review, overdue); filters; navigate to project

---

### 4.7 Findings / QA Module

- **List** — All findings; filter by severity/status; search
- **Detail** — Severity (Low, Medium, High, Critical); status (Open → In Progress → In Review → Closed/Dismissed); visibility; assignment; evidence (files); comments; timeline
- **AI** — Optional “Analyze finding” (remediation, severity) when OpenAI is configured

---

### 4.8 Reporting & Export

- **Report list** — Search and type filters
- **Report generation** — Backend builds PPTX (pptxgenjs) and PDF (pdfkit) from project data; store under uploads; download by report ID
- **Templates** — ReportTemplate model and template support
- **CSV export** — Findings, tasks (by project), invoices (by project); export buttons on list views

---

### 4.9 Financial Management

- **Contracts** — Amount, currency (default SAR), dates, status (Active/Completed/Cancelled)
- **Invoices** — Number, amount, due date, status (Draft/Issued/Paid/Overdue); link to contract
- **Stripe payments** — Create payment intent; “Pay with Card” + Stripe Elements in Financials tab; webhook for payment_intent.succeeded
- **Approvals** — Multi-step approval for reports, invoices, contracts; approve/reject with comment
- **Access** — SUPER_ADMIN, OPS, FINANCE, CLIENT_OWNER (scoped)

---

### 4.10 File Management

- **Storage** — Local `uploads/` or MinIO (S3-compatible)
- **Scopes** — Client, project, finding
- **Categories** — Docs, Designs, Builds, Logo, Evidence, Other
- **Visibility** — Internal or Client
- **Operations** — Upload, download (presigned), delete; metadata (name, type, size, uploader)

---

### 4.11 User Management & Administration

- **Users Admin (SUPER_ADMIN)** — List, search, filter, create, edit role, activate/deactivate
- **Roles Admin** — Role definitions and permission matrix
- **Invites** — Invite links with hashed token and expiry; email via Resend
- **Custom permissions** — Per-user overrides (role + customPermissions)

---

### 4.12 Notifications & Real-Time

- **In-app notifications** — List, mark read, mark all read; preferences (email vs in-app)
- **WebSocket** — Gateway emits on notification create; frontend socket in Layout; live updates in notification drawer
- **Drawer** — Header bell; unread count; list with link to entity

---

### 4.13 Workflow Automation & Approvals

- **Automation rules** — Entity/event (e.g. task or finding created/status changed); conditions; actions (e.g. notify, assign); CRUD; active/inactive
- **Condition builder** — Configurable trigger conditions in Automations UI
- **Approval requests** — Multi-step (stepOrder, approverId); create with steps array; approve/reject enforces current step; used for reports, invoices, contracts in Financials tab

---

### 4.14 Integrations & Webhooks

- **Integrations** — Slack, GitHub; config per integration (URLs, tokens)
- **Slack** — Test connection; optional notifications
- **GitHub** — Create issues from findings/tasks
- **Webhooks** — Outbound: URL, secret, events; payload delivery

---

### 4.15 Custom Fields, SLA, Wiki

- **Custom fields** — Definitions (Project/Task/Client, key, label, type, options); values per entity; CRUD API
- **SLA** — Policies (Task/Finding/Invoice, target hours, client scope); trackers; breach check endpoint
- **Wiki** — Pages (slug, title, body); versioning; CRUD; get by slug or id; frontend Wiki route

---

### 4.16 Global Search, API Docs, Security

- **Search** — GET `/search?q=...&limit=...` across projects, tasks, clients, findings; frontend Ctrl+K command palette; navigate to result
- **API documentation** — Swagger at `/api-docs`
- **Rate limiting** — Global (e.g. 100/60s); stricter on auth routes (e.g. 5/min)
- **Audit** — AuditInterceptor logs mutating calls; actor, action, entity, before/after, request ID, IP, user agent; org-scoped; sensitive redaction

---

### 4.17 AI Features (Optional)

When OpenAI API key is set:

- **Project summary** — AI-generated summary
- **Suggest tasks** — AI-suggested tasks for a project
- **Status report** — AI-generated status text
- **Analyze finding** — Remediation and severity suggestions
- **Chat** — Contextual chat (optional project/finding context)
- **Frontend** — Sparkles entry point; AI context provider

---

### 4.18 Custom Branding & Changelog

- **Branding** — Public GET org-by-slug returns name, logo, primaryColor, accentColor, SSO flags; Login and app Layout apply logo and colors
- **Changelog** — GET `/changelog` returns version entries; in-app Changelog modal (History icon in header)

---

### 4.19 Performance Analytics & Backup

- **Analytics** — Velocity (tasks completed per week), completion rate, total/done tasks; portfolio, team, financial, findings breakdowns; Analytics page with charts
- **Backup** — PowerShell script (pg_dump using DATABASE_URL); docs/backup-restore.md for procedures and DR

---

### 4.20 Settings & i18n

- **Settings** — Profile (name, email, role); Security (change password, 2FA setup/verify/disable); notification preferences; theme (dark/light)
- **i18n** — English and Arabic; RTL for Arabic; language toggle; translation coverage for UI

---

## 5. Operational Flows

### 5.1 Onboarding a New Client

```
Admin creates Client → Profile and billing → Upload logo →
Add client users (invites) → Client users accept invite & set password →
Client appears as ACTIVE → Client users see Client Dashboard and their projects
```

### 5.2 Onboarding a New Organization (Multi-Tenant)

```
Signup-org (name, slug, admin email, password) → Org created →
Admin logs in → Onboarding wizard (optional) → Configure SSO/branding →
Invite members → Create clients and projects
```

### 5.3 Project Lifecycle

```
PM creates Project → Client, budget, dates → Add team →
Milestones and tasks → Sprints (optional) → Recurring task templates (optional) →
Team logs time → Status updates → Findings → Reports generated →
Contract and invoices → Approvals → Stripe payment (optional) →
Project status → COMPLETED
```

### 5.4 Task Workflow

```
Task created (BACKLOG) → Assign to developer → TODO → IN_PROGRESS →
Time entries logged → REVIEW → DONE (automation/notifications can trigger at each step)
```

### 5.5 Finding Resolution

```
Finding created → Severity and assignee → Evidence and comments →
Status: In Progress → In Review → Closed (optional: AI analyze, GitHub issue)
```

### 5.6 Financial Flow

```
Contract created → Invoices issued → Client sees Financials →
“Pay with Card” → Stripe Payment Intent → Webhook marks invoice PAID →
Approval steps (if configured) for contract/report/invoice
```

### 5.7 Client Portal

```
Client user logs in (or SSO) → Client Dashboard → Their projects →
CLIENT-visible updates and files → View financials (if CLIENT_OWNER) →
No access to internal-only content
```

### 5.8 Forgot Password

```
Forgot password → Email → Reset link (hashed token, 1h) →
Reset password page → New password → Backend validates, updates →
Redirect to login
```

### 5.9 SSO (Google / SAML)

```
User selects SSO (org context) → Redirect to IdP → Consent →
Callback → Backend finds or creates user → JWT issued →
Redirect to app with token
```

---

## 6. Competitive Positioning

### 6.1 Maturity Rating

| Dimension | Score (1–10) | Notes |
|-----------|--------------|--------|
| Feature Completeness | 9/10 | Multi-tenancy, SSO, payments, workflow, analytics, backup, branding, changelog |
| UX / Design | 8/10 | Dark/light, responsive, glassmorphism, Gantt, calendar |
| Architecture | 7.5/10 | Clear modules, Prisma, JWT, audit, throttling, Swagger |
| Security | 8/10 | 2FA, reset flow, Google + SAML SSO, rate limiting, RBAC |
| Scalability | 7/10 | Multi-org; scales with DB and app servers |
| Reporting & Analytics | 8/10 | PPT/PDF, CSV, velocity/completion analytics |
| Integrations | 7/10 | Slack, GitHub, webhooks, Stripe, SAML IdPs |
| Automation | 8/10 | Rules, multi-step approvals, condition builder |
| Mobile | 4/10 | Responsive web; native app not in scope |
| Enterprise Readiness | 8/10 | Multi-org, SAML, 2FA, audit, payments, backup, branding |

**Overall: 7.6 / 10 — Enterprise-ready mid-market SaaS**

### 6.2 Feature Comparison

| Feature | Arena360 | Jira | Monday | Asana | ClickUp | Basecamp |
|---------|:--------:|:----:|:------:|:-----:|:-------:|:--------:|
| Task Management | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Kanban | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Client Portal | ✅ | ❌ | ✅ | ❌ | ❌ | ✅ |
| Financials | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Findings / QA | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Role Dashboards | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Time Tracking | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Gantt / Timeline | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Automation | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Integrations | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| API Docs | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| SSO / 2FA | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| i18n / RTL | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Audit Trail | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Report Gen (PPT/PDF) | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| AI Features | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |

### 6.3 Differentiators

1. **Client portal + financials** — Native client view with contracts, invoices, and Stripe payment in one place  
2. **Findings/QA module** — Severity, evidence, comments, AI analyze, GitHub issue creation  
3. **Role-based dashboards** — Four dashboard types (Admin, Dev, Finance, Client) with customization  
4. **Multi-tenancy + SSO** — Multiple orgs, Google and SAML, org-level branding  
5. **Arabic / RTL** — Full i18n and RTL support  
6. **Audit + security** — Before/after audit log, 2FA, rate limiting, API docs  
7. **Workflow + automation** — Multi-step approvals and rule-based automation in one product  
8. **Recurring tasks + analytics** — Scheduled task creation and velocity/completion analytics  

---

## 7. Roadmap & Optional Enhancements

- **Native mobile app** — Deferred; responsive web covers core use cases  
- **Additional payment providers** — Optional (e.g. more gateways or regional methods)  
- **Client satisfaction metrics** — Optional extension of analytics  
- **Backup scheduling** — Use existing script and docs in cron/Task Scheduler for automated backups  

---

## 8. Data Model (Summary)

Core entity hierarchy (40+ models):

```
Org
├── User (2FA, customPermissions, dashboardPreferences)
│   ├── UserInvite, PasswordResetToken, UserIdentity
│   ├── ClientMembership, ProjectMembership
├── SSOConfig (Google, SAML)
├── Client → ClientMember, FileAsset
│   └── Project
│       ├── ProjectMember, Task (sourceRecurringId), TaskDependency
│       ├── Sprint, RecurringTaskTemplate, Milestone
│       ├── ProjectUpdate, FileAsset, Finding (+ Comment, FileAsset)
│       ├── Report, ReportTemplate, Contract, Invoice
│       ├── Discussion → DiscussionReply, TimeEntry
├── ActivityFeed, ApprovalRequest
├── Integration, Webhook, CustomFieldDef, CustomFieldValue
├── Notification, NotificationPreference
├── AutomationRule, AutomationLog
├── SLAPolicy, SLATracker
├── WikiPage, WikiPageVersion
└── AuditLog
```

---

## 9. Infrastructure & Deployment

| Aspect | Details |
|--------|---------|
| **Local dev** | Frontend `npm run dev` (:5173), Backend `npm run start:dev` (:3000) |
| **Database** | PostgreSQL; Prisma `db push` or migrate |
| **Seeding** | `npx prisma db seed` |
| **Health** | `GET /health` |
| **API docs** | `GET /api-docs` (Swagger) |
| **Environment** | Joi-validated .env (DATABASE_URL, JWT_SECRET, ALLOWED_ORIGINS, FRONTEND_URL, API_URL, Resend, S3_*, Stripe, OPENAI_API_KEY, etc.) |
| **Rate limiting** | ThrottlerModule + per-route overrides |
| **Logging** | Structured stdout; audit and redaction |
| **Backup** | scripts/backup-db.ps1; docs/backup-restore.md |

---

## 10. Summary

| Category | Verdict |
|----------|---------|
| **What Arena360 is** | Multi-tenant, role-aware project management platform with CRM, financials, QA/findings, client portal, time tracking, real-time notifications, Google + SAML SSO, Stripe payments, multi-step approvals, dashboard customization, recurring tasks, backup/DR, custom branding, changelog, and velocity/completion analytics |
| **Strengths** | Multi-org isolation, onboarding wizard, live notifications, enterprise SSO, payment collection, workflow and automation, configurable dashboards, recurring tasks, backup docs, white-label branding, in-app changelog, performance analytics, audit, 2FA, API docs, i18n |
| **Gaps** | Native mobile (deferred); optional enhancements (e.g. more payment providers, satisfaction metrics) |
| **Position** | Enterprise-ready mid-market SaaS with strong differentiators in tenancy, SSO, payments, workflow, and analytics |
| **Next steps** | Schedule and test backup/restore in production; consider native mobile if required; optional analytics and payment extensions |
