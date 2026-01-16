-- Google Ads OAuth 활성화 설정
-- 이 마이그레이션은 platform_configs 테이블에서 Google Ads의 OAuth를 활성화합니다.

-- Google Ads OAuth 활성화
UPDATE platform_configs
SET
  oauth_enabled = true,
  oauth_scopes = ARRAY['https://www.googleapis.com/auth/adwords']
WHERE platform = 'Google Ads';

-- 확인용 코멘트
COMMENT ON TABLE platform_configs IS 'Google Ads OAuth 활성화됨 (2024-01)';
