import { NextResponse } from "next/server";
import { importGoogleData } from "@/lib/google/import";
import { isGoogleConfigured } from "@/lib/google/oauth";
import { readGoogleTokens, saveGoogleTokens } from "@/lib/google/tokens";
import { createServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    if (!isGoogleConfigured()) {
      return NextResponse.json(
        { error: "Google OAuth가 설정되지 않았습니다." },
        { status: 500 },
      );
    }

    const body = (await request.json().catch(() => ({}))) as {
      deviceId?: string;
      daysBack?: number;
      daysForward?: number;
    };
    const deviceId = body.deviceId || "anonymous";

    const tokens = await readGoogleTokens();
    if (!tokens) {
      return NextResponse.json(
        { error: "Google 계정이 연결되어 있지 않습니다. 먼저 연결해 주세요." },
        { status: 401 },
      );
    }

    const result = await importGoogleData(tokens, {
      daysBack: body.daysBack ?? 7,
      daysForward: body.daysForward ?? 30,
    });

    // Persist refreshed tokens
    await saveGoogleTokens({
      ...result.tokenSet,
      email: result.email,
    });

    const supabase = createServiceClient();
    let persisted = false;

    if (supabase) {
      // Deduplicate by source marker in raw_transcript / title+source
      const { data: existingEntries } = await supabase
        .from("entries")
        .select("id, raw_transcript")
        .eq("device_id", deviceId);

      const existingMarkers = new Set(
        (existingEntries || [])
          .map((e) => e.raw_transcript)
          .filter(Boolean) as string[],
      );

      const newEntries = result.entries.filter(
        (e) => !e.raw_transcript || !existingMarkers.has(e.raw_transcript),
      );

      if (newEntries.length > 0) {
        const { error } = await supabase.from("entries").insert(
          newEntries.map((e) => ({
            id: e.id,
            device_id: deviceId,
            category: e.category,
            title: e.title,
            content: e.content,
            raw_transcript: e.raw_transcript,
            entry_date: e.entry_date,
            scheduled_at: e.scheduled_at,
          })),
        );
        if (error) console.error(error);
        else persisted = true;
      }

      const { data: existingTodos } = await supabase
        .from("todos")
        .select("id, title")
        .eq("device_id", deviceId);

      const existingTodoTitles = new Set(
        (existingTodos || []).map((t) => t.title),
      );

      const newTodos = result.todos.filter(
        (t) => !existingTodoTitles.has(t.title),
      );

      if (newTodos.length > 0) {
        const { error } = await supabase.from("todos").insert(
          newTodos.map((t) => ({
            id: t.id,
            device_id: deviceId,
            entry_id: t.entry_id,
            title: t.title,
            status: t.status,
            due_date: t.due_date,
          })),
        );
        if (error) console.error(error);
        else persisted = true;
      }

      return NextResponse.json({
        entries: result.entries,
        todos: result.todos,
        email: result.email,
        range: result.range,
        persisted,
        storage: persisted ? "supabase" : "local",
      });
    }

    return NextResponse.json({
      entries: result.entries,
      todos: result.todos,
      email: result.email,
      range: result.range,
      persisted: false,
      storage: "local",
    });
  } catch (error) {
    console.error(error);
    const message =
      error instanceof Error ? error.message : "Google 가져오기 실패";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
