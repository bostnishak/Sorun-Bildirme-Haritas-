-- AlterTable
ALTER TABLE "issues" ADD COLUMN     "upvote_count" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "users" DROP COLUMN IF EXISTS "email_verify_code",
DROP COLUMN IF EXISTS "reset_password_expires",
DROP COLUMN IF EXISTS "reset_password_token",
DROP COLUMN IF EXISTS "sms_verify_code",
ADD COLUMN IF NOT EXISTS "is_two_factor_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "two_factor_secret" VARCHAR(100);

-- DropTable
DROP TABLE IF EXISTS "password_reset_tokens" CASCADE;

-- DropTable
DROP TABLE IF EXISTS "pending_registrations" CASCADE;

-- CreateTable
CREATE TABLE IF NOT EXISTS "issue_comments" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "issue_id" UUID NOT NULL,
    "author_id" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "is_official" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "issue_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "audit_logs" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "actor_id" UUID NOT NULL,
    "action" VARCHAR(100) NOT NULL,
    "target_id" UUID,
    "target_type" VARCHAR(50),
    "details" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ai_moderation_logs" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "issue_id" UUID,
    "layer" VARCHAR(50) NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "code" VARCHAR(100) NOT NULL,
    "reason" TEXT,
    "latency_ms" INTEGER NOT NULL,
    "model" VARCHAR(50) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_moderation_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "system_prompts" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "key" VARCHAR(100) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "content" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_prompts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "issue_comments_issue_id_idx" ON "issue_comments"("issue_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "issue_comments_author_id_idx" ON "issue_comments"("author_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "audit_logs_actor_id_idx" ON "audit_logs"("actor_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "audit_logs_target_id_idx" ON "audit_logs"("target_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ai_moderation_logs_issue_id_idx" ON "ai_moderation_logs"("issue_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ai_moderation_logs_layer_idx" ON "ai_moderation_logs"("layer");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ai_moderation_logs_created_at_idx" ON "ai_moderation_logs"("created_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "system_prompts_key_is_active_idx" ON "system_prompts"("key", "is_active");

-- AddForeignKey
ALTER TABLE "issues" DROP CONSTRAINT IF EXISTS "issues_reported_by_id_fkey";
ALTER TABLE "issues" ADD CONSTRAINT "issues_reported_by_id_fkey" FOREIGN KEY ("reported_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issue_comments" DROP CONSTRAINT IF EXISTS "issue_comments_issue_id_fkey";
ALTER TABLE "issue_comments" ADD CONSTRAINT "issue_comments_issue_id_fkey" FOREIGN KEY ("issue_id") REFERENCES "issues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issue_comments" DROP CONSTRAINT IF EXISTS "issue_comments_author_id_fkey";
ALTER TABLE "issue_comments" ADD CONSTRAINT "issue_comments_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" DROP CONSTRAINT IF EXISTS "audit_logs_actor_id_fkey";
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
