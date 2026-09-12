import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const deviceId = searchParams.get("deviceId");
  const date = searchParams.get("date");

  const supabase = createServiceClient();
  if (!supabase || !deviceId) {
    return NextResponse.json({ entries: [], storage: "local" });
  }

  let query = supabase
    .from("entries")
    .select("*")
    .eq("device_id", deviceId)
    .order("created_at", { ascending: false });

  if (date) {
    query = query.eq("entry_date", date);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ entries: data ?? [], storage: "supabase" });
}

export async function PATCH(request: Request) {
  const body = (await request.json()) as {
    id?: string;
    deviceId?: string;
    title?: string;
    content?: string;
    category?: string;
    entry_date?: string;
  };

  if (!body.id) {
    return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
  }

  const updates: Record<string, string> = {};
  if (typeof body.title === "string") updates.title = body.title.trim();
  if (typeof body.content === "string") updates.content = body.content.trim();
  if (typeof body.category === "string") updates.category = body.category;
  if (typeof body.entry_date === "string") updates.entry_date = body.entry_date;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "수정할 내용이 없습니다." }, { status: 400 });
  }

  const supabase = createServiceClient();
  if (!supabase) {
    return NextResponse.json({ ok: true, storage: "local" });
  }

  let query = supabase.from("entries").update(updates).eq("id", body.id);
  if (body.deviceId) {
    query = query.eq("device_id", body.deviceId);
  }

  const { error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 연결된 할일(entry_id)도 제목·마감일 동기화
  const todoUpdates: Record<string, string | null> = {};
  if (typeof body.title === "string") todoUpdates.title = body.title.trim();
  if (typeof body.entry_date === "string") todoUpdates.due_date = body.entry_date;

  if (Object.keys(todoUpdates).length > 0) {
    let todoQuery = supabase
      .from("todos")
      .update(todoUpdates)
      .eq("entry_id", body.id);
    if (body.deviceId) {
      todoQuery = todoQuery.eq("device_id", body.deviceId);
    }
    const { error: todoError } = await todoQuery;
    if (todoError) {
      console.error(todoError);
    }
  }

  return NextResponse.json({ ok: true, storage: "supabase" });
}

export async function DELETE(request: Request) {
  const body = (await request.json()) as {
    id?: string;
    deviceId?: string;
  };

  if (!body.id) {
    return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
  }

  const supabase = createServiceClient();
  if (!supabase) {
    return NextResponse.json({ ok: true, storage: "local" });
  }

  let query = supabase.from("entries").delete().eq("id", body.id);
  if (body.deviceId) {
    query = query.eq("device_id", body.deviceId);
  }

  const { error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 연결된 할일도 정리 (entry_id 기준)
  let todoQuery = supabase.from("todos").delete().eq("entry_id", body.id);
  if (body.deviceId) {
    todoQuery = todoQuery.eq("device_id", body.deviceId);
  }
  await todoQuery;

  return NextResponse.json({ ok: true, storage: "supabase" });
}
