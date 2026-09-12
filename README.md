# Talk Diary

말로 남기는 음성 다이어리. 일정·생각·아이디어·할일을 자동 분류합니다.

## 기능

- 큰 녹음 버튼으로 즉시 음성 기록
- Whisper로 한국어 전사 → GPT로 카테고리/날짜/할일 분류
- 날짜별 다이어리 보기 + 기록 리스트
- 할일 진행 상태 관리 (대기 / 진행중 / 완료)
- 사진 첨부 · 카드 추가 음성 · 타이핑 수정
- **Google 캘린더 일정 + Google Tasks 할일 가져오기**
- Supabase 연결 시 클라우드 저장, 없으면 이 기기(localStorage)에 저장

## 빠른 시작

```bash
npm install
cp .env.example .env.local
# .env.local에 OPENAI_API_KEY 입력
npm run dev
```

브라우저에서 http://localhost:3000 접속 후 마이크 권한을 허용하세요.

## Supabase 설정

1. [Supabase](https://supabase.com) 프로젝트 생성
2. SQL Editor에서 `supabase/schema.sql` 전체 실행
3. (기존 프로젝트) 사진 첨부용으로 `supabase/migration_images.sql`도 실행
4. Project Settings → API에서 URL, anon key, service_role key 복사
5. `.env.local`에 채우기 (`NEXT_PUBLIC_SUPABASE_URL`은 `https://xxx.supabase.co` 만 — `/rest/v1` 붙이지 않기)

## Google 캘린더 · Tasks 가져오기 설정

1. [Google Cloud Console](https://console.cloud.google.com/) → 프로젝트 생성
2. **API 및 서비스 → 라이브러리**에서 사용 설정
   - Google Calendar API
   - Google Tasks API
3. **OAuth 동의 화면**
   - User Type: 외부
   - 앱 이름: Talk Diary
   - 테스트 사용자에 본인 Gmail 추가 (예: 사용하는 Google 계정)
4. **사용자 인증 정보 → OAuth 클라이언트 ID 만들기**
   - 애플리케이션 유형: **웹 애플리케이션**
   - 승인된 리디렉션 URI:
     - `http://localhost:3000/api/google/callback`
     - `https://당신의-vercel-주소.vercel.app/api/google/callback`
5. 클라이언트 ID / 시크릿을 `.env.local`과 Vercel에 등록

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
GOOGLE_CLIENT_ID=.....apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=.....
```

6. 앱 홈 화면 **Google 일정·할일** 카드에서
   - **Google 계정 연결** → 로그인·권한 허용
   - **가져오기** (최근 7일 ~ 앞으로 30일)

> 현재는 **읽기 전용 가져오기**입니다. Talk Diary → Google 내보내기는 이후 추가할 수 있습니다.

## GitHub + Vercel 배포

1. GitHub 푸시
2. Vercel Import
3. Environment Variables에 `.env.local`과 동일 키 등록  
   (`NEXT_PUBLIC_APP_URL`은 Vercel 도메인으로)
4. Deploy  
5. Google Cloud 리디렉션 URI에 Vercel 콜백 주소 추가

## 페이지

| 경로 | 설명 |
|------|------|
| `/` | 음성 녹음 + 달력 + Google 가져오기 + 선택 날짜 기록 |
| `/entries` | 날짜별 전체 기록 리스트 / 검색 |
| `/todos` | 자동 추출 할일 및 진행 관리 |

## 기술 스택

- Next.js (App Router) + TypeScript + Tailwind CSS
- Supabase (Postgres)
- OpenAI Whisper + Chat Completions
- Google Calendar API + Google Tasks API
- Vercel 배포
