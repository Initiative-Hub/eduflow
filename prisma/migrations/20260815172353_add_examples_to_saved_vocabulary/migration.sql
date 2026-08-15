-- AlterTable
ALTER TABLE "saved_vocabulary" ADD COLUMN     "examples" TEXT[] DEFAULT ARRAY[]::TEXT[];
