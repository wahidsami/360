-- CreateEnum
CREATE TYPE "ReportType" AS ENUM ('TECHNICAL', 'EXECUTIVE', 'COMPLIANCE', 'OTHER');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ReportVisibility" AS ENUM ('INTERNAL', 'CLIENT');

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "ReportType" NOT NULL DEFAULT 'OTHER',
    "status" "ReportStatus" NOT NULL DEFAULT 'DRAFT',
    "visibility" "ReportVisibility" NOT NULL DEFAULT 'INTERNAL',
    "createdById" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Report_projectId_idx" ON "Report"("projectId");

-- CreateIndex
CREATE INDEX "Report_orgId_idx" ON "Report"("orgId");

-- CreateIndex
CREATE INDEX "Report_status_idx" ON "Report"("status");

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
