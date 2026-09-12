import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import type { TodoStatus } from "@/lib/types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const deviceId = searchParams.get("deviceId");

  const supabase = createServiceClient();
  if (!supabase || !deviceId) {
    return NextResponse.json({ todos: [], storage: "local" });
  }

  const { data, error } = await supabase
    .from("todos")
    .select("*")
    .eq("device_id", deviceId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ todos: data ?? [], storage: "supabase" });
}

export async function PATCH(request: Request) {
  const body = (await request.json()) as {
    id: string;
    status: TodoStatus;
    deviceId?: string;
  };

  if (!body.id || !body.status) {
    return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
  }

  const supabase = createServiceClient();
  if (!supabase) {
    return NextResponse.json({ ok: true, storage: "local" });
  }

  let query = supabase
    .from("todos")
    .update({ status: body.status })
    .eq("id", body.id);

  if (body.deviceId) {
    query = query.eq("device_id", body.deviceId);
  }

  const { error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, storage: "supabase" });
}
