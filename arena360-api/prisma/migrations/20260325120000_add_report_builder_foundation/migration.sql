-- CreateEnum
CREATE TYPE "ReportBuilderTemplateCategory" AS ENUM ('ACCESSIBILITY', 'SECURITY', 'QA', 'PERFORMANCE', 'COMPLIANCE', 'OTHER');

-- CreateEnum
CREATE TYPE "ReportBuilderTemplateStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ProjectReportStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'APPROVED', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ProjectReportVisibility" AS ENUM ('INTERNAL', 'CLIENT');

-- CreateEnum
CREATE TYPE "ProjectReportEntrySeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "ProjectReportEntryStatus" AS ENUM ('OPEN', 'ACCEPTED', 'FIXED', 'VERIFIED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "ProjectReportMediaType" AS ENUM ('IMAGE', 'VIDEO', 'DOCUMENT');

-- CreateEnum
CREATE TYPE "ProjectReportExportFormat" AS ENUM ('PDF');

-- CreateTable
CREATE TABLE "ReportBuilderTemplate" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "category" "ReportBuilderTemplateCategory" NOT NULL DEFAULT 'OTHER',
    "status" "ReportBuilderTemplateStatus" NOT NULL DEFAULT 'DRAFT',
    "isBuiltIn" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReportBuilderTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportBuilderTemplateVersion" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "schemaJson" JSONB NOT NULL,
    "pdfConfigJson" JSONB,
    "aiConfigJson" JSONB,
    "taxonomyJson" JSONB,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "publishedById" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReportBuilderTemplateVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientReportTemplateAssignment" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "templateVersionId" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "assignedById" TEXT,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientReportTemplateAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectReport" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "templateVersionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "ProjectReportStatus" NOT NULL DEFAULT 'DRAFT',
    "visibility" "ProjectReportVisibility" NOT NULL DEFAULT 'INTERNAL',
    "performedById" TEXT NOT NULL,
    "summaryJson" JSONB,
    "coverSnapshotJson" JSONB,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ProjectReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectReportEntry" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "projectReportId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "serviceName" TEXT,
    "issueTitle" TEXT NOT NULL,
    "issueDescription" TEXT NOT NULL,
    "severity" "ProjectReportEntrySeverity",
    "category" TEXT,
    "subcategory" TEXT,
    "pageUrl" TEXT,
    "recommendation" TEXT,
    "status" "ProjectReportEntryStatus" NOT NULL DEFAULT 'OPEN',
    "rowDataJson" JSONB,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ProjectReportEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectReportEntryMedia" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "fileAssetId" TEXT NOT NULL,
    "mediaType" "ProjectReportMediaType" NOT NULL,
    "caption" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectReportEntryMedia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectReportExport" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "projectReportId" TEXT NOT NULL,
    "format" "ProjectReportExportFormat" NOT NULL DEFAULT 'PDF',
    "fileAssetId" TEXT,
    "exportVersion" INTEGER NOT NULL DEFAULT 1,
    "generatedById" TEXT,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectReportExport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReportBuilderTemplate_orgId_idx" ON "ReportBuilderTemplate"("orgId");

-- CreateIndex
CREATE INDEX "ReportBuilderTemplate_category_idx" ON "ReportBuilderTemplate"("category");

-- CreateIndex
CREATE INDEX "ReportBuilderTemplate_status_idx" ON "ReportBuilderTemplate"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ReportBuilderTemplate_orgId_code_key" ON "ReportBuilderTemplate"("orgId", "code");

-- CreateIndex
CREATE INDEX "ReportBuilderTemplateVersion_templateId_idx" ON "ReportBuilderTemplateVersion"("templateId");

-- CreateIndex
CREATE INDEX "ReportBuilderTemplateVersion_isPublished_idx" ON "ReportBuilderTemplateVersion"("isPublished");

-- CreateIndex
CREATE UNIQUE INDEX "ReportBuilderTemplateVersion_templateId_versionNumber_key" ON "ReportBuilderTemplateVersion"("templateId", "versionNumber");

-- CreateIndex
CREATE INDEX "ClientReportTemplateAssignment_orgId_idx" ON "ClientReportTemplateAssignment"("orgId");

-- CreateIndex
CREATE INDEX "ClientReportTemplateAssignment_clientId_idx" ON "ClientReportTemplateAssignment"("clientId");

-- CreateIndex
CREATE INDEX "ClientReportTemplateAssignment_templateId_idx" ON "ClientReportTemplateAssignment"("templateId");

-- CreateIndex
CREATE INDEX "ClientReportTemplateAssignment_templateVersionId_idx" ON "ClientReportTemplateAssignment"("templateVersionId");

-- CreateIndex
CREATE INDEX "ClientReportTemplateAssignment_isActive_idx" ON "ClientReportTemplateAssignment"("isActive");

-- CreateIndex
CREATE INDEX "ProjectReport_orgId_idx" ON "ProjectReport"("orgId");

-- CreateIndex
CREATE INDEX "ProjectReport_clientId_idx" ON "ProjectReport"("clientId");

-- CreateIndex
CREATE INDEX "ProjectReport_projectId_idx" ON "ProjectReport"("projectId");

-- CreateIndex
CREATE INDEX "ProjectReport_templateId_idx" ON "ProjectReport"("templateId");

-- CreateIndex
CREATE INDEX "ProjectReport_templateVersionId_idx" ON "ProjectReport"("templateVersionId");

-- CreateIndex
CREATE INDEX "ProjectReport_status_idx" ON "ProjectReport"("status");

-- CreateIndex
CREATE INDEX "ProjectReportEntry_orgId_idx" ON "ProjectReportEntry"("orgId");

-- CreateIndex
CREATE INDEX "ProjectReportEntry_projectReportId_idx" ON "ProjectReportEntry"("projectReportId");

-- CreateIndex
CREATE INDEX "ProjectReportEntry_severity_idx" ON "ProjectReportEntry"("severity");

-- CreateIndex
CREATE INDEX "ProjectReportEntry_category_idx" ON "ProjectReportEntry"("category");

-- CreateIndex
CREATE INDEX "ProjectReportEntry_subcategory_idx" ON "ProjectReportEntry"("subcategory");

-- CreateIndex
CREATE INDEX "ProjectReportEntry_status_idx" ON "ProjectReportEntry"("status");

-- CreateIndex
CREATE INDEX "ProjectReportEntryMedia_entryId_idx" ON "ProjectReportEntryMedia"("entryId");

-- CreateIndex
CREATE INDEX "ProjectReportEntryMedia_fileAssetId_idx" ON "ProjectReportEntryMedia"("fileAssetId");

-- CreateIndex
CREATE INDEX "ProjectReportEntryMedia_mediaType_idx" ON "ProjectReportEntryMedia"("mediaType");

-- CreateIndex
CREATE INDEX "ProjectReportExport_orgId_idx" ON "ProjectReportExport"("orgId");

-- CreateIndex
CREATE INDEX "ProjectReportExport_projectReportId_idx" ON "ProjectReportExport"("projectReportId");

-- CreateIndex
CREATE INDEX "ProjectReportExport_format_idx" ON "ProjectReportExport"("format");

-- AddForeignKey
ALTER TABLE "ReportBuilderTemplate" ADD CONSTRAINT "ReportBuilderTemplate_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportBuilderTemplate" ADD CONSTRAINT "ReportBuilderTemplate_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportBuilderTemplateVersion" ADD CONSTRAINT "ReportBuilderTemplateVersion_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ReportBuilderTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportBuilderTemplateVersion" ADD CONSTRAINT "ReportBuilderTemplateVersion_publishedById_fkey" FOREIGN KEY ("publishedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientReportTemplateAssignment" ADD CONSTRAINT "ClientReportTemplateAssignment_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientReportTemplateAssignment" ADD CONSTRAINT "ClientReportTemplateAssignment_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientReportTemplateAssignment" ADD CONSTRAINT "ClientReportTemplateAssignment_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ReportBuilderTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientReportTemplateAssignment" ADD CONSTRAINT "ClientReportTemplateAssignment_templateVersionId_fkey" FOREIGN KEY ("templateVersionId") REFERENCES "ReportBuilderTemplateVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientReportTemplateAssignment" ADD CONSTRAINT "ClientReportTemplateAssignment_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectReport" ADD CONSTRAINT "ProjectReport_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectReport" ADD CONSTRAINT "ProjectReport_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectReport" ADD CONSTRAINT "ProjectReport_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectReport" ADD CONSTRAINT "ProjectReport_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ReportBuilderTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectReport" ADD CONSTRAINT "ProjectReport_templateVersionId_fkey" FOREIGN KEY ("templateVersionId") REFERENCES "ReportBuilderTemplateVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectReport" ADD CONSTRAINT "ProjectReport_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectReportEntry" ADD CONSTRAINT "ProjectReportEntry_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectReportEntry" ADD CONSTRAINT "ProjectReportEntry_projectReportId_fkey" FOREIGN KEY ("projectReportId") REFERENCES "ProjectReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectReportEntry" ADD CONSTRAINT "ProjectReportEntry_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectReportEntry" ADD CONSTRAINT "ProjectReportEntry_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectReportEntryMedia" ADD CONSTRAINT "ProjectReportEntryMedia_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "ProjectReportEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectReportEntryMedia" ADD CONSTRAINT "ProjectReportEntryMedia_fileAssetId_fkey" FOREIGN KEY ("fileAssetId") REFERENCES "FileAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectReportExport" ADD CONSTRAINT "ProjectReportExport_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectReportExport" ADD CONSTRAINT "ProjectReportExport_projectReportId_fkey" FOREIGN KEY ("projectReportId") REFERENCES "ProjectReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectReportExport" ADD CONSTRAINT "ProjectReportExport_fileAssetId_fkey" FOREIGN KEY ("fileAssetId") REFERENCES "FileAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectReportExport" ADD CONSTRAINT "ProjectReportExport_generatedById_fkey" FOREIGN KEY ("generatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

