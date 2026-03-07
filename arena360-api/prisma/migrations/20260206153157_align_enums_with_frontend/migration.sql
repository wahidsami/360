/*
  Warnings:

  - The values [ACTIVE] on the enum `ProjectStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ClientStatus" ADD VALUE 'INACTIVE';
ALTER TYPE "ClientStatus" ADD VALUE 'LEAD';

-- AlterEnum
BEGIN;
CREATE TYPE "ProjectStatus_new" AS ENUM ('PLANNING', 'IN_PROGRESS', 'TESTING', 'DEPLOYED', 'MAINTENANCE', 'ON_HOLD', 'COMPLETED', 'ARCHIVED');
ALTER TABLE "Project" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Project" ALTER COLUMN "status" TYPE "ProjectStatus_new" USING ("status"::text::"ProjectStatus_new");
ALTER TYPE "ProjectStatus" RENAME TO "ProjectStatus_old";
ALTER TYPE "ProjectStatus_new" RENAME TO "ProjectStatus";
DROP TYPE "ProjectStatus_old";
ALTER TABLE "Project" ALTER COLUMN "status" SET DEFAULT 'PLANNING';
COMMIT;

-- AlterTable
ALTER TABLE "Project" ALTER COLUMN "status" SET DEFAULT 'PLANNING';
