import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import type { EntryImage } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const entryId = String(form.get("entryId") || "");
    const deviceId = String(form.get("deviceId") || "");
    const image = form.get("image");
    const dataUrl = String(form.get("dataUrl") || "");

    if (!entryId) {
      return NextResponse.json({ error: "entryId가 필요합니다." }, { status: 400 });
    }

    const imageId = crypto.randomUUID();
    const created_at = new Date().toISOString();
    let nextImage: EntryImage | null = null;

    const supabase = createServiceClient();

    if (supabase && image instanceof File) {
      const ext = "jpg";
      const path = `${deviceId || "guest"}/${entryId}/${imageId}.${ext}`;
      const buffer = Buffer.from(await image.arrayBuffer());
      const { error: uploadError } = await supabase.storage
        .from("entry-images")
        .upload(path, buffer, {
          contentType: "image/jpeg",
          upsert: false,
        });

      if (uploadError) {
        console.error(uploadError);
        // fall through to dataUrl if provided
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

    if (!nextImage) {
      if (!dataUrl.startsWith("data:image/")) {
        return NextResponse.json(
          { error: "이미지 업로드에 실패했습니다. (로컬 저장용 dataUrl 필요)" },
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
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      const current = Array.isArray(row?.images) ? (row.images as EntryImage[]) : [];
      const images = [...current, nextImage];

      let update = supabase.from("entries").update({ images }).eq("id", entryId);
      if (deviceId) update = update.eq("device_id", deviceId);
      const { error: updateError } = await update;
      if (updateError) {
        // column may not exist yet
        console.error(updateError);
        return NextResponse.json(
          {
            error:
              updateError.message.includes("images")
                ? "Supabase에 images 컬럼이 없습니다. migration_images.sql을 실행해 주세요."
                : updateError.message,
            image: nextImage,
            storage: "local",
          },
          { status: 200 },
        );
      }

      return NextResponse.json({
        image: nextImage,
        images,
        storage: "supabase",
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
