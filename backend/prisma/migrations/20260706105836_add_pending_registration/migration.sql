-- CreateTable

-- CreateTable
CREATE TABLE "pending_registrations" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "tc_kimlik_hash" VARCHAR(64) NOT NULL,
    "phone" VARCHAR(20),
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100) NOT NULL,
    "birth_year" INTEGER NOT NULL,
    "email_verify_code" VARCHAR(10) NOT NULL,
    "sms_verify_code" VARCHAR(10) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pending_registrations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pending_registrations_email_key" ON "pending_registrations"("email");

-- CreateIndex
CREATE INDEX "pending_registrations_email_idx" ON "pending_registrations"("email");

-- CreateIndex
CREATE INDEX "pending_registrations_tc_kimlik_hash_idx" ON "pending_registrations"("tc_kimlik_hash");

-- CreateIndex
CREATE INDEX "pending_registrations_phone_idx" ON "pending_registrations"("phone");
