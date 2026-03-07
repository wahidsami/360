-- CreateEnum
CREATE TYPE "FindingSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "FindingStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "FindingVisibility" AS ENUM ('INTERNAL', 'CLIENT');

-- CreateTable
CREATE TABLE "Finding" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity" "FindingSeverity" NOT NULL DEFAULT 'MEDIUM',
    "status" "FindingStatus" NOT NULL DEFAULT 'OPEN',
    "visibility" "FindingVisibility" NOT NULL DEFAULT 'INTERNAL',
    "reportedById" TEXT NOT NULL,
    "assignedToId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Finding_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Finding_projectId_idx" ON "Finding"("projectId");

-- CreateIndex
CREATE INDEX "Finding_orgId_idx" ON "Finding"("orgId");

-- CreateIndex
CREATE INDEX "Finding_status_idx" ON "Finding"("status");

-- CreateIndex
CREATE INDEX "Finding_severity_idx" ON "Finding"("severity");

-- AddForeignKey
ALTER TABLE "Finding" ADD CONSTRAINT "Finding_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Finding" ADD CONSTRAINT "Finding_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Finding" ADD CONSTRAINT "Finding_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
