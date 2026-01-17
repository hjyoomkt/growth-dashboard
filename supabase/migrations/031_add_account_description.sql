-- Add account_description column to integrations table
-- 작성일: 2026-01-17

ALTER TABLE integrations
ADD COLUMN IF NOT EXISTS account_description TEXT;

COMMENT ON COLUMN integrations.account_description IS '광고 계정 설명/메모 (같은 광고주의 여러 계정 구분용)';
