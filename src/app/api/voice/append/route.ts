import { NextResponse } from "next/server";
import { transcribeAudio } from "@/lib/classify";
import { createServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const audio = form.get("audio");
    const entryId = String(form.get("entryId") || "");
    const deviceId = String(form.get("deviceId") || "");

    if (!entryId) {
      return NextResponse.json({ error: "entryId가 필요합니다." }, { status: 400 });
    }
    if (!(audio instanceof File)) {
      return NextResponse.json({ error: "음성 파일이 없습니다." }, { status: 400 });
    }
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY가 없습니다." },
        { status: 500 },
      );
    }

    const transcript = await transcribeAudio(audio);
    if (!transcript) {
      return NextResponse.json(
        { error: "음성을 인식하지 못했습니다." },
        { status: 422 },
      );
    }

    const stamp = new Date().toLocaleString("ko-KR", {
      timeZone: "Asia/Seoul",
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    const addition = `\n\n[추가 음성 ${stamp}]\n${transcript}`;

    const supabase = createServiceClient();
    if (supabase) {
      const { data: row, error } = await supabase
        .from("entries")
        .select("content, raw_transcript")
        .eq("id", entryId)
        .maybeSingle();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      const content = `${row?.content || ""}${addition}`;
      const raw_transcript = row?.raw_transcript
        ? `${row.raw_transcript}\n${transcript}`
        : transcript;

      let update = supabase
        .from("entries")
        .update({ content, raw_transcript })
        .eq("id", entryId);
      if (deviceId) update = update.eq("device_id", deviceId);

      const { error: updateError } = await update;
      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }

      return NextResponse.json({
        transcript,
        addition,
        content,
        storage: "supabase",
      });
    }

    return NextResponse.json({
      transcript,
      addition,
      storage: "local",
    });
  } catch (error) {
    console.error(error);
    const message =
      error instanceof Error ? error.message : "추가 음성 처리 중 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
