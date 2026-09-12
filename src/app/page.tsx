"use client";

import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { useMemo, useState } from "react";
import { DiaryCalendar } from "@/components/DiaryCalendar";
import { EntryCard } from "@/components/EntryCard";
import { VoiceRecorder } from "@/components/VoiceRecorder";
import { useDiaryData } from "@/hooks/useDiaryData";
import type { DiaryEntry, TodoItem } from "@/lib/types";

export default function HomePage() {
  const {
    deviceId,
    entries,
    ready,
    appendVoiceResult,
    deleteEntry,
    updateEntry,
  } = useDiaryData();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastTranscript, setLastTranscript] = useState<string | null>(null);

  const selectedKey = format(selectedDate, "yyyy-MM-dd");

  const markedDates = useMemo(
    () => Array.from(new Set(entries.map((e) => e.entry_date))),
    [entries],
  );

  const dayEntries = useMemo(
    () => entries.filter((e) => e.entry_date === selectedKey),
    [entries, selectedKey],
  );

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-8 px-5 pb-28 pt-8">
      <header className="text-center">
        <p className="text-xs font-semibold tracking-[0.28em] text-[var(--accent)]">
          VOICE FIRST
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl tracking-tight text-[var(--ink)] sm:text-5xl">
          Talk Diary
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
          말만 하면 일정·생각·아이디어가 날짜별로 정리됩니다
        </p>
      </header>

      <section className="relative overflow-hidden rounded-[2rem] px-4 py-10 paper-panel">
        <div className="pointer-events-none absolute inset-0 paper-grain" />
        <div className="relative flex flex-col items-center">
          {ready && deviceId ? (
            <VoiceRecorder
              deviceId={deviceId}
              onError={(msg) => {
                setError(msg);
                setMessage(null);
              }}
              onResult={(payload) => {
                setError(null);
                setLastTranscript(payload.transcript);
                appendVoiceResult({
                  entries: payload.entries as DiaryEntry[],
                  todos: payload.todos as TodoItem[],
                  storage: payload.storage,
                });
                const saved = payload.entries as DiaryEntry[];
                const savedTodos = payload.todos as TodoItem[];
                const count = saved.length;
                const dates = Array.from(
                  new Set(saved.map((e) => e.entry_date)),
                ).join(", ");
                const todoPart =
                  savedTodos.length > 0
                    ? ` · 할일 ${savedTodos.length}개 추가`
                    : "";
                setMessage(
                  `${count}개의 기록이 저장됐어요 (${dates})${todoPart}${
                    payload.storage === "supabase" ? " · 클라우드" : " · 이 기기"
                  }`,
                );
                const firstDate = saved[0]?.entry_date;
                if (firstDate) {
                  setSelectedDate(new Date(`${firstDate}T12:00:00`));
                }
              }}
            />
          ) : (
            <div className="h-40 w-40 animate-pulse rounded-full bg-black/5" />
          )}
        </div>
      </section>

      {(message || error || lastTranscript) && (
        <section className="space-y-2 text-sm">
          {message && (
            <p className="rounded-xl bg-[var(--chip-idea)] px-4 py-3 text-[var(--ink)]">
              {message}
            </p>
          )}
          {error && (
            <p className="rounded-xl bg-[var(--chip-todo)] px-4 py-3 text-[var(--ink)]">
              {error}
            </p>
          )}
          {lastTranscript && (
            <p className="px-1 text-[var(--muted)]">
              <span className="font-semibold text-[var(--ink)]">들은 말 · </span>
              {lastTranscript}
            </p>
          )}
        </section>
      )}

      <section className="paper-panel rounded-[1.5rem] px-4 py-5">
        <DiaryCalendar
          selectedDate={selectedDate}
          onSelect={setSelectedDate}
          markedDates={markedDates}
        />
      </section>

      <section>
        <div className="mb-3 flex items-end justify-between">
          <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--ink)]">
            {format(selectedDate, "M월 d일 EEEE", { locale: ko })}
          </h2>
          <span className="text-xs text-[var(--muted)]">{dayEntries.length}개</span>
        </div>
        <div className="paper-panel rounded-[1.25rem] px-4">
          {dayEntries.length === 0 ? (
            <p className="py-8 text-center text-sm text-[var(--muted)]">
              이 날짜의 기록이 아직 없어요
            </p>
          ) : (
            dayEntries.map((entry) => (
              <EntryCard
                key={entry.id}
                entry={entry}
                onDelete={deleteEntry}
                onUpdate={updateEntry}
              />
            ))
          )}
        </div>
      </section>
    </div>
  );
}
