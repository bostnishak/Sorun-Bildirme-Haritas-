-- AlterTable
ALTER TABLE "issues" ALTER COLUMN "status" SET DEFAULT 'IN_REVIEW';

-- AlterTable
ALTER TABLE "users" DROP COLUMN IF EXISTS "email_verify_code",
DROP COLUMN IF EXISTS "is_phone_verified",
DROP COLUMN IF EXISTS "phone",
DROP COLUMN IF EXISTS "phone_number",
DROP COLUMN IF EXISTS "reset_password_expires",
DROP COLUMN IF EXISTS "reset_password_token",
DROP COLUMN IF EXISTS "sms_verify_code";

-- DropTable
DROP TABLE IF EXISTS "pending_registrations" CASCADE;

-- CreateTable
CREATE TABLE IF NOT EXISTS "password_reset_tokens" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "token" VARCHAR(64) NOT NULL,
    "user_id" UUID NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "password_reset_tokens_token_key" ON "password_reset_tokens"("token");
CREATE INDEX IF NOT EXISTS "password_reset_tokens_token_idx" ON "password_reset_tokens"("token");
CREATE INDEX IF NOT EXISTS "password_reset_tokens_user_id_idx" ON "password_reset_tokens"("user_id");

-- AddForeignKey
ALTER TABLE "password_reset_tokens" DROP CONSTRAINT IF EXISTS "password_reset_tokens_user_id_fkey";
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "issue_status_history" ALTER COLUMN "changed_by" DROP NOT NULL;
