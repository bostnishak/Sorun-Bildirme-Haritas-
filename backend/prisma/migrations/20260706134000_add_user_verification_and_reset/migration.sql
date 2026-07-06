-- AlterTable
ALTER TABLE "users" ADD COLUMN "phone" VARCHAR(20),
ADD COLUMN "email_verify_code" VARCHAR(10),
ADD COLUMN "sms_verify_code" VARCHAR(10),
ADD COLUMN "reset_password_token" VARCHAR(128),
ADD COLUMN "reset_password_expires" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "users_tc_kimlik_hash_key" ON "users"("tc_kimlik_hash");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "users_reset_password_token_key" ON "users"("reset_password_token");
