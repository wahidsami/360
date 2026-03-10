/*
  Warnings:

  - The values [RESOLVED] on the enum `FindingStatus` will be removed. If these variants are still used in the database, this will fail.

*/

-- AlterEnum
BEGIN;
CREATE TYPE "FindingStatus_new" AS ENUM ('OPEN', 'IN_PROGRESS', 'IN_REVIEW', 'CLOSED', 'DISMISSED', 'BLOCKED');
ALTER TABLE "Finding" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Finding" ALTER COLUMN "status" TYPE "FindingStatus_new" USING ("status"::text::"FindingStatus_new");
ALTER TYPE "FindingStatus" RENAME TO "FindingStatus_old";
ALTER TYPE "FindingStatus_new" RENAME TO "FindingStatus";
DROP TYPE "FindingStatus_old";
ALTER TABLE "Finding" ALTER COLUMN "status" SET DEFAULT 'OPEN';
COMMIT;

-- AlterEnum
ALTER TYPE "TaskStatus" ADD VALUE 'BLOCKED';
