-- CreateEnum
CREATE TYPE "ResponseSource" AS ENUM ('ONLINE', 'AGENT', 'TEST');

-- AlterTable
ALTER TABLE "Response" ADD COLUMN     "source" "ResponseSource" NOT NULL DEFAULT 'ONLINE';
