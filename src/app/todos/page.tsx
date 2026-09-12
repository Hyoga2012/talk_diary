"use client";

import { useMemo, useState } from "react";
import { useDiaryData } from "@/hooks/useDiaryData";
import type { TodoStatus } from "@/lib/types";
import { TODO_STATUS_LABELS } from "@/lib/types";

const filters: Array<TodoStatus | "all"> = [
  "all",
  "pending",
  "in_progress",
  "done",
];

export default function TodosPage() {
  const { todos, ready, updateTodoStatus } = useDiaryData();
  const [filter, setFilter] = useState<TodoStatus | "all">("all");

  const visible = useMemo(() => {
    if (filter === "all") return todos;
    return todos.filter((t) => t.status === filter);
  }, [todos, filter]);

  const progress = useMemo(() => {
    if (todos.length === 0) return 0;
    const done = todos.filter((t) => t.status === "done").length;
    return Math.round((done / todos.length) * 100);
  }, [todos]);

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6 px-5 pb-28 pt-8">
      <header>
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-[var(--ink)]">
          할일
        </h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          음성에서 자동으로 뽑힌 할일을 여기서 진행 관리합니다
        </p>
      </header>

      <section className="paper-panel rounded-[1.25rem] px-5 py-4">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="text-[var(--muted)]">완료율</span>
          <span className="font-semibold text-[var(--ink)]">{progress}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-black/5">
          <div
            className="h-full rounded-full bg-[var(--accent)] transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-[var(--muted)]">
          전체 {todos.length}개 · 완료{" "}
          {todos.filter((t) => t.status === "done").length}개
        </p>
      </section>

      <div className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              filter === f
                ? "bg-[var(--ink)] text-[var(--paper)]"
                : "bg-black/5 text-[var(--muted)] hover:text-[var(--ink)]"
            }`}
          >
            {f === "all" ? "전체" : TODO_STATUS_LABELS[f]}
          </button>
        ))}
      </div>

      {!ready ? (
        <p className="text-sm text-[var(--muted)]">불러오는 중...</p>
      ) : visible.length === 0 ? (
        <div className="paper-panel rounded-[1.25rem] px-4 py-10 text-center text-sm text-[var(--muted)]">
          할일이 없습니다. “내일까지 보고서 보내기”처럼 말해 보세요.
        </div>
      ) : (
        <ul className="space-y-3">
          {visible.map((todo) => (
            <li
              key={todo.id}
              className="paper-panel flex items-start gap-3 rounded-[1.1rem] px-4 py-4"
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
                className="mt-1 h-4 w-4 accent-[var(--accent)]"
              />
              <div className="min-w-0 flex-1">
                <p
                  className={`text-sm leading-relaxed ${
                    todo.status === "done"
                      ? "text-[var(--muted)] line-through"
                      : "text-[var(--ink)]"
                  }`}
                >
                  {todo.title}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(
                    ["pending", "in_progress", "done"] as TodoStatus[]
                  ).map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => updateTodoStatus(todo.id, status)}
                      className={`rounded px-2 py-0.5 text-[11px] font-semibold ${
                        todo.status === status
                          ? "bg-[var(--chip-todo)] text-[var(--ink)]"
                          : "bg-black/5 text-[var(--muted)]"
                      }`}
                    >
                      {TODO_STATUS_LABELS[status]}
                    </button>
                  ))}
                </div>
                {todo.due_date && (
                  <p className="mt-2 text-xs text-[var(--muted)]">
                    마감 {todo.due_date}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
