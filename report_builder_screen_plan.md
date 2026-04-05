# Report Builder Screen-by-Screen Implementation Plan

## Purpose
This document translates the report builder design into concrete screens, user flows, and implementation slices.

It is meant to guide frontend, backend, and schema work together.

## First Release Scope
The first release should support one report type only:
- `Accessibility Audit`

The first release should support these actor groups:
- admin
- PM
- QA
- client viewer

## Screen Map
### 1. Admin Template List
**Route idea**
- `/app/admin/report-templates`

**Goal**
- show all report templates
- allow create, archive, and open template details

**Primary users**
- `SUPER_ADMIN`

**Main UI**
- template table or card list
- status badge
- category badge
- latest published version
- usage count
- create button

**Actions**
- create template
- open template
- archive template

**Backend dependencies**
- list templates
- create template
- archive template

## 2. Admin Template Detail
**Route idea**
- `/app/admin/report-templates/:templateId`

**Goal**
- manage one template and its versions

**Primary users**
- `SUPER_ADMIN`

**Main UI**
- template metadata header
- draft editor area
- published versions list
- assignment summary

**Tabs**
- `Overview`
- `Schema`
- `PDF Layout`
- `AI Config`
- `Versions`
- `Assignments`

**Actions**
- edit draft
- create new draft version
- publish version
- preview form
- preview PDF layout

## 3. Admin Template Schema Builder
**Route idea**
- tab under template detail

**Goal**
- define the accessibility entry form and report table columns

**Primary users**
- `SUPER_ADMIN`

**Main UI**
- left panel: available field types
- center: ordered field list
- right panel: selected field settings

**Field types for first release**
- text
- textarea
- select
- dependent select
- URL
- media upload

**Accessibility-specific starter fields**
- service name
- issue title
- issue description
- severity
- category
- subcategory
- page URL
- recommendation
- evidence
- evidence caption

**Settings per field**
- label
- key
- required
- default visibility
- help text
- width behavior
- export behavior

**Important behavior**
- category and subcategory should be configured as linked fields
- some fields should be marked as filterable and stats-enabled

## 4. Admin Template PDF Config
**Goal**
- define the final exported document structure

**Primary users**
- `SUPER_ADMIN`

**Main UI**
- layout options
- cover options
- section toggles
- header/footer settings
- brand preview

**Required settings**
- orientation: `LANDSCAPE`
- primary language: `AR`
- RTL enabled
- cover page enabled
- end cover enabled
- include performer name
- include client logo
- page URL display mode: friendly link text
- evidence display mode: image thumbnail or media link

**Sections**
- cover
- introduction
- statistics
- findings table
- recommendations summary
- closing page

## 5. Admin Template AI Config
**Goal**
- configure how AI summaries are generated

**Primary users**
- `SUPER_ADMIN`

**Main UI**
- prompt fields or preset selectors
- section-level toggles

**Supported AI outputs**
- introduction
- statistics narrative
- recommendations summary

**Important rule**
- AI config must only influence generated narrative, not underlying report rows

## 6. Client Template Assignment Screen
**Route idea**
- `/app/admin/client-report-templates`
- or client detail tab under `/app/clients/:clientId`

**Goal**
- assign template versions to clients

**Primary users**
- `SUPER_ADMIN`

**Main UI**
- client selector
- assigned templates table
- add assignment button
- mark default toggle
- active/inactive status

**Actions**
- assign template version
- change default template
- disable assignment

**Validation**
- only published versions can be assigned
- default assignment should be unique per template family in first release

## 7. Project Reports List
**Route idea**
- inside project details: `Reports` tab

**Goal**
- list project-level reports created from assigned templates

**Main UI**
- report cards or rows
- template name
- template version
- performed by
- report status
- latest export status
- created date

**Actions**
- create report
- open report
- duplicate report
- archive report
- download latest PDF if published

## 8. Create Project Report Modal
**Goal**
- create a report instance from a client-assigned template

**Fields**
- template selector
- title
- description
- performed by
- visibility

**Behavior**
- template selector only shows templates assigned to the project client
- selected template version is snapshot-bound at creation time

## 9. Project Report Workspace
**Route idea**
- `/app/projects/:projectId/reports/:reportId`

**Goal**
- primary working screen for QA users and PMs

**Main UI layout**
- report header
- report actions bar
- findings table
- side summary panel or report summary cards

**Header should show**
- report title
- client
- project
- template version
- performed by
- status
- visibility

**Actions bar**
- add entry
- reorder mode
- generate AI summary
- preview PDF
- export PDF
- publish

## 10. Add/Edit Entry Popup
**Goal**
- create or edit one accessibility finding row

**Sections**
- Basic Info
- Classification
- Evidence
- URL
- Recommendation

**Fields**
- service name
- issue title
- issue description
- severity
- category
- subcategory
- upload image or video
- media caption
- page URL
- recommendation

**Behavior**
- subcategory options depend on selected category
- evidence should support multiple files if needed
- save should validate required fields from template schema

## 11. Findings Table in Workspace
**Goal**
- show all report entries clearly before export

**Columns for first release**
- ID
- service name
- issue title
- severity
- category
- subcategory
- page URL
- evidence count or indicator
- recommendation snippet
- actions

**Actions per row**
- edit
- delete
- reorder

**Useful table capabilities**
- filter by severity
- filter by category
- sort by order or severity

## 12. Report Summary Panel
**Goal**
- show generated summary information before export

**Cards**
- total issues
- high severity issues
- category distribution
- rows missing recommendation
- rows missing evidence

**AI blocks**
- generated introduction preview
- generated recommendations summary preview

## 13. PDF Preview Screen or Modal
**Goal**
- show export-ready preview before final generation

**Display**
- cover preview
- findings table preview
- section toggles summary
- export button

**Notes**
- first release can render this as backend-generated HTML preview rather than true PDF viewer

## 14. Client Report View
**Route idea**
- existing client-facing report view or project reports tab with limited access

**Goal**
- allow client to view published reports only

**Main UI**
- report title
- report date
- performed by
- download PDF button

**Restrictions**
- no template editing
- no entry editing
- no AI regenerate

## Backend Work Split by Screen
### Slice A
- template list
- template create
- template detail fetch

### Slice B
- template version create
- publish version
- assignment create and list

### Slice C
- project report create and list
- report workspace fetch
- report entry CRUD

### Slice D
- AI summary generation
- PDF preview generation
- PDF export generation
- publish report

## Frontend Work Split by Screen
### Slice A
- admin template list
- template detail shell

### Slice B
- schema builder
- assignment screen

### Slice C
- project report list
- create report modal
- report workspace
- entry popup
- findings table

### Slice D
- preview flow
- publish flow
- client report view

## UX Notes for Arabic Accessibility Reports
- table should remain readable in landscape mode
- long Arabic text needs generous line-height and padding
- evidence links should use short labels, not raw URLs
- severity should be color-coded but not rely on color only
- exported PDF should feel like a formal deliverable, not a system dump

## Recommended Delivery Order
1. Admin template list and template detail shell
2. Accessibility schema builder with fixed starter taxonomy
3. Client assignment flow
4. Project report create and list
5. Entry popup and findings table
6. AI summary generation
7. Landscape PDF generation
8. Publish and client view

## First Release Acceptance Criteria
- admin can create one accessibility template and publish version 1
- admin can assign that version to a client
- PM or QA can create a project report from that assigned template
- QA can add, edit, and delete finding rows
- rows appear in a structured review table
- report export generates a landscape Arabic-capable PDF
- client can access published report PDF only
