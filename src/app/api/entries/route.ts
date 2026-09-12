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
