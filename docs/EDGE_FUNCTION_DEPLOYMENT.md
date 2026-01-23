# Edge Function 배포 가이드

## 📌 개요

Supabase Edge Function을 배포하는 방법을 정리한 문서입니다.
Claude가 배포를 못하는 경우 이 방법을 사용하세요.

---

## 🚀 배포 방법

### 1. 기본 배포 명령어

```bash
export SUPABASE_ACCESS_TOKEN=your_access_token
cd "프로젝트경로"
npx supabase functions deploy 함수명 --project-ref 프로젝트ref
```

### 2. JWT 검증 비활성화 배포 (권장)

**중요**: `list-google-customers`, `resolve-access-token` 등 기존 함수들처럼 JWT 검증을 비활성화해야 합니다.

```bash
export SUPABASE_ACCESS_TOKEN=your_access_token
cd "프로젝트경로"
npx supabase functions deploy 함수명 --project-ref 프로젝트ref --no-verify-jwt
```

---

## 🔑 필수 정보

### 프로젝트 정보
- **Project Ref**: `qdzdyoqtzkfpcogecyar`
- **Supabase URL**: `https://qdzdyoqtzkfpcogecyar.supabase.co`

### Access Token 발급
1. https://supabase.com/dashboard/account/tokens 접속
2. "Generate new token" 클릭
3. 토큰 이름 입력 (예: "Edge Function Deployment")
4. 토큰 복사 (한 번만 표시됨)

---

## 📝 실제 배포 예시

### Meta Ads 함수 배포 (2026-01-23 성공)

#### save-organization-meta
```bash
export SUPABASE_ACCESS_TOKEN=sbp_507568768c17cc2b90937e8261913753809b6d39
cd "c:\Users\REON\Desktop\새 폴더\growth-dashboard"
npx supabase functions deploy save-organization-meta --project-ref qdzdyoqtzkfpcogecyar --no-verify-jwt
```

**출력**:
```
Deployed Functions on project qdzdyoqtzkfpcogecyar: save-organization-meta
You can inspect your deployment in the Dashboard: https://supabase.com/dashboard/project/qdzdyoqtzkfpcogecyar/functions
WARNING: Docker is not running
Uploading asset (save-organization-meta): supabase/functions/save-organization-meta/index.ts
```

#### list-meta-adaccounts
```bash
export SUPABASE_ACCESS_TOKEN=sbp_507568768c17cc2b90937e8261913753809b6d39
cd "c:\Users\REON\Desktop\새 폴더\growth-dashboard"
npx supabase functions deploy list-meta-adaccounts --project-ref qdzdyoqtzkfpcogecyar --no-verify-jwt
```

---

## ⚠️ 트러블슈팅

### 문제 1: "Unauthorized" 에러

**증상**:
```
unexpected deploy status 401: {"message":"Unauthorized"}
```

**원인**:
1. Access Token이 만료됨
2. Windows에서 `set` 명령어 사용 (bash에서는 `export` 사용)

**해결**:
```bash
# ❌ 잘못된 방법 (Windows CMD 명령어)
set SUPABASE_ACCESS_TOKEN=token
npx supabase functions deploy ...

# ✅ 올바른 방법 (bash 명령어)
export SUPABASE_ACCESS_TOKEN=token
npx supabase functions deploy ...
```

### 문제 2: "unknown flag: --token" 에러

**증상**:
```
unknown flag: --token
```

**원인**: `--token` 플래그는 존재하지 않음

**해결**: 환경변수 사용
```bash
export SUPABASE_ACCESS_TOKEN=token
npx supabase functions deploy ...
```

### 문제 3: Docker 경고

**증상**:
```
WARNING: Docker is not running
```

**영향**: 배포는 정상 진행됨 (경고 무시 가능)

---

## 🔄 다른 Claude에게 전달할 배포 방법

### 짧은 버전 (채팅창에 붙여넣기)

```
Edge Function 배포 방법:

1. Access Token 발급: https://supabase.com/dashboard/account/tokens

2. 배포 명령어:
export SUPABASE_ACCESS_TOKEN=발급받은토큰
cd "c:\Users\REON\Desktop\새 폴더\growth-dashboard"
npx supabase functions deploy 함수명 --project-ref qdzdyoqtzkfpcogecyar --no-verify-jwt

중요:
- Windows 환경에서 bash 사용 시 export 명령어 사용 (set 아님)
- --no-verify-jwt 플래그 필수 (기존 함수들과 동일)
- Project Ref: qdzdyoqtzkfpcogecyar
```

### 상세 버전

```markdown
# Supabase Edge Function 배포 가이드

## 환경
- 프로젝트: growth-dashboard
- Project Ref: qdzdyoqtzkfpcogecyar
- 작업 디렉토리: c:\Users\REON\Desktop\새 폴더\growth-dashboard

## 배포 순서

### 1단계: Access Token 준비
https://supabase.com/dashboard/account/tokens 에서 새 토큰 발급

### 2단계: 환경변수 설정
```bash
export SUPABASE_ACCESS_TOKEN=your_token_here
```

**주의**: Windows Git Bash에서는 `export` 사용 (CMD의 `set`이 아님)

### 3단계: 배포 실행
```bash
cd "c:\Users\REON\Desktop\새 폴더\growth-dashboard"
npx supabase functions deploy 함수명 --project-ref qdzdyoqtzkfpcogecyar --no-verify-jwt
```

**필수 플래그**: `--no-verify-jwt` (기존 함수들과 일관성 유지)

### 4단계: 배포 확인
- 성공 메시지: "Deployed Functions on project qdzdyoqtzkfpcogecyar: 함수명"
- 대시보드: https://supabase.com/dashboard/project/qdzdyoqtzkfpcogecyar/functions

## 실전 예시 (Meta Ads)

```bash
# 1. 토큰 설정
export SUPABASE_ACCESS_TOKEN=sbp_xxxxxxxxxxxxxxxxx

# 2. save-organization-meta 배포
npx supabase functions deploy save-organization-meta \
  --project-ref qdzdyoqtzkfpcogecyar \
  --no-verify-jwt

# 3. list-meta-adaccounts 배포
npx supabase functions deploy list-meta-adaccounts \
  --project-ref qdzdyoqtzkfpcogecyar \
  --no-verify-jwt
```

## 트러블슈팅

### Unauthorized 에러
- 토큰 재발급 필요
- `export` 명령어 사용 확인

### unknown flag: --token
- `--token` 플래그 사용하지 말 것
- 대신 환경변수 `export SUPABASE_ACCESS_TOKEN` 사용

### Docker 경고
- 무시 가능 (배포는 정상 진행)
```

---

## 📋 배포 체크리스트

### 배포 전
- [ ] Access Token 발급 완료
- [ ] 함수 코드 작성 완료 (`supabase/functions/함수명/index.ts`)
- [ ] Project Ref 확인: `qdzdyoqtzkfpcogecyar`

### 배포 시
- [ ] `export SUPABASE_ACCESS_TOKEN` 실행
- [ ] `--no-verify-jwt` 플래그 포함
- [ ] 작업 디렉토리 확인

### 배포 후
- [ ] 성공 메시지 확인
- [ ] 대시보드에서 함수 존재 확인
- [ ] 함수 테스트 (curl 또는 프론트엔드)

---

## 🎯 핵심 포인트

### 1. 환경변수 설정 (Windows Git Bash)
```bash
export SUPABASE_ACCESS_TOKEN=token  # ✅ 올바름
set SUPABASE_ACCESS_TOKEN=token     # ❌ 작동 안 됨
```

### 2. JWT 검증 비활성화 필수
```bash
--no-verify-jwt  # 기존 함수들과 동일하게 설정
```

### 3. 한 줄 명령어 (복사/붙여넣기 용)
```bash
export SUPABASE_ACCESS_TOKEN=토큰 && cd "c:\Users\REON\Desktop\새 폴더\growth-dashboard" && npx supabase functions deploy 함수명 --project-ref qdzdyoqtzkfpcogecyar --no-verify-jwt
```

---

## 📚 참고 링크

- **Supabase 함수 대시보드**: https://supabase.com/dashboard/project/qdzdyoqtzkfpcogecyar/functions
- **토큰 관리**: https://supabase.com/dashboard/account/tokens
- **Supabase CLI 문서**: https://supabase.com/docs/reference/cli

---

**최종 업데이트**: 2026-01-23
**작성자**: Claude Code
**검증됨**: Meta Ads 함수 배포 성공
