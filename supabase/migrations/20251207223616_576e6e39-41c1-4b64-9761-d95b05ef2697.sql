-- Add password_added column to track if Google-only users have added email/password login
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_added boolean DEFAULT false;

COMMENT ON COLUMN users.password_added IS 'Tracks if a Google-only user has added email/password login';