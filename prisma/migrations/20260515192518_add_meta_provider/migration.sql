-- AlterTable
ALTER TABLE "Line" ADD COLUMN     "accessToken" TEXT,
ADD COLUMN     "phoneNumberId" TEXT,
ADD COLUMN     "provider" TEXT NOT NULL DEFAULT 'baileys',
ADD COLUMN     "verifyToken" TEXT,
ADD COLUMN     "wabaId" TEXT;
