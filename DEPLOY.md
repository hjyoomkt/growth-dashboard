# Supabase Edge Functions 배포 가이드

## 프로젝트 정보
- **Project Ref**: `qdzdyoqtzkfpcogecyar`
- **Project URL**: `https://qdzdyoqtzkfpcogecyar.supabase.co`

## 배포 방법

### 전체 함수 배포
```bash
cd "c:\Users\REON\Desktop\새 폴더\growth-dashboard"
SUPABASE_ACCESS_TOKEN=[YOUR_ACCESS_TOKEN] npx supabase@latest functions deploy --project-ref qdzdyoqtzkfpcogecyar
```

### 특정 함수만 배포
```bash
cd "c:\Users\REON\Desktop\새 폴더\growth-dashboard"
SUPABASE_ACCESS_TOKEN=[YOUR_ACCESS_TOKEN] npx supabase@latest functions deploy [함수명] --project-ref qdzdyoqtzkfpcogecyar
```

## 주요 함수 목록

### 데이터 수집 관련
- `daily-scheduler` - 매일 자동 데이터 수집 스케줄러 (cron 트리거)
- `collection-worker` - 수집 큐 처리 워커
- `collect-ad-data` - 광고 데이터 수집 메인 함수
- `initial-collection` - 초기 데이터 수집

### OAuth 관련
- `oauth-initiate` - OAuth 인증 시작
- `oauth-callback` - OAuth 콜백 처리
- `resolve-access-token` - 액세스 토큰 갱신

### 플랫폼별 설정
- `save-organization-gcp` - Google Ads 조직 설정 저장
- `save-organization-meta` - Meta Ads 조직 설정 저장
- `save-organization-naver` - Naver Ads 조직 설정 저장
- `list-google-customers` - Google Ads 고객 목록 조회
- `list-meta-adaccounts` - Meta 광고 계정 목록 조회

### 기타
- `send-invite-email` - 초대 이메일 발송
- `send-password-reset-email` - 비밀번호 재설정 이메일 발송
- `vault-store-secrets` - Vault에 시크릿 저장
- `google-conversion-actions` - Google 전환 액션 조회

## 배포 예시

### daily-scheduler 배포 (가장 자주 수정되는 함수)
```bash
SUPABASE_ACCESS_TOKEN=[YOUR_ACCESS_TOKEN] npx supabase@latest functions deploy daily-scheduler --project-ref qdzdyoqtzkfpcogecyar
```

### collect-ad-data 배포
```bash
SUPABASE_ACCESS_TOKEN=[YOUR_ACCESS_TOKEN] npx supabase@latest functions deploy collect-ad-data --project-ref qdzdyoqtzkfpcogecyar
```

## 주의사항

1. **액세스 토큰**은 Supabase Dashboard > Settings > API에서 발급받을 수 있습니다
2. 토큰은 절대 Git에 커밋하지 마세요
3. `npx`를 사용하므로 Supabase CLI를 별도로 설치할 필요 없습니다
4. 배포 후 Supabase Dashboard에서 로그를 확인하세요

## 배포 확인

배포 완료 후:
1. Supabase Dashboard > Edge Functions에서 함수 버전 확인
2. Logs 탭에서 에러 확인
3. Invoke 기능으로 수동 테스트

## Claude Code에게 배포 요청하기

```
"DEPLOY.md 보고 [함수명] 배포해줘
토큰: [YOUR_ACCESS_TOKEN]"
```

또는

```
"daily-scheduler 배포
프로젝트: qdzdyoqtzkfpcogecyar
토큰: [YOUR_ACCESS_TOKEN]"
```
