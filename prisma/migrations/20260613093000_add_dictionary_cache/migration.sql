-- CreateTable
CREATE TABLE "dictionary_cache" (
    "id" TEXT NOT NULL,
    "word" TEXT NOT NULL,
    "phonetic" TEXT,
    "audio_url" TEXT,
    "meanings" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dictionary_cache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "dictionary_cache_word_key" ON "dictionary_cache"("word");

-- CreateIndex
CREATE INDEX "dictionary_cache_word_idx" ON "dictionary_cache"("word");
