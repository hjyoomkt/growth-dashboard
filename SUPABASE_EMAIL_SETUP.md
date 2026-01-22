# Supabase 이메일 설정 가이드

비밀번호 재설정 기능을 위한 Supabase 이메일 템플릿 설정 가이드입니다.

---

## 1. Supabase Dashboard 접속

1. [Supabase Dashboard](https://supabase.com/dashboard) 접속
2. 프로젝트 선택: `growth-dashboard` (또는 해당 프로젝트)

---

## 2. Site URL 설정 (필수)

**위치**: Dashboard → Settings → General → Site URL

### Development (로컬 개발)
```
Site URL: http://localhost:3000
```

### Additional Redirect URLs (개발 + 프로덕션)
```
http://localhost:3000/auth/reset-password
https://yourdomain.com/auth/reset-password
```

**중요 사항**:
- Site URL은 반드시 정확히 일치해야 합니다 (끝의 `/` 주의)
- 프로덕션 배포 시 프로덕션 도메인으로 변경 필요
- Redirect URL에 로컬 + 프로덕션 URL 모두 추가

---

## 3. 이메일 템플릿 설정

**위치**: Dashboard → Authentication → Email Templates → Reset Password

### 기본 템플릿

Supabase는 기본적으로 영문 템플릿을 제공합니다. 아래는 한글로 커스터마이징한 버전입니다.

### Subject (제목)
```
비밀번호 재설정 요청
```

### Body (본문 - HTML)
```html
<h2>비밀번호 재설정</h2>

<p>안녕하세요,</p>

<p>비밀번호 재설정 요청을 받았습니다. 아래 버튼을 클릭하여 새 비밀번호를 설정해주세요.</p>

<p style="text-align: center; margin: 30px 0;">
  <a
    href="{{ .SiteURL }}/auth/reset-password?token={{ .Token }}&type=recovery"
    style="
      background-color: #4318FF;
      color: white;
      padding: 12px 24px;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      display: inline-block;
    "
  >
    비밀번호 재설정하기
  </a>
</p>

<p style="color: #666; font-size: 14px;">
  또는 아래 링크를 복사하여 브라우저에 붙여넣으세요:<br>
  <a href="{{ .SiteURL }}/auth/reset-password?token={{ .Token }}&type=recovery">
    {{ .SiteURL }}/auth/reset-password?token={{ .Token }}&type=recovery
  </a>
</p>

<p style="color: #666; font-size: 14px; margin-top: 30px;">
  이 링크는 1시간 후에 만료됩니다.
</p>

<p style="color: #999; font-size: 12px; margin-top: 40px;">
  비밀번호 재설정을 요청하지 않으셨다면 이 이메일을 무시하셔도 됩니다.
</p>

<hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">

<p style="color: #999; font-size: 12px;">
  © 2024 Growth Dashboard. All rights reserved.
</p>
```

### 템플릿 변수 설명

Supabase가 자동으로 제공하는 변수들:

- `{{ .SiteURL }}`: Site URL에 설정한 도메인
- `{{ .Token }}`: 비밀번호 재설정 토큰
- `{{ .Email }}`: 사용자 이메일 (선택적으로 사용 가능)

---

## 4. Email Provider 설정 (선택)

### 개발 환경
- Supabase 내장 이메일 서비스 사용 (무료)
- **제한사항**: 시간당 4개 이메일까지 발송 가능
- 개발/테스트 용도로는 충분

### 프로덕션 환경 (권장)
프로덕션 환경에서는 전문 이메일 서비스 연동을 권장합니다.

**위치**: Dashboard → Settings → Auth → Email Provider

#### 옵션 1: SendGrid (추천)
```
SMTP Host: smtp.sendgrid.net
SMTP Port: 587
SMTP User: apikey
SMTP Password: [SendGrid API Key]
Sender Email: noreply@yourdomain.com
Sender Name: Growth Dashboard
```

#### 옵션 2: AWS SES
```
SMTP Host: email-smtp.us-east-1.amazonaws.com
SMTP Port: 587
SMTP User: [AWS SES Access Key]
SMTP Password: [AWS SES Secret Key]
Sender Email: noreply@yourdomain.com
Sender Name: Growth Dashboard
```

#### 옵션 3: Gmail (개발용만)
```
SMTP Host: smtp.gmail.com
SMTP Port: 587
SMTP User: your-email@gmail.com
SMTP Password: [App Password]
Sender Email: your-email@gmail.com
Sender Name: Growth Dashboard
```

**중요**: Gmail은 일일 발송 제한(500개)이 있어 프로덕션 환경에 적합하지 않습니다.

---

## 5. Rate Limiting 설정

**위치**: Dashboard → Authentication → Rate Limits

비밀번호 재설정 남용 방지를 위한 제한 설정:

```
Rate Limit: 6 requests per hour (기본값)
```

**권장 설정**:
- 시간당 6회: 일반적인 사용에 적합
- 시간당 3회: 더 엄격한 보안이 필요한 경우

---

## 6. 이메일 발송 테스트

### 로컬 환경에서 테스트

1. **개발 서버 실행**
   ```bash
   npm start
   ```

2. **비밀번호 찾기 페이지 접속**
   ```
   http://localhost:3000/auth/forgot-password
   ```

3. **등록된 이메일 입력 및 제출**

4. **이메일 수신 확인**
   - 스팸 폴더 확인
   - Supabase 내장 이메일의 경우 발송까지 1-2분 소요 가능

5. **이메일 링크 클릭**
   - `http://localhost:3000/auth/reset-password?token=...` 로 리디렉트 확인

6. **새 비밀번호 입력 및 재설정**

7. **새 비밀번호로 로그인 테스트**

---

## 7. Supabase Dashboard에서 로그 확인

### 이메일 발송 로그

**위치**: Dashboard → Logs → Database Logs

이메일 발송 성공/실패 로그 확인 가능

### Auth 로그

**위치**: Dashboard → Authentication → Users

사용자별 비밀번호 재설정 이력 확인 가능

---

## 8. 트러블슈팅

### 문제 1: 이메일이 도착하지 않음

**해결 방법**:
1. 스팸 폴더 확인
2. Supabase Dashboard → Logs에서 이메일 발송 로그 확인
3. Email Provider 설정 확인 (SMTP 정보가 정확한지)
4. Rate Limit 초과 여부 확인
5. 이메일 주소가 실제로 존재하는지 확인

### 문제 2: "Invalid or Expired Link" 에러

**해결 방법**:
1. 이메일 링크의 토큰이 만료되었을 수 있음 (기본 1시간)
2. 링크를 한 번 이상 사용했을 수 있음 (토큰은 일회용)
3. Site URL이 정확히 설정되었는지 확인
4. 비밀번호 찾기를 다시 시도

### 문제 3: 리디렉트가 작동하지 않음

**해결 방법**:
1. Supabase Dashboard → Settings → General → Redirect URLs 확인
2. `http://localhost:3000/auth/reset-password` 가 추가되어 있는지 확인
3. URL 끝에 `/`가 없는지 확인 (정확히 일치해야 함)
4. 브라우저 캐시 및 쿠키 삭제 후 재시도

### 문제 4: SMTP 연결 실패

**해결 방법**:
1. SMTP Host, Port, User, Password가 정확한지 확인
2. Email Provider의 보안 설정 확인 (2FA, App Password 등)
3. 방화벽이나 네트워크 제한 확인
4. Supabase Dashboard → Logs에서 상세 에러 메시지 확인

---

## 9. 보안 고려사항

### 토큰 만료 시간 설정

**위치**: Dashboard → Authentication → Settings → Tokens

```
JWT Expiry: 3600 seconds (1 hour) - 기본값
```

**권장**: 1시간 (3600초)
- 너무 짧으면 사용자가 불편함
- 너무 길면 보안 위험 증가

### 비밀번호 정책

**위치**: Dashboard → Authentication → Policies

```
Minimum Password Length: 8
```

**권장 정책**:
- 최소 8자 이상
- 대문자, 소문자, 숫자, 특수문자 조합 (프론트엔드에서 검증)

### HTTPS 필수

프로덕션 환경에서는 반드시 HTTPS 사용:
- Supabase는 모든 API 호출에 HTTPS 강제
- 비밀번호 재설정 링크도 HTTPS로 발송되어야 함

---

## 10. 프로덕션 배포 체크리스트

배포 전 확인 사항:

### Supabase 설정
- [ ] Site URL을 프로덕션 도메인으로 변경
- [ ] Redirect URLs에 프로덕션 URL 추가
- [ ] Email Provider를 프로덕션용으로 변경 (SendGrid, AWS SES 등)
- [ ] Rate Limits 적절히 설정
- [ ] JWT Expiry 시간 확인 (1시간 권장)

### 환경 변수
- [ ] `.env` 파일의 Supabase URL 및 Anon Key 확인
- [ ] 프로덕션 환경 변수 설정 (Vercel, Netlify 등)

### 테스트
- [ ] 프로덕션 환경에서 비밀번호 찾기 테스트
- [ ] 이메일 발송 테스트
- [ ] 비밀번호 재설정 링크 클릭 테스트
- [ ] 새 비밀번호로 로그인 테스트

### 보안
- [ ] HTTPS 인증서 적용 확인
- [ ] CORS 설정 확인 (Supabase Dashboard → API → CORS)
- [ ] RLS (Row Level Security) 정책 확인

---

## 11. 참고 자료

### Supabase 공식 문서
- [Reset Password for Email](https://supabase.com/docs/reference/javascript/auth-resetpasswordforemail)
- [Update User](https://supabase.com/docs/reference/javascript/auth-updateuser)
- [Email Templates](https://supabase.com/docs/guides/auth/auth-email-templates)
- [Custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp)

### 프로젝트 파일
- Supabase 클라이언트: `src/config/supabase.js`
- 비밀번호 찾기: `src/views/auth/forgotPassword/index.jsx`
- 비밀번호 재설정: `src/views/auth/resetPassword/index.jsx`

---

## 12. 연락처 및 지원

문제가 발생하면:
1. Supabase Dashboard의 Logs 확인
2. [Supabase Discord](https://discord.supabase.com) 커뮤니티 질문
3. [GitHub Issues](https://github.com/supabase/supabase/issues) 검색

---

**작성일**: 2024-01-22
**업데이트**: 비밀번호 재설정 기능 구축 완료
