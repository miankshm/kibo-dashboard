CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES admins(id),
  token text NOT NULL UNIQUE,
  expires_at timestamp NOT NULL,
  used_at timestamp,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

ALTER TABLE password_reset_tokens
  ADD COLUMN IF NOT EXISTS used_at timestamp;

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_admin
  ON password_reset_tokens(user_id);