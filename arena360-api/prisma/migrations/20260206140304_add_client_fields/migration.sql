-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "address" TEXT,
ADD COLUMN     "billing" JSONB,
ADD COLUMN     "contactPerson" TEXT,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "industry" TEXT,
ADD COLUMN     "lastActivity" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "outstandingBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "revenueYTD" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "website" TEXT;
