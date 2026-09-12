"use client";

import { format, parseISO } from "date-fns";
import { ko } from "date-fns/locale";
import { useMemo, useState } from "react";
import { EntryCard } from "@/components/EntryCard";
import { useDiaryData } from "@/hooks/useDiaryData";
import type { DiaryEntry } from "@/lib/types";

type RecordTab = "date" | "todo" | "idea" | "memo";

const TABS: Array<{ id: RecordTab; label: string }> = [
  { id: "date", label: "날짜" },
  { id: "todo", label: "할일" },
  { id: "idea", label: "아이디어" },
  { id: "memo", label: "메모" },
];

function matchesTab(entry: DiaryEntry, tab: RecordTab) {
  if (tab === "date") return entry.category === "schedule";
  if (tab === "todo") return entry.category === "todo";
  if (tab === "idea") return entry.category === "idea";
  // 메모: 생각 + 일반 기록
  return entry.category === "note" || entry.category === "thought";
}

function tabCount(entries: DiaryEntry[], tab: RecordTab) {
  return entries.filter((e) => matchesTab(e, tab)).length;
}

export default function EntriesPage() {
  const {
    deviceId,
    entries,
    ready,
    deleteEntry,
    updateEntry,
    addEntryImage,
    removeEntryImage,
    appendVoiceToEntry,
  } = useDiaryData();
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<RecordTab>("date");

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      if (!matchesTab(e, tab)) return false;
      if (!query.trim()) return true;
      const q = query.trim().toLowerCase();
      return (
        e.title.toLowerCase().includes(q) ||
        e.content.toLowerCase().includes(q) ||
        (e.raw_transcript || "").toLowerCase().includes(q)
      );
    });
  }, [entries, query, tab]);

  const grouped = useMemo(() => {
    const map = new Map<string, DiaryEntry[]>();
    filtered.forEach((entry) => {
      const list = map.get(entry.entry_date) || [];
      list.push(entry);
      map.set(entry.entry_date, list);
    });
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered]);

  const emptyHint: Record<RecordTab, string> = {
    date: "일정(날짜) 기록이 없습니다. “내일 회의”처럼 말해 보세요.",
    todo: "할일 기록이 없습니다. “장보기 해야 해”처럼 말해 보세요.",
    idea: "아이디어 기록이 없습니다. “앱 아이디어가 떠올랐어”처럼 말해 보세요.",
    memo: "메모·생각 기록이 없습니다. 자유롭게 말해 보세요.",
  };

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6 px-5 pb-28 pt-8">
      <header>
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-[var(--ink)]">
          기록
        </h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          음성으로 분류된 카드를 탭별로 보고, 공유 버튼으로 사진과 함께 보낼 수
          있습니다.
        </p>
      </header>

      <div className="flex gap-1 rounded-2xl bg-black/5 p-1">
        {TABS.map((t) => {
          const active = tab === t.id;
          const count = tabCount(entries, t.id);
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`flex-1 rounded-xl px-2 py-2 text-center text-xs font-semibold transition ${
                active
                  ? "bg-[var(--paper)] text-[var(--ink)] shadow-sm"
                  : "text-[var(--muted)]"
              }`}
            >
              {t.label}
              <span className="ml-1 opacity-60">{count}</span>
            </button>
          );
        })}
      </div>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={`${TABS.find((t) => t.id === tab)?.label} 검색`}
        className="w-full rounded-2xl border border-[var(--line)] bg-[var(--paper)] px-4 py-3 text-sm text-[var(--ink)] outline-none ring-[var(--accent)] placeholder:text-[var(--muted)] focus:ring-2"
      />

      {!ready ? (
        <p className="text-sm text-[var(--muted)]">불러오는 중...</p>
      ) : grouped.length === 0 ? (
        <div className="paper-panel rounded-[1.25rem] px-4 py-10 text-center text-sm text-[var(--muted)]">
          {emptyHint[tab]}
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(([date, dayEntries]) => (
            <section key={date}>
              <h2 className="mb-2 font-[family-name:var(--font-display)] text-xl text-[var(--ink)]">
                {format(parseISO(`${date}T12:00:00`), "yyyy년 M월 d일 EEEE", {
                  locale: ko,
                })}
              </h2>
              <div className="paper-panel rounded-[1.25rem] px-4">
                {dayEntries.map((entry) => (
                  <EntryCard
                    key={entry.id}
                    entry={entry}
                    deviceId={deviceId}
                    onDelete={deleteEntry}
                    onUpdate={updateEntry}
                    onAddImage={addEntryImage}
                    onRemoveImage={removeEntryImage}
                    onAppendVoice={appendVoiceToEntry}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
