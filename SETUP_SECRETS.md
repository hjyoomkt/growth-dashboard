# Supabase Secrets 설정 방법

## 1. Supabase CLI로 Secret 등록

터미널에서 실행:

```bash
cd /Users/reon/Desktop/개발/growth-dashboard

# Supabase URL 설정
npx supabase secrets set SUPABASE_URL=https://qdzdyoqtzkfpcogecyar.supabase.co

# Service Role Key 설정
npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkemR5b3F0emtmcGNvZ2VjeWFyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzExMDk1MywiZXhwIjoyMDgyNjg2OTUzfQ.Y-a9F6IbUqlt51IvA--R6Gq8ZmP-XUCpO1zzFy1ud-0
```

## 2. 그 다음 DEPLOY_SCHEDULER_SIMPLE.sql 실행

일단 간단하게 하드코딩 버전을 사용하세요.
새 브랜드 추가 시 URL만 바꾸면 됩니다.
