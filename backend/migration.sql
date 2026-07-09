CREATE TABLE system_prompts (
  id UUID NOT NULL DEFAULT uuid_generate_v4(),
  key VARCHAR(100) NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  content TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT system_prompts_pkey PRIMARY KEY (id)
);
CREATE UNIQUE INDEX system_prompts_key_version_key ON system_prompts(key, version);
CREATE INDEX system_prompts_key_is_active_idx ON system_prompts(key, is_active);
