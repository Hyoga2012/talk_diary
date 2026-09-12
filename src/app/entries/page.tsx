"use client";

import { format, parseISO } from "date-fns";
import { ko } from "date-fns/locale";
import { useMemo, useState } from "react";
import { EntryCard } from "@/components/EntryCard";
import { useDiaryData } from "@/hooks/useDiaryData";

export default function EntriesPage() {
  const { entries, ready, deleteEntry } = useDiaryData();
  const [query, setQuery] = useState("");

  const grouped = useMemo(() => {
    const filtered = entries.filter((e) => {
      if (!query.trim()) return true;
      const q = query.trim().toLowerCase();
      return (
        e.title.toLowerCase().includes(q) ||
        e.content.toLowerCase().includes(q) ||
        (e.raw_transcript || "").toLowerCase().includes(q)
      );
    });

    const map = new Map<string, typeof entries>();
    filtered.forEach((entry) => {
      const list = map.get(entry.entry_date) || [];
      list.push(entry);
      map.set(entry.entry_date, list);
    });

    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [entries, query]);

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6 px-5 pb-28 pt-8">
      <header>
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-[var(--ink)]">
          기록
        </h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          날짜별로 모인 일정·생각·아이디어를 한눈에 봅니다
        </p>
      </header>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="제목이나 내용 검색"
        className="w-full rounded-2xl border border-[var(--line)] bg-[var(--paper)] px-4 py-3 text-sm text-[var(--ink)] outline-none ring-[var(--accent)] placeholder:text-[var(--muted)] focus:ring-2"
      />

      {!ready ? (
        <p className="text-sm text-[var(--muted)]">불러오는 중...</p>
      ) : grouped.length === 0 ? (
        <div className="paper-panel rounded-[1.25rem] px-4 py-10 text-center text-sm text-[var(--muted)]">
          아직 기록이 없습니다. 홈에서 음성으로 남겨 보세요.
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
                    onDelete={deleteEntry}
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
