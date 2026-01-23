-- Add Naver Ads credentials columns to organizations table
-- 작성일: 2026-01-24
-- 목적: 조직 레벨에서 네이버 광고 API Key와 Secret Key를 암호화하여 저장

ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS naver_api_key_encrypted TEXT,
ADD COLUMN IF NOT EXISTS naver_secret_key_encrypted TEXT;

COMMENT ON COLUMN organizations.naver_api_key_encrypted IS '네이버 광고 API Key (pgcrypto 암호화)';
COMMENT ON COLUMN organizations.naver_secret_key_encrypted IS '네이버 광고 Secret Key (pgcrypto 암호화)';
