-- AlterTable
ALTER TABLE "Contact" ADD COLUMN     "adCtwaClid" TEXT,
ADD COLUMN     "adHeadline" TEXT,
ADD COLUMN     "adId" TEXT,
ADD COLUMN     "adPlatform" TEXT,
ADD COLUMN     "adSourceUrl" TEXT;

-- CreateIndex
CREATE INDEX "Contact_source_idx" ON "Contact"("source");
