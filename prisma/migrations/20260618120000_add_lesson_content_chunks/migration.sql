CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE "lesson_content_chunk" (
    "id" TEXT NOT NULL,
    "lesson_id" TEXT NOT NULL,
    "content_hash" TEXT NOT NULL,
    "chunk_index" INTEGER NOT NULL,
    "markdown" TEXT NOT NULL,
    "token_count" INTEGER NOT NULL,
    "embedding_model" TEXT NOT NULL,
    "embedding" vector(1536) NOT NULL,
    "metadata" JSONB DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lesson_content_chunk_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "lesson_content_chunk_lesson_id_chunk_index_key" ON "lesson_content_chunk"("lesson_id", "chunk_index");
CREATE INDEX "lesson_content_chunk_lesson_id_idx" ON "lesson_content_chunk"("lesson_id");
CREATE INDEX "lesson_content_chunk_content_hash_idx" ON "lesson_content_chunk"("content_hash");
CREATE INDEX "lesson_content_chunk_embedding_hnsw_idx" ON "lesson_content_chunk" USING hnsw ("embedding" vector_cosine_ops);

ALTER TABLE "lesson_content_chunk"
ADD CONSTRAINT "lesson_content_chunk_lesson_id_fkey"
FOREIGN KEY ("lesson_id") REFERENCES "lesson"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
