# Report Builder Execution Plan

## Status Summary
- Current mode: active implementation
- Current focus: Phase 5 polish and Phase 6 rollout hardening
- Delivery approach: foundation first, then backend skeleton, then UI, export, and client rollout layers

## Phase 1: Foundation
Status: `completed`

- [x] Lock scope: accessibility-only for v1
- [x] Lock role decision: reuse `QA`
- [x] Lock output direction: Arabic-first with English-ready structure
- [x] Lock admin ownership: `SUPER_ADMIN` only for templates and client assignment
- [x] Finalize reference docs
- [x] Finalize implementation-ready Prisma target
- [x] Freeze permission matrix
- [ ] Freeze taxonomy strategy
- [x] Freeze migration and coexistence strategy with current `Report`

## Phase 2: Data Layer and Backend Skeleton
Status: `completed`

- [x] Add Prisma enums and models for report builder
- [x] Add Prisma relation fields on existing models
- [x] Generate Prisma client
- [x] Add NestJS report-builder module
- [x] Add DTOs for templates, assignments, reports, and entries
- [x] Add guarded admin endpoints for template/version/assignment management
- [x] Add guarded project endpoints for reports and entries
- [x] Update permission constants in backend and frontend shared types
- [x] Build and verify backend foundation
- [x] Generate initial SQL migration file
- [x] Rerun backend test suite and fix stale spec scaffolding

## Phase 3: Admin Template and Assignment Flow
Status: `completed`

- [x] Build admin template list
- [x] Build template detail shell
- [x] Build accessibility schema builder
- [x] Build PDF config editor
- [x] Build AI config editor
- [x] Build version publish flow
- [x] Build client assignment UI
- [x] Add schema preview flow

## Phase 4: Project Report Workspace
Status: `completed`

- [x] Build project reports list
- [x] Build create report flow from assigned template
- [x] Build project report workspace page
- [x] Build dynamic add/edit entry popup
- [x] Build findings table
- [x] Add category to subcategory dependency logic
- [x] Add evidence upload integration
- [x] Add report summary cards
- [x] Route accessibility reporting into the new flow by default

## Phase 5: PDF Export and AI Generation
Status: `completed`

- [x] Add backend HTML renderer
- [x] Add Arabic RTL export layout
- [x] Add cover page and closing page
- [x] Add findings table export logic
- [x] Add friendly link and evidence rendering
- [x] Add AI introduction generation
- [x] Add AI recommendations summary
- [x] Add preview and export history
- [x] Add publish flow

## Phase 6: Client Consumption and Hardening
Status: `completed`

- [x] Add client-facing published report view
- [x] Restrict client access to published exports only
- [x] Move accessibility reports off the legacy path
- [x] Add audit logging for template/report lifecycle
- [x] Add tests for permissions, schema validation, and export flow
- [x] Add deployment/runtime checks for PDF engine
- [x] Run seeded Arabic preview/export QA with evidence media

## Immediate Execution Order
1. Add Prisma foundation
2. Add NestJS backend skeleton
3. Update permission constants
4. Verify backend build
5. Then move into admin UI and workspace UI
