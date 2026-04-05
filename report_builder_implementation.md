# Report Builder Implementation Reference

## Purpose
This document captures the proposed implementation approach for a dynamic, client-assignable report builder in Arena360.

This is a design reference only. It does not imply that the database schema, APIs, or UI have been implemented yet.

Locked decisions for this draft:
- reuse the existing `QA` role for auditor-style entry work in the first release
- design the export pipeline as Arabic-first with an English-ready content structure
- start folding this feature into the new report flow sooner rather than running the old and new report systems in parallel for too long
- restrict template management and client template assignment to `SUPER_ADMIN` only

## Problem Summary
The current reporting flow is too generic for structured audit-style reports such as accessibility assessments.

We need a system where:
- admins define report templates
- admins assign templates to clients
- project teams create reports from assigned templates
- QA users enter findings as structured rows
- the system generates polished landscape PDF exports
- future clients can use different report structures without rebuilding the feature each time

## Product Goals
- Support one project having many reports
- Support one client having one or more assigned templates
- Allow admins to add, remove, reorder, and configure report columns
- Preserve historical reports even if the template changes later
- Generate client-ready PDF output with branding, AI summaries, and evidence links
- Keep the design flexible enough for future report types beyond accessibility

## First Release Target
The first release should be intentionally narrow:
- one report family only: `Accessibility Audit`
- one export format only: `PDF`
- one language output path first: Arabic-first with correct RTL support and English-ready content structure
- one entry model: issue rows entered through popup form and shown in a grid/table

The first release should not try to solve all generic reporting at once. It should prove the engine using the accessibility audit use case, then expand.

## Core Design Principles
- Template versions must be immutable after publish
- Client assignments should reference a specific template version
- Reports should keep the version they were created from forever
- Dynamic fields should be schema-driven, not hardcoded into the UI
- Stable reporting fields should stay queryable in relational columns
- Client-specific fields should be stored in JSONB payloads
- AI should assist with summaries and wording, not create source data

## Recommended Domain Model
The feature should be designed in five layers:

1. Report Template
- Created by admin
- Defines the overall report type, for example Accessibility Audit

2. Template Version
- Immutable snapshot of the template
- Stores form schema, table layout, PDF settings, and AI settings

3. Client Assignment
- Links a client to a specific template version
- Controls which templates are available for that client

4. Project Report
- A report instance inside a project
- Created from one assigned template version

5. Report Entry
- A row inside the report
- Stores one issue or finding

## Recommended Database Model
Use a hybrid relational plus JSONB approach.

### `report_templates`
- `id`
- `name`
- `code`
- `description`
- `category`
- `status`
- `created_by_id`
- `created_at`
- `updated_at`

### `report_template_versions`
- `id`
- `template_id`
- `version_number`
- `schema_json`
- `pdf_config_json`
- `ai_config_json`
- `is_published`
- `published_by_id`
- `published_at`
- `created_at`

### `client_report_template_assignments`
- `id`
- `client_id`
- `template_id`
- `template_version_id`
- `is_default`
- `is_active`
- `assigned_by_id`
- `assigned_at`

### `project_reports`
- `id`
- `project_id`
- `client_id`
- `template_id`
- `template_version_id`
- `title`
- `description`
- `status`
- `visibility`
- `performed_by_id`
- `generated_summary_json`
- `published_at`
- `created_at`
- `updated_at`

### `project_report_entries`
- `id`
- `project_report_id`
- `sort_order`
- `service_name`
- `severity`
- `category`
- `subcategory`
- `page_url`
- `status`
- `row_data_json`
- `created_by_id`
- `updated_by_id`
- `created_at`
- `updated_at`

### `project_report_entry_media`
- `id`
- `entry_id`
- `file_asset_id`
- `media_type`
- `caption`
- `sort_order`
- `created_at`

### `project_report_exports`
- `id`
- `project_report_id`
- `format`
- `file_asset_id`
- `export_version`
- `generated_by_id`
- `generated_at`

## Why Not Pure JSONB
Pure JSONB for everything would be flexible, but it would make filtering, analytics, validation, and long-term maintenance harder.

The recommended split is:
- relational columns for stable and high-value fields such as severity, category, subcategory, service name, page URL, and ordering
- JSONB for client-specific or evolving fields

## Accessibility Template Example
The first implementation target should be one template type only: `Accessibility Audit`.

Expected entry fields:
- service name
- issue title
- issue description
- severity
- category
- subcategory
- media evidence
- page URL
- recommendation

The category and subcategory relationship should be dependency-driven from schema, not hardcoded into a one-off page.

## Accessibility Audit Scope
The exact accessibility report flow should support:
- `Add New` entry from the project report workspace
- popup-based entry form
- edit existing rows later
- evidence upload per row
- display all rows in a structured table before export
- many reports under one project
- performer name attached to the report

### Accessibility Entry Fields
The first implementation should support these fields directly:
- `service_name`
- `issue_title`
- `issue_description`
- `severity`
- `category`
- `subcategory`
- `page_url`
- `recommendation`
- `media_caption`
- `evidence`

### Accessibility Categories
The first built-in taxonomy should include:
- `Images`
- `Content`
- `Color and Contrast`
- `Keyboard and Navigation`
- `Forms and Inputs`
- `Multimedia`
- `Touch and Mobile`
- `Structure and Semantics`
- `Timing and Interaction`
- `Assistive Technology Compatibility`
- `Authentication and Security`

### Accessibility Subcategories
The subcategory list should be stored as template-controlled reference data so it can be changed later without rebuilding the form.

The first version should include the subcategories already described in `reportplan.md`, including items such as:
- missing alt text
- poor heading structure
- low text contrast
- keyboard trap
- missing labels for inputs
- missing captions
- small tap targets
- missing ARIA roles
- time limits without warning
- screen reader issues
- CAPTCHA barriers

## Arabic and RTL Output Requirements
This feature should be designed for Arabic output from the beginning, not added later as a cosmetic layer.

Required behavior:
- PDF pages render correctly in RTL mode
- table column order is intentionally designed for Arabic reading order
- headings, labels, and static report sections support Arabic translations
- page numbers, dates, and mixed Arabic/English text are rendered cleanly
- long issue descriptions wrap predictably in landscape layout
- clickable links should use friendly Arabic or neutral labels such as `Click here` instead of exposing raw URLs
- client logo and cover page layout should remain visually balanced in RTL mode

The HTML-to-PDF layer should own RTL styling rather than relying on frontend print CSS hacks.

English-ready structure means:
- template labels should support localization keys rather than hardcoded Arabic strings
- AI prompts should support language selection later
- exported section definitions should separate content keys from display text
- URL labels, evidence labels, and section titles should be translation-driven

## Example Template Schema
```json
{
  "entryFields": [
    { "key": "service_name", "label": "Service Name", "type": "text", "required": true },
    { "key": "issue_title", "label": "Issue Title", "type": "text", "required": true },
    { "key": "issue_description", "label": "Issue Description", "type": "textarea", "required": true },
    { "key": "severity", "label": "Severity", "type": "select", "options": ["High", "Medium", "Low"], "required": true },
    { "key": "category", "label": "Category", "type": "select", "source": "accessibility_categories", "required": true },
    { "key": "subcategory", "label": "Subcategory", "type": "dependent_select", "dependsOn": "category", "source": "accessibility_subcategories", "required": true },
    { "key": "page_url", "label": "Page URL", "type": "url", "required": false },
    { "key": "recommendation", "label": "Recommendation", "type": "textarea", "required": false },
    { "key": "evidence", "label": "Evidence", "type": "media_upload", "multiple": true }
  ],
  "tableColumns": [
    "id",
    "service_name",
    "issue_title",
    "severity",
    "category",
    "page_url",
    "evidence",
    "recommendation"
  ]
}
```

## PDF Export Design
Do not generate this PDF from the frontend.

Recommended approach:
- render report HTML on the backend
- apply controlled CSS for landscape layout and branding
- convert HTML to PDF using Puppeteer or Playwright

Reasons:
- landscape tables are easier to control
- Arabic and RTL support is more reliable
- clickable links can be formatted cleanly
- repeating headers and page breaks are easier to manage
- cover pages and branded layouts are easier to maintain

PDF requirements:
- cover page with client logo, client name, report date, performer name
- AI-generated introduction
- statistics section grouped by severity and category
- findings table in landscape layout
- page URL rendered as friendly clickable text
- evidence rendered as image preview or downloadable link
- recommendations summary generated from report entries
- closing page or appendix

### Accessibility PDF Structure
The first PDF export should follow this order:

1. Cover page
- client logo
- client name
- report title
- report date
- performer name

2. Introduction
- AI-generated based on structured entries
- should describe scope and general findings tone

3. Statistics
- count by severity
- count by category
- optional AI narrative for notable patterns

4. Findings table
- landscape orientation
- stable column order
- evidence shown as `Image` or `Video` with friendly download/view text
- page URL shown as friendly clickable text

5. Recommendations summary
- AI-generated from row-level recommendations

6. End cover or closing page
- optional concluding statement
- optional confidentiality note

### Evidence Handling Rules
- images may be shown as thumbnail plus link
- videos should be represented as downloadable link reference rather than inline playback
- export logic must handle missing or deleted evidence safely
- generated PDF should still work if some entries have no evidence

## AI Responsibilities
AI should be limited to summarization and wording support.

Good uses:
- introduction generation
- executive summary
- category and severity summary
- recommendation consolidation
- language polishing

Bad uses:
- inventing findings
- changing QA-entered facts
- rewriting technical details without review

## Screens Needed
### Admin Templates
- template list
- create template
- edit draft template
- publish template version
- preview form
- preview PDF

### Admin Client Assignment
- list client assignments
- assign template version to client
- mark default template
- deactivate assignment

### Project Reports
- list reports under a project
- create report from assigned template
- show performer, status, visibility, latest export

### Project Report Workspace
- report header
- add entry button
- dynamic popup form
- findings table
- edit and reorder entries
- upload evidence
- AI summary actions
- preview and export actions

### Client View
- view published reports only
- download final PDF

## Roles and Permissions
The feature should use explicit permissions rather than only role checks.

Recommended permissions:
- `MANAGE_REPORT_TEMPLATES`
- `PUBLISH_REPORT_TEMPLATE_VERSIONS`
- `ASSIGN_REPORT_TEMPLATES_TO_CLIENTS`
- `CREATE_PROJECT_REPORTS`
- `EDIT_PROJECT_REPORTS`
- `EDIT_PROJECT_REPORT_ENTRIES`
- `GENERATE_PROJECT_REPORT_EXPORTS`
- `PUBLISH_PROJECT_REPORTS`
- `VIEW_CLIENT_REPORTS`

Suggested ownership:
- `SUPER_ADMIN`: full template and assignment control
- `PM`: create project reports, review report quality, and publish project reports
- `QA`: create and edit report entries as the first-release auditor role
- `CLIENT_*`: view published reports only

## API Surface
Suggested endpoints:

- `GET /admin/report-templates`
- `POST /admin/report-templates`
- `PATCH /admin/report-templates/:id`
- `POST /admin/report-templates/:id/versions`
- `POST /admin/report-templates/:id/versions/:versionId/publish`
- `GET /clients/:clientId/report-template-assignments`
- `POST /clients/:clientId/report-template-assignments`
- `PATCH /clients/:clientId/report-template-assignments/:assignmentId`
- `GET /projects/:projectId/reports`
- `POST /projects/:projectId/reports`
- `GET /project-reports/:reportId`
- `PATCH /project-reports/:reportId`
- `GET /project-reports/:reportId/entries`
- `POST /project-reports/:reportId/entries`
- `PATCH /project-reports/:reportId/entries/:entryId`
- `DELETE /project-reports/:reportId/entries/:entryId`
- `POST /project-reports/:reportId/generate-summary`
- `POST /project-reports/:reportId/export-pdf`
- `POST /project-reports/:reportId/publish`

## Frontend Implementation Notes
- Build the entry form from `schema_json`
- Build the findings table from `tableColumns`
- Keep a reusable field renderer for text, textarea, select, dependent select, URL, media upload, and date
- Support inline validation from schema rules
- Use the existing file upload pipeline for evidence attachments where possible

### Accessibility Workspace Notes
- the entry popup should feel like a focused audit form, not a generic CRUD modal
- category selection should immediately filter subcategory options
- the table should support a compact audit-review mode for scanning many rows
- row editing should reopen the same popup form with values prefilled
- report-level actions should remain separate from row-level actions

## Backend Implementation Notes
- Introduce a report template module separate from the existing reports module
- Keep version resolution server-side
- Validate entry payloads against template schema before saving
- Generate AI summaries server-side
- Generate PDF server-side
- Store export files through the existing file storage system if possible

## Versioning Rules
- Admin can edit draft templates
- Publishing creates an immutable version snapshot
- Client assignment should reference one published version
- Existing project reports must keep their assigned version even if a newer one exists
- New projects may use a newer version, but old reports must remain renderable

## Rollout Plan
### Phase 1
- add template, template version, assignment, project report, and entry models
- implement accessibility template only
- build project report workspace
- connect the new workspace directly to the report experience instead of extending the old generic report UI further

### Phase 2
- implement backend HTML to PDF generation
- add AI introduction, summary, and recommendations
- add report preview and export history
- begin routing accessibility report creation into the new flow by default

### Phase 3
- add more template types
- add version comparison tools
- add client self-service viewing and notifications

## Migration Strategy
- keep the current generic report feature only as a temporary compatibility path
- start moving accessibility reporting into the new flow early
- avoid building major new capabilities on the old report model
- map future accessibility report creation to the new template-based flow as soon as the first vertical slice is stable
- postpone broad migration of legacy reports until the new flow is proven in production

## Open Decisions
- whether a client can have multiple active default templates for different project types
- whether exports should support only PDF first or also branded PowerPoint later
- whether evidence videos should be linked only or also attached as downloadable file references

## Recommended First Scope
Start with one complete vertical slice:
- one admin-created accessibility template
- one client assignment flow
- one project report workspace
- one landscape PDF export flow

If this works well, the same engine can later support other audit and report types.

## Out of Scope for First Release
- generalized drag-and-drop template builder for every possible report type
- multilingual report generation beyond the primary configured language
- client-side PDF generation
- advanced approval chains inside the new builder
- PowerPoint export parity
- migration of all legacy report types on day one
