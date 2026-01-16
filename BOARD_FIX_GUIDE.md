# 게시판 작성 및 표시 문제 해결 가이드

## 문제점
1. 게시판에 글을 작성했지만 아무것도 표시되지 않음
2. 게시글 작성 후 목록에 나타나지 않음
3. 프로필 게시판 알림에도 글이 올라오지 않음

## 원인
Supabase RLS (Row Level Security) 정책에서 `auth.role()` 함수를 잘못 사용하여:
- 인증된 사용자가 게시글을 **조회**할 수 없음
- 관리자가 게시글을 **작성**할 수 없음

## 해결 방법

### 1단계: RLS 정책 수정 (필수) ⚠️

Supabase 대시보드에서 다음 SQL을 **반드시 실행**하세요:

```sql
-- 1. SELECT 정책: 기존 정책 삭제 및 새로 생성
DROP POLICY IF EXISTS "Anyone can view posts" ON board_posts;

CREATE POLICY "Anyone can view posts" ON board_posts
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- 2. INSERT 정책: 기존 정책 삭제 및 새로 생성
DROP POLICY IF EXISTS "Admins can insert posts" ON board_posts;

CREATE POLICY "Admins can insert posts" ON board_posts
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('master', 'agency_admin', 'agency_manager', 'advertiser_admin')
    )
  );
```

**실행 방법:**
1. https://supabase.com/dashboard 접속
2. 프로젝트 선택
3. 왼쪽 메뉴에서 "SQL Editor" 클릭
4. 위 SQL 코드 붙여넣기 및 실행

### 2단계: 프론트엔드 코드 개선 (완료) ✅

다음 개선사항이 이미 적용되었습니다:

#### ✅ 게시글 조회 로직 개선
- `[게시판]` 태그로 상세한 조회 로그 추가
- 에러 발생 시 상세 정보 표시
- 로딩/빈 상태 UI 추가

#### ✅ 게시글 작성 로직 강화
- `[게시글 작성]` 태그로 작성 과정 추적
- createBoardPost 함수에 상세 로깅 추가
- 에러 시 정확한 원인 파악 가능

#### ✅ 사용자 피드백 개선
- 로딩 상태: "게시글을 불러오는 중..."
- 빈 상태: "등록된 게시글이 없습니다."
- 에러 발생 시 5초간 토스트 알림 표시

### 3단계: 확인 방법

1. **브라우저 개발자 도구 열기** (F12 또는 Cmd+Option+I)
2. **Console 탭**으로 이동
3. 게시판 페이지 새로고침
4. 다음 로그 확인:
   ```
   [게시판] 게시글 조회 시작: { boardType: 'admin', userId: '...', ... }
   [게시판] 조회된 게시글: [...]
   ```

5. **에러가 발생하면:**
   - Console에 `[게시판] 게시글 조회 실패` 로그 표시
   - 에러 상세 정보 확인 (message, code, details, hint)

### 4단계: 테스트

1. Supabase에서 RLS 정책 수정 실행
2. 브라우저에서 게시판 페이지 새로고침 (Cmd+R 또는 F5)
3. 게시글 작성 테스트
4. 게시글 목록 확인

## 추가 문제 발생 시

### A. RLS 정책 확인
Supabase SQL Editor에서 실행:
```sql
SELECT * FROM pg_policies WHERE tablename = 'board_posts';
```

### B. 게시글 데이터 확인
```sql
SELECT id, title, board_type, created_by, deleted_at, created_at
FROM board_posts
ORDER BY created_at DESC;
```

### C. 사용자 인증 상태 확인
브라우저 Console에서:
```javascript
console.log('User:', JSON.parse(localStorage.getItem('sb-ywtlywymybuouojcmyif-auth-token')));
```

## 파일 변경 사항

- ✅ `/src/views/shared/board/index.jsx` - 디버그 로그 및 빈 상태 UI 추가
- ✅ `/database/fix_board_rls_policy.sql` - RLS 정책 수정 SQL 생성

## 문제가 계속되면...

1. 브라우저 Console의 전체 로그 확인
2. Network 탭에서 API 요청/응답 확인
3. Supabase 대시보드에서 Table Editor로 직접 데이터 확인
