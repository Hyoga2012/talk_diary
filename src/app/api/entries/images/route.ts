import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import type { EntryImage } from "@/lib/types";

export const runtime = "nodejs";

function asBlob(value: FormDataEntryValue | null): Blob | null {
  if (!value) return null;
  if (value instanceof Blob) return value;
  return null;
}

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const entryId = String(form.get("entryId") || "").trim();
    const deviceId = String(form.get("deviceId") || "guest")
      .trim()
      .replace(/[^a-zA-Z0-9_-]/g, "_");
    const image = asBlob(form.get("image"));
    const dataUrl = String(form.get("dataUrl") || "");

    if (!entryId) {
      return NextResponse.json({ error: "entryId가 필요합니다." }, { status: 400 });
    }

    const imageId = crypto.randomUUID();
    const created_at = new Date().toISOString();
    let nextImage: EntryImage | null = null;
    let uploadWarning: string | null = null;

    const supabase = createServiceClient();

    if (supabase && image) {
      const path = `${deviceId}/${entryId}/${imageId}.jpg`;
      const buffer = Buffer.from(await image.arrayBuffer());
      const { error: uploadError } = await supabase.storage
        .from("entry-images")
        .upload(path, buffer, {
          contentType: "image/jpeg",
          upsert: true,
        });

      if (uploadError) {
        console.error("storage upload:", uploadError);
        uploadWarning = uploadError.message;
      } else {
        const { data } = supabase.storage.from("entry-images").getPublicUrl(path);
        nextImage = {
          id: imageId,
          url: data.publicUrl,
          path,
          created_at,
        };
      }
    }

    // Fallback: keep photo in entry JSON (works even if storage fails)
    if (!nextImage) {
      if (!dataUrl.startsWith("data:image/")) {
        return NextResponse.json(
          {
            error:
              uploadWarning ||
              "이미지 업로드에 실패했습니다. Supabase URL이 https://xxxx.supabase.co 형태인지 확인하세요.",
          },
          { status: 400 },
        );
      }
      nextImage = {
        id: imageId,
        url: dataUrl,
        path: null,
        created_at,
      };
    }

    if (supabase) {
      const { data: row, error } = await supabase
        .from("entries")
        .select("images")
        .eq("id", entryId)
        .maybeSingle();

      if (error) {
        // still return image for local merge
        return NextResponse.json({
          image: nextImage,
          storage: "local",
          warning: error.message,
        });
      }

      const current = Array.isArray(row?.images)
        ? (row.images as EntryImage[])
        : [];
      const images = [...current, nextImage];

      let update = supabase.from("entries").update({ images }).eq("id", entryId);
      if (deviceId && deviceId !== "guest") {
        update = update.eq("device_id", deviceId);
      }
      const { error: updateError } = await update;
      if (updateError) {
        console.error(updateError);
        return NextResponse.json({
          image: nextImage,
          storage: "local",
          warning: updateError.message.includes("images")
            ? "images 컬럼이 없습니다. migration_images.sql을 실행해 주세요."
            : updateError.message,
        });
      }

      return NextResponse.json({
        image: nextImage,
        images,
        storage: "supabase",
        warning: uploadWarning,
      });
    }

    return NextResponse.json({
      image: nextImage,
      storage: "local",
    });
  } catch (error) {
    console.error(error);
    const message =
      error instanceof Error ? error.message : "이미지 업로드 중 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const body = (await request.json()) as {
    entryId?: string;
    imageId?: string;
    deviceId?: string;
    path?: string | null;
  };

  if (!body.entryId || !body.imageId) {
    return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
  }

  const supabase = createServiceClient();
  if (!supabase) {
    return NextResponse.json({ ok: true, storage: "local" });
  }

  if (body.path) {
    await supabase.storage.from("entry-images").remove([body.path]);
  }

  const { data: row } = await supabase
    .from("entries")
    .select("images")
    .eq("id", body.entryId)
    .maybeSingle();

  const current = Array.isArray(row?.images) ? (row.images as EntryImage[]) : [];
  const images = current.filter((img) => img.id !== body.imageId);

  let update = supabase.from("entries").update({ images }).eq("id", body.entryId);
  if (body.deviceId) update = update.eq("device_id", body.deviceId);
  await update;

  return NextResponse.json({ ok: true, images, storage: "supabase" });
}
