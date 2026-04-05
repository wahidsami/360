# Report Builder Prisma Draft

## Purpose
This document proposes a Prisma-level schema draft for the new report builder feature.

It is intentionally written as a draft for review before changing the actual Prisma schema in `arena360-api/prisma/schema.prisma`.

## Design Notes
- This draft is additive and intended to coexist with the current `Report` and `ReportTemplate` models during migration.
- The first production use case is `Accessibility Audit`.
- The schema uses a hybrid model:
  - relational columns for common reporting and filtering needs
  - JSON fields for dynamic template and row payloads
- Template versions are immutable after publish.

## Suggested New Enums
```prisma
enum ReportBuilderTemplateCategory {
  ACCESSIBILITY
  SECURITY
  QA
  PERFORMANCE
  COMPLIANCE
  OTHER
}

enum ReportBuilderTemplateStatus {
  DRAFT
  ACTIVE
  ARCHIVED
}

enum ReportBuilderAssignmentScope {
  CLIENT
  ORG
}

enum ProjectReportStatus {
  DRAFT
  IN_REVIEW
  APPROVED
  PUBLISHED
  ARCHIVED
}

enum ProjectReportVisibility {
  INTERNAL
  CLIENT
}

enum ProjectReportEntrySeverity {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}

enum ProjectReportEntryStatus {
  OPEN
  ACCEPTED
  FIXED
  VERIFIED
  DISMISSED
}

enum ProjectReportMediaType {
  IMAGE
  VIDEO
  DOCUMENT
}

enum ProjectReportExportFormat {
  PDF
}
```

## Suggested New Models
```prisma
model ReportBuilderTemplate {
  id            String                         @id @default(cuid())
  orgId         String?
  org           Org?                           @relation(fields: [orgId], references: [id], onDelete: Cascade)
  name          String
  code          String
  description   String?
  category      ReportBuilderTemplateCategory  @default(OTHER)
  status        ReportBuilderTemplateStatus    @default(DRAFT)
  isBuiltIn     Boolean                        @default(false)
  createdById   String?
  createdBy     User?                          @relation(fields: [createdById], references: [id], onDelete: SetNull)
  createdAt     DateTime                       @default(now())
  updatedAt     DateTime                       @updatedAt

  versions      ReportBuilderTemplateVersion[]
  assignments   ClientReportTemplateAssignment[]
  projectReports ProjectReport[]

  @@unique([orgId, code])
  @@index([orgId])
  @@index([category])
  @@index([status])
}

model ReportBuilderTemplateVersion {
  id               String                  @id @default(cuid())
  templateId       String
  template         ReportBuilderTemplate   @relation(fields: [templateId], references: [id], onDelete: Cascade)
  versionNumber    Int
  schemaJson       Json
  pdfConfigJson    Json?
  aiConfigJson     Json?
  taxonomyJson     Json?
  isPublished      Boolean                 @default(false)
  publishedById    String?
  publishedBy      User?                   @relation(fields: [publishedById], references: [id], onDelete: SetNull)
  publishedAt      DateTime?
  createdAt        DateTime                @default(now())

  assignments      ClientReportTemplateAssignment[]
  projectReports   ProjectReport[]

  @@unique([templateId, versionNumber])
  @@index([templateId])
  @@index([isPublished])
}

model ClientReportTemplateAssignment {
  id                String                         @id @default(cuid())
  orgId             String
  org               Org                            @relation(fields: [orgId], references: [id], onDelete: Cascade)
  clientId          String?
  client            Client?                        @relation(fields: [clientId], references: [id], onDelete: Cascade)
  templateId        String
  template          ReportBuilderTemplate          @relation(fields: [templateId], references: [id], onDelete: Cascade)
  templateVersionId String
  templateVersion   ReportBuilderTemplateVersion   @relation(fields: [templateVersionId], references: [id], onDelete: Cascade)
  scope             ReportBuilderAssignmentScope   @default(CLIENT)
  isDefault         Boolean                        @default(false)
  isActive          Boolean                        @default(true)
  assignedById      String?
  assignedBy        User?                          @relation(fields: [assignedById], references: [id], onDelete: SetNull)
  assignedAt        DateTime                       @default(now())

  @@index([orgId])
  @@index([clientId])
  @@index([templateId])
  @@index([templateVersionId])
  @@index([isActive])
}

model ProjectReport {
  id                String                   @id @default(cuid())
  orgId             String
  org               Org                      @relation(fields: [orgId], references: [id], onDelete: Cascade)
  clientId          String
  client            Client                   @relation(fields: [clientId], references: [id], onDelete: Cascade)
  projectId         String
  project           Project                  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  templateId        String
  template          ReportBuilderTemplate    @relation(fields: [templateId], references: [id], onDelete: Cascade)
  templateVersionId String
  templateVersion   ReportBuilderTemplateVersion @relation(fields: [templateVersionId], references: [id], onDelete: Cascade)
  title             String
  description       String?
  status            ProjectReportStatus      @default(DRAFT)
  visibility        ProjectReportVisibility  @default(INTERNAL)
  performedById     String
  performedBy       User                     @relation(fields: [performedById], references: [id], onDelete: Restrict)
  summaryJson       Json?
  coverSnapshotJson Json?
  publishedAt       DateTime?
  createdAt         DateTime                 @default(now())
  updatedAt         DateTime                 @updatedAt
  deletedAt         DateTime?

  entries           ProjectReportEntry[]
  exports           ProjectReportExport[]

  @@index([orgId])
  @@index([clientId])
  @@index([projectId])
  @@index([templateId])
  @@index([templateVersionId])
  @@index([status])
}

model ProjectReportEntry {
  id               String                     @id @default(cuid())
  orgId            String
  org              Org                        @relation(fields: [orgId], references: [id], onDelete: Cascade)
  projectReportId  String
  projectReport    ProjectReport              @relation(fields: [projectReportId], references: [id], onDelete: Cascade)
  sortOrder        Int                        @default(0)
  serviceName      String?
  issueTitle       String
  issueDescription String                     @db.Text
  severity         ProjectReportEntrySeverity?
  category         String?
  subcategory      String?
  pageUrl          String?
  recommendation   String?                    @db.Text
  status           ProjectReportEntryStatus   @default(OPEN)
  rowDataJson      Json?
  createdById      String
  createdBy        User                       @relation("ProjectReportEntryCreatedBy", fields: [createdById], references: [id], onDelete: Restrict)
  updatedById      String?
  updatedBy        User?                      @relation("ProjectReportEntryUpdatedBy", fields: [updatedById], references: [id], onDelete: SetNull)
  createdAt        DateTime                   @default(now())
  updatedAt        DateTime                   @updatedAt
  deletedAt        DateTime?

  media            ProjectReportEntryMedia[]

  @@index([orgId])
  @@index([projectReportId])
  @@index([severity])
  @@index([category])
  @@index([subcategory])
  @@index([status])
}

model ProjectReportEntryMedia {
  id            String                 @id @default(cuid())
  entryId       String
  entry         ProjectReportEntry     @relation(fields: [entryId], references: [id], onDelete: Cascade)
  fileAssetId   String
  fileAsset     FileAsset              @relation(fields: [fileAssetId], references: [id], onDelete: Cascade)
  mediaType     ProjectReportMediaType
  caption       String?
  sortOrder     Int                    @default(0)
  createdAt     DateTime               @default(now())

  @@index([entryId])
  @@index([fileAssetId])
  @@index([mediaType])
}

model ProjectReportExport {
  id              String                    @id @default(cuid())
  orgId           String
  org             Org                       @relation(fields: [orgId], references: [id], onDelete: Cascade)
  projectReportId String
  projectReport   ProjectReport             @relation(fields: [projectReportId], references: [id], onDelete: Cascade)
  format          ProjectReportExportFormat @default(PDF)
  fileAssetId     String?
  fileAsset       FileAsset?                @relation(fields: [fileAssetId], references: [id], onDelete: SetNull)
  exportVersion   Int                       @default(1)
  generatedById   String?
  generatedBy     User?                     @relation(fields: [generatedById], references: [id], onDelete: SetNull)
  generatedAt     DateTime                  @default(now())

  @@index([orgId])
  @@index([projectReportId])
  @@index([format])
}
```

## User Relation Additions
If this schema is adopted, `User` would need new relation fields:

```prisma
  reportBuilderTemplatesCreated ReportBuilderTemplate[]
  projectReportsPerformed       ProjectReport[]
  projectReportEntriesCreated   ProjectReportEntry[] @relation("ProjectReportEntryCreatedBy")
  projectReportEntriesUpdated   ProjectReportEntry[] @relation("ProjectReportEntryUpdatedBy")
```

The exact field names can be adjusted to match existing relation naming conventions in the schema.

## Org Relation Additions
If we want org-level browsing and cleanup to be easy, `Org` would likely gain:

```prisma
  reportBuilderTemplates        ReportBuilderTemplate[]
  clientReportTemplateAssignments ClientReportTemplateAssignment[]
  projectReports                ProjectReport[]
  projectReportEntries          ProjectReportEntry[]
  projectReportExports          ProjectReportExport[]
```

## Client Relation Additions
Recommended `Client` additions:

```prisma
  reportTemplateAssignments ClientReportTemplateAssignment[]
  projectReports            ProjectReport[]
```

## Project Relation Additions
Recommended `Project` additions:

```prisma
  projectReports ProjectReport[]
```

## FileAsset Considerations
There are two implementation options for report evidence and exports:

1. Reuse `FileAsset` as-is
- simpler first release
- keep evidence and generated exports in existing storage flow

2. Extend `FileAsset` scope options
- add a new scope or metadata usage for report-generated assets
- better long-term clarity

For first release, reusing `FileAsset` is the safer path.

## Migration Strategy
This draft should not replace the current `Report` model immediately.

Recommended migration order:
1. add new enums and models
2. keep current `Report` and `ReportTemplate` working
3. build new accessibility report flow on new models
4. later decide whether current report types should be merged or retired

## Intentional Omissions
This draft does not yet include:
- approval workflow tables dedicated to project reports
- comments per report entry
- multilingual content tables
- reusable taxonomy lookup tables separate from version JSON

Those can be added after the first release if needed.
