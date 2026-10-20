-- CreateEnum
CREATE TYPE "Role" AS ENUM ('CEO', 'PARTNER');

-- CreateEnum
CREATE TYPE "ServiceType" AS ENUM ('MAINLAND_SETUP', 'FREEZONE_LICENSE', 'CORPORATE_TAX', 'BANK_ACCOUNT_SETUP', 'GOLDEN_VISA');

-- CreateEnum
CREATE TYPE "LeadStage" AS ENUM ('NEW', 'WON_ADVANCE_PENDING', 'WON_ADVANCE_TAKEN', 'WON_IN_PROCESS', 'WON_CLOSED', 'LOST');

-- CreateEnum
CREATE TYPE "CommissionStatus" AS ENUM ('NOT_SET', 'EXPECTED', 'PAYABLE', 'PAID');

-- CreateEnum
CREATE TYPE "LostReason" AS ENUM ('PRICE', 'NO_RESPONSE', 'WENT_ELSEWHERE', 'NOT_ELIGIBLE', 'OTHER');

-- CreateEnum
CREATE TYPE "LeadEventType" AS ENUM ('CREATED', 'STAGE_CHANGED', 'COMMISSION_SET', 'COMMISSION_UPDATED', 'COMMISSION_PAID', 'NOTE_UPDATED', 'REOPENED', 'MARKED_DUPLICATE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "companyName" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sessionVersion" INTEGER NOT NULL DEFAULT 0,
    "lastLoginAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OtpCode" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OtpCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "clientPhone" TEXT NOT NULL,
    "serviceType" "ServiceType" NOT NULL,
    "requirementNote" TEXT,
    "stage" "LeadStage" NOT NULL DEFAULT 'NEW',
    "stageChangedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lostReason" "LostReason",
    "lostReasonNote" TEXT,
    "internalNote" TEXT,
    "totalAmount" DECIMAL(12,2),
    "commissionPercent" DECIMAL(5,2),
    "commissionAmount" DECIMAL(12,2),
    "commissionStatus" "CommissionStatus" NOT NULL DEFAULT 'NOT_SET',
    "commissionPaidAt" TIMESTAMP(3),
    "commissionPaidRef" TEXT,
    "isPossibleDuplicate" BOOLEAN NOT NULL DEFAULT false,
    "duplicateOfId" TEXT,
    "firstViewedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadEvent" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "type" "LeadEventType" NOT NULL,
    "fromStage" "LeadStage",
    "toStage" "LeadStage",
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_isActive_idx" ON "User"("role", "isActive");

-- CreateIndex
CREATE INDEX "OtpCode_email_createdAt_idx" ON "OtpCode"("email", "createdAt");

-- CreateIndex
CREATE INDEX "OtpCode_ip_createdAt_idx" ON "OtpCode"("ip", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Lead_token_key" ON "Lead"("token");

-- CreateIndex
CREATE INDEX "Lead_partnerId_stage_idx" ON "Lead"("partnerId", "stage");

-- CreateIndex
CREATE INDEX "Lead_partnerId_createdAt_idx" ON "Lead"("partnerId", "createdAt");

-- CreateIndex
CREATE INDEX "Lead_stage_createdAt_idx" ON "Lead"("stage", "createdAt");

-- CreateIndex
CREATE INDEX "Lead_clientPhone_idx" ON "Lead"("clientPhone");

-- CreateIndex
CREATE INDEX "Lead_commissionStatus_commissionPaidAt_idx" ON "Lead"("commissionStatus", "commissionPaidAt");

-- CreateIndex
CREATE INDEX "LeadEvent_leadId_createdAt_idx" ON "LeadEvent"("leadId", "createdAt");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_duplicateOfId_fkey" FOREIGN KEY ("duplicateOfId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadEvent" ADD CONSTRAINT "LeadEvent_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadEvent" ADD CONSTRAINT "LeadEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
