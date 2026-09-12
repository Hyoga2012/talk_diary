"use client";

import { format, parseISO } from "date-fns";
import { ko } from "date-fns/locale";
import { Check, Pencil, Trash2, X } from "lucide-react";
import { useState } from "react";
import type { DiaryEntry, EntryCategory } from "@/lib/types";
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
  onDelete,
  onUpdate,
}: {
  entry: DiaryEntry;
  onDelete?: (id: string) => void;
  onUpdate?: (id: string, patch: EntryUpdate) => Promise<void> | void;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(entry.title);
  const [content, setContent] = useState(entry.content);
  const [category, setCategory] = useState<EntryCategory>(entry.category);
  const [entryDate, setEntryDate] = useState(entry.entry_date);
  const [saving, setSaving] = useState(false);

  const startEdit = () => {
    setTitle(entry.title);
    setContent(entry.content);
    setCategory(entry.category);
    setEntryDate(entry.entry_date);
    setEditing(true);
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
              rows={4}
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
