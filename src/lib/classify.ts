import { format } from "date-fns";
import type { ClassifiedItem } from "./types";
import { getOpenAI } from "./openai";

const SYSTEM_PROMPT = `당신은 한국어 음성 다이어리 비서입니다.
사용자의 음성 전사 텍스트를 분석해 JSON만 반환하세요.

규칙:
1. 내용을 의미 단위로 나눠 items 배열에 넣습니다.
2. category는 다음 중 하나: schedule, thought, idea, note, todo
   - schedule: 약속, 미팅, 시간 있는 일정
   - thought: 감정, 회고, 생각
   - idea: 아이디어, 기획, 영감
   - todo: 해야 할 일
   - note: 그 외 기록
3. title은 짧은 한국어 제목 (20자 이내)
4. content는 정리된 본문
5. entry_date는 YYYY-MM-DD. 날짜가 없으면 today를 사용. "내일", "모레", "다음주 월요일" 등은 today 기준으로 계산.
6. schedule이면 scheduled_at을 ISO 문자열로 (알 수 없으면 null)
7. todo이거나 할일이 포함되면 is_todo=true, todo_title, due_date(YYYY-MM-DD|null)
8. 여러 주제가 섞이면 여러 item으로 분리

응답 형식:
{
  "items": [
    {
      "category": "todo",
      "title": "...",
      "content": "...",
      "entry_date": "YYYY-MM-DD",
      "scheduled_at": null,
      "is_todo": true,
      "todo_title": "...",
      "due_date": null
    }
  ]
}`;

export async function classifyTranscript(
  transcript: string,
  today = format(new Date(), "yyyy-MM-dd"),
): Promise<ClassifiedItem[]> {
  const openai = getOpenAI();

  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_CLASSIFY_MODEL || "gpt-4o-mini",
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `오늘 날짜(today): ${today}\n\n전사 텍스트:\n${transcript}`,
      },
    ],
  });

  const raw = completion.choices[0]?.message?.content || "{}";
  const parsed = JSON.parse(raw) as { items?: ClassifiedItem[] };
  const items = parsed.items ?? [];

  return items.map((item) => ({
    category: item.category || "note",
    title: item.title?.trim() || "기록",
    content: item.content?.trim() || transcript,
    entry_date: item.entry_date || today,
    scheduled_at: item.scheduled_at ?? null,
    is_todo: Boolean(item.is_todo || item.category === "todo"),
    todo_title: item.todo_title || (item.category === "todo" ? item.title : null),
    due_date: item.due_date ?? null,
  }));
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
