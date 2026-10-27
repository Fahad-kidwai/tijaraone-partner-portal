-- Tokens v2: truncate test data, then reshape Lead / enums / indexes.
TRUNCATE "LeadEvent", "Lead";

-- Drop indexes / FK that will be removed or rebuilt
DROP INDEX IF EXISTS "Lead_partnerId_stage_idx";
DROP INDEX IF EXISTS "Lead_clientPhone_idx";
DROP INDEX IF EXISTS "Lead_commissionStatus_commissionPaidAt_idx";
ALTER TABLE "Lead" DROP CONSTRAINT IF EXISTS "Lead_duplicateOfId_fkey";

-- Drop removed columns BEFORE dropping their enum types
ALTER TABLE "Lead" DROP COLUMN IF EXISTS "clientPhone";
ALTER TABLE "Lead" DROP COLUMN IF EXISTS "requirementNote";
ALTER TABLE "Lead" DROP COLUMN IF EXISTS "lostReason";
ALTER TABLE "Lead" DROP COLUMN IF EXISTS "lostReasonNote";
ALTER TABLE "Lead" DROP COLUMN IF EXISTS "isPossibleDuplicate";
ALTER TABLE "Lead" DROP COLUMN IF EXISTS "duplicateOfId";
ALTER TABLE "Lead" DROP COLUMN IF EXISTS "firstViewedAt";
ALTER TABLE "Lead" DROP COLUMN IF EXISTS "closedAt";

-- Detach remaining enum-typed columns so enums can be replaced
ALTER TABLE "Lead" ALTER COLUMN "stage" DROP DEFAULT;
ALTER TABLE "Lead" ALTER COLUMN "commissionStatus" DROP DEFAULT;
ALTER TABLE "Lead" ALTER COLUMN "stage" TYPE TEXT USING "stage"::text;
ALTER TABLE "Lead" ALTER COLUMN "commissionStatus" TYPE TEXT USING "commissionStatus"::text;
ALTER TABLE "LeadEvent" ALTER COLUMN "type" TYPE TEXT USING "type"::text;
ALTER TABLE "LeadEvent" ALTER COLUMN "fromStage" TYPE TEXT USING "fromStage"::text;
ALTER TABLE "LeadEvent" ALTER COLUMN "toStage" TYPE TEXT USING "toStage"::text;

DROP TYPE "LeadStage";
DROP TYPE "CommissionStatus";
DROP TYPE "LeadEventType";
DROP TYPE "LostReason";

CREATE TYPE "LeadStage" AS ENUM ('ADVANCE_RECEIVED', 'IN_PROGRESS', 'COMPLETED');
CREATE TYPE "CommissionStatus" AS ENUM ('EXPECTED', 'PAYABLE', 'PAID');
CREATE TYPE "LeadEventType" AS ENUM ('CREATED', 'STAGE_CHANGED', 'COMMISSION_UPDATED', 'COMMISSION_PAID', 'NOTE_UPDATED');

-- Add completedAt (replaces closedAt)
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "completedAt" TIMESTAMP(3);

-- Money columns: NOT NULL with defaults (table is empty after TRUNCATE)
ALTER TABLE "Lead" ALTER COLUMN "totalAmount" SET NOT NULL;
ALTER TABLE "Lead" ALTER COLUMN "commissionPercent" SET NOT NULL;
ALTER TABLE "Lead" ALTER COLUMN "commissionPercent" SET DEFAULT 25.00;
ALTER TABLE "Lead" ALTER COLUMN "commissionAmount" SET NOT NULL;

-- Reattach enums
ALTER TABLE "Lead" ALTER COLUMN "stage" TYPE "LeadStage" USING 'ADVANCE_RECEIVED'::"LeadStage";
ALTER TABLE "Lead" ALTER COLUMN "stage" SET DEFAULT 'ADVANCE_RECEIVED'::"LeadStage";
ALTER TABLE "Lead" ALTER COLUMN "commissionStatus" TYPE "CommissionStatus" USING 'EXPECTED'::"CommissionStatus";
ALTER TABLE "Lead" ALTER COLUMN "commissionStatus" SET DEFAULT 'EXPECTED'::"CommissionStatus";

ALTER TABLE "LeadEvent" ALTER COLUMN "type" TYPE "LeadEventType" USING 'CREATED'::"LeadEventType";
ALTER TABLE "LeadEvent" ALTER COLUMN "fromStage" TYPE "LeadStage" USING NULL;
ALTER TABLE "LeadEvent" ALTER COLUMN "toStage" TYPE "LeadStage" USING NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS "Lead_partnerId_createdAt_idx" ON "Lead"("partnerId", "createdAt");
CREATE INDEX IF NOT EXISTS "Lead_stage_createdAt_idx" ON "Lead"("stage", "createdAt");
CREATE INDEX "Lead_commissionStatus_commissionPaidAt_idx" ON "Lead"("commissionStatus", "commissionPaidAt");
