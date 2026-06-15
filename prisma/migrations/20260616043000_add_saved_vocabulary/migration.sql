-- CreateTable
CREATE TABLE "saved_vocabulary" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "word" TEXT NOT NULL,
    "part_of_speech" TEXT NOT NULL,
    "ipa" TEXT,
    "audio_url" TEXT,
    "english_definition" TEXT NOT NULL,
    "vietnamese_translation" TEXT NOT NULL,
    "example_sentence" TEXT NOT NULL,
    "source_snippet" TEXT,
    "saved_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_vocabulary_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "saved_vocabulary_user_id_word_key" ON "saved_vocabulary"("user_id", "word");

-- CreateIndex
CREATE INDEX "saved_vocabulary_user_id_saved_at_idx" ON "saved_vocabulary"("user_id", "saved_at" DESC);

-- AddForeignKey
ALTER TABLE "saved_vocabulary" ADD CONSTRAINT "saved_vocabulary_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
