-- CreateTable: password_reset_tokens
CREATE TABLE IF NOT EXISTS "password_reset_tokens" (
  "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
  "token" VARCHAR(128) NOT NULL,
  "user_id" UUID NOT NULL,
  "expires_at" TIMESTAMPTZ NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "password_reset_tokens_token_key" UNIQUE ("token"),
  CONSTRAINT "password_reset_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "idx_prt_token" ON "password_reset_tokens"("token");
CREATE INDEX IF NOT EXISTS "idx_prt_user_id" ON "password_reset_tokens"("user_id");
