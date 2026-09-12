# Talk Diary

말로 남기는 음성 다이어리. 일정·생각·아이디어·할일을 자동 분류합니다.

## 기능

- 큰 녹음 버튼으로 즉시 음성 기록
- Whisper로 한국어 전사 → GPT로 카테고리/날짜/할일 분류
- 날짜별 다이어리 보기 + 기록 리스트
- 할일 진행 상태 관리 (대기 / 진행중 / 완료)
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
3. Project Settings → API에서 URL, anon key, service_role key 복사
4. `.env.local`에 아래 채우기

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

`SUPABASE_SERVICE_ROLE_KEY`는 서버(API Route)에서만 쓰이므로 절대 클라이언트나 GitHub에 올리지 마세요.

## GitHub + Vercel 배포

1. GitHub에 새 저장소 만들고 푸시

```bash
git add .
git commit -m "Initial Talk Diary app"
git branch -M main
git remote add origin https://github.com/YOUR_ID/talk_diary.git
git push -u origin main
```

2. [Vercel](https://vercel.com) → Import Project → 해당 저장소 선택
3. Environment Variables에 `.env.local`과 동일한 키 등록
4. Deploy

## 페이지

| 경로 | 설명 |
|------|------|
| `/` | 음성 녹음 + 달력 + 선택 날짜 기록 |
| `/entries` | 날짜별 전체 기록 리스트 / 검색 |
| `/todos` | 자동 추출 할일 및 진행 관리 |

## 기술 스택

- Next.js (App Router) + TypeScript + Tailwind CSS
- Supabase (Postgres)
- OpenAI Whisper + Chat Completions
- Vercel 배포
