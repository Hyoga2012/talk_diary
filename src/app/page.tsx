"use client";

import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { useMemo, useState } from "react";
import { DiaryCalendar } from "@/components/DiaryCalendar";
import { EntryCard } from "@/components/EntryCard";
import { GoogleSyncPanel } from "@/components/GoogleSyncPanel";
import { VoiceRecorder } from "@/components/VoiceRecorder";
import { useDiaryData } from "@/hooks/useDiaryData";
import type { DiaryEntry, TodoItem } from "@/lib/types";
import { TODO_STATUS_LABELS } from "@/lib/types";

export default function HomePage() {
  const {
    deviceId,
    entries,
    todos,
    ready,
    appendVoiceResult,
    deleteEntry,
    updateEntry,
    addEntryImage,
    removeEntryImage,
    appendVoiceToEntry,
    updateTodoStatus,
    mergeGoogleImport,
  } = useDiaryData();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastTranscript, setLastTranscript] = useState<string | null>(null);

  const selectedKey = format(selectedDate, "yyyy-MM-dd");

  const markedDates = useMemo(() => {
    const dates = new Set(entries.map((e) => e.entry_date));
    todos.forEach((t) => {
      if (t.due_date) dates.add(t.due_date);
    });
    return Array.from(dates);
  }, [entries, todos]);

  const dayEntries = useMemo(
    () => entries.filter((e) => e.entry_date === selectedKey),
    [entries, selectedKey],
  );

  // 완료 포함 — 다이어리 날짜에서는 항상 확인 가능
  const dayTodos = useMemo(
    () =>
      todos.filter(
        (t) =>
          t.due_date === selectedKey ||
          dayEntries.some((e) => e.id === t.entry_id),
      ),
    [todos, selectedKey, dayEntries],
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

      {ready && deviceId ? (
        <GoogleSyncPanel deviceId={deviceId} onImported={mergeGoogleImport} />
      ) : null}

      <section>
        <div className="mb-3 flex items-end justify-between">
          <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--ink)]">
            {format(selectedDate, "M월 d일 EEEE", { locale: ko })}
          </h2>
          <span className="text-xs text-[var(--muted)]">
            기록 {dayEntries.length} · 할일 {dayTodos.length}
          </span>
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
                deviceId={deviceId}
                onDelete={deleteEntry}
                onUpdate={updateEntry}
                onAddImage={addEntryImage}
                onRemoveImage={removeEntryImage}
                onAppendVoice={appendVoiceToEntry}
              />
            ))
          )}
        </div>

        {dayTodos.length > 0 && (
          <div className="mt-4">
            <h3 className="mb-2 font-[family-name:var(--font-display)] text-lg text-[var(--ink)]">
              이날의 할일
            </h3>
            <p className="mb-2 text-xs text-[var(--muted)]">
              완료해도 다이어리 날짜에서는 계속 확인할 수 있습니다.
            </p>
            <ul className="space-y-2">
              {dayTodos.map((todo) => (
                <li
                  key={todo.id}
                  className="paper-panel flex items-start gap-3 rounded-[1.1rem] px-4 py-3"
                >
                  <input
                    type="checkbox"
                    checked={todo.status === "done"}
                    onChange={() =>
                      updateTodoStatus(
                        todo.id,
                        todo.status === "done" ? "pending" : "done",
                      )
                    }
                    className="mt-0.5 h-4 w-4 accent-[var(--accent)]"
                  />
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-sm ${
                        todo.status === "done"
                          ? "text-[var(--muted)] line-through"
                          : "text-[var(--ink)]"
                      }`}
                    >
                      {todo.title}
                    </p>
                    <p className="mt-1 text-[11px] font-semibold text-[var(--muted)]">
                      {TODO_STATUS_LABELS[todo.status]}
                      {todo.due_date ? ` · 마감 ${todo.due_date}` : ""}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}
