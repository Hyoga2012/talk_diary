import type { DiaryEntry } from "@/lib/types";
import { CATEGORY_LABELS } from "@/lib/types";

async function urlToFile(url: string, index: number): Promise<File | null> {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const type = blob.type || "image/jpeg";
    const ext = type.includes("png") ? "png" : type.includes("webp") ? "webp" : "jpg";
    return new File([blob], `talk-diary-${index + 1}.${ext}`, { type });
  } catch {
    return null;
  }
}

export async function shareDiaryEntry(entry: DiaryEntry): Promise<string | null> {
  const category = CATEGORY_LABELS[entry.category] || entry.category;
  const text = [
    `[Talk Diary] ${category}`,
    entry.title,
    "",
    entry.content,
    "",
    `날짜: ${entry.entry_date}`,
  ].join("\n");

  const imageUrls = (entry.images || []).map((img) => img.url).filter(Boolean);
  const files: File[] = [];
  for (let i = 0; i < imageUrls.length; i++) {
    const file = await urlToFile(imageUrls[i], i);
    if (file) files.push(file);
  }

  const nav = navigator as Navigator & {
    canShare?: (data: ShareData) => boolean;
  };

  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      if (files.length > 0) {
        const withFiles: ShareData = { title: entry.title, text, files };
        if (!nav.canShare || nav.canShare(withFiles)) {
          await navigator.share(withFiles);
          return null;
        }
      }
      await navigator.share({ title: entry.title, text });
      if (files.length > 0) {
        return "문구는 공유했습니다. 이 기기에서는 사진 동시 공유가 제한되어, 카드의 사진을 길게 눌러 저장한 뒤 함께 보내 주세요.";
      }
      return null;
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") return null;
      // fall through to clipboard
    }
  }

  try {
    await navigator.clipboard.writeText(text);
    if (files.length > 0) {
      return "공유 메뉴를 열 수 없어 텍스트를 복사했습니다. 사진은 카드에서 저장 후 함께 보내 주세요.";
    }
    return "공유 문구를 클립보드에 복사했습니다.";
  } catch {
    return "이 환경에서는 공유를 지원하지 않습니다.";
  }
}
