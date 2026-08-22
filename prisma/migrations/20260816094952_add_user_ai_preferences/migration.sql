-- CreateTable
CREATE TABLE "user_ai_preference" (
    "user_id" TEXT NOT NULL,
    "custom_instructions" VARCHAR(2000),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_ai_preference_pkey" PRIMARY KEY ("user_id")
);

-- AddForeignKey
ALTER TABLE "user_ai_preference" ADD CONSTRAINT "user_ai_preference_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
