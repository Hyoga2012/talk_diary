import type { ClassifiedItem } from "./types";
import { getOpenAI } from "./openai";
import {
  applyKoreanRelativeDates,
  buildDateAnchors,
  type DateAnchors,
} from "./dates";
import { enrichTodos } from "./todo-extract";

const SYSTEM_PROMPT = `당신은 한국어 음성 다이어리 비서입니다.
사용자의 음성 전사 텍스트를 분석해 JSON만 반환하세요.

규칙:
1. 내용을 의미 단위로 나눠 items 배열에 넣습니다.
2. category는 다음 중 하나: schedule, thought, idea, note, todo
   - schedule: 약속, 시험, 미팅, 참석 등 날짜/시간이 있는 일정
   - thought: 감정, 회고, 생각 (행동 계획이 없으면)
   - idea: 아이디어, 기획, 영감
   - todo: 해야 할 일
   - note: 그 외 기록
3. title은 짧은 한국어 제목 (20자 이내)
4. content는 정리된 본문
5. entry_date는 반드시 YYYY-MM-DD.
   - "내일" → tomorrow, "모레" → dayAfterTomorrow, "오늘"/없음 → today
6. 시간이 있으면 scheduled_at을 ISO(예: 2026-09-14T14:00:00+09:00), 없으면 null
7. ★ 할일 추출 (중요):
   - 일정(schedule), 해야 할 일, "~할거야/할게/해야해/까지 할거야/참석/시험/미팅" 등이면
     is_todo=true 로 두고 todo_title을 채우세요.
   - 생각·아이디어라도 실행 계획이 있으면(예: "생각이 났어. 그걸 모레 14시까지 할거야")
     category는 idea 또는 thought 로 두되 is_todo=true, due_date도 설정하세요.
   - 순수 감상/회고만 있으면 is_todo=false
   - due_date: "~까지" 날짜, 일정 날짜, 없으면 entry_date
8. 한 발화에 생각+할일이 섞이면 가능하면 분리하거나, 하나의 item에 is_todo=true로 담으세요.
9. entry_date를 today로 임의로 두지 마세요. 상대 날짜가 있으면 반드시 변환하세요.

예시1) "내일 피아노 급수시험 참석"
→ category=schedule, entry_date=tomorrow, is_todo=true, todo_title="피아노 급수시험 참석", due_date=tomorrow

예시2) "생각이 났어. 앱 프로토타입 만들거야. 모레 14시까지 할거야"
→ category=idea, entry_date=dayAfterTomorrow, is_todo=true, todo_title="앱 프로토타입 만들기", due_date=dayAfterTomorrow, scheduled_at=...T14:00:00+09:00

응답 형식:
{
  "items": [
    {
      "category": "schedule",
      "title": "...",
      "content": "...",
      "entry_date": "YYYY-MM-DD",
      "scheduled_at": null,
      "is_todo": true,
      "todo_title": "...",
      "due_date": "YYYY-MM-DD"
    }
  ]
}`;

export async function classifyTranscript(
  transcript: string,
  anchors?: DateAnchors,
): Promise<ClassifiedItem[]> {
  const dateAnchors = anchors ?? buildDateAnchors();
  const openai = getOpenAI();

  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_CLASSIFY_MODEL || "gpt-4o-mini",
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: [
          `시간대: ${dateAnchors.timeZone}`,
          `기준 날짜표:`,
          `- today (오늘): ${dateAnchors.today}`,
          `- tomorrow (내일): ${dateAnchors.tomorrow}`,
          `- dayAfterTomorrow (모레): ${dateAnchors.dayAfterTomorrow}`,
          ``,
          `전사 텍스트:`,
          transcript,
        ].join("\n"),
      },
    ],
  });

  const raw = completion.choices[0]?.message?.content || "{}";
  const parsed = JSON.parse(raw) as { items?: ClassifiedItem[] };
  const items = parsed.items ?? [];

  const normalized = items.map((item) => ({
    category: item.category || "note",
    title: item.title?.trim() || "기록",
    content: item.content?.trim() || transcript,
    entry_date: item.entry_date || dateAnchors.today,
    scheduled_at: item.scheduled_at ?? null,
    is_todo: Boolean(item.is_todo || item.category === "todo"),
    todo_title:
      item.todo_title || (item.category === "todo" ? item.title : null),
    due_date: item.due_date ?? null,
  }));

  const dated = applyKoreanRelativeDates(transcript, normalized, dateAnchors);
  return enrichTodos(dated);
}

export async function transcribeAudio(file: File) {
  const openai = getOpenAI();
  const transcription = await openai.audio.transcriptions.create({
    file,
    model: process.env.OPENAI_WHISPER_MODEL || "whisper-1",
    language: "ko",
  });
  return transcription.text.trim();
}
