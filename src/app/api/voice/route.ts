import { NextResponse } from "next/server";
import { classifyTranscript, transcribeAudio } from "@/lib/classify";
import { buildDateAnchors } from "@/lib/dates";
import { createServiceClient } from "@/lib/supabase/server";
import type { ClassifiedItem, DiaryEntry, TodoItem } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const audio = form.get("audio");
    const deviceId = String(form.get("deviceId") || "anonymous");
    const clientDate = String(form.get("clientDate") || "");
    const clientTimeZone = String(form.get("clientTimeZone") || "Asia/Seoul");

    if (!(audio instanceof File)) {
      return NextResponse.json(
        { error: "음성 파일이 없습니다." },
        { status: 400 },
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        {
          error:
            "OPENAI_API_KEY가 없습니다. .env.local에 키를 넣고 다시 시도하세요.",
        },
        { status: 500 },
      );
    }

    const transcript = await transcribeAudio(audio);
    if (!transcript) {
      return NextResponse.json(
        { error: "음성을 인식하지 못했습니다. 다시 말해 주세요." },
        { status: 422 },
      );
    }

    const anchors = buildDateAnchors(clientDate || null, clientTimeZone);
    const classified = await classifyTranscript(transcript, anchors);
    const now = new Date().toISOString();

    const entries: DiaryEntry[] = classified.map((item, index) => ({
      id: crypto.randomUUID(),
      category: item.category,
      title: item.title,
      content: item.content,
      raw_transcript: index === 0 ? transcript : null,
      entry_date: item.entry_date,
      scheduled_at: item.scheduled_at ?? null,
      created_at: now,
    }));

    const todosFixed = buildTodos(classified, entries, now);

    const supabase = createServiceClient();
    let persisted = false;

    if (supabase) {
      const entryRows = entries.map((e) => ({
        id: e.id,
        device_id: deviceId,
        category: e.category,
        title: e.title,
        content: e.content,
        raw_transcript: e.raw_transcript,
        entry_date: e.entry_date,
        scheduled_at: e.scheduled_at,
      }));

      const { error: entryError } = await supabase
        .from("entries")
        .insert(entryRows);

      if (entryError) {
        console.error(entryError);
      } else {
        persisted = true;
        if (todosFixed.length > 0) {
          const todoRows = todosFixed.map((t) => ({
            id: t.id,
            device_id: deviceId,
            entry_id: t.entry_id,
            title: t.title,
            status: t.status,
            due_date: t.due_date,
          }));
          const { error: todoError } = await supabase
            .from("todos")
            .insert(todoRows);
          if (todoError) console.error(todoError);
        }
      }
    }

    return NextResponse.json({
      transcript,
      entries,
      todos: todosFixed,
      persisted,
      storage: persisted ? "supabase" : "local",
    });
  } catch (error) {
    console.error(error);
    const message =
      error instanceof Error ? error.message : "음성 처리 중 오류가 발생했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function buildTodos(
  classified: ClassifiedItem[],
  entries: DiaryEntry[],
  now: string,
): TodoItem[] {
  const todos: TodoItem[] = [];
  classified.forEach((item, index) => {
    if (!item.is_todo) return;
    const title = (item.todo_title || item.title || "").trim();
    if (!title) return;
    todos.push({
      id: crypto.randomUUID(),
      entry_id: entries[index]?.id ?? null,
      title,
      status: "pending",
      due_date: item.due_date ?? item.entry_date ?? null,
      created_at: now,
    });
  });
  return todos;
}
