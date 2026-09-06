-- AlterTable
ALTER TABLE "saved_vocabulary" ADD COLUMN     "examples" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
