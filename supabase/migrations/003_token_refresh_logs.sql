-- Token refresh 이벤트 추적 테이블
CREATE TABLE IF NOT EXISTS token_refresh_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  event_type TEXT NOT NULL, -- 'refresh_success', 'refresh_failed', 'token_expired'
  error_code TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_token_refresh_logs_integration
ON token_refresh_logs(integration_id, created_at DESC);

COMMENT ON TABLE token_refresh_logs IS 'OAuth 토큰 refresh 이벤트 추적용 로그 테이블';
