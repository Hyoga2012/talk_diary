import type { ClassifiedItem } from "./types";
import { getOpenAI } from "./openai";
import {
  applyKoreanRelativeDates,
  buildDateAnchors,
  type DateAnchors,
} from "./dates";

const SYSTEM_PROMPT = `당신은 한국어 음성 다이어리 비서입니다.
사용자의 음성 전사 텍스트를 분석해 JSON만 반환하세요.

규칙:
1. 내용을 의미 단위로 나눠 items 배열에 넣습니다.
2. category는 다음 중 하나: schedule, thought, idea, note, todo
   - schedule: 약속, 시험, 미팅, 참석 등 날짜/시간이 있는 일정
   - thought: 감정, 회고, 생각
   - idea: 아이디어, 기획, 영감
   - todo: 해야 할 일
   - note: 그 외 기록
3. title은 짧은 한국어 제목 (20자 이내)
4. content는 정리된 본문
5. entry_date는 반드시 YYYY-MM-DD.
   - 상대 날짜는 제공된 기준표를 그대로 사용하세요.
   - "내일" → tomorrow 값
   - "모레" → dayAfterTomorrow 값
   - "오늘" 또는 날짜 없음 → today 값
   - 예: today=2026-09-12 이고 텍스트가 "내일 피아노 시험"이면 entry_date는 2026-09-13
6. schedule이면 scheduled_at을 ISO 문자열로 (알 수 없으면 null)
7. todo이거나 할일이 포함되면 is_todo=true, todo_title, due_date(YYYY-MM-DD|null)
   - "내일까지 ~" 이면 due_date도 tomorrow
8. 여러 주제가 섞이면 여러 item으로 분리
9. entry_date를 today로 임의로 두지 마세요. 상대 날짜가 있으면 반드시 변환하세요.

응답 형식:
{
  "items": [
    {
      "category": "schedule",
      "title": "...",
      "content": "...",
      "entry_date": "YYYY-MM-DD",
      "scheduled_at": null,
      "is_todo": false,
      "todo_title": null,
      "due_date": null
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

  // AI가 놓친 "내일/모레"를 코드로 한 번 더 보정
  return applyKoreanRelativeDates(transcript, normalized, dateAnchors);
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
