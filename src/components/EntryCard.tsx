"use client";

import { format, parseISO } from "date-fns";
import { ko } from "date-fns/locale";
import { Trash2 } from "lucide-react";
import type { DiaryEntry, EntryCategory } from "@/lib/types";
import { CATEGORY_LABELS } from "@/lib/types";

const categoryTone: Record<EntryCategory, string> = {
  schedule: "bg-[var(--chip-schedule)] text-[var(--ink)]",
  thought: "bg-[var(--chip-thought)] text-[var(--ink)]",
  idea: "bg-[var(--chip-idea)] text-[var(--ink)]",
  note: "bg-[var(--chip-note)] text-[var(--ink)]",
  todo: "bg-[var(--chip-todo)] text-[var(--ink)]",
};

export function EntryCard({
  entry,
  onDelete,
}: {
  entry: DiaryEntry;
  onDelete?: (id: string) => void;
}) {
  return (
    <article className="entry-row border-b border-[var(--line)] py-4 last:border-b-0">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span
          className={`rounded px-2 py-0.5 text-[11px] font-semibold tracking-wide ${categoryTone[entry.category]}`}
        >
          {CATEGORY_LABELS[entry.category]}
        </span>
        <time className="text-xs text-[var(--muted)]">
          {format(parseISO(entry.created_at), "a h:mm", { locale: ko })}
        </time>
        {onDelete && (
          <button
            type="button"
            aria-label="기록 삭제"
            onClick={() => {
              if (confirm("이 기록을 삭제할까요?")) onDelete(entry.id);
            }}
            className="ml-auto rounded-full p-1.5 text-[var(--muted)] transition hover:bg-[var(--chip-todo)] hover:text-[var(--accent)]"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>
      <h3 className="font-[family-name:var(--font-display)] text-lg leading-snug text-[var(--ink)]">
        {entry.title}
      </h3>
      <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-[var(--body)]">
        {entry.content}
      </p>
    </article>
  );
}
