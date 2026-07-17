-- AlterTable: Add city and district to users table
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "city" VARCHAR(100);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "district" VARCHAR(100);
