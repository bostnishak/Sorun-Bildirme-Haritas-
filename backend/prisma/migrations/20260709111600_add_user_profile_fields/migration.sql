-- AlterTable: Add phone, avatarUrl, avatarKey to users
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "phone" VARCHAR(20);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "avatar_url" VARCHAR(500);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "avatar_key" VARCHAR(500);
