-- OTP Cleanup SQL
-- Run this in Supabase SQL Editor to remove OTP-related columns

ALTER TABLE users DROP COLUMN IF EXISTS otp;
ALTER TABLE users DROP COLUMN IF EXISTS otp_expires_at;
ALTER TABLE users DROP COLUMN IF EXISTS otp_attempts;
ALTER TABLE users DROP COLUMN IF EXISTS reset_token;
ALTER TABLE users DROP COLUMN IF EXISTS reset_token_expires;
ALTER TABLE users DROP COLUMN IF EXISTS remember_token;
ALTER TABLE users DROP COLUMN IF EXISTS login_attempts;
ALTER TABLE users DROP COLUMN IF EXISTS locked_until;
