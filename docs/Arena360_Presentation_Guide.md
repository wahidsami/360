# Arena360 — Comprehensive Presentation & Project Management Guide

> **Version:** 1.0 | **Date:** March 2026  
> **Purpose:** Client presentation demo guide — architecture, user types, dashboards, and PM workflows

---

## Table of Contents

1. [What is Arena360?](#1-what-is-arena360)
2. [Technology Architecture](#2-technology-architecture)
3. [User Types & Roles](#3-user-types--roles)
4. [Role-Based Dashboards](#4-role-based-dashboards)
5. [Core Features Overview](#5-core-features-overview)
6. [How a PM & Team Uses Arena360](#6-how-a-pm--team-uses-arena360)
7. [Step-by-Step Demo Flow](#7-step-by-step-demo-flow)
8. [Key Differentiators vs Competitors](#8-key-differentiators-vs-competitors)
9. [Competitive Comparison](#9-competitive-comparison)
10. [Client Portal Experience](#10-client-portal-experience)
11. [System Architecture Diagram](#11-system-architecture-diagram)
12. [Data Model Overview](#12-data-model-overview)
13. [Deployment & Infrastructure](#13-deployment--infrastructure)
14. [Frequently Asked Questions (FAQ)](#14-frequently-asked-questions-faq)

---

## 1. What is Arena360?

**Arena360** is a **full-stack, multi-tenant project management and operations platform** built for:

- **Digital agencies**
- **IT service companies**
- **Consultancy & professional services firms**

It acts as a **centralized command center** where:

| Who | What They Do |
|-----|-------------|
| **Project Managers** | Create projects, assign tasks, track milestones, manage team |
| **Developers** | See their assigned tasks, log time, update statuses |
| **Finance Teams** | Manage contracts, invoices, and financial KPIs |
| **Operations** | Oversee all clients, projects, and organizational health |
| **Clients** | Monitor their projects, view updates, download files, and pay invoices |
| **Super Admins** | Control the entire platform — users, SSO, branding, audit logs |

### Core Value Proposition

> **"One platform for your entire project delivery lifecycle — from client onboarding to invoice collection."**

Arena360 uniquely combines:
- ✅ Project management (tasks, sprints, milestones, Gantt)
- ✅ Client portal (external-facing, role-scoped)
- ✅ Financial management (contracts, invoices, Stripe payments)
- ✅ QA/Findings tracking (severity, evidence, AI analysis)
- ✅ Real-time notifications (Socket.IO)
- ✅ Workflow automation (rules, multi-step approvals)
- ✅ Reports (PPTX / PDF generation)
- ✅ Time tracking (billable/non-billable)
- ✅ Arabic/RTL support (MENA-ready)

---

## 2. Technology Architecture

### Frontend

| Technology | Purpose |
|-----------|---------|
| **React 18 + TypeScript** | Single-page application |
| **Vite** | Fast build & dev server |
| **React Router v6 (HashRouter)** | Client-side navigation |
| **Tailwind CSS** | Styling & responsive design |
| **Recharts** | Charts and analytics |
| **FullCalendar** | Task/milestone calendar |
| **react-frappe-gantt** | Gantt timeline view |
| **react-i18next** | English / Arabic, RTL |
| **Socket.IO Client** | Real-time notifications |

### Backend

| Technology | Purpose |
|-----------|---------|
| **NestJS (Node.js)** | REST API server |
| **Prisma ORM** | Type-safe database access |
| **PostgreSQL 15+** | Relational data store |
| **JWT + bcrypt + TOTP** | Auth, sessions, 2FA |
| **Google OAuth 2.0 + SAML** | SSO for enterprise |
| **Socket.IO** | WebSocket real-time layer |
| **Stripe** | Invoice payments |
| **Resend** | Transactional email |
| **pptxgenjs + pdfkit** | Report generation (PPTX/PDF) |
| **MinIO (S3-compatible)** | File/document storage |
| **OpenAI API (optional)** | AI summaries, suggestions |
| **Swagger (OpenAPI)** | API documentation at `/api-docs` |

### Architecture Pattern

```
[React SPA] ←→ [NestJS REST API] ←→ [PostgreSQL]
                      ↕                    
              [MinIO File Storage]    
              [Socket.IO WebSocket]   
              [Stripe Webhooks]       
              [OpenAI (optional)]     
```

---

## 3. User Types & Roles

Arena360 uses a **9-role permission model** split into **Internal (Staff)** and **External (Client)** personas.

### 3.1 Internal Roles (Staff)

| Role | Title | What They Can Do |
|------|-------|-----------------|
| **SUPER_ADMIN** | System Administrator | Everything — users, SSO, branding, audit logs, admin panel |
| **OPS** | Operations Manager | All clients, projects, financials, tasks, team management |
| **PM** | Project Manager | Projects, tasks, team — **no financial management** |
| **DEV** | Developer | Dashboard, view clients, manage **their own** assigned tasks |
| **FINANCE** | Financial Officer | Dashboard, financials, clients — **read-heavy role** |

### 3.2 External Roles (Client Portal)

| Role | Title | What They Can See |
|------|-------|-----------------|
| **CLIENT_OWNER** | Client Organization Owner | Their projects, client-visible updates, financials |
| **CLIENT_MANAGER** | Client Team Manager | Their projects and client-scoped data |
| **CLIENT_MEMBER** | Regular Client Member | Dashboard only |
| **VIEWER** | Read-Only Guest | Dashboard only |

### 3.3 Permission Matrix

| Permission | SUPER_ADMIN | OPS | PM | DEV | FINANCE | CLIENT_OWNER | CLIENT_MANAGER | CLIENT_MEMBER | VIEWER |
|-----------|:-----------:|:---:|:--:|:---:|:-------:|:------------:|:--------------:|:-------------:|:------:|
| VIEW_DASHBOARD | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| VIEW_CLIENTS | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| MANAGE_CLIENTS | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| MANAGE_PROJECTS | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| MANAGE_TASKS | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| MANAGE_TEAM | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| VIEW_FINANCIALS | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |
| MANAGE_USERS | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| VIEW_ADMIN | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

> **Note:** Custom permissions allow per-user overrides on top of role defaults.

---

## 4. Role-Based Dashboards

One of Arena360's strongest differentiators — **every persona sees a tailored command center**.

### 4.1 Admin Dashboard (SUPER_ADMIN / OPS / PM)

The **operational overview** for managers and administrators.

**Widgets & Information:**
- 📊 **KPI Cards:** Total Clients | Active Projects | Revenue (SAR) | Overdue Tasks (with trend indicators)
- 📈 **Revenue Velocity Chart:** Area chart showing monthly revenue trends
- 📋 **Latest Project Updates:** Cross-project feed of newest status posts
- ⚠️ **Projects at Risk:** List of projects flagged as `AT_RISK` or `CRITICAL`
- ⏳ **Pending Approvals:** Count of items awaiting manager review
- ⚡ **Quick Actions / Tools Panel:** Shortcuts to create clients, projects, tasks
- 🎛️ **Dashboard Customization:** Show/hide and reorder widgets (stored per-user)

**Ideal for:** Daily standups, executive reporting, portfolio health checks

---

### 4.2 Developer Dashboard (DEV)

The **personal task command center** for developers and individual contributors.

**Widgets & Information:**
- ✅ **My Open Tasks:** All tasks assigned to this user with status badges
- 📅 **Due Soon:** Tasks with deadlines within 3 days (amber warning)
- 🔍 **In Review:** Tasks currently awaiting review
- 🚨 **Overdue Counter:** Tasks past their deadline (red alert)
- 🔗 **Project Quick Navigation:** One-click jump to parent project from any task

**Ideal for:** Morning task review, end-of-day progress check

---

### 4.3 Finance Dashboard (FINANCE)

The **financial health overview** for finance officers.

**Widgets & Information:**
- 💰 **Total Revenue:** Paid invoices across all projects
- 📉 **Outstanding Balance:** Unpaid / overdue invoices
- 📆 **Invoices Due:** Invoices approaching due date
- 📊 **Revenue Breakdown Charts:** Monthly financial trends

**Ideal for:** Cash flow management, financial reporting

---

### 4.4 Client Dashboard (CLIENT_*)

The **client portal view** — clients see only their own data.

**Widgets & Information:**
- 🏗️ **My Projects:** All projects linked to the client's organization
- 📊 **Project Status:** Aggregated health and progress per project
- 📢 **Recent Updates:** Status posts marked as `CLIENT` visible
- 📁 **Shared Files:** Files uploaded with `Client` visibility
- 💳 **Financials (CLIENT_OWNER only):** Contracts and invoices for their org

**Ideal for:** Client check-ins, status reporting, invoice payments

---

## 5. Core Features Overview

### 5.1 Client Management (CRM)

Full client lifecycle management:

| Action | Description |
|--------|-------------|
| Create Client | Name, industry, contact, billing info, logo |
| Client Statuses | ACTIVE / INACTIVE / LEAD / ARCHIVED |
| Client Portal Users | Invite CLIENT_OWNER / MANAGER / MEMBER |
| File Attachments | Docs, designs, logos — internal or client-visible |
| Financial Tracking | Revenue YTD, outstanding balance per client |

---

### 5.2 Project Management

Comprehensive project lifecycle with **15 specialized tabs**:

| Tab | What It Contains |
|-----|-----------------|
| **Overview** | Description, status, health, progress %, dates, budget, tags |
| **Tasks** | Kanban board (Backlog → Todo → In Progress → Review → Done) |
| **Time** | Time entries per task (date, minutes, billable/non-billable) |
| **Timeline** | Gantt chart for visual project timeline |
| **Sprints** | Sprint creation, backlog management, task assignment to sprints |
| **Recurring Tasks** | Task templates with cron-based scheduling |
| **Milestones** | Milestone tracking with % complete and owner |
| **Updates** | Status updates (Internal or Client-visible) |
| **Files** | Upload/download/categorize files by visibility |
| **Findings** | Link to QA/issue tracking module |
| **Reports** | Generate PPTX/PDF reports from project data |
| **Financials** | Contracts, invoices, Stripe payment |
| **Team** | Add/remove members, assign project roles |
| **Discussions** | Threaded project discussions |
| **Activity** | Full activity feed/audit trail for the project |

**Project Statuses:** PLANNING → IN_PROGRESS → TESTING → DEPLOYED → MAINTENANCE → COMPLETED → ARCHIVED  
**Project Health:** GOOD | AT_RISK | CRITICAL

---

### 5.3 Task Management

| Feature | Detail |
|---------|--------|
| **Workflow** | BACKLOG → TODO → IN_PROGRESS → REVIEW → DONE |
| **Fields** | Title, description, priority, assignee, due date, labels, milestone, sprint, story points |
| **Dependencies** | Predecessor/successor task links |
| **Recurring Tasks** | Auto-created from templates via cron |
| **My Work view** | Personal task summary with KPIs |
| **Priority colors** | Urgent (red), High (amber), Normal (cyan) |

---

### 5.4 Findings / QA Module

Dedicated quality assurance and issue tracking:

| Aspect | Detail |
|--------|--------|
| **Severity levels** | Low / Medium / High / Critical |
| **Status workflow** | Open → In Progress → In Review → Closed / Dismissed |
| **Evidence** | File uploads (screenshots, logs, test results) |
| **Comments** | Threaded comment system |
| **Timeline** | Activity history per finding |
| **AI Analysis** | Optional — OpenAI suggests remediation and confirms severity |
| **GitHub Integration** | Create GitHub issues directly from findings |

---

### 5.5 Financial Management

| Feature | Detail |
|---------|--------|
| **Contracts** | Amount, currency (SAR default), dates, status |
| **Invoices** | Invoice number, amount, due date, Draft/Issued/Paid/Overdue |
| **Stripe Payments** | "Pay with Card" via Stripe Elements; webhook marks invoice Paid |
| **Multi-step Approvals** | Approval chains for reports, invoices, contracts |
| **Access Control** | Only SUPER_ADMIN, OPS, FINANCE, CLIENT_OWNER can access |

---

### 5.6 Reporting & Analytics

| Feature | Detail |
|---------|--------|
| **Report types** | Technical, Executive, Compliance, Security, Financial, Status |
| **Export formats** | PPTX (PowerPoint), PDF |
| **CSV exports** | Tasks, findings, invoices |
| **Analytics page** | Velocity, completion rate, portfolio charts |
| **Project analytics** | Tasks completed per week, team performance |

---

### 5.7 Workflow Automation

| Feature | Detail |
|---------|--------|
| **Automation rules** | Trigger on task/finding created or status changed |
| **Conditions** | Configurable condition builder |
| **Actions** | Notify team, auto-assign, escalate |
| **Multi-step approvals** | Sequential approver chain for documents |

---

### 5.8 Integrations

| Integration | Capability |
|------------|-----------|
| **Slack** | Team notifications |
| **GitHub** | Create issues from findings/tasks |
| **Webhooks** | Outbound HTTP events for any trigger |
| **Google SSO** | OAuth 2.0 login per org |
| **SAML SSO** | Enterprise IdP (Okta, Azure AD, etc.) |
| **Stripe** | Invoice payment collection |
| **OpenAI** | AI summaries, suggestions, chat (optional) |

---

### 5.9 Other Key Features

| Feature | Description |
|---------|-------------|
| **2FA (TOTP)** | Time-based one-time passwords via authenticator app |
| **Global Search** | Ctrl+K command palette — find projects, tasks, clients, findings |
| **Wiki** | Project/org-level documentation pages with versioning |
| **SLA Management** | Define response/resolution SLAs per client |
| **Custom Fields** | Add custom metadata fields on projects, tasks, clients |
| **Audit Logs** | Before/after JSON snapshots of every mutation |
| **Real-time Notifications** | WebSocket push + in-app notification drawer |
| **i18n / RTL** | English and Arabic with full right-to-left layout |
| **Dark/Light Theme** | User preference toggle |
| **Custom Branding** | Org logo, primary color, accent color |
| **Changelog** | In-app version changelog |

---

## 6. How a PM & Team Uses Arena360

### The Complete PM Workflow

```
┌─────────────────────────────────────────────────────────┐
│                    PM DAILY WORKFLOW                     │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  1. Check Admin Dashboard → KPIs, at-risk projects       │
│  2. Review Pending Approvals → approve/reject            │
│  3. Open Project → check Tasks Kanban board              │
│  4. Assign new tasks to team members                     │
│  5. Post a Project Update (Internal or Client-visible)   │
│  6. Review Findings from QA team                         │
│  7. Check Financial tab → invoice statuses               │
│  8. Generate report if needed → PPTX or PDF              │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Developer Daily Workflow

```
┌─────────────────────────────────────────────────────────┐
│                  DEVELOPER DAILY WORKFLOW                │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  1. Open Developer Dashboard → see My Tasks              │
│  2. Check Due Soon alerts                                │
│  3. Open a Task → move to IN_PROGRESS                    │
│  4. Log time worked on the task                          │
│  5. Submit task for REVIEW when done                     │
│  6. Respond to Finding comments (if assigned QA items)   │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Project Lifecycle End-to-End

```
Phase 1: SETUP
  → Admin creates Client (CRM)
  → PM creates Project (linked to Client)
  → PM sets budget, dates, tags
  → PM adds team members

Phase 2: PLANNING
  → PM creates Milestones
  → PM creates Sprints (if Agile)
  → PM creates Tasks, assigns to Milestones and Sprints
  → PM sets recurring task templates (optional)

Phase 3: EXECUTION
  → Developers see tasks on dashboard & My Work
  → Team moves tasks: TODO → IN_PROGRESS → REVIEW → DONE
  → Team logs time entries on tasks (billable/non-billable)
  → PM posts Internal status updates

Phase 4: QA & REVIEW
  → QA/PM creates Findings (bugs, issues, risks)
  → Findings assigned to developers for fix
  → Evidence uploaded (screenshots, logs)
  → Findings closed when resolved

Phase 5: CLIENT REPORTING
  → PM posts Client-visible Updates
  → PM shares files with Client visibility
  → PM generates PPT/PDF Report
  → Report goes through Approval workflow

Phase 6: FINANCIAL CLOSE
  → Contract created in Financials tab
  → Invoices issued against contract
  → Client sees invoices in their portal
  → Client pays via Stripe "Pay with Card"
  → Webhook marks Invoice as PAID
  → Project status → COMPLETED
```

### Team Collaboration Features Used Daily

| Feature | Who Uses It | How |
|---------|------------|-----|
| **Kanban Board** | PM + DEV | Move tasks through workflow stages |
| **Discussions** | Whole Team | Project-level threaded conversations |
| **File Sharing** | PM + DEV + Client | Upload designs, docs, evidence |
| **Real-time Notifications** | Everyone | Get alerted on mentions, assignments |
| **Status Updates** | PM | Keep client informed on progress |
| **Activity Feed** | PM | Full audit of all project activity |
| **Global Search (Ctrl+K)** | Everyone | Quickly find any project/task/client |

---

## 7. Step-by-Step Demo Flow

> **Use this guide to walk through the demo for clients and stakeholders.**

### Demo Scenario: "Acme Corp Website Redesign Project"

---

#### Step 1 — Login & Dashboard (2 min)

**Login as PM:**
1. Open the app → Login page with Arena360 branding
2. Enter PM credentials → click **Sign In**
3. Show: **Admin Dashboard** loads with:
   - KPI Cards (Clients, Projects, Revenue, Overdue Tasks)
   - Revenue Velocity chart
   - Projects at Risk list
   - Pending Approvals
4. Say: *"As a PM, this is my command center — everything I need at a glance."*

---

#### Step 2 — Client Management (2 min)

1. Navigate to **Clients** in the sidebar
2. Show the client list — filter by status
3. Click **"Acme Corp"** → show Client Detail:
   - Profile, billing info, revenue
   - Associated projects list
   - Files tab (uploaded contracts, logos)
   - Members tab (their CLIENT_OWNER user)
4. Say: *"We manage all client relationships here — from leads to active clients, with full financial tracking."*

---

#### Step 3 — Project Details (5 min)

1. Click into **"Acme Corp Website Redesign"** project
2. **Overview Tab:** Show status (IN_PROGRESS), health (GOOD), progress %, budget
3. **Tasks Tab (Kanban):**
   - Show columns: Backlog | To Do | In Progress | Review | Done
   - Create a new task: "Redesign Homepage Hero Section"
   - Assign to DEV user, set priority High, set due date
   - Show task dragging (simulated)
4. **Milestones Tab:** Show "Design Phase Complete" milestone at 75%
5. **Timeline Tab (Gantt):** Show visual timeline of tasks
6. **Updates Tab:** Post update "Design Phase complete — moving to development"
7. **Files Tab:** Show uploaded files (designs, docs) with visibility control
8. **Reports Tab:** Show generated PDF report
9. **Financials Tab:** Show contract + invoice + "Pay with Card" button

---

#### Step 4 — Developer View (2 min)

1. **Switch user / show Developer Dashboard** (or explain it)
2. Dashboard shows:
   - My Open Tasks (3 tasks)
   - Due Soon (1 task)
   - In Review (1 task)
3. Click a task → update status from IN_PROGRESS to REVIEW
4. Log time: 2 hours, billable
5. Say: *"Developers have a clean, focused view — just their work, no clutter."*

---

#### Step 5 — QA / Findings (2 min)

1. Navigate to **Findings** in sidebar
2. Show findings list filtered by severity/status
3. Click a finding: "Login button not aligned on mobile"
   - Severity: High
   - Status: In Progress → change to In Review
   - View evidence screenshot already uploaded
   - Show timeline of status history
4. Say: *"Our QA module tracks every issue with full audit history — critical for quality-driven agencies."*

---

#### Step 6 — Client Portal (2 min)

1. **Login as CLIENT_OWNER** (or describe the experience)
2. Shows Client Dashboard — only **their** data
3. Projects: only Acme Corp's project visible
4. Updates: only CLIENT-visible updates shown
5. Files: only client-shared files
6. Financials: invoice with "Pay with Card" button
7. Say: *"Clients get a professional portal — no access to internal data, no confusion."*

---

#### Step 7 — Settings & Admin (1 min)

1. Navigate to **Settings**
2. Show: Profile, 2FA setup, Notification preferences, Theme toggle
3. Navigate to **Admin Panel** (Super Admin only)
4. Show: User management, Role matrix, Invite links, Audit logs
5. Show: **Integrations** — Slack, GitHub, Webhooks already configured

---

#### Step 8 — Quick Feature Highlights (1 min)

- **Ctrl+K** → Global search — find anything instantly
- **Bell icon** → Real-time notifications drawer
- **Language toggle** → Switch to Arabic (RTL layout)
- **Automations** → Show a rule: "When task status = DONE, notify PM"

---

#### Closing Statement

> *"Arena360 is not just a task manager — it's a complete delivery platform. Your PM runs projects, your developers deliver work, your finance team tracks revenue, and your clients stay informed — all in one system, with no friction."*

---

## 8. Key Differentiators vs Competitors

Arena360 has **8 unique selling points** that set it apart:

| # | Differentiator | Why It Matters |
|---|---------------|----------------|
| 1 | **Client Portal + Financials in one** | No need for a separate client communication or invoicing tool |
| 2 | **Findings / QA Module** | Dedicated issue tracker with severity, evidence, AI — rare in PM tools |
| 3 | **4 Role-Based Dashboards** | Each persona sees exactly what they need — PM, Dev, Finance, Client |
| 4 | **Multi-Tenancy + SSO** | Multiple orgs, Google OAuth, SAML — enterprise ready |
| 5 | **Stripe Payment Integration** | Clients can pay invoices directly in the platform |
| 6 | **Arabic / RTL Support** | Purpose-built for MENA-region clients |
| 7 | **Workflow Automation** | Multi-step approvals + rule-based triggers in one product |
| 8 | **Audit Trail (Before/After JSON)** | Enterprise-grade compliance logging |

---

## 9. Competitive Comparison

| Feature | Arena360 | Jira | Monday | Asana | ClickUp | Basecamp |
|---------|:--------:|:----:|:------:|:-----:|:-------:|:--------:|
| Task Management | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Kanban Board | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Client Portal** | ✅ | ❌ | ✅ | ❌ | ❌ | ✅ |
| **Financial Management** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Findings / QA Tracking** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Role-Based Dashboards** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Time Tracking | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Gantt / Timeline | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Automation | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| GitHub / Slack | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| SSO / 2FA | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Arabic / RTL** | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Audit Trail** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| PPTX/PDF Reports | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| **AI Features** | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Stripe Payments** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

**Overall Maturity Score: 7.6 / 10 — Enterprise-ready mid-market SaaS**

---

## 10. Client Portal Experience

The client portal is a **fully separate experience** within the same application:

### What Clients Can See

| Section | Visibility |
|---------|-----------|
| Their projects only | ✅ |
| CLIENT-visible status updates | ✅ |
| CLIENT-visible files | ✅ |
| Their invoices (CLIENT_OWNER) | ✅ |
| Pay invoice via Stripe | ✅ (CLIENT_OWNER) |
| Internal team discussions | ❌ |
| Internal-only files | ❌ |
| Other clients' data | ❌ |
| Financial details of other clients | ❌ |

### Client Onboarding Flow

```
1. Admin creates Client account (CRM)
2. Admin adds CLIENT_OWNER user → sends invite email
3. Client clicks invite link → sets password
4. Client logs in → sees their dashboard
5. All communication through platform (updates, files, discussions)
6. Invoice issued → Client receives notification → pays via Stripe
```

---

## 11. System Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                        ARENA360 PLATFORM                          │
│                                                                    │
│  ┌─────────────────────────┐   ┌──────────────────────────┐       │
│  │     FRONTEND (React)     │   │    BACKEND (NestJS)       │       │
│  │                          │   │                           │       │
│  │  ┌─────────────────┐    │   │  ┌──────────────────┐    │       │
│  │  │ Admin Dashboard  │    │   │  │  Auth Module      │    │       │
│  │  │ Dev Dashboard    │    │   │  │  Projects API     │    │       │
│  │  │ Finance Dashboard│    │◄──►│  │  Tasks API        │    │       │
│  │  │ Client Portal    │    │   │  │  Financials API   │    │       │
│  │  └─────────────────┘    │   │  │  Findings API     │    │       │
│  │                          │   │  │  Reports API      │    │       │
│  │  ┌─────────────────┐    │   │  │  Notifications    │    │       │
│  │  │  Project Tabs:   │    │   │  │  Automations      │    │       │
│  │  │  Tasks / Kanban  │    │   │  └──────────────────┘    │       │
│  │  │  Gantt / Timeline│    │   │           │               │       │
│  │  │  Findings / QA   │    │   │  ┌────────▼───────┐      │       │
│  │  │  Financials      │    │   │  │   PostgreSQL    │      │       │
│  │  │  Reports         │    │   │  │   (Prisma ORM) │      │       │
│  │  │  Discussions     │    │   │  └────────────────┘      │       │
│  │  └─────────────────┘    │   │                           │       │
│  └─────────────────────────┘   │  ┌──────────────────┐    │       │
│                                 │  │  MinIO / S3       │    │       │
│  ┌─────────────────────────┐   │  │  (File Storage)  │    │       │
│  │     EXTERNAL SERVICES    │   │  └──────────────────┘    │       │
│  │  Stripe (Payments)       │   │                           │       │
│  │  Google/SAML SSO         │   │  ┌──────────────────┐    │       │
│  │  Slack / GitHub          │   │  │  Socket.IO        │    │       │
│  │  OpenAI (optional)       │   │  │  (Real-time)     │    │       │
│  │  Resend (Email)          │   │  └──────────────────┘    │       │
│  └─────────────────────────┘   └──────────────────────────┘       │
└──────────────────────────────────────────────────────────────────┘
```

---

## 12. Data Model Overview

Arena360 has **40+ database models** organized around the following entity hierarchy:

```
Org (Organization / Tenant)
├── User
│   ├── 2FA / TOTP
│   ├── Custom Permissions (overrides)
│   ├── Dashboard Preferences
│   ├── UserInvite
│   └── UserIdentity (SSO)
│
├── SSOConfig (Google / SAML)
│
├── Client
│   ├── ClientMember (CLIENT_OWNER / MANAGER / MEMBER)
│   ├── FileAsset (client-scoped)
│   │
│   └── Project
│       ├── ProjectMember (PM / DEV roles)
│       ├── Task
│       │   ├── TimeEntry (billable hours)
│       │   ├── TaskDependency
│       │   └── Labels
│       ├── Sprint / RecurringTaskTemplate
│       ├── Milestone
│       ├── ProjectUpdate (Internal / Client visibility)
│       ├── FileAsset (project-scoped)
│       ├── Finding
│       │   ├── FindingComment
│       │   └── FileAsset (evidence)
│       ├── Report / ReportTemplate
│       ├── Contract → Invoice (Stripe)
│       ├── Discussion → DiscussionReply
│       └── ApprovalRequest
│
├── ActivityFeed / AuditLog
├── Notification / NotificationPreference
├── AutomationRule / AutomationLog
├── Integration (Slack, GitHub) / Webhook
├── CustomFieldDef / CustomFieldValue
├── SLAPolicy / SLATracker
└── WikiPage / WikiPageVersion
```

---

## 13. Deployment & Infrastructure

| Aspect | Details |
|--------|---------|
| **Local Dev** | Frontend: `npm run dev` (port 5173) / Backend: `npm run start:dev` (port 3000) |
| **Docker** | Full stack via `npm run stack:up` (API + PostgreSQL + MinIO) |
| **Database** | PostgreSQL 15+; migrations via `npx prisma db migrate` |
| **Seeding** | `npx prisma db seed` for initial demo data |
| **File Storage** | MinIO S3-compatible (or local `uploads/` folder) |
| **API Docs** | Swagger UI at `http://localhost:3000/api-docs` |
| **Health Check** | `GET /health` endpoint |
| **Production** | Docker Compose with `.env.prod`, restart policies, hidden ports |
| **Backup** | `scripts/backup-db.ps1` for pg_dump; documented restore procedure |
| **Rate Limiting** | 100 req/60s global; stricter on auth routes (5/min) |
| **Logging** | Structured stdout; sensitive data auto-redacted in production |

---

## 14. Frequently Asked Questions (FAQ)

**Q: What makes Arena360 different from Jira or Monday.com?**  
A: Arena360 combines project management with a **built-in client portal, financial management, and QA/findings tracking** in one system. Competitors require separate tools for each.

**Q: Can clients log in and see their project status?**  
A: Yes. Clients get a dedicated portal login showing only their data — updates, files, and invoices. They can even pay invoices via Stripe directly in the app.

**Q: Does it support Arabic?**  
A: Yes. Full Arabic (RTL) layout is supported with a one-click language toggle. All UI elements adapt to right-to-left reading direction.

**Q: Is there Single Sign-On (SSO)?**  
A: Yes. Google OAuth 2.0 and SAML 2.0 are supported for enterprise SSO (compatible with Okta, Azure AD, and any SAML IdP).

**Q: How secure is the platform?**  
A: Arena360 includes: JWT authentication, bcrypt password hashing, 2FA (TOTP), rate limiting on all endpoints, full audit logging, org-level data isolation, and HTTPS.

**Q: Can we generate reports for clients?**  
A: Yes. The Reports tab allows generating PowerPoint (PPTX) and PDF reports from live project data, which can be shared with clients or used in presentations.

**Q: How does it handle multiple organizations?**  
A: Arena360 is multi-tenant — each organization has fully isolated data. Multiple companies can use the same deployment without seeing each other's data.

**Q: What integrations are supported?**  
A: Slack (notifications), GitHub (issue creation from findings), Stripe (payments), Google SSO, SAML SSO, and custom webhooks for any other system.

**Q: Is AI built in?**  
A: Optional AI features via OpenAI API: project summaries, task suggestions, finding analysis, status report generation, and contextual chat.

**Q: How is the system backed up?**  
A: A PowerShell backup script (`scripts/backup-db.ps1`) runs pg_dump. Full backup/restore documentation is included in `docs/backup-restore.md`.

---

*© Arena360 — Confidential Client Presentation Document*  
*Version 1.0 | March 2026*
