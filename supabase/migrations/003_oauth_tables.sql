-- ============================================================================
-- Phase 2: OAuth Tables Setup
-- 목적: OAuth 지원 테이블 생성 (oauth_enabled = false 기본값 유지)
-- 작성일: 2026-01-12
-- ============================================================================

-- ============================================================================
-- 1. platform_configs 테이블 생성
-- 목적: 플랫폼별 설정 중앙화 (API 버전, OAuth 설정, 청크 크기)
-- ============================================================================
CREATE TABLE IF NOT EXISTS platform_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL UNIQUE, -- 'Meta Ads', 'Google Ads', 'Naver Ads'
  api_version TEXT NOT NULL, -- 'v24.0', 'v22', 'v1' 등
  oauth_enabled BOOLEAN NOT NULL DEFAULT false, -- OAuth 활성화 여부
  oauth_client_id_vault_id UUID, -- Vault에 저장된 OAuth Client ID
  oauth_scopes TEXT[], -- OAuth 권한 범위
  chunk_size_days INTEGER NOT NULL, -- 호출 단위 (90일, 30일)
  demographics_chunk_size_days INTEGER, -- Demographics 전용 청크 크기 (Meta만 60일)
  rate_limit_delay_ms INTEGER NOT NULL DEFAULT 1000, -- Rate Limit 대기 시간 (ms)
  max_retry_attempts INTEGER NOT NULL DEFAULT 3, -- 최대 재시도 횟수
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 초기 데이터 INSERT
INSERT INTO platform_configs (platform, api_version, oauth_enabled, chunk_size_days, demographics_chunk_size_days, rate_limit_delay_ms, max_retry_attempts)
VALUES
  ('Meta Ads', 'v24.0', false, 90, 60, 1000, 3),
  ('Google Ads', 'v22', false, 90, NULL, 1000, 3),
  ('Naver Ads', 'v1', false, 30, NULL, 2000, 3)
ON CONFLICT (platform) DO NOTHING;

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_platform_configs_platform ON platform_configs(platform);

COMMENT ON TABLE platform_configs IS '플랫폼별 설정 중앙화 테이블 (API 버전, OAuth, 청크 크기)';
COMMENT ON COLUMN platform_configs.oauth_enabled IS 'OAuth 활성화 여부 (기본값 false)';
COMMENT ON COLUMN platform_configs.chunk_size_days IS '일반 데이터 호출 단위 (Meta/Google: 90일, Naver: 30일)';
COMMENT ON COLUMN platform_configs.demographics_chunk_size_days IS 'Meta Demographics 전용 청크 크기 (60일, 13개월 제한 회피)';

-- ============================================================================
-- 2. collection_jobs 테이블 생성
-- 목적: 데이터 수집 작업 로그 및 진행 상황 추적
-- ============================================================================
CREATE TABLE IF NOT EXISTS collection_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id UUID NOT NULL REFERENCES advertisers(id) ON DELETE CASCADE,
  platform TEXT NOT NULL, -- 'Meta Ads', 'Google Ads', 'Naver Ads'
  collection_type TEXT NOT NULL, -- 'ads', 'demographics', 'creatives', 'daily'
  collection_date DATE, -- 수집 대상 날짜 (daily 모드에서 사용)
  start_date DATE, -- 수집 시작 날짜 (initial 모드)
  end_date DATE, -- 수집 종료 날짜 (initial 모드)
  mode TEXT NOT NULL, -- 'initial', 'daily'
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed', 'partial'
  chunks_total INTEGER DEFAULT 0, -- 전체 청크 수
  chunks_completed INTEGER DEFAULT 0, -- 완료된 청크 수
  chunks_failed INTEGER DEFAULT 0, -- 실패한 청크 수
  error_message TEXT, -- 에러 메시지
  error_details JSONB, -- 상세 에러 정보
  started_at TIMESTAMPTZ, -- 시작 시간
  completed_at TIMESTAMPTZ, -- 완료 시간
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT valid_status CHECK (status IN ('pending', 'running', 'completed', 'failed', 'partial')),
  CONSTRAINT valid_mode CHECK (mode IN ('initial', 'daily')),
  CONSTRAINT valid_collection_type CHECK (collection_type IN ('ads', 'demographics', 'creatives', 'daily'))
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_collection_jobs_advertiser ON collection_jobs(advertiser_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_collection_jobs_status ON collection_jobs(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_collection_jobs_platform ON collection_jobs(platform, created_at DESC);

-- RLS 정책 (브랜드별 격리)
ALTER TABLE collection_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_own_brand_collection_jobs"
ON collection_jobs FOR SELECT
TO authenticated
USING (advertiser_id IN (SELECT get_user_advertiser_ids(auth.email())));

CREATE POLICY "service_role_all_collection_jobs"
ON collection_jobs FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

COMMENT ON TABLE collection_jobs IS '데이터 수집 작업 로그 및 진행 상황 추적 테이블';
COMMENT ON COLUMN collection_jobs.chunks_total IS '전체 청크 수 (90일/30일 단위 분할)';
COMMENT ON COLUMN collection_jobs.chunks_completed IS '완료된 청크 수 (실시간 업데이트)';

-- ============================================================================
-- 3. integrations 테이블 생성
-- 목적: Token/OAuth 통합 테이블 (향후 api_tokens 대체)
-- ============================================================================
CREATE TABLE IF NOT EXISTS integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id UUID NOT NULL REFERENCES advertisers(id) ON DELETE CASCADE,
  platform TEXT NOT NULL, -- 'Meta Ads', 'Google Ads', 'Naver Ads'
  integration_type TEXT NOT NULL, -- 'token', 'oauth'
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'inactive', 'expired'

  -- Token 필드 (api_tokens 호환)
  legacy_access_token_vault_id UUID, -- Vault ID (Meta/Naver)
  legacy_refresh_token_vault_id UUID, -- Vault ID (Google)
  legacy_developer_token_vault_id UUID, -- Vault ID (Google)
  legacy_client_id TEXT, -- Google Client ID
  legacy_client_secret_vault_id UUID, -- Vault ID (Google)
  legacy_customer_id TEXT, -- Google Customer ID
  legacy_manager_account_id TEXT, -- Google Manager Account ID
  legacy_account_id TEXT, -- Meta/Naver Account ID
  legacy_secret_key_vault_id UUID, -- Vault ID (Naver)
  legacy_target_conversion_action_id TEXT[], -- Google 전환 액션 ID 배열

  -- OAuth 필드
  oauth_state TEXT, -- OAuth 상태 (진행 중인 인증)
  oauth_access_token_vault_id UUID, -- Vault ID (OAuth Access Token)
  oauth_refresh_token_vault_id UUID, -- Vault ID (OAuth Refresh Token)
  oauth_token_expires_at TIMESTAMPTZ, -- 토큰 만료 시간

  -- 공통 필드
  data_collection_status TEXT, -- 'pending', 'success', 'error', 'partial'
  last_collection_at TIMESTAMPTZ, -- 마지막 수집 시간
  last_error TEXT, -- 마지막 에러 메시지
  additional_credentials JSONB, -- 추가 인증 정보

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,

  CONSTRAINT valid_integration_type CHECK (integration_type IN ('token', 'oauth')),
  CONSTRAINT valid_status CHECK (status IN ('active', 'inactive', 'expired')),
  CONSTRAINT valid_data_collection_status CHECK (data_collection_status IN ('pending', 'success', 'error', 'partial'))
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_integrations_advertiser ON integrations(advertiser_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_integrations_platform ON integrations(platform) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_integrations_status ON integrations(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_integrations_type ON integrations(integration_type) WHERE deleted_at IS NULL;

-- RLS 정책 (브랜드별 격리)
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_own_brand_integrations"
ON integrations FOR SELECT
TO authenticated
USING (advertiser_id IN (SELECT get_user_advertiser_ids(auth.email())) AND deleted_at IS NULL);

CREATE POLICY "users_insert_own_brand_integrations"
ON integrations FOR INSERT
TO authenticated
WITH CHECK (advertiser_id IN (SELECT get_user_advertiser_ids(auth.email())));

CREATE POLICY "users_update_own_brand_integrations"
ON integrations FOR UPDATE
TO authenticated
USING (advertiser_id IN (SELECT get_user_advertiser_ids(auth.email())) AND deleted_at IS NULL)
WITH CHECK (advertiser_id IN (SELECT get_user_advertiser_ids(auth.email())));

CREATE POLICY "service_role_all_integrations"
ON integrations FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

COMMENT ON TABLE integrations IS 'Token/OAuth 통합 테이블 (향후 api_tokens 대체)';
COMMENT ON COLUMN integrations.integration_type IS 'token: 수동 토큰 입력, oauth: OAuth 2.0 연동';
COMMENT ON COLUMN integrations.oauth_token_expires_at IS 'OAuth 토큰 만료 시간 (5분 버퍼로 자동 갱신)';

-- ============================================================================
-- 4. ad_accounts 테이블 생성
-- 목적: OAuth 계정 메타데이터 (account_name, currency, timezone 등)
-- ============================================================================
CREATE TABLE IF NOT EXISTS ad_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
  external_account_id TEXT NOT NULL, -- 외부 플랫폼 Account ID
  account_name TEXT NOT NULL, -- 계정 이름
  currency TEXT, -- 통화 (USD, KRW 등)
  timezone TEXT, -- 타임존
  account_status TEXT, -- 계정 상태 (active, paused 등)
  additional_metadata JSONB, -- 추가 메타데이터
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(integration_id, external_account_id)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_ad_accounts_integration ON ad_accounts(integration_id);
CREATE INDEX IF NOT EXISTS idx_ad_accounts_external_id ON ad_accounts(external_account_id);

-- RLS 정책 (integrations를 통한 간접 권한)
ALTER TABLE ad_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_own_brand_ad_accounts"
ON ad_accounts FOR SELECT
TO authenticated
USING (
  integration_id IN (
    SELECT id FROM integrations
    WHERE advertiser_id IN (SELECT get_user_advertiser_ids(auth.email()))
    AND deleted_at IS NULL
  )
);

CREATE POLICY "service_role_all_ad_accounts"
ON ad_accounts FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

COMMENT ON TABLE ad_accounts IS 'OAuth 계정 메타데이터 (계정명, 통화, 타임존 등)';

-- ============================================================================
-- 5. oauth_authorization_sessions 테이블 생성
-- 목적: OAuth 플로우 추적 (CSRF 방지용 state_token, PKCE용 code_verifier)
-- ============================================================================
CREATE TABLE IF NOT EXISTS oauth_authorization_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id UUID NOT NULL REFERENCES advertisers(id) ON DELETE CASCADE,
  platform TEXT NOT NULL, -- 'Meta Ads', 'Google Ads'
  state_token TEXT NOT NULL UNIQUE, -- CSRF 방지용 (crypto.randomUUID())
  code_verifier TEXT, -- PKCE용 (Google OAuth)
  code_challenge TEXT, -- PKCE용 (Google OAuth)
  redirect_uri TEXT NOT NULL, -- OAuth 콜백 URI
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'completed', 'failed', 'expired'
  error_message TEXT, -- 실패 시 에러 메시지
  expires_at TIMESTAMPTZ NOT NULL, -- 15분 만료
  completed_at TIMESTAMPTZ, -- 완료 시간
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT valid_status CHECK (status IN ('pending', 'completed', 'failed', 'expired'))
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_oauth_sessions_state_token ON oauth_authorization_sessions(state_token) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_oauth_sessions_expires_at ON oauth_authorization_sessions(expires_at) WHERE status = 'pending';

-- RLS 정책 (브랜드별 격리)
ALTER TABLE oauth_authorization_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_own_brand_oauth_sessions"
ON oauth_authorization_sessions FOR SELECT
TO authenticated
USING (advertiser_id IN (SELECT get_user_advertiser_ids(auth.email())));

CREATE POLICY "service_role_all_oauth_sessions"
ON oauth_authorization_sessions FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

COMMENT ON TABLE oauth_authorization_sessions IS 'OAuth 플로우 추적 테이블 (15분 만료, CSRF/PKCE 지원)';
COMMENT ON COLUMN oauth_authorization_sessions.state_token IS 'CSRF 방지용 랜덤 토큰';
COMMENT ON COLUMN oauth_authorization_sessions.code_verifier IS 'PKCE용 Code Verifier (Google OAuth)';

-- ============================================================================
-- 6. ad_performance_demographics 테이블 생성
-- 목적: Meta Ads 계정 레벨 성별/연령대 집계
-- ============================================================================
CREATE TABLE IF NOT EXISTS ad_performance_demographics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id UUID NOT NULL REFERENCES advertisers(id) ON DELETE CASCADE,
  source TEXT NOT NULL, -- 'Meta'
  date DATE NOT NULL,
  gender TEXT, -- 'male', 'female', 'unknown'
  age TEXT, -- '18-24', '25-34', '35-44', '45-54', '55-64', '65+'
  impressions BIGINT DEFAULT 0,
  clicks BIGINT DEFAULT 0,
  cost NUMERIC(20,2) DEFAULT 0,
  conversions NUMERIC(10,2) DEFAULT 0,
  conversion_value NUMERIC(20,2) DEFAULT 0,
  add_to_cart INTEGER DEFAULT 0,
  add_to_cart_value NUMERIC(20,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(advertiser_id, source, date, gender, age)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_demographics_lookup
ON ad_performance_demographics(advertiser_id, date DESC, source);

CREATE INDEX IF NOT EXISTS idx_demographics_gender_age
ON ad_performance_demographics(gender, age) WHERE gender IS NOT NULL AND age IS NOT NULL;

-- RLS 정책 (브랜드별 격리)
ALTER TABLE ad_performance_demographics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_own_brand_demographics"
ON ad_performance_demographics FOR SELECT
TO authenticated
USING (advertiser_id IN (SELECT get_user_advertiser_ids(auth.email())));

CREATE POLICY "service_role_all_demographics"
ON ad_performance_demographics FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

COMMENT ON TABLE ad_performance_demographics IS 'Meta Ads 계정 레벨 성별/연령대 집계 테이블';
COMMENT ON COLUMN ad_performance_demographics.gender IS '성별 (male, female, unknown)';
COMMENT ON COLUMN ad_performance_demographics.age IS '연령대 (18-24, 25-34, 35-44, 45-54, 55-64, 65+)';

-- ============================================================================
-- 7. cleanup_expired_oauth_sessions 함수 생성
-- 목적: 15분 만료된 OAuth 세션 자동 정리
-- ============================================================================
CREATE OR REPLACE FUNCTION cleanup_expired_oauth_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE oauth_authorization_sessions
  SET status = 'expired',
      error_message = 'Session expired after 15 minutes'
  WHERE status = 'pending'
    AND expires_at < NOW();
END;
$$;

COMMENT ON FUNCTION cleanup_expired_oauth_sessions IS '15분 만료된 OAuth 세션을 expired 상태로 변경';

-- ============================================================================
-- 8. updated_at 자동 업데이트 트리거 설정
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- platform_configs 트리거
DROP TRIGGER IF EXISTS update_platform_configs_updated_at ON platform_configs;
CREATE TRIGGER update_platform_configs_updated_at
BEFORE UPDATE ON platform_configs
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- collection_jobs 트리거
DROP TRIGGER IF EXISTS update_collection_jobs_updated_at ON collection_jobs;
CREATE TRIGGER update_collection_jobs_updated_at
BEFORE UPDATE ON collection_jobs
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- integrations 트리거
DROP TRIGGER IF EXISTS update_integrations_updated_at ON integrations;
CREATE TRIGGER update_integrations_updated_at
BEFORE UPDATE ON integrations
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ad_accounts 트리거
DROP TRIGGER IF EXISTS update_ad_accounts_updated_at ON ad_accounts;
CREATE TRIGGER update_ad_accounts_updated_at
BEFORE UPDATE ON ad_accounts
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ad_performance_demographics 트리거
DROP TRIGGER IF EXISTS update_ad_performance_demographics_updated_at ON ad_performance_demographics;
CREATE TRIGGER update_ad_performance_demographics_updated_at
BEFORE UPDATE ON ad_performance_demographics
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 완료
-- ============================================================================
