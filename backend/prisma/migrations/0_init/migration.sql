-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "postgis";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('CITIZEN', 'INSTITUTION_OFFICER', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "Category" AS ENUM ('WATER_SANITATION', 'TRANSPORTATION', 'ENVIRONMENT', 'INFRASTRUCTURE', 'SECURITY', 'LIGHTING', 'PARKS');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "IssueStatus" AS ENUM ('OPEN', 'IN_REVIEW', 'RESOLVED', 'REJECTED');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'CITIZEN',
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "tc_kimlik_hash" VARCHAR(64),
    "first_name" VARCHAR(100),
    "last_name" VARCHAR(100),
    "birth_year" INTEGER,
    "institution_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "token" VARCHAR(512) NOT NULL,
    "user_id" UUID NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "institutions" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "name" VARCHAR(255) NOT NULL,
    "city" VARCHAR(100) NOT NULL,
    "district" VARCHAR(100) NOT NULL,
    "webhook_url" VARCHAR(500),
    "email_address" VARCHAR(255) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "boundary" geometry(MULTIPOLYGON, 4326),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "institutions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "issues" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT NOT NULL,
    "category" "Category" NOT NULL,
    "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
    "status" "IssueStatus" NOT NULL DEFAULT 'OPEN',
    "location" geometry(POINT, 4326) NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "city" VARCHAR(100) NOT NULL,
    "district" VARCHAR(100) NOT NULL,
    "address" VARCHAR(500),
    "image_url" VARCHAR(500),
    "image_key" VARCHAR(500),
    "image_blurred" BOOLEAN NOT NULL DEFAULT false,
    "image_processed" BOOLEAN NOT NULL DEFAULT false,
    "exif_latitude" DOUBLE PRECISION,
    "exif_longitude" DOUBLE PRECISION,
    "exif_verified" BOOLEAN NOT NULL DEFAULT false,
    "exif_distance" DOUBLE PRECISION,
    "llm_guard_passed" BOOLEAN NOT NULL DEFAULT false,
    "llm_guard_reason" VARCHAR(500),
    "ip_address" VARCHAR(45) NOT NULL,
    "user_agent" VARCHAR(500),
    "reported_by_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "resolved_at" TIMESTAMP(3),

    CONSTRAINT "issues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "issue_status_history" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "issue_id" UUID NOT NULL,
    "from_status" "IssueStatus" NOT NULL,
    "to_status" "IssueStatus" NOT NULL,
    "changed_by" UUID NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "issue_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "issue_upvotes" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "issue_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "issue_upvotes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_institution_id_idx" ON "users"("institution_id");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_token_idx" ON "refresh_tokens"("token");

-- CreateIndex
CREATE INDEX "institutions_city_district_idx" ON "institutions"("city", "district");

-- CreateIndex
CREATE INDEX "issues_status_idx" ON "issues"("status");

-- CreateIndex
CREATE INDEX "issues_category_idx" ON "issues"("category");

-- CreateIndex
CREATE INDEX "issues_city_district_idx" ON "issues"("city", "district");

-- CreateIndex
CREATE INDEX "issues_created_at_idx" ON "issues"("created_at" DESC);

-- CreateIndex
CREATE INDEX "issues_reported_by_id_idx" ON "issues"("reported_by_id");

-- CreateIndex
CREATE INDEX "issue_status_history_issue_id_idx" ON "issue_status_history"("issue_id");

-- CreateIndex
CREATE UNIQUE INDEX "issue_upvotes_issue_id_user_id_key" ON "issue_upvotes"("issue_id", "user_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "institutions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issues" ADD CONSTRAINT "issues_reported_by_id_fkey" FOREIGN KEY ("reported_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issue_status_history" ADD CONSTRAINT "issue_status_history_issue_id_fkey" FOREIGN KEY ("issue_id") REFERENCES "issues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issue_upvotes" ADD CONSTRAINT "issue_upvotes_issue_id_fkey" FOREIGN KEY ("issue_id") REFERENCES "issues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issue_upvotes" ADD CONSTRAINT "issue_upvotes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

