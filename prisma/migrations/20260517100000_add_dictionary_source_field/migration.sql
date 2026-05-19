-- DropIndex
DROP INDEX "dictionary_cache_word_idx";

-- DropIndex
DROP INDEX "dictionary_cache_word_key";

-- AlterTable
ALTER TABLE "dictionary_cache" ADD COLUMN "source" TEXT NOT NULL DEFAULT 'free-dictionary';

-- CreateIndex
CREATE UNIQUE INDEX "dictionary_cache_word_source_key" ON "dictionary_cache"("word", "source");

-- CreateIndex
CREATE INDEX "dictionary_cache_word_source_idx" ON "dictionary_cache"("word", "source");
