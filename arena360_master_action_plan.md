# Arena360 — Master Action Plan
> **Combined from:** Implementation Plan + Enterprise Upgrade Plan  
> **Last Updated:** March 6, 2026  
> **Target:** Push Arena360 from 4.6/10 → 9.5/10  
> **Dropped:** Mobile App (deferred)  
> **AI Provider:** OpenAI  
> **File Storage:** Local disk (`uploads/`) — no Docker/MinIO required

---

## Progress Legend
| Symbol | Meaning |
|---|---|
| ✅ | Completed |
| 🔄 | In Progress / Partially Done |
| ⬜ | Not Started |

---

## Phase 0 — Foundation (Weeks 1–4)

### 0.1 Database Schema Upgrade
> All schema additions use defaults — no data loss on existing DBs.

| # | Task | Status | Notes |
|---|---|---|---|
| 0.1.1 | Add `customPermissions String[]` to [User](file:///d:/Waheed/MypProjects/Arena360/src/types.ts#29-36) model | ✅ | Done |
| 0.1.2 | Add `slug`, `plan`, `maxUsers`, `maxProjects`, `maxStorageMB`, `trialEndsAt`, `logo`, `primaryColor`, `accentColor` to `Org` | ✅ | Done |
| 0.1.3 | Add `templateId`, `generatedFileKey`, `generatedAt` to [Report](file:///d:/Waheed/MypProjects/Arena360/src/types.ts#97-107) model | ✅ | Done |
| 0.1.4 | Add `ReportTemplate` model | ✅ | Done |
| 0.1.5 | Run `npx prisma db push` (applies changes to pgAdmin DB) | ⬜ | **Next step** |
| 0.1.6 | Run `npx prisma generate` (regenerates Prisma client) | ⬜ | After 0.1.5 |

**Commands:**
```bash
cd arena360-api
npx prisma db push
npx prisma generate
```

---

### 0.2 Install New npm Packages

| # | Package | Purpose | Status |
|---|---|---|---|
| 0.2.1 | `pptxgenjs` | PowerPoint report generation | ⬜ |
| 0.2.2 | `openai` | OpenAI API SDK | ⬜ |
| 0.2.3 | `@nestjs/swagger` | API documentation | ⬜ |
| 0.2.4 | `swagger-ui-express` | Swagger UI | ⬜ |

**Command:**
```bash
cd arena360-api
npm install pptxgenjs openai @nestjs/swagger swagger-ui-express
```

---

### 0.3 Security & Rate Limiting

| # | Task | Status | Files |
|---|---|---|---|
| 0.3.1 | Install `@nestjs/throttler` | ⬜ | — |
| 0.3.2 | Add `ThrottlerModule` to [app.module.ts](file:///d:/Waheed/MypProjects/Arena360/arena360-api/src/app.module.ts) | ⬜ | [src/app.module.ts](file:///d:/Waheed/MypProjects/Arena360/arena360-api/src/app.module.ts) |
| 0.3.3 | Apply throttle limits to auth endpoints | ⬜ | [src/auth/auth.controller.ts](file:///d:/Waheed/MypProjects/Arena360/arena360-api/src/auth/auth.controller.ts) |

---

### 0.4 Global Search

| # | Task | Status | Files |
|---|---|---|---|
| 0.4.1 | Create `search/search.service.ts` with PG full-text across Projects/Tasks/Clients/Findings | ⬜ | `src/search/` (new) |
| 0.4.2 | Create `search/search.controller.ts` → `GET /search?q=term` | ⬜ | `src/search/` (new) |
| 0.4.3 | Wire search input in [Layout.tsx](file:///d:/Waheed/MypProjects/Arena360/src/components/Layout.tsx) header | ⬜ | [src/components/Layout.tsx](file:///d:/Waheed/MypProjects/Arena360/src/components/Layout.tsx) |
| 0.4.4 | Create `SearchResults.tsx` command-palette modal (Ctrl+K) | ⬜ | `src/components/SearchResults.tsx` (new) |

---

### 0.5 API Docs (Swagger)

| # | Task | Status | Files |
|---|---|---|---|
| 0.5.1 | Add `DocumentBuilder` + `SwaggerModule` to [main.ts](file:///d:/Waheed/MypProjects/Arena360/arena360-api/src/main.ts) | ⬜ | [src/main.ts](file:///d:/Waheed/MypProjects/Arena360/arena360-api/src/main.ts) |
| 0.5.2 | Add `@ApiTags` and `@ApiProperty` to key controllers/DTOs | ⬜ | Across controllers |

---

### 0.6 Data Export

| # | Task | Status | Files |
|---|---|---|---|
| 0.6.1 | Add CSV export endpoint for Tasks | ⬜ | `src/tasks/tasks.controller.ts` |
| 0.6.2 | Add CSV export endpoint for Findings | ⬜ | `src/findings/findings.controller.ts` |
| 0.6.3 | Add CSV export endpoint for Invoices | ⬜ | `src/invoices/invoices.controller.ts` |
| 0.6.4 | Add export buttons to frontend list views | ⬜ | Multiple pages |

---

## Phase 1 — Core Engine (Weeks 5–12)

### 1.1 Enhanced User Management with Permissions ⭐ Priority

| # | Task | Status | Files |
|---|---|---|---|
| 1.1.1 | Create `auth/permissions.decorator.ts` | ⬜ | `src/auth/permissions.decorator.ts` (new) |
| 1.1.2 | Create `auth/permissions.guard.ts` | ⬜ | `src/auth/permissions.guard.ts` (new) |
| 1.1.3 | Update [auth/jwt.strategy.ts](file:///d:/Waheed/MypProjects/Arena360/arena360-api/src/auth/jwt.strategy.ts) to include `customPermissions` | ⬜ | [src/auth/jwt.strategy.ts](file:///d:/Waheed/MypProjects/Arena360/arena360-api/src/auth/jwt.strategy.ts) |
| 1.1.4 | Update [create-user.dto.ts](file:///d:/Waheed/MypProjects/Arena360/arena360-api/src/users/dto/create-user.dto.ts) — add `permissions?: string[]` | ⬜ | [src/users/dto/create-user.dto.ts](file:///d:/Waheed/MypProjects/Arena360/arena360-api/src/users/dto/create-user.dto.ts) |
| 1.1.5 | Update [update-user.dto.ts](file:///d:/Waheed/MypProjects/Arena360/arena360-api/src/users/dto/update-user.dto.ts) — add `permissions?: string[]` | ⬜ | [src/users/dto/update-user.dto.ts](file:///d:/Waheed/MypProjects/Arena360/arena360-api/src/users/dto/update-user.dto.ts) |
| 1.1.6 | Update [users.service.ts](file:///d:/Waheed/MypProjects/Arena360/arena360-api/src/users/users.service.ts) — store/return `customPermissions` | ⬜ | [src/users/users.service.ts](file:///d:/Waheed/MypProjects/Arena360/arena360-api/src/users/users.service.ts) |
| 1.1.7 | Update [users.controller.ts](file:///d:/Waheed/MypProjects/Arena360/arena360-api/src/users/users.controller.ts) — add `PATCH /:id/permissions` | ⬜ | [src/users/users.controller.ts](file:///d:/Waheed/MypProjects/Arena360/arena360-api/src/users/users.controller.ts) |
| 1.1.8 | Update [common/guards/roles.guard.ts](file:///d:/Waheed/MypProjects/Arena360/arena360-api/src/common/guards/roles.guard.ts) — SUPER_ADMIN bypass | ⬜ | [src/common/guards/roles.guard.ts](file:///d:/Waheed/MypProjects/Arena360/arena360-api/src/common/guards/roles.guard.ts) |
| 1.1.9 | Update frontend [types.ts](file:///d:/Waheed/MypProjects/Arena360/src/types.ts) — add `customPermissions` to User | ⬜ | [src/types.ts](file:///d:/Waheed/MypProjects/Arena360/src/types.ts) |
| 1.1.10 | Update `AuthContext.tsx` — expose `hasPermission()` utility | ⬜ | [src/contexts/AuthContext.tsx](file:///d:/Waheed/MypProjects/Arena360/src/contexts/AuthContext.tsx) |
| 1.1.11 | Update [PermissionGate.tsx](file:///d:/Waheed/MypProjects/Arena360/src/components/PermissionGate.tsx) — check role defaults + custom | ⬜ | [src/components/PermissionGate.tsx](file:///d:/Waheed/MypProjects/Arena360/src/components/PermissionGate.tsx) |
| 1.1.12 | Update [UsersAdmin.tsx](file:///d:/Waheed/MypProjects/Arena360/src/pages/admin/UsersAdmin.tsx) — permission checkboxes in add/edit modal | ⬜ | [src/pages/admin/UsersAdmin.tsx](file:///d:/Waheed/MypProjects/Arena360/src/pages/admin/UsersAdmin.tsx) |
| 1.1.13 | Update [RolesAdmin.tsx](file:///d:/Waheed/MypProjects/Arena360/src/pages/admin/RolesAdmin.tsx) — show default and custom permission view | ⬜ | [src/pages/admin/RolesAdmin.tsx](file:///d:/Waheed/MypProjects/Arena360/src/pages/admin/RolesAdmin.tsx) |

---

### 1.2 Report Designer & Generator (PPT) ⭐ Priority

| # | Task | Status | Files |
|---|---|---|---|
| 1.2.1 | Create `reports/report-generator.service.ts` using `pptxgenjs` | ⬜ | `src/reports/report-generator.service.ts` (new) |
| 1.2.2 | Create built-in template JSON: `project-status.template.json` | ⬜ | `src/reports/templates/` (new dir) |
| 1.2.3 | Create built-in template JSON: `financial-summary.template.json` | ⬜ | `src/reports/templates/` |
| 1.2.4 | Create built-in template JSON: `findings-report.template.json` | ⬜ | `src/reports/templates/` |
| 1.2.5 | Create built-in template JSON: `executive-overview.template.json` | ⬜ | `src/reports/templates/` |
| 1.2.6 | Create `report-templates.controller.ts` (`GET/POST /report-templates`) | ⬜ | `src/reports/report-templates.controller.ts` (new) |
| 1.2.7 | Update [reports.controller.ts](file:///d:/Waheed/MypProjects/Arena360/arena360-api/src/reports/reports.controller.ts) — add `POST /generate`, `GET /:id/download` | ⬜ | [src/reports/reports.controller.ts](file:///d:/Waheed/MypProjects/Arena360/arena360-api/src/reports/reports.controller.ts) |
| 1.2.8 | Update [reports.service.ts](file:///d:/Waheed/MypProjects/Arena360/arena360-api/src/reports/reports.service.ts) — add `generate()` + `getDownloadUrl()` | ⬜ | [src/reports/reports.service.ts](file:///d:/Waheed/MypProjects/Arena360/arena360-api/src/reports/reports.service.ts) |
| 1.2.9 | Update [reports.module.ts](file:///d:/Waheed/MypProjects/Arena360/arena360-api/src/reports/reports.module.ts) — register generator service + templates controller | ⬜ | [src/reports/reports.module.ts](file:///d:/Waheed/MypProjects/Arena360/arena360-api/src/reports/reports.module.ts) |
| 1.2.10 | Update frontend [Reports.tsx](file:///d:/Waheed/MypProjects/Arena360/src/pages/Reports.tsx) — real data, generate modal, download button | ⬜ | [src/pages/Reports.tsx](file:///d:/Waheed/MypProjects/Arena360/src/pages/Reports.tsx) |
| 1.2.11 | Update [ReportsTab.tsx](file:///d:/Waheed/MypProjects/Arena360/src/components/project/ReportsTab.tsx) — generate button, template picker, download | ⬜ | [src/components/project/ReportsTab.tsx](file:///d:/Waheed/MypProjects/Arena360/src/components/project/ReportsTab.tsx) |
| 1.2.12 | Update [api.ts](file:///d:/Waheed/MypProjects/Arena360/src/services/api.ts) — `reports.generate()`, `reports.download()`, `reports.getTemplates()` | ⬜ | [src/services/api.ts](file:///d:/Waheed/MypProjects/Arena360/src/services/api.ts) |

---

### 1.3 Multi-Tenancy Foundations ⭐ Priority

| # | Task | Status | Files |
|---|---|---|---|
| 1.3.1 | Create `org/org.service.ts` — `getOrg()`, `updateOrg()`, `getUsage()` | ⬜ | `src/org/org.service.ts` (new) |
| 1.3.2 | Create `org/org.controller.ts` — `GET /org`, `PATCH /org`, `GET /org/usage` | ⬜ | `src/org/org.controller.ts` (new) |
| 1.3.3 | Create `org/org.module.ts` | ⬜ | `src/org/org.module.ts` (new) |
| 1.3.4 | Create `common/guards/plan-limits.guard.ts` | ⬜ | `src/common/guards/plan-limits.guard.ts` (new) |
| 1.3.5 | Register `OrgModule` in [app.module.ts](file:///d:/Waheed/MypProjects/Arena360/arena360-api/src/app.module.ts) | ⬜ | [src/app.module.ts](file:///d:/Waheed/MypProjects/Arena360/arena360-api/src/app.module.ts) |
| 1.3.6 | Update [Settings.tsx](file:///d:/Waheed/MypProjects/Arena360/src/pages/Settings.tsx) — Org management section (name, logo, plan, usage) | ⬜ | [src/pages/Settings.tsx](file:///d:/Waheed/MypProjects/Arena360/src/pages/Settings.tsx) |
| 1.3.7 | Update [api.ts](file:///d:/Waheed/MypProjects/Arena360/src/services/api.ts) — `org.get()`, `org.update()`, `org.getUsage()` | ⬜ | [src/services/api.ts](file:///d:/Waheed/MypProjects/Arena360/src/services/api.ts) |

---

### 1.4 AI Features (OpenAI) ⭐ Priority

| # | Task | Status | Files |
|---|---|---|---|
| 1.4.1 | Add `OPENAI_API_KEY` and `OPENAI_MODEL=gpt-4o` to [.env](file:///d:/Waheed/MypProjects/Arena360/.env) | ⬜ | [arena360-api/.env](file:///d:/Waheed/MypProjects/Arena360/arena360-api/.env) |
| 1.4.2 | Create `ai/ai.service.ts` — `generateProjectSummary()`, `suggestTasks()`, `analyzeFinding()`, `generateStatusReport()`, `chat()` | ⬜ | `src/ai/ai.service.ts` (new) |
| 1.4.3 | Create `ai/ai.controller.ts` — 5 endpoints | ⬜ | `src/ai/ai.controller.ts` (new) |
| 1.4.4 | Create `ai/ai.module.ts` | ⬜ | `src/ai/ai.module.ts` (new) |
| 1.4.5 | Create `ai/dto/ai.dto.ts` | ⬜ | `src/ai/dto/ai.dto.ts` (new) |
| 1.4.6 | Register `AiModule` in [app.module.ts](file:///d:/Waheed/MypProjects/Arena360/arena360-api/src/app.module.ts) | ⬜ | [src/app.module.ts](file:///d:/Waheed/MypProjects/Arena360/arena360-api/src/app.module.ts) |
| 1.4.7 | Create `AIPanel.tsx` — floating AI chat drawer with context-aware actions | ⬜ | `src/components/AIPanel.tsx` (new) |
| 1.4.8 | Update [Layout.tsx](file:///d:/Waheed/MypProjects/Arena360/src/components/Layout.tsx) — AI button in header, mount `AIPanel` | ⬜ | [src/components/Layout.tsx](file:///d:/Waheed/MypProjects/Arena360/src/components/Layout.tsx) |
| 1.4.9 | Update [ProjectDetails.tsx](file:///d:/Waheed/MypProjects/Arena360/src/pages/ProjectDetails.tsx) — "AI Summary" + "Suggest Tasks" buttons | ⬜ | [src/pages/ProjectDetails.tsx](file:///d:/Waheed/MypProjects/Arena360/src/pages/ProjectDetails.tsx) |
| 1.4.10 | Update [FindingDetails.tsx](file:///d:/Waheed/MypProjects/Arena360/src/pages/findings/FindingDetails.tsx) — "AI Analyze" button | ⬜ | [src/pages/findings/FindingDetails.tsx](file:///d:/Waheed/MypProjects/Arena360/src/pages/findings/FindingDetails.tsx) |
| 1.4.11 | Update [api.ts](file:///d:/Waheed/MypProjects/Arena360/src/services/api.ts) — AI API calls | ⬜ | [src/services/api.ts](file:///d:/Waheed/MypProjects/Arena360/src/services/api.ts) |

---

## Phase 2 — Competitive Parity (Weeks 13–20)

### 2.1 Notification System

| # | Task | Status | Files |
|---|---|---|---|
| 2.1.1 | Add `Notification` model to Prisma schema | ⬜ | [schema.prisma](file:///d:/Waheed/MypProjects/Arena360/arena360-api/prisma/schema.prisma) |
| 2.1.2 | Add `NotificationPreference` model | ⬜ | [schema.prisma](file:///d:/Waheed/MypProjects/Arena360/arena360-api/prisma/schema.prisma) |
| 2.1.3 | Create `notifications/` NestJS module (service, controller) | ⬜ | `src/notifications/` (new) |
| 2.1.4 | Wire notification triggers into Tasks, Findings, Invoices services | ⬜ | Multiple services |
| 2.1.5 | Connect Resend API (already in package.json) for email notifications | ⬜ | `src/email/email.service.ts` |
| 2.1.6 | Create notification bell drawer in frontend [Layout.tsx](file:///d:/Waheed/MypProjects/Arena360/src/components/Layout.tsx) | ⬜ | [src/components/Layout.tsx](file:///d:/Waheed/MypProjects/Arena360/src/components/Layout.tsx) |
| 2.1.7 | Add notification preferences to [Settings.tsx](file:///d:/Waheed/MypProjects/Arena360/src/pages/Settings.tsx) | ⬜ | [src/pages/Settings.tsx](file:///d:/Waheed/MypProjects/Arena360/src/pages/Settings.tsx) |

---

### 2.2 Time Tracking

| # | Task | Status | Files |
|---|---|---|---|
| 2.2.1 | Add `TimeEntry` model to Prisma schema | ⬜ | [schema.prisma](file:///d:/Waheed/MypProjects/Arena360/arena360-api/prisma/schema.prisma) |
| 2.2.2 | Create `time-entries/` NestJS module | ⬜ | `src/time-entries/` (new) |
| 2.2.3 | Create `TimeTracking.tsx` page | ⬜ | `src/pages/TimeTracking.tsx` (new) |
| 2.2.4 | Add timer widget to header | ⬜ | [src/components/Layout.tsx](file:///d:/Waheed/MypProjects/Arena360/src/components/Layout.tsx) |
| 2.2.5 | Add "Time" tab to Project detail | ⬜ | `src/components/project/TimeTab.tsx` (new) |

---

### 2.3 Workflow Automation Engine

| # | Task | Status | Files |
|---|---|---|---|
| 2.3.1 | Add `AutomationRule` + `AutomationLog` models to schema | ⬜ | [schema.prisma](file:///d:/Waheed/MypProjects/Arena360/arena360-api/prisma/schema.prisma) |
| 2.3.2 | Create `automation/` NestJS module with rules engine | ⬜ | `src/automation/` (new) |
| 2.3.3 | Implement triggers on Tasks, Findings, Invoices status changes | ⬜ | Multiple services |
| 2.3.4 | Create Automations management page | ⬜ | `src/pages/Automations.tsx` (new) |

---

### 2.4 Gantt / Timeline & Dependencies

| # | Task | Status | Files |
|---|---|---|---|
| 2.4.1 | Add `TaskDependency` model to schema | ⬜ | [schema.prisma](file:///d:/Waheed/MypProjects/Arena360/arena360-api/prisma/schema.prisma) |
| 2.4.2 | Install `frappe-gantt` or similar | ⬜ | Frontend |
| 2.4.3 | Create `TimelineTab.tsx` for project detail | ⬜ | `src/components/project/TimelineTab.tsx` (new) |

---

### 2.5 Sprint / Agile Planning

| # | Task | Status | Files |
|---|---|---|---|
| 2.5.1 | Add `Sprint` model to schema + `sprintId`/`storyPoints` to Task | ⬜ | [schema.prisma](file:///d:/Waheed/MypProjects/Arena360/arena360-api/prisma/schema.prisma) |
| 2.5.2 | Create `sprints/` NestJS module | ⬜ | `src/sprints/` (new) |
| 2.5.3 | Create `SprintsTab.tsx` for project detail | ⬜ | `src/components/project/SprintsTab.tsx` (new) |

---

### 2.6 Calendar View

| # | Task | Status | Files |
|---|---|---|---|
| 2.6.1 | Install `@fullcalendar/react` | ⬜ | Frontend |
| 2.6.2 | Create `Calendar.tsx` page | ⬜ | `src/pages/Calendar.tsx` (new) |

---

### 2.7 Activity Stream

| # | Task | Status | Files |
|---|---|---|---|
| 2.7.1 | Add `ActivityFeed` model to schema | ⬜ | [schema.prisma](file:///d:/Waheed/MypProjects/Arena360/arena360-api/prisma/schema.prisma) |
| 2.7.2 | Create `activity/` NestJS module | ⬜ | `src/activity/` (new) |
| 2.7.3 | Enhance Activity tab in projects | ⬜ | `src/components/project/` |

---

### 2.8 Approval Workflows

| # | Task | Status | Files |
|---|---|---|---|
| 2.8.1 | Add `ApprovalRequest` model to schema | ⬜ | `schema.prisma` |
| 2.8.2 | Create `approvals/` NestJS module | ⬜ | `src/approvals/` (new) |
| 2.8.3 | Add approval UI to Reports, Invoices, Contracts | ⬜ | Multiple components |

---

## Phase 3 — Enterprise Scale (Weeks 21–32)

### 3.1 SSO / OAuth / SAML

| # | Task | Status | Files |
|---|---|---|---|
| 3.1.1 | Add `SSOConfig` model to schema | ⬜ | `schema.prisma` |
| 3.1.2 | Install `passport-google-oauth20`, `passport-saml` | ⬜ | Backend |
| 3.1.3 | Create SSO strategy + routes | ⬜ | `src/auth/` |
| 3.1.4 | SSO configuration page in Settings | ⬜ | `src/pages/Settings.tsx` |

---

### 3.2 Third-Party Integrations

| # | Task | Status | Files |
|---|---|---|---|
| 3.2.1 | Add `Integration` + `Webhook` models to schema | ⬜ | `schema.prisma` |
| 3.2.2 | Create `integrations/` NestJS module | ⬜ | `src/integrations/` (new) |
| 3.2.3 | Slack notification integration | ⬜ | `src/integrations/slack.service.ts` |
| 3.2.4 | GitHub task linking integration | ⬜ | `src/integrations/github.service.ts` |
| 3.2.5 | Integrations management page | ⬜ | `src/pages/Integrations.tsx` (new) |

---

### 3.3 Custom Fields

| # | Task | Status | Files |
|---|---|---|---|
| 3.3.1 | Add `CustomFieldDef` + `CustomFieldValue` models to schema | ⬜ | `schema.prisma` |
| 3.3.2 | Create `custom-fields/` NestJS module | ⬜ | `src/custom-fields/` (new) |
| 3.3.3 | Render custom fields in Project/Task/Client detail views | ⬜ | Multiple components |

---

### 3.4 SLA Management

| # | Task | Status | Files |
|---|---|---|---|
| 3.4.1 | Add `SLAPolicy` + `SLATracker` models to schema | ⬜ | `schema.prisma` |
| 3.4.2 | Create `sla/` NestJS module | ⬜ | `src/sla/` (new) |
| 3.4.3 | SLA breach notification triggers | ⬜ | `src/notifications/` |
| 3.4.4 | SLA configuration in client/contract settings | ⬜ | Multiple pages |

---

## Phase 4 — Differentiators (Weeks 33–44)

### 4.1 Knowledge Base / Wiki

| # | Task | Status | Files |
|---|---|---|---|
| 4.1.1 | Add `WikiPage` + `WikiPageVersion` models to schema | ⬜ | `schema.prisma` |
| 4.1.2 | Create `wiki/` NestJS module | ⬜ | `src/wiki/` (new) |
| 4.1.3 | Create `Wiki.tsx` page with WYSIWYG editor | ⬜ | `src/pages/Wiki.tsx` (new) |

---

### 4.2 Advanced Analytics Dashboard

| # | Task | Status | Files |
|---|---|---|---|
| 4.2.1 | Portfolio analytics (project health, budget burn) | ⬜ | `src/pages/Analytics.tsx` (new) |
| 4.2.2 | Team analytics (utilization, velocity) | ⬜ | — |
| 4.2.3 | Financial analytics (AR aging, revenue trends) | ⬜ | — |
| 4.2.4 | Findings analytics (MTTR, severity trends) | ⬜ | — |

---

### 4.3 White-Label / Custom Branding

| # | Task | Status | Files |
|---|---|---|---|
| 4.3.1 | CSS custom properties for theme from Org branding | ⬜ | `src/index.css` |
| 4.3.2 | Inject org logo + colors into Layout | ⬜ | `src/components/Layout.tsx` |
| 4.3.3 | Dark/Light theme toggle | ⬜ | `src/pages/Settings.tsx` |

---

### 4.4 2FA (Two-Factor Authentication)

| # | Task | Status | Files |
|---|---|---|---|
| 4.4.1 | Add `twoFactorSecret`, `twoFactorEnabled`, `recoveryCodes` to User schema | ⬜ | `schema.prisma` |
| 4.4.2 | Install `speakeasy` or `otpauth` | ⬜ | Backend |
| 4.4.3 | Create 2FA setup/verify endpoints | ⬜ | `src/auth/auth.controller.ts` |
| 4.4.4 | 2FA setup wizard in Settings | ⬜ | `src/pages/Settings.tsx` |
| 4.4.5 | 2FA challenge step during login | ⬜ | `src/pages/Login.tsx` |

---

## Verification Checkpoints

### After Phase 0 ✅
```bash
cd arena360-api
npx prisma validate          # Schema is valid
npx prisma db push           # DB updated
npx prisma generate          # Client regenerated
npm run start:dev            # Backend starts clean
cd ..
npm run dev                  # Frontend starts clean
```

### After Phase 1 ✅
- Login → Admin → Users → Create user with custom permissions → Verify access control
- Navigate to project → Reports tab → Generate PPT → Download `.pptx` → Open in PowerPoint
- Settings → Organization → Update name/logo → Verify renders in sidebar
- Open project → Click AI Summary → Verify OpenAI response
- Open finding → Click AI Analyze → Verify remediation suggestions generated

### After Phase 2 ✅
- Bell icon shows real notifications from task assignments
- Time tracking logs appear in project's time view
- Gantt chart renders project milestones & tasks on timeline

### After Phase 3 ✅
- Sign in with Google redirects and auto-creates user
- Custom fields appear on project/task create forms
- SLA breach triggers notification before deadline

### After Phase 4 ✅
- Wiki pages render with version history
- Analytics page shows live charts from DB data
- Org logo replaces Arena360 logo for white-label

---

## Environment Variables Required

```bash
# arena360-api/.env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/arena360?schema=public"
JWT_SECRET="super-secret-dev-key-that-is-now-exactly-32-chars"
JWT_EXPIRES_IN="1d"
ALLOWED_ORIGINS="http://localhost:5173"
RESEND_API_KEY="your_resend_key_here"
EMAIL_FROM="onboarding@resend.dev"
FRONTEND_URL="http://localhost:5173"

# Phase 1 additions
OPENAI_API_KEY="sk-..."
OPENAI_MODEL="gpt-4o"

# File storage (local — no Docker/MinIO needed)
# Reports are saved to: arena360-api/uploads/reports/
```
