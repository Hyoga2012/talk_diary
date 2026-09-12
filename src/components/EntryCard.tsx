"use client";

import { format, parseISO } from "date-fns";
import { ko } from "date-fns/locale";
import {
  Check,
  ImagePlus,
  Loader2,
  Mic,
  Pencil,
  Share2,
  Square,
  Trash2,
  X,
} from "lucide-react";
import { useRef, useState } from "react";
import { compressImageFile } from "@/lib/image";
import { shareDiaryEntry } from "@/lib/share";
import type { DiaryEntry, EntryCategory, EntryImage } from "@/lib/types";
import { CATEGORY_LABELS } from "@/lib/types";

const categoryTone: Record<EntryCategory, string> = {
  schedule: "bg-[var(--chip-schedule)] text-[var(--ink)]",
  thought: "bg-[var(--chip-thought)] text-[var(--ink)]",
  idea: "bg-[var(--chip-idea)] text-[var(--ink)]",
  note: "bg-[var(--chip-note)] text-[var(--ink)]",
  todo: "bg-[var(--chip-todo)] text-[var(--ink)]",
};

const CATEGORIES = Object.keys(CATEGORY_LABELS) as EntryCategory[];

export type EntryUpdate = {
  title: string;
  content: string;
  category: EntryCategory;
  entry_date: string;
};

export function EntryCard({
  entry,
  deviceId,
  onDelete,
  onUpdate,
  onAddImage,
  onRemoveImage,
  onAppendVoice,
}: {
  entry: DiaryEntry;
  deviceId?: string;
  onDelete?: (id: string) => void;
  onUpdate?: (id: string, patch: EntryUpdate) => Promise<void> | void;
  onAddImage?: (id: string, image: EntryImage) => Promise<void> | void;
  onRemoveImage?: (entryId: string, image: EntryImage) => Promise<void> | void;
  onAppendVoice?: (
    entryId: string,
    payload: { transcript: string; addition: string; content?: string },
  ) => Promise<void> | void;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(entry.title);
  const [content, setContent] = useState(entry.content);
  const [category, setCategory] = useState<EntryCategory>(entry.category);
  const [entryDate, setEntryDate] = useState(entry.entry_date);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState<"photo" | "voice" | "share" | null>(null);
  const [voiceStatus, setVoiceStatus] = useState<"idle" | "recording" | "processing">(
    "idle",
  );
  const [localError, setLocalError] = useState<string | null>(null);
  const [shareHint, setShareHint] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const images = entry.images ?? [];

  const startEdit = () => {
    setTitle(entry.title);
    setContent(entry.content);
    setCategory(entry.category);
    setEntryDate(entry.entry_date);
    setEditing(true);
    setLocalError(null);
  };

  const cancelEdit = () => {
    setEditing(false);
    setTitle(entry.title);
    setContent(entry.content);
    setCategory(entry.category);
    setEntryDate(entry.entry_date);
  };

  const saveEdit = async () => {
    if (!onUpdate) return;
    const nextTitle = title.trim();
    const nextContent = content.trim();
    if (!nextTitle || !nextContent || !entryDate) return;

    setSaving(true);
    try {
      await onUpdate(entry.id, {
        title: nextTitle,
        content: nextContent,
        category,
        entry_date: entryDate,
      });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handlePickPhoto = async (file: File | null) => {
    if (!file || !onAddImage || !deviceId) return;
    setBusy("photo");
    setLocalError(null);
    try {
      const compressed = await compressImageFile(file);
      const dataUrl = await blobToDataUrl(compressed);
      const form = new FormData();
      form.append("entryId", entry.id);
      form.append("deviceId", deviceId);
      form.append("image", compressed, "photo.jpg");
      form.append("dataUrl", dataUrl);

      const res = await fetch("/api/entries/images", {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok && !data.image) {
        throw new Error(data.error || "사진 첨부 실패");
      }
      if (data.error && !data.image) throw new Error(data.error);
      await onAddImage(entry.id, data.image as EntryImage);
      if (data.error) setLocalError(data.error);
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : "사진 첨부 실패");
    } finally {
      setBusy(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const stopAppendVoice = () => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
  };

  const startAppendVoice = async () => {
    if (!onAppendVoice || !deviceId || voiceStatus === "processing") return;
    setLocalError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/mp4")
          ? "audio/mp4"
          : "";
      const recorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined,
      );
      chunksRef.current = [];
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setVoiceStatus("processing");
        setBusy("voice");
        try {
          const blob = new Blob(chunksRef.current, {
            type: recorder.mimeType || "audio/webm",
          });
          const ext = blob.type.includes("mp4") ? "mp4" : "webm";
          const file = new File([blob], `append.${ext}`, { type: blob.type });
          const form = new FormData();
          form.append("audio", file);
          form.append("entryId", entry.id);
          form.append("deviceId", deviceId);

          const res = await fetch("/api/voice/append", {
            method: "POST",
            body: form,
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "추가 음성 실패");

          await onAppendVoice(entry.id, {
            transcript: data.transcript,
            addition: data.addition,
            content: data.content,
          });
        } catch (e) {
          setLocalError(e instanceof Error ? e.message : "추가 음성 실패");
        } finally {
          setVoiceStatus("idle");
          setBusy(null);
        }
      };

      recorder.start();
      setVoiceStatus("recording");
    } catch {
      setLocalError("마이크 권한이 필요합니다.");
      setVoiceStatus("idle");
    }
  };

  const toggleAppendVoice = () => {
    if (voiceStatus === "recording") {
      stopAppendVoice();
      return;
    }
    void startAppendVoice();
  };

  const handleShare = async () => {
    setBusy("share");
    setShareHint(null);
    setLocalError(null);
    try {
      const hint = await shareDiaryEntry(entry);
      if (hint) setShareHint(hint);
    } catch {
      setLocalError("공유에 실패했습니다.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <article className="entry-row border-b border-[var(--line)] py-4 last:border-b-0">
      {!editing ? (
        <>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span
              className={`rounded px-2 py-0.5 text-[11px] font-semibold tracking-wide ${categoryTone[entry.category]}`}
            >
              {CATEGORY_LABELS[entry.category]}
            </span>
            <time className="text-xs text-[var(--muted)]">
              {entry.entry_date} ·{" "}
              {format(parseISO(entry.created_at), "a h:mm", { locale: ko })}
            </time>
            <div className="ml-auto flex items-center gap-0.5">
              <button
                type="button"
                aria-label="기록 공유"
                disabled={busy === "share"}
                onClick={() => void handleShare()}
                className="rounded-full p-1.5 text-[var(--muted)] transition hover:bg-black/5 hover:text-[var(--ink)] disabled:opacity-50"
              >
                {busy === "share" ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Share2 size={16} />
                )}
              </button>
              {onUpdate && (
                <button
                  type="button"
                  aria-label="기록 수정"
                  onClick={startEdit}
                  className="rounded-full p-1.5 text-[var(--muted)] transition hover:bg-black/5 hover:text-[var(--ink)]"
                >
                  <Pencil size={16} />
                </button>
              )}
              {onDelete && (
                <button
                  type="button"
                  aria-label="기록 삭제"
                  onClick={() => {
                    if (confirm("이 기록을 삭제할까요?")) onDelete(entry.id);
                  }}
                  className="rounded-full p-1.5 text-[var(--muted)] transition hover:bg-[var(--chip-todo)] hover:text-[var(--accent)]"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          </div>
          <h3 className="font-[family-name:var(--font-display)] text-lg leading-snug text-[var(--ink)]">
            {entry.title}
          </h3>
          <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-[var(--body)]">
            {entry.content}
          </p>

          {images.length > 0 && (
            <div className="mt-3 grid grid-cols-3 gap-2">
              {images.map((img) => (
                <div key={img.id} className="relative aspect-square overflow-hidden rounded-xl">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                  {onRemoveImage && (
                    <button
                      type="button"
                      aria-label="사진 삭제"
                      onClick={() => {
                        if (confirm("이 사진을 삭제할까요?")) {
                          void onRemoveImage(entry.id, img);
                        }
                      }}
                      className="absolute right-1 top-1 rounded-full bg-black/55 p-1 text-white"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => void handlePickPhoto(e.target.files?.[0] || null)}
            />
            {onAddImage && (
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => fileRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-full bg-black/5 px-3 py-1.5 text-[11px] font-semibold text-[var(--ink)] disabled:opacity-50"
              >
                {busy === "photo" ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <ImagePlus size={14} />
                )}
                사진
              </button>
            )}
            {onAppendVoice && (
              <button
                type="button"
                disabled={busy === "photo" || voiceStatus === "processing"}
                onClick={toggleAppendVoice}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold disabled:opacity-50 ${
                  voiceStatus === "recording"
                    ? "bg-[var(--accent)] text-white"
                    : "bg-black/5 text-[var(--ink)]"
                }`}
              >
                {voiceStatus === "processing" ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : voiceStatus === "recording" ? (
                  <Square size={14} className="fill-current" />
                ) : (
                  <Mic size={14} />
                )}
                {voiceStatus === "recording"
                  ? "녹음 중지"
                  : voiceStatus === "processing"
                    ? "인식 중"
                    : "추가 말하기"}
              </button>
            )}
          </div>
          {localError && (
            <p className="mt-2 text-xs text-[var(--accent)]">{localError}</p>
          )}
          {shareHint && (
            <p className="mt-2 text-xs text-[var(--muted)]">{shareHint}</p>
          )}
          <p className="mt-2 text-[11px] text-[var(--muted)]">
            오타는 연필(수정)로 타이핑해 고칠 수 있습니다.
          </p>
        </>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold text-[var(--muted)]">기록 수정</p>
            <div className="flex gap-1">
              <button
                type="button"
                aria-label="취소"
                onClick={cancelEdit}
                disabled={saving}
                className="rounded-full p-1.5 text-[var(--muted)] hover:bg-black/5"
              >
                <X size={16} />
              </button>
              <button
                type="button"
                aria-label="저장"
                onClick={() => void saveEdit()}
                disabled={saving}
                className="rounded-full p-1.5 text-[var(--accent)] hover:bg-[var(--chip-todo)]"
              >
                <Check size={16} />
              </button>
            </div>
          </div>

          <label className="block text-xs font-semibold text-[var(--muted)]">
            제목
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full rounded-xl border border-[var(--line)] bg-[var(--paper)] px-3 py-2 text-sm text-[var(--ink)] outline-none focus:ring-2 focus:ring-[var(--accent)]"
            />
          </label>

          <label className="block text-xs font-semibold text-[var(--muted)]">
            내용
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
              className="mt-1 w-full resize-y rounded-xl border border-[var(--line)] bg-[var(--paper)] px-3 py-2 text-sm leading-relaxed text-[var(--ink)] outline-none focus:ring-2 focus:ring-[var(--accent)]"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs font-semibold text-[var(--muted)]">
              분류
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as EntryCategory)}
                className="mt-1 w-full rounded-xl border border-[var(--line)] bg-[var(--paper)] px-3 py-2 text-sm text-[var(--ink)] outline-none focus:ring-2 focus:ring-[var(--accent)]"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_LABELS[c]}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-xs font-semibold text-[var(--muted)]">
              날짜
              <input
                type="date"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
                className="mt-1 w-full rounded-xl border border-[var(--line)] bg-[var(--paper)] px-3 py-2 text-sm text-[var(--ink)] outline-none focus:ring-2 focus:ring-[var(--accent)]"
              />
            </label>
          </div>

          <button
            type="button"
            onClick={() => void saveEdit()}
            disabled={saving}
            className="w-full rounded-xl bg-[var(--ink)] py-2.5 text-sm font-semibold text-[var(--paper)] disabled:opacity-60"
          >
            {saving ? "저장 중..." : "수정 저장"}
          </button>
        </div>
      )}
    </article>
  );
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("이미지를 읽지 못했습니다."));
    reader.readAsDataURL(blob);
  });
}
