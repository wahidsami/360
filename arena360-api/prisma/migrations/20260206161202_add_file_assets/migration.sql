-- CreateEnum
CREATE TYPE "FileScopeType" AS ENUM ('CLIENT', 'PROJECT');

-- CreateEnum
CREATE TYPE "FileCategory" AS ENUM ('DOCS', 'DESIGNS', 'BUILDS', 'OTHER');

-- CreateEnum
CREATE TYPE "FileVisibility" AS ENUM ('INTERNAL', 'CLIENT');

-- CreateTable
CREATE TABLE "FileAsset" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "scopeType" "FileScopeType" NOT NULL,
    "clientId" TEXT,
    "projectId" TEXT,
    "uploaderId" TEXT NOT NULL,
    "category" "FileCategory" NOT NULL DEFAULT 'OTHER',
    "visibility" "FileVisibility" NOT NULL DEFAULT 'INTERNAL',
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FileAsset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FileAsset_orgId_idx" ON "FileAsset"("orgId");

-- CreateIndex
CREATE INDEX "FileAsset_clientId_idx" ON "FileAsset"("clientId");

-- CreateIndex
CREATE INDEX "FileAsset_projectId_idx" ON "FileAsset"("projectId");

-- CreateIndex
CREATE INDEX "FileAsset_scopeType_idx" ON "FileAsset"("scopeType");

-- AddForeignKey
ALTER TABLE "FileAsset" ADD CONSTRAINT "FileAsset_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileAsset" ADD CONSTRAINT "FileAsset_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileAsset" ADD CONSTRAINT "FileAsset_uploaderId_fkey" FOREIGN KEY ("uploaderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
