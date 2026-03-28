UPDATE "Client"
SET "status" = 'ACTIVE'
WHERE "status" = 'LEAD';

ALTER TYPE "ClientStatus" RENAME TO "ClientStatus_old";

CREATE TYPE "ClientStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED');

ALTER TABLE "Client"
  ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "Client"
  ALTER COLUMN "status" TYPE "ClientStatus"
  USING ("status"::text::"ClientStatus");

ALTER TABLE "Client"
  ALTER COLUMN "status" SET DEFAULT 'ACTIVE';

DROP TYPE "ClientStatus_old";
