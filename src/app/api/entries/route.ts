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
