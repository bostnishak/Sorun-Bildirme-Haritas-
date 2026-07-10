

-- DropForeignKey
ALTER TABLE "issues" DROP CONSTRAINT "issues_reported_by_id_fkey";

-- DropForeignKey
ALTER TABLE "password_reset_tokens" DROP CONSTRAINT "password_reset_tokens_user_id_fkey";

-- DropIndex
DROP INDEX "institutions_boundary_gist_idx";

-- DropIndex
DROP INDEX "issues_city_district_status_idx";

-- DropIndex
DROP INDEX "issues_description_trgm_idx";

-- DropIndex
DROP INDEX "issues_location_gist_idx";

-- DropIndex
DROP INDEX "issues_status_created_idx";

-- DropIndex
DROP INDEX "issues_title_trgm_idx";

-- DropIndex
DROP INDEX "users_phone_key";

-- DropIndex
DROP INDEX "users_reset_password_token_key";

-- DropIndex
DROP INDEX "users_tc_kimlik_hash_key";

-- AlterTable
ALTER TABLE "issue_status_history" ALTER COLUMN "changed_by" DROP NOT NULL;

-- AlterTable
ALTER TABLE "password_reset_tokens" ALTER COLUMN "token" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "expires_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "users" DROP COLUMN "email_verify_code",
DROP COLUMN "reset_password_expires",
DROP COLUMN "reset_password_token",
DROP COLUMN "sms_verify_code",
ADD COLUMN     "is_two_factor_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "two_factor_secret" VARCHAR(100);

-- DropTable
DROP TABLE "pending_registrations";

-- CreateTable
CREATE TABLE "issue_comments" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "issue_id" UUID NOT NULL,
    "author_id" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "is_official" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "issue_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
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
CREATE TABLE "ai_moderation_logs" (
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
CREATE TABLE "system_prompts" (
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
CREATE INDEX "issue_comments_issue_id_idx" ON "issue_comments"("issue_id");

-- CreateIndex
CREATE INDEX "issue_comments_author_id_idx" ON "issue_comments"("author_id");

-- CreateIndex
CREATE INDEX "audit_logs_actor_id_idx" ON "audit_logs"("actor_id");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_target_id_idx" ON "audit_logs"("target_id");

-- CreateIndex
CREATE INDEX "ai_moderation_logs_issue_id_idx" ON "ai_moderation_logs"("issue_id");

-- CreateIndex
CREATE INDEX "ai_moderation_logs_layer_idx" ON "ai_moderation_logs"("layer");

-- CreateIndex
CREATE INDEX "ai_moderation_logs_created_at_idx" ON "ai_moderation_logs"("created_at");

-- CreateIndex
CREATE INDEX "system_prompts_key_is_active_idx" ON "system_prompts"("key", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "system_prompts_key_version_key" ON "system_prompts"("key", "version");

-- AddForeignKey
ALTER TABLE "issues" ADD CONSTRAINT "issues_reported_by_id_fkey" FOREIGN KEY ("reported_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issue_status_history" ADD CONSTRAINT "issue_status_history_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issue_comments" ADD CONSTRAINT "issue_comments_issue_id_fkey" FOREIGN KEY ("issue_id") REFERENCES "issues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issue_comments" ADD CONSTRAINT "issue_comments_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "idx_prt_token" RENAME TO "password_reset_tokens_token_idx";

-- RenameIndex
ALTER INDEX "idx_prt_user_id" RENAME TO "password_reset_tokens_user_id_idx";

