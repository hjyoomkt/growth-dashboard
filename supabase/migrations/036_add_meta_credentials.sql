-- ============================================================================
-- Migration 036: organizations 테이블에 Meta 자격증명 컬럼 추가
-- 목적: 조직 단위로 Meta API 자격증명 암호화 저장
-- 작성일: 2026-01-23
-- ============================================================================

-- 1. organizations 테이블에 Meta 자격증명 컬럼 추가
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS meta_app_id_encrypted TEXT,
ADD COLUMN IF NOT EXISTS meta_app_secret_encrypted TEXT,
ADD COLUMN IF NOT EXISTS meta_access_token_encrypted TEXT;

-- 2. 컬럼 주석 추가
COMMENT ON COLUMN organizations.meta_app_id_encrypted IS 'Meta App ID (PGP 암호화, 선택사항)';
COMMENT ON COLUMN organizations.meta_app_secret_encrypted IS 'Meta App Secret (PGP 암호화, 선택사항)';
COMMENT ON COLUMN organizations.meta_access_token_encrypted IS 'Meta Long-lived User Access Token (PGP 암호화, 필수)';

-- ============================================================================
-- 완료
-- ============================================================================
