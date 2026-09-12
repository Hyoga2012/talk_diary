import { NextResponse } from "next/server";
import { transcribeAudio } from "@/lib/classify";
import { createServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

function asBlob(value: FormDataEntryValue | null): Blob | null {
  if (!value) return null;
  if (value instanceof Blob) return value;
  return null;
}

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const audio = asBlob(form.get("audio"));
    const entryId = String(form.get("entryId") || "").trim();
    const deviceId = String(form.get("deviceId") || "").trim();

    if (!entryId) {
      return NextResponse.json({ error: "entryId가 필요합니다." }, { status: 400 });
    }
    if (!audio) {
      return NextResponse.json({ error: "음성 파일이 없습니다." }, { status: 400 });
    }
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY가 없습니다." },
        { status: 500 },
      );
    }

    const file = new File([audio], "append.webm", {
      type: audio.type || "audio/webm",
    });
    const transcript = await transcribeAudio(file);
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
        // Entry may be local-only; still return addition for client merge
        if (/invalid path/i.test(error.message)) {
          return NextResponse.json(
            {
              error:
                "Supabase URL이 잘못되었습니다. Vercel/로컬 .env의 NEXT_PUBLIC_SUPABASE_URL을 https://프로젝트ID.supabase.co 형태(뒤에 /rest/v1 없이)로 넣어 주세요.",
            },
            { status: 500 },
          );
        }
        return NextResponse.json({
          transcript,
          addition,
          storage: "local",
          warning: error.message,
        });
      }

      const baseContent = row?.content || "";
      const content = `${baseContent}${addition}`;
      const raw_transcript = row?.raw_transcript
        ? `${row.raw_transcript}\n${transcript}`
        : transcript;

      // If row missing (local-only entry), client still applies addition
      if (row) {
        let update = supabase
          .from("entries")
          .update({ content, raw_transcript })
          .eq("id", entryId);
        if (deviceId) update = update.eq("device_id", deviceId);

        const { error: updateError } = await update;
        if (updateError) {
          if (/invalid path/i.test(updateError.message)) {
            return NextResponse.json(
              {
                error:
                  "Supabase URL이 잘못되었습니다. NEXT_PUBLIC_SUPABASE_URL에서 /rest/v1 을 제거해 주세요.",
              },
              { status: 500 },
            );
          }
          return NextResponse.json({
            transcript,
            addition,
            content: `${addition}`,
            storage: "local",
            warning: updateError.message,
          });
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
