-- CreateEnum
CREATE TYPE "course_enrollment_status" AS ENUM ('active', 'pending_invite');

-- CreateEnum
CREATE TYPE "course_invitation_status" AS ENUM ('pending', 'accepted', 'declined', 'cancelled', 'expired');

-- AlterTable
ALTER TABLE "enrollment" ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "invited_at" TIMESTAMP(3),
ADD COLUMN     "status" "course_enrollment_status" NOT NULL DEFAULT 'active',
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "enrolled_at" DROP NOT NULL;

-- CreateTable
CREATE TABLE "course_invitation" (
    "id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "invitee_id" TEXT NOT NULL,
    "invited_by_id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "status" "course_invitation_status" NOT NULL DEFAULT 'pending',
    "expires_at" TIMESTAMP(3),
    "sent_at" TIMESTAMP(3),
    "accepted_at" TIMESTAMP(3),
    "declined_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "course_invitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_invite_link" (
    "id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "created_by_id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "max_uses" INTEGER,
    "used_count" INTEGER NOT NULL DEFAULT 0,
    "expires_at" TIMESTAMP(3),
    "last_used_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "course_invite_link_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "course_invitation_invitee_id_status_idx" ON "course_invitation"("invitee_id", "status");

-- CreateIndex
CREATE INDEX "course_invitation_course_id_status_idx" ON "course_invitation"("course_id", "status");

-- CreateIndex
CREATE INDEX "course_invitation_expires_at_idx" ON "course_invitation"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "course_invitation_course_id_invitee_id_key" ON "course_invitation"("course_id", "invitee_id");

-- CreateIndex
CREATE INDEX "course_invite_link_course_id_revoked_at_idx" ON "course_invite_link"("course_id", "revoked_at");

-- CreateIndex
CREATE INDEX "course_invite_link_expires_at_idx" ON "course_invite_link"("expires_at");

-- CreateIndex
CREATE INDEX "course_invite_link_created_by_id_idx" ON "course_invite_link"("created_by_id");

-- CreateIndex
CREATE INDEX "enrollment_course_id_status_role_id_idx" ON "enrollment"("course_id", "status", "role_id");

-- CreateIndex
CREATE INDEX "enrollment_member_id_status_idx" ON "enrollment"("member_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "enrollment_course_id_member_id_key" ON "enrollment"("course_id", "member_id");

-- AddForeignKey
ALTER TABLE "course_invitation" ADD CONSTRAINT "course_invitation_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_invitation" ADD CONSTRAINT "course_invitation_invitee_id_fkey" FOREIGN KEY ("invitee_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_invitation" ADD CONSTRAINT "course_invitation_invited_by_id_fkey" FOREIGN KEY ("invited_by_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_invitation" ADD CONSTRAINT "course_invitation_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "course_role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_invite_link" ADD CONSTRAINT "course_invite_link_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_invite_link" ADD CONSTRAINT "course_invite_link_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_invite_link" ADD CONSTRAINT "course_invite_link_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "course_role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
