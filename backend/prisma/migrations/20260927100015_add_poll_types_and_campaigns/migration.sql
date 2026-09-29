-- CreateEnum
CREATE TYPE "PollType" AS ENUM ('GENERAL', 'POLITICAL', 'CAMPAIGN', 'PUBLIC_SERVICE', 'RESEARCH');

-- AlterTable
ALTER TABLE "Poll" ADD COLUMN     "campaignId" TEXT,
ADD COLUMN     "disclosureNote" TEXT,
ADD COLUMN     "methodologyNote" TEXT,
ADD COLUMN     "sponsorName" TEXT,
ADD COLUMN     "sponsorOrganization" TEXT,
ADD COLUMN     "type" "PollType" NOT NULL DEFAULT 'GENERAL';

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "organization" TEXT,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Campaign_isActive_idx" ON "Campaign"("isActive");

-- CreateIndex
CREATE INDEX "Poll_type_idx" ON "Poll"("type");

-- CreateIndex
CREATE INDEX "Poll_campaignId_idx" ON "Poll"("campaignId");

-- CreateIndex
CREATE INDEX "Poll_createdAt_idx" ON "Poll"("createdAt");

-- AddForeignKey
ALTER TABLE "Poll" ADD CONSTRAINT "Poll_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;
