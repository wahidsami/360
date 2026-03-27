-- CreateEnum
CREATE TYPE "WorkspaceAudienceType" AS ENUM ('INTERNAL', 'CLIENT', 'MIXED');

-- CreateEnum
CREATE TYPE "WorkspaceTemplateStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "WorkspaceTabState" AS ENUM ('HIDDEN', 'VISIBLE_READ_ONLY', 'VISIBLE_INTERACTIVE');

-- CreateTable
CREATE TABLE "ProjectWorkspaceTemplate" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "audienceType" "WorkspaceAudienceType" NOT NULL DEFAULT 'CLIENT',
    "status" "WorkspaceTemplateStatus" NOT NULL DEFAULT 'DRAFT',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "definitionJson" JSONB NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectWorkspaceTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientWorkspaceTemplateAssignment" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "assignedById" TEXT,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientWorkspaceTemplateAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectWorkspaceConfig" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "sourceTemplateId" TEXT,
    "sourceTemplateVersion" INTEGER,
    "assignedClientId" TEXT,
    "audienceType" "WorkspaceAudienceType" NOT NULL DEFAULT 'CLIENT',
    "tabsJson" JSONB NOT NULL,
    "overviewSectionsJson" JSONB,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectWorkspaceConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProjectWorkspaceTemplate_orgId_idx" ON "ProjectWorkspaceTemplate"("orgId");

-- CreateIndex
CREATE INDEX "ProjectWorkspaceTemplate_status_idx" ON "ProjectWorkspaceTemplate"("status");

-- CreateIndex
CREATE INDEX "ClientWorkspaceTemplateAssignment_orgId_idx" ON "ClientWorkspaceTemplateAssignment"("orgId");

-- CreateIndex
CREATE INDEX "ClientWorkspaceTemplateAssignment_clientId_idx" ON "ClientWorkspaceTemplateAssignment"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "ClientWorkspaceTemplateAssignment_clientId_templateId_key" ON "ClientWorkspaceTemplateAssignment"("clientId", "templateId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectWorkspaceConfig_projectId_key" ON "ProjectWorkspaceConfig"("projectId");

-- CreateIndex
CREATE INDEX "ProjectWorkspaceConfig_orgId_idx" ON "ProjectWorkspaceConfig"("orgId");

-- CreateIndex
CREATE INDEX "ProjectWorkspaceConfig_assignedClientId_idx" ON "ProjectWorkspaceConfig"("assignedClientId");

-- AddForeignKey
ALTER TABLE "ProjectWorkspaceTemplate" ADD CONSTRAINT "ProjectWorkspaceTemplate_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectWorkspaceTemplate" ADD CONSTRAINT "ProjectWorkspaceTemplate_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientWorkspaceTemplateAssignment" ADD CONSTRAINT "ClientWorkspaceTemplateAssignment_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientWorkspaceTemplateAssignment" ADD CONSTRAINT "ClientWorkspaceTemplateAssignment_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientWorkspaceTemplateAssignment" ADD CONSTRAINT "ClientWorkspaceTemplateAssignment_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ProjectWorkspaceTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientWorkspaceTemplateAssignment" ADD CONSTRAINT "ClientWorkspaceTemplateAssignment_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectWorkspaceConfig" ADD CONSTRAINT "ProjectWorkspaceConfig_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectWorkspaceConfig" ADD CONSTRAINT "ProjectWorkspaceConfig_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectWorkspaceConfig" ADD CONSTRAINT "ProjectWorkspaceConfig_sourceTemplateId_fkey" FOREIGN KEY ("sourceTemplateId") REFERENCES "ProjectWorkspaceTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectWorkspaceConfig" ADD CONSTRAINT "ProjectWorkspaceConfig_assignedClientId_fkey" FOREIGN KEY ("assignedClientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectWorkspaceConfig" ADD CONSTRAINT "ProjectWorkspaceConfig_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

