-- AlterTable
ALTER TABLE "Poll" ADD COLUMN     "featuredOrder" INTEGER,
ADD COLUMN     "isFeatured" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Poll_isFeatured_featuredOrder_idx" ON "Poll"("isFeatured", "featuredOrder");
