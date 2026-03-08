# Project Tabs Analysis & UI Suggestions

This document provides a detailed breakdown of the 16 tabs currently present in the Project Details view. It evaluates their functionality, identifies redundancies, and offers suggestions for a more streamlined user interface.

## Current Tab Inventory

| Tab Name | ID | Purpose | Access Level |
| :--- | :--- | :--- | :--- |
| **Overview** | `overview` | High-level summary and KPIs. | **Public** |
| **Work Items** | `tasks` | Kanban/List view of tasks. | **Internal Only** |
| **Time** | `time` | Time tracking logs. | **Internal Only** |
| **Timeline** | `timeline` | Gantt visualization. | **Internal Only** |
| **Sprints** | `sprints` | Agile sprint management. | **Internal Only** |
| **Recurring Tasks**| `recurring` | Management of repetitive tasks. | **Internal Only** |
| **Milestones** | `milestones` | High-level project phases. | **Public** |
| **Updates** | `updates` | Formal status feed. | **Public** |
| **Files** | `files` | Document management. | **Public** |
| **Team** | `team` | Member management. | **Public*** |
| **Findings** | `findings` | Security vulnerabilities/audits. | **Public** |
| **Reports** | `reports` | Deliverable generation. | **Public** |
| **Testing Access** | `testing` | Credentials and environments. | **Public** |
| **Financials** | `financials` | Contracts and Invoices. | **Public*** |
| **Discussion** | `discussions`| Slack-like communication. | **Public** |
| **Activity** | `activity` | Audit trail. | **Public** |

---

## Tab Access & Permissions Breakdown

The system distinguishes between **Internal Roles** and **Client Roles**.

### Role Definitions:
- **Internal:** `SUPER_ADMIN`, `OPS`, `PM`, `DEV`, `FINANCE`.
- **Client/External:** `CLIENT_OWNER`, `CLIENT_MANAGER`, `CLIENT_MEMBER`, `VIEWER`.

### 1. Internal-Only Tabs
The following tabs are strictly hidden from clients to prevent exposure of internal development workflows, time logs, and technical sprint planning:
- **Tasks, Time, Timeline, Sprints, Recurring Tasks.**

### 2. Public Tabs (Visible to Clients)
Most other tabs are visible to clients to promote transparency, but their specific **actions** (buttons) are often restricted:

- **Financials:** Clients can see the budget and list of invoices, but they cannot create/edit/delete invoices or contracts unless they have the `MANAGE_PROJECTS` permission (typically restricted to Super Admins).
- **Team:** Clients can see who is on the project, but the buttons to add/remove members or change roles are hidden behind the `MANAGE_TEAM` permission.
- **Milestones/Updates:** Clients see the status but usually cannot edit the "source of truth" goals or formal updates.

---

## Evaluation

### Redundancies & Overlaps
1. **Task Fragmentations (`Tasks`, `Time`, `Timeline`, `Sprints`, `Recurring`):** 
   - Currently, these are 5 separate top-level tabs. They all operate on the same Task entity but provide different "views". 
   - This causes significant cognitive load as users must jump between tabs to see the same data in different formats.
2. **Updates vs. Activity:**
   - **Updates** are manual reports written by team members.
   - **Activity** is an automated list of "who changed what".
   - While distinct, they both represent "what happened".
3. **Findings vs. Work Items:**
   - Findings often result in tasks. Having them completely separate from the Work Items flow can lead to "siloed" information where a developer fixes a finding but the finding status doesn't automatically update (or vice versa).

### Navigation & Order
- The order is currently "Work Item heavy". A client or project manager often cares more about **Discussions**, **Updates**, and **Milestones** first, yet these are pushed to the middle/end.
- The horizontal tab bar is overcrowded (16 items), causing it to overflow and require scrolling or hidden menus.

---

## UI Improvement Suggestions

### 1. Consolidate Work Management
Instead of 5 separate tabs for tasks, create a single **"Work"** or **"Delivery"** tab with a local sub-navigation toggle:
- **Views:** List, Kanban, Timeline, Sprints.
- **Tools:** Time Tracking, Recurring Task Config.
*This reduces the top-level tab count by 4.*

### 2. Group Global Assets/Resources
Group secondary tabs into a "More" dropdown or a single **"Resources"** tab:
- Move **Files**, **Team**, **Testing Access**, and **Activity** into this section.
*This keeps the focus on active project movement.*

### 3. Recommended Tab Order
Reorder tabs based on user intent and daily usage:
1. **Overview** (The Hub)
2. **Discussion** (Active Communication)
3. **Work** (Tasks, Sprints, Timeline)
4. **Milestones** (High-level Status)
5. **Updates** (Progress Reports)
6. **Findings** (Specialized Audit Data)
7. **Reports** (Deliverables)
8. **Financials** (Commercials)
9. **Resources** (Dropdown: Files, Team, Access, Activity)

### 4. Remove Placeholders
- The **Testing Access** tab is currently a placeholder ("This component is currently being restored"). It should be hidden until it has actual content or integrated into a "Credentials" section under Resources.

### 5. Summary KPI Integration
The **Overview** tab already does a great job of showing high-level stats. Enhancing this tab with a "Latest Findings" or "Latest Discussion" snippet could reduce the need for users to even click into the other tabs for quick check-ins.
