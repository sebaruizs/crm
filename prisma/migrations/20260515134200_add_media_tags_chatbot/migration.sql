-- AlterTable
ALTER TABLE "Contact" ADD COLUMN     "chatbotAnswers" TEXT NOT NULL DEFAULT '{}',
ADD COLUMN     "chatbotState" TEXT NOT NULL DEFAULT 'idle',
ADD COLUMN     "chatbotStep" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "mediaMime" TEXT,
ADD COLUMN     "mediaName" TEXT,
ADD COLUMN     "mediaType" TEXT,
ADD COLUMN     "mediaUrl" TEXT;

-- AlterTable
ALTER TABLE "Settings" ADD COLUMN     "chatbotClosing" TEXT NOT NULL DEFAULT '¡Gracias! Un agente te va a atender en breve. 🙌',
ADD COLUMN     "chatbotEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "chatbotQuestions" TEXT NOT NULL DEFAULT '[]';

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);
