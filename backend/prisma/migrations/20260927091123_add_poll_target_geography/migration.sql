-- AlterTable
ALTER TABLE "Poll" ADD COLUMN     "targetConstituencyId" TEXT,
ADD COLUMN     "targetCountyId" TEXT,
ADD COLUMN     "targetWardId" TEXT;

-- CreateIndex
CREATE INDEX "Poll_targetCountyId_idx" ON "Poll"("targetCountyId");

-- CreateIndex
CREATE INDEX "Poll_targetConstituencyId_idx" ON "Poll"("targetConstituencyId");

-- CreateIndex
CREATE INDEX "Poll_targetWardId_idx" ON "Poll"("targetWardId");

-- AddForeignKey
ALTER TABLE "Poll" ADD CONSTRAINT "Poll_targetCountyId_fkey" FOREIGN KEY ("targetCountyId") REFERENCES "County"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Poll" ADD CONSTRAINT "Poll_targetConstituencyId_fkey" FOREIGN KEY ("targetConstituencyId") REFERENCES "Constituency"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Poll" ADD CONSTRAINT "Poll_targetWardId_fkey" FOREIGN KEY ("targetWardId") REFERENCES "Ward"("id") ON DELETE SET NULL ON UPDATE CASCADE;
